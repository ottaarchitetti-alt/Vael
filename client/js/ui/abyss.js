// Abisso Senza Fondo: scelta delle porte e pannello del piano
import { ENEMIES } from '/shared/data/enemies.js';
import { esc } from './util.js';

const DOOR_UI = {
  combat: { icon: '⚔', cls: 'fight' },
  elite: { icon: '☠', cls: 'elite' },
  boss: { icon: '👑', cls: 'boss' },
  shop: { icon: '🛒', cls: 'shop' },
  trial: { icon: '🎲', cls: 'trial' },
  rest: { icon: '🔥', cls: 'rest' },
};
const KIND = { combat: 'Battaglia', elite: 'Élite', boss: 'Guardiano', shop: 'Mercante', trial: 'Prova', rest: 'Riposo' };
export const BOSS_EVERY = 5;

function voters(app, idx) {
  const v = app.state.vote;
  if (!v) return '';
  return `<span class="voters">${Object.entries(v.votes).filter(([, i]) => i === idx).map(([pid]) => app.players.find((p) => p.id === pid)).filter(Boolean).map((p) => `<i style="background:${p.color}" title="${esc(p.name)}"></i>`).join('')}</span>`;
}

export function renderAbyss(app) {
  const s = app.state, A = s.endless;
  if (!A?.doors) return '';
  const entering = A.entering != null;
  const myVote = s.vote?.votes?.[app.me?.playerId];
  const conn = app.players.filter((p) => p.connected);
  return `<div class="travel abyss">
    <div class="tr-title">🕳 Piano ${A.floor} — ${entering ? 'il gruppo varca la porta...' : A.doors.length === 1 ? 'un guardiano sbarra la discesa' : 'scegliete una porta'}</div>
    <div class="doors">${A.doors.map((d, i) => {
      const ui = DOOR_UI[d.t];
      const foes = d.enemies ? d.enemies.map((id) => esc(ENEMIES[id].name)).join(', ') : esc(d.info);
      return `<button class="door ${ui.cls} ${myVote === i ? 'voted' : ''} ${A.entering === i ? 'chosen' : ''}" data-act="vote" data-idx="${i}" ${entering ? 'disabled' : ''}>
        <span class="d-icon">${ui.icon}</span>
        <span class="d-kind">${KIND[d.t]}</span>
        <b>${esc(d.title)}</b>
        <small>${foes}</small>
        ${voters(app, i)}
      </button>`;
    }).join('')}</div>
    ${!entering && s.vote && conn.length > 1 ? `<div class="vote-foot"><span>Voti: ${Object.keys(s.vote.votes).length}/${conn.length} — maggioranza, l'host spareggia</span>${app.me?.isHost ? '<button data-act="force_vote">Decidi ora</button>' : ''}</div>` : ''}
    <small class="muted">Potete anche cliccare la porta sulla mappa. Ogni piano rende i nemici più forti; ogni ${BOSS_EVERY} piani c'è un guardiano.</small>
  </div>`;
}

// pannello laterale (al posto delle missioni della campagna)
export function renderAbyssPanel(app) {
  const s = app.state, A = s.endless;
  const toBoss = BOSS_EVERY - ((A.floor - 1) % BOSS_EVERY) - 1;
  const pct = Math.round((A.scale - 1) * 100);
  return `<div class="quests">
    <div class="q-head"><span>🕳 Abisso Senza Fondo</span><small>Piano ${A.floor}</small><span></span></div>
    <ul>
      <li class="cur"><span class="q-box">◆</span><span class="q-text">Scendete il più in basso possibile</span></li>
      <li><span class="q-box">👑</span><span class="q-text">${toBoss ? `Guardiano tra ${toBoss} ${toBoss === 1 ? 'piano' : 'piani'}` : 'Guardiano in questo piano!'}</span></li>
      <li><span class="q-box">⚔</span><span class="q-text">Forza dei nemici: livello ${s.act}${pct ? ` +${pct}%` : ''}</span></li>
      <li><span class="q-box">🏆</span><span class="q-text">Record: piano ${Math.max(A.best || 0, A.floor)}</span></li>
    </ul>
  </div>`;
}
