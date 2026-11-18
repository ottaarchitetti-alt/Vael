// Diario delle missioni: obiettivo principale dell'atto + obiettivi secondari, calcolati dallo stato
import { STORY, STORY_EVENTS } from '/shared/data/story.js';
import { hexDist, hkey } from '/shared/rules.js';
import { esc } from './util.js';

// testo dell'obiettivo per ogni tappa della storia
const GOALS = {
  a1_faro: 'Riaccendi il Faro di Grigiaterra',
  a1_boss: 'Abbatti il Lampionaio Cavo nella Torre della Veglia',
  a2_corte: 'Raggiungi la Corte delle Falene',
  a2_sommerso: 'Soccorri il Villaggio Sommerso',
  a2_boss_pact: 'Affronta l\'Inquisitore Ceruleo nel Cuore della Palude',
  a2_boss_war: 'Rovescia il Trono di Funghi nel Cuore della Palude',
  a2_boss_trick: 'Affronta il Cavaliere di Polvere nel Cuore della Palude',
  a3_alleati: 'Riunisci le fazioni al Consiglio',
  a3_boss: 'Affronta il Vescovo Velato nella Cattedrale dell\'Eclisse',
};
const ACT_QUEST = { 1: 'Le Lanterne Morenti', 2: 'La Palude delle Falene', 3: 'La Cattedrale dell\'Eclisse' };

// direzione sullo schermo (la camera guarda verso nord = r decrescente)
function arrow(from, to) {
  const x = Math.sqrt(3) * (to.q - from.q + (to.r - from.r) / 2), z = 1.5 * (to.r - from.r);
  if (Math.abs(x) < 0.01 && Math.abs(z) < 0.01) return '●';
  const a = Math.atan2(-z, x); // 0 = est, π/2 = nord
  return ['→', '↗', '↑', '↖', '←', '↙', '↓', '↘'][Math.round(a / (Math.PI / 4) + 8) % 8];
}

export function questList(s) {
  const st = STORY[s.act];
  if (!st || !s.map) return null;
  const tiles = Object.values(s.map.tiles);
  const steps = [];
  for (const n of st.nodes) {
    const t = tiles.find((x) => x.poi?.id === n.id);
    steps.push({ id: n.id, text: GOALS[n.id] || STORY_EVENTS[n.id]?.title, tile: t, done: !!t?.poi?.done });
  }
  const bossId = st.boss(s.flags || {});
  const bt = s.map.tiles[hkey(s.map.boss.q, s.map.boss.r)];
  const pending = steps.some((x) => !x.done);
  steps.push({ id: bossId, text: GOALS[bossId] || STORY_EVENTS[bossId]?.title, tile: bt, done: false, boss: true, locked: pending });
  const cur = steps.find((x) => !x.done && !x.locked);
  const side = [];
  const beacons = tiles.filter((t) => t.poi?.t === 'beacon');
  if (beacons.length) side.push({ text: 'Accendi i Fari per respingere la Cenere', prog: `${beacons.filter((t) => t.poi.lit).length}/${beacons.length}`, done: beacons.every((t) => t.poi.lit), tile: nearest(s, beacons.filter((t) => !t.poi.lit && t.rev)) });
  const crystals = tiles.filter((t) => t.poi?.t === 'crystal');
  if (crystals.length) side.push({ text: 'Risveglia il Cristallo Spento', prog: `${crystals.filter((t) => t.poi.done).length}/${crystals.length}`, done: crystals.every((t) => t.poi.done), tile: nearest(s, crystals.filter((t) => !t.poi.done && t.rev)) });
  return { title: ACT_QUEST[s.act], steps, cur, side };
}

function nearest(s, list) {
  return list.sort((a, b) => hexDist(a, s.party) - hexDist(b, s.party))[0] || null;
}

function where(s, t) {
  if (!t) return '';
  if (!t.rev) return `<span class="q-where" title="Luogo non ancora esplorato: direzione approssimativa">${arrow(s.party, t)} ?</span>`;
  const d = hexDist(t, s.party);
  return `<button class="q-where" data-act="qfocus" data-q="${t.q}" data-r="${t.r}" title="Mostra sulla mappa">${arrow(s.party, t)} ${d ? `${d} ${d === 1 ? 'casella' : 'caselle'}` : 'qui'}</button>`;
}

export function renderQuests(app) {
  const s = app.state;
  const q = questList(s);
  if (!q) return '';
  const min = app.ui.questMin;
  const row = (x, cls = '') => `<li class="${cls} ${x.done ? 'done' : ''} ${x.locked ? 'locked' : ''}">
      <span class="q-box">${x.done ? '✔' : x.locked ? '🔒' : x.boss ? '☠' : '◆'}</span>
      <span class="q-text">${esc(x.text)}${x.prog ? ` <b>${x.prog}</b>` : ''}${x.locked ? '<small>Prima completa le tappe precedenti</small>' : ''}</span>
      ${x.done || x.locked ? '' : where(s, x.tile)}
    </li>`;
  return `<div class="quests ${min ? 'min' : ''}">
    <div class="q-head" data-act="qmin" title="${min ? 'Espandi' : 'Riduci'}"><span>📜 Missioni</span><small>Atto ${s.act}</small><span class="q-tog">${min ? '▾' : '▴'}</span></div>
    ${min ? (q.cur ? `<div class="q-cur">◆ ${esc(q.cur.text)} ${where(s, q.cur.tile)}</div>` : '') : `
    <div class="q-sec">${esc(q.title)}</div>
    <ul>${q.steps.map((x) => row(x, x === q.cur ? 'cur' : '')).join('')}</ul>
    <div class="q-sec">Secondarie</div>
    <ul class="side">${q.side.map((x) => row(x)).join('')}</ul>`}
  </div>`;
}
