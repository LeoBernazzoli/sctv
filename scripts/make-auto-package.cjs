const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
if (process.env.SCTV_AUTO_PACKAGE !== '1') throw new Error('Run only in the dedicated automatic-entry worktree with SCTV_AUTO_PACKAGE=1');
const app = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const moduleId = 'gh/leobernazzoli/sctv@a';
const pkg = {name:'sctv-auto', version:'1.0.0',appName:'SC TV Auto',main:'launcher/auto.js',packageType:'mods',
  repository:app.repository,keys:app.keys,evaluateScriptOnDocumentStart:false,
  description:'Ingresso stabile di SC TV: controlla gli aggiornamenti a ogni apertura.',
  websiteURL:'http://127.0.0.1:8081/module/' + encodeURIComponent(moduleId) + '/launcher/index.html',
  files:['launcher/index.html','launcher/auto.js','README.md']};
fs.writeFileSync(path.join(root,'package.json'),JSON.stringify(pkg,null,2)+'\n');
fs.writeFileSync(path.join(root,'package-lock.json'),JSON.stringify({name:pkg.name,version:pkg.version,lockfileVersion:3,
  requires:true,packages:{'':{name:pkg.name,version:pkg.version}}},null,2)+'\n');
console.log('Prepared stable launcher manifest for @a');
