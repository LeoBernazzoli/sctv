const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'src/tv.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
const marker = '/*__SC_TV_CSS__*/ ""';
if (!js.includes(marker)) throw new Error('CSS build marker missing');
fs.writeFileSync(path.join(root, 'src/tv.js'), js.replace(marker, JSON.stringify(css)));
console.log('Built src/tv.js (self-contained)');
