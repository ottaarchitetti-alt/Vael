// Oggetti 3D low-poly della mappa (stile HD-2D): case, alberi, rocce, fari, cristalli...
// Ogni oggetto è un'unica geometria fusa con colori per vertice e una grana pixelata, a facce piatte,
// più una parte luminosa separata (finestre, fiamme, cristalli). I personaggi restano sprite.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// grana pixelata condivisa: dà alle superfici l'aspetto «dipinto a pixel»
function grainTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 16;
  const x = c.getContext('2d'); const img = x.createImageData(16, 16);
  let s = 7;
  for (let i = 0; i < img.data.length; i += 4) {
    s = (s * 16807) % 2147483647;
    const v = 200 + (s % 56);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
let SOLID = null, GLOW = null;
function mats() {
  if (!SOLID) {
    SOLID = new THREE.MeshStandardMaterial({ vertexColors: true, map: grainTexture(), flatShading: true, roughness: 0.95, metalness: 0 });
    GLOW = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  }
}

// ---------- costruzione dei pezzi ----------
const col = new THREE.Color();
function part(geo, color, { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1] } = {}, jitter = 0.06, seed = 1) {
  let g = geo.index ? geo.toNonIndexed() : geo.clone();
  // tutte le parti devono avere gli stessi attributi per essere fuse
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s));
  g.applyMatrix4(m);
  // colore per vertice, con piccole variazioni per faccia (look a pixel, niente sfumature)
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  col.set(color); // three.js converte già l'esadecimale sRGB nello spazio lineare
  let q = seed * 9301 + 49297;
  for (let i = 0; i < n; i += 3) {
    q = (q * 9301 + 49297) % 233280;
    const k = 1 + ((q / 233280) - 0.5) * 2 * jitter;
    for (let j = 0; j < 3 && i + j < n; j++) { arr[(i + j) * 3] = col.r * k; arr[(i + j) * 3 + 1] = col.g * k; arr[(i + j) * 3 + 2] = col.b * k; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  if (!g.attributes.normal) g.computeVertexNormals();
  return g;
}
const cyl = (rt, rb, h, seg = 6) => { const g = new THREE.CylinderGeometry(rt, rb, h, seg); g.translate(0, h / 2, 0); return g; };
const cone = (r, h, seg = 6) => { const g = new THREE.ConeGeometry(r, h, seg); g.translate(0, h / 2, 0); return g; };
const box = (w, h, d) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, 0); return g; };
const ico = (r, d = 0) => new THREE.IcosahedronGeometry(r, d);
const dodeca = (r) => new THREE.DodecahedronGeometry(r, 0);
// tetto a due spioventi: triangolo largo w e alto h, estruso per la profondità d
const gable = (w, h, d) => {
  const sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(0, h); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false });
  g.translate(0, 0, -d / 2);
  return g;
};

const pick = (arr, v) => arr[v % arr.length];

// ---------- definizioni ----------
// ogni definizione restituisce { solid: [geometrie], glow: [geometrie], anim }
function define(kind, v) {
  const S = [], G = [];
  let anim = null;
  const add = (geo, color, t, jitter) => S.push(part(geo, color, t, jitter ?? 0.06, S.length + v * 7 + 1));
  const glow = (geo, color, t) => G.push(part(geo, color, t, 0, 1));
  switch (kind) {
    case 'pine': {
      const leaf = pick(['#2f4a2a', '#35512b', '#3f5e33'], v);
      add(cyl(0.05, 0.07, 0.3), '#5a4030');
      [[0.36, 0.42, 0.2], [0.28, 0.38, 0.45], [0.19, 0.34, 0.68]].forEach(([r, h, y], i) => add(cone(r, h, 7), i ? leaf : '#2a4226', { p: [0, y, 0] }, 0.1));
      break;
    }
    case 'oak': {
      const leaf = pick(['#4a6b3a', '#57774a', '#3f5e33'], v);
      add(cyl(0.06, 0.09, 0.42), '#5a4030');
      add(ico(0.3), leaf, { p: [0, 0.62, 0], s: [1, 0.85, 1] }, 0.12);
      add(ico(0.22), leaf, { p: [0.2, 0.5, 0.08] }, 0.12);
      add(ico(0.2), leaf, { p: [-0.18, 0.52, -0.1] }, 0.12);
      break;
    }
    case 'deadtree': {
      add(cyl(0.03, 0.08, 0.7, 5), '#4a3e36');
      add(cyl(0.015, 0.03, 0.3, 4), '#4a3e36', { p: [0, 0.45, 0], r: [0, 0, 0.9] });
      add(cyl(0.015, 0.03, 0.26, 4), '#4a3e36', { p: [0, 0.35, 0], r: [0.3, 0, -0.8] });
      add(cyl(0.01, 0.02, 0.18, 4), '#3e342e', { p: [0.1, 0.55, 0], r: [0, 0, -0.5] });
      break;
    }
    case 'bush': {
      const c = pick(['#4a6a3a', '#5a7a44', '#3a5a32'], v);
      add(ico(0.16), c, { p: [0, 0.1, 0], s: [1.2, 0.8, 1] }, 0.12);
      add(ico(0.11), c, { p: [0.14, 0.07, 0.05] }, 0.12);
      break;
    }
    case 'rock': {
      add(dodeca(0.2), pick(['#7a7680', '#6e6a74', '#86828c'], v), { p: [0, 0.08, 0], s: [1.2, 0.6, 1], r: [0.3, v, 0.2] }, 0.1);
      if (v % 2) add(dodeca(0.1), '#6a6670', { p: [0.2, 0.04, 0.08], s: [1, 0.7, 1] });
      break;
    }
    case 'peak': {
      add(cone(0.75, 1.3, 5), pick(['#7a7a80', '#6e6e76', '#84848a'], v), { r: [0, v * 0.7, 0] }, 0.12);
      add(cone(0.28, 0.5, 5), '#e8e8f0', { p: [0, 0.82, 0], r: [0, v * 0.7, 0] }, 0.04);
      add(cone(0.4, 0.7, 5), '#6a6a72', { p: [0.45, 0, 0.2], r: [0, v, 0] }, 0.12);
      break;
    }
    case 'reed': {
      for (let i = 0; i < 4; i++) {
        const a = i * 1.7 + v, rr = 0.06 + i * 0.03;
        add(cyl(0.008, 0.012, 0.32 + (i % 2) * 0.1, 4), '#6a7a4a', { p: [Math.cos(a) * rr, 0, Math.sin(a) * rr], r: [0.08 * i, 0, 0.1] });
        add(cyl(0.022, 0.022, 0.07, 5), '#7a5a3a', { p: [Math.cos(a) * rr, 0.3 + (i % 2) * 0.1, Math.sin(a) * rr] });
      }
      break;
    }
    case 'pillar': {
      const h = v === 1 ? 0.45 : 0.85;
      add(box(0.3, 0.08, 0.3), '#8a8070');
      add(cyl(0.1, 0.11, h, 8), '#a09684', { p: [0, 0.08, 0] });
      if (v !== 1) add(box(0.28, 0.07, 0.28), '#8a8070', { p: [0, 0.08 + h, 0] });
      else add(dodeca(0.08), '#a09684', { p: [0.2, 0.05, 0.1] });
      break;
    }
    case 'flower': {
      for (let i = 0; i < 3; i++) {
        const a = i * 2.1 + v;
        add(cyl(0.006, 0.006, 0.12, 3), '#4a6a3a', { p: [Math.cos(a) * 0.06, 0, Math.sin(a) * 0.06] });
        add(ico(0.03), pick(['#e8c84a', '#d86a8a', '#9a8aff'], v + i), { p: [Math.cos(a) * 0.06, 0.13, Math.sin(a) * 0.06] }, 0);
      }
      break;
    }
    case 'house': {
      const wall = pick(['#c8b89a', '#b8a888', '#d0c0a0'], v), roof = pick(['#8a3a2a', '#5a4a6a', '#6a4a2a'], v);
      add(box(0.5, 0.36, 0.42), wall, {}, 0.04);
      add(box(0.54, 0.05, 0.46), '#5a4030');
      add(gable(0.62, 0.3, 0.52), roof, { p: [0, 0.36, 0] }, 0.08);
      add(box(0.08, 0.2, 0.08), '#6a5a50', { p: [0.14, 0.42, -0.1] });
      add(box(0.11, 0.18, 0.02), '#3a2a20', { p: [0, 0, 0.215] });
      glow(box(0.08, 0.07, 0.02), '#ffcf7a', { p: [-0.15, 0.17, 0.215] });
      glow(box(0.02, 0.07, 0.08), '#ffcf7a', { p: [0.255, 0.17, 0] });
      break;
    }
    case 'fire': {
      add(cyl(0.025, 0.025, 0.3, 5), '#5a4030', { p: [0, 0.03, 0], r: [0, 0.4, Math.PI / 2] });
      add(cyl(0.025, 0.025, 0.3, 5), '#4a3424', { p: [0, 0.03, 0], r: [0, -0.9, Math.PI / 2] });
      for (let i = 0; i < 5; i++) add(dodeca(0.04), '#6a6670', { p: [Math.cos(i * 1.26) * 0.16, 0.02, Math.sin(i * 1.26) * 0.16] });
      glow(cone(0.09, 0.26, 5), '#ff8a3a', { p: [0, 0.03, 0] });
      glow(cone(0.05, 0.18, 5), '#ffe08a', { p: [0.02, 0.05, 0.01] });
      anim = 'flicker';
      break;
    }
    case 'tent': {
      add(cone(0.36, 0.5, 4), '#b8a070', { r: [0, Math.PI / 4, 0] }, 0.05);
      add(box(0.12, 0.2, 0.02), '#2a1e18', { p: [0, 0, 0.21], r: [-0.4, 0, 0] });
      add(cyl(0.012, 0.012, 0.6, 4), '#5a4030');
      break;
    }
    case 'cart': {
      add(box(0.5, 0.14, 0.3), '#7a5a3a', { p: [0, 0.14, 0] });
      add(cyl(0.15, 0.15, 0.48, 8), '#d8cfb0', { p: [0.24, 0.28, 0], r: [0, 0, Math.PI / 2] }, 0.04);
      for (const x of [-0.16, 0.16]) for (const z of [-0.17, 0.17]) add(cyl(0.1, 0.1, 0.03, 8), '#4a3a2a', { p: [x, 0.1, z], r: [Math.PI / 2, 0, 0] });
      add(box(0.3, 0.02, 0.03), '#5a4030', { p: [-0.38, 0.16, 0] });
      break;
    }
    case 'lantern': {
      add(cyl(0.02, 0.025, 0.6, 5), '#3a3036');
      add(box(0.14, 0.02, 0.02), '#3a3036', { p: [0.05, 0.58, 0] });
      glow(box(0.08, 0.1, 0.08), '#ffd27a', { p: [0.1, 0.45, 0] });
      break;
    }
    case 'beacon': case 'beaconLit': {
      add(cyl(0.16, 0.24, 0.95, 6), '#8a8890', {}, 0.08);
      add(cyl(0.24, 0.24, 0.06, 6), '#5a5058', { p: [0, 0.95, 0] });
      for (let i = 0; i < 4; i++) add(box(0.04, 0.22, 0.04), '#5a5058', { p: [Math.cos(i * Math.PI / 2 + 0.4) * 0.17, 1.01, Math.sin(i * Math.PI / 2 + 0.4) * 0.17] });
      add(cone(0.26, 0.2, 6), '#3a3036', { p: [0, 1.23, 0] });
      add(box(0.06, 0.12, 0.02), '#2a2228', { p: [0, 0, 0.2] });
      if (kind === 'beaconLit') { glow(ico(0.11, 1), '#ffe08a', { p: [0, 1.12, 0] }); anim = 'flicker'; }
      else add(ico(0.1, 0), '#4a4248', { p: [0, 1.12, 0] });
      break;
    }
    case 'crystal': {
      add(dodeca(0.22), '#5a5660', { p: [0, 0.06, 0], s: [1.3, 0.5, 1.3] }, 0.1);
      const oct = new THREE.OctahedronGeometry(0.2, 0);
      glow(oct, '#8fe3ff', { p: [0, 0.62, 0], s: [1, 2.1, 1] });
      glow(oct, '#5ab8e8', { p: [0.2, 0.3, 0.08], s: [0.5, 1, 0.5], r: [0, 0, -0.4] });
      glow(oct, '#5ab8e8', { p: [-0.18, 0.26, -0.05], s: [0.45, 0.9, 0.45], r: [0, 0, 0.5] });
      anim = 'shimmer';
      break;
    }
    case 'shrine': {
      add(box(0.6, 0.06, 0.5), '#7a7680');
      add(box(0.46, 0.06, 0.38), '#8a8690', { p: [0, 0.06, 0] });
      add(box(0.16, 0.36, 0.12), '#9a96a0', { p: [0, 0.12, -0.05] });
      add(ico(0.08), '#b8b4c0', { p: [0, 0.56, -0.05] }, 0.04);
      for (const x of [-0.22, 0.22]) { add(cyl(0.025, 0.025, 0.08, 5), '#e8e0c8', { p: [x, 0.12, 0.12] }); glow(cone(0.02, 0.05, 4), '#fff2b0', { p: [x, 0.2, 0.12] }); }
      anim = 'flicker';
      break;
    }
    case 'cave': {
      add(dodeca(0.48), '#6a6460', { s: [1.15, 0.8, 1] }, 0.1);
      add(dodeca(0.25), '#5e5854', { p: [0.36, 0, -0.18], s: [1, 0.8, 1] }, 0.1);
      add(cyl(0.18, 0.2, 0.05, 8), '#140e12', { p: [0, 0.16, 0.42], r: [Math.PI / 2 - 0.25, 0, 0], s: [1.1, 1, 1.5] }, 0);
      break;
    }
    case 'bones': {
      add(cyl(0.012, 0.012, 0.18, 4), '#e8e0c8', { p: [0, 0.015, 0], r: [0, 0.5, Math.PI / 2] });
      add(cyl(0.012, 0.012, 0.14, 4), '#d8d0b8', { p: [0.03, 0.015, 0.05], r: [0, -0.7, Math.PI / 2] });
      add(ico(0.04), '#e8e0c8', { p: [-0.08, 0.035, 0.02] });
      break;
    }
    case 'tower': {
      add(cyl(0.3, 0.38, 1.4, 8), '#4a4652', {}, 0.08);
      add(cyl(0.38, 0.38, 0.1, 8), '#3a3642', { p: [0, 1.4, 0] });
      for (let i = 0; i < 8; i++) add(box(0.09, 0.12, 0.09), '#3a3642', { p: [Math.cos(i * Math.PI / 4) * 0.33, 1.5, Math.sin(i * Math.PI / 4) * 0.33] });
      add(cone(0.3, 0.55, 8), '#2a2630', { p: [0, 1.5, 0] });
      for (const y of [0.45, 0.85, 1.2]) glow(box(0.06, 0.1, 0.02), '#7dff9a', { p: [0, y, 0.37] });
      break;
    }
    case 'castle': {
      add(box(0.6, 0.8, 0.5), '#5a5a66', {}, 0.06);
      for (const [x, z] of [[-0.34, -0.28], [0.34, -0.28], [-0.34, 0.28], [0.34, 0.28]]) {
        add(cyl(0.13, 0.15, 1.0, 8), '#4e4e5a', { p: [x, 0, z] });
        add(cone(0.17, 0.35, 8), '#3a2a4a', { p: [x, 1.0, z] });
      }
      add(gable(0.64, 0.3, 0.52), '#3a2a4a', { p: [0, 0.8, 0] });
      add(box(0.16, 0.26, 0.02), '#1a1418', { p: [0, 0, 0.255] });
      for (const x of [-0.15, 0.15]) glow(box(0.06, 0.09, 0.02), '#b58bff', { p: [x, 0.5, 0.255] });
      break;
    }
    case 'cathedral': {
      add(box(0.5, 0.7, 0.8), '#6a6070', { p: [0, 0, 0.05] }, 0.06);
      add(gable(0.56, 0.38, 0.84), '#2a1a24', { p: [0, 0.7, 0.05] });
      add(box(0.3, 1.3, 0.3), '#5e5464', { p: [0, 0, -0.45] });
      add(cone(0.22, 0.7, 4), '#2a1a24', { p: [0, 1.3, -0.45], r: [0, Math.PI / 4, 0] });
      glow(cyl(0.11, 0.11, 0.02, 10), '#ff5c7a', { p: [0, 0.45, 0.455], r: [Math.PI / 2, 0, 0] });
      for (const x of [-0.26, 0.26]) glow(box(0.02, 0.22, 0.08), '#ff8aa0', { p: [x, 0.25, 0.1] });
      break;
    }
    case 'sign': {
      add(cyl(0.02, 0.025, 0.42, 5), '#5a4030');
      add(box(0.3, 0.14, 0.03), '#a0784a', { p: [0, 0.3, 0.02], r: [0, 0, 0.06] }, 0.08);
      add(box(0.2, 0.015, 0.035), '#4a3424', { p: [0, 0.38, 0.02] });
      break;
    }
    default:
      add(dodeca(0.15), '#7a7680', { p: [0, 0.08, 0] });
  }
  return { solid: S, glow: G, anim };
}

const PROP_SCALE = 2; // le misure qui sopra sono in mezze unità: così gli oggetti hanno la taglia dei vecchi sprite
const cache = new Map();
// Restituisce un nuovo gruppo 3D per il tipo e la variante richiesti (le geometrie sono condivise)
export function prop(kind, v = 0) {
  mats();
  const key = `${kind}:${v}`;
  let e = cache.get(key);
  if (!e) {
    const d = define(kind, v);
    e = { solid: d.solid.length ? mergeGeometries(d.solid) : null, glow: d.glow.length ? mergeGeometries(d.glow) : null, anim: d.anim };
    e.solid?.scale(PROP_SCALE, PROP_SCALE, PROP_SCALE);
    e.glow?.scale(PROP_SCALE, PROP_SCALE, PROP_SCALE);
    cache.set(key, e);
  }
  const g = new THREE.Group();
  if (e.solid) { const m = new THREE.Mesh(e.solid, SOLID); m.castShadow = true; m.receiveShadow = true; g.add(m); }
  if (e.glow) { const m = new THREE.Mesh(e.glow, GLOW); g.add(m); g.userData.glow = m; }
  g.userData.anim = e.anim;
  g.userData.seed = Math.random() * 10;
  return g;
}

// Piccole animazioni: fiamme che tremolano, cristalli che pulsano
export function animateProp(g, t) {
  const gm = g.userData.glow;
  if (!gm) return;
  const k = g.userData.seed;
  if (g.userData.anim === 'flicker') gm.scale.set(1, 1 + Math.sin(t * 13 + k) * 0.12 + Math.sin(t * 7.3 + k) * 0.08, 1);
  else if (g.userData.anim === 'shimmer') { gm.position.y = Math.sin(t * 1.6 + k) * 0.04; gm.rotation.y = t * 0.4 + k; }
}
