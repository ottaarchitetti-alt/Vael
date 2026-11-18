// Pezzi in pixel art delle marionette (eroi e nemici). Ogni pezzo è una piccola tela con contorno scuro,
// disegnata rivolta a sinistra, con il punto di rotazione (pivot) indicato in coordinate della tela.
// rig.js monta i pezzi in una gerarchia di articolazioni e li anima.
import { CLASSES } from '/shared/data/classes.js';
import { ITEMS } from '/shared/data/items.js';
import { ENEMIES } from '/shared/data/enemies.js';
import { DEFAULT_LOOK, TRANSFORMS } from '/shared/data/heroes.js';
import { canvas, P } from './pixel.js';

// ---------- colore «da pixel artist» ----------
// Le ombre non sono solo più scure: virano verso il viola-blu freddo; le luci verso il giallo caldo.
function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
const toHex = ([r, g, b]) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
// sposta la tinta h verso target di al massimo «amount» gradi (sul percorso più breve)
function towards(h, target, amount) { const d = ((target - h + 540) % 360) - 180; return h + Math.sign(d) * Math.min(Math.abs(d), amount); }
function shiftRgb(r, g, b, f) {
  let [h, s, l] = rgbToHsl(r, g, b);
  if (f >= 0) { l = l + (1 - l) * f * 0.85; h = towards(h, 50, f * 55 * s + f * 10); s = s * (1 - f * 0.15); }
  else { const k = -f; l = l * (1 - k); h = towards(h, 255, k * 70); s = Math.min(1, s + k * 0.18 + (s < 0.08 ? k * 0.12 : 0)); }
  return hslToRgb(h, s, l);
}
export function shade(hex, f) { return toHex(shiftRgb(...hexToRgb(hex), f)); }

// Contorno selettivo: il bordo prende una versione scura e fredda del colore che racchiude
// (più chiara sul lato illuminato, in alto a sinistra) e i pixel di bordo ricevono luce calda o ombra fredda.
function inkFinish(x, w, h) {
  const img = x.getImageData(0, 0, w, h), d = img.data;
  const A = (X, Y) => (X < 0 || Y < 0 || X >= w || Y >= h ? 0 : d[(Y * w + X) * 4 + 3]);
  const out = new Uint8ClampedArray(d);
  for (let y = 0; y < h; y++) for (let X = 0; X < w; X++) {
    const i = (y * w + X) * 4;
    if (d[i + 3] < 128) {
      // il primo vicino pieno decide il colore del bordo; se è sotto o a destra il bordo è sul lato in luce
      const nb = [[X, y + 1, true], [X + 1, y, true], [X - 1, y, false], [X, y - 1, false]].find(([a, b]) => A(a, b) > 128);
      if (!nb) continue;
      const j = (nb[1] * w + nb[0]) * 4;
      const [r, g, b] = shiftRgb(d[j], d[j + 1], d[j + 2], nb[2] ? -0.62 : -0.78);
      out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = 255;
    } else {
      const lit = A(X - 1, y) < 128 || A(X, y - 1) < 128;
      const dim = A(X + 1, y) < 128 || A(X, y + 1) < 128;
      if (lit !== dim) { const [r, g, b] = shiftRgb(d[i], d[i + 1], d[i + 2], lit ? 0.14 : -0.16); out[i] = r; out[i + 1] = g; out[i + 2] = b; }
    }
  }
  img.data.set(out);
  x.putImageData(img, 0, 0);
}

// Sprite PNG opzionali: rig.js li carica da /assets/sprites/manifest.json e li registra qui
export const OVERRIDES = new Map(); // chiave «cartella/pezzo» -> tela

function part(w, h, pivot, draw, key) {
  const ov = key && OVERRIDES.get(key);
  if (ov) return { canvas: ov, w: ov.width, h: ov.height, pivot: [Math.round(ov.width * pivot[0] / w), Math.round(ov.height * pivot[1] / h)] };
  const [c, x] = canvas(w, h);
  draw(new P(x), x);
  inkFinish(x, w, h);
  return { canvas: c, w, h, pivot };
}

// ---------- pennelli con ombreggiatura a tre toni ----------
function sbox(p, c, x, y, w, h) {
  p.r(c, x, y, w, h);
  p.r(shade(c, 0.2), x, y, w, 1); p.r(shade(c, 0.12), x, y + 1, 1, h - 1);
  p.r(shade(c, -0.2), x + w - 2, y + 1, 2, h - 1); p.r(shade(c, -0.32), x, y + h - 1, w, 1);
}
function sell(p, c, cx, cy, rx, ry) {
  p.e(shade(c, -0.22), cx + 1, cy + 1, rx, ry);
  p.e(c, cx, cy, rx, ry);
  p.e(shade(c, 0.18), cx - Math.ceil(rx / 3), cy - Math.ceil(ry / 3), Math.max(1, Math.floor(rx / 2)), Math.max(1, Math.floor(ry / 2)));
}
const dark = (c, f = -0.3) => shade(c, f);

// ---------- descrizione di un umanoide (eroe o nemico) ----------
const CLASS_HEAD = { lama: 'elmo', ombra: 'cappuccio', arcanista: 'cappello', custode: 'mitra', cantore: 'piuma', cacciatrice: 'fascia' };
export function heroSpec(hero) {
  const cls = CLASSES[hero.cls] || CLASSES.lama;
  const L = cls.look;
  const look = { ...DEFAULT_LOOK, ...(hero.look || {}) };
  const tf = (hero.transforms || []).map((t) => TRANSFORMS[t]?.look);
  const wtype = hero.equip?.weapon ? ITEMS[hero.equip.weapon.base]?.wtype || cls.weapon : cls.weapon;
  return {
    key: `hero/${hero.cls}`, kind: 'humanoid',
    skin: look.skin, hair: look.hair, hairStyle: look.hairStyle, eyes: tf.includes('mothEye') ? '#d080ff' : look.eyes, beard: look.beard,
    cloth: look.cloth || L.cloak, trim: L.trim, outfit: L.outfit,
    head: look.acc === 'classe' ? CLASS_HEAD[hero.cls] : look.acc === 'nessuno' ? null : look.acc,
    weapon: wtype, glow: hero.cls === 'arcanista' ? '#8fe3ff' : hero.cls === 'custode' ? '#fff2b0' : '#ffd27a',
    cloak: !['robe', 'cleric'].includes(L.outfit), quiver: !!L.quiver, tf,
  };
}
// nemici umanoidi: stessi pezzi degli eroi con abiti, copricapi e armi propri
const ENEMY_HUMANOID = {
  cultist: (a, b, c) => ({ outfit: 'robe', cloth: a, trim: b, head: 'hoodDark', weapon: 'bastone', glow: c, eyesGlow: c, skin: '#8a7a70' }),
  bandit: (a, b, c) => ({ outfit: 'hood', cloth: a, trim: c, head: 'bandana', bandana: b, weapon: 'pugnale', skin: '#c8956a', cloak: true }),
  knight: (a, b, c) => ({ outfit: 'plate', cloth: b, trim: c, steel: a, head: 'helmFull', eyesGlow: c, weapon: 'spadone', cloak: true, skin: '#5a5560' }),
  inquisitor: (a, b, c) => ({ outfit: 'cleric', cloth: a, trim: b, head: 'mitreTall', weapon: 'bastone', glow: c, skin: '#d8c8b8', eyes: c }),
  lampkeeper: (a, b, c) => ({ outfit: 'robe', cloth: a, trim: b, head: 'lanternHead', weapon: 'lanterna', glow: c, skin: '#2a2a30', tall: true }),
  bishop: (a, b, c) => ({ outfit: 'cleric', cloth: b, trim: c, head: 'veil', veil: a, weapon: 'bastone', glow: c, skin: '#e8e0c8' }),
};
export const ENEMY_FAMILY = { cultist: 'humanoid', bandit: 'humanoid', knight: 'humanoid', inquisitor: 'humanoid', lampkeeper: 'humanoid', bishop: 'humanoid', beast: 'beast', toad: 'beast', crab: 'beast', moth: 'flyer', queen: 'flyer', specter: 'flyer', slime: 'slime' };
export function enemySpec(id) {
  const d = ENEMIES[id];
  const [a, b, c] = d.pal;
  const fam = ENEMY_FAMILY[d.kind] || 'slime';
  const base = { key: `enemy/${id}`, kind: fam, sub: d.kind, pal: d.pal, size: d.size || 1 };
  if (fam !== 'humanoid') return base;
  return { ...base, hair: '#2a2228', hairStyle: 'rasati', eyes: '#1a1418', beard: 'nessuna', tf: [], ...ENEMY_HUMANOID[d.kind](a, b, c) };
}

// ---------- poligoni a pixel pieni (niente sfumature del browser) ----------
function poly(p, c, pts) {
  const x = p.x; x.fillStyle = c;
  const ys = pts.map((q) => q[1]);
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
      if ((y + 0.5 >= y0 && y + 0.5 < y1) || (y + 0.5 >= y1 && y + 0.5 < y0)) xs.push(x0 + (y + 0.5 - y0) * (x1 - x0) / (y1 - y0));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) { const a = Math.round(xs[k]), b = Math.round(xs[k + 1]); if (b > a) x.fillRect(a + p.ox, y + p.oy, b - a, 1); }
  }
}
// pieghe di stoffa: una linea d'ombra con un filo di luce accanto
function fold(p, c, x0, y0, x1, y1) { p.l(shade(c, -0.24), x0, y0, x1, y1); p.l(shade(c, 0.1), x0 - 1, y0, x1 - 1, y1); }

// ---------- testa (pivot alla base del collo) ----------
function drawHead(s) {
  return part(22, 24, [11, 22], (p) => {
    const skin = s.skin, hair = s.hair || '#2a2228';
    const hood = ['cappuccio', 'hoodDark'].includes(s.head);
    const covered = hood || ['helmFull', 'lanternHead', 'veil'].includes(s.head);
    if (s.head === 'lanternHead') {
      p.r('#5a4a3a', 6, 1, 10, 2); sbox(p, '#3a3438', 5, 3, 12, 14); p.r(s.glow, 7, 5, 8, 10); p.r(shade(s.glow, 0.5), 9, 7, 4, 5); p.r('#ffffff', 10, 8, 2, 2);
      for (const x of [5, 10, 16]) p.r('#1a1418', x, 3, 1, 14);
      p.r('#5a4a3a', 6, 17, 10, 2); p.r(dark(s.cloth, -0.2), 8, 19, 6, 4);
      return;
    }
    if (!covered && s.hairStyle === 'lunghi') { poly(p, dark(hair, -0.18), [[12, 5], [18, 7], [19, 21], [12, 19]]); for (const x of [14, 16]) p.l(dark(hair, -0.35), x, 9, x + 1, 19); }
    if (!covered && s.hairStyle === 'ricci') sell(p, dark(hair, -0.15), 15, 12, 5, 6);
    poly(p, shade(skin, -0.25), [[7, 16], [14, 16], [14, 23], [8, 23]]); // collo
    // viso a tre quarti: fronte ampia, zigomo, mento appuntito verso sinistra
    poly(p, skin, [[4, 4], [15, 3], [18, 8], [17, 14], [13, 19], [7, 19], [4, 17], [2, 11]]);
    poly(p, shade(skin, -0.14), [[14, 4], [18, 8], [17, 14], [13, 19], [11, 19], [14, 13]]);
    p.r(shade(skin, 0.12), 4, 6, 4, 3); p.r(shade(skin, 0.08), 5, 12, 2, 2);
    p.r(skin, 1, 10, 2, 3); p.r(shade(skin, -0.2), 2, 13, 2, 1); // naso
    p.r(shade(skin, -0.18), 13, 9, 3, 4); p.r(shade(skin, -0.35), 14, 10, 1, 2); // orecchio
    p.r(shade(skin, -0.22), 6, 19, 6, 1);
    if (s.eyesGlow) { for (const ex of [4, 9]) { p.r(s.eyesGlow, ex, 9, 2, 2); p.r('#ffffff', ex, 9, 1, 1); } }
    else {
      p.r('#f4ece4', 4, 9, 3, 3); p.r(s.eyes, 4, 9, 2, 3); p.r(shade(s.eyes, -0.4), 4, 9, 1, 3); p.r('#ffffff', 5, 9, 1, 1);
      p.r('#f4ece4', 9, 9, 2, 3); p.r(s.eyes, 9, 9, 1, 3); p.r('#ffffff', 9, 9, 1, 1);
      p.r(shade(skin, -0.45), 3, 8, 4, 1); p.r(shade(skin, -0.45), 8, 8, 3, 1); // palpebre
      p.r(shade(hair, -0.2), 3, 6, 4, 1); p.r(shade(hair, -0.2), 8, 6, 3, 1); // sopracciglia
      p.r(shade('#e87070', 0.15), 6, 13, 2, 1);
      p.r(shade(skin, -0.48), 4, 15, 3, 1); p.r(shade(skin, 0.15), 4, 16, 2, 1); // bocca e labbro
    }
    if (s.tf?.includes('scar')) { p.l('#9a2a2a', 8, 5, 11, 13); p.l(shade(skin, 0.2), 9, 5, 12, 13); }
    if (s.beard === 'corta' || s.beard === 'lunga') {
      const L2 = s.beard === 'lunga' ? 23 : 20;
      poly(p, hair, [[3, 13], [13, 14], [13, 18], [9, L2], [5, L2 - 1], [2, 16]]);
      for (const x of [5, 8, 11]) p.l(shade(hair, -0.25), x, 15, x - 1, L2 - 2);
      p.r(shade(hair, 0.2), 4, 14, 3, 1); p.r(shade(skin, -0.48), 4, 15, 3, 1);
    }
    if (s.beard === 'baffi') { poly(p, hair, [[1, 14], [8, 13], [8, 15], [3, 16]]); p.r(shade(hair, 0.2), 3, 14, 2, 1); }
    if (s.beard === 'pizzetto') { poly(p, hair, [[3, 16], [8, 16], [7, 21], [4, 20]]); p.l(shade(hair, -0.25), 5, 17, 5, 20); }
    if (!covered && !['elmo', 'mitreTall'].includes(s.head)) {
      const hl = shade(hair, 0.28), hd = shade(hair, -0.28);
      if (s.hairStyle === 'rasati') { poly(p, shade(hair, 0.05), [[4, 3], [16, 2], [18, 6], [4, 5]]); p.r(hl, 7, 3, 5, 1); }
      else if (s.hairStyle === 'cresta') { poly(p, hd, [[4, 4], [17, 3], [17, 6], [4, 6]]); poly(p, hair, [[6, 4], [8, 0], [11, 2], [13, 0], [15, 3], [16, 5], [6, 5]]); p.r(hl, 8, 1, 2, 2); p.r(hl, 12, 1, 2, 1); }
      else if (s.hairStyle === 'ricci') { for (const [x, y, r] of [[5, 4, 3], [9, 2, 3], [13, 3, 3], [16, 7, 3], [3, 8, 2], [17, 11, 2]]) { sell(p, hair, x, y, r, r); p.r(hl, x - 1, y - 1, 1, 1); } }
      else {
        // calotta con ciuffi che scendono sulla fronte
        poly(p, hair, [[2, 8], [3, 3], [9, 0], [15, 1], [19, 5], [19, 13], [16, 12], [15, 7], [12, 5], [10, 7], [8, 5], [5, 8]]);
        poly(p, hd, [[15, 2], [19, 5], [19, 13], [16, 12], [16, 6]]);
        for (const [x0, y0, x1, y1] of [[6, 2, 4, 7], [10, 1, 9, 6], [13, 2, 13, 5]]) p.l(hd, x0, y0, x1, y1);
        p.r(hl, 5, 2, 4, 1); p.r(hl, 4, 3, 2, 1); p.r(hl, 11, 1, 3, 1);
        if (s.hairStyle === 'spettinati') { poly(p, hair, [[3, 2], [1, 0], [6, 1]]); poly(p, hair, [[9, 0], [10, 0], [13, 0], [11, 2]]); poly(p, hair, [[1, 8], [0, 12], [3, 9]]); }
        if (s.hairStyle === 'chignon') { sell(p, hair, 17, 3, 3, 3); p.r(hl, 16, 2, 1, 1); }
        if (s.hairStyle === 'lunghi') poly(p, hair, [[2, 8], [0, 15], [3, 14], [4, 9]]);
      }
    }
    const c = s.cloth, t = s.trim;
    switch (s.head) {
      case 'elmo': {
        const st = '#8f96a0';
        poly(p, st, [[1, 8], [2, 2], [9, 0], [16, 1], [20, 6], [20, 15], [16, 15], [15, 8], [4, 8]]);
        poly(p, shade(st, -0.25), [[16, 1], [20, 6], [20, 15], [17, 15], [17, 6]]);
        p.r('#eef0f4', 5, 2, 5, 1); p.r('#ffffff', 6, 2, 1, 1);
        p.r(t, 1, 7, 15, 2); p.r(shade(t, 0.3), 2, 7, 4, 1);
        p.r(st, 3, 9, 2, 6); p.r(shade(st, 0.3), 3, 9, 1, 5);
        for (const x of [6, 11]) p.r(shade(st, 0.4), x, 5, 1, 1);
        p.r(t, 9, 0, 3, 2);
        break;
      }
      case 'helmFull': {
        const st = s.steel || '#5c5c66';
        poly(p, st, [[1, 3], [8, 0], [16, 1], [20, 6], [20, 18], [3, 18], [1, 12]]);
        poly(p, shade(st, -0.25), [[16, 1], [20, 6], [20, 18], [17, 18]]);
        p.r('#0a0a10', 2, 8, 13, 3); p.r(s.eyesGlow, 4, 9, 2, 1); p.r(s.eyesGlow, 9, 9, 2, 1);
        for (let y = 12; y < 17; y += 2) p.r(shade(st, -0.35), 3, y, 9, 1);
        p.r(shade(st, 0.35), 4, 2, 6, 1); p.r(t, 9, 0, 3, 2);
        break;
      }
      case 'cappuccio': case 'hoodDark': {
        poly(p, c, [[0, 14], [1, 4], [7, 0], [15, 0], [20, 5], [21, 20], [14, 21], [16, 9], [12, 6], [5, 7], [3, 13]]);
        poly(p, shade(c, -0.28), [[15, 0], [20, 5], [21, 20], [17, 20], [17, 8]]);
        fold(p, c, 9, 1, 6, 6); p.r(shade(c, 0.2), 4, 2, 4, 1);
        p.r(shade(c, -0.45), 4, 7, 10, 2);
        if (s.head === 'hoodDark') { poly(p, '#120c12', [[4, 8], [14, 8], [15, 17], [5, 17]]); if (s.eyesGlow) { p.r(s.eyesGlow, 6, 11, 2, 1); p.r(s.eyesGlow, 10, 11, 2, 1); } }
        break;
      }
      case 'cappello':
        poly(p, c, [[0, 6], [21, 5], [22, 8], [0, 9]]); p.r(shade(c, -0.3), 0, 8, 22, 1);
        poly(p, c, [[4, 6], [17, 6], [15, 1], [18, 0], [12, 0], [9, 2]]);
        poly(p, shade(c, -0.2), [[13, 1], [17, 6], [15, 6]]); fold(p, c, 10, 2, 8, 5);
        p.r(t, 4, 4, 13, 2); p.r(shade(t, 0.35), 5, 4, 3, 1);
        break;
      case 'mitra': case 'mitreTall':
        poly(p, c, [[5, 7], [6, 1], [10, 0], [15, 1], [16, 7]]); poly(p, shade(c, -0.2), [[13, 1], [15, 1], [16, 7], [13, 7]]);
        p.r(t, 10, 0, 1, 7); p.r(t, 7, 3, 7, 1); p.r(t, 4, 6, 13, 2); p.r(shade(t, 0.35), 5, 6, 3, 1);
        break;
      case 'piuma':
        poly(p, c, [[0, 6], [20, 5], [21, 8], [1, 8]]); poly(p, c, [[5, 6], [6, 1], [15, 1], [16, 6]]);
        p.r(t, 5, 4, 11, 1); p.r(shade(c, 0.2), 7, 2, 3, 1);
        poly(p, '#e3c06b', [[14, 3], [21, 0], [19, 3]]); p.l('#fff2b0', 15, 3, 20, 0);
        break;
      case 'fascia': p.r(t, 2, 6, 15, 2); p.r(shade(t, 0.3), 3, 6, 4, 1); poly(p, t, [[16, 7], [20, 9], [19, 13], [17, 9]]); break;
      case 'corona': p.r('#d9a83a', 4, 5, 13, 2); for (const x of [5, 10, 15]) poly(p, '#d9a83a', [[x - 1, 5], [x, x === 10 ? 1 : 2], [x + 1, 5]]); p.r('#8fe3ff', 10, 5, 1, 1); p.r('#fff2b0', 6, 5, 2, 1); break;
      case 'benda': p.l('#2a1a14', 3, 6, 16, 9); sell(p, '#1a1014', 5, 10, 2, 2); break;
      case 'fiore': for (const [dx, dy] of [[0, -2], [2, 0], [0, 2], [-2, 0]]) sell(p, '#ff8ab0', 16 + dx, 4 + dy, 1, 1); p.r('#ffe45c', 16, 4, 1, 1); break;
      case 'bandana': poly(p, s.bandana, [[2, 7], [3, 2], [16, 2], [18, 7]]); p.r(shade(s.bandana, -0.3), 2, 6, 16, 1); poly(p, s.bandana, [[17, 5], [21, 9], [19, 12], [17, 8]]); p.r(shade(s.bandana, 0.25), 5, 3, 4, 1); break;
      case 'veil': poly(p, s.veil, [[2, 2], [10, 0], [18, 2], [20, 21], [1, 21]]); fold(p, s.veil, 8, 3, 6, 19); fold(p, s.veil, 14, 3, 15, 19); p.r(s.glow, 6, 9, 2, 1); p.r(s.glow, 10, 9, 2, 1); p.r(s.trim, 8, 0, 5, 2); break;
    }
    if (s.tf?.includes('halo')) { p.r('#ffe45c', 4, 0, 13, 1); p.r('#fff2b0', 7, 0, 4, 1); }
  }, s.key && `${s.key}/head`);
}
function drawHairTail(s) {
  return part(10, 22, [5, 1], (p) => {
    const h = s.hair, d = shade(h, -0.25), l = shade(h, 0.25);
    if (s.hairStyle === 'treccia') { for (let i = 0; i < 6; i++) { poly(p, i % 2 ? d : h, [[2, 2 + i * 3], [8, 2 + i * 3], [7, 5 + i * 3], [3, 5 + i * 3]]); p.r(l, 3, 2 + i * 3, 2, 1); } p.r('#c9a24a', 3, 20, 4, 2); }
    else if (s.hairStyle === 'coda') { p.r('#5a4030', 3, 1, 4, 2); poly(p, h, [[3, 3], [7, 3], [8, 12], [6, 19], [4, 17], [2, 10]]); p.l(d, 5, 5, 6, 17); p.r(l, 3, 4, 1, 5); }
    else { poly(p, h, [[1, 0], [9, 0], [9, 15], [6, 18], [2, 16]]); for (const x of [3, 6]) p.l(d, x, 2, x, 15); p.r(l, 2, 1, 1, 6); }
  }, s.key && `${s.key}/hairTail`);
}

// ---------- busto (pivot all'anca): spalle larghe, vita stretta, pieghe ----------
function drawTorso(s) {
  return part(22, 24, [11, 22], (p) => {
    const c = s.cloth, t = s.trim;
    const shape = [[2, 1], [19, 1], [18, 9], [16, 15], [17, 23], [4, 23], [5, 15], [3, 9]];
    const side = [[15, 1], [19, 1], [18, 9], [16, 15], [17, 23], [14, 23]];
    const belt = (y) => { p.r('#4a3424', 4, y, 14, 3); p.r('#6a4a32', 4, y, 14, 1); p.r(t, 9, y, 4, 3); p.r(shade(t, 0.4), 9, y, 1, 1); p.r('#2a1a12', 11, y + 1, 1, 1); };
    switch (s.outfit) {
      case 'plate': {
        const st = s.steel || '#8f96a0';
        poly(p, c, [[5, 14], [16, 14], [17, 23], [4, 23]]); fold(p, c, 8, 15, 7, 22); fold(p, c, 13, 15, 14, 22); p.r(t, 4, 22, 13, 1);
        poly(p, st, [[2, 1], [19, 1], [18, 10], [16, 15], [5, 15], [3, 10]]);
        poly(p, shade(st, -0.25), [[15, 1], [19, 1], [18, 10], [16, 15], [14, 15]]);
        poly(p, shade(st, 0.3), [[5, 3], [9, 3], [8, 9], [5, 8]]); p.r('#ffffff', 6, 4, 1, 1);
        p.l(shade(st, -0.35), 10, 2, 10, 14);
        for (const [x, y] of [[4, 2], [17, 2], [5, 12], [15, 12]]) p.r(shade(st, 0.45), x, y, 1, 1);
        belt(14);
        break;
      }
      case 'hood': {
        poly(p, '#3a3440', shape); poly(p, shade('#3a3440', -0.25), side);
        poly(p, c, [[1, 0], [20, 0], [19, 5], [2, 5]]); p.r(shade(c, 0.2), 3, 1, 5, 1); fold(p, c, 10, 1, 9, 4);
        p.l('#5a4a3a', 4, 5, 16, 15); p.l('#6a5a48', 4, 4, 16, 14);
        for (const y of [8, 11]) p.r('#2a2630', 6, y, 3, 1);
        belt(15);
        break;
      }
      case 'robe': case 'cleric': {
        poly(p, c, shape); poly(p, shade(c, -0.22), side);
        p.r(shade(c, 0.18), 5, 2, 3, 10);
        fold(p, c, 7, 3, 6, 13); fold(p, c, 13, 4, 14, 14);
        if (s.outfit === 'cleric') { poly(p, t, [[5, 0], [8, 0], [9, 23], [6, 23]]); poly(p, t, [[13, 0], [16, 0], [15, 23], [12, 23]]); p.r(shade(t, 0.35), 6, 1, 1, 10); p.r('#fff2b0', 10, 4, 2, 7); p.r('#fff2b0', 8, 6, 6, 2); }
        else { p.r(t, 10, 0, 2, 23); p.r(shade(t, 0.35), 10, 0, 1, 23); }
        poly(p, shade(c, -0.1), [[2, 1], [7, 1], [5, 4]]);
        belt(16);
        break;
      }
      case 'coat': {
        poly(p, c, shape); poly(p, shade(c, -0.22), side);
        poly(p, '#e8e0c8', [[8, 0], [14, 0], [13, 12], [9, 12]]); p.r('#c8c0a8', 9, 6, 4, 1); p.r(shade('#e8e0c8', -0.2), 12, 1, 1, 11);
        poly(p, c, [[1, 0], [8, 0], [7, 5], [2, 4]]); p.r(shade(c, 0.2), 2, 1, 4, 1);
        p.r(t, 7, 0, 1, 23); for (const y of [4, 9, 14, 19]) { p.r(t, 14, y, 2, 1); p.r(shade(t, 0.4), 14, y, 1, 1); }
        fold(p, c, 5, 13, 4, 22);
        break;
      }
      default: {
        poly(p, c, shape); poly(p, shade(c, -0.22), side);
        poly(p, shade(c, -0.3), [[1, 0], [20, 0], [19, 6], [11, 8], [2, 6]]); p.r(shade(c, -0.1), 3, 1, 6, 1);
        p.l('#6a4a2a', 4, 6, 16, 15); p.l('#8a6a42', 4, 5, 16, 14);
        fold(p, c, 7, 9, 6, 15); belt(15);
      }
    }
    if (s.tf?.includes('emberHeart')) { sell(p, '#ff7a2f', 9, 7, 2, 2); p.r('#ffe45c', 9, 7, 1, 1); }
    if (s.tf?.includes('saltSkin')) { p.r('#ffffff', 5, 10, 1, 1); p.r('#e8f4ff', 15, 6, 1, 1); p.r('#ffffff', 12, 19, 1, 1); }
  }, s.key && `${s.key}/torso`);
}
function drawSkirt(s) {
  const tall = s.tall ? 8 : 0, H = 25 + tall;
  return part(26, 26 + tall, [13, 1], (p) => {
    const c = s.cloth;
    poly(p, c, [[6, 0], [20, 0], [25, H], [20, H - 1], [13, H], [6, H - 1], [0, H]]);
    poly(p, shade(c, -0.24), [[16, 0], [20, 0], [25, H], [20, H - 1]]);
    for (const [x0, x1] of [[9, 6], [13, 13], [17, 19]]) fold(p, c, x0, 3, x1, H - 2);
    p.r(s.trim, 0, H - 2, 26, 2); p.r(shade(s.trim, 0.3), 1, H - 2, 6, 1);
    if (s.outfit === 'cleric') { poly(p, s.trim, [[7, 0], [10, 0], [9, H - 2], [6, H - 2]]); poly(p, s.trim, [[16, 0], [19, 0], [20, H - 2], [17, H - 2]]); }
    else p.r(s.trim, 12, 0, 2, H - 1);
  }, s.key && `${s.key}/skirt`);
}
function drawCloak(s) {
  return part(16, 32, [8, 2], (p) => {
    const c = shade(s.cloth, -0.28);
    poly(p, c, [[2, 0], [13, 0], [15, 20], [16, 31], [11, 29], [6, 31], [0, 30], [1, 14]]);
    poly(p, shade(c, -0.25), [[10, 1], [13, 0], [15, 20], [16, 31], [11, 29]]);
    for (const [x0, x1] of [[5, 3], [8, 7], [11, 12]]) fold(p, c, x0, 3, x1, 28);
    p.r(s.trim, 0, 29, 6, 2); p.r(shade(c, 0.15), 3, 1, 3, 1);
  }, s.key && `${s.key}/cloak`);
}
function sleeveColor(s) { return s.tf?.includes('glassArm') ? '#9fe8ff' : s.outfit === 'plate' ? (s.steel || '#a8aeb8') : s.outfit === 'hood' ? '#3a3440' : s.cloth; }
function drawArmUpper(s) {
  return part(9, 13, [4, 2], (p) => {
    const c = sleeveColor(s);
    poly(p, c, [[0, 2], [2, 0], [7, 0], [8, 3], [7, 12], [2, 12]]);
    poly(p, shade(c, -0.24), [[6, 0], [8, 3], [7, 12], [5, 12]]); p.r(shade(c, 0.22), 1, 2, 2, 5);
    if (s.outfit === 'plate') { sell(p, shade(c, 0.12), 4, 3, 4, 3); p.r('#ffffff', 2, 1, 1, 1); }
    else fold(p, c, 4, 4, 3, 10);
  }, s.key && `${s.key}/armUpper`);
}
function drawArmLower(s) {
  return part(9, 15, [4, 2], (p) => {
    const c = sleeveColor(s), hand = s.tf?.includes('glassArm') ? '#e8ffff' : s.skin;
    poly(p, c, [[1, 0], [7, 0], [6, 9], [2, 9]]); poly(p, shade(c, -0.24), [[5, 0], [7, 0], [6, 9], [5, 9]]); p.r(shade(c, 0.2), 2, 1, 1, 6);
    if (s.outfit === 'ranger' || s.outfit === 'hood') { p.r('#5a3a22', 1, 5, 6, 4); p.r('#7a5a3a', 1, 5, 6, 1); p.r(s.trim, 3, 7, 1, 1); }
    else p.r(shade(c, -0.1), 1, 8, 6, 1);
    poly(p, hand, [[1, 9], [7, 9], [7, 13], [5, 14], [1, 13]]); p.r(shade(hand, -0.22), 6, 10, 1, 3); p.l(shade(hand, -0.3), 2, 12, 5, 12); p.r(shade(hand, 0.18), 2, 10, 2, 1);
  }, s.key && `${s.key}/armLower`);
}
function drawArmBack(s) {
  return part(9, 24, [4, 2], (p) => {
    const c = shade(sleeveColor(s), -0.28), hand = shade(s.skin, -0.25);
    poly(p, c, [[0, 2], [2, 0], [7, 0], [8, 3], [7, 11], [6, 19], [2, 19], [1, 11]]); p.r(shade(c, -0.2), 6, 3, 1, 15);
    poly(p, hand, [[2, 19], [7, 19], [6, 23], [2, 22]]);
  }, s.key && `${s.key}/armBack`);
}
function drawLeg(s, back) {
  return part(11, 27, [5, 2], (p) => {
    const k = back ? -0.25 : 0;
    const pants = shade(s.outfit === 'plate' ? (s.steel || '#6a6e78') : s.outfit === 'hood' ? '#2a2630' : shade(s.cloth, -0.45), k);
    poly(p, pants, [[1, 0], [9, 0], [8, 9], [7, 11], [8, 17], [7, 20], [3, 20], [2, 11]]);
    poly(p, shade(pants, -0.22), [[7, 0], [9, 0], [8, 9], [7, 11], [8, 17], [7, 20], [6, 20]]); p.r(shade(pants, 0.18), 2, 1, 2, 7);
    if (s.outfit === 'plate') { sell(p, shade('#b8bec8', k), 5, 10, 3, 2); p.r(shade('#ffffff', k), 4, 9, 1, 1); }
    else p.r(shade(pants, 0.12), 3, 10, 3, 1);
    const boot = shade('#3a2a22', k);
    poly(p, boot, [[2, 18], [8, 18], [9, 25], [0, 26], [0, 23], [2, 22]]);
    p.r(shade(boot, 0.25), 2, 18, 6, 1); p.r(shade(boot, -0.35), 0, 25, 9, 1); p.r(shade('#c9a24a', k), 6, 20, 2, 1);
  }, s.key && `${s.key}/${back ? 'legBack' : 'legFront'}`);
}
function drawQuiver() { return part(7, 16, [3, 2], (p) => { poly(p, '#6a4a2a', [[1, 2], [6, 2], [5, 15], [2, 15]]); p.r('#8a6a42', 2, 3, 1, 11); p.r('#c9a24a', 1, 6, 5, 1); for (const [x, c2] of [[1, '#e8e0c8'], [3, '#d8d0b8'], [5, '#e8e0c8']]) p.r(c2, x, 0, 1, 3); p.r('#c94a3a', 3, 0, 1, 1); }); }
function drawWings() { return part(22, 26, [2, 6], (p) => { poly(p, '#6a6460', [[1, 6], [21, 0], [18, 10], [16, 25], [8, 16]]); poly(p, '#8a847c', [[3, 7], [18, 3], [15, 10], [13, 20], [8, 13]]); for (const y of [8, 13]) p.l('#5a5450', 4, y, 17, y - 4); }); }

// ---------- armi: la lama si estende «verso il basso» dalla presa, lungo l'avambraccio ----------
function drawWeapon(type, s) {
  const steel = '#c8ccd4', edge = '#f4f6fa', wood = '#7a5a3a', gold = '#d9a83a', leather = '#4a3424';
  const k = `${s.key}/weapon`;
  const grip = (p, x, y, w, h) => { p.r(leather, x, y, w, h); for (let i = y; i < y + h; i += 2) p.r(shade(leather, 0.3), x, i, w, 1); };
  const blade = (p, x, y, w, len) => {
    poly(p, steel, [[x, y], [x + w, y], [x + w, y + len - 3], [x + w / 2, y + len], [x, y + len - 3]]);
    p.r(edge, x, y, 1, len - 3); p.r(shade(steel, -0.3), x + w - 1, y, 1, len - 3); p.r(shade(steel, -0.18), x + Math.floor(w / 2), y + 2, 1, len - 8);
  };
  switch (type) {
    case 'spadone': return part(11, 44, [5, 6], (p) => { sell(p, gold, 5, 1, 2, 1); grip(p, 4, 2, 3, 6); poly(p, gold, [[0, 8], [11, 8], [10, 10], [1, 10]]); p.r(shade(gold, 0.4), 1, 8, 3, 1); p.r('#8a1e2b', 5, 8, 1, 2); blade(p, 3, 10, 5, 33); }, k);
    case 'pugnale': return part(7, 18, [3, 4], (p) => { grip(p, 2, 0, 3, 5); p.r(gold, 0, 5, 7, 1); p.r(shade(gold, 0.4), 0, 5, 2, 1); blade(p, 2, 6, 3, 11); }, k);
    case 'mazza': return part(13, 26, [6, 4], (p) => { grip(p, 5, 0, 3, 8); p.r(wood, 5, 8, 3, 9); p.r(shade(wood, 0.25), 5, 8, 1, 9); for (const [x, y] of [[1, 19], [10, 19], [6, 24], [6, 15]]) poly(p, '#6a6e78', [[x - 1, y], [x + 2, y - 1], [x + 3, y + 2], [x, y + 3]]); sell(p, '#8a8f98', 6, 20, 4, 4); p.r('#eef0f4', 5, 18, 1, 1); }, k);
    case 'bastone': return part(11, 42, [5, 12], (p) => {
      for (let y = 0; y < 34; y++) p.r(y % 4 < 2 ? wood : shade(wood, -0.2), 4, y, 3, 1); p.r(shade(wood, 0.3), 4, 0, 1, 34);
      poly(p, gold, [[2, 31], [9, 31], [8, 34], [3, 34]]); p.l(gold, 3, 34, 2, 38); p.l(gold, 8, 34, 9, 38);
      const g = s.glow || '#8fe3ff';
      poly(p, g, [[5, 33], [9, 37], [5, 41], [1, 37]]); poly(p, shade(g, 0.4), [[5, 34], [7, 37], [5, 39], [3, 37]]); p.r('#ffffff', 4, 35, 1, 2);
    }, k);
    case 'lanterna': return part(11, 22, [5, 1], (p) => {
      p.l('#3a3036', 5, 0, 5, 5); poly(p, gold, [[2, 5], [9, 5], [10, 7], [1, 7]]); p.r(shade(gold, 0.4), 3, 5, 3, 1);
      p.r(shade(gold, -0.25), 1, 7, 9, 12); const g = s.glow || '#fff2b0';
      p.r(g, 2, 8, 3, 10); p.r(g, 6, 8, 3, 10); p.r(shade(g, 0.5), 3, 11, 2, 4); p.r('#ffffff', 3, 12, 1, 2);
      p.r(gold, 1, 18, 9, 2); p.r(shade(gold, 0.35), 2, 18, 3, 1);
    }, k);
    case 'liuto': return part(14, 28, [7, 8], (p) => {
      p.r('#3a2410', 6, 0, 3, 14); p.r('#e8d8b0', 5, 0, 5, 2); for (const y of [4, 7, 10]) p.r('#c9a24a', 6, y, 3, 1);
      sell(p, '#a0682f', 7, 20, 6, 7); for (const x of [4, 7, 10]) p.l(shade('#a0682f', -0.15), x, 15, x, 25);
      sell(p, '#1a0e08', 7, 19, 2, 2); p.l('#f0e8d0', 7, 2, 7, 24); p.r(shade('#a0682f', 0.35), 3, 16, 2, 3);
    }, k);
    case 'arco': case 'arcoTeso': {
      const tense = type === 'arcoTeso';
      return part(tense ? 16 : 12, 38, [5, 19], (p) => {
        p.l('#8a6a3a', 10, 0, 4, 6); p.l('#8a6a3a', 4, 6, 2, 17); p.l('#8a6a3a', 2, 21, 4, 31); p.l('#8a6a3a', 4, 31, 10, 37);
        p.l('#a8885a', 9, 0, 3, 6); p.l('#a8885a', 3, 6, 1, 17); p.l('#6a4a2a', 3, 21, 5, 31);
        p.r(leather, 1, 17, 3, 4); p.r('#c9a24a', 1, 16, 3, 1); p.r('#c9a24a', 1, 21, 3, 1);
        if (tense) { p.l('#e8e0c8', 10, 1, 15, 19); p.l('#e8e0c8', 15, 19, 10, 36); p.r('#c8ccd4', 0, 18, 15, 1); p.r(edge, 0, 18, 2, 1); poly(p, '#c94a3a', [[12, 16], [15, 18], [12, 20]]); }
        else p.l('#e8e0c8', 10, 1, 10, 36);
      }, tense ? `${s.key}/weaponTense` : k);
    }
    default: return part(9, 34, [4, 5], (p) => { sell(p, gold, 4, 1, 1, 1); p.r('#8a1e2b', 4, 1, 1, 1); grip(p, 3, 2, 3, 5); poly(p, gold, [[0, 7], [9, 7], [8, 9], [1, 9]]); p.r(shade(gold, 0.4), 1, 7, 3, 1); blade(p, 3, 9, 3, 24); }, k);
  }
}

// ---------- nemici non umanoidi ----------
function beastParts(s) {
  const [a, b, c] = s.pal;
  const k = s.key;
  const lite = shade(a, 0.22), deep = shade(a, -0.28);
  if (s.sub === 'toad') return {
    // corpo bitorzoluto con pancia chiara e verruche
    body: part(30, 20, [15, 18], (p) => {
      poly(p, a, [[2, 14], [5, 5], [13, 2], [22, 3], [28, 9], [29, 17], [24, 19], [6, 19]]);
      poly(p, deep, [[22, 3], [28, 9], [29, 17], [24, 19], [24, 9]]);
      poly(p, b, [[5, 13], [22, 13], [20, 19], [7, 19]]); p.r(shade(b, 0.25), 7, 14, 6, 1);
      for (const [x, y] of [[9, 5], [15, 4], [20, 7], [12, 9], [25, 12], [6, 9]]) { p.r(lite, x, y, 2, 2); p.r(shade(lite, 0.3), x, y, 1, 1); }
      p.r(lite, 8, 3, 6, 1);
    }, `${k}/body`),
    head: part(20, 16, [16, 12], (p) => {
      poly(p, a, [[1, 9], [4, 4], [12, 2], [18, 5], [19, 12], [14, 15], [3, 14]]);
      poly(p, shade(b, 0.1), [[3, 12], [14, 12], [13, 15], [4, 15]]); // sacco della gola
      p.l(shade(a, -0.5), 1, 11, 15, 11); p.r(c, 2, 12, 5, 1); // bocca larga
      sell(p, '#f0e8c0', 8, 4, 3, 3); p.r('#1a1418', 7, 4, 3, 2); p.r('#ffffff', 7, 3, 1, 1); // occhio sporgente
      p.r(lite, 5, 4, 3, 1); p.r(deep, 15, 6, 2, 5);
    }, `${k}/head`),
    leg: part(9, 10, [4, 1], (p) => { poly(p, shade(a, -0.12), [[2, 0], [7, 0], [6, 7], [3, 7]]); poly(p, b, [[0, 7], [9, 7], [8, 9], [1, 9]]); for (const x of [1, 4, 7]) p.r(shade(b, -0.3), x, 9, 1, 1); }, `${k}/leg`),
  };
  if (s.sub === 'crab') return {
    // carapace con creste, spine sul bordo e occhi su peduncoli
    body: part(34, 18, [17, 16], (p) => {
      poly(p, a, [[1, 12], [4, 6], [11, 4], [23, 4], [30, 6], [33, 12], [28, 16], [6, 16]]);
      poly(p, deep, [[23, 4], [30, 6], [33, 12], [28, 16], [24, 16]]);
      for (const x of [9, 17, 25]) p.l(shade(a, -0.2), x, 5, x - 1, 14);
      p.r(lite, 8, 5, 12, 1); p.r(shade(lite, 0.3), 10, 5, 3, 1);
      for (const x of [2, 31]) poly(p, deep, [[x - 1, 10], [x + 1, 7], [x + 2, 11]]);
      for (const x of [12, 21]) { p.r(b, x, 0, 1, 5); sell(p, '#1a1418', x, 1, 1, 1); p.r('#ffffff', x, 0, 1, 1); }
    }, `${k}/body`),
    head: part(16, 14, [14, 9], (p) => {
      // chela: dito mobile sopra, dito fisso sotto, dentelli
      poly(p, a, [[6, 4], [14, 5], [15, 10], [8, 12], [5, 9]]);
      poly(p, a, [[0, 2], [6, 3], [7, 6], [2, 6]]); poly(p, deep, [[0, 9], [6, 8], [7, 11], [2, 12]]);
      p.r(c, 1, 3, 2, 1); for (const x of [2, 4]) p.r(shade('#ffffff', -0.1), x, 6, 1, 1);
      p.r(lite, 8, 5, 4, 1); p.r(deep, 12, 7, 3, 3);
    }, `${k}/claw`),
    leg: part(6, 12, [3, 1], (p) => { p.l(a, 3, 0, 2, 5); p.l(a, 4, 0, 3, 5); p.l(deep, 2, 5, 1, 11); p.l(deep, 3, 5, 2, 11); p.r(lite, 3, 1, 1, 2); p.r(shade(a, -0.5), 2, 5, 2, 1); }, `${k}/leg`),
  };
  return {
    // lupo: petto profondo, ventre rientrante, pelo a ciuffi sul dorso
    body: part(36, 18, [18, 10], (p) => {
      poly(p, a, [[1, 7], [6, 3], [16, 4], [26, 3], [33, 5], [35, 10], [31, 14], [24, 13], [14, 14], [5, 16], [1, 12]]);
      poly(p, deep, [[5, 13], [14, 12], [24, 12], [31, 14], [24, 14], [14, 15], [5, 16]]);
      poly(p, shade(b, -0.05), [[2, 10], [8, 10], [6, 15], [2, 13]]); // petto chiaro
      for (let i = 0; i < 7; i++) poly(p, i % 2 ? deep : shade(a, -0.15), [[5 + i * 4, 4], [7 + i * 4, 0], [9 + i * 4, 4]]); // criniera
      for (const x of [10, 18, 26]) p.l(shade(a, -0.2), x, 6, x - 2, 11);
      p.r(lite, 8, 5, 14, 1); p.r(shade(lite, 0.25), 10, 5, 4, 1);
    }, `${k}/body`),
    head: part(20, 17, [16, 9], (p) => {
      poly(p, a, [[0, 9], [4, 6], [10, 4], [16, 5], [19, 9], [17, 14], [11, 14], [6, 13], [1, 12]]);
      poly(p, deep, [[14, 5], [19, 9], [17, 14], [14, 14]]);
      poly(p, deep, [[9, 5], [11, 0], [14, 5]]); poly(p, shade(a, -0.4), [[13, 5], [16, 1], [18, 6]]); p.r(shade('#e8a0a0', -0.2), 11, 2, 1, 2); // orecchie
      p.r('#1a1418', 0, 8, 2, 2); p.r(shade('#ffffff', -0.3), 0, 8, 1, 1); // tartufo
      poly(p, shade(b, -0.3), [[1, 11], [9, 11], [8, 14], [2, 13]]); for (const x of [2, 4, 6]) p.r('#f4f0e8', x, 11, 1, 2); // fauci e denti
      p.r(c, 8, 6, 3, 2); p.r('#ffffff', 8, 6, 1, 1); p.r(shade(a, -0.45), 7, 5, 4, 1); // occhio feroce
      p.r(lite, 4, 6, 5, 1);
    }, `${k}/head`),
    leg: part(7, 15, [3, 1], (p) => { poly(p, shade(a, -0.1), [[0, 0], [7, 0], [5, 7], [4, 12], [2, 12], [2, 6]]); p.r(shade(a, 0.15), 1, 1, 2, 5); poly(p, deep, [[0, 12], [6, 12], [7, 15], [0, 15]]); for (const x of [0, 2, 4]) p.r('#e8e0c8', x, 14, 1, 1); }, `${k}/leg`),
    tail: part(16, 8, [15, 4], (p) => { poly(p, a, [[16, 2], [9, 0], [2, 2], [0, 5], [6, 7], [16, 6]]); p.r(lite, 4, 2, 7, 1); poly(p, shade(b, 0.1), [[0, 3], [3, 2], [3, 6], [0, 5]]); p.l(deep, 4, 5, 13, 5); }, `${k}/tail`),
  };
}
function flyerParts(s) {
  const [a, b, c] = s.pal;
  const k = s.key;
  if (s.sub === 'specter') return {
    // veste lacera che si sfilaccia in basso
    body: part(22, 30, [11, 28], (p) => {
      poly(p, a, [[7, 2], [15, 2], [19, 12], [21, 26], [18, 22], [16, 29], [13, 24], [10, 29], [7, 23], [4, 28], [2, 20], [3, 12]]);
      poly(p, shade(a, -0.25), [[15, 2], [19, 12], [21, 26], [18, 22], [16, 29], [15, 12]]);
      for (const [x0, x1] of [[8, 6], [12, 12]]) fold(p, a, x0, 4, x1, 24);
      p.r(shade(a, 0.3), 6, 4, 3, 8);
    }, `${k}/body`),
    head: part(16, 15, [8, 13], (p) => {
      poly(p, shade(a, 0.35), [[2, 4], [7, 1], [13, 2], [15, 8], [12, 14], [4, 14], [1, 9]]);
      poly(p, shade(a, 0.1), [[12, 2], [15, 8], [12, 14], [11, 8]]);
      sell(p, '#120c12', 5, 7, 2, 2); sell(p, '#120c12', 10, 7, 2, 2); p.r(c, 4, 7, 2, 1); p.r(c, 9, 7, 2, 1); // orbite vuote con luci
      p.l('#120c12', 6, 11, 10, 11);
    }, `${k}/head`),
    wing: part(8, 20, [4, 1], (p) => { poly(p, b, [[2, 0], [6, 0], [5, 12], [7, 19], [4, 16], [1, 19], [2, 10]]); p.l(shade(b, 0.3), 3, 1, 3, 12); p.l(shade(b, -0.3), 5, 2, 5, 14); }, `${k}/arm`),
  };
  const big = s.sub === 'queen';
  const W = big ? 36 : 26, H = big ? 34 : 24;
  return {
    // addome a segmenti e torace peloso
    body: part(14, 26, [7, 24], (p) => {
      poly(p, b, [[4, 8], [10, 8], [11, 17], [9, 25], [5, 25], [3, 17]]);
      for (let y = 12; y < 24; y += 3) p.r(shade(b, -0.3), 4, y, 6, 1);
      p.r(shade(b, 0.25), 5, 9, 2, 10);
      sell(p, shade(b, 0.1), 7, 7, 4, 4); for (const [x, y] of [[4, 5], [9, 4], [10, 8]]) p.r(shade(b, 0.35), x, y, 1, 1);
    }, `${k}/body`),
    head: part(16, 16, [8, 14], (p) => {
      sell(p, b, 8, 10, 5, 4);
      sell(p, c, 4, 9, 2, 2); sell(p, c, 11, 9, 2, 2); p.r('#ffffff', 3, 8, 1, 1); p.r('#ffffff', 10, 8, 1, 1); // occhi composti
      for (const [x0, x1] of [[6, 2], [10, 14]]) { p.l(b, x0, 6, x1, 0); p.r(shade(b, 0.3), x1, 0, 1, 1); p.r(shade(b, 0.2), (x0 + x1) >> 1, 3, 1, 1); } // antenne piumate
      if (big) { p.r('#ffe45c', 4, 4, 8, 2); for (const x of [5, 8, 11]) p.r('#ffe45c', x, 2, 1, 2); p.r('#ff8aff', 8, 4, 1, 1); }
    }, `${k}/head`),
    wing: part(W, H, [1, 8], (p) => {
      // ala smerlata con nervature e occhio di falena
      const m = Math.round(H * 0.6);
      poly(p, a, [[0, 8], [W * 0.3, 2], [W - 1, 0], [W - 3, m * 0.5], [W - 6, m], [W * 0.6, m + 2], [W * 0.4, H - 1], [W * 0.2, H - 4]]);
      poly(p, shade(a, -0.22), [[0, 9], [W * 0.5, m], [W * 0.4, H - 1], [W * 0.2, H - 4]]);
      for (const [x1, y1] of [[W - 2, 1], [W - 4, m * 0.6], [W * 0.6, m], [W * 0.35, H - 2]]) p.l(shade(a, -0.35), 1, 8, Math.round(x1), Math.round(y1));
      sell(p, c, Math.round(W * 0.6), Math.round(H * 0.28), big ? 3 : 2, big ? 3 : 2); sell(p, '#1a1418', Math.round(W * 0.6), Math.round(H * 0.28), 1, 1);
      p.r(shade(a, 0.3), Math.round(W * 0.3), 3, Math.round(W * 0.4), 1);
    }, `${k}/wing`),
  };
}
function slimeBody(s) {
  const [a, b, c] = s.pal;
  // melma lucida: colature, bolle interne, riflesso speculare
  return part(34, 22, [17, 21], (p) => {
    poly(p, a, [[2, 20], [3, 12], [8, 5], [16, 2], [25, 4], [31, 11], [33, 20], [27, 21], [24, 19], [20, 21], [10, 21], [7, 19]]);
    poly(p, shade(a, -0.25), [[24, 4], [31, 11], [33, 20], [27, 21], [26, 12]]);
    poly(p, shade(a, -0.3), [[5, 19], [29, 19], [27, 21], [7, 21]]);
    for (const [x, y, r] of [[22, 13, 2], [12, 16, 1], [26, 16, 1]]) { sell(p, shade(a, 0.15), x, y, r, r); }
    poly(p, shade(a, 0.45), [[9, 6], [15, 4], [13, 6], [8, 9]]); p.r('#ffffff', 10, 6, 2, 1); // riflesso
    sell(p, '#1a1418', 11, 11, 2, 2); sell(p, '#1a1418', 18, 11, 2, 2); p.r('#ffffff', 10, 10, 1, 1); p.r('#ffffff', 17, 10, 1, 1);
    p.r(c, 25, 7, 2, 2); p.r(b, 27, 15, 3, 2);
  }, `${s.key}/body`);
}

// ---------- definizioni: pezzi + articolazioni (pixel, y verso l'alto, origine ai piedi) ----------
export function humanoidDef(s) {
  const robe = s.outfit === 'robe' || s.outfit === 'cleric';
  const hipY = s.tall ? 30 : 24;
  const parts = [
    { name: 'hips', parent: null, at: [0, hipY], z: 0 },
    { name: 'legB', parent: 'hips', at: [3, 0], z: -2, ...drawLeg(s, true) },
    { name: 'legF', parent: 'hips', at: [-3, 0], z: -1, ...drawLeg(s, false) },
    { name: 'torso', parent: 'hips', at: [0, 0], z: 0, ...drawTorso(s) },
  ];
  if (robe) parts.push({ name: 'skirt', parent: 'hips', at: [0, 2], z: 0.5, ...drawSkirt(s) });
  if (s.cloak) parts.push({ name: 'cloak', parent: 'torso', at: [4, 19], z: -3, ...drawCloak(s) });
  if (s.quiver) parts.push({ name: 'quiver', parent: 'torso', at: [6, 18], z: -3.5, ...drawQuiver() });
  if (s.tf?.includes('ashWings')) parts.push({ name: 'wings', parent: 'torso', at: [5, 17], z: -4.5, ...drawWings() });
  parts.push({ name: 'armB', parent: 'torso', at: [6, 18], z: -4, ...drawArmBack(s) });
  parts.push({ name: 'head', parent: 'torso', at: [0, 20], z: 2, ...drawHead(s) });
  if (['lunghi', 'coda', 'treccia'].includes(s.hairStyle) && !['cappuccio', 'hoodDark', 'helmFull', 'lanternHead', 'veil'].includes(s.head)) {
    parts.push({ name: 'tail', parent: 'head', at: [6, 14], z: -2.5, ...drawHairTail(s) });
  }
  parts.push({ name: 'armU', parent: 'torso', at: [-5, 18], z: 3, ...drawArmUpper(s) });
  parts.push({ name: 'armL', parent: 'armU', at: [0, -10], z: 3.2, ...drawArmLower(s) });
  parts.push({ name: 'weapon', parent: 'armL', at: [0, -11], z: 2.9, ...drawWeapon(s.weapon, s) });
  const def = { family: 'humanoid', weapon: s.weapon, parts, height: hipY + 46, glow: s.glow, key: s.key };
  if (s.weapon === 'arco') def.alt = { weapon: drawWeapon('arcoTeso', s) };
  return def;
}
function beastDef(s) {
  const P2 = beastParts(s);
  const crab = s.sub === 'crab', toad = s.sub === 'toad';
  const bodyY = toad ? 8 : crab ? 9 : 15;
  const parts = [{ name: 'body', parent: null, at: [0, bodyY], z: 0, ...P2.body }];
  const legs = toad ? [[-8, -6, 1], [9, -6, 1], [-4, -6, -1], [12, -6, -1]] : crab ? [[-10, -4, 1], [-4, -4, 1], [4, -4, -1], [10, -4, -1]] : [[-10, -4, 1], [9, -4, 1], [-6, -4, -1], [13, -4, -1]];
  legs.forEach(([x, y, z], i) => parts.push({ name: `leg${i}`, parent: 'body', at: [x, y], z, ...P2.leg }));
  parts.push({ name: 'head', parent: 'body', at: toad ? [-6, 4] : crab ? [-14, 2] : [-14, 4], z: 1.5, ...P2.head });
  if (crab) parts.push({ name: 'claw2', parent: 'body', at: [-10, 4], z: -1.5, ...P2.head });
  if (P2.tail) parts.push({ name: 'tail', parent: 'body', at: [16, 3], z: -1, ...P2.tail });
  return { family: 'beast', parts, height: bodyY + 16 };
}
function flyerDef(s) {
  const P2 = flyerParts(s);
  const ghost = s.sub === 'specter';
  const parts = [{ name: 'body', parent: null, at: [0, ghost ? 6 : 14], z: 0, ...P2.body }];
  parts.push({ name: 'head', parent: 'body', at: [0, ghost ? 24 : 22], z: 1, ...P2.head });
  parts.push({ name: 'wingB', parent: 'body', at: ghost ? [5, 18] : [2, 16], z: -1, ...P2.wing });
  parts.push({ name: 'wingF', parent: 'body', at: ghost ? [-5, 18] : [0, 16], z: 1.5, ...P2.wing });
  return { family: 'flyer', ghost, parts, height: ghost ? 44 : 50 };
}

export function rigDefForHero(hero) { return humanoidDef(heroSpec(hero)); }
export function rigDefForEnemy(id) {
  const s = enemySpec(id);
  const def = s.kind === 'humanoid' ? humanoidDef(s) : s.kind === 'beast' ? beastDef(s) : s.kind === 'flyer' ? flyerDef(s)
    : { family: 'slime', parts: [{ name: 'body', parent: null, at: [0, 0], z: 0, ...slimeBody(s) }], height: 22 };
  def.size = s.size;
  return def;
}
