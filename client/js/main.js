// Ceneri di Vael — client
import { Engine } from './render/engine.js';
import { WorldView, reachable, pathTo } from './render/world.js';
import { BattleView } from './render/battle.js';
import { showD20 } from './render/dice.js';
import { Net } from './net.js';
import { SKILLS, weaponSkill } from '/shared/data/classes.js';
import { ITEMS } from '/shared/data/items.js';
import { BIOMES } from '/shared/data/mythic.js';
import { hkey } from '/shared/rules.js';
import { LOOK, HAIR_STYLES, BEARDS, ACCESSORIES } from '/shared/data/heroes.js';
import { renderLobby } from './ui/lobby.js';
import { renderQuests } from './ui/quests.js';
import { renderTop, renderParty, renderLogList, renderTravel, renderMenu, tileTooltip } from './ui/hud.js';
import { renderEvent, renderTown, renderCamp, renderChapter, renderMythic, renderEnding, renderGameOver } from './ui/panels.js';
import { renderSheet } from './ui/sheet.js';
import { renderCombat, validTargets } from './ui/combatui.js';
import { esc, toast } from './ui/util.js';
import { renderTitle } from './ui/menu.js';
import { loadSpriteOverrides } from './render/rig.js';
import { renderCoach } from './ui/coach.js';
import { renderAbyss, renderAbyssPanel } from './ui/abyss.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const net = new Net();
const engine = new Engine($('gl'));
const world = new WorldView(engine);
const battle = new BattleView(engine, $('overlay3d'));
const tooltip = document.createElement('div');
tooltip.id = 'tooltip';
document.body.appendChild(tooltip);

const app = {
  state: null, players: [], me: null, ui: { questMin: (() => { try { return !!localStorage.getItem('vael_qmin'); } catch { return false; } })() }, ping: 0, invite: null, code: null, engine,
  canControl(h) {
    if (!h || !this.me) return false;
    if (h.owner === this.me.playerId) return true;
    const o = this.players.find((p) => p.id === h.owner);
    return this.me.isHost && (!o || !o.connected);
  },
  async send(a) {
    const r = await net.send(a);
    if (!r?.ok) toast(r?.error || 'Errore', 'bad');
    return r;
  },
};
window.vael = app; // utile per il debug
try { app.ui.tutSeen = new Set(JSON.parse(sessionStorage.getItem('vael_tut') || '[]')); } catch { app.ui.tutSeen = new Set(); }

// ------------------ ingresso ------------------
function joinScreen(err) {
  $('loading').style.display = 'none';
  if (params.get('host') && !err) { app.ui.screen = 'menu'; $('center').innerHTML = renderTitle(app); return; }
  const name = localStorage.getItem('vael_name') || '';
  const needCode = !params.get('host') && !params.get('code') && !sessionStorage.getItem('vael_token');
  $('center').innerHTML = `<div class="join">
    <h1>Ceneri di Vael</h1><div class="subtitle">Il sole è spezzato. Le lanterne si spengono.</div>
    <div class="panel">
      <label>Il tuo nome <input id="joinName" maxlength="20" value="${esc(name)}" placeholder="Viandante"></label>
      ${needCode || err ? `<label>Codice stanza <input id="joinCode" maxlength="4" value="${esc(params.get('code') || '')}" placeholder="ABCD" style="text-transform:uppercase"></label>` : ''}
      ${err ? `<div class="bad">${esc(err)}</div>` : ''}
      <button class="primary big" id="joinBtn">Entra nella compagnia</button>
      ${params.get('host') ? '<p class="muted small">Sei l\'host: gli altri giocatori entreranno con il codice stanza.</p>' : ''}
    </div></div>`;
  const go = async () => {
    const nm = $('joinName').value.trim() || 'Viandante';
    localStorage.setItem('vael_name', nm); sessionStorage.setItem('vael_name', nm);
    const code = ($('joinCode')?.value || params.get('code') || '').toUpperCase();
    const r = await net.hello({ name: nm, code, hostKey: params.get('host'), token: sessionStorage.getItem('vael_token') });
    if (!r.ok) { if (r.error?.includes('Codice')) sessionStorage.removeItem('vael_token'); return joinScreen(r.error); }
    app.me = r;
    $('center').innerHTML = '';
    loadInvite();
    net.call('legends').then((x) => { app.ui.legends = x?.legends || []; render(); });
  };
  $('joinBtn').onclick = go;
  $('joinName').onkeydown = (e) => { if (e.key === 'Enter') go(); };
  $('joinName').focus();
}
async function loadInvite() {
  try { app.invite = await (await fetch('/api/invite')).json(); render(); } catch {}
  if (app.invite?.tunnelState === 'starting') setTimeout(loadInvite, 3000);
}

net.on('state', (msg) => {
  app.state = msg.game; app.players = msg.players; app.code = msg.code;
  if (app.me) { const me = msg.players.find((p) => p.id === app.me.playerId); if (me) app.me.isHost = me.isHost; }
  $('loading').style.display = 'none';
  render();
});
net.on('ping', (p) => { app.ping = p; const el = document.querySelector('.ping'); if (el) el.textContent = p + ' ms'; });
net.on('disconnect', () => toast('Connessione persa... riconnessione', 'bad'));
net.on('connect', () => { if (app.me) toast('Connesso', 'good'); });

// ------------------ demo diorama per la lobby ------------------
function demoState(heroes) {
  const tiles = {};
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let y = 0; y < 9; y++) for (let x = 0; x < 13; x++) {
    const q = x - Math.floor(y / 2), r = y;
    const d = Math.hypot(x - 6, (y - 4) * 1.3);
    const b = d < 1.5 ? 'prato' : d > 5.6 ? 'acqua' : rnd() < 0.45 ? 'bosco' : rnd() < 0.3 ? 'colline' : rnd() < 0.12 ? 'monti' : 'prato';
    const bd = BIOMES[b];
    tiles[hkey(q, r)] = { q, r, x, y, b, h: bd.h[0] + (bd.h[1] - bd.h[0]) * rnd(), rev: true, cor: false, dec: Math.floor(rnd() * 9999), poi: null };
  }
  const at = (x, y) => tiles[hkey(x - Math.floor(y / 2), y)];
  at(6, 4).poi = { t: 'town', name: 'Morsa' };
  at(3, 2).b = 'prato'; at(3, 2).poi = { t: 'beacon', lit: true };
  at(9, 6).b = 'prato'; at(9, 6).poi = { t: 'camp' };
  at(9, 2).b = 'colline'; at(9, 2).poi = { t: 'crystal' };
  return { phase: 'lobby', seed: 'demo', act: 1, threat: 10, map: { tiles, v: 1 }, party: { q: 7 - 2, r: 5 }, heroes: heroes.map((h) => ({ ...h, alive: true })), travel: { stage: 'roll' } };
}

// ------------------ render ------------------
let currentView = null;
function useView(v) {
  if (currentView === v) return;
  world.active = v === world; battle.active = v === battle;
  engine.setView(v);
  currentView = v;
  $('overlay3d').style.display = v === battle ? '' : 'none';
}

function keepFocus(fn) {
  const a = document.activeElement;
  const id = a?.id, ss = a?.selectionStart, se = a?.selectionEnd;
  fn();
  if (id) { const el = $(id); if (el && el !== a) { el.focus(); try { el.setSelectionRange(ss, se); } catch {} } }
}

function render() {
  const s = app.state;
  if (!s || !app.me) return;
  document.body.dataset.phase = s.phase;
  if (app.ui.screen === 'menu' && app.me.isHost) {
    tooltip.style.display = 'none';
    document.body.dataset.phase = 'lobby';
    useView(world);
    world.sync(demoState([]), new Set());
    for (const id of ['hud', 'party', 'quests', 'bottom', 'combatui', 'modal', 'coach']) $(id).innerHTML = '';
    $('modal').classList.remove('on');
    $('logpanel').style.display = 'none';
    keepFocus(() => { $('center').innerHTML = renderTitle(app); });
    return;
  }
  if (s.phase !== 'map') tooltip.style.display = 'none';
  if (s.phase === 'lobby') {
    useView(world);
    const demo = demoState(s.heroes);
    world.sync(demo, new Set());
    world.follow = true;
    for (const id of ['hud', 'party', 'quests', 'bottom', 'combatui', 'modal', 'coach']) $(id).innerHTML = '';
    $('logpanel').style.display = 'none';
    if (app.ui.modal) app.ui.modal = null;
    keepFocus(() => { $('center').innerHTML = renderLobby(app); });
    return;
  }
  $('logpanel').style.display = '';
  ensureLog();
  $('hud').innerHTML = renderTop(app);
  $('party').innerHTML = renderParty(app);
  $('quests').innerHTML = s.phase === 'combat' ? '' : s.endless ? renderAbyssPanel(app) : renderQuests(app);
  $('coach').innerHTML = app.ui.modal ? '' : renderCoach(app);
  updateLog();
  $('bottom').innerHTML = app.ui.modal ? '' : s.phase === 'map' ? renderTravel(app) : s.phase === 'abyss' ? renderAbyss(app) : '';
  // vista 3D
  if (s.phase === 'combat' && s.combat) {
    useView(battle);
    battle.sync(s);
    $('combatui').innerHTML = renderCombat(app);
    const actor = s.combat.units.find((u) => u.id === s.combat.active);
    battle.setTargets(app.ui.pending && actor ? validTargets(s.combat, actor, app.ui.pending.sk) || [] : []);
    if (s.combat.bossLine && app.ui.bossLineSeen !== s.combat.bossLine) setTimeout(() => { app.ui.bossLineSeen = s.combat.bossLine; }, 4000);
  } else {
    useView(world);
    $('combatui').innerHTML = '';
    world.sync(s, s.phase === 'map' && !app.ui.modal ? reachable(s) : s.phase === 'abyss' && s.endless?.entering == null ? new Set((s.endless?.doors || []).map((d) => d.tile)) : new Set());
    if (s.phase !== 'map') world.setPath(null);
  }
  // pannelli di fase
  let modal = '';
  if (s.phase === 'event') modal = renderEvent(app);
  else if (s.phase === 'town') modal = renderTown(app);
  else if (s.phase === 'camp') modal = renderCamp(app);
  else if (s.phase === 'chapter') modal = renderChapter(app);
  else if (s.phase === 'mythic') modal = renderMythic(app);
  else if (s.phase === 'ending') modal = renderEnding(app);
  else if (s.phase === 'gameover') modal = renderGameOver(app);
  const scrollEl = $('modal').querySelector('.modal-box');
  const scroll = scrollEl?.scrollTop || 0;
  $('modal').innerHTML = modal;
  $('modal').classList.toggle('on', !!modal);
  const ns = $('modal').querySelector('.modal-box'); if (ns) ns.scrollTop = scroll;
  // finestre utente (scheda, menu)
  keepFocus(() => {
    if (app.ui.modal === 'sheet') $('center').innerHTML = `<div class="dim" data-act="close_modal"></div>${renderSheet(app)}`;
    else if (app.ui.modal === 'menu') $('center').innerHTML = `<div class="dim" data-act="close_modal"></div>${renderMenu(app)}`;
    else $('center').innerHTML = '';
  });
  // dado d20
  const e = s.event;
  if (s.phase === 'event' && e?.stage === 'rolled' && e.roll && app.ui.rollShown !== e.roll.id && app.ui.rollAnim !== e.roll.id) {
    app.ui.rollAnim = e.roll.id;
    const box = $('dice');
    showD20(box, e.roll, () => {
      app.ui.rollShown = e.roll.id;
      render();
      setTimeout(() => { if (app.ui.rollAnim === e.roll.id) box.classList.remove('show'); }, 2200);
    });
  }
  if (s.phase !== 'event') $('dice').classList.remove('show');
}

// ------------------ diario e chat ------------------
function ensureLog() {
  if ($('loglist')) return;
  $('logpanel').innerHTML = `<div class="log-tabs"><button data-act="logtab" data-tab="log" class="sel">Diario</button><button data-act="logtab" data-tab="chat">Chat</button><button data-act="logmin" title="Riduci">–</button></div>
    <div id="loglist"></div><div class="chatbox"><input id="chatIn" maxlength="240" placeholder="Scrivi ai compagni... (Invio)"></div>`;
  $('chatIn').addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.value.trim()) { net.chat(e.target.value.trim()); e.target.value = ''; } });
}
function updateLog() {
  const el = $('loglist');
  if (!el) return;
  const near = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  el.innerHTML = renderLogList(app);
  if (near || !app.ui.logInit) { el.scrollTop = el.scrollHeight; app.ui.logInit = true; }
  document.querySelectorAll('.log-tabs [data-tab]').forEach((b) => b.classList.toggle('sel', b.dataset.tab === (app.ui.logTab || 'log')));
}

// ------------------ interazione mappa ------------------
world.onTileClick = (t) => {
  const s = app.state;
  if (!s || app.ui.modal) return;
  if (s.phase === 'abyss') {
    if (t.poi?.door != null && s.endless?.entering == null) app.send({ type: 'vote', idx: t.poi.door });
    return;
  }
  if (s.phase !== 'map') return;
  const act = s.heroes.find((h) => h.id === s.travel.order?.[s.travel.cur]);
  if (act && !app.canControl(act)) { toast(`È il turno di ${act.name}`, 'info'); return; }
  if (s.travel.stage !== 'move') { if (s.travel.stage === 'roll') toast(`Prima tira il dado di ${act?.name || 'questo eroe'}`, 'info'); return; }
  if (!world.reach.has(hkey(t.q, t.r))) return;
  world.setPath(null);
  app.send({ type: 'move', q: t.q, r: t.r });
};
// a fine rotazione si aggiornano le frecce delle missioni (dipendono dall'angolo della visuale)
world.onRotate = () => render();
world.onHover = (t, x, y) => {
  const s = app.state;
  if (!s || s.phase === 'lobby' || !t) { tooltip.style.display = 'none'; world.setPath(null); return; }
  tooltip.innerHTML = tileTooltip(app, t);
  tooltip.style.display = 'block';
  tooltip.style.left = x + 16 + 'px'; tooltip.style.top = y + 12 + 'px';
  if (s.phase === 'map' && world.reach.has(hkey(t.q, t.r))) world.setPath(pathTo(s, t)); else world.setPath(null);
};
battle.onUnitClick = (id) => {
  const s = app.state, p = app.ui.pending;
  if (!p || !s.combat) return;
  const actor = s.combat.units.find((u) => u.id === s.combat.active);
  const ok = validTargets(s.combat, actor, p.sk) || [];
  if (!ok.includes(id)) { toast('Bersaglio non valido', 'bad'); return; }
  combatSend({ ...p.action, target: id });
};

function combatSend(a) {
  app.ui.pending = null; app.ui.cmenu = 'main';
  app.send({ type: 'combat', ...a });
  render();
}

// ------------------ azioni UI ------------------
async function ensureHello() {
  const nm = ($('joinName')?.value || '').trim() || 'Viandante';
  try { localStorage.setItem('vael_name', nm); sessionStorage.setItem('vael_name', nm); } catch {}
  if (app.me) return true;
  const r = await net.hello({ name: nm, code: '', hostKey: params.get('host'), token: sessionStorage.getItem('vael_token') });
  if (!r.ok) { toast(r.error, 'bad'); return false; }
  app.me = r;
  loadInvite();
  net.call('legends').then((x) => { app.ui.legends = x?.legends || []; render(); });
  return true;
}

const A = {
  choose_mode: async (d) => {
    if (!(await ensureHello())) return;
    const ph = app.state?.phase;
    if (ph && !['lobby', 'ending', 'gameover'].includes(ph)) {
      if (!confirm("C'è una partita in corso: chiuderla? (I progressi non salvati andranno persi.)")) return;
      await app.send({ type: 'to_lobby' });
    }
    if (d.mode === 'abyss') {
      if (ph === 'ending' || ph === 'gameover') await app.send({ type: 'to_lobby' });
      const r = await app.send({ type: 'set_mode', mode: 'local', goal: 'abyss' });
      if (!r?.ok) return;
    } else if (d.mode === 'tutorial') {
      app.ui.tutSeen = new Set(); app.ui.tutOpen = null; app.ui.coachMin = false;
      try { sessionStorage.removeItem('vael_tut'); } catch {}
      const r = await app.send({ type: 'start_tutorial' });
      if (!r?.ok) return;
    } else {
      if (ph === 'ending' || ph === 'gameover') await app.send({ type: 'to_lobby' });
      const r = await app.send({ type: 'set_mode', mode: d.mode, goal: 'campaign' });
      if (!r?.ok) return;
    }
    app.ui.screen = null;
    render();
  },
  menu_resume: () => { app.ui.screen = null; render(); },
  to_menu: () => { app.ui.screen = 'menu'; app.ui.modal = null; render(); },
  tut_exit: () => app.send({ type: 'to_lobby' }).then(() => { app.ui.screen = 'menu'; render(); }),
  coach_ok: (d) => { (app.ui.tutSeen ||= new Set()).add(d.id); app.ui.tutOpen = null; try { sessionStorage.setItem('vael_tut', JSON.stringify([...app.ui.tutSeen])); } catch {} render(); },
  coach_open: (d) => { app.ui.tutOpen = d.id; app.ui.coachMin = false; render(); },
  coach_min: () => { app.ui.coachMin = !app.ui.coachMin; render(); },
  copy: (d) => { navigator.clipboard?.writeText(d.text).then(() => toast('Copiato!', 'good'), () => toast(d.text)); },
  draft: (d) => { app.ui.draft[d.k] = d.v; render(); },
  look: (d) => { app.ui.draft.look[d.k] = d.v; render(); },
  preview_anim: (d) => { app.ui.previewAnim = d.a; render(); },
  look_random: () => {
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    app.ui.draft.look = { skin: pick(LOOK.skin), hair: pick(LOOK.hair), eyes: pick(LOOK.eyes), hairStyle: pick(Object.keys(HAIR_STYLES)), beard: Math.random() < 0.6 ? 'nessuna' : pick(Object.keys(BEARDS)), acc: Math.random() < 0.5 ? 'classe' : pick(Object.keys(ACCESSORIES)), cloth: Math.random() < 0.5 ? '' : pick(LOOK.cloth) };
    render();
  },
  create_hero: () => { const dr = app.ui.draft; app.send({ type: 'create_hero', name: dr.name, cls: dr.cls, look: dr.look }).then((r) => { if (r?.ok) app.ui.draft.name = ['Aldric', 'Mirela', 'Tobin', 'Seraphine', 'Caius', 'Ilse', 'Doran', 'Vesna', 'Liora', 'Bram', 'Nerys'][Math.floor(Math.random() * 11)]; }); },
  legend: (d) => app.send({ type: 'create_hero', legend: d.id, cls: 'lama' }),
  reroll_traits: (d) => app.send({ type: 'reroll_traits', heroId: d.hero }),
  delete_hero: (d) => app.send({ type: 'delete_hero', heroId: d.hero }),
  start: () => app.send({ type: 'start' }),
  set_goal: (d) => app.send({ type: 'set_goal', goal: d.goal }),
  show_saves: async () => { const r = await net.call('saves'); app.ui.saves = r?.saves || []; render(); },
  load: (d) => { if (confirm('Caricare questa partita? I progressi non salvati andranno persi.')) app.send({ type: 'load', file: d.file }).then((r) => { if (r?.ok) { app.ui.modal = null; app.ui.saves = null; toast('Partita caricata', 'good'); } }); },
  save: () => app.send({ type: 'save', name: app.ui.saveName || app.state.campaignName }).then((r) => r?.ok && toast('Partita salvata', 'good')),
  to_lobby: () => { if (confirm('Tornare alla lobby? La partita in corso verrà chiusa (salvala prima!).')) app.send({ type: 'to_lobby' }).then(() => { app.ui.modal = null; }); },
  quality: (d) => { engine.setQuality(d.q); render(); },
  menu: () => { app.ui.modal = 'menu'; app.ui.saves = null; render(); },
  menu_tab: (d) => { app.ui.menuTab = d.tab; render(); },
  close_modal: () => { app.ui.modal = null; render(); },
  sheet: (d) => { app.ui.modal = 'sheet'; app.ui.sheetHero = d.hero; render(); },
  sheet_tab: (d) => { app.ui.sheetTab = d.tab; render(); },
  equip: (d) => app.send({ type: 'equip', heroId: d.hero, uid: d.uid }),
  unequip: (d) => app.send({ type: 'unequip', heroId: d.hero, slot: d.slot }),
  use_item: (d) => app.send({ type: 'use_item', heroId: d.hero, uid: d.uid }),
  discard: (d) => { if (confirm('Gettare questo oggetto?')) app.send({ type: 'discard', uid: d.uid }); },
  choose_talent: (d) => app.send({ type: 'choose_talent', heroId: d.hero, talent: d.talent }),
  choose_sub: (d) => app.send({ type: 'choose_sub', heroId: d.hero, sub: d.sub }),
  choose_job: (d) => app.send({ type: 'choose_job', heroId: d.hero, job: d.job }),
  set_row: (d) => app.send({ type: 'set_row', heroId: d.hero, row: Number(d.row) }),
  travel_roll: () => app.send({ type: 'travel_roll' }),
  end_turn: () => app.send({ type: 'end_turn' }),
  travel_assign: (d) => app.send({ type: 'travel_assign', face: d.face }),
  travel_unassign: () => app.send({ type: 'travel_unassign' }),
  travel_confirm: () => app.send({ type: 'travel_confirm' }),
  end_day: () => app.send({ type: 'end_day' }),
  vote: (d) => app.send({ type: 'vote', idx: Number(d.idx) }),
  force_vote: () => app.send({ type: 'force_vote' }),
  roll_check: (d) => app.send({ type: 'roll_check', heroId: d.hero }),
  reroll: () => app.send({ type: 'reroll' }),
  accept_roll: () => app.send({ type: 'accept_roll' }),
  event_continue: () => app.send({ type: 'event_continue' }),
  town: (d) => app.send({ type: 'town', svc: d.svc, heroId: d.hero, slot: d.slot }),
  town_tab: (d) => { app.ui.townTab = d.tab; render(); },
  buy: (d) => app.send({ type: 'buy', uid: d.uid }),
  sell: (d) => app.send({ type: 'sell', uid: d.uid }),
  leave_town: () => { app.ui.townTab = null; app.send({ type: 'leave_town' }); },
  camp_continue: () => app.send({ type: 'camp_continue' }),
  chapter_continue: () => app.send({ type: 'chapter_continue' }),
  combat_continue: () => app.send({ type: 'combat_continue' }),
  logtab: (d) => { app.ui.logTab = d.tab; updateLog(); },
  logmin: () => $('logpanel').classList.toggle('min'),
  qmin: () => { app.ui.questMin = !app.ui.questMin; try { localStorage.setItem('vael_qmin', app.ui.questMin ? '1' : ''); } catch {} render(); },
  qfocus: (d) => { if (app.state.phase !== 'map') return; world.focusTile(+d.q, +d.r); },
  // battaglia
  cattack: () => { app.ui.pending = { sk: { ...SKILLS.attacco, id: 'attacco' }, action: { kind: 'attack' } }; autoTarget(); },
  cweapon: (d) => {
    const c = app.state.combat, actor = c.units.find((u) => u.id === c.active);
    app.ui.pending = { sk: weaponSkill(actor.wtype, d.move, actor.element), action: { kind: 'attack', move: d.move } };
    autoTarget();
  },
  cmenu: (d) => { app.ui.cmenu = d.m; render(); },
  cback: () => { app.ui.pending = null; app.ui.cmenu = 'main'; render(); },
  cskill: (d) => {
    const sk = { ...SKILLS[d.skill], id: d.skill };
    app.ui.pending = { sk, action: { kind: 'skill', skill: d.skill } };
    autoTarget();
  },
  citem: (d) => {
    const it = app.state.bag.find((i) => i.uid === d.uid);
    const u = ITEMS[it.base].use;
    if (u.bomb) return combatSend({ kind: 'item', uid: d.uid });
    app.ui.pending = { sk: { name: ITEMS[it.base].name, target: u.revive ? 'deadAlly' : 'ally' }, action: { kind: 'item', uid: d.uid } };
    autoTarget();
  },
  cdo: (d) => combatSend({ kind: d.kind }),
  ctarget: (d) => combatSend({ ...app.ui.pending.action, target: d.id }),
};
function autoTarget() {
  const s = app.state;
  const actor = s.combat.units.find((u) => u.id === s.combat.active);
  const ids = validTargets(s.combat, actor, app.ui.pending.sk);
  if (ids === null) return combatSend(app.ui.pending.action);
  if (!ids.length) { toast('Nessun bersaglio valido', 'bad'); app.ui.pending = null; }
  render();
}

// il tooltip della mappa vive solo sopra il canvas: se il puntatore passa su un pannello (lobby, menu, finestre) si nasconde
document.addEventListener('pointermove', (e) => {
  if (e.target !== engine.renderer.domElement && tooltip.style.display !== 'none') { tooltip.style.display = 'none'; world.setPath(null); }
});
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = A[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el.dataset, el); }
});
document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-act-change]');
  if (el?.dataset.actChange === 'assign_hero') app.send({ type: 'assign_hero', heroId: el.dataset.hero, playerId: el.value });
});
document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset.draft) app.ui.draft[el.dataset.draft] = el.value;
  if (el.dataset.uikey) app.ui[el.dataset.uikey] = el.value;
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && app.ui.modal) { app.ui.modal = null; render(); }
  if (e.key === 'Escape' && app.ui.pending) { app.ui.pending = null; render(); }
});

// avvio
// sprite PNG opzionali (client/assets/sprites/manifest.json): se presenti sostituiscono i pezzi generati
loadSpriteOverrides().then((n) => { if (n) render(); });
useView(world);
if (sessionStorage.getItem('vael_token') && sessionStorage.getItem('vael_name')) {
  // riconnessione automatica
  net.hello({ name: sessionStorage.getItem('vael_name'), code: params.get('code') || '', hostKey: params.get('host'), token: sessionStorage.getItem('vael_token') }).then((r) => {
    if (r.ok) { app.me = r; loadInvite(); net.call('legends').then((x) => { app.ui.legends = x?.legends || []; render(); }); }
    else joinScreen(r.error);
  });
} else joinScreen();
