import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';

/*
 * The look of the references, as a chain of passes over the linear HDR render:
 *   haze (candle light scattered in dusty air) → depth of field → bloom →
 *   finish (film tone curve, the sepia-gold grade measured from the owner's chosen images,
 *   vignette, grain, sRGB) → SMAA.
 * The renderer itself applies no tone mapping; the finish pass does all of it.
 */

const MAX_LIGHTS = 8;
const quadVS = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

/*
 * Haze: for every candle light, the light scattered toward the eye along the view ray, in closed
 * form (the integral of 1/d² along the ray up to the first surface). No shadows in it, but it
 * gives each flame its glow in the air and lets the far end of the corridor swim in warm dust.
 */
const HazeShader = {
  uniforms: {
    tDiffuse: { value: null },
    tDepth: { value: null },
    projInv: { value: new THREE.Matrix4() },
    lightPos: { value: Array.from({ length: MAX_LIGHTS }, () => new THREE.Vector3()) },
    lightCol: { value: Array.from({ length: MAX_LIGHTS }, () => new THREE.Vector3()) },
    count: { value: 0 },
    // 0.003 until 2026-11-23: the whole corridor stood in a beige veil, twice as bright as the trailer frames
    density: { value: 0.0014 },
    time: { value: 0 },
  },
  vertexShader: quadVS,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform sampler2D tDepth; uniform mat4 projInv;
    uniform vec3 lightPos[${MAX_LIGHTS}]; uniform vec3 lightCol[${MAX_LIGHTS}]; uniform int count; uniform float density; uniform float time;
    varying vec2 vUv;
    void main() {
      vec4 base = texture2D(tDiffuse, vUv);
      float d = texture2D(tDepth, vUv).x;
      vec4 v = projInv * vec4(vUv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
      vec3 p = v.xyz / v.w;
      float T = min(length(p), 60.0);
      vec3 dir = normalize(p);
      vec3 acc = vec3(0.0);
      for (int i = 0; i < ${MAX_LIGHTS}; i++) {
        if (i >= count) break;
        vec3 q = lightPos[i];
        float h = dot(dir, q);
        float c = sqrt(max(dot(q, q) - h * h, 0.0) + 0.14);
        acc += lightCol[i] * (atan((T - h) / c) - atan(-h / c)) / c;
      }
      // the dust is not even: slow drifts of thicker air
      float n = fract(sin(dot(vUv * vec2(91.7, 57.3) + floor(time * 24.0), vec2(12.9898, 78.233))) * 43758.5453);
      gl_FragColor = vec4(base.rgb + acc * density * (0.97 + 0.06 * n), base.a);
    }`,
};

/* Depth of field: the hand and vessel (closer than `sharpNear`) stay sharp; the corridor softens with distance. */
const DofShader = {
  uniforms: {
    tDiffuse: { value: null },
    tDepth: { value: null },
    near: { value: 0.03 },
    far: { value: 120 },
    aperture: { value: 16 },
    maxBlur: { value: 5 },
    resolution: { value: new THREE.Vector2(1, 1) },
    focus: { value: 4 },
    sharpNear: { value: 1.0 },
    veil: { value: 0 }, // 0..1: while the flask reacts, everything behind it dims and blurs
  },
  vertexShader: quadVS,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform sampler2D tDepth;
    uniform float near; uniform float far; uniform float aperture; uniform float maxBlur; uniform float focus; uniform float sharpNear; uniform float veil;
    uniform vec2 resolution;
    varying vec2 vUv;
    float dist(vec2 uv) { float d = texture2D(tDepth, uv).x; return near * far / (far - d * (far - near)); }
    float coc(float z) { if (z < sharpNear) return 0.0; return clamp(max(abs(1.0 / focus - 1.0 / z) * aperture, veil * maxBlur * 2.4), 0.0, maxBlur * (1.0 + 1.6 * veil)); }
    void main() {
      vec4 base = texture2D(tDiffuse, vUv);
      float z0 = dist(vUv);
      float c = coc(z0);
      // the dimming stops at whatever is held close: the flask, the hand
      float dim = mix(1.0, 0.3, veil * step(sharpNear, z0));
      if (c < 0.6) { gl_FragColor = vec4(base.rgb * dim, base.a); return; }
      vec3 acc = base.rgb;
      float wsum = 1.0;
      for (int i = 0; i < 32; i++) {
        float fi = float(i);
        float r = sqrt((fi + 0.5) / 32.0) * c;
        float a = fi * 2.39996;
        vec2 uv = vUv + vec2(cos(a), sin(a)) * r / resolution;
        float sc = coc(dist(uv));
        float w = clamp(sc - r + 1.0, 0.0, 1.0);
        acc += texture2D(tDiffuse, uv).rgb * w;
        wsum += w;
      }
      gl_FragColor = vec4(acc / wsum * dim, base.a);
    }`,
};

const FinishShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    aspect: { value: 1 },
    exposure: { value: 4.3 },
    grade: { value: 0.85 }, // how far toward the references' sepia-gold
    close: { value: 0 }, // 0..1: the edges close in while you hold the Shadow's gaze
    pale: { value: 0 }, // 0..1: the first whitening, after you have faced it
  },
  vertexShader: quadVS,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float time; uniform float aspect; uniform float exposure; uniform float grade; uniform float close; uniform float pale;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    vec3 film(vec3 x) { // ACES fit (Narkowicz)
      return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
    }
    void main() {
      vec2 c = vUv - 0.5;
      // a breath of lens colour toward the edges
      vec2 off = c * 0.0022 * (1.0 + close * 2.0);
      vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      col = film(col * exposure);
      col = pow(col, vec3(1.0 / 2.2));
      // The grade, measured from the chosen Midjourney frames: olive-black shadows (blue at half of
      // green), brown-gold middles (red a fifth over green), pale cream highlights.
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      float rg = 1.0 + 0.21 * smoothstep(0.0, 0.2, l) * (1.0 - 0.9 * smoothstep(0.55, 1.0, l));
      float bg = mix(0.46, 0.86, l);
      vec3 tint = vec3(rg, 1.0, bg);
      vec3 toned = tint * (l / dot(tint, vec3(0.299, 0.587, 0.114)));
      // strong reds keep their colour (the crimson mask, the drum, the wax, later the red work)
      float redness = smoothstep(0.22, 0.6, (col.r - max(col.g, col.b)) / max(col.r, 1e-3));
      // and so does strong gold (the last stage of the work)
      redness = max(redness, smoothstep(0.55, 0.8, (col.g - col.b) / max(col.g, 1e-3)) * smoothstep(0.25, 0.5, col.r));
      col = mix(col, toned, grade * (1.0 - 0.85 * redness));
      // after the first facing, a little of the colour drains toward silver
      col = mix(col, vec3(l) * vec3(1.0, 0.99, 0.95), pale * 0.35);
      // crushed, slightly lifted blacks: the toe of the references
      col = max(col - 0.012, 0.0) * 1.03;
      // the vignette is gentler at the bottom, where the hand is
      float rv = length(vec2(c.x, c.y * (c.y < 0.0 ? 0.72 : 1.0)));
      float vig = smoothstep(0.86 - close * 0.42, 0.22 - close * 0.12, rv);
      col *= mix(0.3 - close * 0.22, 1.0, vig);
      col += (hash(vUv * 1000.0 + fract(time * 7.0)) - 0.5) * 0.035 * (0.5 + 0.5 * (1.0 - l));
      gl_FragColor = vec4(col, 1.0);
    }`,
};

/*
 * Draws the scene into its own target (colour and depth), then writes it into the chain through the
 * haze shader. The depth texture stays readable for the lens pass, because nothing later draws into
 * this target.
 */
class SceneHazePass extends Pass {
  constructor(scene, camera, target) {
    super();
    this.scene = scene;
    this.camera = camera;
    this.target = target;
    this.material = new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.clone(HazeShader.uniforms), vertexShader: HazeShader.vertexShader, fragmentShader: HazeShader.fragmentShader, depthTest: false, depthWrite: false });
    this.uniforms = this.material.uniforms;
    this.quad = new FullScreenQuad(this.material);
    this.needsSwap = true;
  }
  render(renderer, writeBuffer) {
    renderer.setRenderTarget(this.target);
    renderer.clear();
    renderer.render(this.scene, this.camera);
    this.uniforms.tDiffuse.value = this.target.texture;
    this.uniforms.tDepth.value = this.target.depthTexture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }
  dispose() {
    this.material.dispose();
    this.quad.dispose();
  }
}

const BLOOM = 0.55;
export const makePost = (renderer, scene, camera) => {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const sceneRT = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(size.x, size.y) });
  const composer = new EffectComposer(renderer);
  const haze = new SceneHazePass(scene, camera, sceneRT);
  composer.addPass(haze);
  const dof = new ShaderPass(DofShader);
  dof.material.depthTest = false;
  dof.uniforms.tDepth.value = sceneRT.depthTexture;
  dof.uniforms.near.value = camera.near;
  dof.uniforms.far.value = camera.far;
  composer.addPass(dof);
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), BLOOM, 0.7, 0.9);
  // Nothing brighter than 6 (the flames are 5) feeds the bloom: one tiny hot highlight (the flask's light
  // mirrored in the near water reached 240) otherwise floods half the frame with a beige veil.
  bloom.materialHighPassFilter.fragmentShader = bloom.materialHighPassFilter.fragmentShader.replace(
    'vec4 texel = texture2D( tDiffuse, vUv );',
    'vec4 texel = texture2D( tDiffuse, vUv );\n\t\t\ttexel.rgb *= min(1.0, 6.0 / max(max(texel.r, texel.g), max(texel.b, 1e-4)));',
  );
  bloom.materialHighPassFilter.needsUpdate = true;
  composer.addPass(bloom);
  const finish = new ShaderPass(FinishShader);
  composer.addPass(finish);
  const smaa = new SMAAPass();
  composer.addPass(smaa);

  const _v = new THREE.Vector3();
  /** lights: [{ light, weight }] — at most MAX_LIGHTS, nearest first is the caller's job. */
  const setHaze = (list) => {
    const u = haze.uniforms;
    const n = Math.min(MAX_LIGHTS, list.length);
    for (let i = 0; i < n; i++) {
      const { light, weight } = list[i];
      light.getWorldPosition(_v).applyMatrix4(camera.matrixWorldInverse);
      u.lightPos.value[i].copy(_v);
      u.lightCol.value[i].set(light.color.r, light.color.g, light.color.b).multiplyScalar(light.intensity * weight);
    }
    u.count.value = n;
    u.projInv.value.copy(camera.projectionMatrixInverse);
  };

  const resize = () => {
    const pr = renderer.getPixelRatio();
    composer.setPixelRatio(pr);
    composer.setSize(innerWidth, innerHeight);
    // the bloom's blur is a fixed number of pixels: on a small screen drawn at pixel ratio 1 (phones) it
    // covers far more of the view than on a desktop, so the glow round every flame grows; scale it down
    bloom.strength = BLOOM * THREE.MathUtils.clamp(Math.sqrt((innerHeight * pr) / 1400), 0.55, 1);
    sceneRT.setSize(Math.round(innerWidth * pr), Math.round(innerHeight * pr));
    finish.uniforms.aspect.value = innerWidth / innerHeight;
    dof.uniforms.resolution.value.set(innerWidth * pr, innerHeight * pr);
    const k = (innerHeight * pr) / 1080; // blur sizes are in pixels
    dof.uniforms.aperture.value = 14 * k;
    dof.uniforms.maxBlur.value = 3.4 * k;
  };
  resize();
  return { composer, haze, dof, bloom, finish, setHaze, resize, sceneRT };
};

/* ───────── sound: everything synthesized (the songs are apart, music.js) ───────── */

/* The bed of atmosphere under the game: the low drone, the air, the clock in the house, the hum of the cave.
 * 0 leaves only the footsteps and the effects (2026-11-26, the owner); 1 is as it was. */
const AMBIENCE = 0;

export class Sound {
  constructor() {
    this.ctx = null;
  }

  start() {
    if (this.ctx) return;
    const ctx = (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 4);
    this.master.connect(ctx.destination);
    // a long, dark room: feedback delays through a low-pass
    this.wet = ctx.createGain();
    this.wet.gain.value = 0.4;
    const d1 = ctx.createDelay(1), d2 = ctx.createDelay(1);
    d1.delayTime.value = 0.171;
    d2.delayTime.value = 0.263;
    const fb = ctx.createGain();
    fb.gain.value = 0.5;
    const damp = ctx.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = 1700;
    this.wet.connect(d1);
    d1.connect(d2);
    d2.connect(damp);
    damp.connect(fb);
    fb.connect(d1);
    damp.connect(this.master);
    this.bus = ctx.createGain();
    this.bus.connect(this.master);
    this.bus.connect(this.wet);
    const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = b;
    this._drone();
    this._air();
    this.breathGain = this._band(520, 0.7);
    this.nextTick = ctx.currentTime + 1;
    this.tock = false;
  }

  _band(freq, q) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    src.start();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = 0;
    src.connect(f);
    f.connect(g);
    g.connect(this.bus);
    g.filter = f;
    return g;
  }

  _drone() {
    const ctx = this.ctx;
    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = 0.05 * AMBIENCE;
    this.droneGain.connect(this.bus);
    [32.7, 49.0, 65.4, 98.0].forEach((f, i) => {
      [0.996, 1.004].forEach((det) => {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = f * det;
        const og = ctx.createGain();
        og.gain.value = i === 3 ? 0.12 : 0.5;
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.04 + i * 0.025;
        const lg = ctx.createGain();
        lg.gain.value = og.gain.value * 0.45;
        lfo.connect(lg);
        lg.connect(og.gain);
        o.connect(og);
        og.connect(this.droneGain);
        o.start();
        lfo.start();
      });
    });
  }

  _air() {
    const g = this._band(260, 0.5);
    g.gain.value = 0.035 * AMBIENCE;
  }

  _click(freq, amp, dur, pan = 0) {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 0.6, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(amp, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.bus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  /** A footfall on old boards: a dull knock and a short creak of grit. stone: on rock, a tighter knock and grit. */
  step(strength = 1, stone = false) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime((stone ? 140 : 95) + Math.random() * 20, t);
    o.frequency.exponentialRampToValueAtTime(stone ? 70 : 48, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime((stone ? 0.09 : 0.16) * strength, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (stone ? 0.14 : 0.2));
    o.connect(g);
    g.connect(this.bus);
    o.start(t);
    o.stop(t + 0.25);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = (stone ? 2600 : 1400) + Math.random() * 900;
    f.Q.value = 2;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0, t);
    ng.gain.linearRampToValueAtTime((stone ? 0.05 : 0.03) * strength, t + 0.01);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    src.connect(f);
    f.connect(ng);
    ng.connect(this.bus);
    src.start(t, Math.random());
    src.stop(t + 0.12);
    if (stone) (g.connect(this.wet), ng.connect(this.wet)); // rock gives it back
  }

  /** A child's footfall: small, light, quick. amp 0..1 (how near). */
  childStep(amp = 0.5) {
    if (!this.ctx || amp < 0.02) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 900 + Math.random() * 500;
    f.Q.value = 1.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.09 * amp, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    src.connect(f);
    f.connect(g);
    g.connect(this.bus);
    g.connect(this.wet);
    src.start(t, Math.random());
    src.stop(t + 0.12);
  }

  /** The stone hum of the cave, deep and slow: set every frame, 0 is silent. */
  cave(amount) {
    if (!this.ctx || (!this.caveGain && amount <= 0)) return;
    const ctx = this.ctx, t = ctx.currentTime;
    if (!this.caveGain) {
      this.caveGain = ctx.createGain();
      this.caveGain.gain.value = 0;
      this.caveGain.connect(this.bus);
      // two low tones a hair apart, so it swells and falls; and the air moving in the rock
      for (const f of [41.2, 41.55]) {
        const o = ctx.createOscillator();
        o.frequency.value = f;
        o.connect(this.caveGain);
        o.start();
      }
      const air = this._band(110, 1.6);
      air.gain.value = 1.4;
      air.disconnect();
      air.connect(this.caveGain);
    }
    this.caveGain.gain.setTargetAtTime(amount * 0.045 * AMBIENCE, t, 1.2);
  }

  /**
   * The Shadow's footfall: your own step, a little late, lower and duller, from behind.
   * amp 0..1 (its distance); it is heard more than it is seen.
   */
  echoStep(amp = 0.5) {
    if (!this.ctx || amp < 0.01) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.06;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(70 + Math.random() * 12, t);
    o.frequency.exponentialRampToValueAtTime(36, t + 0.16);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.13 * amp, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    o.connect(g);
    g.connect(lp);
    lp.connect(this.bus);
    lp.connect(this.wet); // more room than your own steps: it is further off
    o.start(t);
    o.stop(t + 0.35);
  }

  /** The meeting: a long low breath out, as it passes into you. */
  exhale() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(900, t);
    f.frequency.exponentialRampToValueAtTime(180, t + 2.6);
    f.Q.value = 0.9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16, t + 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
    src.connect(f);
    f.connect(g);
    g.connect(this.bus);
    g.connect(this.wet);
    src.start(t);
    src.stop(t + 3);
  }

  /** The sack scraping over the boards as it is dragged: set every frame, 0 is silent. */
  drag(amount) {
    if (!this.ctx) return;
    if (!this.dragGain) {
      this.dragGain = this._band(620, 0.8);
      this.dragGain.filter.type = 'bandpass';
    }
    const t = this.ctx.currentTime;
    this.dragGain.gain.setTargetAtTime(amount * 0.14, t, 0.08);
    this.dragGain.filter.frequency.setTargetAtTime(420 + amount * 380, t, 0.1);
  }

  /** A door slammed somewhere along the corridor: a deep knock, a rattle of the latch. amp 0..1 (how near). */
  slam(amp = 0.6) {
    if (!this.ctx || amp < 0.01) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(70, t);
    o.frequency.exponentialRampToValueAtTime(34, t + 0.35);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.5 * amp, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g);
    g.connect(this.bus);
    g.connect(this.wet);
    o.start(t);
    o.stop(t + 0.55);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 900;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0, t);
    ng.gain.linearRampToValueAtTime(0.35 * amp, t + 0.004);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    src.connect(f);
    f.connect(ng);
    ng.connect(this.bus);
    ng.connect(this.wet);
    src.start(t, Math.random());
    src.stop(t + 0.2);
    setTimeout(() => this._click(2400, 0.02 * amp, 0.05), 120); // the latch
  }

  /** The fire in the furnace: a low roar and the crackle of it. Set every frame, 0 is silent. */
  fire(amount, dt = 1 / 60) {
    if (!this.ctx) return;
    if (!this.fireGain) ((this.fireGain = this._band(150, 0.35)), (this.fireHiss = this._band(1900, 0.6)));
    const t = this.ctx.currentTime;
    this.fireGain.gain.setTargetAtTime(amount * 0.3, t, 0.2);
    this.fireHiss.gain.setTargetAtTime(amount * amount * 0.02, t, 0.2);
    if (Math.random() < amount * dt * 9) this._click(500 + Math.random() * 2600, 0.004 + 0.02 * Math.random() * amount, 0.02 + 0.03 * Math.random());
  }

  /** The glass ringing under the heat, higher as it rises: k 0..1, amp 0 is silent. It goes past the room (hush). */
  ring(k, amp) {
    if (!this.ctx || (!this.ringGain && amp <= 0)) return;
    const ctx = this.ctx, t = ctx.currentTime;
    if (!this.ringGain) {
      this.ringGain = ctx.createGain();
      this.ringGain.gain.value = 0;
      this.ringGain.connect(this.master);
      this.ringGain.connect(this.wet);
      this.ringOsc = [1, 2.004, 2.76].map((m, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.userMul = m;
        g.gain.value = [1, 0.35, 0.12][i];
        o.connect(g);
        g.connect(this.ringGain);
        o.start();
        return o;
      });
    }
    const f = 174.6 * Math.pow(2, 1.6 * k);
    for (const o of this.ringOsc) o.frequency.setTargetAtTime(f * o.userMul, t, 0.25);
    this.ringGain.gain.setTargetAtTime(amp * 0.05, t, 0.3);
  }

  /** Everything but the ringing glass goes quiet: k 0..1. */
  hush(k) {
    this.hushed = k; // (the song goes quiet with the room: main.js)
    if (this.ctx) this.bus.gain.setTargetAtTime(1 - 0.94 * k, this.ctx.currentTime, 0.4);
  }

  /** A voice without a voice: breath shaped like speech, for as long as a whispered line takes. */
  hiss(amp = 0.5, seconds = 2) {
    if (!this.ctx || amp < 0.01) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 3.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    f.frequency.setValueAtTime(900, t);
    for (let k = 0.05; k < seconds; k += 0.13 + Math.random() * 0.1) {
      f.frequency.linearRampToValueAtTime(600 + Math.random() * 2200, t + k);
      g.gain.linearRampToValueAtTime(amp * 0.07 * (Math.random() < 0.2 ? 0.05 : 0.4 + 0.6 * Math.random()), t + k);
    }
    g.gain.linearRampToValueAtTime(0, t + seconds + 0.3);
    src.connect(f);
    f.connect(g);
    g.connect(this.bus);
    g.connect(this.wet);
    src.start(t, Math.random());
    src.stop(t + seconds + 0.4);
  }

  /** A heartbeat: two low thumps. */
  heart(amp) {
    if (!this.ctx || amp < 0.004) return;
    const ctx = this.ctx;
    for (const [dt, a, f] of [[0, 1, 62], [0.19, 0.7, 52]]) {
      const t = ctx.currentTime + dt;
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.16);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(amp * a, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
      o.connect(g);
      g.connect(this.bus);
      o.start(t);
      o.stop(t + 0.4);
    }
  }

  /** A struck glass tone: one per stage of the work. */
  glass(freq = 523.25, amp = 0.1, decay = 5) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    [[1, 1], [2.76, 0.42], [5.4, 0.2], [8.93, 0.08]].forEach(([m, a], k) => {
      const o = ctx.createOscillator();
      o.frequency.value = freq * m;
      const g = ctx.createGain();
      const d = decay / (1 + k * 0.9);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(amp * a, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d * 2);
      o.connect(g);
      g.connect(this.bus);
      o.start(t);
      o.stop(t + d * 2 + 0.1);
    });
  }

  /**
   * Called every frame. breath 0..1: the sack's breath (already scaled by nearness);
   * dread 0..1: the Shadow's nearness while you face it, which swallows the room's sound.
   */
  update(breath, dread) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    this.breathGain.gain.setTargetAtTime(breath * 0.11, t, 0.12);
    this.breathGain.filter.frequency.setTargetAtTime(380 + breath * 320, t, 0.2);
    this.droneGain.gain.setTargetAtTime(0.05 * AMBIENCE + dread * 0.09, t, 0.5);
    // the clock in the house, somewhere behind you; it stops while you hold the gaze
    if (t >= this.nextTick) {
      if (AMBIENCE && dread < 0.5) this._click(this.tock ? 1250 : 1650, 0.012, 0.03);
      this.tock = !this.tock;
      this.nextTick = t + 1;
    }
  }
}
