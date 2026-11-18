// Generatore procedurale di pixel art: eroi, nemici, decorazioni, icone, texture
import { CLASSES } from '/shared/data/classes.js';
import { ITEMS } from '/shared/data/items.js';
import { ENEMIES } from '/shared/data/enemies.js';
import { TRANSFORMS, DEFAULT_LOOK } from '/shared/data/heroes.js';

// ---------- primitive ----------
export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.imageSmoothingEnabled = false;
  return [c, x];
}
function hexToRgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function shade(hex, f) {
  const [r, g, b] = hexToRgb(hex);
  const m = (v) => Math.max(0, Math.min(255, Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f))));
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}
export function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
export class P {
  constructor(x, ox = 0, oy = 0) { this.x = x; this.ox = ox; this.oy = oy; }
  r(c, X, Y, w = 1, h = 1) { if (!c) return; this.x.fillStyle = c; this.x.fillRect(X + this.ox, Y + this.oy, w, h); }
  e(c, cx, cy, rx, ry) { // ellisse piena
    this.x.fillStyle = c;
    for (let y = -ry; y <= ry; y++) {
      const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + 0.01))));
      this.x.fillRect(cx - w + this.ox, cy + y + this.oy, w * 2 + 1, 1);
    }
  }
  l(c, x0, y0, x1, y1) { // Bresenham
    this.x.fillStyle = c;
    let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy;
    for (let i = 0; i < 200; i++) {
      this.x.fillRect(x0 + this.ox, y0 + this.oy, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  tri(c, x0, y0, x1, y1, x2, y2) { // triangolo pieno via scanline
    this.x.fillStyle = c;
    const minY = Math.min(y0, y1, y2), maxY = Math.max(y0, y1, y2);
    const edges = [[x0, y0, x1, y1], [x1, y1, x2, y2], [x2, y2, x0, y0]];
    for (let y = minY; y <= maxY; y++) {
      const xs = [];
      for (const [ax, ay, bx, by] of edges) {
        if ((y >= ay && y < by) || (y >= by && y < ay) || (ay === by && y === ay)) {
          xs.push(ay === by ? ax : ax + ((y - ay) * (bx - ax)) / (by - ay));
          if (ay === by) xs.push(bx);
        }
      }
      if (xs.length < 2) continue;
      const a = Math.round(Math.min(...xs)), b = Math.round(Math.max(...xs));
      this.x.fillRect(a + this.ox, y + this.oy, b - a + 1, 1);
    }
  }
}

// contorno scuro + luce di contorno (look "HD-2D")
export function finish(x, w, h, { outline = '#140c18', rim = true } = {}) {
  const img = x.getImageData(0, 0, w, h), d = img.data;
  const A = (X, Y) => (X < 0 || Y < 0 || X >= w || Y >= h ? 0 : d[(Y * w + X) * 4 + 3]);
  const out = new Uint8ClampedArray(d);
  const [or, og, ob] = hexToRgb(outline);
  for (let y = 0; y < h; y++) for (let X = 0; X < w; X++) {
    const i = (y * w + X) * 4;
    if (d[i + 3] < 128) {
      if (A(X - 1, y) > 128 || A(X + 1, y) > 128 || A(X, y - 1) > 128 || A(X, y + 1) > 128) { out[i] = or; out[i + 1] = og; out[i + 2] = ob; out[i + 3] = 255; }
    } else if (rim) {
      const tl = A(X - 1, y) < 128 || A(X, y - 1) < 128;
      const br = A(X + 1, y) < 128 || A(X, y + 1) < 128;
      const f = tl && !br ? 1.18 : br && !tl ? 0.78 : 1;
      if (f !== 1) for (let k = 0; k < 3; k++) out[i + k] = Math.min(255, d[i + k] * f);
    }
  }
  img.data.set(out);
  x.putImageData(img, 0, 0);
}
function mirror(c) {
  const [m, mx] = canvas(c.width, c.height);
  mx.translate(c.width, 0); mx.scale(-1, 1); mx.drawImage(c, 0, 0);
  return m;
}
export function tint(c, color, alpha) {
  const [m, mx] = canvas(c.width, c.height);
  mx.drawImage(c, 0, 0);
  mx.globalCompositeOperation = 'source-atop';
  mx.globalAlpha = alpha; mx.fillStyle = color; mx.fillRect(0, 0, c.width, c.height);
  return m;
}

// ================= EROI =================
// Foglio di 15 fotogrammi 32×40, l'eroe guarda a sinistra.
export const HERO_W = 32, HERO_H = 40, HERO_FRAMES = 15;
export const HERO_ANIM = {
  idle: [0, 1, 2, 3], walk: [4, 5, 6, 7], attack: [8, 9, 10], cast: [11], hurt: [12], ko: [13], guard: [14],
};
// copricapo predefinito di ogni classe (quando l'accessorio è «Della classe»)
const CLASS_HEADWEAR = { lama: 'elmo', ombra: 'cappuccio', arcanista: 'cappello', custode: 'mitra', cantore: 'piuma', cacciatrice: 'fascia' };

// pose: by = alzata del busto, lean = inclinazione, legs = [dxF, dyF, dxB, dyB], arm = braccio anteriore,
// armB = oscillazione del braccio posteriore, sway = mantello/capelli, wpn = posa dell'arma
const POSES = [
  { by: 0, sway: 0, arm: 'down', wpn: 'idle' },
  { by: 0, sway: 1, arm: 'down', wpn: 'idle' },
  { by: 1, sway: 2, arm: 'down', wpn: 'idle', armDy: 1 },
  { by: 1, sway: 1, arm: 'down', wpn: 'idle', armDy: 1, blink: true },
  { by: 0, sway: 2, legs: [-2, 0, 2, 0], arm: 'swing', swing: 2, armB: -1, wpn: 'idle' },
  { by: -1, sway: 1, legs: [0, -1, 0, 0], arm: 'swing', swing: 0, armB: 0, wpn: 'idle' },
  { by: 0, sway: 0, legs: [2, 0, -2, 0], arm: 'swing', swing: -2, armB: 1, wpn: 'idle' },
  { by: -1, sway: 1, legs: [0, 0, 0, -1], arm: 'swing', swing: 0, armB: 0, wpn: 'idle' },
  { by: 0, lean: 1, sway: 0, legs: [-1, 0, 1, 0], arm: 'back', wpn: 'raise' },
  { by: 0, lean: -2, sway: 2, legs: [-3, 0, 1, 0], arm: 'fwd', wpn: 'strike' },
  { by: 1, lean: -1, sway: 2, legs: [-3, 0, 1, 0], arm: 'fwd', wpn: 'low' },
  { by: -1, sway: 2, arm: 'up', armBUp: true, wpn: 'cast', glow: true },
  { by: 0, lean: 2, sway: 0, legs: [1, 0, 2, 0], arm: 'down', wpn: 'idle', hurt: true },
  { by: 6, lean: 1, sway: 1, kneel: true, arm: 'limp', wpn: 'ground', blink: true },
  { by: 0, lean: -1, sway: 1, legs: [-1, 0, 1, 0], arm: 'guard', wpn: 'guard' },
];

// linea spessa 2px
function thick(p, c, x0, y0, x1, y1) { p.l(c, x0, y0, x1, y1); p.l(c, x0, y0 + 1, x1, y1 + 1); }

function drawWeapon(p, wtype, pose, H, glowCol) {
  const steel = '#c8ccd4', steelL = '#eef0f4', dark = '#4a3a2e', gold = '#d9a83a', wood = '#7a5a3a';
  const [hx, hy] = H;
  // direzione della lama per posa
  const DIR = { idle: [0, -1], raise: [1, -1], strike: [-1, 0], low: [-1, 1], guard: [-1, -1], cast: [0, -1], ground: [-1, 0] };
  const [dx, dy] = DIR[pose] || DIR.idle;
  const k = dx && dy ? 0.75 : 1;
  const end = (len) => [hx + Math.round(dx * len * k), hy + Math.round(dy * len * k)];
  if (pose === 'ground') {
    // arma a terra davanti all'eroe
    if (wtype === 'bastone') { p.r(wood, 2, 37, 16, 1); p.e(glowCol, 2, 36, 1, 1); }
    else if (wtype === 'arco') p.l('#8a6a3a', 3, 37, 13, 35);
    else if (wtype === 'lanterna') { p.r(gold, 4, 34, 4, 4); p.r('#8a7a50', 5, 35, 2, 2); }
    else p.r(steel, 3, 37, 10, 1);
    return;
  }
  switch (wtype) {
    case 'spada': case 'pugnale': {
      const [ex, ey] = end(wtype === 'spada' ? 12 : 6);
      thick(p, steel, hx, hy, ex, ey);
      p.l(steelL, hx, hy, ex, ey);
      // guardia perpendicolare alla lama, impugnatura e pomo dalla parte opposta
      if (dx === 0) p.r(gold, hx - 2, hy, 5, 1);
      else if (dy === 0) p.r(gold, hx, hy - 2, 1, 5);
      else { p.r(gold, hx - 1, hy - 1, 1, 1); p.r(gold, hx + 1, hy + 1, 1, 1); p.r(gold, hx, hy, 1, 1); }
      p.r(dark, hx - dx * 2, hy - dy * 2, 2, 2);
      p.r(gold, hx - dx * 3, hy - dy * 3, 1, 1);
      break;
    }
    case 'mazza': {
      const [ex, ey] = end(9);
      thick(p, dark, hx, hy, ex, ey);
      p.e('#8a8f98', ex, ey, 2, 2); p.r('#c8ccd4', ex - 1, ey - 1, 1, 1);
      p.r('#5a5e68', ex - 3, ey, 1, 1); p.r('#5a5e68', ex + 3, ey, 1, 1); p.r('#5a5e68', ex, ey - 3, 1, 1);
      break;
    }
    case 'bastone': {
      const [ex, ey] = end(14);
      const bx = hx - dx * 7, bby = hy - dy * 7;
      thick(p, wood, bx, bby, ex, ey);
      p.l(shade(wood, 0.25), bx, bby, ex, ey);
      p.r(gold, ex - 1, ey + 1, 3, 1);
      p.e(glowCol, ex, ey - 1, pose === 'cast' ? 3 : 2, pose === 'cast' ? 3 : 2);
      p.r('#ffffff', ex - 1, ey - 2, 1, 1);
      break;
    }
    case 'arco': {
      const drawn = pose === 'strike' || pose === 'low';
      const bx = hx - 1;
      p.l('#8a6a3a', bx, hy - 10, bx - 3, hy - 4); p.l('#8a6a3a', bx - 3, hy - 4, bx - 3, hy + 3); p.l('#8a6a3a', bx - 3, hy + 3, bx, hy + 9);
      p.r('#c9a24a', bx - 3, hy - 1, 1, 2);
      const sx = drawn ? bx + 5 : bx;
      p.l('#e8e0c8', bx, hy - 10, sx, hy); p.l('#e8e0c8', sx, hy, bx, hy + 9);
      if (drawn) { p.l(steel, sx, hy, bx - 9, hy); p.r('#e8e0c8', sx + 1, hy - 1, 1, 3); }
      break;
    }
    case 'liuto': {
      const lx = pose === 'strike' || pose === 'low' ? hx + 1 : hx + 2, ly = hy - 1;
      p.e('#a0682f', lx, ly, 3, 3); p.e('#c88a48', lx - 1, ly - 1, 1, 1); p.r('#2a1a10', lx, ly, 1, 1);
      p.l('#5a3a1a', lx - 1, ly - 2, lx - 7, ly - 7); p.r('#e8d8b0', lx - 8, ly - 8, 2, 1);
      if (pose === 'strike' || pose === 'cast') { p.r('#ffe8a0', lx - 4, ly - 6, 1, 1); p.r('#ffe8a0', lx + 4, ly - 4, 1, 1); p.r('#fff6d0', lx - 2, ly - 8, 1, 1); }
      break;
    }
    case 'lanterna': {
      const hang = pose === 'idle' || pose === 'guard';
      const [ex, ey] = hang ? [hx, hy + 3] : end(6);
      p.l(dark, hx, hy, ex, ey);
      p.r(gold, ex - 2, ey, 5, 6); p.r('#fff2b0', ex - 1, ey + 1, 3, 4); p.r('#ffffff', ex, ey + 2, 1, 1);
      p.r(shade(gold, -0.3), ex - 2, ey, 5, 1); p.r(shade(gold, -0.3), ex - 2, ey + 5, 5, 1);
      break;
    }
  }
}

function hairBack(p, style, c, hx, hy, sway) {
  const d = shade(c, -0.25);
  switch (style) {
    case 'lunghi': p.r(c, hx + 5, hy + 3, 5, 10); p.r(d, hx + 8, hy + 5, 2, 9); p.r(c, hx + 6 + (sway > 1 ? 1 : 0), hy + 13, 4, 2); break;
    case 'coda': p.r(c, hx + 9, hy + 1, 2, 3); p.r(c, hx + 10 + (sway ? 1 : 0), hy + 4, 2, 6); p.r(d, hx + 11 + (sway ? 1 : 0), hy + 6, 1, 4); p.r(c, hx + 10 + sway, hy + 10, 1, 2); break;
    case 'treccia':
      for (let i = 0; i < 6; i++) p.r(i % 2 ? d : c, hx + 8 + (i > 3 && sway ? 1 : 0), hy + 5 + i * 2, 2, 2);
      p.r('#c9a24a', hx + 8 + (sway ? 1 : 0), hy + 17, 2, 1); break;
    case 'ricci': p.e(c, hx + 7, hy + 6, 3, 4); p.e(d, hx + 8, hy + 8, 2, 2); break;
  }
}
function hairFront(p, style, c, hx, hy) {
  const d = shade(c, -0.25), l = shade(c, 0.3);
  const cap = () => { p.r(c, hx, hy - 1, 9, 3); p.r(c, hx + 6, hy + 1, 3, 4); p.r(c, hx, hy + 2, 2, 1); p.r(l, hx + 2, hy - 1, 4, 1); };
  switch (style) {
    case 'rasati': p.r(mix(c, '#888888', 0.2), hx, hy, 9, 1); p.r(shade(c, -0.1), hx + 7, hy + 1, 2, 2); break;
    case 'cresta': p.r(shade(c, -0.4), hx + 1, hy, 7, 1); p.r(c, hx + 2, hy - 3, 6, 3); p.r(l, hx + 3, hy - 3, 3, 1); p.r(c, hx + 7, hy - 1, 2, 1); break;
    case 'spettinati': cap(); p.r(c, hx + 1, hy - 2, 1, 1); p.r(c, hx + 4, hy - 2, 2, 1); p.r(c, hx + 7, hy - 2, 1, 1); p.r(c, hx - 1, hy + 1, 2, 2); p.r(c, hx + 2, hy + 2, 1, 1); break;
    case 'ricci': p.e(c, hx + 4, hy, 6, 3); p.r(c, hx - 1, hy + 1, 3, 3); p.r(c, hx + 6, hy + 1, 3, 5); p.r(l, hx + 1, hy - 2, 1, 1); p.r(l, hx + 4, hy - 2, 1, 1); p.r(l, hx + 7, hy - 1, 1, 1); p.r(d, hx + 3, hy + 1, 1, 1); break;
    case 'chignon': cap(); p.e(c, hx + 8, hy - 1, 2, 2); p.r(l, hx + 7, hy - 2, 1, 1); break;
    case 'lunghi': cap(); p.r(c, hx - 1, hy + 1, 2, 4); break;
    default: cap();
  }
}
function drawBeard(p, kind, c, hx, hy) {
  const d = shade(c, -0.2);
  switch (kind) {
    case 'corta': p.r(c, hx, hy + 6, 7, 3); p.r(d, hx + 1, hy + 8, 5, 1); p.r(shade(c, 0.15), hx + 1, hy + 7, 2, 1); break;
    case 'lunga': p.r(c, hx, hy + 6, 7, 3); p.r(c, hx, hy + 9, 5, 3); p.r(c, hx + 1, hy + 12, 3, 1); p.r(d, hx + 2, hy + 10, 1, 2); break;
    case 'baffi': p.r(c, hx - 1, hy + 7, 4, 1); p.r(d, hx - 1, hy + 8, 1, 1); break;
    case 'pizzetto': p.r(c, hx, hy + 7, 3, 1); p.r(c, hx + 1, hy + 8, 2, 2); break;
  }
}
function drawHeadwear(p, kind, cloth, trim, hx, hy, sway) {
  const steel = '#8f96a0', steelL = '#c8ccd4';
  switch (kind) {
    case 'cappuccio': {
      const c = cloth, d = shade(cloth, -0.3);
      p.r(c, hx - 1, hy - 2, 11, 5); p.r(c, hx + 6, hy + 3, 4, 8); p.r(c, hx - 1, hy + 3, 2, 3);
      p.r(d, hx + 8, hy + 4, 2, 7); p.r(shade(cloth, 0.2), hx + 1, hy - 2, 4, 1);
      p.r(d, hx + 1, hy + 3, 6, 1); // ombra della tesa sul viso
      p.r(c, hx + 9 + (sway > 1 ? 1 : 0), hy + 9, 2, 2);
      break;
    }
    case 'elmo':
      p.r(steel, hx - 1, hy - 2, 11, 4); p.r(steelL, hx + 1, hy - 2, 4, 1); p.r(trim, hx - 1, hy + 2, 11, 1);
      p.r(steel, hx + 7, hy + 2, 3, 5); p.r(steel, hx + 1, hy + 3, 1, 3); p.r(shade(steel, -0.3), hx + 9, hy + 2, 1, 5);
      p.r(trim, hx + 4, hy - 4, 2, 2);
      break;
    case 'cappello':
      p.r(cloth, hx - 3, hy + 1, 15, 2); p.r(shade(cloth, -0.3), hx - 3, hy + 2, 15, 1);
      p.tri(cloth, hx, hy + 1, hx + 9, hy + 1, hx + 6, hy - 7);
      p.l(cloth, hx + 6, hy - 7, hx + 9 + (sway ? 1 : 0), hy - 8);
      p.r(trim, hx, hy, 9, 1); p.r(shade(cloth, 0.2), hx + 3, hy - 3, 1, 3);
      break;
    case 'mitra':
      p.r(cloth, hx + 1, hy - 4, 7, 6); p.r(shade(cloth, -0.15), hx + 6, hy - 3, 2, 5); p.r(cloth, hx + 2, hy - 5, 5, 1);
      p.r(trim, hx + 4, hy - 4, 1, 5); p.r(trim, hx + 3, hy - 2, 3, 1); p.r(trim, hx, hy + 1, 9, 1);
      break;
    case 'piuma':
      p.r(cloth, hx - 2, hy, 13, 2); p.r(cloth, hx + 1, hy - 3, 7, 3); p.r(trim, hx + 1, hy - 1, 7, 1);
      p.l('#e3c06b', hx + 7, hy - 2, hx + 12, hy - 7); p.l('#fff2b0', hx + 8, hy - 2, hx + 13, hy - 6 + (sway ? 1 : 0));
      break;
    case 'corona':
      p.r('#d9a83a', hx, hy + 1, 9, 1); p.r('#d9a83a', hx + 1, hy, 1, 1); p.r('#d9a83a', hx + 4, hy - 1, 1, 2); p.r('#d9a83a', hx + 7, hy, 1, 1);
      p.r('#8fe3ff', hx + 4, hy, 1, 1); p.r('#fff2b0', hx + 2, hy + 1, 1, 1);
      break;
    case 'fascia':
      p.r(trim, hx - 1, hy + 2, 10, 1); p.r(shade(trim, -0.3), hx - 1, hy + 3, 10, 1);
      p.r(trim, hx + 9, hy + 3, 2, 1); p.r(trim, hx + 10 + (sway ? 1 : 0), hy + 4, 2, 1); p.r(trim, hx + 11 + sway, hy + 5, 1, 2);
      break;
    case 'benda':
      p.l('#2a1a14', hx, hy + 2, hx + 8, hy + 4); p.r('#1a1014', hx, hy + 4, 3, 3);
      break;
    case 'fiore':
      p.r('#ff8ab0', hx + 6, hy - 1, 3, 3); p.r('#ffb0c8', hx + 7, hy - 2, 1, 1); p.r('#ffb0c8', hx + 9, hy, 1, 1); p.r('#ffe45c', hx + 7, hy, 1, 1);
      p.r('#3f7a3a', hx + 5, hy + 1, 1, 1);
      break;
  }
}

function drawHeroFrame(x, hero, f) {
  const cls = CLASSES[hero.cls];
  const L = cls.look;
  const look = { ...DEFAULT_LOOK, ...(hero.look || {}) };
  const skin = look.skin, hair = look.hair;
  const cloth = look.cloth || L.cloak, trim = L.trim;
  const tf = (hero.transforms || []).map((t) => TRANSFORMS[t]?.look);
  const P0 = POSES[f];
  const by = P0.by || 0, lean = P0.lean || 0, sway = P0.sway || 0;
  const [lfx, lfy, lbx, lby] = P0.legs || [0, 0, 0, 0];
  const p = new P(x, 0, 0);
  const wtype = hero.equip?.weapon ? ITEMS[hero.equip.weapon.base]?.wtype || cls.weapon : cls.weapon;
  const glowCol = hero.cls === 'arcanista' ? '#8fe3ff' : hero.cls === 'custode' ? '#fff2b0' : '#ffd27a';
  const outfit = L.outfit;
  const longRobe = outfit === 'robe' || outfit === 'cleric';
  const tx = 11 + lean, ty = 18 + by; // busto
  const hx = 11 + lean, hy = 8 + by; // testa
  const headwear = look.acc === 'classe' ? CLASS_HEADWEAR[hero.cls] : look.acc === 'nessuno' ? null : look.acc;
  const hooded = headwear === 'cappuccio';
  const boots = '#3a2a22', bootsL = '#5a4030';
  const pants = outfit === 'plate' ? '#6a6e78' : outfit === 'hood' ? '#2a2630' : shade(cloth, -0.55);
  const sleeve = tf.includes('glassArm') ? '#9fe8ff' : outfit === 'plate' ? '#a8aeb8' : outfit === 'hood' ? '#3a3440' : shade(cloth, -0.05);
  const hand = tf.includes('glassArm') ? '#e8ffff' : skin;

  // ali di cenere
  if (tf.includes('ashWings')) { p.tri('#6a6460', tx + 9, ty - 4, tx + 19, ty - 12 + sway, tx + 16, ty + 8); p.tri('#8a847c', tx + 9, ty - 2, tx + 17, ty - 8 + sway, tx + 14, ty + 6); }
  // capelli dietro
  if (!hooded) hairBack(p, look.hairStyle, hair, hx, hy, sway);
  // mantello dietro (oscilla)
  if (!longRobe) {
    p.tri(shade(cloth, -0.3), tx + 3, ty, tx + 10, ty, tx + 12 + sway, ty + 16 - (P0.kneel ? 3 : 0));
    p.r(shade(cloth, -0.4), tx + 8, ty + 2, 3, 11);
  }
  if (L.quiver) { p.r('#6a4a2a', tx + 9, ty - 1, 3, 10); p.r('#e8e0c8', tx + 9, ty - 3, 1, 3); p.r('#e8e0c8', tx + 11, ty - 4, 1, 4); p.r('#c94a3a', tx + 10, ty - 3, 1, 1); }
  if (L.lute && wtype !== 'liuto') { p.e('#a0682f', tx + 11, ty + 8, 3, 4); p.r('#5a3a1a', tx + 11, ty - 3, 1, 9); }
  // braccio posteriore
  if (P0.armBUp) { p.r(shade(sleeve, -0.3), tx + 8, ty - 5, 2, 7); p.r(shade(hand, -0.2), tx + 8, ty - 7, 2, 2); }
  else { const d = P0.armB || 0; p.r(shade(sleeve, -0.3), tx + 9 + d, ty + 1, 2, 7); p.r(shade(hand, -0.2), tx + 9 + d, ty + 8, 2, 2); }
  // gambe
  if (P0.kneel) {
    p.r(pants, 8, 33, 7, 2); p.r(pants, 8, 35, 2, 2); p.r(boots, 6, 36, 4, 2);
    p.r(pants, 15, 35, 5, 2); p.r(boots, 19, 35, 3, 3);
  } else if (longRobe) {
    p.r(boots, 12 + lfx, 36 + lfy, 4, 2); p.r(boots, 16 + lbx, 36 + lby, 4, 2);
  } else {
    p.r(shade(pants, -0.2), 16 + lbx, 30 + lby, 3, 6); p.r(shade(boots, -0.2), 16 + lbx, 35 + lby, 4, 3);
    p.r(pants, 12 + lfx, 30 + lfy, 3, 6); p.r(boots, 11 + lfx, 35 + lfy, 4, 3); p.r(bootsL, 11 + lfx, 35 + lfy, 4, 1);
    if (outfit === 'plate') p.r('#a8aeb8', 12 + lfx, 32 + lfy, 3, 1);
  }
  // busto / abito
  const hem = P0.kneel ? 34 : 37;
  switch (outfit) {
    case 'plate':
      p.r(cloth, tx + 2, ty + 9, 6, 6); p.r(trim, tx + 2, ty + 14, 6, 1); // tabarro
      p.r('#8f96a0', tx, ty, 10, 11); p.r('#b8bec8', tx + 1, ty + 1, 4, 5); p.r('#6a707a', tx + 7, ty + 1, 2, 9);
      p.r(cloth, tx + 3, ty + 4, 4, 6); p.r(trim, tx + 4, ty + 5, 2, 1);
      p.r('#5a4030', tx, ty + 10, 10, 1); p.r(trim, tx + 4, ty + 10, 2, 1);
      p.e('#a8aeb8', tx + 1, ty + 1, 3, 2); p.r('#dfe3ea', tx, ty, 2, 1);
      break;
    case 'hood':
      p.r('#3a3440', tx, ty, 10, 11); p.r('#4a4250', tx + 1, ty + 1, 3, 6); p.r(cloth, tx, ty, 10, 3);
      p.l('#5a4a3a', tx + 1, ty + 3, tx + 8, ty + 9); p.r('#5a4a3a', tx, ty + 9, 10, 2); p.r(trim, tx + 4, ty + 9, 2, 2);
      p.r('#2a2630', tx, ty + 11, 10, 1);
      break;
    case 'robe':
      p.tri(cloth, tx + 5, ty, tx - 3, hem, tx + 13, hem); p.r(cloth, tx, ty, 10, 9);
      p.r(shade(cloth, -0.25), tx + 7, ty + 1, 3, hem - ty - 1);
      p.r(trim, tx + 4, ty, 2, hem - ty); p.r(shade(cloth, 0.2), tx + 1, ty + 1, 3, 5);
      p.r(trim, tx - 3, hem - 1, 16, 1); p.r('#5a4030', tx, ty + 8, 10, 1); p.r(trim, tx + 4, ty + 8, 2, 1);
      break;
    case 'cleric':
      p.tri(cloth, tx + 5, ty, tx - 3, hem, tx + 13, hem); p.r(cloth, tx, ty, 10, 9);
      p.r(shade(cloth, -0.18), tx + 7, ty + 1, 3, hem - ty - 1);
      p.r(trim, tx + 1, ty, 2, hem - ty - 2); p.r(trim, tx + 6, ty, 2, hem - ty - 2); // stola
      p.r(shade(trim, 0.3), tx + 1, ty + 2, 1, 1); p.r(trim, tx, ty, 10, 1); p.r(trim, tx - 3, hem - 1, 16, 1);
      p.r('#fff2b0', tx + 4, ty + 3, 1, 3); p.r('#fff2b0', tx + 3, ty + 4, 3, 1);
      break;
    case 'coat':
      p.r(cloth, tx, ty, 10, 15); p.r(shade(cloth, -0.25), tx + 7, ty + 1, 3, 14); p.r(shade(cloth, 0.2), tx + 1, ty + 1, 2, 10);
      p.r('#e8e0c8', tx + 3, ty, 3, 8); p.r('#c8c0a8', tx + 3, ty + 4, 3, 1);
      p.r(trim, tx + 2, ty, 1, 15); p.r(trim, tx + 6, ty + 2, 1, 1); p.r(trim, tx + 6, ty + 5, 1, 1); p.r(trim, tx + 6, ty + 8, 1, 1);
      p.r(trim, tx - 1, ty, 3, 2);
      break;
    case 'ranger':
      p.r(cloth, tx, ty, 10, 11); p.r(shade(cloth, -0.25), tx + 7, ty + 1, 3, 10); p.r(shade(cloth, 0.2), tx + 1, ty + 1, 3, 4);
      p.r(shade(cloth, -0.35), tx - 1, ty, 12, 3); p.r(shade(cloth, -0.15), tx, ty, 10, 1);
      p.r('#6a4a2a', tx, ty + 8, 10, 2); p.r(trim, tx + 4, ty + 8, 2, 2); p.l('#6a4a2a', tx + 1, ty + 3, tx + 8, ty + 8);
      break;
  }
  if (tf.includes('emberHeart')) { p.r('#ff7a2f', tx + 3, ty + 3, 2, 2); p.r('#ffe45c', tx + 3, ty + 3, 1, 1); }
  if (tf.includes('saltSkin')) { p.r('#ffffff', tx + 1, ty + 6, 1, 1); p.r('#e8f4ff', tx + 8, ty + 3, 1, 1); p.r('#ffffff', hx + 6, hy + 7, 1, 1); }
  // collo e testa
  p.r(shade(skin, -0.2), hx + 3, hy + 9, 4, 2);
  p.r(skin, hx, hy, 9, 9); p.x.clearRect(hx, hy + 8, 1, 1); p.x.clearRect(hx + 8, hy + 8, 1, 1);
  p.r(shade(skin, -0.16), hx + 7, hy + 1, 2, 7); p.r(shade(skin, -0.1), hx + 1, hy + 8, 6, 1);
  p.r(skin, hx - 1, hy + 4, 1, 2); // naso
  p.r(shade(skin, -0.12), hx + 6, hy + 4, 1, 2); p.r(shade(skin, -0.3), hx + 6, hy + 5, 1, 1); // orecchio
  // occhi
  const eyeC = tf.includes('mothEye') ? '#d080ff' : look.eyes;
  const ey = hy + 4;
  if (P0.blink) { p.r(shade(skin, -0.35), hx, ey + 1, 2, 1); p.r(shade(skin, -0.35), hx + 3, ey + 1, 2, 1); }
  else if (P0.hurt) { p.l('#1a1418', hx, ey, hx + 1, ey + 1); p.l('#1a1418', hx + 3, ey, hx + 4, ey + 1); }
  else {
    p.r(eyeC, hx, ey, 1, 2); p.r('#f4ece4', hx + 1, ey, 1, 2);
    p.r(eyeC, hx + 3, ey, 1, 2); p.r('#f4ece4', hx + 4, ey, 1, 2);
    if (tf.includes('mothEye')) p.r('#ffffff', hx, ey, 1, 1);
  }
  p.r(shade(hair, -0.2), hx, ey - 1, 2, 1); p.r(shade(hair, -0.2), hx + 3, ey - 1, 2, 1); // sopracciglia
  p.r(mix(skin, '#ff7070', 0.28), hx + 1, ey + 2, 2, 1); // guancia
  p.r(P0.hurt ? '#5a1a1a' : shade(skin, -0.38), hx, hy + 7, 2, 1); // bocca
  if (tf.includes('scar')) p.l('#a03030', hx + 3, hy + 2, hx + 5, hy + 6);
  if (look.beard !== 'nessuna') drawBeard(p, look.beard, hair, hx, hy);
  // capelli davanti e copricapo
  if (!hooded) hairFront(p, headwear === 'elmo' ? 'rasati' : look.hairStyle, hair, hx, hy);
  if (headwear) drawHeadwear(p, headwear, cloth, trim, hx, hy, sway);
  if (tf.includes('halo')) { p.r('#ffe45c', hx, hy - 6, 9, 1); p.r('#fff2b0', hx + 2, hy - 7, 5, 1); }
  // braccio anteriore + mano + arma
  let H;
  switch (P0.arm) {
    case 'swing': { const s2 = P0.swing || 0; p.r(sleeve, tx - 2 + s2, ty + 1, 2, 7); p.r(hand, tx - 2 + s2, ty + 8, 2, 2); H = [tx - 2 + s2, ty + 8]; break; }
    case 'back': thick(p, sleeve, tx + 1, ty + 1, tx + 5, ty - 3); p.r(hand, tx + 5, ty - 5, 2, 2); H = [tx + 5, ty - 4]; break;
    case 'fwd': p.r(sleeve, tx - 5, ty + 2, 6, 2); p.r(hand, tx - 7, ty + 2, 2, 2); H = [tx - 7, ty + 2]; break;
    case 'up': p.r(sleeve, tx - 3, ty - 4, 2, 6); p.r(hand, tx - 3, ty - 6, 2, 2); H = [tx - 3, ty - 6]; break;
    case 'guard': p.r(sleeve, tx - 1, ty + 1, 2, 4); p.r(sleeve, tx - 4, ty + 4, 4, 2); p.r(hand, tx - 5, ty + 3, 2, 2); H = [tx - 5, ty + 3]; break;
    case 'limp': p.r(sleeve, tx - 2, ty + 2, 2, 6); p.r(hand, tx - 3, ty + 8, 2, 2); H = [tx - 3, ty + 8]; break;
    default: { const dy2 = P0.armDy || 0; p.r(sleeve, tx - 2, ty + 1, 2, 7 + dy2); p.r(hand, tx - 2, ty + 8 + dy2, 2, 2); H = [tx - 2, ty + 8 + dy2]; }
  }
  if (outfit === 'plate' && P0.arm !== 'limp') p.e('#b8bec8', tx, ty + 1, 2, 2);
  drawWeapon(p, wtype, P0.wpn, H, glowCol);
  if (P0.glow) {
    const [gx, gy] = H;
    for (const [ox, oy] of [[-3, -2], [2, -3], [-1, -5], [3, 1], [-4, 1]]) p.r(glowCol, gx + ox, gy + oy, 1, 1);
    p.r('#ffffff', gx, gy - 3, 1, 1);
  }
}

export function heroKey(hero) { return JSON.stringify([hero.cls, hero.look, hero.transforms, hero.equip?.weapon?.base]); }
const heroCache = new Map();
export function heroSheet(hero) {
  const key = heroKey(hero);
  if (heroCache.has(key)) return heroCache.get(key);
  const [c, x] = canvas(HERO_W * HERO_FRAMES, HERO_H);
  for (let f = 0; f < HERO_FRAMES; f++) {
    const [fc, fx] = canvas(HERO_W, HERO_H);
    drawHeroFrame(fx, hero, f);
    finish(fx, HERO_W, HERO_H);
    let out = fc;
    if (POSES[f].hurt) out = tint(fc, '#ff3030', 0.35);
    if (POSES[f].kneel) out = tint(fc, '#20182a', 0.25);
    x.drawImage(out, f * HERO_W, 0);
  }
  if (heroCache.size > 60) heroCache.clear();
  heroCache.set(key, c);
  return c;
}
const urlCache = new Map();
function memo(key, fn) { if (!urlCache.has(key)) { if (urlCache.size > 400) urlCache.clear(); urlCache.set(key, fn()); } return urlCache.get(key); }
export function heroPortrait(hero, scale = 3) {
  return memo('hp' + scale + heroKey(hero), () => heroPortraitRaw(hero, scale));
}
function heroPortraitRaw(hero, scale) {
  const sheet = heroSheet(hero);
  const [c, x] = canvas(22 * scale, 22 * scale);
  x.imageSmoothingEnabled = false;
  x.drawImage(sheet, 4, 1, 22, 22, 0, 0, 22 * scale, 22 * scale);
  return c.toDataURL();
}
export function heroFull(hero, scale = 3) {
  return memo('hf' + scale + heroKey(hero), () => heroFullRaw(hero, scale));
}
function heroFullRaw(hero, scale) {
  const sheet = heroSheet(hero);
  const [c, x] = canvas(HERO_W * scale, HERO_H * scale);
  x.imageSmoothingEnabled = false;
  x.drawImage(sheet, 0, 0, HERO_W, HERO_H, 0, 0, HERO_W * scale, HERO_H * scale);
  return c.toDataURL();
}
// Striscia di fotogrammi per animare un'anteprima via CSS (steps)
export function heroStrip(hero, frames, scale = 4) {
  return memo('hs' + scale + frames.join(',') + heroKey(hero), () => {
    const sheet = heroSheet(hero);
    const [c, x] = canvas(HERO_W * scale * frames.length, HERO_H * scale);
    x.imageSmoothingEnabled = false;
    frames.forEach((f, i) => x.drawImage(sheet, f * HERO_W, 0, HERO_W, HERO_H, i * HERO_W * scale, 0, HERO_W * scale, HERO_H * scale));
    return c.toDataURL();
  });
}

// ================= NEMICI =================
const ENEMY_DIM = {
  cultist: [40, 44], beast: [48, 36], specter: [40, 44], moth: [48, 40], bandit: [40, 44], slime: [40, 32], knight: [48, 52],
  lampkeeper: [48, 72], toad: [48, 40], crab: [52, 36], queen: [72, 72], inquisitor: [48, 64], bishop: [72, 84],
};
function drawEnemy(p, kind, pal, f, W, H) {
  const [a, b, c] = pal;
  const bob = f === 1 ? 1 : 0;
  const atk = f === 2;
  const q = new P(p.x, p.ox + (atk ? -3 : 0), p.oy + bob);
  switch (kind) {
    case 'cultist': case 'bandit': {
      const robe = a;
      q.tri(robe, 20, 12, 8, 42, 32, 42);
      q.r(shade(robe, -0.3), 22, 18, 6, 22);
      q.e(shade(robe, -0.2), 20, 12, 7, 7); // cappuccio
      q.e('#1a1418', 19, 13, 4, 4);
      if (kind === 'cultist') { q.r(b, 16, 11, 7, 6); q.r(c, 17, 13, 2, 1); q.r(c, 20, 13, 2, 1); }
      else { q.r('#e0b48c', 16, 11, 7, 6); q.r(b, 15, 9, 9, 2); q.r('#1a1418', 17, 13, 1, 1); q.r('#1a1418', 20, 13, 1, 1); }
      q.r(b, 12, 26, 16, 2);
      if (kind === 'cultist') { q.r('#5a3a2a', atk ? 4 : 9, atk ? 14 : 10, 2, 26); q.e(c, atk ? 5 : 10, atk ? 12 : 8, 2, 2); }
      else { q.l('#c8ccd4', atk ? 4 : 10, atk ? 22 : 18, atk ? 12 : 10, atk ? 26 : 32); q.r('#c9a24a', 9, 28, 3, 2); }
      break;
    }
    case 'beast': {
      q.e(a, 26, 20, 14, 8); q.e(shade(a, 0.25), 24, 17, 10, 4);
      q.e(a, atk ? 6 : 10, 15, 7, 6); q.tri(a, 8, 9, 11, 3, 13, 10); q.tri(a, 12, 9, 15, 4, 16, 11);
      q.r(b, atk ? 1 : 4, 17, 5, 3); q.r('#1a1418', atk ? 1 : 4, 19, 4, 1); q.r(c, atk ? 5 : 8, 13, 2, 2);
      q.r(shade(a, -0.3), 14, 26, 4, 8); q.r(shade(a, -0.3), 34, 26, 4, 8); q.r(a, 19, 26, 4, 8); q.r(a, 29, 26, 4, 8);
      q.tri(a, 38, 16, 47, 10, 42, 20);
      break;
    }
    case 'specter': {
      p.x.globalAlpha = 0.88;
      q.e(a, 20, 18, 11, 12); q.tri(a, 9, 20, 31, 20, 24, 43); q.tri(shade(a, 0.3), 13, 22, 25, 22, 14, 40);
      q.e(shade(a, 0.4), 18, 14, 6, 6);
      q.r('#1a1418', 13, 13, 9, 5); q.r(c, 14, 14, 2, 2); q.r(c, 19, 14, 2, 2);
      q.l(b, atk ? 3 : 8, atk ? 16 : 24, 12, 22); q.l(b, 28, 22, 34, 28);
      p.x.globalAlpha = 1;
      break;
    }
    case 'moth': {
      const wing = a;
      q.tri(wing, 24, 18, 2, 2, 8, 30); q.tri(wing, 24, 18, 46, 2, 40, 30);
      q.tri(shade(wing, -0.2), 24, 22, 6, 36, 18, 38); q.tri(shade(wing, -0.2), 24, 22, 42, 36, 30, 38);
      q.e(b, 12, 12, 3, 3); q.e(b, 36, 12, 3, 3); q.e(c, 12, 12, 1, 1); q.e(c, 36, 12, 1, 1);
      q.e(b, 24, 22, 3, 10); q.r('#1a1418', 22, 14, 5, 3); q.r(c, 22, 15, 1, 1); q.r(c, 25, 15, 1, 1);
      q.l(b, 22, 12, 17, 4); q.l(b, 26, 12, 31, 4);
      break;
    }
    case 'slime': {
      q.e(a, 20, 22, 16 + (bob ? 1 : 0), 10 - bob); q.e(shade(a, 0.25), 16, 18, 8, 4);
      q.r('#1a1418', 12, 19, 3, 4); q.r('#1a1418', 21, 19, 3, 4); q.r('#ffffff', 12, 19, 1, 1); q.r('#ffffff', 21, 19, 1, 1);
      q.r(c, 28, 14, 2, 2); q.r(c, 8, 26, 2, 1); q.r(b, 30, 24, 3, 2);
      break;
    }
    case 'knight': {
      q.r(a, 16, 18, 18, 18); q.r(shade(a, 0.25), 17, 19, 6, 10); q.r(b, 16, 34, 18, 4);
      q.r(shade(a, -0.3), 18, 38, 5, 12); q.r(shade(a, -0.3), 27, 38, 5, 12);
      q.e(a, 25, 11, 7, 8); q.r('#0a0a10', 19, 10, 10, 3); q.r(c, 20, 11, 3, 1); q.r(c, 25, 11, 2, 1);
      q.e(shade(a, 0.1), 14, 19, 4, 3); q.e(shade(a, 0.1), 35, 19, 4, 3);
      q.r(a, 34, 20, 4, 12);
      if (atk) { q.l('#c8ccd4', 13, 24, 0, 18); q.l('#c8ccd4', 13, 25, 0, 19); }
      else { q.r('#c8ccd4', 10, 4, 3, 30); q.r(shade('#c8ccd4', 0.4), 10, 4, 1, 30); q.r('#5a4a3a', 7, 32, 9, 2); }
      break;
    }
    case 'lampkeeper': {
      q.r('#2a2a30', 18, 24, 12, 34); q.tri(a, 14, 24, 34, 24, 38, 64); q.tri(shade(a, -0.3), 24, 24, 38, 64, 30, 64);
      q.r('#3a3440', 19, 58, 4, 12); q.r('#3a3440', 26, 58, 4, 12);
      q.l(b, 16, 26, atk ? 2 : 6, atk ? 26 : 46); q.l(b, 32, 26, 42, 48);
      q.r('#5a4a3a', 18, 4, 12, 3); q.r(c, 17, 7, 14, 14); q.r('#fff2b0', 20, 10, 8, 8); q.r('#1a1418', 18, 7, 1, 14); q.r('#1a1418', 29, 7, 1, 14); q.r('#5a4a3a', 18, 21, 12, 3);
      q.r('#1a1418', 21, 13, 2, 2); q.r('#1a1418', 25, 13, 2, 2);
      q.r(c, atk ? 0 : 4, atk ? 25 : 46, 4, 5);
      break;
    }
    case 'toad': {
      q.e(a, 24, 26, 20, 12); q.e(b, 24, 30, 14, 7); q.e(a, 14, 14, 6, 6); q.e(a, 32, 14, 6, 6);
      q.e('#ffe45c', 13, 13, 3, 3); q.e('#ffe45c', 31, 13, 3, 3); q.r('#1a1418', 12, 13, 2, 2); q.r('#1a1418', 30, 13, 2, 2);
      q.r('#1a1418', 8, 24, 30, 1); if (atk) q.r('#ff7a8a', 0, 23, 10, 2);
      q.r(shade(a, -0.3), 6, 34, 8, 5); q.r(shade(a, -0.3), 34, 34, 8, 5);
      break;
    }
    case 'crab': {
      q.e(a, 26, 22, 16, 10); q.e(shade(a, 0.25), 24, 18, 10, 4);
      q.e(b, atk ? 4 : 8, 14, 6, 5); q.e(b, 44, 14, 6, 5); q.r('#1a1418', atk ? 2 : 6, 14, 6, 1);
      for (let i = 0; i < 3; i++) { q.l(shade(a, -0.3), 16 + i * 4, 30, 12 + i * 4, 35); q.l(shade(a, -0.3), 32 + i * 4, 30, 36 + i * 4, 35); }
      q.r(c, 20, 13, 2, 2); q.r(c, 28, 13, 2, 2);
      break;
    }
    case 'queen': {
      q.tri(a, 36, 30, 2, 4, 10, 50); q.tri(a, 36, 30, 70, 4, 62, 50);
      q.tri(shade(a, 0.2), 36, 30, 8, 12, 14, 40); q.tri(shade(a, 0.2), 36, 30, 64, 12, 58, 40);
      for (const [x, y] of [[12, 16], [60, 16], [16, 36], [56, 36], [22, 26], [50, 26]]) { q.e(c, x, y, 2, 2); q.r('#ffffff', x, y, 1, 1); }
      q.tri(b, 36, 24, 26, 70, 46, 70); q.r(shade(b, -0.2), 34, 30, 4, 38);
      q.e('#f0e0ff', 36, 18, 6, 7); q.r('#1a1418', 32, 17, 2, 2); q.r('#1a1418', 38, 17, 2, 2); q.r(c, 32, 17, 1, 1); q.r(c, 38, 17, 1, 1);
      q.r('#ffe45c', 30, 9, 13, 2); q.r('#ffe45c', 31, 6, 2, 3); q.r('#ffe45c', 35, 5, 2, 4); q.r('#ffe45c', 39, 6, 2, 3);
      q.l(b, 33, 10, 26, 2); q.l(b, 39, 10, 46, 2);
      if (atk) q.e(c, 18, 30, 4, 4);
      break;
    }
    case 'inquisitor': {
      q.tri(c, 24, 18, 6, 60, 40, 60); q.r(a, 15, 20, 18, 26); q.r(shade(a, 0.3), 16, 21, 6, 12); q.r(b, 23, 20, 2, 26);
      q.r('#3a3440', 17, 46, 5, 16); q.r('#3a3440', 26, 46, 5, 16);
      q.e('#c8ccd4', 24, 12, 6, 7); q.r('#0a0a10', 19, 11, 10, 2); q.r(c, 20, 11, 2, 1); q.r(c, 25, 11, 2, 1);
      q.tri(b, 18, 6, 30, 6, 24, -6 + 6); q.r(c, 23, 2, 2, 4);
      if (atk) { q.l('#7fd4ff', 14, 26, 0, 12); q.l('#bfefff', 14, 27, 0, 13); } else { q.r('#7fd4ff', 10, 6, 3, 34); q.r('#bfefff', 10, 6, 1, 34); }
      break;
    }
    case 'bishop': {
      q.e(c, 36, 16, 20, 20); q.e('#1a1420', 36, 16, 15, 15); // eclisse alle spalle
      q.tri(a, 36, 24, 8, 84, 64, 84); q.tri(shade(a, 0.15), 36, 24, 20, 84, 34, 84);
      q.r(b, 34, 30, 4, 54); q.r(c, 26, 50, 20, 2);
      q.e(b, 36, 24, 8, 9); q.tri('#0a0810', 26, 18, 46, 18, 44, 40); q.tri('#0a0810', 26, 18, 28, 40, 44, 40);
      q.r(c, 32, 26, 2, 1); q.r(c, 39, 26, 2, 1);
      q.tri(b, 28, 16, 44, 16, 36, 2); q.r(c, 35, 6, 2, 8); q.r(c, 32, 9, 8, 2);
      q.l(b, 22, 36, atk ? 4 : 10, atk ? 30 : 60); q.l(b, 50, 36, 62, 60);
      if (atk) { q.e(c, 4, 28, 4, 4); q.e('#ffffff', 4, 28, 1, 1); }
      break;
    }
  }
}
const enemyCache = new Map();
export function enemySheet(enemyId) {
  if (enemyCache.has(enemyId)) return enemyCache.get(enemyId);
  const d = ENEMIES[enemyId];
  const [W, H] = ENEMY_DIM[d.kind] || [40, 44];
  const [c, x] = canvas(W * 4, H);
  for (let f = 0; f < 4; f++) {
    const [fc, fx] = canvas(W, H);
    drawEnemy(new P(fx), d.kind, d.pal, f === 3 ? 0 : f, W, H);
    finish(fx, W, H);
    let out = mirror(fc); // i nemici guardano a destra
    if (f === 3) out = tint(out, '#ffffff', 0.55);
    x.drawImage(out, f * W, 0);
  }
  const res = { canvas: c, w: W, h: H };
  enemyCache.set(enemyId, res);
  return res;
}
export function enemyPortrait(enemyId) { return memo('ep' + enemyId, () => enemyPortraitRaw(enemyId)); }
function enemyPortraitRaw(enemyId) {
  const { canvas: sh, w, h } = enemySheet(enemyId);
  const s = Math.min(64 / w, 64 / h);
  const [c, x] = canvas(64, 64);
  x.drawImage(sh, 0, 0, w, h, (64 - w * s) / 2, (64 - h * s) / 2, w * s, h * s);
  return c.toDataURL();
}

// ================= DECORAZIONI =================
const decorCache = new Map();
export function decor(kind, variant = 0) {
  const key = kind + ':' + variant;
  if (decorCache.has(key)) return decorCache.get(key);
  let W = 32, H = 48;
  const def = {
    pine: [24, 44], oak: [36, 40], deadtree: [32, 40], bush: [20, 14], flower: [12, 10], rock: [20, 14], reed: [16, 18], pillar: [16, 34], peak: [40, 34],
    house: [32, 32], tent: [30, 24], fire: [12, 14], tower: [24, 56], beacon: [22, 52], beaconLit: [22, 52], crystal: [26, 34], shrine: [28, 30], cave: [36, 26], cart: [34, 24],
    cathedral: [64, 80], castle: [40, 60], sign: [12, 16], sunshard: [48, 48], mushroom: [12, 12], bones: [14, 8], lantern: [8, 18],
  }[kind] || [32, 32];
  [W, H] = def;
  const [c, x] = canvas(W, H);
  const p = new P(x);
  const v = variant;
  switch (kind) {
    case 'pine': {
      const g = ['#2e4a2c', '#35552f', '#2a4430'][v % 3];
      p.r('#4a3424', 11, 36, 3, 8);
      for (let i = 0; i < 4; i++) p.tri(shade(g, i * 0.06), 12, 2 + i * 8, 1 + i, 16 + i * 7, 23 - i, 16 + i * 7);
      p.tri(shade(g, 0.25), 12, 4, 8, 14, 12, 14);
      break;
    }
    case 'oak': {
      const g = ['#46663a', '#557a40', '#3e5a34'][v % 3];
      p.r('#5a3e28', 16, 26, 4, 14); p.l('#5a3e28', 18, 30, 24, 24);
      p.e(g, 18, 16, 15, 11); p.e(shade(g, 0.2), 14, 12, 8, 6); p.e(shade(g, -0.25), 24, 21, 8, 5);
      if (v % 2) { p.r('#c84a3a', 10, 16, 1, 1); p.r('#c84a3a', 25, 12, 1, 1); }
      break;
    }
    case 'deadtree': {
      const t = '#4a3a30';
      p.r(t, 14, 18, 4, 22); p.l(t, 16, 20, 6, 8); p.l(t, 16, 18, 26, 6); p.l(t, 8, 10, 4, 4); p.l(t, 24, 8, 28, 2); p.l(t, 16, 26, 22, 20); p.l(t, 15, 14, 14, 2);
      break;
    }
    case 'bush': p.e(['#4a6a3a', '#5a7a44', '#3a5a32'][v % 3], 10, 8, 9, 5); p.e(shade('#5a7a44', 0.2), 7, 6, 4, 2); break;
    case 'flower': p.r('#4a6a3a', 5, 4, 1, 6); p.e(['#e8c84a', '#d86a8a', '#9a8aff'][v % 3], 5, 3, 2, 2); p.r('#ffffff', 5, 3, 1, 1); break;
    case 'rock': p.e('#7a7680', 10, 9, 9, 5); p.e('#9a96a0', 8, 7, 5, 3); p.r('#5a5660', 4, 11, 12, 2); break;
    case 'reed': for (let i = 0; i < 4; i++) { p.l('#6a7a4a', 3 + i * 3, 18, 2 + i * 3 + (i % 2), 4 + i); p.r('#6a4a2a', 2 + i * 3 + (i % 2), 3 + i, 2, 3); } break;
    case 'pillar': p.r('#a09684', 4, 6, 8, 26); p.r('#c0b6a4', 5, 6, 2, 26); p.r('#8a8070', 2, 30, 12, 4); p.tri('#a09684', 4, 6, 12, 6, 10, 2); break;
    case 'peak': p.tri('#6a6a72', 20, 0, 0, 34, 40, 34); p.tri('#8a8a92', 20, 0, 6, 26, 20, 34); p.tri('#e8eef4', 20, 0, 14, 10, 26, 10); break;
    case 'house': {
      const wall = ['#c8b090', '#b8a080', '#a89078'][v % 3], roof = ['#8a3a2a', '#5a4a6a', '#6a5a3a'][v % 3];
      p.r(wall, 4, 14, 24, 18); p.r(shade(wall, -0.2), 20, 14, 8, 18);
      p.tri(roof, 16, 2, 0, 16, 32, 16); p.tri(shade(roof, 0.2), 16, 2, 4, 14, 16, 14);
      p.r('#ffd27a', 8, 20, 4, 4); p.r('#ffb547', 8, 22, 4, 2); p.r('#4a3424', 15, 22, 5, 10);
      break;
    }
    case 'tent': p.tri('#8a6a4a', 15, 2, 0, 22, 30, 22); p.tri('#a8865a', 15, 2, 4, 22, 15, 22); p.tri('#2a1e18', 15, 10, 11, 22, 19, 22); break;
    case 'fire': p.r('#5a3a2a', 1, 11, 10, 3); p.tri('#ff7a2f', 6, 0, 1, 12, 11, 12); p.tri('#ffd27a', 6, 4, 3, 12, 9, 12); p.r('#fff2b0', 5, 9, 2, 3); break;
    case 'tower': p.r('#6a6470', 5, 12, 14, 44); p.r('#8a8490', 6, 12, 4, 44); p.tri('#3a3440', 12, 0, 2, 14, 22, 14); p.r('#1a1418', 10, 20, 4, 6); p.r('#ffb547', 11, 21, 2, 4); p.r('#1a1418', 10, 34, 4, 6); break;
    case 'beacon': case 'beaconLit': {
      p.r('#8a8070', 6, 18, 10, 34); p.r('#a8a090', 7, 18, 3, 34); p.r('#5a5246', 4, 48, 14, 4);
      p.r('#5a4a3a', 4, 14, 14, 4); p.r('#3a3440', 6, 4, 10, 10);
      if (kind === 'beaconLit') { p.e('#ffb547', 11, 8, 4, 4); p.e('#fff2b0', 11, 8, 2, 2); } else p.r('#2a2430', 8, 6, 6, 6);
      p.tri('#5a4a3a', 11, 0, 4, 4, 18, 4);
      break;
    }
    case 'crystal': p.tri('#7fd4ff', 13, 0, 4, 22, 22, 22); p.tri('#bfefff', 13, 0, 8, 20, 13, 22); p.tri('#4a8ab0', 4, 22, 22, 22, 13, 33); p.tri('#9fe8ff', 20, 10, 24, 24, 18, 24); p.tri('#9fe8ff', 6, 12, 2, 24, 8, 24); break;
    case 'shrine': p.r('#8a8070', 2, 24, 24, 6); p.r('#a09684', 6, 8, 16, 16); p.e('#ffd27a', 14, 6, 6, 6); p.e('#fff2b0', 14, 6, 3, 3); p.r('#5a5246', 12, 14, 4, 10); break;
    case 'cave': p.e('#5a5660', 18, 18, 18, 10); p.e('#7a7680', 14, 14, 10, 5); p.e('#0a0810', 18, 20, 8, 6); p.r('#e8e0c8', 8, 24, 3, 1); p.r('#e8e0c8', 27, 23, 2, 1); break;
    case 'cart': p.r('#8a6a4a', 2, 6, 26, 10); p.r('#c8b090', 4, 2, 22, 6); p.e('#4a3424', 8, 18, 4, 4); p.e('#4a3424', 24, 18, 4, 4); p.r('#ffb547', 28, 4, 3, 4); break;
    case 'cathedral': {
      p.r('#2a2430', 8, 30, 48, 50); p.r('#3a3440', 10, 30, 12, 50);
      p.tri('#1a1420', 32, 0, 18, 32, 46, 32); p.r('#1a1420', 4, 20, 10, 60); p.r('#1a1420', 50, 20, 10, 60);
      p.tri('#1a1420', 9, 4, 3, 22, 15, 22); p.tri('#1a1420', 55, 4, 49, 22, 61, 22);
      p.e('#ff5c7a', 32, 46, 6, 8); p.e('#1a1420', 32, 46, 4, 6); p.r('#ff5c7a', 30, 66, 4, 14);
      break;
    }
    case 'castle': p.r('#4a4450', 6, 20, 28, 40); p.r('#5a5460', 7, 20, 8, 40); for (let i = 0; i < 4; i++) p.r('#4a4450', 6 + i * 8, 16, 4, 4); p.r('#2a2430', 14, 0, 12, 22); p.tri('#1a1420', 20, -6 + 6, 12, 6, 28, 6); p.r('#7dff9a', 18, 8, 4, 4); p.r('#1a1418', 16, 46, 8, 14); break;
    case 'sign': p.r('#5a3e28', 5, 6, 2, 10); p.r('#8a6a4a', 0, 2, 12, 6); break;
    case 'sunshard': p.e('#ffb547', 24, 24, 20, 20); p.e('#ffd27a', 24, 24, 14, 14); p.e('#fff2b0', 24, 24, 8, 8); p.l('#3a1420', 10, 8, 30, 40); p.l('#3a1420', 30, 4, 22, 26); p.l('#3a1420', 40, 16, 22, 26); break;
    case 'mushroom': p.r('#e8e0c8', 5, 6, 2, 6); p.e(['#c84a8a', '#7dff9a', '#7fd4ff'][v % 3], 6, 5, 5, 3); break;
    case 'bones': p.r('#e8e0c8', 1, 4, 12, 2); p.e('#e8e0c8', 3, 3, 2, 2); p.e('#e8e0c8', 11, 5, 2, 2); break;
    case 'lantern': p.r('#3a3440', 3, 6, 2, 12); p.r('#5a4a3a', 1, 0, 6, 2); p.r('#ffb547', 2, 2, 4, 4); break;
  }
  finish(x, W, H, { rim: true });
  decorCache.set(key, c);
  return c;
}

// ================= ICONE POI =================
export function poiIcon(t) {
  const [c, x] = canvas(16, 16);
  const p = new P(x);
  const col = { town: '#ffd27a', merchant: '#ffd27a', camp: '#ff7a2f', beacon: '#ffb547', crystal: '#7fd4ff', shrine: '#fff2b0', den: '#ff5c7a', event: '#e8e0c8', story: '#ffe45c', boss: '#ff3050' }[t] || '#fff';
  p.e('#1a1418', 8, 8, 7, 7); p.e(col, 8, 8, 6, 6); p.e(shade(col, -0.35), 8, 8, 5, 5);
  const ink = '#1a1418';
  switch (t) {
    case 'event': p.r(ink, 7, 4, 2, 6); p.r(ink, 7, 11, 2, 2); break;
    case 'story': p.tri(ink, 8, 3, 4, 12, 12, 12); p.tri(col, 8, 6, 6, 11, 10, 11); break;
    case 'boss': p.e(ink, 8, 7, 4, 4); p.r(ink, 6, 11, 5, 2); p.r(col, 6, 6, 1, 2); p.r(col, 9, 6, 1, 2); break;
    case 'town': p.tri(ink, 8, 3, 3, 8, 13, 8); p.r(ink, 4, 8, 8, 5); break;
    case 'merchant': p.e(ink, 8, 8, 3, 3); p.r(col, 7, 6, 2, 4); break;
    case 'camp': p.tri(ink, 8, 3, 4, 12, 12, 12); break;
    case 'beacon': p.r(ink, 7, 4, 2, 9); p.r(ink, 5, 4, 6, 2); break;
    case 'crystal': p.tri(ink, 8, 2, 5, 8, 11, 8); p.tri(ink, 5, 8, 11, 8, 8, 14); break;
    case 'shrine': p.r(ink, 7, 3, 2, 10); p.r(ink, 4, 6, 8, 2); break;
    case 'den': p.e(ink, 8, 9, 4, 3); p.r(col, 5, 7, 1, 1); p.r(col, 10, 7, 1, 1); break;
  }
  return c;
}

// ================= TEXTURE TERRENO =================
const texCache = new Map();
export function tileTexture(colors, seed = 1, detail = null) {
  const key = colors.join() + seed + detail;
  if (texCache.has(key)) return texCache.get(key);
  const S = 32;
  const [c, x] = canvas(S, S);
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let yy = 0; yy < S; yy += 2) for (let xx = 0; xx < S; xx += 2) {
    const r = rnd();
    x.fillStyle = r < 0.45 ? colors[0] : r < 0.75 ? colors[1] : r < 0.92 ? colors[2] : colors[3];
    x.fillRect(xx, yy, 2, 2);
  }
  if (detail === 'grass') for (let i = 0; i < 14; i++) { const X = Math.floor(rnd() * S), Y = Math.floor(rnd() * S); x.fillStyle = shade(colors[3], 0.15); x.fillRect(X, Y, 1, 2); }
  if (detail === 'stone') for (let i = 0; i < 6; i++) { const X = Math.floor(rnd() * S), Y = Math.floor(rnd() * S); x.fillStyle = shade(colors[2], -0.25); x.fillRect(X, Y, 4, 1); }
  if (detail === 'water') for (let i = 0; i < 8; i++) { const X = Math.floor(rnd() * S), Y = Math.floor(rnd() * S); x.fillStyle = shade(colors[3], 0.35); x.fillRect(X, Y, 3, 1); }
  texCache.set(key, c);
  return c;
}
export function sideTexture(color) {
  const key = 'side' + color;
  if (texCache.has(key)) return texCache.get(key);
  const [c, x] = canvas(32, 16);
  for (let y = 0; y < 16; y++) for (let X = 0; X < 32; X += 2) {
    x.fillStyle = y < 2 ? shade(color, 0.2) : (X + y * 3) % 7 === 0 ? shade(color, -0.25) : (y % 5 === 0 ? shade(color, -0.12) : color);
    x.fillRect(X, y, 2, 1);
  }
  texCache.set(key, c);
  return c;
}
export function glowTexture(color = '#ffffff') {
  const key = 'glow' + color;
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, color); g.addColorStop(0.3, color + 'aa'); g.addColorStop(1, color + '00');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  texCache.set(key, c);
  return c;
}

// ================= ILLUSTRAZIONI EVENTI =================
const ART = {
  road: { sky: ['#2a2040', '#a0504a'], items: [['oak', 0, 0.15], ['sign', 0, 0.45], ['bush', 1, 0.6], ['pine', 1, 0.85]] },
  shrine: { sky: ['#1c1830', '#7a4a5a'], items: [['pillar', 0, 0.2], ['shrine', 0, 0.5], ['pillar', 0, 0.8], ['flower', 1, 0.62]] },
  forest: { sky: ['#101820', '#3a5a4a'], items: [['pine', 0, 0.1], ['pine', 1, 0.3], ['pine', 2, 0.55], ['pine', 0, 0.8], ['bush', 0, 0.45]] },
  merchant: { sky: ['#1c1830', '#8a5a3a'], items: [['deadtree', 0, 0.2], ['cart', 0, 0.55], ['lantern', 0, 0.75]] },
  bridge: { sky: ['#1a1a2a', '#5a4a6a'], items: [['peak', 0, 0.1], ['rock', 0, 0.4], ['peak', 0, 0.85]] },
  crystal: { sky: ['#101a2a', '#4a7a9a'], items: [['crystal', 0, 0.3], ['rock', 0, 0.55], ['crystal', 0, 0.75]] },
  camp: { sky: ['#140e1a', '#5a2a2a'], items: [['tent', 0, 0.3], ['fire', 0, 0.55], ['pine', 1, 0.85]] },
  ruins: { sky: ['#1a1420', '#6a3a3a'], items: [['pillar', 0, 0.15], ['bones', 0, 0.35], ['pillar', 0, 0.55], ['rock', 0, 0.8]] },
  moth: { sky: ['#140a24', '#5a3a7a'], items: [['mushroom', 0, 0.2], ['deadtree', 0, 0.45], ['mushroom', 1, 0.6], ['mushroom', 2, 0.8]] },
  river: { sky: ['#101a24', '#3a5a6a'], items: [['reed', 0, 0.15], ['cart', 0, 0.5], ['reed', 0, 0.85]] },
  swamp: { sky: ['#0e1a18', '#2a4a40'], items: [['reed', 0, 0.1], ['deadtree', 0, 0.35], ['reed', 0, 0.6], ['mushroom', 1, 0.8]] },
  well: { sky: ['#1a1830', '#6a4a5a'], items: [['rock', 0, 0.3], ['shrine', 0, 0.55], ['bush', 0, 0.8]] },
  beacon: { sky: ['#1c1830', '#9a5a3a'], items: [['rock', 0, 0.2], ['beacon', 0, 0.5], ['pine', 0, 0.8]] },
  town: { sky: ['#1c1830', '#b0603a'], items: [['house', 0, 0.15], ['house', 1, 0.4], ['fire', 0, 0.58], ['house', 2, 0.78]] },
  tower: { sky: ['#140e1a', '#4a2a3a'], items: [['deadtree', 0, 0.2], ['castle', 0, 0.55], ['lantern', 0, 0.85]] },
  cathedral: { sky: ['#0e0a14', '#6a1e2a'], items: [['pillar', 0, 0.15], ['cathedral', 0, 0.5], ['pillar', 0, 0.85]] },
};
export function eventArt(key, w = 320, h = 110) { return memo('ea' + key + w + h, () => eventArtRaw(key, w, h)); }
function eventArtRaw(key, w, h) {
  const a = ART[key] || ART.road;
  const [c, x] = canvas(w / 2, h / 2);
  const W = w / 2, H = h / 2;
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, a.sky[0]); g.addColorStop(1, a.sky[1]);
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // sole spezzato
  x.globalAlpha = 0.85; x.drawImage(decor('sunshard'), W * 0.62, 2, 22, 22); x.globalAlpha = 1;
  // colline lontane
  x.fillStyle = shade(a.sky[1], -0.45);
  for (let i = 0; i < W; i++) { const yy = H * 0.62 + Math.sin(i * 0.07) * 4 + Math.sin(i * 0.19) * 2; x.fillRect(i, yy, 1, H); }
  x.fillStyle = '#1a1418'; x.fillRect(0, H * 0.86, W, H);
  for (const [k, v, fx] of a.items) {
    const d = decor(k, v);
    const s = Math.min(1, (H * 0.8) / d.height);
    x.drawImage(d, Math.round(W * fx - (d.width * s) / 2), Math.round(H * 0.9 - d.height * s), Math.round(d.width * s), Math.round(d.height * s));
  }
  const [o, ox] = canvas(w, h);
  ox.imageSmoothingEnabled = false;
  ox.drawImage(c, 0, 0, w, h);
  return o.toDataURL();
}
