/* global Tesseract */
/*
 * Shared photo-to-text pipeline, used by the web app and by the phone app
 * (through /ocr-frame.html in a hidden WebView). Needs /ocr/tesseract.min.js.
 *
 * Phone photos of book pages have shadows, uneven light and blur. Tested on
 * such photos, plain greyscale gave about half the words right with many stray
 * symbols; evening out the background first and reading with the Arabic model
 * alone gave about 90% with none. So:
 *   1. even out the lighting (divide by a blurred copy of the page) and scale
 *      the page to a size Tesseract likes;
 *   2. read with the Arabic model; when Tesseract is unsure, also read the
 *      lightly prepared original and keep whichever it is more confident about;
 *   3. if the page turns out to be English, read it again with the English model.
 */
(function () {
  let workers = {};

  function getWorker(lang, onProgress) {
    if (!workers[lang]) {
      workers[lang] = Tesseract.createWorker(lang, 1, {
        workerPath: '/ocr/worker.min.js',
        corePath: '/ocr/',
        langPath: '/ocr',
        gzip: false,
        logger: function (m) {
          if (m.status === 'recognizing text' && workers[lang].listener) workers[lang].listener(m.progress);
        },
      }).catch(function (e) {
        delete workers[lang];
        throw e;
      });
    }
    workers[lang].listener = onProgress;
    return workers[lang];
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      let img = new Image();
      img.onload = function () {
        resolve(img);
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  function canvasFor(img, scale) {
    let c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.naturalWidth * scale));
    c.height = Math.max(1, Math.round(img.naturalHeight * scale));
    return c;
  }

  /** Light preparation: grey, kept near its own size (at most 2000px wide). */
  function plain(img) {
    let scale = Math.min(1, 2000 / img.naturalWidth);
    let c = canvasFor(img, scale);
    let ctx = c.getContext('2d');
    ctx.filter = 'grayscale(1)';
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  }

  /** Even out shadows: divide each pixel by the blurred page around it, then stretch contrast. */
  function evened(img) {
    let scale = Math.min(3, Math.max(0.5, 2200 / img.naturalWidth));
    let c = canvasFor(img, scale);
    let ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingQuality = 'high';
    ctx.filter = 'grayscale(1)';
    ctx.drawImage(img, 0, 0, c.width, c.height);
    let page = ctx.getImageData(0, 0, c.width, c.height);

    let b = canvasFor(img, scale);
    let bctx = b.getContext('2d', { willReadFrequently: true });
    bctx.filter = 'grayscale(1) blur(' + Math.round(c.width / 40) + 'px)';
    bctx.drawImage(img, 0, 0, b.width, b.height);
    let bg = bctx.getImageData(0, 0, b.width, b.height).data;

    let d = page.data;
    let n = d.length / 4;
    let vals = new Float32Array(n);
    let hist = new Uint32Array(256);
    for (let i = 0; i < n; i++) {
      let v = Math.min(255, (d[i * 4] / (bg[i * 4] + 1)) * 235);
      vals[i] = v;
      hist[v | 0]++;
    }
    // stretch so the darkest 1% is black and the lightest 1% is white
    let lo = 0, hi = 255, acc = 0;
    for (; lo < 255 && (acc += hist[lo]) < n * 0.01; lo++);
    acc = 0;
    for (; hi > 0 && (acc += hist[hi]) < n * 0.01; hi--);
    let range = Math.max(1, hi - lo);
    for (let j = 0; j < n; j++) {
      let out = Math.max(0, Math.min(255, ((vals[j] - lo) / range) * 255));
      d[j * 4] = d[j * 4 + 1] = d[j * 4 + 2] = out;
    }
    ctx.putImageData(page, 0, 0);
    return c.toDataURL('image/png');
  }

  function latinShare(text) {
    let ar = (text.match(/[؀-ۿ]/g) || []).length;
    let la = (text.match(/[A-Za-z]/g) || []).length;
    return la / Math.max(1, ar + la);
  }

  async function read(lang, image, onProgress) {
    let w = await getWorker(lang, onProgress);
    let r = await w.recognize(image);
    return { text: r.data.text, confidence: r.data.confidence };
  }

  /** Returns the page text; onProgress gets 0..1. */
  async function recognize(src, onProgress) {
    let report = function (from, to) {
      return function (p) {
        if (onProgress) onProgress(from + (to - from) * p);
      };
    };
    let img = await loadImage(src);
    let best = await read('ara', evened(img), report(0, 0.6));
    if (best.confidence < 75) {
      // Not sure about it: also try the lightly prepared original (a second pass costs time on phones).
      let b = await read('ara', plain(img), report(0.6, 0.9));
      if (b.confidence > best.confidence + 3) best = b;
    }
    if (latinShare(best.text) > 0.5) {
      // An English page: the Arabic model can't read it.
      best = await read('eng', plain(img), report(0.9, 1));
    }
    if (onProgress) onProgress(1);
    return best.text;
  }

  // ---------- whole PDF files ----------

  let pdfjsPromise = null;
  function getPdfjs() {
    if (!pdfjsPromise) {
      // eslint-disable-next-line import/no-unresolved -- served from public/ocr at runtime
      pdfjsPromise = import('/ocr/pdf/pdf.min.mjs').then(
        function (m) {
          m.GlobalWorkerOptions.workerSrc = '/ocr/pdf/pdf.worker.min.mjs';
          return m;
        },
        function (e) {
          pdfjsPromise = null;
          throw e;
        },
      );
    }
    return pdfjsPromise;
  }

  /**
   * Some Arabic PDFs store each line in visual (right-to-left drawn) order, so
   * the text comes out backwards: "الطلب" as "بلطلا". Backwards Arabic has many
   * words ending in "لا" and few starting with "ال".
   */
  function looksBackwards(text) {
    const words = text.match(/[\u0621-\u064A]{3,}/g) || [];
    let starts = 0;
    let ends = 0;
    for (const w of words) {
      if (w.startsWith('ال')) starts++;
      if (w.endsWith('لا')) ends++;
    }
    return ends >= 3 && ends > starts * 2;
  }

  function reverseLine(line) {
    // Reverse the characters, then put Latin words and numbers back the right way round.
    return Array.from(line)
      .reverse()
      .join('')
      .replace(/[A-Za-z0-9٠-٩.,%]+/g, function (run) {
        return Array.from(run).reverse().join('');
      });
  }

  /**
   * Rebuilds the page's lines from its text pieces by position. PDFs often store
   * Arabic one letter at a time and in drawing order, so the pieces are sorted
   * right-to-left for Arabic lines and joined, with a space only where there is a gap.
   */
  async function pageText(page) {
    const content = await page.getTextContent();
    const items = [];
    for (const it of content.items) {
      if (typeof it.str !== 'string' || !it.transform) continue;
      const size = Math.hypot(it.transform[2], it.transform[3]) || it.height || 10;
      // Glyphs without a letter (e.g. a combined shadda) come through as control characters.
      items.push({ str: it.str.replace(/[\u0000-\u001F]/g, ''), x: it.transform[4], y: it.transform[5], w: it.width || 0, size: size });
    }
    items.sort(function (a, b) {
      return b.y - a.y;
    });
    const lines = [];
    for (const it of items) {
      const line = lines.find(function (l) {
        return Math.abs(l.y - it.y) < l.size * 0.5;
      });
      if (line) line.items.push(it);
      else lines.push({ y: it.y, size: it.size, items: [it] });
    }
    lines.sort(function (a, b) {
      return b.y - a.y;
    });
    const out = [];
    let prevY = null;
    let prevSize = 10;
    for (const line of lines) {
      const joined = line.items.map(function (i) {
        return i.str;
      }).join('');
      const ar = (joined.match(/[\u0600-\u06FF\uFB50-\uFEFF]/g) || []).length;
      const la = (joined.match(/[A-Za-z]/g) || []).length;
      const rtl = ar >= la;
      line.items.sort(function (a, b) {
        return rtl ? b.x - a.x : a.x - b.x;
      });
      let text = '';
      let prev = null;
      for (const it of line.items) {
        // Vowel marks sit on top of a letter: they never start a new word.
        const mark = !it.str || /^[\u064B-\u065F\u0670\uFC5E-\uFC63\uFE70-\uFE7F]+$/.test(it.str);
        if (prev && !mark) {
          const gap = rtl ? prev.x - (it.x + it.w) : it.x - (prev.x + prev.w);
          if (gap > it.size * 0.2 && !/\s$/.test(text) && !/^\s/.test(it.str)) text += ' ';
        }
        text += it.str;
        if (!mark) prev = it;
      }
      // A bigger gap than usual between lines starts a new paragraph.
      if (prevY !== null && prevY - line.y > Math.max(prevSize, line.size) * 2.1) out.push('');
      out.push(text.trim());
      prevY = line.y;
      prevSize = line.size;
    }
    // Arabic "presentation forms" (joined letter shapes) back to normal letters.
    // (NFKC turns a lone vowel-mark shape into "space + mark", so drop that space.)
    let result = out
      .join('\n')
      .normalize('NFKC')
      .replace(/[ \t]+([\u064B-\u065F\u0670])/g, '$1')
      .replace(/[ \t]+/g, ' ');
    if (looksBackwards(result)) result = result.split('\n').map(reverseLine).join('\n');
    return result.trim();
  }

  async function renderPage(page) {
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(3, 2000 / base.width);
    const viewport = page.getViewport({ scale: scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
    return canvas.toDataURL('image/png');
  }

  /**
   * Reads every page of a PDF (a URL or data: URI). Pages with a text layer are
   * read directly; scanned pages are drawn and read like photos.
   * Returns { pages: string[], total: number }. onProgress gets (done 0..1, page number).
   */
  async function readPdf(src, onProgress, maxPages) {
    const pdfjs = await getPdfjs();
    let data;
    if (src.startsWith('data:')) {
      const bin = atob(src.slice(src.indexOf(',') + 1));
      data = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
    } else {
      data = new Uint8Array(await (await fetch(src)).arrayBuffer());
    }
    const doc = await pdfjs.getDocument({
      data: data,
      cMapUrl: '/ocr/pdf/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: '/ocr/pdf/standard_fonts/',
    }).promise;
    const n = Math.min(doc.numPages, maxPages || 150);
    const pages = [];
    for (let i = 1; i <= n; i++) {
      const page = await doc.getPage(i);
      let text = await pageText(page);
      if (text.replace(/\s/g, '').length < 40) {
        // A scanned page: no text inside the file, so read the picture.
        const image = await renderPage(page);
        text = await recognize(image, function (p) {
          if (onProgress) onProgress((i - 1 + p) / n, i);
        });
      }
      pages.push(text);
      page.cleanup();
      if (onProgress) onProgress(i / n, i);
    }
    const total = doc.numPages;
    doc.destroy();
    return { pages: pages, total: total };
  }

  window.MuthakaraOCR = {
    recognize: recognize,
    readPdf: readPdf,
    warmUp: function () {
      return getWorker('ara');
    },
  };
})();
