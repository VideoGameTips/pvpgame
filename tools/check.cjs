const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
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
  const version = new URL(asset, 'http://localhost/').searchParams.get('v');
  if (version && version !== createHash('sha256').update(fs.readFileSync(localPath)).digest('hex').slice(0, 12)) {
    throw Error('Stale index.html asset version: ' + asset);
  }
}
const requiredModules = ['offline-runtime.js', 'equipment-models.js', 'underworld.js', 'map-craft.js', 'foundry-map.js', 'warehouse-map.js', 'refinery-detail.js', 'weapon-finish.js', 'stealth-series.js', 'stealth-showroom.js', 'game.js', 'underworld-adapter.js', 'backrooms.js', 'ragdoll.js', 'chat.js'];
const scripts = Array.from(html.matchAll(/<script\b[^>]*src="([^"]+)"/g), match => new URL(match[1], 'http://localhost/').pathname.slice(1));
for (const file of requiredModules) {
  if (scripts.filter(script => script === file).length !== 1) throw Error('Missing or duplicated index.html module: ' + file);
}
for (const file of ['equipment-models.js', 'weapon-finish.js', 'stealth-series.js', 'stealth-showroom.js']) {
  if (scripts.indexOf(file) > scripts.indexOf('game.js')) throw Error('Module must load before game.js: ' + file);
}
if (!html.includes('href="audio/ballistic-shot.mp3"')) throw Error('Missing recorded gunshot preload');
if (fs.existsSync('users.json') || fs.existsSync('server.js') || fs.existsSync('socket.io.min.js')) throw Error('Live server files must not ship');
console.log('PASS: syntax, relative assets, no application network transports, no live-server data');
