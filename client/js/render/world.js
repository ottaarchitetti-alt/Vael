// Diorama esagonale HD-2D della mappa di viaggio
import { THREE, PixelSprite, texFromCanvas } from './engine.js';
import { tileTexture, sideTexture, decor, poiIcon, heroSheet, HERO_W, HERO_H, glowTexture } from './pixel.js';
import { BIOMES, ACTS } from '/shared/data/mythic.js';
import { hkey, neighbors } from '/shared/rules.js';

const SQ3 = Math.sqrt(3);
const PX = 0.046; // dimensione di un pixel in unità mondo
export const tileTop = (t) => (t.rev ? 0.08 + t.h * 0.5 : 0.04);
export const hexPos = (q, r) => new THREE.Vector3(SQ3 * (q + r / 2), 0, 1.5 * r);

const DETAIL = { prato: 'grass', bosco: 'grass', colline: 'grass', palude: 'water', acqua: 'water', monti: 'stone', rovine: 'stone', cenere: 'stone', bosco_morto: 'stone' };

// cache materiali e geometrie condivise
const staticCache = new Map();
function staticSprite(c, px = PX, opts = {}) {
  let e = staticCache.get(c);
  if (!e) {
    const tex = texFromCanvas(c);
    const w = c.width * px, h = c.height * px;
    const geo = new THREE.PlaneGeometry(w, h); geo.translate(0, h / 2, 0);
    const mat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 1 });
    if (opts.glow) { mat.emissiveMap = tex; mat.emissive = new THREE.Color('#ffffff'); mat.emissiveIntensity = opts.glow; }
    const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5 });
    e = { geo, mat, depth };
    staticCache.set(c, e);
  }
  const m = new THREE.Mesh(e.geo, e.mat);
  m.customDepthMaterial = e.depth;
  m.castShadow = opts.shadow !== false;
  return m;
}

export class WorldView {
  constructor(engine) {
    this.engine = engine;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.5, 200);
    this.tilt = { focus: 0.5, band: 0.13, amount: 3.0 };
    this.target = new THREE.Vector3();
    this.camTarget = new THREE.Vector3();
    this.dist = 19;
    this.tiles = new Map(); // key -> {group, mesh, decor[], poi}
    this.mapId = null;
    this.mapV = -1;
    this.partySprites = [];
    this.lights = [];
    this.lightSources = [];
    this.onTileClick = null;
    this.onHover = null;
    this.reach = new Set();
    this.setupScene();
    this.setupInput();
  }

  setupScene() {
    const s = this.scene;
    this.hemi = new THREE.HemisphereLight('#b8b0e0', '#4a3a30', 1.5);
    s.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#ffd8b0', 2.0);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera; sc.left = -16; sc.right = 16; sc.top = 16; sc.bottom = -16; sc.near = 1; sc.far = 80;
    this.sun.shadow.bias = -0.0008;
    this.sun.shadow.normalBias = 0.02;
    s.add(this.sun); s.add(this.sun.target);
    s.add(new THREE.AmbientLight('#4a3a5a', 0.6));
    // pool di luci puntiformi (lanterne, fuochi, fari)
    for (let i = 0; i < 8; i++) { const l = new THREE.PointLight('#ffb547', 0, 7, 1.6); s.add(l); this.lights.push(l); }
    // mare di nebbia sotto il diorama
    const mist = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshBasicMaterial({ color: '#1a1424' }));
    mist.rotation.x = -Math.PI / 2; mist.position.y = -0.7;
    s.add(mist); this.mist = mist;
    // particelle: cenere che cade
    const N = 500;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 40; pos[i * 3 + 1] = Math.random() * 12; pos[i * 3 + 2] = (Math.random() - 0.5) * 30; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.ash = new THREE.Points(g, new THREE.PointsMaterial({ color: '#c8b8c8', size: 0.07, transparent: true, opacity: 0.7, depthWrite: false }));
    s.add(this.ash);
    // lucciole
    const F = 70, fp = new Float32Array(F * 3);
    for (let i = 0; i < F; i++) { fp[i * 3] = (Math.random() - 0.5) * 30; fp[i * 3 + 1] = 0.5 + Math.random() * 2; fp[i * 3 + 2] = (Math.random() - 0.5) * 22; }
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(fp, 3));
    this.flies = new THREE.Points(fg, new THREE.PointsMaterial({ map: texFromCanvas(glowTexture('#ffe89a')), color: '#ffe89a', size: 0.35, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.add(this.flies);
    this.flyPhase = Array.from({ length: F }, () => Math.random() * 10);
    // evidenziazione esagoni
    const ringGeo = new THREE.RingGeometry(0.82, 0.98, 6); ringGeo.rotateX(-Math.PI / 2); ringGeo.rotateY(Math.PI / 6);
    this.hoverRing = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: '#ffe8a0', transparent: true, opacity: 0.9, depthWrite: false }));
    this.hoverRing.visible = false; s.add(this.hoverRing);
    const hexGeo = new THREE.CircleGeometry(0.9, 6); hexGeo.rotateX(-Math.PI / 2); hexGeo.rotateY(Math.PI / 6);
    this.reachMesh = new THREE.InstancedMesh(hexGeo, new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.16, depthWrite: false }), 200);
    this.reachMesh.count = 0; s.add(this.reachMesh);
    const dotGeo = new THREE.SphereGeometry(0.09, 8, 6);
    this.pathMesh = new THREE.InstancedMesh(dotGeo, new THREE.MeshBasicMaterial({ color: '#fff2b0' }), 12);
    this.pathMesh.count = 0; s.add(this.pathMesh);
  }

  setupInput() {
    const el = this.engine.renderer.domElement;
    let down = null, moved = false;
    this.ray = new THREE.Raycaster();
    el.addEventListener('pointerdown', (e) => { if (!this.active) return; down = { x: e.clientX, y: e.clientY, t: this.camTarget.clone() }; moved = false; });
    window.addEventListener('pointerup', (e) => {
      if (!this.active || !down) return;
      if (!moved) { const t = this.pick(e.clientX, e.clientY); if (t) this.onTileClick?.(t); }
      down = null;
    });
    el.addEventListener('pointermove', (e) => {
      if (!this.active) return;
      if (down) {
        const dx = e.clientX - down.x, dy = e.clientY - down.y;
        if (Math.abs(dx) + Math.abs(dy) > 5) moved = true;
        if (moved) { const k = this.dist / 700; this.camTarget.set(down.t.x - dx * k, 0, down.t.z - dy * k * 1.4); this.follow = false; }
      }
      const t = this.pick(e.clientX, e.clientY);
      this.hover = t;
      this.onHover?.(t, e.clientX, e.clientY);
    });
    el.addEventListener('wheel', (e) => { if (!this.active) return; this.dist = Math.max(8, Math.min(26, this.dist + Math.sign(e.deltaY) * 1.2)); }, { passive: true });
    window.addEventListener('keydown', (e) => {
      if (!this.active || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const k = 1.2;
      if (e.key === 'ArrowLeft' || e.key === 'a') { this.camTarget.x -= k; this.follow = false; }
      if (e.key === 'ArrowRight' || e.key === 'd') { this.camTarget.x += k; this.follow = false; }
      if (e.key === 'ArrowUp' || e.key === 'w') { this.camTarget.z -= k; this.follow = false; }
      if (e.key === 'ArrowDown' || e.key === 's') { this.camTarget.z += k; this.follow = false; }
      if (e.key === ' ' || e.key === 'c') this.follow = true;
    });
  }

  pick(cx, cy) {
    if (!this.tileMeshes) return null;
    const v = new THREE.Vector2((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1);
    this.ray.setFromCamera(v, this.camera);
    const hit = this.ray.intersectObjects(this.tileMeshes, false)[0];
    return hit ? hit.object.userData.tile : null;
  }

  // ------------- costruzione mappa -------------
  build(state) {
    const map = state.map;
    for (const e of this.tiles.values()) this.scene.remove(e.group);
    this.tiles.clear();
    this.tileMeshes = [];
    this.lightSources = [];
    const act = ACTS[state.act];
    this.scene.fog = new THREE.FogExp2(act.fog, 0.03);
    this.scene.background = new THREE.Color(act.fog).multiplyScalar(0.6);
    this.mist.material.color.set(act.fog).multiplyScalar(0.5);
    this.sun.color.set(act.sky[2]).lerp(new THREE.Color('#ffffff'), 0.6);
    this.hemi.color.set(act.sky[1]).lerp(new THREE.Color('#d8d0f0'), 0.65);
    // centro
    let cx = 0, cz = 0, n = 0;
    for (const t of Object.values(map.tiles)) { const p = hexPos(t.q, t.r); cx += p.x; cz += p.z; n++; }
    this.center = new THREE.Vector3(cx / n, 0, cz / n);
    this.geo = this.geo || (() => { const g = new THREE.CylinderGeometry(0.985, 1.0, 1, 6, 1); g.translate(0, 0.5, 0); return g; })();
    for (const t of Object.values(map.tiles)) this.buildTile(t, state);
    this.mapId = `${state.seed}:${state.act}`;
    this.mapV = map.v;
    this.follow = true;
  }

  topMat(t, corrupted, revealed) {
    const key = `${t.b}:${t.dec % 3}:${corrupted}:${revealed}`;
    this._mats ||= new Map();
    if (this._mats.has(key)) return this._mats.get(key);
    const bd = BIOMES[t.b];
    let m;
    if (!revealed) m = new THREE.MeshStandardMaterial({ color: '#5a5272', roughness: 1, emissive: new THREE.Color('#1a1428'), emissiveIntensity: 1 });
    else {
      const tex = texFromCanvas(tileTexture(bd.top, (t.dec % 3) + 1, DETAIL[t.b]));
      m = new THREE.MeshStandardMaterial({ map: tex, roughness: bd.water ? 0.35 : 1, metalness: 0 });
      if (corrupted) { m.color.set('#a08aa8'); m.emissive = new THREE.Color('#3a1a4a'); m.emissiveIntensity = 0.5; }
      if (bd.water) { m.emissive = new THREE.Color('#1a3a5a'); m.emissiveIntensity = 0.4; m.userData.water = true; }
    }
    this._mats.set(key, m);
    return m;
  }
  sideMat(t, revealed) {
    const key = `side:${t.b}:${revealed}`;
    this._mats ||= new Map();
    if (this._mats.has(key)) return this._mats.get(key);
    const bd = BIOMES[t.b];
    const tex = texFromCanvas(sideTexture(revealed ? bd.side : '#1e1828'));
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(3, 1);
    const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 1 });
    this._mats.set(key, m);
    return m;
  }

  buildTile(t, state) {
    const group = new THREE.Group();
    const p = hexPos(t.q, t.r);
    group.position.copy(p);
    const mesh = new THREE.Mesh(this.geo, [this.sideMat(t, t.rev), this.topMat(t, t.cor, t.rev), this.sideMat(t, t.rev)]);
    mesh.receiveShadow = true; mesh.castShadow = true;
    mesh.userData.tile = t;
    group.add(mesh);
    this.tileMeshes.push(mesh);
    const entry = { group, mesh, t, decor: new THREE.Group(), poiGroup: new THREE.Group(), icon: null, rev: null, cor: null, poiState: null };
    group.add(entry.decor); group.add(entry.poiGroup);
    // decorazioni del bioma
    const bd = BIOMES[t.b];
    let s = t.dec;
    const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const count = bd.decor.length ? Math.floor(rnd() * 3 * bd.decorRate + (bd.decorRate > 0.8 ? 1 : 0)) : 0;
    for (let i = 0; i < count; i++) {
      const kind = bd.decor[Math.floor(rnd() * bd.decor.length)];
      const m = staticSprite(decor(kind, Math.floor(rnd() * 3)));
      const a = rnd() * Math.PI * 2, rr = (t.poi ? 0.55 : 0.2) + rnd() * 0.35;
      m.position.set(Math.cos(a) * rr, 0, Math.sin(a) * rr);
      const sc = 0.8 + rnd() * 0.45; m.scale.setScalar(kind === 'peak' ? 1.4 : sc);
      entry.decor.add(m);
    }
    if (bd.decor.includes('pine') || bd.decor.includes('reed')) {
      const f = staticSprite(decor('flower', Math.floor(rnd() * 3)), PX, { shadow: false });
      f.position.set((rnd() - 0.5) * 1.2, 0, (rnd() - 0.5) * 1.2); entry.decor.add(f);
    }
    this.tiles.set(hkey(t.q, t.r), entry);
    this.scene.add(group);
    this.updateTile(entry, t, state);
  }

  buildPoi(entry, t, state) {
    const g = entry.poiGroup;
    while (g.children.length) g.remove(g.children[0]);
    entry.icon = null;
    entry.light = null;
    const poi = t.poi;
    if (!poi || !t.rev) return;
    const add = (kind, v, x, z, sc = 1, glow) => { const m = staticSprite(decor(kind, v), PX, glow ? { glow } : {}); m.position.set(x, 0, z); m.scale.setScalar(sc); g.add(m); return m; };
    switch (poi.t) {
      case 'town': add('house', 0, -0.55, -0.45, 0.85); add('house', 1, 0.5, -0.5, 0.8); add('house', 2, 0.62, 0.3, 0.7); add('fire', 0, -0.6, 0.35, 0.7, 0.6); entry.light = { color: '#ffb547', i: 3 }; break;
      case 'merchant': add('cart', 0, 0, 0); add('lantern', 0, 0.55, 0.1, 1, 0.9); entry.light = { color: '#ffd27a', i: 3 }; break;
      case 'camp': add('tent', 0, -0.4, -0.4); add('fire', 0, 0.45, 0.35, 0.9, 0.8); entry.light = { color: '#ff8a3a', i: 3, flicker: true }; break;
      case 'beacon': add(poi.lit ? 'beaconLit' : 'beacon', 0, 0, 0, 1.1, poi.lit ? 0.6 : 0); if (poi.lit) entry.light = { color: '#ffd27a', i: 5 }; break;
      case 'crystal': add('crystal', 0, 0, 0, 1.1, 0.7); entry.light = { color: '#7fd4ff', i: 4 }; break;
      case 'shrine': add('shrine', 0, 0, 0, 1, 0.4); entry.light = { color: '#fff2b0', i: 2.5 }; break;
      case 'den': add('cave', 0, 0, 0, 1.1); add('bones', 0, 0.45, 0.35); break;
      case 'boss': add(state.act === 3 ? 'cathedral' : state.act === 2 ? 'castle' : 'tower', 0, 0, -0.1, state.act === 3 ? 1.1 : 1.2); entry.light = { color: state.act === 3 ? '#ff5c7a' : '#7dff9a', i: 4 }; break;
      case 'story': add('sign', 0, 0.3, 0.2); break;
      case 'event': if (!poi.done) add('sign', 0, 0.35, 0.25, 0.8); break;
    }
    if (!poi.done || ['town', 'merchant', 'camp', 'boss'].includes(poi.t)) {
      const sm = new THREE.SpriteMaterial({ map: texFromCanvas(poiIcon(poi.t)), depthTest: false, transparent: true });
      const icon = new THREE.Sprite(sm);
      icon.scale.set(0.55, 0.55, 1);
      icon.position.set(0, 2.2, 0);
      icon.renderOrder = 10;
      g.add(icon);
      entry.icon = icon;
      if (poi.done) sm.opacity = 0.5;
    }
    if (entry.light) this.lightSources.push({ entry, ...entry.light });
  }

  updateTile(entry, t, state) {
    const top = tileTop(t);
    entry.mesh.scale.y = top + 0.6;
    entry.mesh.position.y = -0.6;
    entry.decor.position.y = top; entry.poiGroup.position.y = top;
    entry.decor.visible = t.rev;
    const bd = BIOMES[t.b];
    if (entry.rev !== t.rev || entry.cor !== t.cor) {
      entry.mesh.material = [this.sideMat(t, t.rev), this.topMat(t, t.cor, t.rev), this.sideMat(t, t.rev)];
      entry.rev = t.rev; entry.cor = t.cor;
      entry.decor.traverse((o) => { if (o.material) o.material = o.material; });
    }
    const ps = JSON.stringify([t.poi, t.rev]);
    if (entry.poiState !== ps) {
      this.lightSources = this.lightSources.filter((l) => l.entry !== entry);
      this.buildPoi(entry, t, state);
      entry.poiState = ps;
    }
    entry.t = t; entry.mesh.userData.tile = t;
    if (bd.water) entry.mesh.position.y = -0.62;
  }

  sync(state, myReach) {
    const map = state.map;
    if (!map) return;
    const id = `${state.seed}:${state.act}`;
    if (id !== this.mapId) this.build(state);
    else if (map.v !== this.mapV) {
      for (const t of Object.values(map.tiles)) { const e = this.tiles.get(hkey(t.q, t.r)); if (e) this.updateTile(e, t, state); }
      this.mapV = map.v;
    } else {
      // le POI possono cambiare senza map.v (done, lit)
      for (const t of Object.values(map.tiles)) if (t.poi) { const e = this.tiles.get(hkey(t.q, t.r)); if (e) this.updateTile(e, t, state); }
    }
    this.syncParty(state);
    this.state = state;
    this.setReach(myReach || new Set());
  }

  syncParty(state) {
    const heroes = state.heroes.filter((h) => h.alive);
    const key = heroes.map((h) => JSON.stringify([h.id, h.cls, h.look, h.transforms, h.equip?.weapon?.base])).join('|');
    if (key !== this.partyKey) {
      for (const sp of this.partySprites) { this.scene.remove(sp); sp.dispose(); }
      this.partySprites = heroes.map((h, i) => {
        const sp = new PixelSprite(heroSheet(h), HERO_W, HERO_H, 4, PX * 1.05, { shadow: true });
        sp.userData.offset = new THREE.Vector3([-0.28, 0.25, -0.05, 0.42][i] || 0, 0, [0.1, 0.25, -0.25, -0.1][i] || 0);
        sp.userData.phase = i * 0.7;
        this.scene.add(sp);
        return sp;
      });
      this.partyKey = key;
    }
    const t = state.map.tiles[hkey(state.party.q, state.party.r)];
    const p = hexPos(state.party.q, state.party.r);
    p.y = tileTop(t);
    if (!this.partyPos) { this.partyPos = p.clone(); this.camTarget.copy(p); this.target.copy(p); }
    this.partyGoal = p;
    if (this.follow !== false) this.follow = true;
  }

  setReach(set) {
    this.reach = set;
    let i = 0;
    const m = new THREE.Matrix4();
    for (const k of set) {
      const e = this.tiles.get(k);
      if (!e || i >= 200) continue;
      const p = hexPos(e.t.q, e.t.r);
      m.makeTranslation(p.x, tileTop(e.t) + 0.02, p.z);
      this.reachMesh.setMatrixAt(i++, m);
    }
    this.reachMesh.count = i;
    this.reachMesh.instanceMatrix.needsUpdate = true;
  }
  setPath(path) {
    const m = new THREE.Matrix4();
    let i = 0;
    for (const s of (path || []).slice(0, 12)) {
      const e = this.tiles.get(hkey(s.q, s.r));
      if (!e) continue;
      const p = hexPos(s.q, s.r);
      m.makeTranslation(p.x, tileTop(e.t) + 0.15, p.z);
      this.pathMesh.setMatrixAt(i++, m);
    }
    this.pathMesh.count = i;
    this.pathMesh.instanceMatrix.needsUpdate = true;
  }
  centerOnParty() { this.follow = true; }
  focusTile(q, r) { const p = hexPos(q, r); this.camTarget.set(p.x, 0, p.z); this.follow = false; }

  update(dt, t) {
    // party
    if (this.partyGoal && this.partyPos) {
      this.partyPos.lerp(this.partyGoal, Math.min(1, dt * 4));
      this.partySprites.forEach((sp, i) => {
        sp.position.copy(this.partyPos).add(sp.userData.offset);
        const ph = t * 2.2 + sp.userData.phase;
        sp.setFrame(Math.floor(ph) % 2);
        const moving = this.partyPos.distanceTo(this.partyGoal) > 0.05;
        sp.mesh.position.y = moving ? Math.abs(Math.sin(t * 12 + i)) * 0.08 : 0;
      });
      if (this.follow) this.camTarget.lerp(this.partyPos, Math.min(1, dt * 3));
    }
    // camera
    this.target.lerp(this.camTarget, Math.min(1, dt * 6));
    const d = this.dist;
    this.camera.position.set(this.target.x, this.target.y + d * 0.72, this.target.z + d * 0.86);
    this.camera.lookAt(this.target.x, this.target.y + 0.4, this.target.z);
    // sole che segue la camera (ombre stabili)
    this.sun.position.set(this.target.x - 10, 14, this.target.z + 6);
    this.sun.target.position.copy(this.target);
    // icone che fluttuano, hover
    for (const e of this.tiles.values()) if (e.icon) e.icon.position.y = 2.1 + Math.sin(t * 2 + e.t.q) * 0.1;
    if (this.hover && this.active) {
      const p = hexPos(this.hover.q, this.hover.r);
      this.hoverRing.position.set(p.x, tileTop(this.hover) + 0.03, p.z);
      this.hoverRing.visible = true;
      this.hoverRing.material.opacity = 0.6 + Math.sin(t * 6) * 0.3;
    } else this.hoverRing.visible = false;
    // luci: assegna il pool alle sorgenti più vicine
    const srcs = this.lightSources.map((s) => ({ s, d: s.entry.group.position.distanceToSquared(this.target) })).sort((a, b) => a.d - b.d).slice(0, this.lights.length);
    this.lights.forEach((l, i) => {
      const it = srcs[i];
      if (!it) { l.intensity = 0; return; }
      const gp = it.s.entry.group.position;
      l.position.set(gp.x, it.s.entry.poiGroup.position.y + 1.0, gp.z + 0.3);
      l.color.set(it.s.color);
      l.intensity = it.s.i * (it.s.flicker ? 0.85 + Math.sin(t * 13 + i) * 0.1 + Math.sin(t * 7.3) * 0.08 : 1);
    });
    // cenere
    const ap = this.ash.geometry.attributes.position;
    const threat = this.state?.threat || 0;
    this.ash.material.opacity = 0.35 + threat / 160;
    for (let i = 0; i < ap.count; i++) {
      let y = ap.getY(i) - dt * (0.4 + (i % 5) * 0.1);
      let x = ap.getX(i) + Math.sin(t + i) * dt * 0.2;
      if (y < -0.5) { y = 10 + Math.random() * 2; x = (Math.random() - 0.5) * 40; ap.setZ(i, (Math.random() - 0.5) * 30); }
      ap.setY(i, y); ap.setX(i, x);
    }
    ap.needsUpdate = true;
    this.ash.position.set(this.target.x, 0, this.target.z);
    // lucciole
    const fp = this.flies.geometry.attributes.position;
    for (let i = 0; i < fp.count; i++) {
      const ph = this.flyPhase[i];
      fp.setX(i, fp.getX(i) + Math.sin(t * 0.7 + ph) * dt * 0.4);
      fp.setY(i, 0.8 + Math.sin(t * 1.3 + ph) * 0.6 + 0.6);
      fp.setZ(i, fp.getZ(i) + Math.cos(t * 0.6 + ph) * dt * 0.4);
    }
    fp.needsUpdate = true;
    this.flies.position.set(this.target.x, 0, this.target.z);
    this.flies.material.opacity = 0.5 + Math.sin(t * 3) * 0.3;
  }
}

// BFS lato client per mostrare le caselle raggiungibili
export function reachable(state) {
  const out = new Set();
  const map = state.map, t = state.travel;
  if (!map || state.phase !== 'map' || t.stage !== 'move' || t.steps <= 0) return out;
  const start = hkey(state.party.q, state.party.r);
  const dist = { [start]: 0 };
  const q = [[state.party.q, state.party.r]];
  while (q.length) {
    const [cq, cr] = q.shift();
    const d = dist[hkey(cq, cr)];
    if (d >= t.steps) continue;
    for (const n of neighbors(cq, cr)) {
      const k = hkey(n.q, n.r), tl = map.tiles[k];
      if (!tl || k in dist || !tl.rev || BIOMES[tl.b].blocked) continue;
      dist[k] = d + 1; out.add(k); q.push([n.q, n.r]);
    }
  }
  return out;
}
export function pathTo(state, goal) {
  const map = state.map, t = state.travel;
  const start = hkey(state.party.q, state.party.r), gk = hkey(goal.q, goal.r);
  const prev = { [start]: null };
  const q = [[state.party.q, state.party.r, 0]];
  while (q.length) {
    const [cq, cr, d] = q.shift();
    if (hkey(cq, cr) === gk) break;
    if (d >= t.steps) continue;
    for (const n of neighbors(cq, cr)) {
      const k = hkey(n.q, n.r), tl = map.tiles[k];
      if (!tl || k in prev || !tl.rev || BIOMES[tl.b].blocked) continue;
      prev[k] = hkey(cq, cr); q.push([n.q, n.r, d + 1]);
    }
  }
  if (!(gk in prev)) return null;
  const path = []; let k = gk;
  while (k && k !== start) { const [qq, rr] = k.split(',').map(Number); path.unshift({ q: qq, r: rr }); k = prev[k]; }
  return path;
}
