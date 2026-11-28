import * as THREE from 'three';
import { buildPillar } from './pillar.js';

/*
 * The completion of the game, after the owner's film of 2026-11-28 (refs/ending-film-*.jpg; the
 * version before it, with the diamond and the triangular gate at dawn, is in
 * backups/2026-11-28-before-forest-ending/).
 *
 * It is night. The lotus on the plain stands alight between the dark spires of its avenue; from a
 * star high above it a cone of fine rays falls round a white pillar; orange haze hangs low behind
 * the spires. The player has gathered six diamonds from the teaching stones (knowledge) and three
 * seeds from the forest, the tower and the lotus (body, essence, the heart's rhythm). They bring them
 * back to the middle of the plain, where rings of light burn on the water among the sleepers, and
 * give them all back at once: the nine lights cross the water to the lotus, lighting two more fields
 * of rings on the way, and become one ribbon of light that winds up round the pillar (the ascending
 * spiral). As it climbs, a wave of waking crosses the plain: every thread is cut, and the sleepers
 * wake and look up. When the ribbon reaches the star, the star opens into rays and the enneagram is
 * drawn round it; the crowd gathers before the avenue; everyone walks into the light.
 *
 * The figure round the star is the enneagram (the owner's decision, 2026-11-12): the Fourth Way's
 * own symbol. Its triangle is the Law of Three, its six-pointed figure the Law of Seven (the octave
 * the player has just completed in the lotus). The cone of rays below it is the gate.
 *
 * Phases:
 *   1 return    walk back to the rings in the middle of the plain
 *   2 offering  raise the lantern inside the rings and hold it 3 s
 *   3 spiral    the nine lights cross to the lotus and rise as the ribbon; the waking wave (watch)
 *   4 star      the star opens, the enneagram is drawn, the crowd gathers before the avenue (watch)
 *   5 walk      walk into the avenue, toward the lotus
 *   6 through   white-gold, then the end card
 *
 * Everything is built at load and kept hidden, so nothing compiles mid-scene.
 */

export const FINALE_SYMBOL = 'enneagram'; // or 'hexagram': two plain interlocked triangles

const MARK = new THREE.Vector3(0, 0, 0); // the offering, in the middle of the sleepers' circles
const LOTUS = new THREE.Vector3(0, 0, -175);
const HEART_Y = 9; // the plain lotus's heart
const APEX_Y = 250; // the star
const APEX = new THREE.Vector3(LOTUS.x, APEX_Y, LOTUS.z);
const GATE_Z = -90; // the mouth of the avenue: walking past it ends the game
const GATE_HALF = 40;
const SYMBOL_R = 24;
const HOLD = 3; // seconds the lantern must stay raised in the rings
const WAVE_V = 14; // m/s, the waking wave
// the fields of rings on the water: [x, z, radius]; the first is where the offering is made
const FIELDS = [
  [0, 0, 22],
  [0, -52, 12],
  [0, -80, 8],
];
const TURNS = 3; // the ribbon's turns round the pillar

// the phase-3 timeline, in seconds from the offering
const T3 = { fly: 0, field1: 0.9, field2: 2.0, gather: 4.6, rise: 7, rays: 7.5, wave: 9, top: 16.5, end: 18 };
// the phase-4 timeline, in seconds from its start
const T4 = { burst0: 0, burst1: 3.5, symbol0: 3, symbol1: 8, send: 2, look: 7, free: 12 };

const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const span = (t, a, b) => ease((t - a) / (b - a));
const hdr = (r, g, b, k) => new THREE.Color(r * k, g * k, b * k);

const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false };

/** A flat ribbon from a to b (in a plane facing +z), with an 'ord' value at each end for drawing it on. */
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

/**
 * A field of rings on the water (refs/ending-film-0.jpg): a dozen rings of ember light, each a thin
 * bright line with a glitter of sparks round it, and dark water between. power: how brightly it
 * burns; charge: 0..1, the offering being made (the rings quicken and whiten); wave: the radius of a
 * front of light that crosses it (0: none).
 */
const ringsMaterial = (radius) =>
  new THREE.ShaderMaterial({
    ...additive,
    uniforms: { time: { value: 0 }, power: { value: 0 }, charge: { value: 0 }, radius: { value: radius }, wave: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vXZ; void main() { vXZ = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `uniform float time; uniform float power; uniform float charge; uniform float radius; uniform float wave; varying vec2 vXZ;
      float hh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        float r = length(vXZ);
        float spacing = radius / 11.5;
        // the rings draw slowly inward, toward the middle (faster while the lantern is held up)
        float k = r / spacing + time * (0.1 + 0.45 * charge);
        float w = abs(fract(k) - 0.5) * 2.0; // 0 on a ring's own line, 1 midway between two rings
        float core = exp(-pow(w / 0.24, 2.0));
        float skirt = smoothstep(0.74, 0.12, w);
        // sparks: small cells, about half of them alight, each flickering to itself
        vec2 cu = vec2(atan(vXZ.y, vXZ.x) * max(r, 0.3) / 0.075, k * 22.0);
        float h = hh(floor(cu));
        float tw = 0.5 + 0.5 * sin(time * (2.0 + h * 6.0) + h * 40.0);
        float spark = step(0.5, h) * tw * smoothstep(0.5, 0.12, length(fract(cu) - 0.5));
        float a = core * (0.62 + 0.8 * spark) + skirt * spark * 1.15 + 0.1 * (1.0 - w);
        vec3 col = mix(vec3(1.0, 0.3, 0.075), vec3(1.0, 0.56, 0.26), clamp(core * 0.55 + spark * 0.6 + charge * 0.4, 0.0, 1.0));
        float edge = smoothstep(radius, radius - 1.6, r);
        // a front of light crossing the water (the waking wave)
        float fr = wave > 0.5 ? exp(-pow((r - wave) / 1.6, 2.0)) : 0.0;
        gl_FragColor = vec4(col * a * edge * power * 1.2 + vec3(1.0, 0.78, 0.5) * fr * 1.6, 1.0);
      }`,
  });

export const buildFinale = ({ scene, glowTex, sleepers }) => {
  const g = new THREE.Group();
  g.visible = false;
  scene.add(g);
  const add = (m) => (g.add(m), m);

  /* ── the pillar: a white core from the lotus's heart to the star ── */
  const pillar = buildPillar({ height: APEX_Y - HEART_Y, fanAngles: [], coreTopFade: 0.1, sheathWidth: 9 });
  pillar.group.position.set(LOTUS.x, HEART_Y, LOTUS.z);
  add(pillar.group);

  /* ── the cone of rays that falls from the star round it (refs/ending-film-*.jpg) ── */
  const coneMat = (deg, k, seed) => {
    const geo = new THREE.ConeGeometry(APEX_Y * Math.tan((deg * Math.PI) / 180), APEX_Y, 256, 8, true);
    geo.translate(0, APEX_Y / 2, 0); // its foot on the water, its point at the star
    const m = new THREE.Mesh(
      geo,
      new THREE.ShaderMaterial({
        ...additive,
        // only its far side is drawn: the spires that stand inside it stay dark against the rays
        side: THREE.BackSide,
        uniforms: { power: { value: 0 }, drift: { value: 0 }, seed: { value: seed }, height: { value: APEX_Y }, color: { value: new THREE.Color(1.0, 0.72, 0.5).multiplyScalar(k) } },
        vertexShader: /* glsl */ `uniform float height; varying float vA; varying float vH; varying float vEdge;
          void main() {
            vA = atan(position.z, position.x) / 6.2831853 + 0.5;
            vH = position.y / height;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vec3 n = normalize(normalMatrix * normal);
            // dimmer where the cone is seen edge-on: there the rays crowd together into a smear
            vEdge = pow(abs(dot(n, normalize(-mv.xyz))), 0.6);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `uniform float power; uniform float drift; uniform float seed; uniform vec3 color;
          varying float vA; varying float vH; varying float vEdge;
          float streak(float a, float f, float s) {
            float i = floor(a * f), fr = fract(a * f);
            float h = fract(sin(i * 91.7 + s) * 43758.5);
            return smoothstep(0.5, 0.0, abs(fr - 0.5)) * step(0.4, h) * h;
          }
          void main() {
            // (the finer rays fade out where they would be narrower than a pixel, instead of crawling)
            float fine = clamp(1.3 - fwidth(vA * 380.0) * 1.6, 0.0, 1.0);
            float rays = streak(vA, 150.0, seed) + 0.6 * fine * streak(fract(vA + drift), 380.0, seed + 6.0);
            // strongest high up, dying into the haze over the water; nothing at the very point (the star is there)
            float fade = smoothstep(0.0, 0.14, vH) * (0.22 + 0.78 * pow(vH, 0.7)) * (1.0 - smoothstep(0.97, 1.0, vH));
            // (a faint veil between the rays: the air inside the cone is lit)
            gl_FragColor = vec4(color * (rays + 0.16) * fade * vEdge * power, 1.0);
          }`,
      }),
    );
    m.position.set(LOTUS.x, 0, LOTUS.z);
    m.frustumCulled = false;
    return add(m);
  };
  const cones = [coneMat(4.5, 1.4, 1), coneMat(8.5, 1.0, 14), coneMat(13.5, 0.62, 27)];

  /* ── the star at the top: a point of light that opens into rays ── */
  const starMat = new THREE.ShaderMaterial({
    ...additive,
    side: THREE.DoubleSide,
    uniforms: { power: { value: 0 }, burst: { value: 0 }, time: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `uniform float power; uniform float burst; uniform float time; varying vec2 vUv;
      float hs(float x) { return fract(sin(x * 91.7) * 43758.5453); }
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        float a = atan(p.y, p.x) / 6.2831853 + 0.5;
        // many thin rays of different lengths; a second, finer set between them
        float i1 = floor(a * 72.0), f1 = fract(a * 72.0);
        float i2 = floor(a * 190.0 + 0.3), f2 = fract(a * 190.0 + 0.3);
        float len1 = (0.3 + 0.7 * hs(i1)) * burst, len2 = (0.15 + 0.45 * hs(i2 + 7.0)) * burst;
        float ray = smoothstep(0.5, 0.0, abs(f1 - 0.5) * (1.0 + r * 5.0)) * step(0.35, hs(i1 + 3.0)) * smoothstep(len1, len1 * 0.15, r)
                  + 0.5 * smoothstep(0.5, 0.0, abs(f2 - 0.5) * (1.0 + r * 5.0)) * step(0.5, hs(i2 + 11.0)) * smoothstep(len2, len2 * 0.15, r);
        float core = exp(-r * r * 1400.0) * 3.0 + exp(-r * 34.0) * 0.5;
        vec3 col = vec3(1.0, 0.8, 0.6) * (ray * 0.5 * smoothstep(0.0, 0.05, burst) * (0.9 + 0.1 * sin(time * 2.0 + a * 60.0)) + core * (0.25 + 0.75 * burst));
        gl_FragColor = vec4(col * power, 1.0);
      }`,
  });
  const star = add(new THREE.Mesh(new THREE.PlaneGeometry(340, 340), starMat));
  star.position.copy(APEX);
  star.frustumCulled = false;

  /* ── the symbol round the star, turned toward the plain ── */
  const symGroup = add(new THREE.Group());
  symGroup.position.copy(APEX);
  symGroup.lookAt(MARK.x, 1.7, MARK.z);
  const symOut = { pos: [], ord: [], across: [], idx: [] };
  {
    const at = (deg, R = SYMBOL_R) => new THREE.Vector3(Math.cos((deg * Math.PI) / 180) * R, Math.sin((deg * Math.PI) / 180) * R, 0);
    const W = 0.85;
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
  const symMat = lineMaterial(hdr(1.0, 0.76, 0.46, 4.5));
  const symbol = new THREE.Mesh(ribbonGeo(symOut), symMat);
  symbol.frustumCulled = false;
  symGroup.add(symbol);

  /* ── the ribbon: one band of light that winds up round the pillar, from the lotus to the star ── */
  const SEG = 900;
  const ribPos = new Float32Array((SEG + 1) * 2 * 3), ribOrd = new Float32Array((SEG + 1) * 2), ribAcross = new Float32Array((SEG + 1) * 2);
  const ribIdx = [];
  const ribbonAt = (s, out) => {
    // wide just above the flower, narrowing to nothing at the star
    const R = 86 * ease(s / 0.05) * Math.pow(1 - s, 0.9) + 2.5 * (1 - s);
    const th = -0.5 + s * TURNS * Math.PI * 2;
    return out.set(LOTUS.x + Math.sin(th) * R, HEART_Y + 4 + (APEX_Y - HEART_Y - 4) * s, LOTUS.z + Math.cos(th) * R);
  };
  {
    const c = new THREE.Vector3(), radial = new THREE.Vector3(), wdir = new THREE.Vector3();
    for (let i = 0; i <= SEG; i++) {
      const s = i / SEG;
      ribbonAt(s, c);
      radial.set(c.x - LOTUS.x, 0, c.z - LOTUS.z).normalize();
      // the band stands on edge, leaning out a little, like a banked road
      wdir.set(radial.x * 0.45, 0.89, radial.z * 0.45).normalize();
      const w = (6.5 * (1 - 0.6 * s) + 0.6) * Math.min(1, s / 0.03 + 0.15);
      for (let j = 0; j < 2; j++) {
        const sgn = j ? -1 : 1;
        ribPos.set([c.x + wdir.x * w * sgn, c.y + wdir.y * w * sgn, c.z + wdir.z * w * sgn], (i * 2 + j) * 3);
        ribOrd[i * 2 + j] = s;
        ribAcross[i * 2 + j] = sgn;
      }
      if (i < SEG) ribIdx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 2, i * 2 + 1, i * 2 + 3);
    }
  }
  const ribGeo = new THREE.BufferGeometry();
  ribGeo.setAttribute('position', new THREE.BufferAttribute(ribPos, 3));
  ribGeo.setAttribute('ord', new THREE.BufferAttribute(ribOrd, 1));
  ribGeo.setAttribute('across', new THREE.BufferAttribute(ribAcross, 1));
  ribGeo.setIndex(ribIdx);
  const ribMat = new THREE.ShaderMaterial({
    ...additive,
    side: THREE.DoubleSide,
    uniforms: { draw: { value: 0 }, power: { value: 1 }, time: { value: 0 } },
    vertexShader: /* glsl */ `attribute float ord; attribute float across; varying float vOrd; varying float vAcross;
      void main() { vOrd = ord; vAcross = across; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `uniform float draw; uniform float power; uniform float time; varying float vOrd; varying float vAcross;
      void main() {
        float on = smoothstep(0.0, 0.006, draw - vOrd);
        float head = exp(-pow((draw - vOrd) * 45.0, 2.0)) * step(0.0, draw - vOrd) * step(draw, 0.999);
        float e = abs(vAcross);
        // brighter along its two edges, soft at the very rim; light runs up it
        float prof = (0.42 + 0.58 * pow(e, 2.5)) * smoothstep(1.0, 0.84, e);
        float flow = 0.95 + 0.05 * sin(vOrd * 140.0 - time * 1.6);
        vec3 col = mix(vec3(1.0, 0.31, 0.085), vec3(1.0, 0.5, 0.2), pow(e, 2.0));
        gl_FragColor = vec4(col * prof * flow * (on * 0.7 + head * 2.4) * power, 1.0);
      }`,
  });
  const band = add(new THREE.Mesh(ribGeo, ribMat));
  band.frustumCulled = false;
  // its head: the nine lights, now one
  const head = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: hdr(1.0, 0.82, 0.6, 2.6), ...additive, depthTest: true, opacity: 0 })));
  head.scale.setScalar(26);
  const headLight = add(new THREE.PointLight(0xffc890, 0, 300, 1.4));

  /* ── the fields of rings on the water ── */
  const fields = FIELDS.map(([x, z, R]) => {
    const m = add(new THREE.Mesh(new THREE.CircleGeometry(R, 128), ringsMaterial(R)));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.03, z);
    m.renderOrder = 2;
    return m;
  });
  // the waking wave's front, crossing the whole plain
  const waveMat = ringsMaterial(100);
  const waveMesh = add(new THREE.Mesh(new THREE.RingGeometry(1, 100, 160, 1), waveMat));
  waveMesh.rotation.x = -Math.PI / 2;
  waveMesh.position.set(MARK.x, 0.035, MARK.z);
  waveMesh.renderOrder = 2;

  /* ── orange haze low on the horizon behind the lotus and its spires, so they stand dark against it ── */
  const hazeMat = new THREE.ShaderMaterial({
    ...additive,
    side: THREE.DoubleSide,
    uniforms: { time: { value: 0 }, power: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `uniform float time; uniform float power; varying vec2 vUv;
      float hh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hh(i), hh(i + vec2(1, 0)), f.x), mix(hh(i + vec2(0, 1)), hh(i + vec2(1, 1)), f.x), f.y); }
      void main() {
        // banks of lit smoke: billowing shapes, brightest low down, thinning to nothing above
        vec2 q = vec2(vUv.x * 26.0 + time * 0.006, vUv.y * 3.2);
        float n = vn(q) * 0.5 + vn(q * 2.3 + 4.0) * 0.3 + vn(q * 5.1 - time * 0.015) * 0.2;
        float top = 0.4 + 0.6 * vn(vec2(vUv.x * 9.0 + 3.0, 1.0));
        float v = (1.0 - smoothstep(0.0, top, vUv.y)) * smoothstep(0.0, 0.03, vUv.y);
        float ends = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
        gl_FragColor = vec4(vec3(1.0, 0.4, 0.14) * power * v * ends * (0.25 + 1.1 * n * n), 1.0);
      }`,
  });
  // (a wall that curves behind the avenue: open toward the plain)
  const haze = add(new THREE.Mesh(new THREE.CylinderGeometry(150, 150, 110, 96, 1, true, Math.PI - 1.9, 3.8), hazeMat));
  haze.position.set(0, 55, -150);
  haze.frustumCulled = false;

  /* ── the nine lights: six diamonds and three seeds, leaving the lantern ── */
  const LIGHT_COLORS = [...Array(6)].map(() => new THREE.Color(1.8, 1.9, 2.2)).concat([new THREE.Color(0.5, 2.2, 1.4), new THREE.Color(0.6, 1.0, 2.4), new THREE.Color(2.4, 0.6, 0.45)]);
  const lights = LIGHT_COLORS.map((c) => {
    const s = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: c, ...additive, depthTest: true, opacity: 0 })));
    s.userData = { from: new THREE.Vector3() };
    return s;
  });
  const HEART = new THREE.Vector3(LOTUS.x, HEART_Y + 4, LOTUS.z);

  /* ── the crowd's places before the avenue: rows either side of a clear lane down the middle ── */
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
    envStart: false,
    envMid: false,
    envEnd: false,
    rang: [false, false, false],
    lightsLaunched: 0,
    waveR: 0,
    lightPos: HEART.clone(),
    locked: false,
    tiltUp: 0,
    turn: false,
    night: 0,
    glow: 0,
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
    /** (Light shafts were the diamond's; the ending has none now.) */
    get shafts() {
      return 0;
    },
    /** How brightly the ending's light falls on the plain, 0..1. */
    get glow() {
      return F.glow;
    },
    /** Whether the view is being lifted to follow the light (the player can still look round). */
    get tiltUp() {
      return F.tiltUp;
    },
    /** Whether the view is being turned toward the lotus (briefly, as the lights leave). */
    get turn() {
      return F.turn;
    },
    /** Where the light is that the crowd looks at: the ribbon's head, then the star. */
    diamondPos: F.lightPos,
    gate: { z: GATE_Z, half: GATE_HALF },
    mark: MARK,
    pillar,
    start(t) {
      F.phase = 1;
      F.startAt = t;
      F.night = 1;
      g.visible = true;
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
          return 'Walk into the light.';
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
     * ctx: { pos (player), raise (0..1), lanternPos (world), companion, camPos }.
     * Returns events: 'arrived', 'light' {i}, 'fused', 'rays', 'cuts' {n}, 'turn', 'corner' {k}, 'env', 'free', 'through'.
     */
    update(t, dt, ctx) {
      const ev = [];
      if (!F.phase) return ev;
      const P = ctx.pos;
      for (const m of [starMat, symMat, ribMat, hazeMat, waveMat]) m.uniforms.time.value = t;
      for (const f of fields) f.material.uniforms.time.value = t;
      if (!F.envStart) {
        F.envStart = true;
        ev.push({ type: 'env' }); // the night has changed: what the lantern's metal mirrors must change with it
      }

      // 1 → 2: arrive at the rings
      const dMark = Math.hypot(P.x - MARK.x, P.z - MARK.z);
      if (F.phase === 1 && dMark < 10) {
        F.phase = 2;
        ev.push({ type: 'arrived' });
      }
      // 2: hold the lantern up inside the rings
      if (F.phase === 2) {
        F.hold = ctx.raise > 0.6 && dMark < 12 ? F.hold + dt : Math.max(0, F.hold - dt * 2);
        if (F.hold >= HOLD) {
          F.phase = 3;
          F.offerAt = t;
          for (const L of lights) L.userData.from.copy(ctx.lanternPos);
        }
      }

      // 3: the lights cross the water and rise
      const s3 = F.phase >= 3 ? t - F.offerAt : -1;
      let rise = 0;
      if (F.phase >= 3) {
        // the nine lights leave the lantern one by one, skim the water down the pillar's reflection, and gather at the flower
        lights.forEach((L, i) => {
          const t0 = T3.fly + i * 0.25;
          const k = (s3 - t0) / 3.2;
          if (s3 >= t0 && F.lightsLaunched <= i) {
            F.lightsLaunched = i + 1;
            ev.push({ type: 'light', i });
          }
          if (k < 0) {
            L.material.opacity = 0;
            return;
          }
          const e = ease(Math.min(1, k));
          L.position.lerpVectors(L.userData.from, HEART, e);
          // low over the water on the way, weaving a little; then circling the heart, closing to one point
          L.position.y = L.userData.from.y * (1 - e) + HEART.y * e * e * e + Math.sin(e * Math.PI) * 0.6;
          const close = 1 - span(s3, T3.gather, T3.rise);
          const ang = e * Math.PI * 3 + (i / 9) * Math.PI * 2 + Math.max(0, s3 - T3.gather) * 2.5;
          const rad = (Math.sin(Math.PI * Math.min(1, e)) * 2.2 + (k >= 1 ? 5 : 0) * e) * close;
          L.position.x += Math.cos(ang) * rad;
          L.position.z += Math.sin(ang) * rad * 0.5;
          L.material.opacity = s3 < T3.rise + 0.3 ? 1 : Math.max(0, 1 - (s3 - T3.rise - 0.3) * 2);
          L.scale.setScalar(0.5 + e * 5);
        });
        rise = span(s3, T3.rise, T3.top);
        if (rise > 0 && !F.fused) {
          F.fused = true;
          ev.push({ type: 'fused' });
        }
        if (s3 >= T3.rays && !F.raysOn) {
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
        sleepers.crowd.faceTo = F.lightPos;
        sleepers.crowd.lookUp = F.phase === 3 ? span(s3, T3.wave, T3.wave + 4) : F.phase === 4 ? 0.6 : 0.3;
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

      // 4: the star and the symbol
      const s4 = F.phase >= 4 ? t - F.p4At : -1;
      const burst = F.phase >= 4 ? span(s4, T4.burst0, T4.burst1) : 0;
      const symOn = F.phase >= 4 ? span(s4, T4.symbol0, T4.symbol1) : 0;
      if (F.phase >= 4) {
        // a bell as each part of the figure closes: the triangle, the six-pointed figure, the circle
        [0.3, 0.65, 0.999].forEach((m, k) => {
          if (symOn >= m && !F.rang[k]) {
            F.rang[k] = true;
            ev.push({ type: 'corner', k });
          }
        });
        if (s4 >= T4.send && !F.sent) {
          F.sent = true;
          // every awake sleeper to a place before the avenue, the nearest to it taking the front rows
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
      F.locked = F.phase === 3 || F.phase === 4;
      // the view: turned to the lotus as the lights leave, then lifted to follow the ribbon to the star
      F.turn = F.phase === 3 && s3 < 3.5;
      F.tiltUp = (F.phase === 3 && s3 > T3.rise + 1.5) || (F.phase === 4 && s4 < T4.look) ? 1 : 0;

      // the rings on the water: the first burns from the start; the others catch as the lights pass over
      const charge = F.phase === 2 ? Math.min(1, F.hold / HOLD) : F.phase >= 3 ? 1 - span(s3, 2, 8) * 0.7 : 0;
      fields.forEach((f, k) => {
        // (the second burns low from the start, as in the film; both catch fully when the lights pass over them)
        const caught = F.phase >= 3 ? span(s3, k === 1 ? T3.field1 : T3.field2, (k === 1 ? T3.field1 : T3.field2) + 1.2) : 0;
        const lit = k === 0 ? 1 : k === 1 ? 0.5 + 0.5 * caught : caught;
        f.material.uniforms.power.value = lit * (0.8 + 0.2 * Math.sin(t * 1.3 + k)) * (1 + (k === 0 ? charge * 0.8 : 0));
        f.material.uniforms.charge.value = k === 0 ? charge : 0;
      });
      waveMat.uniforms.power.value = 0;
      waveMat.uniforms.wave.value = F.waveR > 0.5 && F.waveR < 100 ? F.waveR : 0;
      waveMesh.visible = waveMat.uniforms.wave.value > 0;

      // the pillar, its cone of rays and its star
      const flare = burst * (1 - span(s4, T4.burst1, T4.burst1 + 6) * 0.35);
      pillar.power = 0.95 + 0.07 * Math.sin(t * 5.46) + 0.5 * flare;
      pillar.update(t, ctx.camPos);
      cones.forEach((c, k) => {
        c.material.uniforms.power.value = (0.62 + 0.3 * rise + 0.55 * flare) * (0.94 + 0.06 * Math.sin(t * 0.9 + k * 2));
        c.material.uniforms.drift.value = t * 0.0016 * (k % 2 ? -1 : 1);
      });
      star.quaternion.copy(ctx.camQuat || star.quaternion);
      starMat.uniforms.power.value = 1;
      starMat.uniforms.burst.value = burst;
      hazeMat.uniforms.power.value = 0.7 * (0.9 + 0.1 * Math.sin(t * 0.4)) * (1 + 0.4 * flare);

      // the ribbon and its head
      ribMat.uniforms.draw.value = rise;
      ribMat.uniforms.power.value = 1 + 0.25 * flare;
      if (rise > 0 && rise < 1) ribbonAt(rise, F.lightPos);
      else if (rise >= 1) F.lightPos.copy(APEX);
      else F.lightPos.copy(HEART);
      head.position.copy(F.lightPos);
      head.material.opacity = rise > 0 && rise < 1 ? 0.9 : rise >= 1 ? Math.max(0, 0.9 - s4 * 0.5) : span(s3, T3.gather, T3.rise) * 0.8;
      headLight.position.copy(F.lightPos);
      headLight.intensity = rise > 0 && rise < 1 ? 500 : 0;

      // the symbol
      symMat.uniforms.draw.value = symOn;

      // how much of all this falls on the plain (the crowd's faces, the far crowd's pictures)
      F.glow = Math.min(1, 0.1 * F.night + 0.4 * rise + 0.35 * flare);

      // 5 → 6: into the avenue
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
    /** (The ending used to turn the sky to dawn. It stays night now: see `night`.) */
    get dawn() {
      return 0;
    },
    /** The ending's night, 0..1: what this scene asks of the sky, the air and the other places' lights. */
    get night() {
      return F.night;
    },
  };
  return api;
};
