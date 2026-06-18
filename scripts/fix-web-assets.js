const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const FROM = 'assets/node_modules/';
const TO = 'assets/nm/';
const TEXT_EXT = new Set(['.js', '.mjs', '.cjs', '.html', '.json', '.css', '.map', '.txt']);

function walk(dir, cb) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, cb);
    else cb(p);
  }
}

if (!fs.existsSync(DIST)) {
  console.error('[fix-web-assets] dist/ not found — run `expo export -p web` first.');
  process.exit(1);
}

let rewritten = 0;
walk(DIST, (file) => {
  const ext = path.extname(file).toLowerCase();
  if (!TEXT_EXT.has(ext)) return;
  const orig = fs.readFileSync(file, 'utf8');
  if (orig.includes(FROM)) {
    fs.writeFileSync(file, orig.split(FROM).join(TO));
    rewritten += 1;
  }
});
console.log(`[fix-web-assets] rewrote "${FROM}" -> "${TO}" in ${rewritten} file(s).`);

const oldDir = path.join(DIST, 'assets', 'node_modules');
const newDir = path.join(DIST, 'assets', 'nm');
if (fs.existsSync(oldDir)) {
  fs.renameSync(oldDir, newDir);
  console.log(`[fix-web-assets] renamed assets/node_modules -> assets/nm.`);
} else {
  console.log('[fix-web-assets] no assets/node_modules directory to rename.');
}
