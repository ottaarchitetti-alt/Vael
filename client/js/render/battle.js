// Scena di battaglia laterale HD-2D
import { THREE, PixelSprite, texFromCanvas } from './engine.js';
import { heroSheet, enemySheet, HERO_W, HERO_H, HERO_FRAMES, HERO_ANIM, decor, tileTexture, canvas, shade, glowTexture } from './pixel.js';
import { BIOMES, ACTS } from '/shared/data/mythic.js';
import { ENEMIES } from '/shared/data/enemies.js';
import { ELEMENTS, STATUSES } from '/shared/rules.js';

const PX = 0.042;
// telecamera "alle spalle" degli eroi, rialzata, in vista quasi assonometrica
const CAM = { pos: new THREE.Vector3(15, 9, 10.5), look: new THREE.Vector3(0.2, 0.2, -0.4) };
const ELCOL = { fuoco: '#ff7a2f', gelo: '#7fd4ff', fulmine: '#ffe45c', luce: '#fff2b0', ombra: '#a77bff', taglio: '#ffffff', punta: '#ffffff', botta: '#e8d8b8' };

export class BattleView {
  constructor(engine, overlay) {
    this.engine = engine;
    this.overlay = overlay;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.5, 120);
    this.tilt = { focus: 0.5, band: 0.22, amount: 2.0 };
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
    for (const e of this.units.values()) { this.scene.remove(e.sp); e.label.remove(); }
    this.units.clear();
    this.combatKey = key;
    this.lastSeq = state.combat.last?.seq ?? -1;
    this.buildEnv(state.combat.bg, state.act);
    this.engine.flash('#ffffff', 0.5);
  }

  addUnit(u, state) {
    let sp;
    if (u.side === 'hero') {
      const h = state.heroes.find((x) => x.id === u.heroId);
      sp = new PixelSprite(heroSheet(h), HERO_W, HERO_H, HERO_FRAMES, PX * 1.05, { shadow: true });
    } else {
      const s = enemySheet(u.enemyId);
      sp = new PixelSprite(s.canvas, s.w, s.h, 4, PX * (ENEMIES[u.enemyId].size > 1.5 ? 1.1 : 1), { shadow: true, emissive: '#000000' });
    }
    const pos = this.unitPos(u);
    sp.position.copy(pos);
    if (u.side === 'enemy') sp.position.x -= 6; else sp.position.x += 6; // entrata in scena
    this.scene.add(sp);
    const label = document.createElement('div');
    label.className = 'unit-label ' + u.side + (u.boss ? ' boss' : '');
    this.overlay.appendChild(label);
    const e = { u, sp, home: pos, label, phase: Math.random() * 6, offset: new THREE.Vector3(), hitT: 0, atkT: 0, dead: !u.alive, deathT: 1, isHero: u.side === 'hero', anim: null, knock: 0, sqx: 1, sqy: 1, hop: 0 };
    if (!u.alive && u.side !== 'hero') sp.visible = false;
    sp.mesh.userData.unitId = u.id;
    this.units.set(u.id, e);
    return e;
  }

  pickUnit(cx, cy) {
    const v = new THREE.Vector2((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1);
    this.ray.setFromCamera(v, this.camera);
    const meshes = [...this.units.values()].filter((e) => e.sp.visible).map((e) => e.sp.mesh);
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
        const melee = last.kind === 'phys' && !last.concert && !last.summon;
        if (melee) actor.anim = { frames: HERO_ANIM.attack, t: 0, dur: 0.55, delay: 0.22, strike: true };
        else if (last.name === 'Difesa') actor.anim = { frames: HERO_ANIM.guard, t: 0, dur: 0.9 };
        else if (last.kind || last.charge || last.summon || last.concert) { actor.anim = { frames: HERO_ANIM.cast, t: 0, dur: 0.8 }; actor.hop = 0.35; actor.sqy = 1.12; actor.sqx = 0.92; }
        else actor.anim = { frames: HERO_ANIM.walk, t: 0, dur: 0.5 };
      } else { actor.sqx = 1.12; actor.sqy = 0.9; }
      const tgt = last.results.find((r) => r.id !== last.actor && r.dmg != null);
      const offensive = last.kind === 'phys' || last.kind === 'mag';
      if (tgt && last.kind === 'phys' && !last.concert && !last.summon) {
        const te = this.units.get(tgt.id);
        if (te) actor.lunge = { to: te.home.clone().lerp(actor.home, 0.35), t: 0 };
      }
      if (last.kind === 'mag' || last.kind === 'heal' || last.kind === 'buff') this.burst(actor.sp.position.clone().add(new THREE.Vector3(0, 0.8, 0)), last.kind === 'heal' ? '#7dff9a' : ELCOL[last.el] || '#ffe8a0', 18, 0.6, 1.2);
      if (!last.summon) this.popup(last.actor, last.name, 'skillname');
      if (last.summon) { this.engine.flash(ELCOL[last.el] || '#ffffff', 0.85); this.banner(last.name); }
      if (last.concert) { this.engine.flash('#ffe8a0', 0.5); this.banner(last.name); }
      if (last.charge) this.burst(actor.sp.position.clone().add(new THREE.Vector3(0, 0.5, 0)), '#ffd27a', 25 * last.charge, 0.4, 1.6);
      void offensive;
    }
    let i = 0;
    for (const r of last.results) {
      const delay = 300 + i * 140;
      i++;
      const te = this.units.get(r.id);
      setTimeout(() => {
        if (!te) return;
        const p = te.sp.position.clone().add(new THREE.Vector3(0, te.sp.h * 0.45, 0));
        if (r.dmg != null) {
          te.hitT = 0.4;
          te.knock = te.isHero ? 0.45 : -0.45;
          te.sqx = 0.86; te.sqy = 1.1;
          if (te.isHero) te.anim = null;
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
    for (const e of this.units.values()) {
      const sp = e.sp, u = e.u;
      // ritorno a casa / entrata, con contraccolpo quando viene colpito
      let goal = e.home.clone();
      e.knock *= Math.max(0, 1 - dt * 7);
      goal.x += e.knock;
      if (e.lunge) {
        e.lunge.t += dt * 2.2;
        const k = e.lunge.t < 0.5 ? e.lunge.t * 2 : Math.max(0, 2 - e.lunge.t * 2);
        goal = e.home.clone().lerp(e.lunge.to, k * k * (3 - 2 * k));
        sp.position.copy(goal);
        if (e.lunge.t >= 1) e.lunge = null;
      } else sp.position.lerp(goal, Math.min(1, dt * 8));
      // schiacciamento / allungamento che torna a 1
      e.sqx += (1 - e.sqx) * Math.min(1, dt * 9); e.sqy += (1 - e.sqy) * Math.min(1, dt * 9);
      let frame;
      const disabled = u.broken > 0 || u.statuses?.stun || u.statuses?.sleep || u.statuses?.frozen;
      if (e.isHero) {
        const idle = HERO_ANIM.idle;
        frame = idle[Math.floor(t * 5 + e.phase) % idle.length];
        if (u.defending) frame = HERO_ANIM.guard[0];
        if (disabled) frame = idle[0];
        if (e.anim) {
          const a = e.anim;
          a.t += dt;
          if (e.lunge && e.lunge.t < 0.45) frame = HERO_ANIM.walk[Math.floor(t * 12) % 4];
          else {
            const tt = Math.max(0, a.t - (a.delay || 0)) / (a.dur - (a.delay || 0));
            const idx = Math.min(a.frames.length - 1, Math.floor(tt * a.frames.length));
            frame = a.frames[idx];
            if (a.strike && idx === 1 && !a.hitSq) { a.hitSq = true; e.sqx = 1.16; e.sqy = 0.9; }
          }
          if (a.t >= a.dur) e.anim = null;
        }
        if (e.hitT > 0) { e.hitT -= dt; frame = HERO_ANIM.hurt[0]; }
        if (e.dead) frame = HERO_ANIM.ko[0];
        // esultanza alla vittoria
        if (this.state?.combat?.phase === 'victory' && !e.dead) {
          frame = Math.floor(t * 3 + e.phase) % 2 ? HERO_ANIM.cast[0] : HERO_ANIM.idle[0];
          sp.mesh.position.y = Math.abs(Math.sin(t * 6 + e.phase)) * 0.18;
        }
      } else {
        frame = Math.floor(t * 2.2 + e.phase) % 2;
        if (e.atkT > 0) { e.atkT -= dt; frame = 2; }
        if (e.hitT > 0) { e.hitT -= dt; frame = 3; }
        if (disabled) frame = frame === 3 ? 3 : 0;
      }
      sp.mesh.position.x = e.hitT > 0 ? Math.sin(t * 80) * 0.05 : 0;
      sp.setFrame(frame);
      // respiro e salti
      const breath = e.dead ? 1 : 1 + Math.sin(t * 2.4 + e.phase) * 0.015;
      sp.mesh.scale.set(e.sqx, e.sqy * breath, 1);
      e.hop = Math.max(0, e.hop - dt);
      const hopY = e.hop > 0 ? Math.sin((1 - e.hop / 0.5) * Math.PI) * 0.35 * Math.min(1, e.hop * 4) : 0;
      // fluttuazione per spettri / falene
      const fl = u.side === 'enemy' && ['specter', 'moth', 'queen'].includes(ENEMIES[u.enemyId]?.kind) ? 0.25 + Math.sin(t * 2 + e.phase) * 0.12 : 0;
      if (!(e.isHero && this.state?.combat?.phase === 'victory')) sp.mesh.position.y = fl + hopY;
      // morte: i nemici svaniscono, gli eroi restano in ginocchio (possono essere rianimati)
      if (e.dead && !e.isHero) {
        e.deathT = Math.min(1, e.deathT + dt * 1.2);
        sp.mat.transparent = true; sp.mat.opacity = 1 - e.deathT;
        sp.mesh.position.y = fl - e.deathT * 0.3;
        if (e.deathT >= 1) sp.visible = false;
      }
      // colore per stati
      const em = sp.mat.emissive;
      if (u.statuses?.frozen) em.set('#3a7aaa');
      else if (u.broken > 0) em.set('#4a3a10');
      else if (this.targets.has(u.id) && this.hoverId === u.id) em.set('#5a4a20');
      else if (this.targets.has(u.id)) em.setRGB(0.12 + Math.sin(t * 6) * 0.08, 0.1, 0.02);
      else em.set('#000000');
      sp.mat.emissiveIntensity = 1;
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
