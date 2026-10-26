const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
process.chdir(path.resolve(__dirname, '..'));
for (const file of fs.readdirSync('.').filter(f => f.endsWith('.js') && f !== 'three.min.js')) {
  execFileSync(process.execPath, ['--check', file]);
  const source = fs.readFileSync(file, 'utf8');
  if (/\bfetch\s*\(|new\s+(WebSocket|XMLHttpRequest|EventSource)\b|\bio\s*\(/.test(source)) throw Error('Network transport in ' + file);
}
const html = fs.readFileSync('index.html', 'utf8');
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const asset = match[1]; if (/^(https?:|data:|#)/.test(asset)) continue;
  const localPath = decodeURIComponent(new URL(asset, 'http://localhost/').pathname).slice(1);
  if (asset.startsWith('/') || !fs.existsSync(localPath)) throw Error('Invalid static asset: ' + asset);
}
if (fs.existsSync('users.json') || fs.existsSync('server.js') || fs.existsSync('socket.io.min.js')) throw Error('Live server files must not ship');
console.log('PASS: syntax, relative assets, no application network transports, no live-server data');
