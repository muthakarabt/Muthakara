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
    let best = await read('ara', evened(img), report(0, 0.9));
    if (best.confidence < 75) {
      // Not sure about it: also try the lightly prepared original (a second pass costs time on phones).
      let b = await read('ara', plain(img), report(0.45, 0.9));
      if (b.confidence > best.confidence + 3) best = b;
    }
    if (latinShare(best.text) > 0.5) {
      // An English page: the Arabic model can't read it.
      best = await read('eng', plain(img), report(0.9, 1));
    }
    if (onProgress) onProgress(1);
    return best.text;
  }

  window.MuthakaraOCR = { recognize: recognize, warmUp: function () { return getWorker('ara'); } };
})();
