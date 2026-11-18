// Regole condivise tra server e client (formule pure, nessuno stato)
import { CLASSES } from './data/classes.js';
import { ITEMS, AFFIXES } from './data/items.js';
import { TALENTS, TRAITS, TRANSFORMS } from './data/heroes.js';
import { MYTHIC } from './data/mythic.js';

export const STATS = ['str', 'vit', 'int', 'spi', 'dex', 'agi', 'luk'];
export const STAT_NAMES = { str: 'Forza', vit: 'Vigore', int: 'Intelletto', spi: 'Spirito', dex: 'Destrezza', agi: 'Rapidità', luk: 'Fortuna' };
export const STAT_ABBR = { str: 'FOR', vit: 'VIG', int: 'INT', spi: 'SPI', dex: 'DES', agi: 'RAP', luk: 'FRT' };
export const MAX_LEVEL = 12;
export const MAX_HEROES = 4;
export const SLOTS = ['weapon', 'offhand', 'head', 'body', 'acc1', 'acc2'];
export const SLOT_NAMES = { weapon: 'Arma', offhand: 'Secondaria', head: 'Testa', body: 'Corpo', acc1: 'Accessorio', acc2: 'Accessorio' };

export const ELEMENTS = {
  taglio: { name: 'Taglio', icon: '🗡', color: '#d9d4c7' },
  punta: { name: 'Punta', icon: '➶', color: '#c7d0d9' },
  botta: { name: 'Botta', icon: '🔨', color: '#b49a7a' },
  fuoco: { name: 'Fuoco', icon: '🔥', color: '#ff7a2f' },
  gelo: { name: 'Gelo', icon: '❄', color: '#7fd4ff' },
  fulmine: { name: 'Fulmine', icon: '⚡', color: '#ffe45c' },
  luce: { name: 'Luce', icon: '☀', color: '#fff2b0' },
  ombra: { name: 'Ombra', icon: '☾', color: '#a77bff' },
};

export const STATUSES = {
  burn: { name: 'Bruciato', icon: '🔥', bad: true, desc: 'Perde il 6% dei PV a turno.' },
  poison: { name: 'Avvelenato', icon: '☠', bad: true, desc: 'Perde l\'8% dei PV a turno.' },
  regen: { name: 'Rigenerazione', icon: '✚', bad: false, desc: 'Recupera l\'8% dei PV a turno.' },
  wet: { name: 'Bagnato', icon: '💧', bad: true, desc: 'Fulmine ×2, Fuoco dimezzato.' },
  frozen: { name: 'Congelato', icon: '❄', bad: true, desc: 'Salta il turno. Botta ×2 lo frantuma.' },
  stun: { name: 'Stordito', icon: '✦', bad: true, desc: 'Salta il turno.' },
  sleep: { name: 'Addormentato', icon: 'z', bad: true, desc: 'Salta il turno, si sveglia se colpito.' },
  marked: { name: 'Marchiato', icon: '◎', bad: true, desc: 'Subisce +25% danni e più critici.' },
  protected: { name: 'Protetto', icon: '🛡', bad: false, desc: 'Danni fisici −40%.' },
  ward: { name: 'Egida', icon: '✧', bad: false, desc: 'Danni magici −40%.' },
  strong: { name: 'Vigore', icon: '▲', bad: false, desc: 'Infligge +30% danni.' },
  weak: { name: 'Debolezza', icon: '▼', bad: true, desc: 'Infligge −30% danni.' },
  haste: { name: 'Rapido', icon: '»', bad: false, desc: 'Agisce prima.' },
  slow: { name: 'Lento', icon: '«', bad: true, desc: 'Agisce dopo.' },
  blind: { name: 'Accecato', icon: '◌', bad: true, desc: 'Attacchi fisici: 50% di mancare.' },
  silence: { name: 'Silenzio', icon: '∅', bad: true, desc: 'Non può usare abilità.' },
  terror: { name: 'Terrore', icon: '!', bad: true, desc: '30% di perdere il turno.' },
  shadow: { name: 'Velo d\'Ombra', icon: '☾', bad: false, desc: 'Schivata +40%.' },
  taunt: { name: 'Provocazione', icon: '⚑', bad: false, desc: 'I nemici lo prendono di mira.' },
};

export const JOURNEY = {
  passi: { name: 'Cammino', icon: '👣', desc: 'Passi sulla mappa: valore del dado + 4 (gli altri usi lasciano 3 passi).' },
  foraggio: { name: 'Foraggio', icon: '🍖', desc: 'Razioni raccolte (metà del valore).' },
  vedetta: { name: 'Vedetta', icon: '👁', desc: 'Riduce gli agguati notturni, 5+ allarga la vista.' },
  ricerca: { name: 'Ricerca', icon: '🔍', desc: 'Fruga la casella: 3+ oro, 5+ oggetto.' },
};

export const mod = (v) => Math.floor((v - 10) / 2);
export const xpToNext = (lvl) => Math.round(50 * lvl + 25 * lvl * lvl);

// ---------- Esagoni (assiali) ----------
export const HEX_DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
export const hkey = (q, r) => `${q},${r}`;
export const hexDist = (a, b) => (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
export const neighbors = (q, r) => HEX_DIRS.map(([dq, dr]) => ({ q: q + dq, r: r + dr }));

// ---------- Oggetti ----------
export function itemDef(inst) { return inst ? ITEMS[inst.base] : null; }
export function itemName(inst) {
  if (!inst) return '';
  if (inst.name) return inst.name;
  const d = ITEMS[inst.base];
  return d ? d.name : inst.base;
}
export function itemBonuses(inst) {
  const d = ITEMS[inst.base];
  const out = { ...(d?.bonus || {}) };
  for (const a of inst.affixes || []) {
    const ad = AFFIXES[a];
    if (!ad) continue;
    for (const [k, v] of Object.entries(ad.bonus)) out[k] = (out[k] || 0) + v;
  }
  return out;
}
export function itemPrice(inst) {
  const d = ITEMS[inst.base];
  const rar = { comune: 1, raro: 1.8, epico: 3, mitico: 5 }[inst.rarity || 'comune'];
  return Math.round((d?.price || 10) * rar);
}

// ---------- Statistiche derivate dell'eroe ----------
export function heroDerived(hero, game) {
  const cls = CLASSES[hero.cls];
  const s = {};
  for (const k of STATS) s[k] = Math.floor(cls.base[k] + cls.growth[k] * (hero.level - 1)) + (hero.bonusStats?.[k] || 0);
  const add = { atk: 0, mag: 0, def: 0, mdef: 0, hp: 0, mp: 0, crit: 0, eva: 0, spd: 0, hpPct: 0, defPct: 0, dmgPct: 0, healPct: 0 };
  const apply = (b) => {
    for (const [k, v] of Object.entries(b || {})) {
      if (k in s) s[k] += v; else add[k] = (add[k] || 0) + v;
    }
  };
  const sub = cls.subclasses.find((x) => x.id === hero.sub);
  if (sub) apply(sub.bonus);
  for (const slot of SLOTS) if (hero.equip?.[slot]) apply(itemBonuses(hero.equip[slot]));
  for (const t of hero.talents || []) apply(TALENTS[t]?.bonus);
  for (const t of hero.traits || []) apply(TRAITS[t]?.bonus);
  for (const t of hero.transforms || []) apply(TRANSFORMS[t]?.bonus);
  if (hero.legend) apply({ str: 1, vit: 1, int: 1, spi: 1, dex: 1, agi: 1, luk: 1 });
  if (game?.mythic) apply(MYTHIC[game.mythic]?.bonus);

  const w = hero.equip?.weapon ? ITEMS[hero.equip.weapon.base] : null;
  const wtype = w?.wtype || cls.weapon;
  const physStat = ['pugnale', 'arco'].includes(wtype) ? s.dex : s.str;
  const maxHp = Math.round((cls.hp + cls.hpG * (hero.level - 1) + s.vit * 2 + add.hp) * (1 + add.hpPct / 100));
  const maxMp = Math.round(cls.mp + cls.mpG * (hero.level - 1) + s.spi + Math.floor(s.int / 2) + add.mp);
  return {
    stats: s,
    maxHp, maxMp,
    atk: Math.round(physStat * 1.5 + add.atk),
    mag: Math.round(Math.max(s.int, s.spi) * 1.5 + add.mag),
    heal: Math.round(s.spi * 1.6 + add.mag * 0.5),
    def: Math.round((s.vit * 0.6 + add.def) * (1 + add.defPct / 100)),
    mdef: Math.round(s.spi * 0.6 + add.mdef),
    spd: s.agi + add.spd,
    crit: 5 + Math.floor(s.luk / 3) + add.crit,
    eva: Math.floor(s.agi / 4) + add.eva,
    dmgPct: add.dmgPct, healPct: add.healPct,
    wtype,
    element: w?.el || cls.element,
    ranged: wtype === 'arco' || wtype === 'bastone' || wtype === 'lanterna',
  };
}

// Modificatore per le prove narrative (d20 + mod + competenza + tratti)
export function checkBonus(hero, stat, game) {
  const d = heroDerived(hero, game);
  const cls = CLASSES[hero.cls];
  let b = mod(d.stats[stat]);
  if (cls.prof.includes(stat)) b += 2;
  for (const t of hero.traits || []) if (TRAITS[t]?.check === stat) b += 2;
  for (const t of hero.transforms || []) if (TRANSFORMS[t]?.check === stat) b += 2;
  b += Math.floor((hero.level - 1) / 4);
  return b;
}
export function successChance(bonus, dc) {
  const need = dc - bonus; // serve d20 >= need
  if (need <= 2) return 0.95;
  if (need > 20) return 0.05;
  return (21 - need) / 20;
}

export function heroSkills(hero) {
  const cls = CLASSES[hero.cls];
  const out = cls.skills.filter(([, l]) => hero.level >= l).map(([id]) => id);
  const sub = cls.subclasses.find((x) => x.id === hero.sub);
  if (sub) for (const [id, l] of sub.skills) if (hero.level >= l) out.push(id);
  if (hero.job && CLASSES[hero.job]) {
    for (const [id] of CLASSES[hero.job].skills.slice(0, 2)) if (!out.includes(id)) out.push(id);
  }
  for (const t of hero.talents || []) if (TALENTS[t]?.skill) out.push(TALENTS[t].skill);
  return out;
}
