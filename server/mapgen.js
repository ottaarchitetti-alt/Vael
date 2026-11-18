// Generazione procedurale della mappa esagonale di un atto
import { BIOMES } from '../shared/data/mythic.js';
import { EVENTS } from '../shared/data/events.js';
import { STORY } from '../shared/data/story.js';
import { hkey, neighbors, hexDist } from '../shared/rules.js';

export const MAP_W = 22;
export const MAP_H = 13;

function valueNoise(rng, w, h, scale) {
  const gw = Math.ceil(w / scale) + 2, gh = Math.ceil(h / scale) + 2;
  const g = Array.from({ length: gw * gh }, () => rng.next());
  const sm = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const fx = x / scale, fy = y / scale;
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const tx = sm(fx - x0), ty = sm(fy - y0);
    const v = (i, j) => g[(j % gh) * gw + (i % gw)];
    const a = v(x0, y0) * (1 - tx) + v(x0 + 1, y0) * tx;
    const b = v(x0, y0 + 1) * (1 - tx) + v(x0 + 1, y0 + 1) * tx;
    return a * (1 - ty) + b * ty;
  };
}

function biomeFor(act, e, m) {
  if (act === 1) {
    if (e > 0.78) return 'monti';
    if (e < 0.17) return 'acqua';
    if (m > 0.58) return 'bosco';
    if (e > 0.62) return 'colline';
    return 'prato';
  }
  if (act === 2) {
    if (e > 0.8) return 'monti';
    if (e < 0.2) return 'acqua';
    if (m > 0.55) return 'palude';
    if (m < 0.3) return 'bosco_morto';
    if (e > 0.6) return 'bosco';
    return 'palude';
  }
  if (e > 0.78) return 'monti';
  if (e < 0.14) return 'acqua';
  if (m > 0.62) return 'bosco_morto';
  if (e > 0.58) return 'rovine';
  return 'cenere';
}
const PATH_BIOME = { 1: 'prato', 2: 'palude', 3: 'cenere' };

export function generateMap(rng, act) {
  const tiles = {};
  const elev = valueNoise(rng, MAP_W, MAP_H, 4.2);
  const elev2 = valueNoise(rng, MAP_W, MAP_H, 2.1);
  const moist = valueNoise(rng, MAP_W, MAP_H, 3.5);
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const q = x - Math.floor(y / 2), r = y;
      let e = elev(x, y) * 0.7 + elev2(x, y) * 0.3;
      // bordi un po' più alti/acquatici per incorniciare il diorama
      if (x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1) e = e * 0.6 + (rng.chance(0.5) ? 0.4 : 0);
      const b = biomeFor(act, e, moist(x, y));
      const bd = BIOMES[b];
      const h = bd.h[0] + (bd.h[1] - bd.h[0]) * rng.next();
      tiles[hkey(q, r)] = { q, r, x, y, b, h: +h.toFixed(2), poi: null, cor: false, rev: false, vis: false, dec: rng.int(0, 9999) };
    }
  }
  const at = (x, y) => tiles[hkey(x - Math.floor(y / 2), y)];
  const startY = Math.floor(MAP_H / 2) + rng.int(-2, 2);
  const start = at(1, startY);
  const bossY = rng.int(2, MAP_H - 3);
  const bossT = at(MAP_W - 2, bossY);

  // Sentiero garantito: random walk da start a boss
  let cx = 1, cy = startY;
  const carve = (t) => { if (BIOMES[t.b].blocked) { t.b = PATH_BIOME[act]; const bd = BIOMES[t.b]; t.h = +(bd.h[0] + (bd.h[1] - bd.h[0]) * rng.next()).toFixed(2); } };
  carve(at(cx, cy));
  while (cx < MAP_W - 2 || cy !== bossY) {
    if (cx < MAP_W - 2 && (rng.chance(0.65) || cy === bossY)) cx++;
    else cy += Math.sign(bossY - cy) || (rng.chance(0.5) ? 1 : -1);
    cy = Math.max(1, Math.min(MAP_H - 2, cy));
    carve(at(cx, cy));
  }

  // Raggiungibilità
  const reach = new Set([hkey(start.q, start.r)]);
  const queue = [start];
  while (queue.length) {
    const t = queue.shift();
    for (const n of neighbors(t.q, t.r)) {
      const k = hkey(n.q, n.r), nt = tiles[k];
      if (nt && !reach.has(k) && !BIOMES[nt.b].blocked) { reach.add(k); queue.push(nt); }
    }
  }
  const cands = Object.values(tiles).filter((t) => reach.has(hkey(t.q, t.r)));
  const placed = [];
  const free = (t, minD = 2) => !t.poi && placed.every((p) => hexDist(p, t) >= minD);
  const place = (t, poi) => { t.poi = poi; placed.push(t); return t; };
  const near = (fx, minD = 2) => {
    const col = Math.round(fx * (MAP_W - 1));
    const opts = rng.shuffle(cands).filter((t) => free(t, minD)).sort((a, b) => Math.abs(a.x - col) - Math.abs(b.x - col));
    return opts[0];
  };
  const story = STORY[act];
  place(start, { t: 'town', name: story.town, main: true });
  place(bossT, { t: 'boss', name: act === 1 ? 'Torre della Veglia' : act === 2 ? 'Cuore della Palude' : 'Cattedrale dell\'Eclisse' });
  for (const n of story.nodes) { const t = near(n.at, 3); if (t) place(t, { t: 'story', id: n.id }); }
  story.towns.forEach((name, i) => { const t = near(0.3 + 0.4 * i + rng.next() * 0.15, 3); if (t) place(t, { t: 'town', name }); });
  const scatter = (n, mk, minD = 2) => { for (let i = 0; i < n; i++) { const t = near(0.1 + rng.next() * 0.85, minD); if (t) place(t, mk(i)); } };
  scatter(story.beacons, () => ({ t: 'beacon' }), 3);
  scatter(story.crystals, () => ({ t: 'crystal' }), 3);
  scatter(story.camps, () => ({ t: 'camp' }));
  scatter(story.shrines, () => ({ t: 'shrine' }));
  scatter(story.dens, () => ({ t: 'den' }));
  scatter(1, () => ({ t: 'merchant', name: 'Carovana errante' }));
  const pool = rng.shuffle(Object.entries(EVENTS).filter(([, e]) => !e.special && e.acts.includes(act)).map(([id]) => id));
  let pi = 0;
  for (let i = 0; i < story.events && pi < pool.length; i++) {
    const t = near(0.05 + rng.next() * 0.9, 2);
    if (!t) break;
    // preferisci eventi coerenti col bioma
    let id = pool[pi++];
    const ev = EVENTS[id];
    if (ev.biomes && !ev.biomes.includes(t.b)) { const alt = pool.slice(pi).find((x) => !EVENTS[x].biomes || EVENTS[x].biomes.includes(t.b)); if (alt) { pool.splice(pool.indexOf(alt), 1); pool.splice(pi - 1, 0, alt); id = alt; } }
    place(t, { t: 'event', id });
  }
  return { tiles, w: MAP_W, h: MAP_H, start: { q: start.q, r: start.r }, boss: { q: bossT.q, r: bossT.r }, v: 1 };
}

export function reveal(map, q, r, radius) {
  let changed = false;
  for (const t of Object.values(map.tiles)) {
    if (!t.rev && hexDist(t, { q, r }) <= radius) { t.rev = true; changed = true; }
  }
  if (changed) map.v++;
}

export function findPath(map, from, to, maxSteps) {
  const fk = hkey(from.q, from.r), tk = hkey(to.q, to.r);
  const target = map.tiles[tk];
  if (!target || BIOMES[target.b].blocked || !target.rev) return null;
  const prev = { [fk]: null };
  const queue = [[from, 0]];
  while (queue.length) {
    const [t, d] = queue.shift();
    if (hkey(t.q, t.r) === tk) break;
    if (d >= maxSteps) continue;
    for (const n of neighbors(t.q, t.r)) {
      const k = hkey(n.q, n.r), nt = map.tiles[k];
      if (!nt || k in prev || BIOMES[nt.b].blocked || !nt.rev) continue;
      prev[k] = hkey(t.q, t.r);
      queue.push([nt, d + 1]);
    }
  }
  if (!(tk in prev)) return null;
  const path = [];
  let k = tk;
  while (k && k !== fk) { const [q, r] = k.split(',').map(Number); path.unshift({ q, r }); k = prev[k]; }
  return path.length <= maxSteps ? path : null;
}
