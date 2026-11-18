// Combattimento tattico laterale (autoritativo)
import { SKILLS, CLASSES, weaponSkill } from '../shared/data/classes.js';
import { ENEMIES, ENCOUNTERS } from '../shared/data/enemies.js';
import { ITEMS } from '../shared/data/items.js';
import { MYTHIC } from '../shared/data/mythic.js';
import { heroDerived, heroSkills, STATUSES, ELEMENTS, hexDist } from '../shared/rules.js';

const CHARGE_MULT = [1, 1.5, 2, 2.5];
const CONTROL = ['stun', 'sleep', 'frozen', 'terror'];
const ENEMY_DELAY = 1150;
export const BATTLE_RANGE = 3;

// ---------------- Creazione ----------------
export function buildEncounter(g, spec, tile) {
  const s = g.s, rng = g.rng;
  const table = ENCOUNTERS[s.act];
  const n = g.partySize || s.heroes.filter((h) => h.alive).length;
  if (Array.isArray(spec)) return spec;
  const pool = (tile && table[tile.b]) || table.default;
  if (spec === 'elite') {
    const out = [rng.pick(table.elite)];
    for (let i = 0; i < Math.min(2, n - 1); i++) out.push(rng.pick(pool));
    return out;
  }
  const count = Math.max(1, Math.min(5, Math.round(n * 0.8 + rng.int(0, 2) + (s.threat > 60 ? 1 : 0))));
  return Array.from({ length: count }, () => rng.pick(pool));
}

function enemyUnit(g, id, idx, opts = {}) {
  const s = g.s;
  const d = ENEMIES[id];
  const n = g.partySize || s.heroes.filter((h) => h.alive).length;
  const partyScale = d.boss ? 0.45 + 0.2 * n : 0.6 + 0.14 * n;
  const threatScale = 1 + s.threat / 250;
  let hp = Math.round(d.hp * partyScale * (opts.hpMul || 1));
  const known = s.mythic && MYTHIC[s.mythic].revealWeak ? [...d.weak] : [];
  return {
    id: `e${idx}`, side: 'enemy', enemyId: id, name: d.name, boss: !!d.boss,
    row: d.boss ? 0 : d.back ? 1 : 0, lane: idx % 3,
    hp, maxHp: hp, mp: 0, maxMp: 0,
    atk: Math.round(d.atk * threatScale), mag: Math.round(d.mag * threatScale), def: d.def, mdef: d.mdef, spd: d.spd,
    crit: 5, eva: d.boss ? 0 : 3, heal: d.mag, dmgPct: 0, healPct: 0,
    guard: Math.max(1, d.guard - (opts.guardMinus || 0)), maxGuard: Math.max(1, d.guard - (opts.guardMinus || 0)), broken: 0,
    weak: d.weak, resist: d.resist, known,
    skills: d.skills, ai: d.ai, statuses: {}, charge: 0, alive: true, acted: false,
    phase: 1, evokeCd: 2,
  };
}

function heroUnit(g, hero) {
  const d = heroDerived(hero, g.s);
  const u = {
    id: `h${hero.id}`, side: 'hero', heroId: hero.id, name: hero.name,
    row: hero.row ?? CLASSES[hero.cls].row, lane: 0,
    hp: hero.alive ? Math.min(hero.hp, d.maxHp) : 0, maxHp: d.maxHp, mp: Math.min(hero.mp, d.maxMp), maxMp: d.maxMp,
    atk: d.atk, mag: d.mag, heal: d.heal, def: d.def, mdef: d.mdef, spd: d.spd, crit: d.crit, eva: d.eva,
    dmgPct: d.dmgPct, healPct: d.healPct, element: d.element, ranged: d.ranged, wtype: d.wtype,
    skills: heroSkills(hero), statuses: {}, charge: 0, alive: hero.alive && hero.hp > 0, acted: false,
  };
  return u;
}

export function startCombat(g, spec, opts = {}) {
  const s = g.s;
  const tile = s.map.tiles[`${s.party.q},${s.party.r}`];
  // combattono gli eroi entro 3 caselle dal punto dello scontro: i compagni vicini accorrono (anche i caduti, che si possono rianimare)
  const inBattle = s.heroes.filter((h) => !h.pos || hexDist(h.pos, s.party) <= BATTLE_RANGE);
  g.partySize = Math.max(1, inBattle.filter((h) => h.alive).length);
  const ids = buildEncounter(g, spec, tile);
  const enemies = [];
  let hpMul = 1, guardMinus = 0;
  if (opts.boss) {
    if (s.flags.boss_debole) { hpMul *= 0.8; guardMinus += 2; }
    for (const f of ['ally_lantern', 'ally_salt', 'ally_moth']) if (s.flags[f]) hpMul *= 0.88;
    delete s.flags.boss_debole;
  }
  ids.forEach((id, i) => enemies.push(enemyUnit(g, id, i, ENEMIES[id].boss ? { hpMul, guardMinus } : {})));
  // corsie
  for (const row of [0, 1]) enemies.filter((e) => e.row === row).forEach((e, i) => { e.lane = i % 3; });
  const heroes = inBattle.map((h) => heroUnit(g, h));
  // legami: bonus se il partner è in battaglia
  for (const hu of heroes) {
    const h = s.heroes.find((x) => x.id === hu.heroId);
    for (const [pid, type] of Object.entries(h.bonds || {})) {
      if (!s.heroes.find((x) => x.id === pid && x.alive)) continue;
      if (type === 'amici') hu.dmgPct += 5;
      if (type === 'rivali') hu.crit += 5;
      if (type === 'amanti') hu.healPct += 10;
    }
  }
  for (const row of [0, 1]) heroes.filter((e) => e.row === row).forEach((e, i) => { e.lane = i % 3; });
  s.combat = {
    id: `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`, seq: 0, round: 0, units: [...heroes, ...enemies], order: [], turn: -1, active: null,
    phase: 'fight', boss: !!opts.boss, onWin: opts.onWin || null, ambush: !!opts.ambush,
    bg: tile?.b || 'prato', last: null, summonUsed: false, concerts: [], lastHero: null, rewards: null, nextId: enemies.length,
    bossLine: opts.boss ? ENEMIES[ids[0]].lines?.[0] : null,
  };
  s.phase = 'combat';
  g.log(opts.boss ? `⚔ Scontro con ${ENEMIES[ids[0]].name}!` : `⚔ Battaglia! ${enemies.map((e) => e.name).join(', ')}`, 'combat');
  newRound(g);
}

// ---------------- Flusso dei turni ----------------
const unitById = (c, id) => c.units.find((u) => u.id === id);
const alive = (c, side) => c.units.filter((u) => u.side === side && u.alive);
const speedOf = (u) => u.spd * (u.statuses.haste ? 1.5 : 1) * (u.statuses.slow ? 0.6 : 1);

function newRound(g) {
  const c = g.s.combat;
  c.round++;
  for (const u of c.units) u.acted = false;
  const list = c.units.filter((u) => u.alive).map((u) => [u, speedOf(u) + g.rng.int(0, 5) + (c.ambush && c.round === 1 && u.side === 'enemy' ? 50 : 0)]);
  list.sort((a, b) => b[1] - a[1]);
  c.order = list.map(([u]) => u.id);
  c.turn = -1;
  nextTurn(g);
}

export function nextTurn(g) {
  const c = g.s.combat;
  if (!c || c.phase !== 'fight') return;
  if (checkEnd(g)) return;
  c.turn++;
  if (c.turn >= c.order.length) return newRound(g);
  const u = unitById(c, c.order[c.turn]);
  if (!u || !u.alive) return nextTurn(g);
  c.active = u.id;
  // stati a inizio turno
  const st = u.statuses;
  if (st.burn) dot(g, u, 0.06, 'Bruciatura');
  if (st.poison) dot(g, u, 0.08, 'Veleno');
  if (st.regen && u.alive) { const h = Math.max(1, Math.round(u.maxHp * 0.08)); u.hp = Math.min(u.maxHp, u.hp + h); }
  if (!u.alive) { g.changed(); return later(g, () => nextTurn(g), 600); }
  let skip = null;
  if (u.broken > 0) {
    u.broken--; skip = 'Spezzato';
    if (u.broken === 0) { u.guard = u.maxGuard; }
  } else if (st.frozen) { skip = 'Congelato'; delete st.frozen; }
  else if (st.stun) { skip = 'Stordito'; delete st.stun; }
  else if (st.sleep) skip = 'Addormentato';
  else if (st.terror && g.rng.chance(0.3)) skip = 'Terrorizzato';
  tickStatuses(u);
  u.defending = false;
  if (skip) {
    u.acted = true;
    c.last = { seq: ++c.seq, actor: u.id, name: skip, skip: true, results: [] };
    g.changed();
    return later(g, () => nextTurn(g), 800);
  }
  if (u.side === 'enemy') { g.changed(); later(g, () => enemyAct(g, u.id), ENEMY_DELAY); }
  else g.changed();
}

function later(g, fn, ms) {
  const token = g.s.combat?.seq;
  g.timer(() => { if (g.s.combat && g.s.phase === 'combat') fn(); }, ms, token);
}

function tickStatuses(u) {
  for (const [k, v] of Object.entries(u.statuses)) {
    if (k === 'frozen' || k === 'stun') continue;
    v.turns--;
    if (v.turns <= 0) delete u.statuses[k];
  }
}

function dot(g, u, pct, label) {
  const d = Math.max(1, Math.round(u.maxHp * pct * (u.boss ? 0.4 : 1)));
  u.hp -= d;
  if (u.hp <= 0) { u.hp = 0; u.alive = false; g.log(`${u.name} soccombe a: ${label}.`, 'combat'); }
}

function checkEnd(g) {
  const c = g.s.combat;
  if (alive(c, 'enemy').length === 0) { victory(g); return true; }
  if (alive(c, 'hero').length === 0) { c.phase = 'defeat'; c.active = null; g.log('Il gruppo è caduto...', 'bad'); g.changed(); return true; }
  return false;
}

// ---------------- Azioni degli eroi ----------------
export function availableActions(g, u) {
  const c = g.s.combat, s = g.s;
  const out = { concert: null, summon: null };
  const last = c.lastHero && unitById(c, c.lastHero);
  if (last && last.alive && last.id !== u.id) {
    const h = s.heroes.find((x) => x.id === u.heroId);
    const bond = h.bonds?.[last.heroId];
    const key = [u.id, last.id].sort().join('|');
    if (bond && !c.concerts.includes(key)) out.concert = { partner: last.id, bond };
  }
  if (s.mythic && !c.summonUsed && s.fate >= 1) out.summon = MYTHIC[s.mythic].summon;
  return out;
}

export function heroAction(g, player, a) {
  const c = g.s.combat;
  if (!c || c.phase !== 'fight') throw 'Nessuna battaglia in corso';
  const u = unitById(c, c.active);
  if (!u || u.side !== 'hero') throw 'Non è il turno di un eroe';
  if (u.acted) throw 'Azione già eseguita, attendi il turno successivo';
  const hero = g.s.heroes.find((h) => h.id === u.heroId);
  if (!g.canControl(player, hero)) throw 'Non controlli questo eroe';
  const done = () => { u.acted = true; c.lastHero = u.id; g.changed(); later(g, () => nextTurn(g), 950); };

  switch (a.kind) {
    case 'attack': {
      // l'attacco dipende dall'arma equipaggiata (vedi WEAPON_MOVES)
      const sk = weaponSkill(u.wtype, a.move, u.element);
      useSkill(g, u, sk, resolveTargets(g, u, sk, a.target));
      return done();
    }
    case 'skill': {
      const skId = a.skill;
      if (!u.skills.includes(skId)) throw 'Abilità sconosciuta';
      const sk = { id: skId, ...SKILLS[skId] };
      if (a.kind === 'skill' && u.statuses.silence) throw 'Sei sotto Silenzio';
      if (u.mp < sk.mp) throw 'PM insufficienti';
      const targets = resolveTargets(g, u, sk, a.target);
      u.mp -= sk.mp;
      useSkill(g, u, sk, targets);
      return done();
    }
    case 'concert': {
      const av = availableActions(g, u);
      if (!av.concert) throw 'Nessun concerto disponibile';
      const p = unitById(c, av.concert.partner);
      c.concerts.push([u.id, p.id].sort().join('|'));
      const power = av.concert.bond === 'amanti' ? 1.5 : 1.25;
      const sk = { id: 'concerto', name: `Concerto: ${u.name} & ${p.name}`, kind: 'mag', target: 'enemies', power, el: u.element, guard: 1, concert: true };
      const fake = { ...u, mag: Math.round((u.atk + u.mag + p.atk + p.mag) / 2.2) };
      useSkill(g, fake, sk, alive(c, 'enemy'), u);
      return done();
    }
    case 'summon': {
      const av = availableActions(g, u);
      if (!av.summon) throw 'Evocazione non disponibile';
      g.s.fate--; c.summonUsed = true;
      const sk = { id: av.summon, ...SKILLS[av.summon], summon: true };
      const fake = { ...u, mag: Math.max(u.atk, u.mag) + 10 * g.s.act };
      useSkill(g, fake, sk, alive(c, 'enemy'), u);
      if (sk.special === 'summon_heal') for (const h of alive(c, 'hero')) h.hp = Math.min(h.maxHp, h.hp + Math.round(h.maxHp * 0.3));
      return done();
    }
    case 'charge': {
      u.charge = Math.min(3, u.charge + 1);
      c.last = { seq: ++c.seq, actor: u.id, name: `Slancio ${u.charge}`, charge: u.charge, results: [] };
      return done();
    }
    case 'defend': {
      u.defending = true;
      u.mp = Math.min(u.maxMp, u.mp + Math.max(1, Math.round(u.maxMp * 0.08)));
      c.last = { seq: ++c.seq, actor: u.id, name: 'Difesa', results: [] };
      return done();
    }
    case 'move': {
      u.row = u.row ? 0 : 1;
      hero.row = u.row;
      const same = alive(c, 'hero').filter((x) => x.row === u.row && x.id !== u.id);
      u.lane = [0, 1, 2].find((l) => !same.some((x) => x.lane === l)) ?? 0;
      c.last = { seq: ++c.seq, actor: u.id, name: u.row ? 'Arretra' : 'Avanza', results: [] };
      return done();
    }
    case 'item': {
      const idx = g.s.bag.findIndex((i) => i.uid === a.uid);
      if (idx < 0) throw 'Oggetto non trovato';
      const it = g.s.bag[idx], d = ITEMS[it.base];
      if (!d.use) throw 'Non utilizzabile';
      const results = [];
      if (d.use.bomb) {
        for (const e of alive(c, 'enemy')) results.push(applyDamage(g, u, e, d.use.bomb * (1 + 0.3 * (g.s.act - 1)), d.use.el, {}));
      } else {
        const t = unitById(c, a.target) || u;
        if (t.side !== 'hero') throw 'Bersaglio non valido';
        if (d.use.revive) { if (t.alive) throw 'È ancora in vita'; t.alive = true; t.hp = Math.round(t.maxHp * d.use.revive); results.push({ id: t.id, heal: t.hp, revived: true }); }
        else {
          if (!t.alive) throw 'Bersaglio caduto';
          if (d.use.heal) { const h = Math.min(t.maxHp - t.hp, d.use.heal); t.hp += h; results.push({ id: t.id, heal: h }); }
          if (d.use.mp) { const m = Math.min(t.maxMp - t.mp, d.use.mp); t.mp += m; results.push({ id: t.id, mp: m }); }
          if (d.use.cleanse) { cleanse(t); results.push({ id: t.id, cleansed: true }); }
          if (d.use.threat) throw 'Da usare fuori dal combattimento';
        }
      }
      g.s.bag.splice(idx, 1);
      c.last = { seq: ++c.seq, actor: u.id, name: d.name, kind: 'item', results };
      return done();
    }
    case 'flee': {
      if (c.boss) throw 'Non si può fuggire da questo scontro';
      const hs = alive(c, 'hero'), es = alive(c, 'enemy');
      const avg = (arr) => arr.reduce((t, x) => t + x.spd, 0) / arr.length;
      const p = Math.max(0.15, Math.min(0.9, 0.45 + (avg(hs) - avg(es)) * 0.03));
      if (g.rng.chance(p)) {
        c.phase = 'fled'; c.active = null;
        c.last = { seq: ++c.seq, actor: u.id, name: 'Fuga riuscita!', results: [] };
        g.log('Il gruppo fugge dalla battaglia.', 'combat');
        g.changed();
        return;
      }
      c.last = { seq: ++c.seq, actor: u.id, name: 'Fuga fallita!', results: [] };
      return done();
    }
    default: throw 'Azione sconosciuta';
  }
}

function frontBlocked(c, side) { return alive(c, side).some((x) => x.row === 0); }

function resolveTargets(g, u, sk, targetId) {
  const c = g.s.combat;
  const foeSide = u.side === 'hero' ? 'enemy' : 'hero';
  const friendSide = u.side;
  switch (sk.target) {
    case 'enemies': return alive(c, foeSide);
    case 'allies': return alive(c, friendSide);
    case 'self': return [u];
    case 'randomEnemies': return alive(c, foeSide);
    case 'ally': { const t = unitById(c, targetId); if (!t || t.side !== friendSide || !t.alive) throw 'Bersaglio non valido'; return [t]; }
    case 'deadAlly': { const t = unitById(c, targetId); if (!t || t.side !== friendSide || t.alive) throw 'Scegli un alleato caduto'; return [t]; }
    default: {
      const t = unitById(c, targetId);
      if (!t || t.side !== foeSide || !t.alive) throw 'Bersaglio non valido';
      const melee = sk.kind === 'phys' && !sk.reach && !u.ranged;
      if (melee && t.row === 1 && frontBlocked(c, foeSide)) throw 'La prima fila protegge questo bersaglio: usa un\'arma a distanza o magia';
      return [t];
    }
  }
}

// ---------------- Risoluzione abilità ----------------
function useSkill(g, u, sk, targets, realActor) {
  const c = g.s.combat;
  const actor = realActor || u;
  const results = [];
  const mult = CHARGE_MULT[actor.charge] || 1;
  const hits = sk.hits || 1;
  const offensive = sk.kind === 'phys' || sk.kind === 'mag';
  if (sk.special === 'prism') {
    for (let i = 0; i < hits; i++) {
      const foes = alive(c, actor.side === 'hero' ? 'enemy' : 'hero');
      if (!foes.length) break;
      const t = g.rng.pick(foes);
      const el = g.rng.pick(['fuoco', 'gelo', 'fulmine', 'luce']);
      results.push(applyDamage(g, u, t, null, el, { sk, mult }));
    }
  } else if (sk.aoe === 'volley') {
    // colpi su nemici casuali
    for (let i = 0; i < hits; i++) {
      const foes = alive(c, actor.side === 'hero' ? 'enemy' : 'hero');
      if (!foes.length) break;
      results.push(applyDamage(g, u, g.rng.pick(foes), null, sk.el, { sk, mult }));
    }
  } else {
    // attacchi ad area delle armi: il bersaglio scelto + i vicini (sweep) o tutta la sua fila (row)
    let pairs = targets.map((t) => [t, 1]);
    if (offensive && targets.length === 1 && (sk.aoe === 'sweep' || sk.aoe === 'row')) {
      const t0 = targets[0];
      const others = alive(c, t0.side).filter((o) => o !== t0 && o.row === t0.row && (sk.aoe === 'row' || Math.abs(o.lane - t0.lane) <= 1));
      pairs = [[t0, 1], ...others.map((o) => [o, sk.aoe === 'row' ? 1 : 0.6])];
    }
    for (const [t, factor] of pairs) {
      if (offensive) {
        for (let i = 0; i < hits; i++) {
          if (!t.alive) break;
          const r = applyDamage(g, u, t, null, sk.el, { sk, mult: mult * factor });
          results.push(r);
          if (r.dmg && sk.drain) { const h = Math.round(r.dmg * sk.drain); actor.hp = Math.min(actor.maxHp, actor.hp + h); results.push({ id: actor.id, heal: h }); }
          if (r.miss) break;
        }
        if (t.alive && sk.st) applyStatuses(g, t, sk.st, results);
        if (sk.special === 'steal' && t.side === 'enemy') steal(g, t, sk.id === 'borseggio', results);
      } else if (sk.kind === 'heal') {
        if (!t.alive) continue;
        const amount = Math.round(((actor.side === 'hero' ? u.heal : u.mag) * sk.power * 1.2 + 6) * (1 + (u.healPct || 0) / 100) * mult);
        const h = Math.min(t.maxHp - t.hp, amount);
        t.hp += h;
        results.push({ id: t.id, heal: h });
        if (sk.special === 'cleanse') { cleanse(t); results.push({ id: t.id, cleansed: true }); }
      } else if (sk.special === 'revive') {
        t.alive = true; t.hp = Math.round(t.maxHp * 0.4); t.statuses = {};
        results.push({ id: t.id, heal: t.hp, revived: true });
      } else if (sk.special === 'analyze') {
        t.known = [...t.weak];
        results.push({ id: t.id, analyzed: true });
        g.log(`Analisi: ${t.name} è debole a ${t.weak.map((w) => ELEMENTS[w].name).join(', ')}.`, 'info');
      } else if (sk.special === 'summon_minions') {
        summonMinions(g, u, results);
      } else {
        if (sk.st) applyStatuses(g, t, sk.st, results, true);
        if (sk.special === 'charge1') t.charge = Math.min(3, t.charge + 1);
        if (sk.special === 'charge2') t.charge = Math.min(3, t.charge + 2);
        if (sk.special?.startsWith('charge')) results.push({ id: t.id, charge: t.charge });
      }
    }
  }
  if (sk.kind !== 'buff' || !sk.special?.startsWith('charge')) actor.charge = 0;
  const ranged = !!(sk.reach || sk.kind === 'mag' || (sk.id === 'attacco' && u.ranged));
  c.last = { seq: ++c.seq, actor: actor.id, name: sk.name, el: sk.el, kind: sk.kind, summon: !!sk.summon, concert: !!sk.concert, ranged, aoe: sk.aoe || (sk.target === 'enemies' ? 'all' : null), results };
  const dmgTot = results.reduce((t, r) => t + (r.dmg || 0), 0);
  g.log(`${actor.name}: ${sk.name}${dmgTot ? ` (${dmgTot} danni)` : ''}${results.some((r) => r.broke) ? ' — SPEZZATO!' : ''}`, actor.side === 'hero' ? 'combat' : 'enemy');
  checkBossPhase(g);
}

function applyDamage(g, u, t, flat, el, { sk = SKILLS.attacco, mult = 1 } = {}) {
  const rng = g.rng;
  const phys = flat == null && sk.kind === 'phys';
  el = el || (phys || sk.id === 'attacco' ? u.element || 'botta' : null);
  const r = { id: t.id, el };
  if (flat == null && phys && !sk.summon && !sk.concert) {
    if (u.statuses?.blind && rng.chance(0.5)) { r.miss = true; return r; }
    const eva = (t.eva || 0) + (t.statuses.shadow ? 40 : 0);
    if (rng.chance(eva / 100)) { r.miss = true; return r; }
  }
  let dmg;
  if (flat != null) dmg = flat;
  else {
    const base = phys ? u.atk : u.mag;
    const raw = base * (sk.power || 1) * (0.9 + rng.next() * 0.2);
    const defv = phys ? t.def : t.mdef;
    dmg = raw * 40 / (40 + defv);
  }
  if (el && t.weak?.includes(el)) { dmg *= 1.5; r.weak = true; if (t.known && !t.known.includes(el)) t.known.push(el); }
  else if (el && t.resist?.includes(el)) { dmg *= 0.5; r.resist = true; }
  if (u.statuses?.strong) dmg *= 1.3;
  if (u.statuses?.weak) dmg *= 0.7;
  dmg *= 1 + (u.dmgPct || 0) / 100;
  const ts = t.statuses;
  if (ts.marked) dmg *= 1.25;
  if (phys && ts.protected) dmg *= 0.6;
  if (!phys && ts.ward) dmg *= 0.6;
  if (t.defending) dmg *= 0.5;
  if (t.broken > 0) dmg *= 1.5;
  if (ts.wet && el === 'fulmine') { dmg *= 2; delete ts.wet; r.combo = 'Conduzione!'; }
  else if (ts.wet && el === 'fuoco') { dmg *= 0.5; delete ts.wet; r.combo = 'Vapore'; }
  if (ts.frozen && el === 'botta') { dmg *= 2; delete ts.frozen; r.combo = 'Frantumato!'; }
  if (ts.burn && el === 'gelo') { delete ts.burn; }
  if (sk.special === 'backstab' && (ts.marked || ts.stun || ts.frozen || ts.sleep || t.broken > 0)) { dmg *= 1.8; r.combo = 'Alle spalle!'; }
  if (sk.special === 'execute' && t.hp / t.maxHp < 0.35) { dmg *= 2.5; r.combo = 'Esecuzione!'; }
  dmg *= mult;
  if (u.side === 'hero' && phys && u.row === 1 && !sk.reach && !u.ranged) dmg *= 0.6;
  if (phys && flat == null) {
    const critCh = (u.crit || 5) + (sk.crit || 0) + (ts.marked ? 15 : 0);
    if (sk.special === 'sure' || rng.chance(critCh / 100)) { dmg *= 1.6; r.crit = true; }
  }
  dmg = Math.max(1, Math.round(dmg));
  t.hp -= dmg;
  r.dmg = dmg;
  if (ts.sleep) delete ts.sleep;
  // Guardia
  if (t.side === 'enemy' && t.broken === 0) {
    let gd = 0;
    if (r.weak) gd += 1;
    if (sk.guard) gd += sk.guard;
    if (gd) {
      t.guard = Math.max(0, t.guard - gd);
      r.guardHit = gd;
      if (t.guard === 0) { t.broken = t.acted ? 2 : 1; r.broke = true; }
    }
  }
  if (t.hp <= 0) { t.hp = 0; t.alive = false; t.statuses = {}; r.died = true; }
  return r;
}

function applyStatuses(g, t, list, results, friendly = false) {
  for (const [id, ch, turns] of list) {
    let p = ch;
    if (!friendly && t.boss && CONTROL.includes(id)) p *= 0.35;
    if (!friendly && t.statuses.ward && STATUSES[id]?.bad) p *= 0.7;
    if (g.rng.chance(p)) {
      t.statuses[id] = { turns: Math.max(turns, t.statuses[id]?.turns || 0) };
      results.push({ id: t.id, st: id });
    }
  }
}

function cleanse(t) { for (const k of Object.keys(t.statuses)) if (STATUSES[k]?.bad) delete t.statuses[k]; }

function steal(g, t, better, results) {
  const s = g.s;
  if (t.stolen) { results.push({ id: t.id, stealFail: true }); return; }
  if (g.rng.chance(better ? 0.85 : 0.55)) {
    t.stolen = true;
    if (g.rng.chance(0.5)) { const gold = g.rng.int(8, 25) * s.act; s.gold += gold; results.push({ id: t.id, stole: `${gold} oro` }); }
    else { const it = g.makeItem(g.rng.pick(['pozione', 'etere', 'sali', 'bomba_cenere', 'pozione_grande'])); s.bag.push(it); results.push({ id: t.id, stole: ITEMS[it.base].name }); }
  } else results.push({ id: t.id, stealFail: true });
}

function summonMinions(g, u, results) {
  const c = g.s.combat;
  const d = ENEMIES[u.enemyId];
  const n = Math.min(2, 5 - alive(c, 'enemy').length);
  for (let i = 0; i < n; i++) {
    const id = g.rng.pick(d.minions || ['cenerario']);
    const m = enemyUnit(g, id, c.nextId++);
    m.row = 1;
    const used = alive(c, 'enemy').filter((x) => x.row === 1).map((x) => x.lane);
    m.lane = [0, 1, 2].find((l) => !used.includes(l)) ?? i;
    m.acted = true;
    c.units.push(m);
    results.push({ id: m.id, summoned: true });
  }
  u.evokeCd = 4;
}

function checkBossPhase(g) {
  const c = g.s.combat;
  for (const u of c.units) {
    if (!u.boss || !u.alive || u.phase >= (ENEMIES[u.enemyId].phases || 1)) continue;
    if (u.hp <= u.maxHp * 0.5) {
      u.phase++;
      u.hp = Math.min(u.maxHp, u.hp + Math.round(u.maxHp * 0.15));
      u.guard = u.maxGuard = u.maxGuard + 2; u.broken = 0;
      u.statuses = { strong: { turns: 99 }, ward: { turns: 3 } };
      u.atk = Math.round(u.atk * 1.15); u.mag = Math.round(u.mag * 1.15);
      c.bossLine = ENEMIES[u.enemyId].lines?.[1] || null;
      c.phaseShift = (c.phaseShift || 0) + 1;
      g.log(`${u.name} si trasforma! ${c.bossLine || ''}`, 'bad');
    }
  }
}

// ---------------- IA nemica ----------------
function enemyAct(g, uid) {
  const c = g.s.combat;
  if (!c || c.phase !== 'fight') return;
  const u = unitById(c, uid);
  if (!u || !u.alive || c.active !== uid) return nextTurn(g);
  const rng = g.rng;
  const allies = alive(c, 'enemy');
  const heroes = alive(c, 'hero');
  if (!heroes.length) return nextTurn(g);
  let skId = 'attacco';
  const skills = u.skills.filter((s) => s !== 'evoca' || (u.evokeCd <= 0 && allies.length < 4));
  if (u.evokeCd > 0) u.evokeCd--;
  const wounded = allies.filter((a) => a.hp < a.maxHp * 0.5).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
  if (u.statuses.silence) skId = 'attacco';
  else if (u.ai === 'healer' && wounded.length && skills.includes('cura_oscura')) skId = 'cura_oscura';
  else if (u.ai === 'boss') {
    if (skills.includes('evoca') && allies.length < 3) skId = 'evoca';
    else skId = rng.chance(0.8) ? rng.pick(skills.filter((s) => s !== 'evoca')) : 'attacco';
  } else if (u.ai === 'caster') skId = rng.chance(0.7) ? rng.pick(skills.filter((s) => s !== 'cura_oscura' || wounded.length)) : 'attacco';
  else skId = rng.chance(0.45) ? rng.pick(skills) : 'attacco';
  const sk = { id: skId, ...SKILLS[skId] };
  if (skId === 'scudo_oscuro' && allies.every((a) => a.statuses.protected)) { sk.id = 'attacco'; Object.assign(sk, SKILLS.attacco); }
  let targets;
  if (sk.target === 'enemies') targets = heroes;
  else if (sk.target === 'allies') targets = allies;
  else if (sk.target === 'self') targets = [u];
  else if (sk.target === 'ally') targets = [wounded[0] || u];
  else {
    const melee = sk.kind === 'phys' && !sk.reach;
    let pool = heroes;
    const taunt = heroes.filter((h) => h.statuses.taunt);
    if (taunt.length) pool = taunt;
    else if (melee && heroes.some((h) => h.row === 0)) pool = heroes.filter((h) => h.row === 0);
    // preferisci i più feriti
    targets = [rng.weighted(pool.map((h) => [h, 1 + (1 - h.hp / h.maxHp) * 2]))];
  }
  if (sk.kind === 'mag' && sk.target === 'enemy' && u.boss) sk.power *= 1.1;
  useSkill(g, u, sk, targets);
  u.acted = true;
  g.changed();
  later(g, () => nextTurn(g), 950);
}

// ---------------- Fine battaglia ----------------
function victory(g) {
  const s = g.s, c = s.combat;
  c.phase = 'victory'; c.active = null;
  const enemies = c.units.filter((u) => u.side === 'enemy');
  let xp = 0, gold = 0;
  const items = [];
  for (const e of enemies) {
    const d = ENEMIES[e.enemyId];
    xp += d.xp; gold += d.gold;
    if (!d.boss && g.rng.chance(d.elite ? 0.6 : 0.12)) items.push(g.randomLoot(d.elite ? 'rare' : 'any'));
    if (d.boss) { items.push(g.randomLoot('epic')); items.push(g.makeItem('brace_vitale')); }
  }
  if (s.mythic === 'sale') gold = Math.round(gold * 1.25);
  gold = Math.round(gold * (1 + 0.15 * (s.act - 1)));
  s.gold += gold;
  for (const it of items) s.bag.push(it);
  // riporta PV/PM sugli eroi
  syncHeroes(g);
  const levels = g.grantXp(xp);
  c.rewards = { xp, gold, items: items.map((i) => g.itemLabel(i)), levels };
  g.log(`Vittoria! +${xp} XP, +${gold} oro${items.length ? `, ${items.map((i) => g.itemLabel(i)).join(', ')}` : ''}.`, 'good');
  g.changed();
}

export function syncHeroes(g) {
  const c = g.s.combat;
  for (const u of c.units.filter((x) => x.side === 'hero')) {
    const h = g.s.heroes.find((x) => x.id === u.heroId);
    if (!h) continue;
    h.hp = Math.max(0, u.hp); h.mp = Math.max(0, u.mp);
    h.alive = u.alive && u.hp > 0;
    if (!h.alive) h.hp = 0;
  }
}
