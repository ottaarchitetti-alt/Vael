// Dadi: d20 3D per le prove narrative, d6 in CSS 3D per la Riserva del Cammino
import * as THREE from 'three';
import { STAT_NAMES } from '/shared/rules.js';

let r3 = null;
function d20Renderer() {
  if (r3) return r3;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 260;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(260, 260, false);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  cam.position.set(0, 0, 6);
  scene.add(new THREE.AmbientLight('#8a7ab8', 1.2));
  const key = new THREE.DirectionalLight('#ffd8a0', 3); key.position.set(2, 3, 4); scene.add(key);
  const rim = new THREE.PointLight('#ff7a2f', 6, 10); rim.position.set(-2, -1, 2); scene.add(rim);
  const geo = new THREE.IcosahedronGeometry(1.35, 0);
  const mat = new THREE.MeshStandardMaterial({ color: '#c9a24a', metalness: 0.6, roughness: 0.35, flatShading: true, emissive: '#3a2008', emissiveIntensity: 0.6 });
  const die = new THREE.Mesh(geo, mat);
  die.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: '#fff2b0' })));
  scene.add(die);
  r3 = { canvas, renderer, scene, cam, die, mat };
  return r3;
}

// Mostra un tiro d20 animato. roll: {nat, bonus, total, dc, success, stat, name}
export function showD20(container, roll, onDone) {
  const R = d20Renderer();
  container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'd20wrap';
  wrap.appendChild(R.canvas);
  const num = document.createElement('div');
  num.className = 'd20num';
  wrap.appendChild(num);
  const info = document.createElement('div');
  info.className = 'd20info';
  info.innerHTML = `<div class="d20who">${roll.name} — prova di ${STAT_NAMES[roll.stat]}</div><div class="d20dc">CD ${roll.dc}</div>`;
  container.appendChild(wrap);
  container.appendChild(info);
  container.classList.add('show');
  const dur = 1500;
  const t0 = performance.now();
  const ax = new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize();
  R.mat.color.set('#c9a24a');
  const tick = (now) => {
    const k = Math.min(1, (now - t0) / dur);
    const speed = (1 - k) * (1 - k) * 0.55;
    R.die.rotateOnAxis(ax, speed);
    R.die.position.y = Math.abs(Math.sin(k * Math.PI * 3)) * (1 - k) * 0.6;
    if (k < 0.9) num.textContent = 1 + Math.floor(Math.random() * 20);
    R.renderer.render(R.scene, R.cam);
    if (k < 1) requestAnimationFrame(tick);
    else {
      num.textContent = roll.nat;
      num.classList.add('final');
      if (roll.nat === 20) wrap.classList.add('nat20');
      if (roll.nat === 1) wrap.classList.add('nat1');
      R.mat.color.set(roll.success ? '#e8c060' : '#8a3a3a');
      R.renderer.render(R.scene, R.cam);
      const res = document.createElement('div');
      res.className = 'd20res ' + (roll.success ? 'ok' : 'ko');
      res.innerHTML = `<span class="calc">${roll.nat} ${roll.bonus >= 0 ? '+' : '−'} ${Math.abs(roll.bonus)} = <b>${roll.total}</b></span><span class="verdict">${roll.nat === 20 ? 'CRITICO! ' : roll.nat === 1 ? 'DISASTRO! ' : ''}${roll.success ? 'SUCCESSO' : 'FALLIMENTO'}</span>`;
      info.appendChild(res);
      onDone?.();
    }
  };
  requestAnimationFrame(tick);
}

// Dado a 6 facce in CSS 3D
const FACE_ROT = { 1: 'rotateX(0deg) rotateY(0deg)', 2: 'rotateX(-90deg)', 3: 'rotateY(90deg)', 4: 'rotateY(-90deg)', 5: 'rotateX(90deg)', 6: 'rotateY(180deg)' };
const PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
export function d6Html(value, rolling, cls = '') {
  const face = (n, pos) => `<div class="face f${pos}">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => `<span class="${PIPS[n].includes(i) ? 'pip' : ''}"></span>`).join('')}</div>`;
  return `<div class="d6 ${cls}"><div class="cube ${rolling ? 'rolling' : ''}" style="--final:${FACE_ROT[value] || FACE_ROT[1]}">${face(1, 1)}${face(2, 2)}${face(3, 3)}${face(4, 4)}${face(5, 5)}${face(6, 6)}</div></div>`;
}
