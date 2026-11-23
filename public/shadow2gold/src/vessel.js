import * as THREE from 'three';

/*
 * The sealed vessel: a round-bottomed glass flask with a stopper, floating at the side of the view.
 * It is the player's only light, and the one light in the house that casts real shadows.
 * What is inside it is the state of the work, always changing (owner's request, 2026-11-14):
 * a liquid over an ember, with a surface that stays level and sloshes as you move, bubbles rising
 * through it, vapour coiling above it, grains carried round, sparks when it boils.
 * A change of stage does not fade in: the new colour blooms up from the ember in clouds, like ink.
 *
 *   state.stage   0 nigredo (black) · 1 albedo (white) · 2 rubedo (red) · 3 gold; fractions are a bloom in progress
 *   state.heat    how strongly the ember burns (the player's charge)
 *   state.boil    0..1 agitation: more and faster bubbles, sparks, a restless surface (hurrying)
 *   state.fume    vapour above the liquid, 1 = normal, more = the bulb fills with it (dread)
 *   state.flecks  0..1 bright grains turning in the liquid (near the masks; after the facing)
 *   state.heave   the liquid's level rising and falling (the sack's breath)
 *   slosh(ax, az, dt)  feed it the walker's acceleration; the surface leans and swings back
 */

const R = 0.05; // radius of the bulb, metres

/** What each stage of the work looks like in the glass. Colours are linear, before exposure. */
export const STAGES = [
  { name: 'nigredo', liquid: [0.0035, 0.0026, 0.0018], dark: [0.0005, 0.0004, 0.0003], pale: [0.008, 0.006, 0.004], glow: [1.0, 0.5, 0.16], fleck: [0.9, 0.8, 0.6], light: [1.0, 0.6, 0.27], level: 0.1 },
  { name: 'albedo', liquid: [0.2, 0.195, 0.18], dark: [0.04, 0.04, 0.038], pale: [0.22, 0.21, 0.19], glow: [1.0, 0.95, 0.86], fleck: [1.0, 1.0, 0.96], light: [1.0, 0.93, 0.82], level: 0.05 },
  { name: 'rubedo', liquid: [0.16, 0.008, 0.004], dark: [0.012, 0.001, 0.0006], pale: [0.1, 0.02, 0.008], glow: [1.0, 0.2, 0.05], fleck: [1.0, 0.6, 0.2], light: [1.0, 0.4, 0.18], level: 0.12 },
  { name: 'gold', liquid: [0.34, 0.15, 0.012], dark: [0.05, 0.022, 0.003], pale: [0.3, 0.17, 0.035], glow: [1.0, 0.78, 0.3], fleck: [1.0, 0.92, 0.6], light: [1.0, 0.82, 0.5], level: 0.2 },
];

const flaskProfile = () => {
  const pts = [];
  // the bulb, from the bottom up to where the neck leaves it
  for (let i = 0; i <= 26; i++) {
    const a = -Math.PI / 2 + (i / 26) * (Math.PI * 0.86);
    pts.push(new THREE.Vector2(Math.max(0.0005, Math.cos(a) * R), Math.sin(a) * R));
  }
  const top = pts[pts.length - 1];
  // shoulder, neck, rolled lip
  pts.push(new THREE.Vector2(0.0145, top.y + 0.006));
  pts.push(new THREE.Vector2(0.0125, top.y + 0.02));
  pts.push(new THREE.Vector2(0.012, top.y + 0.05));
  pts.push(new THREE.Vector2(0.0155, top.y + 0.056));
  pts.push(new THREE.Vector2(0.016, top.y + 0.06));
  pts.push(new THREE.Vector2(0.012, top.y + 0.062));
  return { pts, neckTop: top.y + 0.06 };
};

const GlassShader = {
  uniforms: { tint: { value: new THREE.Color(1.0, 0.78, 0.5) }, glow: { value: 1 } },
  vertexShader: /* glsl */ `
    varying vec3 vN; varying vec3 vV; varying vec3 vP;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vN = normalize(normalMatrix * normal);
      vV = -mv.xyz;
      vP = position;
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 tint; uniform float glow;
    varying vec3 vN; varying vec3 vV; varying vec3 vP;
    float h31(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
    void main() {
      vec3 n = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0);
      vec3 v = normalize(vV);
      float ndv = clamp(dot(n, v), 0.0, 1.0);
      float fres = pow(1.0 - ndv, 2.6);
      // the room's few lights, caught on the curve of the glass (fixed to the eye, like a studio glint)
      vec3 r = reflect(-v, n);
      float s1 = pow(max(dot(r, normalize(vec3(0.35, 0.75, 0.55))), 0.0), 220.0);
      float s2 = pow(max(dot(r, normalize(vec3(-0.7, 0.25, 0.65))), 0.0), 120.0) * 0.2;
      // old glass: faint dust
      float dust = h31(floor(vP * 900.0)) * 0.004;
      float a = clamp(fres * 0.5 + s1 + s2 + dust * fres, 0.0, 1.0);
      vec3 col = tint * (fres * 0.06 * glow + dust) + vec3(1.0, 0.9, 0.75) * (s1 * 0.5 + s2 * 0.12) * glow;
      gl_FragColor = vec4(col, a);
    }`,
};

const ReactionShader = {
  uniforms: {
    time: { value: 0 },
    radius: { value: R * 0.955 },
    heat: { value: 1 },
    boil: { value: 0 },
    fume: { value: 1 },
    flecks: { value: 0 },
    level: { value: 0 },
    frac: { value: 0 }, // how far the next stage's colour has bloomed through the liquid
    wave: { value: 0 }, // how hard the surface is moving
    up: { value: new THREE.Vector3(0, 1, 0) }, // the liquid's "up": the world's, leaning with the slosh
    liquidA: { value: new THREE.Vector3() },
    liquidB: { value: new THREE.Vector3() },
    darkCol: { value: new THREE.Vector3() },
    paleCol: { value: new THREE.Vector3() },
    glowCol: { value: new THREE.Vector3() },
    fleckCol: { value: new THREE.Vector3() },
  },
  vertexShader: /* glsl */ `
    varying vec3 vPos; varying vec3 vCam;
    void main() {
      vPos = position;
      vCam = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform float time; uniform float radius; uniform float heat; uniform float boil; uniform float fume; uniform float flecks;
    uniform float level; uniform float frac; uniform float wave; uniform vec3 up;
    uniform vec3 liquidA; uniform vec3 liquidB; uniform vec3 darkCol; uniform vec3 paleCol; uniform vec3 glowCol; uniform vec3 fleckCol;
    varying vec3 vPos; varying vec3 vCam;
    float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float noise(vec3 x) {
      vec3 i = floor(x), f = fract(x);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
                 mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
    }
    float fbm(vec3 p) {
      float s = 0.0, a = 0.5;
      for (int i = 0; i < 4; i++) { s += a * noise(p); p = p * 2.03 + 1.7; a *= 0.5; }
      return s;
    }
    void main() {
      vec3 ro = vCam;
      vec3 rd = normalize(vPos - vCam);
      float b = dot(ro, rd);
      float c = dot(ro, ro) - radius * radius;
      float disc = b * b - c;
      if (disc < 0.0) discard;
      float sq = sqrt(disc);
      float t0 = max(-b - sq, 0.0), t1 = -b + sq;
      const int N = 48;
      float dt = (t1 - t0) / float(N);
      float ds = dt / radius;
      // start each ray at a different depth so the steps don't show as shells
      float j = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
      float T = 1.0;
      vec3 acc = vec3(0.0);
      vec3 ember = vec3(0.0, -0.7, 0.0);
      float rise = time * (0.2 + boil * 1.0);
      for (int i = 0; i < N; i++) {
        vec3 q = (ro + rd * (t0 + (float(i) + j * 0.6) * dt)) / radius; // -1..1 inside the bulb
        float rq = length(q);
        float edge = 1.0 - smoothstep(0.92, 1.0, rq);
        float de = length(q - ember);
        float h = dot(q, up); // height above the liquid's own level plane
        // the surface: a slow swell, waves when it has been shaken, a seethe when it boils
        float surf = level
                   + (0.012 + 0.05 * wave) * sin(q.x * 6.0 + time * (1.1 + 4.0 * wave)) * cos(q.z * 5.0 - time * (0.8 + 3.0 * wave))
                   + boil * 0.09 * (noise(vec3(q.xz * 5.0, time * 2.6)) - 0.5);
        float aStep; vec3 col;
        if (h < surf) {
          /* ── liquid ── */
          float depth = surf - h;
          float dens = 6.0;
          // The next stage blooms up from the ember in clouds rather than fading in everywhere.
          float hN = (h + 1.0) / max(surf + 1.0, 0.2);
          float cloud = fbm(vec3(q.x * 2.4, q.y * 2.4 - time * 0.16, q.z * 2.4 + time * 0.06));
          float front = smoothstep(0.14, -0.14, hN * 0.9 + (cloud - 0.5) * 1.1 - (frac * 1.9 - 0.45));
          vec3 liquid = mix(liquidA, liquidB, front);
          // bubbles: small spheres drifting up; inside one the liquid is thin, and its skin catches the light
          vec3 bc = vec3(q.x * 5.5 + sin(q.y * 5.0 + time) * 0.2, (q.y - rise) * 5.5, q.z * 5.5);
          vec3 id = floor(bc), f = fract(bc) - 0.5;
          float present = step(1.0 - (0.16 + 0.55 * boil), hash(id + 3.7));
          float br = 0.13 + 0.2 * hash(id);
          float bl = length(f + (vec3(hash(id + 1.3), hash(id + 5.1), hash(id + 2.9)) - 0.5) * 0.3);
          float bubble = present * smoothstep(br, br * 0.8, bl);
          float skin = present * smoothstep(br * 1.3, br, bl) * (1.0 - smoothstep(br, br * 0.8, bl));
          dens *= 1.0 - 0.9 * bubble;
          // slow convection: darker and paler bodies of liquid turning past each other
          float conv = fbm(vec3(q.x * 2.2 + time * 0.04, q.y * 2.2 - time * 0.1, q.z * 2.2));
          // the ember lights the liquid close to it, so black stays black further out
          vec3 lit = glowCol * (0.006 / (0.02 + de * de * de * 8.0)) * heat;
          col = liquid * (0.4 + 1.2 * conv) + lit;
          // the edge of a bloom glows faintly, where the two meet
          col += glowCol * 0.012 * front * (1.0 - front) * 4.0;
          // bubble skins: lit by the ember, and a little by the room
          col += (glowCol * 0.2 * heat + liquid * 2.5 + vec3(0.012, 0.01, 0.008)) * skin;
          // the surface line and its ring of froth against the glass
          float line = 1.0 - smoothstep(0.0, 0.03 + 0.03 * boil, depth);
          col += (paleCol * 1.6 + glowCol * 0.012 * heat + vec3(0.006, 0.005, 0.004)) * line * (0.5 + 0.5 * smoothstep(0.6, 0.95, rq) + boil);
          aStep = 1.0 - exp(-dens * ds * edge);
          // grains carried round in the liquid
          vec3 fc = vec3(q.x * 15.0 + sin(time * 0.3 + q.y * 3.0), (q.y - time * 0.06) * 15.0, q.z * 15.0 + cos(time * 0.25 + q.y * 2.0));
          float grain = step(1.0 - 0.1 * flecks, hash(floor(fc) + 9.1)) * smoothstep(0.32, 0.0, length(fract(fc) - 0.5));
          acc += T * fleckCol * grain * 0.9 * ds * 10.0 * (0.4 + 0.6 * heat);
        } else {
          /* ── vapour ── */
          float ang = time * 0.35 + q.y * 1.4;
          float ca = cos(ang), sa = sin(ang);
          vec3 w = vec3(ca * q.x - sa * q.z, q.y - time * (0.06 + boil * 0.3), sa * q.x + ca * q.z);
          float n = fbm(w * 2.6 + vec3(0.0, 0.0, time * 0.05));
          float wisps = fbm(w * 6.5 - vec3(0.0, time * 0.1, 0.0));
          // thickest just over the liquid, thinning toward the neck
          float settle = mix(1.25, 0.5, smoothstep(surf, 0.95, h));
          float d = smoothstep(0.46, 0.74, n * settle * fume + wisps * 0.3 + boil * 0.12) * edge;
          float coil = smoothstep(0.42, 0.62, fbm(w * 4.2 + vec3(3.1, time * 0.07, 1.3)));
          vec3 lit = glowCol * (0.0012 / (0.03 + de * de * 4.0)) * heat;
          col = mix(darkCol, paleCol * (0.6 + 0.4 * heat), coil) + lit;
          aStep = 1.0 - exp(-d * 9.0 * ds);
          // sparks thrown up when it boils
          vec3 sc = vec3(q.x * 11.0, (q.y - time * 1.6) * 11.0, q.z * 11.0);
          float spark = step(1.0 - 0.05 * boil, hash(floor(sc) + 4.4)) * smoothstep(0.25, 0.0, length(fract(sc) - 0.5)) * (1.0 - smoothstep(surf, surf + 0.7, h));
          acc += T * glowCol * spark * 2.2 * ds * 10.0 * heat;
        }
        acc += T * aStep * col;
        // the ember itself, under the liquid
        acc += T * glowCol * exp(-de * de * 22.0) * 20.0 * ds * heat;
        T *= 1.0 - aStep;
        if (T < 0.02) break;
      }
      gl_FragColor = vec4(acc, 1.0 - T);
    }`,
};

export const buildVessel = (glowTex) => {
  const group = new THREE.Group();
  const body = new THREE.Group(); // bobs and turns inside the group
  group.add(body);

  const { pts, neckTop } = flaskProfile();
  const premult = { transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor };
  const glassMat = new THREE.ShaderMaterial({ ...GlassShader, uniforms: THREE.UniformsUtils.clone(GlassShader.uniforms), side: THREE.DoubleSide, ...premult });
  const glass = new THREE.Mesh(new THREE.LatheGeometry(pts, 56), glassMat);
  glass.renderOrder = 3;
  body.add(glass);

  // The contents write depth, although they are blended: the haze and the lens blur read the depth
  // buffer, and without it they treat the flask as if it were as far away as the wall behind it
  // (which is what made every stage look milky and soft).
  const inMat = new THREE.ShaderMaterial({ ...ReactionShader, uniforms: THREE.UniformsUtils.clone(ReactionShader.uniforms), ...premult, depthWrite: true });
  const inside = new THREE.Mesh(new THREE.SphereGeometry(R * 0.955, 40, 28), inMat);
  inside.renderOrder = 2;
  body.add(inside);

  // the ember is centimetres away: roll the light off on the stopper and the wax instead of clipping
  const soften = (m) => {
    m.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', 'outgoingLight *= 0.02; outgoingLight = outgoingLight / (1.0 + outgoingLight * 2.0);\n#include <opaque_fragment>');
    };
    m.customProgramCacheKey = () => 'st2g-soft';
    return m;
  };
  /*
   * A ground-glass stopper, sealed with dark wax. (It was a seven-point lathe and showed its facets: now a
   * smooth profile, a tapered plug in the neck, a collar, and a flattened ball on top; the wax is a lumpy
   * ring with three runs down the neck.)
   */
  const prof = [];
  const P = (r, y) => prof.push(new THREE.Vector2(r, y));
  P(0.0004, -0.016);
  for (let i = 0; i <= 6; i++) P(0.0098 + 0.0016 * (i / 6), -0.016 + 0.017 * (i / 6)); // the plug, tapering into the neck
  P(0.0112, 0.0015); P(0.0128, 0.0025); P(0.0128, 0.0045); P(0.0098, 0.0058); // the collar
  P(0.0062, 0.0072); P(0.0058, 0.0095); // the stem
  for (let i = 0; i <= 14; i++) {
    const a = -Math.PI / 2 + (i / 14) * Math.PI; // the finial: a ball squashed to two thirds
    P(Math.max(0.0004, 0.0118 * Math.cos(a)), 0.0175 + 0.0078 * Math.sin(a));
  }
  const stopperGeo = new THREE.LatheGeometry(prof, 48);
  const stopper = new THREE.Mesh(stopperGeo, soften(new THREE.MeshStandardMaterial({ color: new THREE.Color(0.035, 0.026, 0.019), roughness: 0.42, metalness: 0.05 })));
  stopper.position.y = neckTop;
  body.add(stopper);
  const waxGeo = new THREE.TorusGeometry(0.0145, 0.0042, 12, 48);
  {
    const p = waxGeo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const a = Math.atan2(v.y, v.x);
      const lump = 1 + 0.18 * Math.sin(a * 5 + 1.3) + 0.1 * Math.sin(a * 11 + 0.4);
      const c = new THREE.Vector3(Math.cos(a) * 0.0145, Math.sin(a) * 0.0145, 0);
      v.sub(c).multiplyScalar(lump).add(c);
      p.setXYZ(i, v.x, v.y, v.z * lump);
    }
    waxGeo.computeVertexNormals();
  }
  const waxMat = soften(new THREE.MeshStandardMaterial({ color: new THREE.Color(0.16, 0.012, 0.01), roughness: 0.4 }));
  const wax = new THREE.Mesh(waxGeo, waxMat);
  wax.rotation.x = Math.PI / 2;
  wax.position.y = neckTop + 0.001;
  body.add(wax);
  // runs of wax down the neck, each thicker at its foot where it pooled
  for (const [a, len] of [[0.6, 0.011], [2.5, 0.007], [4.3, 0.014]]) {
    const run = new THREE.Mesh(new THREE.CapsuleGeometry(0.0026, len, 4, 10), waxMat);
    run.scale.set(1, 1, 0.6);
    run.position.set(Math.cos(a) * 0.0128, neckTop - len / 2 - 0.001, Math.sin(a) * 0.0128);
    run.rotation.y = -a;
    body.add(run);
  }

  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(1.0, 0.6, 0.25), transparent: true, opacity: 0.012, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false }));
  halo.scale.setScalar(0.42);
  halo.position.y = -R * 0.4;
  halo.renderOrder = 1;
  body.add(halo);

  // the light: low in the bulb, where the ember is
  // a softer falloff than physical (1.6, not 2): a light this close to the eye would otherwise
  // blaze on any wall you stand near while the corridor beyond stays black (main.js also adapts the exposure)
  const light = new THREE.PointLight(new THREE.Color(1.0, 0.6, 0.27), 1.0, 22, 1.6);
  light.position.set(0, -R * 0.5, 0);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.camera.near = 0.03;
  light.shadow.camera.far = 22;
  light.shadow.bias = -0.0025;
  light.shadow.normalBias = 0.025;
  light.shadow.radius = 2.5;
  body.add(light);

  const state = { stage: 0, heat: 1, base: 1.66, boil: 0, fume: 1, flecks: 0, heave: 0 };
  const u = inMat.uniforms;
  const set3 = (out, arr) => out.set(arr[0], arr[1], arr[2]);
  const mix3 = (out, key, i, f) => {
    const a = STAGES[i][key], b = STAGES[i + 1][key];
    return out.set(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f);
  };
  const lightCol = new THREE.Vector3();

  /* The surface is a damped pendulum: push it with the walker's acceleration and it leans, then swings back. */
  const sl = { x: 0, z: 0, vx: 0, vz: 0, wave: 0 };
  const slosh = (ax, az, dt) => {
    const K = 60, C = 3.2, GAIN = 0.035;
    sl.vx += (-K * sl.x - C * sl.vx - ax * GAIN * K) * dt;
    sl.vz += (-K * sl.z - C * sl.vz - az * GAIN * K) * dt;
    sl.x = Math.max(-0.6, Math.min(0.6, sl.x + sl.vx * dt));
    sl.z = Math.max(-0.6, Math.min(0.6, sl.z + sl.vz * dt));
    const speed = Math.hypot(sl.vx, sl.vz);
    sl.wave += (Math.min(1, speed * 0.6) - sl.wave) * (1 - Math.exp(-dt * (speed * 0.6 > sl.wave ? 8 : 0.9)));
  };

  /*
   * A reaction (PLAN.md 10.3): something you collected works in the glass. The flask comes to the
   * middle of the view and grows (main.js places it from `rx.k`), the black boils, a bloom opens
   * and closes again, and it goes back to its corner. `onDone` is called (on the game's own clock) when it is back.
   */
  const ss = (a, b, x) => {
    const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return k * k * (3 - 2 * k);
  };
  const rx = { on: false, t: 0, k: 0, p: 0, dur: 4.6, bloom: 0.3, done: null };
  const RX_IN = 0.9, RX_OUT = 1.0;
  /** still: the work happens in the glass where it is, in its corner (when something else must be seen, as the bird). */
  const react = ({ seconds = 4.6, bloom = 0.3, onDone = null, still = false } = {}) => {
    rx.done?.();
    Object.assign(rx, { on: true, t: 0, dur: seconds, bloom, done: onDone, still });
  };
  /** Advances the reaction; returns 0..1, how far forward the flask has come. */
  const stepReaction = (dt) => {
    if (!rx.on) return (rx.k = 0);
    rx.t += dt;
    const total = RX_IN + rx.dur + RX_OUT;
    rx.k = ss(0, RX_IN, rx.t) * (1 - ss(RX_IN + rx.dur, total, rx.t));
    rx.p = Math.min(1, Math.max(0, (rx.t - RX_IN) / rx.dur));
    if (rx.still) rx.k = 0;
    if (rx.t >= total) {
      rx.on = false;
      rx.k = 0;
      const d = rx.done;
      rx.done = null;
      d?.();
    }
    return rx.k;
  };

  const update = (t) => {
    // during a reaction: it boils first, then the bloom opens through the liquid and draws back
    const rBoil = rx.on ? ss(0, 0.12, rx.p) * (1 - ss(0.45, 0.75, rx.p)) : 0;
    const rBloom = rx.on ? rx.bloom * ss(0.25, 0.55, rx.p) * (1 - ss(0.82, 1, rx.p)) : 0;
    const s = Math.min(3, Math.max(0, state.stage + rBloom));
    const i = Math.min(STAGES.length - 2, Math.floor(s)), f = s - i;
    const boil = Math.max(state.boil, rBoil);
    // a living flame: two slow breaths and a quick shiver, more nervous when it boils
    const fl = 1 + (0.06 + 0.12 * boil) * Math.sin(t * 7.3) * Math.sin(t * 3.1) + 0.05 * Math.sin(t * 1.3);
    u.time.value = t;
    u.heat.value = state.heat * fl * (1 + 0.5 * rBoil);
    u.boil.value = boil;
    u.fume.value = state.fume;
    u.flecks.value = state.flecks;
    u.frac.value = f;
    u.wave.value = sl.wave;
    u.up.value.set(sl.x, 1, sl.z).normalize();
    u.level.value = STAGES[i].level + (STAGES[i + 1].level - STAGES[i].level) * f + state.heave;
    set3(u.liquidA.value, STAGES[i].liquid);
    set3(u.liquidB.value, STAGES[i + 1].liquid);
    mix3(u.darkCol.value, 'dark', i, f);
    mix3(u.paleCol.value, 'pale', i, f);
    mix3(u.glowCol.value, 'glow', i, f);
    mix3(u.fleckCol.value, 'fleck', i, f);
    mix3(lightCol, 'light', i, f);
    glassMat.uniforms.glow.value = (0.6 + 0.4 * state.heat) * fl;
    glassMat.uniforms.tint.value.setRGB(lightCol.x, lightCol.y * 1.25, lightCol.z * 1.7);
    // each stage burns a little brighter than the one before
    light.intensity = state.base * state.heat * fl * (1 + 0.35 * s);
    light.color.setRGB(lightCol.x, lightCol.y, lightCol.z);
    halo.material.color.setRGB(lightCol.x, lightCol.y, lightCol.z);
    halo.material.opacity = 0.012 * state.heat * fl * (1 + s);
    // it floats: a slow bob. (It does not turn: main.js keeps it upright in the world, so "up" in the shader is the world's.)
    body.position.y = 0.006 * Math.sin(t * 0.9) + 0.003 * Math.sin(t * 2.1);
  };
  /** Height of the whole flask, bulb to stopper, at scale 1 (main.js sizes it against the screen). */
  const height = R + neckTop + 0.03;
  return { group, body, light, glass, inside, state, update, slosh, sl, R, height, react, stepReaction, rx };
};
