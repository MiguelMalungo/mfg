import * as THREE from 'three';
import { buildPillar } from './pillar.js';

/*
 * The completion of the game (refs/finale-diamond.webp, refs/finale-gate.webp).
 *
 * The player has gathered six diamonds from the teaching stones (knowledge) and three seeds from
 * the forest, the tower and the lotus (the body, the essence, the heart's rhythm). They bring them
 * back to the plain, where the sleepers walk, and give them all back at once: the nine lights fuse
 * into one great diamond over the crowd; its light cuts every thread and the sleepers wake and look
 * up. The diamond unfolds into the enneagram and draws a gate of light on the water; the sky turns
 * to dawn; everyone walks through.
 *
 * The figure above the gate is the enneagram (the owner's decision, 2026-11-12): the Fourth Way's
 * own symbol. Its triangle is the Law of Three, its six-pointed figure the Law of Seven (the octave
 * the player has just completed in the lotus), and the gate below repeats its inner triangle.
 *
 * Phases:
 *   1 return    walk back to the middle of the plain
 *   2 offering  raise the lantern inside the burning mark and hold it 3 s
 *   3 diamond   the nine lights rise and fuse; the waking wave; the sky begins to turn (watch)
 *   4 gate      the diamond unfolds into the symbol and draws the gate; the crowd walks to it (watch)
 *   5 walk      walk through the gate
 *   6 through   white-gold, then the end card
 *
 * Everything is built at load and kept hidden, so nothing compiles mid-scene.
 */

export const FINALE_SYMBOL = 'enneagram'; // or 'hexagram': two plain interlocked triangles

const MARK = new THREE.Vector3(0, 0, 0); // the offering, in the middle of the sleepers' circles
const DIAMOND_A = new THREE.Vector3(0, 48, -40); // where the nine lights fuse
const GATE_Z = -90;
const GATE_HALF = 40; // half the base
const GATE_H = 70;
const SYMBOL_R = 20;
const DIAMOND_B = new THREE.Vector3(0, GATE_H + 5 + SYMBOL_R, GATE_Z); // the symbol's centre, above the apex
const PLAIN_LOTUS_HEART = new THREE.Vector3(0, 9, -175);
const HOLD = 3; // seconds the lantern must stay raised in the mark
const WAVE_V = 14; // m/s, the waking wave

// the phase-3 timeline, in seconds from the offering
const T3 = { fly: 0, gather: 4.6, grow: 7, rays: 8, wave: 9, dawn: 9, end: 18 };
// the phase-4 timeline, in seconds from its start
const T4 = { move: 5, unfold0: 2, unfold1: 5, symbol0: 3, symbol1: 8, draw0: 4, draw1: 9, fill0: 6, fill1: 12, send: 2, free: 12 };

const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const span = (t, a, b) => ease((t - a) / (b - a));
const hdr = (r, g, b, k) => new THREE.Color(r * k, g * k, b * k);

const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false };

/** A flat ribbon from a to b (in the gate's plane, facing +z), with an 'ord' value at each end for drawing it on. */
const ribbon = (out, a, b, w, ordA, ordB) => {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l = Math.hypot(dx, dy) || 1;
  const nx = (-dy / l) * w * 0.5, ny = (dx / l) * w * 0.5;
  const base = out.pos.length / 3;
  out.pos.push(a.x + nx, a.y + ny, a.z, a.x - nx, a.y - ny, a.z, b.x + nx, b.y + ny, b.z, b.x - nx, b.y - ny, b.z);
  out.ord.push(ordA, ordA, ordB, ordB);
  out.across.push(1, -1, 1, -1);
  out.idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
};
const ribbonGeo = (out) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out.pos, 3));
  g.setAttribute('ord', new THREE.Float32BufferAttribute(out.ord, 1));
  g.setAttribute('across', new THREE.Float32BufferAttribute(out.across, 1));
  g.setIndex(out.idx);
  return g;
};

/** Lines of light drawn on as `draw` goes from 0 to 1 (each point lights when draw passes its ord). */
const lineMaterial = (color) =>
  new THREE.ShaderMaterial({
    ...additive,
    side: THREE.DoubleSide,
    uniforms: { draw: { value: 0 }, power: { value: 1 }, color: { value: color }, time: { value: 0 } },
    vertexShader: /* glsl */ `attribute float ord; attribute float across; varying float vOrd; varying float vAcross;
      void main() { vOrd = ord; vAcross = across; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `uniform float draw; uniform float power; uniform vec3 color; uniform float time; varying float vOrd; varying float vAcross;
      void main() {
        float on = smoothstep(0.0, 0.004, draw - vOrd);
        // the drawing point burns brighter
        float head = exp(-pow((draw - vOrd) * 60.0, 2.0)) * step(0.0, draw - vOrd) * step(draw, 0.999);
        float prof = exp(-vAcross * vAcross * 2.5);
        gl_FragColor = vec4(color * prof * (on + head * 3.0) * power * (0.92 + 0.08 * sin(time * 3.0 + vOrd * 40.0)), 1.0);
      }`,
  });

export const buildFinale = ({ scene, glowTex, sleepers }) => {
  const g = new THREE.Group();
  g.visible = false;
  scene.add(g);
  const add = (m) => (g.add(m), m);

  /* ── the lotus on the plain carries its pillar now ── */
  const pillar = buildPillar({ height: 700, fanAngles: [9, 14] });
  pillar.group.position.copy(PLAIN_LOTUS_HEART);
  add(pillar.group);

  /* ── the offering mark: rings of fire on the water, as in the lotus ── */
  const markMat = new THREE.ShaderMaterial({
    ...additive,
    uniforms: { time: { value: 0 }, charge: { value: 0 }, power: { value: 1 } },
    vertexShader: /* glsl */ `varying vec2 vXZ; void main() { vXZ = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `uniform float time; uniform float charge; uniform float power; varying vec2 vXZ;
      float hh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hh(i), hh(i + vec2(1, 0)), f.x), mix(hh(i + vec2(0, 1)), hh(i + vec2(1, 1)), f.x), f.y); }
      void main() {
        float r = length(vXZ);
        float ripple = pow(0.5 + 0.5 * sin(r * 4.8 - time * 1.2), 18.0);
        // one slow front every 2.3 s, faster and brighter as the lantern is held up
        float age = mod(time, 2.3 - charge * 1.2);
        float behind = age * 6.5 - r;
        float front = exp(-behind * behind * 10.0);
        float gr = vn(vXZ * 4.0) * 0.5 + vn(vXZ * 13.0 + time * 0.1) * 0.5;
        float grain = 0.25 + 0.75 * smoothstep(0.25, 0.8, gr);
        float edge = smoothstep(12.0, 8.0, r);
        float a = (ripple * (0.35 + charge * 1.2) + front * (1.2 + charge * 2.0)) * grain * edge * power;
        gl_FragColor = vec4(mix(vec3(1.0, 0.3, 0.1), vec3(1.0, 0.75, 0.45), charge) * a * 1.4, 1.0);
      }`,
  });
  const mark = add(new THREE.Mesh(new THREE.CircleGeometry(12, 96), markMat));
  mark.rotation.x = -Math.PI / 2;
  mark.position.copy(MARK).setY(0.03);

  /* ── the nine lights: six diamonds and three seeds, leaving the lantern ── */
  const LIGHT_COLORS = [...Array(6)].map(() => new THREE.Color(1.8, 1.9, 2.2)).concat([new THREE.Color(0.5, 2.2, 1.4), new THREE.Color(0.6, 1.0, 2.4), new THREE.Color(2.4, 0.6, 0.45)]);
  const lights = LIGHT_COLORS.map((c) => {
    const s = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: c, ...additive, depthTest: true, opacity: 0 })));
    s.userData = { from: new THREE.Vector3() };
    return s;
  });

  /* ── the diamond ── */
  const octa = new THREE.OctahedronGeometry(1, 0);
  {
    const n = octa.attributes.position.count;
    const b = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) b[i * 3 + (i % 3)] = 1;
    octa.setAttribute('bary', new THREE.BufferAttribute(b, 3));
  }
  const shellMat = new THREE.ShaderMaterial({
    ...additive,
    side: THREE.DoubleSide,
    uniforms: { time: { value: 0 }, power: { value: 0 }, faces: { value: 1 } },
    vertexShader: /* glsl */ `attribute vec3 bary; varying vec3 vB; varying vec3 vN; varying vec3 vV;
      void main() { vB = bary; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `uniform float time; uniform float power; uniform float faces; varying vec3 vB; varying vec3 vN; varying vec3 vV;
      void main() {
        // a fine lattice of small cells across each face (lines every ~1.2 m), as in the reference
        const float N = 26.0;
        vec3 q = vB * N;
        vec3 fw = fwidth(q);
        vec3 dl = abs(fract(q - 0.5) - 0.5) / max(fw, 1e-4);
        float line = 1.0 - clamp(min(min(dl.x, dl.y), dl.z), 0.0, 1.0);
        float edge = 1.0 - smoothstep(0.0, 0.02, min(min(vB.x, vB.y), vB.z));
        float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
        // a few cells flash white for an instant
        vec3 cell = floor(q);
        float h = fract(sin(dot(cell, vec3(12.9898, 78.233, 37.719)) + floor(time * 4.0) * 7.13) * 43758.5453);
        float spark = step(0.988, h);
        float a = (line * 0.7 * (0.35 + 0.65 * rim) + rim * 0.45 + spark * 1.6 + 0.08) * faces + edge * 2.2;
        gl_FragColor = vec4(vec3(1.0, 0.85, 0.6) * a * power, 1.0);
      }`,
  });
  const diamond = add(new THREE.Mesh(octa, shellMat));
  diamond.position.copy(DIAMOND_A);
  diamond.scale.set(18, 25, 18);
  const core = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: hdr(1.0, 0.88, 0.66, 2.6), ...additive, depthTest: true, opacity: 0 })));
  core.position.copy(DIAMOND_A);
  core.scale.setScalar(30);
  const coreLight = add(new THREE.PointLight(0xffd9a0, 0, 260, 1.4));
  coreLight.position.copy(DIAMOND_A);

  /* ── dust in the shafts under the diamond ── */
  const ND = 600;
  const dp = new Float32Array(ND * 3);
  const ds = new Float32Array(ND);
  for (let i = 0; i < ND; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 30;
    dp.set([Math.cos(a) * r, Math.random() * 60, Math.sin(a) * r - 20], i * 3);
    ds[i] = Math.random();
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  dustGeo.setAttribute('seed', new THREE.BufferAttribute(ds, 1));
  const dustMat = new THREE.ShaderMaterial({
    ...additive,
    uniforms: { time: { value: 0 }, power: { value: 0 }, tex: { value: glowTex }, scale: { value: 600 } },
    vertexShader: /* glsl */ `attribute float seed; uniform float time; uniform float scale; varying float vA;
      void main() {
        vec3 p = position;
        p.y = mod(p.y + time * (0.3 + seed * 0.5), 60.0);
        p.x += sin(time * 0.2 + seed * 30.0) * 1.5;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vA = (0.4 + 0.6 * sin(time * 1.5 + seed * 50.0)) * (1.0 - length(position.xz + vec2(0.0, 20.0)) / 30.0);
        gl_PointSize = clamp(scale * 0.12 / -mv.z, 1.0, 6.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `uniform sampler2D tex; uniform float power; varying float vA;
      void main() { float a = texture2D(tex, gl_PointCoord).a; gl_FragColor = vec4(vec3(1.0, 0.85, 0.6) * vA * a * power, a); }`,
  });
  const dust = add(new THREE.Points(dustGeo, dustMat));
  dust.frustumCulled = false;

  /* ── the symbol above the gate ── */
  const symOut = { pos: [], ord: [], across: [], idx: [] };
  {
    const C = DIAMOND_B;
    const at = (deg, R = SYMBOL_R) => new THREE.Vector3(C.x + Math.cos((deg * Math.PI) / 180) * R, C.y + Math.sin((deg * Math.PI) / 180) * R, C.z);
    const W = 0.55;
    const seg = (pts, o0, o1) => {
      for (let k = 0; k < pts.length - 1; k++) ribbon(symOut, pts[k], pts[k + 1], W, o0 + ((o1 - o0) * k) / (pts.length - 1), o0 + ((o1 - o0) * (k + 1)) / (pts.length - 1));
    };
    if (FINALE_SYMBOL === 'enneagram') {
      // the nine points: 9 at the top, then clockwise 1..8, every 40°
      const P = (n) => at(90 - n * 40);
      seg([P(9), P(3), P(6), P(9)], 0, 0.3); // the triangle: the Law of Three
      seg([P(1), P(4), P(2), P(8), P(5), P(7), P(1)], 0.3, 0.65); // the Law of Seven
      const circle = [];
      for (let k = 0; k <= 96; k++) circle.push(at(90 - (k / 96) * 360));
      seg(circle, 0.65, 1);
    } else {
      seg([at(90), at(210), at(330), at(90)], 0, 0.5);
      seg([at(270), at(30), at(150), at(270)], 0.5, 1);
    }
  }
  const symMat = lineMaterial(hdr(1.0, 0.75, 0.4, 5));
  const symbol = add(new THREE.Mesh(ribbonGeo(symOut), symMat));
  symbol.frustumCulled = false;
  const symGlow = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: hdr(1.0, 0.8, 0.5, 2.5), ...additive, depthTest: true, opacity: 0 })));
  symGlow.position.copy(DIAMOND_B);
  symGlow.scale.setScalar(16);
  // a four-pointed star flare at its heart
  const flareMat = new THREE.ShaderMaterial({
    ...additive,
    side: THREE.DoubleSide,
    uniforms: { power: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `uniform float power; varying vec2 vUv;
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float a = exp(-abs(p.y) * 90.0) * (1.0 - abs(p.x)) + exp(-abs(p.x) * 90.0) * (1.0 - abs(p.y));
        a += exp(-dot(p, p) * 30.0) * 0.8;
        gl_FragColor = vec4(vec3(1.0, 0.85, 0.6) * a * power * 3.0, 1.0);
      }`,
  });
  const flare = add(new THREE.Mesh(new THREE.PlaneGeometry(70, 70), flareMat));
  flare.position.copy(DIAMOND_B).add(new THREE.Vector3(0, 0, 0.5));

  /* ── the gate ── */
  const apex = new THREE.Vector3(0, GATE_H, GATE_Z);
  const left = new THREE.Vector3(-GATE_HALF, 0.1, GATE_Z);
  const right = new THREE.Vector3(GATE_HALF, 0.1, GATE_Z);
  const mid = new THREE.Vector3(0, 0.1, GATE_Z);
  // its inside: a window onto the starry sky, the colour computed from the view direction (not painted on)
  const winGeo = new THREE.BufferGeometry();
  winGeo.setAttribute('position', new THREE.Float32BufferAttribute([left.x, 0, GATE_Z, right.x, 0, GATE_Z, apex.x, apex.y, GATE_Z], 3));
  winGeo.setIndex([0, 1, 2]);
  const winMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    side: THREE.DoubleSide,
    uniforms: { fill: { value: 0 }, time: { value: 0 } },
    vertexShader: /* glsl */ `varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `uniform float fill; uniform float time; varying vec3 vW;
      float h3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
      void main() {
        vec3 dir = normalize(vW - cameraPosition);
        vec3 col = mix(vec3(0.02, 0.025, 0.07), vec3(0.06, 0.04, 0.12), smoothstep(-0.1, 0.6, dir.y));
        // stars, fixed on the sky behind the door, in two sizes
        float s1 = h3(floor(dir * 320.0));
        float s2 = h3(floor(dir * 900.0) + 7.0);
        col += vec3(1.0, 0.95, 0.9) * smoothstep(0.9965, 1.0, s1) * (0.7 + 0.3 * sin(time * 2.0 + s1 * 90.0)) * 2.0;
        col += vec3(0.8, 0.85, 1.0) * smoothstep(0.985, 1.0, s2) * 0.5;
        // the milky band and the column of light up the middle, brightest at the base
        float x = vW.x;
        float band = exp(-pow(x / 9.0, 2.0)) * (0.6 + 0.5 * vn(vec2(x * 0.3, vW.y * 0.08))) ;
        col += vec3(0.5, 0.42, 0.55) * band * 0.25;
        float column = exp(-pow(x / 1.8, 2.0)) * (0.4 + 0.6 * smoothstep(${GATE_H.toFixed(1)}, 0.0, vW.y));
        col += vec3(1.0, 0.8, 0.55) * column * 1.6;
        col += vec3(1.0, 0.55, 0.3) * smoothstep(12.0, 0.0, vW.y) * 0.35;
        gl_FragColor = vec4(col, fill);
      }`,
  });
  const win = add(new THREE.Mesh(winGeo, winMat));
  win.renderOrder = 3;
  const gateOut = { pos: [], ord: [], across: [], idx: [] };
  {
    const W = 0.7;
    const dropTop = new THREE.Vector3(0, DIAMOND_B.y - SYMBOL_R, GATE_Z);
    ribbon(gateOut, dropTop, apex, W * 0.6, 0, 0.2); // the beam drops from the symbol to the apex
    const steps = 20;
    for (const side of [left, right]) {
      for (let k = 0; k < steps; k++) {
        const a = apex.clone().lerp(side, k / steps), b = apex.clone().lerp(side, (k + 1) / steps);
        ribbon(gateOut, a, b, W, 0.2 + (0.5 * k) / steps, 0.2 + (0.5 * (k + 1)) / steps);
      }
      for (let k = 0; k < steps; k++) {
        const a = side.clone().lerp(mid, k / steps), b = side.clone().lerp(mid, (k + 1) / steps);
        ribbon(gateOut, a, b, W, 0.7 + (0.3 * k) / steps, 0.7 + (0.3 * (k + 1)) / steps);
      }
    }
  }
  const gateMat = lineMaterial(hdr(1.0, 0.62, 0.3, 7));
  const gateLines = add(new THREE.Mesh(ribbonGeo(gateOut), gateMat));
  gateLines.frustumCulled = false;
  gateLines.position.z = 0.3; // just in front of the window
  // a pool of light on the water where the crowd will stand
  const pool = add(new THREE.Mesh(new THREE.PlaneGeometry(110, 50), new THREE.MeshBasicMaterial({ map: glowTex, color: hdr(1.0, 0.55, 0.3, 1.2), ...additive, opacity: 0 })));
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0, 0.04, GATE_Z + 14);

  /* ── the crowd's places before the gate: rows either side of a clear lane down the middle ── */
  const slots = [];
  for (let z = GATE_Z + 12; z <= GATE_Z + 42; z += 2)
    for (let x = 5; x <= 45; x += 1.6)
      for (const s of [-1, 1]) slots.push([s * (x + (((z * 7) % 3) - 1) * 0.3), z]);
  // the front rows first, from the lane outward
  slots.sort((a, b) => a[1] - b[1] || Math.abs(a[0]) - Math.abs(b[0]));

  const F = {
    phase: 0,
    startAt: 0,
    hold: 0,
    offerAt: 0,
    p4At: 0,
    cutsDone: false,
    sent: false,
    envMid: false,
    envEnd: false,
    rang: [false, false, false],
    lightsLaunched: 0,
    waveR: 0,
    shafts: 0,
    diamondPos: DIAMOND_A.clone(),
    locked: false,
    tiltUp: 0,
    dawn: 0,
  };
  const cutDone = new Uint8Array(sleepers.count);
  const tmp = new THREE.Vector3();

  const api = {
    get phase() {
      return F.phase;
    },
    get locked() {
      return F.locked;
    },
    get shafts() {
      return F.shafts;
    },
    get tiltUp() {
      return F.tiltUp;
    },
    diamondPos: F.diamondPos,
    gate: { z: GATE_Z, half: GATE_HALF },
    mark: MARK,
    pillar,
    start(t) {
      F.phase = 1;
      F.startAt = t;
      g.visible = true;
      pillar.power = 1;
    },
    /** Testing: jump to a phase (2..5) with everything before it done. */
    skipTo(phase, t) {
      if (F.phase === 0) this.start(t);
      if (phase >= 3) {
        F.phase = 3;
        F.offerAt = t - (phase > 3 ? T3.end : 0);
        F.lightsLaunched = 9;
      }
      if (phase >= 4) {
        F.phase = 4;
        F.p4At = t - (phase > 4 ? T4.free : 0);
      }
      if (phase >= 5) F.phase = 5;
      if (phase === 2) F.phase = 2;
    },
    goal() {
      switch (F.phase) {
        case 1:
          return 'You carry the three seeds and the knowledge of the stones. Bring them back to where the sleepers walk.';
        case 2:
          return F.hold > 0.1 ? 'Hold your light up…' : 'Raise your lantern, and give back what you were given.';
        case 5:
          return 'Walk through.';
        default:
          return null;
      }
    },
    target() {
      if (F.phase === 1 || F.phase === 2) return MARK;
      if (F.phase === 5) return tmp.set(0, 0, GATE_Z);
      return null;
    },
    /**
     * ctx: { pos (player), raise (0..1), lanternPos (world), companion }.
     * Returns events: 'arrived', 'light' {i}, 'fused', 'rays', 'cuts' {n}, 'turn', 'corner' {k}, 'env', 'free', 'through'.
     */
    update(t, dt, ctx) {
      const ev = [];
      if (!F.phase) return ev;
      const P = ctx.pos;
      markMat.uniforms.time.value = t;
      for (const m of [shellMat, dustMat, symMat, gateMat, winMat]) m.uniforms.time.value = t;
      pillar.power = 1 + 0.08 * Math.sin(t * 5.46);
      pillar.update(t, ctx.camPos);

      // 1 → 2: arrive at the mark
      const dMark = Math.hypot(P.x - MARK.x, P.z - MARK.z);
      if (F.phase === 1 && dMark < 10) {
        F.phase = 2;
        ev.push({ type: 'arrived' });
      }
      // 2: hold the lantern up inside the mark
      if (F.phase === 2) {
        F.hold = ctx.raise > 0.6 && dMark < 12 ? F.hold + dt : Math.max(0, F.hold - dt * 2);
        if (F.hold >= HOLD) {
          F.phase = 3;
          F.offerAt = t;
          for (const L of lights) L.userData.from.copy(ctx.lanternPos);
        }
      }
      markMat.uniforms.charge.value = F.phase === 2 ? Math.min(1, F.hold / HOLD) : F.phase >= 3 ? 1 : 0;
      markMat.uniforms.power.value = F.phase >= 3 ? 1 - span(t - F.offerAt, T3.end - 4, T3.end) : 1;

      // 3: the diamond
      const s3 = F.phase >= 3 ? t - F.offerAt : -1;
      let grow = 0, rays = 0;
      if (F.phase >= 3) {
        // the nine lights leave the lantern one by one and rise on widening spirals
        lights.forEach((L, i) => {
          const t0 = T3.fly + i * 0.25;
          const k = (s3 - t0) / 2.4;
          if (s3 >= t0 && F.lightsLaunched <= i) {
            F.lightsLaunched = i + 1;
            ev.push({ type: 'light', i });
          }
          if (k < 0) {
            L.material.opacity = 0;
            return;
          }
          const e = ease(Math.min(1, k));
          // after arriving they circle each other, closing to one point
          const close = 1 - span(s3, T3.gather, T3.grow);
          const ang = e * Math.PI * 4 + (i / 9) * Math.PI * 2 + Math.max(0, s3 - T3.gather) * 2.5;
          const rad = (Math.sin(Math.PI * Math.min(1, e)) * 6 + (k >= 1 ? 4 : 0) * e) * close;
          L.position.lerpVectors(L.userData.from, DIAMOND_A, e);
          L.position.x += Math.cos(ang) * rad;
          L.position.z += Math.sin(ang) * rad;
          L.material.opacity = s3 < T3.grow + 0.5 ? 1 : Math.max(0, 1 - (s3 - T3.grow - 0.5));
          L.scale.setScalar(0.4 + e * 3.5);
        });
        grow = span(s3, T3.grow, T3.grow + 3);
        if (grow > 0 && !F.fused) {
          F.fused = true;
          ev.push({ type: 'fused' });
        }
        rays = span(s3, T3.rays, T3.rays + 3);
        if (rays > 0 && !F.raysOn) {
          F.raysOn = true;
          ev.push({ type: 'rays' });
        }
        // the waking wave: as it passes each sleeper, their thread is cut and they wake
        F.waveR = Math.max(0, (s3 - T3.wave) * WAVE_V);
        if (F.waveR > 0 && !F.cutsDone) {
          let n = 0, all = true;
          for (let i = 0; i < sleepers.count; i++) {
            if (cutDone[i]) continue;
            const st = sleepers.state[i];
            if (Math.hypot(st.x - MARK.x, st.z - MARK.z) <= F.waveR) {
              cutDone[i] = 1;
              sleepers.cut(i, t);
              if (i > 0) sleepers.wakeAt(i, t);
              n++;
            } else all = false;
          }
          if (n) ev.push({ type: 'cuts', n });
          if (all) F.cutsDone = true;
        }
        sleepers.crowd.faceTo = F.phase === 3 ? F.diamondPos : tmp.set(0, 30, GATE_Z).clone();
        sleepers.crowd.lookUp = F.phase === 3 ? span(s3, T3.wave, T3.wave + 4) : F.phase === 4 ? 0.5 : 0.25;
        F.dawn = F.phase === 3 ? 0.45 * span(s3, T3.dawn, T3.end) : F.dawn;
        F.tiltUp = F.phase === 3 && s3 > T3.gather && s3 < T3.wave + 2 ? 1 : 0;
        if (F.phase === 3 && s3 >= T3.end) {
          F.phase = 4;
          F.p4At = t;
          ev.push({ type: 'turn' });
          if (!F.envMid) {
            F.envMid = true;
            ev.push({ type: 'env' });
          }
        }
      }

      // 4: the gate
      const s4 = F.phase >= 4 ? t - F.p4At : -1;
      const move = F.phase >= 4 ? span(s4, 0, T4.move) : 0;
      const unfold = F.phase >= 4 ? span(s4, T4.unfold0, T4.unfold1) : 0;
      const symOn = F.phase >= 4 ? span(s4, T4.symbol0, T4.symbol1) : 0;
      const draw = F.phase >= 4 ? span(s4, T4.draw0, T4.draw1) : 0;
      const fill = F.phase >= 4 ? span(s4, T4.fill0, T4.fill1) : 0;
      if (F.phase >= 4) {
        F.dawn = 0.45 + 0.55 * fill;
        const marks = [0.2, 0.7, 0.999];
        marks.forEach((m, k) => {
          if (draw >= m && !F.rang[k]) {
            F.rang[k] = true;
            ev.push({ type: 'corner', k });
          }
        });
        if (s4 >= T4.send && !F.sent) {
          F.sent = true;
          // every awake sleeper to a place before the gate, the nearest to the gate taking the front rows
          const order = [];
          for (let i = 1; i < sleepers.count; i++) order.push([Math.hypot(sleepers.state[i].x, sleepers.state[i].z - GATE_Z), i]);
          order.sort((a, b) => a[0] - b[0]);
          order.forEach(([, i], k) => {
            const [x, z] = slots[k % slots.length];
            sleepers.sendTo(i, x, z);
          });
          sleepers.crowd.pace = 2.0; // unhurried, but they have far to come
          if (ctx.companion) ctx.companion.goal = new THREE.Vector3(2, 0, GATE_Z + 12);
        }
        if (F.phase === 4 && s4 >= T4.free) {
          F.phase = 5;
          ev.push({ type: 'free' });
          if (!F.envEnd) {
            F.envEnd = true;
            ev.push({ type: 'env' });
          }
        }
      }
      F.diamondPos.lerpVectors(DIAMOND_A, DIAMOND_B, move);
      F.locked = F.phase === 3 || F.phase === 4;

      // the diamond, its core and its light
      diamond.position.copy(F.diamondPos);
      core.position.copy(F.diamondPos);
      coreLight.position.copy(F.diamondPos);
      diamond.rotation.y += (dt * Math.PI * 2) / 80;
      const dScale = grow * (1 - unfold * 0.6);
      diamond.scale.set(18 * dScale + 1e-3, 25 * dScale + 1e-3, 18 * dScale + 1e-3);
      shellMat.uniforms.power.value = 0.45 * grow * (1 - unfold);
      shellMat.uniforms.faces.value = 1 - unfold;
      core.material.opacity = Math.max(grow, symOn) * (1 - 0.6 * unfold) * 0.6;
      core.scale.setScalar(30 * (0.3 + 0.7 * grow) * (1 - 0.5 * unfold));
      coreLight.intensity = 900 * grow * (1 - 0.6 * unfold);
      F.shafts = rays * (1 - unfold);
      dustMat.uniforms.power.value = rays * (1 - unfold) * 1.5;

      // the symbol and the gate
      symMat.uniforms.draw.value = symOn;
      symGlow.material.opacity = symOn * 0.6;
      flareMat.uniforms.power.value = symOn * (0.8 + 0.2 * Math.sin(t * 2.0));
      gateMat.uniforms.draw.value = draw;
      winMat.uniforms.fill.value = fill;
      pool.material.opacity = fill * 0.5;

      // 5 → 6: through the gate (inside the triangle, at walking height)
      if (F.phase === 5) {
        const c = ctx.companion;
        if (c && Math.hypot(P.x - c.pos.x, P.z - c.pos.z) < 7) c.goal = new THREE.Vector3(1.5, 0, GATE_Z - 20);
        if (P.z < GATE_Z && Math.abs(P.x) < GATE_HALF * 0.8) {
          F.phase = 6;
          ev.push({ type: 'through' });
        }
      }
      return ev;
    },
    /** The dawn this scene asks of the sky (0..1). */
    get dawn() {
      return F.dawn;
    },
  };
  return api;
};
