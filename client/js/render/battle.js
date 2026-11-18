// Scena di battaglia laterale HD-2D
import { THREE, PixelSprite, texFromCanvas } from './engine.js';
import { decor, tileTexture, canvas, shade, glowTexture } from './pixel.js';
import { Rig, heroDef, enemyDef, ANIM_DUR } from './rig.js';
import { BIOMES, ACTS } from '/shared/data/mythic.js';
import { ENEMIES } from '/shared/data/enemies.js';
import { ELEMENTS, STATUSES } from '/shared/rules.js';

const PX = 0.042;
// telecamera "alle spalle" degli eroi, rialzata, in vista quasi assonometrica
const CAM = { pos: new THREE.Vector3(15, 9, 10.5), look: new THREE.Vector3(0.2, 0.2, -0.4) };
// movimento continuo per tipo: oscillazione, respiro (volume costante), saltello, velocità
const MOTION = {
  hero: { sway: 0.02, breath: 0.022, bob: 0, rate: 2.2 },
  beast: { sway: 0.03, breath: 0.035, bob: 0.025, rate: 3.4 },
  cultist: { sway: 0.04, breath: 0.02, bob: 0, rate: 1.6 },
  bandit: { sway: 0.03, breath: 0.022, bob: 0.01, rate: 2.0 },
  specter: { sway: 0.06, breath: 0.03, bob: 0, rate: 1.4 },
  moth: { sway: 0.05, breath: 0.05, bob: 0, rate: 4.0 },
  slime: { sway: 0.01, breath: 0.08, bob: 0.02, rate: 2.4 },
  knight: { sway: 0.015, breath: 0.015, bob: 0, rate: 1.2 },
  toad: { sway: 0.02, breath: 0.06, bob: 0.015, rate: 2.0 },
  crab: { sway: 0.03, breath: 0.02, bob: 0.01, rate: 2.6 },
  default: { sway: 0.025, breath: 0.02, bob: 0, rate: 1.6 },
};
const ELCOL = { fuoco: '#ff7a2f', gelo: '#7fd4ff', fulmine: '#ffe45c', luce: '#fff2b0', ombra: '#a77bff', taglio: '#ffffff', punta: '#ffffff', botta: '#e8d8b8' };

export class BattleView {
  constructor(engine, overlay) {
    this.engine = engine;
    this.overlay = overlay;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.5, 120);
    this.tilt = { focus: 0.5, band: 0.34, amount: 1.2 }; // fascia nitida più ampia: gli sprite restano definiti
    this.bloom = { strength: 0.22, threshold: 0.95 };
    this.units = new Map();
    this.anims = [];
    this.lastSeq = -1;
    this.combatKey = null;
    this.targets = new Set();
    this.onUnitClick = null;
    this.ray = new THREE.Raycaster();
    this.setupScene();
    const el = engine.renderer.domElement;
    el.addEventListener('click', (e) => {
      if (!this.active) return;
      const id = this.pickUnit(e.clientX, e.clientY);
      if (id) this.onUnitClick?.(id);
    });
    el.addEventListener('pointermove', (e) => { if (this.active) this.hoverId = this.pickUnit(e.clientX, e.clientY); });
  }

  setupScene() {
    const s = this.scene;
    this.hemi = new THREE.HemisphereLight('#c0b8e8', '#4a3a30', 1.5); s.add(this.hemi);
    this.key = new THREE.DirectionalLight('#ffd8b0', 1.8);
    this.key.position.set(-6, 9, 6); this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 1024);
    Object.assign(this.key.shadow.camera, { left: -12, right: 12, top: 8, bottom: -8, near: 1, far: 40 });
    this.key.shadow.bias = -0.0008;
    s.add(this.key);
    s.add(new THREE.AmbientLight('#4a3a5a', 0.7));
    this.fxLight = new THREE.PointLight('#ffffff', 0, 12, 1.5); this.fxLight.position.set(0, 2, 1); s.add(this.fxLight);
    this.heroLight = new THREE.PointLight('#ffd8a0', 3, 9, 1.4); this.heroLight.position.set(4, 3, 3); s.add(this.heroLight);
    // luce di riempimento dal lato della camera: gli sprite guardano la camera e altrimenti restano in ombra
    this.fill = new THREE.DirectionalLight('#ffe8d0', 1.1); this.fill.position.set(15, 7, 12); s.add(this.fill);
    this.env = new THREE.Group(); s.add(this.env);
    // anello del turno attivo
    const rg = new THREE.RingGeometry(0.55, 0.72, 32); rg.rotateX(-Math.PI / 2);
    this.ring = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.85, depthWrite: false }));
    s.add(this.ring);
    // particelle FX
    const N = 220;
    this.pPos = new Float32Array(N * 3); this.pVel = new Float32Array(N * 3); this.pLife = new Float32Array(N); this.pCol = new Float32Array(N * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.pCol, 3));
    this.parts = new THREE.Points(g, new THREE.PointsMaterial({ map: texFromCanvas(glowTexture('#ffffff')), size: 0.35, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.add(this.parts);
    this.pIdx = 0;
    // proiettili degli attacchi a distanza
    this.glowTex = texFromCanvas(glowTexture('#ffffff'));
    this.projs = [];
    // braci ambientali
    const E = 120, ep = new Float32Array(E * 3);
    for (let i = 0; i < E; i++) { ep[i * 3] = (Math.random() - 0.5) * 24; ep[i * 3 + 1] = Math.random() * 6; ep[i * 3 + 2] = -6 + Math.random() * 9; }
    const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
    this.embers = new THREE.Points(eg, new THREE.PointsMaterial({ map: texFromCanvas(glowTexture('#ffa060')), color: '#ffa060', size: 0.18, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.add(this.embers);
  }

  buildEnv(biome, act) {
    while (this.env.children.length) this.env.remove(this.env.children[0]);
    const bd = BIOMES[biome] || BIOMES.prato;
    const A = ACTS[act] || ACTS[1];
    this.scene.fog = new THREE.Fog(A.fog, 30, 70);
    this.scene.background = new THREE.Color(A.sky[0]);
    this.key.color.set(A.sky[2]).lerp(new THREE.Color('#ffffff'), 0.6);
    this.hemi.color.set(A.sky[1]).lerp(new THREE.Color('#d8d0f0'), 0.6);
    // terreno
    const tex = texFromCanvas(tileTexture(bd.blocked ? BIOMES.prato.top : bd.top, 2, 'grass'));
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(24, 16);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(70, 46), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.z = -4; ground.receiveShadow = true;
    this.env.add(ground);
    // sentiero centrale
    const ptex = texFromCanvas(tileTexture(['#6a5a48', '#76654f', '#5e503f', '#82705a'], 3, 'stone'));
    ptex.wrapS = ptex.wrapT = THREE.RepeatWrapping; ptex.repeat.set(18, 2);
    const path = new THREE.Mesh(new THREE.PlaneGeometry(44, 4.2), new THREE.MeshStandardMaterial({ map: ptex, roughness: 1 }));
    path.rotation.x = -Math.PI / 2; path.position.set(0, 0.01, 0); path.receiveShadow = true;
    this.env.add(path);
    // fondale dipinto
    const [bc, bx] = canvas(256, 96);
    const g = bx.createLinearGradient(0, 0, 0, 96);
    g.addColorStop(0, A.sky[0]); g.addColorStop(0.65, A.sky[1]); g.addColorStop(1, A.sky[2]);
    bx.fillStyle = g; bx.fillRect(0, 0, 256, 96);
    bx.drawImage(decor('sunshard'), 150, 6, 40, 40);
    for (let layer = 0; layer < 3; layer++) {
      bx.fillStyle = shade(A.sky[0], 0.05 + layer * 0.08);
      for (let x = 0; x < 256; x++) {
        const y = 52 + layer * 12 + Math.sin(x * (0.03 + layer * 0.02) + layer) * (8 - layer * 2) + Math.sin(x * 0.11) * 2;
        bx.fillRect(x, Math.round(y), 1, 96);
      }
    }
    const back = new THREE.Mesh(new THREE.PlaneGeometry(110, 34), new THREE.MeshBasicMaterial({ map: texFromCanvas(bc), fog: false }));
    // fondale lontano, perpendicolare alla direzione di vista
    const dir = CAM.look.clone().sub(CAM.pos).setY(0).normalize();
    back.position.copy(CAM.look).addScaledVector(dir, 30).setY(9);
    back.lookAt(CAM.pos.x, 9, CAM.pos.z);
    this.env.add(back);
    // decorazioni dietro e davanti
    const kinds = bd.decor.length && !bd.blocked ? bd.decor : ['rock', 'bush'];
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 26; i++) {
      const k = kinds[Math.floor(rnd() * kinds.length)];
      const sp = new PixelSprite(decor(k, Math.floor(rnd() * 3)), decor(k).width, decor(k).height, 1, PX * (1.1 + rnd() * 0.6), { shadow: true, blob: false });
      sp.position.set((rnd() - 0.5) * 40 - 4, 0, -3.5 - rnd() * 12);
      this.env.add(sp);
    }
    for (let i = 0; i < 5; i++) {
      const k = kinds[Math.floor(rnd() * kinds.length)];
      const sp = new PixelSprite(decor(k, 1), decor(k).width, decor(k).height, 1, PX * 1.4, { blob: false });
      sp.position.set(-9 - i * 2.6 - rnd() * 2, 0, 3 + rnd() * 3);
      this.env.add(sp);
    }
  }

  unitPos(u) {
    const side = u.side === 'hero' ? 1 : -1;
    const big = u.boss ? 1.0 : 0;
    const x = side * (2.4 + u.row * 1.9 + u.lane * 0.3 + big);
    // le corsie sono ben distanziate in profondità; la seconda fila è sfalsata per non coprire la prima
    const z = u.boss ? -0.3 : (u.lane - 1) * 2.0 + u.row * side * -0.9;
    return new THREE.Vector3(x, 0, z);
  }

  sync(state) {
    const c = state.combat;
    if (!c) return;
    const key = c.id;
    if (key !== this.combatKey) this.reset(state, key);
    for (const u of c.units) {
      let e = this.units.get(u.id);
      if (!e) e = this.addUnit(u, state);
      e.u = u;
      e.home = this.unitPos(u);
      if (!u.alive && !e.dead) { e.dead = true; e.deathT = 0; }
      if (u.alive && e.dead) { e.dead = false; e.sp.mat.opacity = 1; e.sp.mat.transparent = false; e.sp.visible = true; e.hop = 0.5; }
    }
    if (c.last && c.last.seq !== this.lastSeq) { this.lastSeq = c.last.seq; this.playAction(c.last, state); }
    this.activeId = c.active;
    this.state = state;
  }

  reset(state, key) {
    for (const e of this.units.values()) { this.scene.remove(e.sp); e.rig.dispose(); e.label.remove(); }
    this.units.clear();
    this.combatKey = key;
    for (const p of this.projs) this.scene.remove(p.sp);
    this.projs = [];
    this.lastSeq = state.combat.last?.seq ?? -1;
    this.buildEnv(state.combat.bg, state.act);
    this.engine.flash('#ffffff', 0.5);
  }

  addUnit(u, state) {
    // marionetta in pixel art: arti e arma si muovono separatamente
    const rig = new Rig(u.side === 'hero' ? heroDef(state.heroes.find((x) => x.id === u.heroId)) : enemyDef(u.enemyId));
    rig.setUnitId(u.id);
    const sp = rig.group;
    sp.mesh = rig.mesh; sp.blob = rig.blob; sp.h = rig.h;
    sp.mat = { emissive: new THREE.Color(0, 0, 0), opacity: 1, transparent: false, emissiveIntensity: 1 }; // applicati a tutti i pezzi
    const pos = this.unitPos(u);
    sp.position.copy(pos);
    if (u.side === 'enemy') sp.position.x -= 6; else sp.position.x += 6; // entrata in scena
    this.scene.add(sp);
    const label = document.createElement('div');
    label.className = 'unit-label ' + u.side + (u.boss ? ' boss' : '');
    this.overlay.appendChild(label);
    const e = { u, sp, rig, home: pos, label, phase: Math.random() * 6, offset: new THREE.Vector3(), hitT: 0, atkT: 0, dead: !u.alive, deathT: 1, isHero: u.side === 'hero', face: u.side === 'enemy' ? -1 : 1, kind: u.side === 'hero' ? 'hero' : ENEMIES[u.enemyId]?.kind, flashT: 0, lean: 0, eAnim: null, anim: null, knock: 0, sqx: 1, sqy: 1, hop: 0 };
    if (!u.alive && u.side !== 'hero') sp.visible = false;
    this.units.set(u.id, e);
    return e;
  }

  pickUnit(cx, cy) {
    const v = new THREE.Vector2((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1);
    this.ray.setFromCamera(v, this.camera);
    const meshes = [...this.units.values()].filter((e) => e.sp.visible).flatMap((e) => e.rig.meshes);
    const hit = this.ray.intersectObjects(meshes, false)[0];
    return hit ? hit.object.userData.unitId : null;
  }

  // ---------- effetti ----------
  burst(pos, color, n = 30, spread = 1.2, up = 1) {
    const col = new THREE.Color(color);
    for (let i = 0; i < n; i++) {
      const k = this.pIdx = (this.pIdx + 1) % this.pLife.length;
      this.pPos[k * 3] = pos.x + (Math.random() - 0.5) * 0.4; this.pPos[k * 3 + 1] = pos.y + Math.random() * 0.6; this.pPos[k * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.4;
      this.pVel[k * 3] = (Math.random() - 0.5) * spread * 3; this.pVel[k * 3 + 1] = Math.random() * 3 * up; this.pVel[k * 3 + 2] = (Math.random() - 0.5) * spread * 2;
      this.pLife[k] = 0.6 + Math.random() * 0.6;
      this.pCol[k * 3] = col.r; this.pCol[k * 3 + 1] = col.g; this.pCol[k * 3 + 2] = col.b;
    }
  }
  popup(unitId, text, cls, delay = 0) {
    setTimeout(() => {
      const e = this.units.get(unitId);
      if (!e) return;
      const d = document.createElement('div');
      d.className = 'popup ' + cls;
      d.textContent = text;
      const p = e.sp.position.clone(); p.y += e.sp.h * 0.85;
      p.project(this.camera);
      d.style.left = ((p.x + 1) / 2) * innerWidth + (Math.random() - 0.5) * 30 + 'px';
      d.style.top = ((1 - p.y) / 2) * innerHeight + 'px';
      this.overlay.appendChild(d);
      setTimeout(() => d.remove(), 1500);
    }, delay);
  }

  playAction(last, state) {
    const actor = this.units.get(last.actor);
    if (last.skip) { this.popup(last.actor, last.name, 'status'); return; }
    if (actor) {
      actor.atkT = 0.6;
      if (actor.isHero) {
        const strike = last.kind === 'phys' && !last.concert && !last.summon;
        if (strike) actor.rig.play('attack');
        else if (last.name === 'Difesa') actor.rig.setAnim('guard');
        else if (last.kind || last.charge || last.summon || last.concert) { actor.rig.play('cast'); actor.hop = 0.35; actor.sqy = 1.12; actor.sqx = 0.92; }
        else actor.rig.setAnim('walk');
      } else { actor.eAnim = { t: 0, dur: 0.75 }; actor.rig.play(last.kind === 'mag' || last.kind === 'heal' || last.kind === 'buff' ? 'cast' : 'attack'); }
      const tgt = last.results.find((r) => r.id !== last.actor && r.dmg != null);
      const offensive = last.kind === 'phys' || last.kind === 'mag';
      if (tgt && last.kind === 'phys' && !last.concert && !last.summon && !last.ranged) {
        const te = this.units.get(tgt.id);
        if (te) actor.lunge = { to: te.home.clone().lerp(actor.home, 0.35), t: actor.isHero ? 0 : -0.45 };
      }
      if (last.kind === 'mag' || last.kind === 'heal' || last.kind === 'buff') this.burst(actor.sp.position.clone().add(new THREE.Vector3(0, 0.8, 0)), last.kind === 'heal' ? '#7dff9a' : ELCOL[last.el] || '#ffe8a0', 18, 0.6, 1.2);
      if (!last.summon) this.popup(last.actor, last.name, 'skillname');
      if (last.summon) { this.engine.flash(ELCOL[last.el] || '#ffffff', 0.85); this.banner(last.name); }
      if (last.concert) { this.engine.flash('#ffe8a0', 0.5); this.banner(last.name); }
      if (last.charge) this.burst(actor.sp.position.clone().add(new THREE.Vector3(0, 0.5, 0)), '#ffd27a', 25 * last.charge, 0.4, 1.6);
      void offensive;
    }
    // a distanza: un proiettile per bersaglio, niente corsa verso il nemico
    const shot = actor && last.ranged && !last.summon && !last.concert;
    if (shot) {
      const ids = [...new Set(last.results.filter((r) => r.id !== last.actor && (r.dmg != null || r.miss)).map((r) => r.id))].slice(0, 6);
      ids.forEach((id, k) => {
        const te = this.units.get(id);
        if (te) this.shoot(actor.sp.position.clone().add(new THREE.Vector3(0, actor.sp.h * 0.6, 0)), te.sp.position.clone().add(new THREE.Vector3(0, te.sp.h * 0.5, 0)), last.kind === 'phys' && !last.el ? '#f4ecd8' : ELCOL[last.el] || '#ffe8a0', k * 0.09, last.kind === 'phys');
      });
    }
    if (last.aoe === 'row' || last.aoe === 'all') setTimeout(() => { this.shake = 0.3; }, shot ? 420 : 300);
    let i = 0;
    for (const r of last.results) {
      const delay = (shot ? 430 : 300) + i * 140;
      i++;
      const te = this.units.get(r.id);
      setTimeout(() => {
        if (!te) return;
        const p = te.sp.position.clone().add(new THREE.Vector3(0, te.sp.h * 0.45, 0));
        if (r.dmg != null) {
          te.hitT = 0.4;
          te.flashT = 0.14;
          this.hitStop = Math.max(this.hitStop || 0, r.crit || r.broke ? 0.11 : 0.05);
          te.knock = te.isHero ? 0.45 : -0.45;
          te.sqx = 0.86; te.sqy = 1.1;
          te.rig.play('hurt');
          this.burst(p, ELCOL[r.el] || '#ffffff', r.crit ? 40 : 22, 1.1);
          this.fxLight.position.copy(p).add(new THREE.Vector3(0, 0.5, 1));
          this.fxLight.color.set(ELCOL[r.el] || '#ffffff'); this.fxLight.intensity = 14;
          if (r.crit || r.broke) this.shake = 0.25;
        }
        if (r.revived || r.summoned) { this.burst(p, '#fff2b0', 30, 0.5, 1.5); te.hop = 0.5; }
        if (r.heal && !r.revived) te.hop = Math.max(te.hop, 0.2);
      }, delay);
      if (r.miss) this.popup(r.id, 'Mancato', 'miss', delay);
      if (r.dmg != null) this.popup(r.id, String(r.dmg), 'dmg' + (r.crit ? ' crit' : '') + (r.weak ? ' weak' : '') + (r.resist ? ' resist' : ''), delay);
      if (r.weak) this.popup(r.id, 'DEBOLE!', 'tag weak', delay + 80);
      if (r.crit) this.popup(r.id, 'CRITICO', 'tag crit', delay + 120);
      if (r.combo) this.popup(r.id, r.combo, 'tag combo', delay + 160);
      if (r.broke) { this.popup(r.id, 'SPEZZATO!', 'tag broke', delay + 100); setTimeout(() => this.engine.flash('#ffe8a0', 0.45), delay); }
      if (r.heal) this.popup(r.id, '+' + r.heal, 'heal', delay);
      if (r.mp) this.popup(r.id, '+' + r.mp + ' PM', 'heal mp', delay);
      if (r.st) this.popup(r.id, STATUSES[r.st]?.name || r.st, 'status', delay + 200);
      if (r.stole) this.popup(r.id, 'Rubato: ' + r.stole, 'status', delay + 200);
      if (r.stealFail) this.popup(r.id, 'Niente da rubare', 'miss', delay + 200);
      if (r.analyzed) this.popup(r.id, 'Debolezze rivelate', 'status', delay);
      if (r.revived) this.popup(r.id, 'Rianimato!', 'heal', delay);
      if (r.cleansed) this.popup(r.id, 'Purificato', 'heal', delay + 100);
      if (r.charge != null) this.popup(r.id, 'Slancio ' + r.charge, 'status', delay);
    }
  }
  banner(text) {
    const b = document.createElement('div');
    b.className = 'banner';
    b.textContent = text;
    this.overlay.appendChild(b);
    setTimeout(() => b.remove(), 2000);
  }

  shoot(from, to, color, delay, arrow) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    sp.scale.setScalar(arrow ? 0.28 : 0.5);
    sp.visible = false;
    this.scene.add(sp);
    this.projs.push({ sp, from, to, color, t: -delay, dur: arrow ? 0.26 : 0.36, arc: arrow ? 0.35 : 0.15 });
  }

  setTargets(ids) { this.targets = new Set(ids || []); }

  update(dt, t) {
    // camera con leggero ondeggio
    const sh = this.shake > 0 ? (this.shake -= dt, (Math.random() - 0.5) * 0.15) : 0;
    this.camera.position.set(CAM.pos.x + Math.sin(t * 0.25) * 0.35 + sh, CAM.pos.y + sh, CAM.pos.z + Math.cos(t * 0.21) * 0.2);
    this.camera.lookAt(CAM.look);
    // gli sprite ruotano attorno all'asse verticale per guardare la camera
    const cp = this.camera.position;
    const face = (o) => { o.rotation.y = Math.atan2(cp.x - o.position.x, cp.z - o.position.z); };
    for (const o of this.env.children) if (o.isGroup) face(o);
    for (const e of this.units.values()) face(e.sp);
    this.fxLight.intensity = Math.max(0, this.fxLight.intensity - dt * 30);
    // fermo-immagine sull'impatto: per un istante i personaggi quasi si fermano, il colpo «pesa»
    this.hitStop = Math.max(0, (this.hitStop || 0) - dt);
    const adt = this.hitStop > 0 ? dt * 0.08 : dt;
    for (const e of this.units.values()) {
      const sp = e.sp, u = e.u;
      const M = MOTION[e.kind] || MOTION.default;
      // ritorno a casa / entrata, con contraccolpo quando viene colpito
      let goal = e.home.clone();
      e.knock *= Math.max(0, 1 - adt * 7);
      goal.x += e.knock;
      let lean = 0;
      if (e.lunge) {
        e.lunge.t += adt * 2.2;
        const lt = Math.max(0, e.lunge.t);
        const k = lt < 0.5 ? lt * 2 : Math.max(0, 2 - lt * 2);
        goal = e.home.clone().lerp(e.lunge.to, k * k * (3 - 2 * k));
        sp.position.copy(goal);
        if (e.lunge.t >= 1) e.lunge = null;
      } else sp.position.lerp(goal, Math.min(1, adt * 8));
      const walking = !e.lunge && sp.position.distanceTo(goal) > 0.12; // entrata in scena
      // schiacciamento / allungamento che torna a 1
      e.sqx += (1 - e.sqx) * Math.min(1, adt * 9); e.sqy += (1 - e.sqy) * Math.min(1, adt * 9);
      const disabled = u.broken > 0 || u.statuses?.stun || u.statuses?.sleep || u.statuses?.frozen;
      // animazione continua di base: le azioni a tempo (attacco, magia, colpito) hanno la precedenza
      const rig = e.rig;
      if (e.isHero) {
        if (e.dead) rig.setAnim('ko');
        else if (this.state?.combat?.phase === 'victory') rig.setAnim('cheer');
        else if (!ANIM_DUR[rig.anim]) rig.setAnim(walking || (e.lunge && e.lunge.t < 0.45) ? 'walk' : u.defending ? 'guard' : 'idle');
        if (e.hitT > 0) { e.hitT -= adt; lean = -0.16; }
      } else {
        if (!ANIM_DUR[rig.anim]) rig.setAnim(walking ? 'walk' : 'idle');
        // carica (si tira indietro e si schiaccia), colpo (scatta in avanti), ritorno
        if (e.eAnim) {
          const ea = e.eAnim; ea.t += adt;
          const k = ea.t / ea.dur;
          if (k < 0.38) { const w = k / 0.38; lean = -0.2 * w; e.sqx = 1 + 0.08 * w; e.sqy = 1 - 0.1 * w; }
          else if (k < 0.62) { lean = -0.2 + 0.42 * ((k - 0.38) / 0.24); e.sqx = 1.18; e.sqy = 0.86; }
          else lean = 0.22 * (1 - (k - 0.62) / 0.38);
          if (ea.t >= ea.dur) e.eAnim = null;
        }
        if (e.atkT > 0) e.atkT -= adt;
        if (e.hitT > 0) { e.hitT -= adt; lean = -0.2; }
      }
      rig.update(disabled && !e.dead ? adt * 0.2 : adt);
      sp.mesh.position.x = e.hitT > 0 ? Math.sin(t * 80) * 0.04 : 0;
      // movimento continuo: respiro a volume costante, oscillazione del peso, saltello
      const lively = !e.dead && !disabled;
      const ph = t * M.rate + e.phase;
      const br = 0; // il respiro lo fa la marionetta
      const sway = lively ? Math.sin(ph * 0.55) * M.sway * 0.5 : 0;
      e.lean += (lean - e.lean) * Math.min(1, adt * 14);
      // gli sprite sono disegnati rivolti a sinistra: i nemici (a sinistra) si specchiano per guardare gli eroi
      sp.mesh.scale.set(e.sqx * (1 - br * 0.5) * e.face, e.sqy * (1 + br), 1);
      sp.mesh.rotation.z = (sway + e.lean) * e.face;
      e.hop = Math.max(0, e.hop - adt);
      const hopY = e.hop > 0 ? Math.sin((1 - e.hop / 0.5) * Math.PI) * 0.35 * Math.min(1, e.hop * 4) : 0;
      const bobY = lively ? Math.abs(Math.sin(ph)) * M.bob : 0;
      const walkY = walking ? Math.abs(Math.sin(t * 12 + e.phase)) * 0.07 : 0;
      // fluttuazione per spettri / falene
      const fl = u.side === 'enemy' && ['specter', 'moth', 'queen'].includes(e.kind) ? 0.25 + Math.sin(t * 2 + e.phase) * 0.12 : 0;
      if (!(e.isHero && this.state?.combat?.phase === 'victory')) sp.mesh.position.y = fl + hopY + bobY + walkY;
      if (sp.blob) sp.blob.scale.setScalar(Math.max(0.55, 1 - (hopY + walkY + fl * 0.6) * 0.9));
      // morte: i nemici cadono all'indietro e svaniscono, gli eroi restano in ginocchio (possono essere rianimati)
      if (e.dead && !e.isHero) {
        e.deathT = Math.min(1, e.deathT + adt * 1.3);
        const d = e.deathT;
        sp.mat.transparent = true; sp.mat.opacity = d < 0.45 ? 1 : 1 - (d - 0.45) / 0.55;
        sp.mesh.rotation.z = -Math.min(1, d * 2.2) * 1.25 * e.face;
        sp.mesh.position.y = fl * (1 - d) - d * 0.15;
        if (sp.blob) sp.blob.visible = d < 0.6;
        if (d >= 1) sp.visible = false;
      }
      // colore per stati
      const em = sp.mat.emissive;
      e.flashT = Math.max(0, e.flashT - dt);
      if (e.flashT > 0) em.setRGB(1, 1, 1).multiplyScalar(e.flashT / 0.14 * 1.4);
      else if (u.statuses?.frozen) em.set('#3a7aaa');
      else if (u.broken > 0) em.set('#4a3a10');
      else if (this.targets.has(u.id) && this.hoverId === u.id) em.set('#5a4a20');
      else if (this.targets.has(u.id)) em.setRGB(0.12 + Math.sin(t * 6) * 0.08, 0.1, 0.02);
      else em.set('#000000');
      sp.mat.emissiveIntensity = 1;
      rig.setEmissive(em.r, em.g, em.b);
      rig.setOpacity(sp.mat.opacity);
      // etichetta HTML
      const p = sp.position.clone(); p.y += sp.h + 0.15 + fl;
      p.project(this.camera);
      const lx = ((p.x + 1) / 2) * innerWidth, ly = ((1 - p.y) / 2) * innerHeight;
      e.label.style.transform = `translate(${lx}px, ${ly}px) translate(-50%, -100%)`;
      e.label.style.display = sp.visible && this.active ? '' : 'none';
      const html = this.labelHtml(u);
      if (html !== e.lastHtml) { e.label.innerHTML = html; e.lastHtml = html; }
    }
    // anello turno
    const act = this.units.get(this.activeId);
    if (act && act.sp.visible) { this.ring.visible = true; this.ring.position.set(act.sp.position.x, 0.03, act.sp.position.z); this.ring.scale.setScalar(1 + Math.sin(t * 5) * 0.06); }
    else this.ring.visible = false;
    // proiettili
    for (const p of this.projs) {
      p.t += dt;
      if (p.t < 0) continue;
      const k = Math.min(1, p.t / p.dur);
      p.sp.visible = true;
      p.sp.position.copy(p.from).lerp(p.to, k);
      p.sp.position.y += Math.sin(k * Math.PI) * p.arc;
      this.burst(p.sp.position, p.color, 2, 0.15, 0.2);
      if (k >= 1) { p.done = true; this.burst(p.to, p.color, 14, 0.8); this.scene.remove(p.sp); p.sp.material.dispose(); }
    }
    this.projs = this.projs.filter((p) => !p.done);
    // particelle
    for (let k = 0; k < this.pLife.length; k++) {
      if (this.pLife[k] <= 0) { this.pPos[k * 3 + 1] = -99; continue; }
      this.pLife[k] -= dt;
      this.pVel[k * 3 + 1] -= dt * 3;
      for (let a = 0; a < 3; a++) this.pPos[k * 3 + a] += this.pVel[k * 3 + a] * dt;
    }
    this.parts.geometry.attributes.position.needsUpdate = true;
    this.parts.geometry.attributes.color.needsUpdate = true;
    const ep = this.embers.geometry.attributes.position;
    for (let i = 0; i < ep.count; i++) { let y = ep.getY(i) + dt * 0.3; if (y > 6) y = 0; ep.setY(i, y); ep.setX(i, ep.getX(i) + Math.sin(t + i) * dt * 0.1); }
    ep.needsUpdate = true;
  }

  labelHtml(u) {
    const st = Object.keys(u.statuses || {}).map((k) => `<span title="${STATUSES[k]?.name}">${STATUSES[k]?.icon || '?'}</span>`).join('');
    if (u.side === 'hero') return `<div class="ul-name">${u.name}${u.charge ? ` <b class="chg">${'◆'.repeat(u.charge)}</b>` : ''}</div><div class="ul-st">${st}</div>`;
    const d = ENEMIES[u.enemyId];
    const weak = d.weak.map((w) => (u.known.includes(w) ? `<i style="color:${ELEMENTS[w].color}" title="${ELEMENTS[w].name}">${ELEMENTS[w].icon}</i>` : '<i class="unk">?</i>')).join('');
    const guard = u.broken > 0 ? '<span class="guard broken">SPEZZATO</span>' : `<span class="guard" title="Guardia: colpisci le debolezze per azzerarla">🛡${u.guard}</span>`;
    const hpPct = Math.max(0, (u.hp / u.maxHp) * 100);
    return `<div class="ul-name">${u.name}</div><div class="ul-row">${guard}<span class="weak">${weak}</span></div><div class="ul-hp"><div style="width:${hpPct}%"></div></div><div class="ul-st">${st}</div>`;
  }
}
