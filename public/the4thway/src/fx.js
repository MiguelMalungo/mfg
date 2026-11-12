import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';

/* Post-processing (bloom, vignette, grain, "sleep" desaturation) and synthesized sound. */

const FinishShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    sleep: { value: 0 },
    aspect: { value: 1 },
    lake: { value: 0 },
    dawn: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float time; uniform float sleep; uniform float aspect; uniform float lake; uniform float dawn;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 c = vUv - 0.5;
      c.x *= aspect;
      float r = length(c);
      // while an "I" has the controls, the edges blur and drain of colour
      vec2 off = c * sleep * 0.012;
      vec3 col = vec3(
        texture2D(tDiffuse, vUv + off).r,
        texture2D(tDiffuse, vUv).g,
        texture2D(tDiffuse, vUv - off).b);
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      // The grade of the key art: a silver, nearly monochrome night in which only light itself
      // keeps its colour (the flame, the lotus, the rings, the green of the tree).
      float warm = clamp((col.r - col.b) * 2.5, 0.0, 1.0);
      float mx = max(col.r, max(col.g, col.b));
      float mnc = min(col.r, min(col.g, col.b));
      float vivid = smoothstep(0.45, 0.8, (mx - mnc) / max(mx, 1e-4)) * smoothstep(0.02, 0.12, mx);
      float keep = max(max(warm, vivid), smoothstep(0.35, 1.1, mx));
      col = mix(vec3(lum) * vec3(0.95, 1.0, 1.07), col, mix(mix(mix(0.5, 1.0, keep), 1.25, lake), 1.1, dawn));
      // over the lotus's lake (refs/lotus-beam.webp): an ember grade, the light amber, the shadows teal-black
      col = mix(col, col * mix(vec3(0.75, 0.9, 1.0), vec3(1.15, 0.78, 0.5), smoothstep(0.02, 0.5, lum)), lake * 0.8);
      // lifted, slightly cool blacks, like haze in front of the lens
      col = col * 0.97 + vec3(0.0035, 0.0045, 0.006);
      col = mix(col, vec3(lum) * vec3(0.85, 0.9, 1.0), sleep * 0.75);
      float vig = smoothstep(0.95, 0.25 - sleep * 0.15, r);
      col *= mix(0.42, 1.0, vig);
      col += (hash(vUv * 1000.0 + fract(time * 7.0)) - 0.5) * 0.028;
      gl_FragColor = vec4(col, 1.0);
    }`,
};

/*
 * Depth of field, like a camera lens: whatever is at the centre of the view is in focus; nearer and
 * farther things soften. The hand and the lantern (closer than 1.3 m) always stay sharp.
 * It reads the depth the main render already wrote (a DepthTexture on the composer's targets),
 * so it costs no extra scene render. 32 taps on a golden-angle disc; a sample only spreads into
 * a pixel if its own blur is at least that wide, so sharp things don't bleed onto blurred ones.
 */
const DofShader = {
  uniforms: {
    tDiffuse: { value: null },
    tDepth: { value: null },
    near: { value: 0.05 },
    far: { value: 4000 },
    aperture: { value: 16 },
    maxBlur: { value: 5 },
    resolution: { value: new THREE.Vector2(1, 1) },
    focus: { value: 8 },
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform sampler2D tDepth;
    uniform float near; uniform float far; uniform float aperture; uniform float maxBlur; uniform float focus;
    uniform vec2 resolution;
    varying vec2 vUv;
    float dist(vec2 uv) {
      float d = texture2D(tDepth, uv).x;
      return near * far / (far - d * (far - near));
    }
    float coc(float z) {
      if (z < 1.3) return 0.0;
      return clamp(abs(1.0 / focus - 1.0 / z) * aperture, 0.0, maxBlur);
    }
    void main() {
      vec4 base = texture2D(tDiffuse, vUv);
      float c = coc(dist(vUv));
      if (c < 0.6) { gl_FragColor = base; return; }
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
      gl_FragColor = vec4(acc / wsum, base.a);
    }`,
};

/*
 * Light shafts (the finale's diamond, refs/finale-diamond.webp): the frame's brightest pixels are
 * smeared outward from the light's position on screen, so the light breaks into shafts around
 * whatever stands in front of it (the crowd, the player's arm). One pass, no extra scene render.
 */
const ShaftShader = {
  uniforms: {
    tDiffuse: { value: null },
    lightPos: { value: new THREE.Vector2(0.5, 0.7) },
    shafts: { value: 0 },
    threshold: { value: 1.05 },
    tint: { value: new THREE.Color(1.0, 0.82, 0.55) },
    time: { value: 0 },
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 lightPos; uniform float shafts; uniform float threshold; uniform vec3 tint; uniform float time;
    varying vec2 vUv;
    void main() {
      vec4 base = texture2D(tDiffuse, vUv);
      const int N = 48;
      vec2 delta = (vUv - lightPos) * 0.9 / float(N);
      // jitter the start so the steps don't band
      float j = fract(sin(dot(vUv * 1000.0 + time, vec2(12.9898, 78.233))) * 43758.5453);
      vec2 uv = vUv - delta * j;
      float illum = 1.0;
      vec3 acc = vec3(0.0);
      for (int i = 0; i < N; i++) {
        uv -= delta;
        vec3 smp = texture2D(tDiffuse, clamp(uv, 0.0, 1.0)).rgb;
        acc += max(smp - threshold, 0.0) * illum;
        illum *= 0.965;
      }
      gl_FragColor = vec4(base.rgb + acc * (0.5 / float(N)) * 3.2 * tint * shafts, base.a);
    }`,
};

class DofPass extends ShaderPass {
  constructor() {
    super(DofShader);
  }
  render(renderer, writeBuffer, readBuffer, dt, mask) {
    this.uniforms.tDepth.value = readBuffer.depthTexture;
    super.render(renderer, writeBuffer, readBuffer, dt, mask);
  }
}

export const makePost = (renderer, scene, camera) => {
  const composer = new EffectComposer(renderer);
  // keep the main render's depth for the depth of field
  for (const rt of [composer.renderTarget1, composer.renderTarget2]) rt.depthTexture = new THREE.DepthTexture(rt.width, rt.height);
  composer.addPass(new RenderPass(scene, camera));
  const dof = new DofPass();
  dof.uniforms.near.value = camera.near;
  dof.uniforms.far.value = camera.far;
  composer.addPass(dof);
  const shaft = new ShaderPass(ShaftShader);
  shaft.enabled = false; // only in the finale
  composer.addPass(shaft);
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.36, 0.5, 0.92);
  composer.addPass(bloom);
  const finish = new ShaderPass(FinishShader);
  composer.addPass(finish);
  composer.addPass(new OutputPass());
  // anti-aliasing last, on the final image, so thin threads and edges don't crawl
  const smaa = new SMAAPass();
  composer.addPass(smaa);
  const resize = () => {
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(innerWidth, innerHeight);
    finish.uniforms.aspect.value = innerWidth / innerHeight;
    const pr = renderer.getPixelRatio();
    dof.uniforms.resolution.value.set(innerWidth * pr, innerHeight * pr);
    // blur sizes are in pixels: scale them with the height of the image
    const k = (innerHeight * pr) / 1080;
    // gentle: the distance softens, it doesn't smear
    dof.uniforms.aperture.value = 11 * k;
    dof.uniforms.maxBlur.value = 2.8 * k;
  };
  resize();
  return { composer, bloom, finish, dof, shaft, resize };
};

/* ───────── sound ───────── */

export class Sound {
  constructor() {
    this.ctx = null;
  }

  start() {
    if (this.ctx) return;
    const ctx = (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 3);
    // "sleep" muffles everything through a low-pass
    this.muffle = ctx.createBiquadFilter();
    this.muffle.type = 'lowpass';
    this.muffle.frequency.value = 18000;
    this.muffle.connect(this.master);
    this.master.connect(ctx.destination);
    // a simple feedback-delay reverb
    this.wet = ctx.createGain();
    this.wet.gain.value = 0.32;
    const d1 = ctx.createDelay(1);
    const d2 = ctx.createDelay(1);
    d1.delayTime.value = 0.137;
    d2.delayTime.value = 0.211;
    const fb = ctx.createGain();
    fb.gain.value = 0.55;
    const damp = ctx.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = 2600;
    this.wet.connect(d1);
    d1.connect(d2);
    d2.connect(damp);
    damp.connect(fb);
    fb.connect(d1);
    damp.connect(this.muffle);
    this.bus = ctx.createGain();
    this.bus.connect(this.muffle);
    this.bus.connect(this.wet);
    this.noiseBuf = this._noise(2);
    this._drone();
    this._wind();
    this._breath();
  }

  _noise(sec) {
    const ctx = this.ctx;
    const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  _loopNoise() {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    src.start();
    return src;
  }

  _drone() {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.value = 0.05;
    g.connect(this.bus);
    [36.7, 55.0, 73.4, 110.0].forEach((f, i) => {
      [0.997, 1.003].forEach((det) => {
        const o = ctx.createOscillator();
        o.type = i === 3 ? 'triangle' : 'sine';
        o.frequency.value = f * det;
        const og = ctx.createGain();
        og.gain.value = i === 3 ? 0.18 : 0.5;
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.05 + i * 0.03;
        const lg = ctx.createGain();
        lg.gain.value = og.gain.value * 0.4;
        lfo.connect(lg);
        lg.connect(og.gain);
        o.connect(og);
        og.connect(g);
        o.start();
        lfo.start();
      });
    });
  }

  _wind() {
    const ctx = this.ctx;
    const src = this._loopNoise();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 420;
    f.Q.value = 0.6;
    const g = ctx.createGain();
    g.gain.value = 0.05;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lg = ctx.createGain();
    lg.gain.value = 180;
    lfo.connect(lg);
    lg.connect(f.frequency);
    lfo.start();
    src.connect(f);
    f.connect(g);
    g.connect(this.bus);
  }

  _breath() {
    const ctx = this.ctx;
    const src = this._loopNoise();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 900;
    f.Q.value = 0.8;
    this.breathGain = ctx.createGain();
    this.breathGain.gain.value = 0;
    src.connect(f);
    f.connect(this.breathGain);
    this.breathGain.connect(this.bus);
  }

  /** Short wading splash at each stride. */
  step(strength = 1) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 600 + Math.random() * 500;
    f.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.09 * strength, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    src.connect(f);
    f.connect(g);
    g.connect(this.bus);
    src.start(t, Math.random());
    src.stop(t + 0.4);
  }

  /** Bell with inharmonic partials. */
  bell(freq = 293.7, amp = 0.12, decay = 4) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    [[1, 1], [2.01, 0.55], [2.76, 0.4], [4.07, 0.22], [5.4, 0.14]].forEach(([m, a], k) => {
      const o = ctx.createOscillator();
      o.frequency.value = freq * m;
      const g = ctx.createGain();
      const d = decay / (1 + k * 0.7);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(amp * a, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d * 2);
      o.connect(g);
      g.connect(this.bus);
      o.start(t);
      o.stop(t + d * 2 + 0.1);
    });
  }

  /** Low heartbeat thump from the lotus. */
  thump(amp) {
    if (!this.ctx || amp < 0.005) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(72, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.18);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(amp, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    o.connect(g);
    g.connect(this.bus);
    o.start(t);
    o.stop(t + 0.5);
  }

  /** A held voice (the lotus's pillar): set its pitch and loudness every frame; 0 silences it. */
  tone(freq, amp) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    if (!this.toneGain) {
      this.toneGain = ctx.createGain();
      this.toneGain.gain.value = 0;
      this.toneGain.connect(this.bus);
      this.toneOsc = [1, 1.004, 2.002].map((m, i) => {
        const o = ctx.createOscillator();
        o.type = i === 2 ? 'triangle' : 'sine';
        const g = ctx.createGain();
        g.gain.value = i === 2 ? 0.25 : 0.5;
        o.connect(g);
        g.connect(this.toneGain);
        o.start();
        return { o, m };
      });
      this.toneFreq = 0;
    }
    const t = ctx.currentTime;
    if (freq !== this.toneFreq) {
      this.toneFreq = freq;
      for (const { o, m } of this.toneOsc) o.frequency.setTargetAtTime(freq * m, t, 0.08);
    }
    this.toneGain.gain.setTargetAtTime(amp, t, amp > 0 ? 0.6 : 0.25);
  }

  /** Called every frame with the game state. */
  update(breath, sleep) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.breathGain.gain.setTargetAtTime(breath * 0.06, t, 0.25);
    this.muffle.frequency.setTargetAtTime(18000 - sleep * 17200, t, 0.3);
  }
}
