// Motore HD-2D: renderer, post-processing (tilt-shift, bloom, color grading), sprite billboard
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const TiltShift = {
  uniforms: { tDiffuse: { value: null }, dir: { value: new THREE.Vector2(1, 0) }, focus: { value: 0.52 }, band: { value: 0.18 }, amount: { value: 2.6 }, res: { value: new THREE.Vector2(1, 1) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 dir; uniform float focus, band, amount; uniform vec2 res; varying vec2 vUv;
    void main(){
      float d = abs(vUv.y - focus);
      float k = smoothstep(band, band + 0.32, d) * amount;
      vec2 off = dir / res * k;
      vec4 c = texture2D(tDiffuse, vUv) * 0.2270270270;
      c += texture2D(tDiffuse, vUv + off * 1.3846153846) * 0.3162162162;
      c += texture2D(tDiffuse, vUv - off * 1.3846153846) * 0.3162162162;
      c += texture2D(tDiffuse, vUv + off * 3.2307692308) * 0.0702702703;
      c += texture2D(tDiffuse, vUv - off * 3.2307692308) * 0.0702702703;
      gl_FragColor = c;
    }`,
};

const Grade = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, vignette: { value: 0.55 }, warm: { value: new THREE.Color('#ffb070') }, cool: { value: new THREE.Color('#5a6aa8') }, flash: { value: 0 }, flashColor: { value: new THREE.Color('#ffffff') }, desat: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float time, vignette, flash, desat; uniform vec3 warm, cool, flashColor; varying vec2 vUv;
    float rand(vec2 co){ return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.299,0.587,0.114));
      // split toning: ombre fredde, luci calde
      c.rgb = mix(c.rgb, c.rgb * mix(cool, warm, smoothstep(0.05, 0.75, l)) * 1.3, 0.18);
      c.rgb = mix(c.rgb, vec3(l), desat);
      c.rgb = (c.rgb - 0.5) * 1.08 + 0.5;
      float v = distance(vUv, vec2(0.5, 0.48));
      c.rgb *= 1.0 - smoothstep(0.35, 0.95, v) * vignette;
      c.rgb += (rand(vUv * (time + 1.0)) - 0.5) * 0.035;
      c.rgb = mix(c.rgb, flashColor, flash);
      gl_FragColor = c;
    }`,
};

export class Engine {
  constructor(canvasEl) {
    this.renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.scene = null; this.camera = null;
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
    this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.42, 0.5, 0.86);
    this.tsH = new ShaderPass(TiltShift); this.tsV = new ShaderPass(TiltShift);
    this.tsV.uniforms.dir.value.set(0, 1);
    this.grade = new ShaderPass(Grade);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloom);
    this.composer.addPass(this.tsH);
    this.composer.addPass(this.tsV);
    this.composer.addPass(this.grade);
    this.composer.addPass(new OutputPass());
    this.clock = new THREE.Clock();
    this.updaters = new Set();
    this.flashT = 0;
    this.quality = localStorage.getItem('vael_quality') || 'alta';
    this.applyQuality();
    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.renderer.setAnimationLoop(() => this.frame());
  }
  applyQuality() {
    const low = this.quality === 'bassa';
    this.renderer.setPixelRatio(low ? 1 : Math.min(window.devicePixelRatio, 1.5));
    this.bloom.enabled = !low;
    this.renderer.shadowMap.enabled = !low;
    this.resize();
  }
  setQuality(q) { this.quality = q; try { localStorage.setItem('vael_quality', q); } catch {} this.applyQuality(); }
  setView(view) { // view: { scene, camera, update(dt,t), tilt:{focus,band,amount} }
    this.view = view;
    this.renderPass.scene = view.scene;
    this.renderPass.camera = view.camera;
    const tl = view.tilt || {};
    for (const p of [this.tsH, this.tsV]) {
      p.uniforms.focus.value = tl.focus ?? 0.52;
      p.uniforms.band.value = tl.band ?? 0.16;
      p.uniforms.amount.value = tl.amount ?? 2.6;
    }
    const bl = view.bloom || {};
    this.bloom.strength = bl.strength ?? 0.42;
    this.bloom.threshold = bl.threshold ?? 0.86;
    this.resize();
  }
  flash(color = '#ffffff', strength = 0.6) { this.grade.uniforms.flashColor.value.set(color); this.flashT = strength; }
  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    const pr = this.renderer.getPixelRatio();
    for (const p of [this.tsH, this.tsV]) p.uniforms.res.value.set(w * pr, h * pr);
    if (this.view) { this.view.camera.aspect = w / h; this.view.camera.updateProjectionMatrix(); this.view.onResize?.(w, h); }
  }
  frame() {
    const dt = Math.min(0.05, this.clock.getDelta());
    const t = this.clock.elapsedTime;
    if (!this.view) return;
    this.view.update?.(dt, t);
    for (const u of this.updaters) u(dt, t);
    this.grade.uniforms.time.value = t % 100;
    if (this.flashT > 0) { this.flashT = Math.max(0, this.flashT - dt * 2.5); }
    this.grade.uniforms.flash.value = this.flashT;
    this.composer.render();
  }
}

// ---------- sprite billboard pixel-art ----------
export function texFromCanvas(c) {
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Un piano verticale con texture a fotogrammi; ancorato ai piedi
export class PixelSprite extends THREE.Group {
  constructor(sheet, frameW, frameH, frames = 1, pxSize = 0.045, opts = {}) {
    super();
    this.frames = frames;
    this.tex = texFromCanvas(sheet);
    this.tex.repeat.set(1 / frames, 1);
    const mat = new THREE.MeshStandardMaterial({ map: this.tex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 1, metalness: 0, emissive: new THREE.Color(opts.emissive || '#000000'), emissiveIntensity: opts.emissiveIntensity ?? 0 });
    if (opts.emissiveMap) { mat.emissiveMap = this.tex; mat.emissive = new THREE.Color('#ffffff'); mat.emissiveIntensity = opts.emissiveMap; }
    this.mat = mat;
    const w = frameW * pxSize, h = frameH * pxSize;
    this.w = w; this.h = h;
    const geo = new THREE.PlaneGeometry(w, h);
    geo.translate(0, h / 2, 0);
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = !!opts.shadow;
    if (opts.shadow) {
      this.mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: this.tex, alphaTest: 0.5 });
    }
    this.add(this.mesh);
    if (opts.blob !== false) {
      const blob = new THREE.Mesh(new THREE.CircleGeometry(w * 0.32, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38, depthWrite: false }));
      blob.rotation.x = -Math.PI / 2; blob.position.y = 0.012;
      this.blob = blob;
      this.add(blob);
    }
    this.setFrame(0);
  }
  setFrame(i) { this.frame = i; this.tex.offset.x = i / this.frames; }
  dispose() { this.tex.dispose(); this.mat.dispose(); this.mesh.geometry.dispose(); }
}

export { THREE };
