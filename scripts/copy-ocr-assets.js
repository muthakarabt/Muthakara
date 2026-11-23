/**
 * Copies the Tesseract OCR engine, the Arabic + English language data and pdf.js into
 * public/ocr so the web app reads text from photos without any outside server.
 * Runs automatically after `npm install` (postinstall).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'public', 'ocr');
const nm = (...p) => path.join(root, 'node_modules', ...p);

const zlib = require('zlib');

const files = [
  [nm('tesseract.js', 'dist', 'tesseract.min.js'), 'tesseract.min.js'],
  [nm('tesseract.js', 'dist', 'worker.min.js'), 'worker.min.js'],
];
// Language data is stored unzipped: some hosts would otherwise add their own
// gzip encoding on top and the engine would try to unzip it twice.
const languages = [
  [nm('@tesseract.js-data', 'ara', '4.0.0_best_int', 'ara.traineddata.gz'), 'ara.traineddata'],
  [nm('@tesseract.js-data', 'eng', '4.0.0_best_int', 'eng.traineddata.gz'), 'eng.traineddata'],
];
for (const variant of ['', '-simd', '-relaxedsimd']) {
  for (const ext of ['.js', '.wasm', '.wasm.js']) {
    const name = `tesseract-core${variant}-lstm${ext}`;
    files.push([nm('tesseract.js-core', name), name]);
  }
}

fs.mkdirSync(out, { recursive: true });
let copied = 0;
for (const [from, name] of files) {
  if (!fs.existsSync(from)) {
    console.warn(`[ocr] missing ${path.relative(root, from)}; reading text from photos will be unavailable`);
    continue;
  }
  fs.copyFileSync(from, path.join(out, name));
  copied++;
}
for (const [from, name] of languages) {
  if (!fs.existsSync(from)) {
    console.warn(`[ocr] missing ${path.relative(root, from)}; reading text from photos will be unavailable`);
    continue;
  }
  fs.writeFileSync(path.join(out, name), zlib.gunzipSync(fs.readFileSync(from)));
  copied++;
}
for (const stale of ['ara.traineddata.gz', 'eng.traineddata.gz']) fs.rmSync(path.join(out, stale), { force: true });
console.log(`[ocr] copied ${copied}/${files.length + languages.length} files to public/ocr`);

// pdf.js (legacy build, for older phone WebViews) to read whole PDF files, with
// the character maps and fonts it needs for Arabic and scanned documents.
const pdfOut = path.join(out, 'pdf');
const pdfSrc = nm('pdfjs-dist');
if (fs.existsSync(pdfSrc)) {
  fs.mkdirSync(pdfOut, { recursive: true });
  for (const name of ['pdf.min.mjs', 'pdf.worker.min.mjs']) {
    fs.copyFileSync(path.join(pdfSrc, 'legacy', 'build', name), path.join(pdfOut, name));
  }
  for (const dir of ['cmaps', 'standard_fonts']) {
    fs.cpSync(path.join(pdfSrc, dir), path.join(pdfOut, dir), { recursive: true });
  }
  console.log('[ocr] copied pdf.js to public/ocr/pdf');
} else {
  console.warn('[ocr] missing pdfjs-dist; reading whole PDF files will be unavailable');
}
