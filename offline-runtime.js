/* Local-only compatibility for the shared game simulation. No sockets or HTTP. */
(function () {
  'use strict';
  const memory = new Map(), prefix = 'pvpgame-test:';
  window.PVE_STORAGE = {
    getItem(key) { try { return localStorage.getItem(prefix + key); } catch (_) { return memory.get(key) ?? null; } },
    setItem(key, value) { memory.set(key, String(value)); try { localStorage.setItem(prefix + key, String(value)); } catch (_) {} },
    removeItem(key) { memory.delete(key); try { localStorage.removeItem(prefix + key); } catch (_) {} },
  };
  const handlers = new Map(), id = 'local_tester', deaths = new Set();
  const notify = (event, data) => { for (const fn of [...(handlers.get(event) || [])]) fn(data); };
  const later = (event, data) => queueMicrotask(() => notify(event, data));
  const me = () => players[id];
  function reset(data, respawn) {
    const p = me(); if (!p) return;
    Object.assign(p, { hp: match?.cfg?.playerHp || 300, dead: false, x: data.x ?? p.x, z: data.z ?? p.z });
    if (respawn) later('playerRespawned', { ...p, clientSpawn: true });
  }
  const socket = {
    id, connected: true,
    on(event, fn) { if (!handlers.has(event)) handlers.set(event, []); handlers.get(event).push(fn); return this; },
    off(event, fn) { if (fn) handlers.set(event, (handlers.get(event) || []).filter(f => f !== fn)); else handlers.delete(event); return this; },
    emit(event, data = {}) {
      switch (event) {
        case 'enterMatch': currentRoom = data.matchId; break;
        case 'leaveMatch': currentRoom = null; break;
        case 'setName': if (me()) me().name = data.username; break;
        case 'move': if (me()) Object.assign(me(), data); break;
        case 'setWeapon': if (me()) me().weaponId = data.weaponId; break;
        case 'resetSelf': reset(data, false); break;
        case 'readyRespawn': reset(data, true); break;
        case 'healSelf': {
          const hp = Math.min(match?.cfg?.playerHp || 300, (me()?.hp || 0) + Math.max(0, data.amount || 0));
          queueMicrotask(() => { if (!me() || isDead) return; me().hp = Math.max(me().hp, hp); updateHealthHUD(me().hp); });
          break;
        }
        case 'environmentDamage': environmentDamageAck = data.seq; pendingEnvironmentDamage.length = 0; break;
        case 'forceRespawnBot': deaths.delete(data.id || data.botId); break;
        case 'despawnBots': for (const bid of data) deaths.delete(bid); break;
        case 'hitBot':
          // Player damage is already applied by emitHit. AI-vs-AI deaths need
          // the old server notification, but must never subtract damage twice.
          if (data.killerId && data.killerId !== id) queueMicrotask(() => {
            const b = resolveBot(data.botId); if (!b || b.hp > 0 || deaths.has(b.id)) return;
            deaths.add(b.id); later('playerDied', { targetId: b.id, killerId: data.killerId, weapon: data.weapon });
          });
          break;
        case 'getWraps': later('approvedWraps', []); later('myWraps', []); break;
      }
      return this;
    },
  };
  function profile(username) {
    return { ok: true, username: (username || 'Tester').slice(0, 16), isAdmin: true,
      credits: 1000000, fragments: 100000, purchased: Object.keys(WEAPON_COSTS),
      unlocks: [...WEAPONS, ...MELEE_ITEMS, ...SUPPORT_ITEMS].map(w => w.id),
      skinInventory: [...MODEL_SKINS, ...MELEE_MODEL_SKINS, ...SUPPORT_MODEL_SKINS].map(s => s.id),
      chests: { common: 0, rare: 0 }, upgrades: {}, skinCases: [], skinCasePacks: {}, freeSpinAvailable: false };
  }
  window.PVE_LOCAL = {
    socket,
    async request(path, body = {}) {
      if (path.startsWith('/auth/available')) return { available: true };
      if (path === '/auth/login' || path === '/auth/register') return profile(body?.username);
      if (path === '/shop/inventory' || path === '/shop/award') return profile(currentUser?.username);
      return { error: 'Online purchases and account services are disabled in this local test build. Equipment is already unlocked.' };
    },
  };
  window.addEventListener('DOMContentLoaded', () => {
    notify('init', { id, players: { [id]: { id, name: 'Tester', x: 0, y: 1, z: 0, rotX: 0, rotY: 0, hp: 300, dead: false, team: 'ally', isBot: false, kills: 0, deaths: 0 } } });
    notify('connect');
    document.getElementById('login-toggle').hidden = true;
    document.getElementById('pass-input').value = '';
    const title = document.querySelector('#overlay h1'); if (title) title.textContent = 'PVE TEST ARENA';
    const play = document.getElementById('play-btn'); play.textContent = 'PLAY SOLO';
    document.getElementById('tagline').textContent = 'Campaign · survival · bot practice';
    const labels = { '1v1': '1v1 VS BOT', '2v2': '2v2 WITH BOTS', '3v3': '3v3 WITH BOTS', '5v5': '5v5 WITH BOTS', '10v10': '10v10 WITH BOTS' };
    for (const card of document.querySelectorAll('.mode-card[data-mode], .quick-card[data-mode]')) {
      const label = labels[card.dataset.mode]; if (!label) continue;
      const heading = card.querySelector('b');
      if (heading) heading.textContent = label;
      else for (const node of card.childNodes) if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) { node.textContent = label; break; }
    }
    for (const el of document.querySelectorAll('a[href*="sushigamelab.com"], a[href*="railway.app"]')) el.remove();
  });
})();
