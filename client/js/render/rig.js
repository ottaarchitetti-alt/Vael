// Marionette in pixel art: i pezzi di rigparts.js montati su articolazioni e animati con pose calcolate.
// Usate in battaglia e sulla mappa (Rig, in 3D) e per ritratti/anteprime (drawRig2D, su tela).
import * as THREE from 'three';
import { rigDefForHero, rigDefForEnemy, OVERRIDES } from './rigparts.js';

export const RIG_PX = 0.027; // unità mondo per pixel di sprite
const LAYER = 0.03; // distanza in profondità tra i pezzi

// ---------- pose ----------
const ease = (k) => k * k * (3 - 2 * k);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const lerpA = (a, b, k) => a + wrap(b - a) * k; // interpolazione d'angolo sul percorso più breve

// posa a riposo di braccio e arma, per tipo d'arma (angoli: 0 = braccio giù, negativo = in avanti)
const HOLD = {
  spada: { armU: -0.25, armL: -0.9, weapon: -1.9 }, spadone: { armU: -0.2, armL: -0.8, weapon: -2.0 },
  pugnale: { armU: -0.3, armL: -1.0, weapon: -1.6 }, mazza: { armU: -0.25, armL: -0.9, weapon: -1.9 },
  bastone: { armU: -0.15, armL: -0.4, weapon: -2.6 }, lanterna: { armU: -0.2, armL: -0.5, weapon: 0.7 },
  arco: { armU: -0.2, armL: -0.3, weapon: 0.5 }, liuto: { armU: 0.25, armL: -1.3, weapon: -1.9 },
};
// attacchi a fotogrammi chiave (tempo 0..1); le chiavi mancanti restano in posa di riposo
const SLASH = [[0.32, { hips: -0.12, armU: 2.5, armL: 0.5, weapon: -0.4, legF: -0.25, legB: 0.15, head: -0.1 }], [0.52, { hips: 0.22, armU: 4.6, armL: 0.2, weapon: 0, legF: -0.5, legB: 0.35, head: 0.1, trail: 1 }], [0.68, { hips: 0.16, armU: 5.3, armL: 0.3, weapon: 0.2, legF: -0.45, legB: 0.3, trail: 1 }]];
const ATTACKS = {
  spada: SLASH, spadone: SLASH,
  mazza: [[0.36, { hips: -0.16, armU: 2.9, armL: 0.4, weapon: -0.3, head: -0.12, legF: -0.2 }], [0.55, { hips: 0.28, armU: 4.9, armL: 0.1, weapon: 0, legF: -0.55, legB: 0.4, trail: 1, dy: -2 }], [0.72, { hips: 0.22, armU: 5.2, armL: 0.2, weapon: 0.1, dy: -2 }]],
  pugnale: [[0.18, { hips: 0.14, armU: -1.3, armL: -0.2, weapon: 0, legF: -0.4, trail: 1 }], [0.34, { hips: 0.05, armU: -0.6, armL: -1.1, weapon: -0.6 }], [0.5, { hips: 0.18, armU: -1.45, armL: -0.1, weapon: 0, legF: -0.45, trail: 1 }], [0.66, { hips: 0.08, armU: -0.5, armL: -1, weapon: -0.8 }]],
  arco: [[0.3, { armU: -1.5, armL: 0, weapon: 1.5, armB: -1.35, tense: 1, hips: -0.05 }], [0.55, { armU: -1.5, armL: 0, weapon: 1.5, armB: -1.4, tense: 1, hips: -0.08 }], [0.62, { armU: -1.5, armL: 0, weapon: 1.5, armB: 0.6, hips: -0.12 }]],
  bastone: [[0.38, { armU: 3.0, armL: 0.1, weapon: 0.1, armB: 2.6, head: -0.15, glow: 1, dy: 2 }], [0.58, { armU: -1.4, armL: -0.1, weapon: -0.2, hips: 0.12, glow: 1 }]],
  lanterna: [[0.35, { armU: 2.2, armL: 0.2, weapon: 0.4, hips: -0.1 }], [0.55, { armU: -1.6, armL: -0.2, weapon: -0.3, hips: 0.15, glow: 1, trail: 1 }]],
  liuto: [[0.2, { armL: -0.6, glow: 1 }], [0.35, { armL: -1.4, glow: 1 }], [0.5, { armL: -0.6, glow: 1 }], [0.65, { armL: -1.4, glow: 1 }]],
};
const CAST = [[0.35, { armU: 3.0, armL: 0.2, armB: 2.8, head: -0.15, hips: -0.06, glow: 1, dy: 2 }], [0.75, { armU: 3.05, armL: 0.25, armB: 2.85, head: -0.15, glow: 1, dy: 2 }]];
const HURT = [[0.25, { hips: -0.28, head: 0.25, armU: 0.6, armB: 0.8, legF: 0.2, dx: 3 }]];

function keyframes(frames, base, k) {
  const keys = [[0, base], ...frames, [1, base]];
  let i = 0;
  while (i < keys.length - 2 && k > keys[i + 1][0]) i++;
  const [t0, a] = keys[i], [t1, b] = keys[i + 1];
  const w = ease(Math.min(1, Math.max(0, (k - t0) / (t1 - t0 || 1))));
  const out = {};
  for (const n of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const va = a[n] ?? base[n] ?? 0, vb = b[n] ?? base[n] ?? 0;
    out[n] = ['trail', 'tense', 'glow', 'dy', 'dx'].includes(n) ? va + (vb - va) * w : lerpA(va, vb, w);
  }
  if (b.trail && w > 0.1) out.trail = 1;
  if ((a.tense && w < 0.9) || (b.tense && w > 0.1)) out.tense = 1;
  return out;
}

// Restituisce la posa (angoli per pezzo + spostamenti in pixel) all'istante t dell'animazione
export function poseFor(def, anim, t, time, dur = 1) {
  const k = Math.min(1, t / dur);
  const ph = time;
  if (def.family === 'humanoid') {
    const hold = HOLD[def.weapon] || HOLD.spada;
    const base = {
      hips: 0, torso: Math.sin(ph * 2.2) * 0.02, head: Math.sin(ph * 1.7) * 0.04, armB: 0.06 + Math.sin(ph * 2.2) * 0.04,
      armU: hold.armU + Math.sin(ph * 2.2 + 0.5) * 0.04, armL: hold.armL, weapon: hold.weapon, legF: 0, legB: 0,
      cloak: 0.1 + Math.sin(ph * 1.9) * 0.06, tail: Math.sin(ph * 2.4) * 0.12, skirt: Math.sin(ph * 1.9) * 0.02, quiver: 0, wings: Math.sin(ph * 2) * 0.1,
      dy: Math.sin(ph * 2.2) > 0.6 ? 1 : 0,
    };
    switch (anim) {
      case 'walk': {
        const w = ph * 9;
        return { ...base, legF: Math.sin(w) * 0.55, legB: -Math.sin(w) * 0.55, armB: -Math.sin(w) * 0.4, armU: hold.armU + Math.sin(w) * 0.25, skirt: Math.sin(w) * 0.08, cloak: 0.35 + Math.sin(w) * 0.12, tail: 0.3 + Math.sin(w * 2) * 0.15, hips: 0.06, dy: Math.abs(Math.sin(w)) * 2 };
      }
      case 'attack': return { ...base, ...keyframes(ATTACKS[def.weapon] || SLASH, base, k) };
      case 'cast': return { ...base, ...keyframes(CAST, base, k) };
      case 'hurt': return { ...base, ...keyframes(HURT, base, k) };
      case 'guard': return { ...base, armU: -0.9, armL: -1.3, weapon: hold.weapon + 0.6, hips: 0.06, legF: -0.25, legB: 0.25, dy: -1 };
      case 'ko': return { ...base, hips: -0.3, head: 0.4, armU: 0.5, armL: 0.3, armB: 0.6, legF: -1.25, legB: 0.95, weapon: 1.2, dy: -9, cloak: 0.4, tail: 0.4 };
      case 'cheer': return { ...base, armU: 3.1 + Math.sin(ph * 8) * 0.2, armL: 0.1, weapon: 0.1, armB: 2.6, head: -0.15, dy: Math.abs(Math.sin(ph * 6)) * 4 };
      default: return base;
    }
  }
  if (def.family === 'beast') {
    const base = { body: Math.sin(ph * 2.6) * 0.02, head: Math.sin(ph * 1.6) * 0.05, tail: 0.15 + Math.sin(ph * 4) * 0.3, claw2: Math.sin(ph * 2) * 0.1, leg0: 0, leg1: 0, leg2: 0, leg3: 0, dy: Math.sin(ph * 2.6) > 0.5 ? 1 : 0 };
    if (anim === 'walk') { const w = ph * 12; return { ...base, leg0: Math.sin(w) * 0.6, leg3: Math.sin(w) * 0.6, leg1: -Math.sin(w) * 0.6, leg2: -Math.sin(w) * 0.6, dy: Math.abs(Math.sin(w)) * 2 }; }
    if (anim === 'attack') return { ...base, ...keyframes([[0.35, { body: -0.12, head: 0.35, leg0: 0.3, leg2: 0.3, tail: 0.7, claw2: 0.5, dy: 2 }], [0.55, { body: 0.18, head: -0.45, leg0: -0.6, leg2: -0.5, leg1: 0.4, tail: -0.4, claw2: -0.6 }]], base, k) };
    if (anim === 'cast') return { ...base, ...keyframes([[0.4, { head: 0.6, body: -0.1, tail: 0.6 }], [0.75, { head: 0.65, body: -0.1 }]], base, k) };
    if (anim === 'hurt') return { ...base, ...keyframes([[0.3, { body: -0.2, head: 0.35, tail: -0.5, dx: 3 }]], base, k) };
    return base;
  }
  if (def.family === 'flyer') {
    const f = def.ghost ? 1.6 : 7;
    const base = { body: Math.sin(ph * 1.4) * 0.05, head: Math.sin(ph * 1.8) * 0.06, wingF: (def.ghost ? -0.3 : 0.2) + Math.sin(ph * f) * (def.ghost ? 0.25 : 0.6), wingB: (def.ghost ? 0.2 : -0.1) - Math.sin(ph * f + 0.4) * (def.ghost ? 0.2 : 0.5), dy: 4 + Math.sin(ph * 2) * 3 };
    if (anim === 'attack') return { ...base, ...keyframes([[0.35, { body: -0.2, wingF: def.ghost ? 1.2 : 1.0, wingB: -1.0, dy: 8 }], [0.55, { body: 0.35, wingF: def.ghost ? -1.5 : -0.6, wingB: 0.6, dx: -6, dy: 2 }]], base, k) };
    if (anim === 'cast') return { ...base, ...keyframes([[0.4, { wingF: 1.3, wingB: -1.3, dy: 8 }], [0.75, { wingF: 1.35, wingB: -1.35, dy: 8 }]], base, k) };
    if (anim === 'hurt') return { ...base, ...keyframes([[0.3, { body: -0.3, dx: 4 }]], base, k) };
    return base;
  }
  // melma: deformazione elastica
  const base = { sx: 1 + Math.sin(ph * 2.4) * 0.06, sy: 1 - Math.sin(ph * 2.4) * 0.06 };
  if (anim === 'attack') return keyframes([[0.35, { sx: 1.25, sy: 0.75 }], [0.55, { sx: 0.8, sy: 1.3, dx: -6 }]], base, k);
  if (anim === 'hurt') return keyframes([[0.3, { sx: 1.3, sy: 0.7 }]], base, k);
  return base;
}
export const ANIM_DUR = { attack: 0.7, cast: 0.9, hurt: 0.45 };

// ---------- marionetta 3D ----------
const texCache = new WeakMap();
function texOf(c) {
  let t = texCache.get(c);
  if (!t) { t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace; texCache.set(c, t); }
  return t;
}
function partMesh(pd, px) {
  const tex = texOf(pd.canvas);
  const geo = new THREE.PlaneGeometry(pd.w * px, pd.h * px);
  geo.translate((pd.w / 2 - pd.pivot[0]) * px, (pd.pivot[1] - pd.h / 2) * px, 0);
  const mat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 1, metalness: 0, emissive: new THREE.Color('#000000'), polygonOffset: true, polygonOffsetFactor: -pd.z, polygonOffsetUnits: -pd.z });
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5 });
  return m;
}

export class Rig {
  constructor(def, { px = RIG_PX, blob = true } = {}) {
    this.def = def;
    this.px = px * (def.size || 1);
    this.group = new THREE.Group(); // posizione nel mondo e rotazione verso la camera
    this.mesh = new THREE.Group(); // effetti esterni: inclinazione, schiacciamento, specchiatura
    this.group.add(this.mesh);
    this.body = new THREE.Group(); // spostamenti della posa (salti, affondi)
    this.mesh.add(this.body);
    this.parts = {}; this.mats = []; this.meshes = []; this.ghosts = [];
    for (const pd of def.parts) {
      const parent = pd.parent ? this.parts[pd.parent] : null;
      const pg = new THREE.Group();
      pg.position.set(pd.at[0] * this.px, pd.at[1] * this.px, (pd.z - (parent ? parent.z : 0)) * LAYER);
      (parent ? parent.pg : this.body).add(pg);
      const e = { pg, z: pd.z };
      if (pd.canvas) { e.mesh = partMesh(pd, this.px); pg.add(e.mesh); this.mats.push(e.mesh.material); this.meshes.push(e.mesh); }
      this.parts[pd.name] = e;
    }
    if (def.alt?.weapon && this.parts.weapon) { this.weaponTex = [this.parts.weapon.mesh.material.map, texOf(def.alt.weapon.canvas)]; }
    this.h = def.height * this.px;
    if (blob) {
      const b = new THREE.Mesh(new THREE.CircleGeometry(0.34 * (def.size || 1), 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38, depthWrite: false }));
      b.rotation.x = -Math.PI / 2; b.position.y = 0.012;
      this.blob = b; this.group.add(b);
    }
    this.anim = 'idle'; this.animT = 0; this.time = Math.random() * 10;
    this.position = this.group.position; this.rotation = this.group.rotation;
  }
  play(name) { if (name !== this.anim || ANIM_DUR[name]) { this.anim = name; this.animT = 0; } }
  setAnim(name) { if (name !== this.anim) { this.anim = name; this.animT = 0; } } // per animazioni continue (camminata, guardia, ko)
  update(dt) {
    this.time += dt; this.animT += dt;
    const dur = ANIM_DUR[this.anim];
    if (dur && this.animT >= dur) { this.anim = 'idle'; this.animT = 0; }
    const pose = poseFor(this.def, this.anim, this.animT, this.time, dur || 1);
    for (const [n, e] of Object.entries(this.parts)) if (pose[n] != null) e.pg.rotation.z = pose[n];
    if (this.def.family === 'slime' && this.parts.body) this.parts.body.pg.scale.set(pose.sx || 1, pose.sy || 1, 1);
    this.body.position.set((pose.dx || 0) * this.px, (pose.dy || 0) * this.px, 0);
    if (this.weaponTex) { const m = this.parts.weapon.mesh.material; const want = this.weaponTex[pose.tense ? 1 : 0]; if (m.map !== want) { m.map = want; m.needsUpdate = true; } }
    this.glowK = pose.glow || 0;
    // scia dell'arma: copie sbiadite lasciate lungo il fendente
    if (pose.trail && this.parts.weapon?.mesh && this.group.parent) {
      this.group.updateMatrixWorld(true);
      const src = this.parts.weapon.mesh;
      const g = new THREE.Mesh(src.geometry, new THREE.MeshBasicMaterial({ map: src.material.map, alphaTest: 0.3, transparent: true, opacity: 0.55, depthWrite: false, color: '#fff0c8', side: THREE.DoubleSide }));
      g.matrixAutoUpdate = false; g.matrix.copy(src.matrixWorld);
      this.group.parent.add(g); this.ghosts.push(g);
    }
    for (const g of this.ghosts) { g.material.opacity -= dt * 3.2; if (g.material.opacity <= 0) { g.parent?.remove(g); g.material.dispose(); } }
    this.ghosts = this.ghosts.filter((g) => g.material.opacity > 0).slice(-10);
  }
  setEmissive(r, g, b) { for (const m of this.mats) m.emissive.setRGB(r, g, b); }
  setOpacity(o) { for (const m of this.mats) { m.transparent = o < 1; m.opacity = o; } }
  setUnitId(id) { for (const m of this.meshes) m.userData.unitId = id; }
  dispose() { for (const g of this.ghosts) g.parent?.remove(g); for (const m of this.meshes) { m.geometry.dispose(); m.material.dispose(); } }
}

// ---------- disegno 2D (ritratti, anteprime) ----------
export function drawRig2D(ctx, def, pose, scale, fx, fy) {
  ctx.imageSmoothingEnabled = false;
  const M = {};
  const list = [];
  for (const pd of def.parts) {
    const parent = pd.parent ? M[pd.parent] : new DOMMatrix().translate(fx, fy).scale(scale, scale).translate((pose.dx || 0), -(pose.dy || 0));
    const m = parent.translate(pd.at[0], -pd.at[1]).rotate(-(pose[pd.name] || 0) * 180 / Math.PI);
    M[pd.name] = m;
    if (pd.canvas) list.push([pd, m]);
  }
  list.sort((a, b) => a[0].z - b[0].z);
  for (const [pd, m] of list) {
    ctx.setTransform(m);
    let img = pd.canvas;
    if (pd.name === 'weapon' && pose.tense && def.alt?.weapon) img = def.alt.weapon.canvas;
    if (def.family === 'slime') ctx.setTransform(m.scale(pose.sx || 1, pose.sy || 1));
    ctx.drawImage(img, -pd.pivot[0], -pd.pivot[1]);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

// ---------- cache e funzioni per l'interfaccia ----------
const defCache = new Map();
export function heroKey(hero) { return JSON.stringify([hero.cls, hero.look, hero.transforms, hero.equip?.weapon?.base]); }
export function heroDef(hero) {
  const k = 'h' + heroKey(hero) + OVERRIDES.size;
  if (!defCache.has(k)) { if (defCache.size > 80) defCache.clear(); defCache.set(k, rigDefForHero(hero)); }
  return defCache.get(k);
}
export function enemyDef(id) {
  const k = 'e' + id + OVERRIDES.size;
  if (!defCache.has(k)) defCache.set(k, rigDefForEnemy(id));
  return defCache.get(k);
}
const urlCache = new Map();
function memo(k, fn) { if (!urlCache.has(k)) { if (urlCache.size > 300) urlCache.clear(); urlCache.set(k, fn()); } return urlCache.get(k); }
function render(def, pose, W, H, scale, fx, fy) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  drawRig2D(c.getContext('2d'), def, pose, scale, fx, fy);
  return c;
}
// ritratto: la testa dell'eroe, ingrandita
export function heroPortrait(hero, scale = 3) {
  return memo('hp' + scale + heroKey(hero), () => {
    const def = heroDef(hero);
    const hip = def.parts[0].at[1];
    const S = 22 * scale;
    return render(def, poseFor(def, 'idle', 0, 0), S, S, scale, S / 2 + 1 * scale, S + (hip + 18) * scale - 2 * scale).toDataURL();
  });
}
export function heroFull(hero, scale = 3) {
  return memo('hf' + scale + heroKey(hero), () => {
    const def = heroDef(hero);
    const W = 48 * scale, H = (def.height + 8) * scale;
    return render(def, poseFor(def, 'idle', 0, 0), W, H, scale, W / 2, H - 2 * scale).toDataURL();
  });
}
// striscia di fotogrammi per le anteprime animate via CSS
export function heroStrip(hero, anim, n = 8, scale = 4) {
  return memo(`hs${scale}${anim}${n}` + heroKey(hero), () => {
    const def = heroDef(hero);
    const fw = 48 * scale, fh = (def.height + 8) * scale;
    const c = document.createElement('canvas'); c.width = fw * n; c.height = fh;
    const ctx = c.getContext('2d');
    const dur = ANIM_DUR[anim] || 1;
    for (let i = 0; i < n; i++) {
      const t = (i / n) * dur;
      drawRig2D(ctx, def, poseFor(def, anim, t, t, dur), scale, i * fw + fw / 2, fh - 2 * scale);
    }
    return { url: c.toDataURL(), w: fw, h: fh, n, dur: anim === 'idle' ? 1.4 : anim === 'walk' ? 0.7 : dur * 1.6 };
  });
}
export function enemyPortrait(id) {
  return memo('ep' + id, () => {
    const def = enemyDef(id);
    const S = 48;
    const wide = { beast: 58, flyer: 52, slime: 36, humanoid: 30 }[def.family] || 40; // larghezza approssimativa per famiglia
    const sc = Math.min(1.4, (S - 4) / Math.max(def.height, wide));
    return render(def, poseFor(def, 'idle', 0, 0), S, S, sc, S / 2, S - 3).toDataURL();
  });
}

// ---------- sprite PNG opzionali ----------
// client/assets/sprites/manifest.json: { "hero/lama/head": "hero/lama/head.png", ... } (vedi LEGGIMI.md)
export async function loadSpriteOverrides() {
  try {
    const r = await fetch('/assets/sprites/manifest.json');
    if (!r.ok) return 0;
    const manifest = await r.json();
    await Promise.all(Object.entries(manifest).map(([key, file]) => new Promise((res) => {
      const img = new Image();
      img.onload = () => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').drawImage(img, 0, 0); OVERRIDES.set(key, c); res(); };
      img.onerror = () => res();
      img.src = '/assets/sprites/' + file;
    })));
    defCache.clear(); urlCache.clear();
    return OVERRIDES.size;
  } catch { return 0; }
}
