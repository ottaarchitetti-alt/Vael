// L'Abisso Senza Fondo: modalità a piani infiniti (battaglie, mercanti, prove, fonti, boss ogni 5 piani)
import crypto from 'node:crypto';
import { RNG } from './rng.js';
import { startCombat, buildEncounter } from './combat.js';
import { readAbyssRecords, addAbyssRecord } from './save.js';
import { EVENTS } from '../shared/data/events.js';
import { ENEMIES } from '../shared/data/enemies.js';
import { BIOMES } from '../shared/data/mythic.js';
import { heroDerived, hkey } from '../shared/rules.js';

export const BOSS_EVERY = 5;
const W = 9, H = 7;
const FLOOR_BIOMES = { 1: ['rovine', 'colline', 'bosco'], 2: ['bosco_morto', 'palude', 'rovine'], 3: ['cenere', 'rovine', 'bosco_morto'] };
const BOSSES = { 1: ['lampionaio'], 2: ['ysolde', 'inquisitore', 'ser_polvere'], 3: ['vescovo'] };
const ALL_BOSSES = ['lampionaio', 'ysolde', 'inquisitore', 'ser_polvere', 'vescovo'];

// eventi con prove adatti all'Abisso (niente fari, cristalli o effetti legati alla mappa)
const TRIAL_EVENTS = Object.entries(EVENTS)
  .filter(([id, e]) => !['faro', 'cristallo', 'covo', 'santuario'].includes(id) && e.opts.some((o) => o.check))
  .map(([id]) => id);

export const DOORS = {
  combat: { icon: '⚔', name: 'Battaglia', poi: 'den', desc: 'Un gruppo di nemici sbarra la strada.' },
  elite: { icon: '☠', name: 'Covo d\'élite', poi: 'den', desc: 'Nemici più forti, bottino raro.' },
  boss: { icon: '👑', name: 'Guardiano del piano', poi: 'boss', desc: 'Un nemico leggendario custodisce la discesa.' },
  shop: { icon: '🛒', name: 'Mercante dell\'Abisso', poi: 'merchant', desc: 'Bottega, locanda, cappella e fabbro.' },
  trial: { icon: '🎲', name: 'Prova', poi: 'shrine', desc: 'Un incontro da risolvere con i dadi.' },
  rest: { icon: '🔥', name: 'Fonte di brace', poi: 'camp', desc: 'Riposo (+40% PV e PM) e una Scintilla del Fato.' },
};

export const tierOf = (floor) => Math.min(3, 1 + Math.floor((floor - 1) / BOSS_EVERY));
// i nemici crescono un po' a ogni piano; oltre il 15° continuano a salire senza limite
export const scaleOf = (floor) => +(1 + 0.05 * ((floor - 1) % BOSS_EVERY) + Math.max(0, floor - 15) * 0.07).toFixed(3);

export function newAbyss(g) {
  const s = g.s;
  const seed = crypto.randomInt(1, 2 ** 31);
  g.rng = new RNG(seed);
  Object.assign(s, {
    phase: 'abyss', seed, act: 1, day: 1, threat: 0, fate: 3, fateMax: 5, gold: 80, rations: 0,
    bag: [], flags: {}, rep: { lantern: 0, moth: 0, salt: 0, eclipse: 0 }, moral: { fiamma: 0, falena: 0, sale: 0 },
    mythic: null, crystals: 0, chronicle: [], event: null, travel: null, combat: null, town: null, camp: null, chapter: null, vote: null, ending: null,
    rollSeq: 0, campaignName: `Abisso ${new Date().toLocaleDateString('it-IT')}`, tutorial: false,
    endless: { floor: 0, run: seed.toString(36), best: bestFloor(), kills: 0, door: null, entering: null },
  });
  for (const b of ['pozione', 'pozione', 'pozione', 'etere', 'etere']) s.bag.push(g.makeItem(b));
  for (const h of s.heroes) { const d = heroDerived(h, s); h.hp = d.maxHp; h.mp = d.maxMp; h.alive = true; }
  g.log('🕳 Vi calate nell\'Abisso Senza Fondo. Più scendete, più i nemici si fanno forti.', 'title');
  nextFloor(g);
}

function bestFloor() { return readAbyssRecords().reduce((m, r) => Math.max(m, r.floor || 0), 0); }

// genera il piano successivo: un piccolo diorama con 1-3 porte
export function nextFloor(g) {
  const s = g.s, A = s.endless;
  const prev = A.door;
  // dopo un guardiano: pianerottolo di riposo
  if (prev?.t === 'boss' && s.heroes.some((h) => h.alive)) {
    for (const h of s.heroes) {
      const d = heroDerived(h, s);
      if (!h.alive) { h.alive = true; h.hp = Math.round(d.maxHp * 0.3); }
      else h.hp = Math.min(d.maxHp, h.hp + Math.round(d.maxHp * 0.5));
      h.mp = Math.min(d.maxMp, h.mp + Math.round(d.maxMp * 0.5));
    }
    s.fate = Math.min(s.fateMax, s.fate + 1);
    g.log('Il guardiano cade: sul pianerottolo vi riprendete (+50% PV e PM, i caduti si rialzano, +1 Scintilla).', 'good');
  }
  A.floor++;
  A.door = null; A.entering = null;
  A.scale = scaleOf(A.floor);
  s.act = tierOf(A.floor);
  s.day = A.floor;
  s.threat = 0;
  s.seed = `abisso-${A.run}-${A.floor}`;
  s.map = buildFloorMap(g, A.floor);
  s.party = { ...s.map.start };
  for (const h of s.heroes) h.pos = { ...s.party }; // nell'Abisso il gruppo scende unito
  A.doors = makeDoors(g, A.floor);
  A.doors.forEach((d, i) => {
    const t = s.map.tiles[d.tile];
    t.poi = { t: DOORS[d.t].poi, name: `${DOORS[d.t].icon} ${d.title}`, door: i };
  });
  s.phase = 'abyss';
  s.vote = { kind: 'door', n: A.doors.length, votes: {} };
  if (A.floor > A.best) A.best = A.floor;
  g.log(`🕳 Piano ${A.floor}${A.floor % BOSS_EVERY === 0 ? ' — un guardiano attende' : ''}. Scegliete una porta.`, 'title');
  g.tryResolveVote();
}

function buildFloorMap(g, floor) {
  const rng = g.rng, tier = tierOf(floor);
  const [main, alt, alt2] = FLOOR_BIOMES[tier];
  const tiles = {};
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let b;
      // il bordo è acqua bassa: la visuale isometrica si può ruotare e nessun lato deve coprire il diorama
      if (x === 0 || x === W - 1 || y === 0 || y === H - 1) b = 'acqua';
      else b = rng.chance(0.6) ? main : rng.chance(0.6) ? alt : alt2;
      const q = x - Math.floor(y / 2), r = y;
      const bd = BIOMES[b];
      tiles[hkey(q, r)] = { q, r, x, y, b, h: +(bd.h[0] + (bd.h[1] - bd.h[0]) * rng.next()).toFixed(2), poi: null, cor: false, rev: true, vis: true, dec: rng.int(0, 9999) };
    }
  }
  const at = (x, y) => tiles[hkey(x - Math.floor(y / 2), y)];
  const start = at(4, 4);
  start.b = main; start.h = BIOMES[main].h[0];
  return { tiles, w: W, h: H, start: { q: start.q, r: start.r }, boss: { q: at(4, 1).q, r: at(4, 1).r }, v: 1, abyss: true };
}

function makeDoors(g, floor) {
  const s = g.s, rng = g.rng;
  const at = (x, y) => hkey(x - Math.floor(y / 2), y);
  const fix = (key) => { const t = s.map.tiles[key]; if (BIOMES[t.b].blocked) { t.b = FLOOR_BIOMES[s.act][0]; t.h = BIOMES[t.b].h[0]; } return key; };
  if (floor % BOSS_EVERY === 0) {
    const pool = floor <= 15 ? BOSSES[tierOf(floor)] : ALL_BOSSES;
    const boss = rng.pick(pool);
    return [{ t: 'boss', tile: fix(at(4, 2)), boss, title: ENEMIES[boss].name, info: DOORS.boss.desc }];
  }
  const types = [];
  const after = floor % BOSS_EVERY === 1 && floor > 1;
  if (after) types.push('shop');
  while (types.length < 3) {
    const t = rng.weighted([['combat', 40], ['elite', floor >= 3 ? 14 : 0], ['trial', 20], ['shop', after ? 0 : 10], ['rest', 12]]);
    if (t !== 'combat' && types.includes(t)) continue;
    types.push(t);
  }
  if (!types.includes('combat')) types[types.length - 1] = 'combat';
  const spots = [[2, 2], [4, 1], [6, 2]];
  return rng.shuffle(types).map((t, i) => {
    const d = { t, tile: fix(at(...spots[i])), title: DOORS[t].name, info: DOORS[t].desc };
    if (t === 'combat' || t === 'elite') {
      const ids = buildEncounter(g, t === 'elite' ? 'elite' : 'random', null);
      if (t === 'combat' && floor > 15 && ids.length < 5) ids.push(rng.pick(ids));
      d.enemies = ids;
      d.info = ids.map((id) => ENEMIES[id].name).join(', ');
    }
    if (t === 'trial') { d.ev = rng.pick(TRIAL_EVENTS); d.title = EVENTS[d.ev].title; }
    return d;
  });
}

// la votazione ha scelto una porta: il gruppo la raggiunge, poi si apre la stanza
export function chooseDoor(g, idx) {
  const s = g.s, A = s.endless;
  const d = A.doors[idx];
  if (!d) return;
  A.door = d; A.entering = idx;
  const t = s.map.tiles[d.tile];
  s.party = { q: t.q, r: t.r };
  for (const h of s.heroes) h.pos = { ...s.party };
  g.log(`Il gruppo varca la porta: ${DOORS[d.t].icon} ${d.title}.`, 'event');
  g.timer(() => { if (g.s === s && s.phase === 'abyss' && A.entering === idx) { enterRoom(g); g.changed(); } }, 900);
}

export function enterRoom(g) {
  const s = g.s, A = s.endless, d = A.door;
  A.entering = null;
  const tile = s.map.tiles[d.tile];
  s.afterCombat = 'map';
  switch (d.t) {
    case 'combat': startCombat(g, [...d.enemies]); break;
    case 'elite': startCombat(g, [...d.enemies]); break;
    case 'boss': startCombat(g, [d.boss], { boss: true }); break;
    case 'shop': g.enterTown(null, 'abisso'); break;
    case 'trial': g.startEvent(d.ev, tile); break;
    case 'rest':
      s.fate = Math.min(s.fateMax, s.fate + 1);
      g.enterCamp(tile);
      g.log('✨ La brace vi rinfranca: +1 Scintilla del Fato.', 'fate');
      break;
  }
}

// sconfitta: la discesa finisce, il piano raggiunto entra nei record
export function abyssDefeat(g) {
  const s = g.s, A = s.endless;
  const floor = A.floor;
  try {
    addAbyssRecord({ floor, date: new Date().toISOString(), heroes: s.heroes.map((h) => `${h.name} (Lv ${h.level})`).join(', ') });
  } catch (e) { console.error('record abisso', e); }
  const best = Math.max(A.best || 0, floor);
  g.gameOver(`Il gruppo è caduto al piano ${floor} dell'Abisso.${floor >= best ? ' Nuovo record!' : ` Record: piano ${best}.`}`);
  s.gameover.abyss = { floor, best };
}

export { readAbyssRecords };
