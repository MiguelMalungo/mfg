import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import { petalGeometry, needleTower, mergeGeos } from './monuments.js';
import { rng } from './textures.js';
import { buildPillar } from './pillar.js';

/*
 * Inside the lotus (heart): life's rhythm. After the owner's reference (refs/lotus-beam.webp):
 * a wide black lake at night, ringed far off by a city of needle spires with small amber lights.
 * In the middle of the lake a luminous lotus flower; from its heart a pillar of light rises to the
 * top of the sky, with a fan of fine rays round it. Each heartbeat sends a ring of fire across the
 * water.
 *
 * The trial follows Gurdjieff's Law of Seven: seven lamps on the water are the seven notes of an
 * octave (do re mi fa sol la si). Each heartbeat sends a ring of light across the water; raise the
 * lantern as the ring reaches the glowing lamp, three beats in a row, and it lights with its note.
 * At the two intervals of the octave (after mi, and after si) the heart falters and stops: a shock
 * is needed, given by remembering yourself (stand still, hold Space), and the heart beats again.
 * When the octave completes, the flower opens fully and the heart gives its seed.
 *
 * The pillar reports the trial: it grows with each lamp lit, breaks when the heart falters, flares
 * at the shock, and burns at its full height when the octave is complete.
 *
 * Like the tower's hall it stands far from the plain, reached by fading in through the lotus's door.
 */

export const LOTUS_IN = new THREE.Vector3(1500, 0, -500);
const R_PLAY = 30; // how far from the flower the player may wander (there is no wall: mist marks it)
const R_FLOWER = 7; // the player keeps this far from the flower
const R_LAMPS = 9; // the lamps' ring
const BEAT = 1.15; // the same heartbeat as the lotus outside
const CROSS = 0.7; // seconds for a beat's ring to reach the lamps
const WINDOW = 0.3; // how early or late the lantern may rise and still keep time
export const HEART_Y = 2.2; // the heart burns inside the flower, just above the water
const RING_V = (R_LAMPS - 1) / CROSS; // a ring starts at 1 m and reaches the lamps CROSS seconds later
export const NOTES = [
  ['do', 261.63],
  ['re', 293.66],
  ['mi', 329.63],
  ['fa', 349.23],
  ['sol', 392.0],
  ['la', 440.0],
  ['si', 493.88],
  ['do', 523.25],
];
const hdr = (r, g, b, k) => new THREE.Color(r * k, g * k, b * k);

/** Warm points of light that flicker, each to its own rhythm. Sizes in metres, clamped in pixels. */
const pointsMaterial = (glowTex, color, size, minPx, maxPx, fade = 0.0) =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
    uniforms: { time: { value: 0 }, tex: { value: glowTex }, scale: { value: 600 }, color: { value: color } },
    vertexShader: /* glsl */ `
      attribute float seed; uniform float time; uniform float scale; varying float vA;
      void main() {
        vec3 p = position;
        p.y += sin(time * 0.8 + seed * 30.0) * 0.03 * step(p.y, 0.5);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float d = -mv.z;
        vA = (0.6 + 0.4 * sin(time * (1.2 + seed * 3.0) + seed * 40.0)) * exp(-d * ${fade.toFixed(5)});
        gl_PointSize = clamp(scale * ${size.toFixed(3)} * (0.7 + seed * 0.6) / d, ${minPx.toFixed(1)}, ${maxPx.toFixed(1)});
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tex; uniform vec3 color; varying float vA;
      void main() {
        float a = texture2D(tex, gl_PointCoord).a;
        gl_FragColor = vec4(color * vA * a, a);
      }`,
  });

const pointsFrom = (pts, mat) => {
  const p = new Float32Array(pts.length * 3);
  const s = new Float32Array(pts.length);
  pts.forEach(([x, y, z, k], i) => {
    p.set([x, y, z], i * 3);
    s[i] = k;
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  geo.setAttribute('seed', new THREE.BufferAttribute(s, 1));
  const m = new THREE.Points(geo, mat);
  m.frustumCulled = false;
  return m;
};

export const buildLotusInterior = ({ scene, glowTex, normalMap }) => {
  const g = new THREE.Group();
  g.position.copy(LOTUS_IN);
  const add = (m) => (g.add(m), m);
  const r = rng(4242);
  const pointMats = [];

  /* ── the lake: black, still, a true mirror for the pillar and the city's lights ── */
  const water = new Water(new THREE.CircleGeometry(420, 96), {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: normalMap,
    sunDirection: new THREE.Vector3(0, 1, 0),
    sunColor: 0x000000,
    waterColor: 0x050302,
    distortionScale: 0.35,
    fog: true,
  });
  water.rotation.x = -Math.PI / 2;
  water.material.uniforms.size.value = 1.4;
  add(water);

  /* ── the flower: three rings of luminous petals round the heart ── */
  const glow = { value: 1 };
  const petalMat = new THREE.MeshStandardMaterial({ color: 0x2a1610, roughness: 0.55, side: THREE.DoubleSide, emissive: 0x000000 });
  petalMat.onBeforeCompile = (sh) => {
    sh.uniforms.glow = glow;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vT;').replace('#include <begin_vertex>', '#include <begin_vertex>\n vT = position.y;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vT; uniform float glow;')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        // white-orange at the foot, peach at the tip; the edges glow, as thin petals do against a light behind them
        vec3 petalE = mix(vec3(1.0, 0.48, 0.3) * 0.45, vec3(1.0, 0.58, 0.32) * 1.9, pow(1.0 - vT, 1.6));
        float petalRim = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 1.5);
        totalEmissiveRadiance += petalE * (0.35 + 0.9 * petalRim) * glow;`,
      );
  };
  petalMat.customProgramCacheKey = () => 'lotus-flower-v3';
  const petals = [];
  // [count, base radius, size, tilt closed, extra tilt when open, angle offset, curl]
  for (const [n, rad, s, tilt0, dTilt, off, curl] of [
    [5, 0.45, 4.2, 0.14, 0.35, 0, 0.18],
    [8, 0.95, 4.6, 0.42, 0.45, Math.PI / 8, 0.25],
    [8, 1.5, 5.0, 0.82, 0.42, 0, 0.35],
  ]) {
    const geo = petalGeometry(curl);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + off;
      const p = new THREE.Mesh(geo, petalMat);
      p.rotation.order = 'YXZ';
      p.rotation.set(tilt0, a, 0);
      p.position.set(Math.sin(a) * rad, -0.15, Math.cos(a) * rad);
      p.scale.set(s * 1.1, s, s * 0.8);
      p.userData = { tilt0, dTilt };
      add(p);
      petals.push(p);
    }
  }

  /* ── the heart: a churning ember inside the flower ── */
  const heartMat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, power: { value: 2 } },
    vertexShader: /* glsl */ `varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main() { vP = position; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `varying vec3 vN; varying vec3 vV; varying vec3 vP; uniform float time; uniform float power;
      float h(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float n3(vec3 p) { vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); }
      void main() {
        float facing = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
        vec3 q = vP * 2.4 + vec3(0.0, time * 0.25, 0.0);
        float fl = n3(q) * 0.6 + n3(q * 2.3 - time * 0.2) * 0.4;
        vec3 col = mix(vec3(0.8, 0.2, 0.06), vec3(1.0, 0.6, 0.35), smoothstep(0.1, 0.7, facing + fl * 0.35));
        col = mix(col, vec3(1.0, 0.9, 0.78), smoothstep(0.7, 1.0, facing) * (0.5 + fl * 0.5));
        gl_FragColor = vec4(col * power, 1.0);
      }`,
  });
  const heart = add(new THREE.Mesh(new THREE.SphereGeometry(0.9, 40, 24), heartMat));
  heart.position.y = HEART_Y;
  const heartGlow = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(1.6, 0.7, 0.4), transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
  heartGlow.position.y = HEART_Y + 0.6;
  heartGlow.scale.setScalar(11);
  const heartLight = add(new THREE.PointLight(0xff7a4a, 160, 70, 1.8));
  heartLight.position.y = HEART_Y + 0.5;
  // a soft fill from high on the pillar, so the lamps and the player's arm are not black
  const fill = add(new THREE.PointLight(0xffa070, 50, 60, 1.5));
  fill.position.set(0, 12, 0);

  /* ── the pillar of light ── */
  const pillar = buildPillar({ height: 700, fanAngles: [9, 14] });
  pillar.group.position.y = HEART_Y;
  add(pillar.group);

  /* ── the rings of fire on the water ── */
  const beatT = new Array(6).fill(-100);
  const ringsMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
    uniforms: { time: { value: 0 }, beatT: { value: beatT }, power: { value: 0 }, flood: { value: 0 }, speed: { value: RING_V }, shift: { value: new THREE.Vector2() }, help: { value: 1 } },
    vertexShader: /* glsl */ `varying vec2 vXZ; void main() { vXZ = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float time; uniform float beatT[6]; uniform float power; uniform float flood; uniform float speed; uniform vec2 shift; uniform float help;
      varying vec2 vXZ;
      float hh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hh(i), hh(i + vec2(1, 0)), f.x), mix(hh(i + vec2(0, 1)), hh(i + vec2(1, 1)), f.x), f.y); }
      void main() {
        // in the drift the rings are no longer centred on the flower (shift), though the edges stay put
        float r = length(vXZ - shift);
        float r0 = length(vXZ);
        // standing fine ripples, as in the reference: about one ring per 1.3 m, drifting slowly outward
        float ripple = pow(0.5 + 0.5 * sin(r * 4.8 - time * 0.9), 18.0);
        // each beat's front starts at 1 m and reaches the lamps (9 m) exactly CROSS seconds later
        float lit = 0.0, front = 0.0;
        for (int i = 0; i < 6; i++) {
          float age = time - beatT[i];
          if (age < 0.0 || age > 6.0) continue;
          float f = 1.0 + age * speed;
          float behind = f - r;
          lit += step(0.0, behind) * exp(-behind * 0.35) * exp(-age * 0.25);
          front += exp(-behind * behind * 14.0) * exp(-age * 0.2);
        }
        lit = max(lit, flood);
        // grain: the rings are made of sparks, not solid lines
        float gr = vn(vXZ * 4.0 + vec2(time * 0.05, 0.0)) * 0.5 + vn(vXZ * 13.0 - time * 0.1) * 0.5;
        float grain = 0.2 + 0.8 * smoothstep(0.25, 0.8, gr);
        float edge = smoothstep(45.0, 28.0, r0) * smoothstep(5.5, 7.5, r0);
        // help: how much the level still carries the player (the fronts dim as they must carry it themselves)
        float glowR = (ripple * (0.2 * power + lit * help) + front * 1.6 * (0.6 + 0.4 * ripple) * help) * grain * edge;
        vec3 col = mix(vec3(1.0, 0.25, 0.08), vec3(1.0, 0.68, 0.4), clamp(lit * 0.7 + front * 0.5, 0.0, 1.0));
        gl_FragColor = vec4(col * glowR * 1.3, 1.0);
      }`,
  });
  const rings = add(new THREE.Mesh(new THREE.CircleGeometry(45, 160), ringsMat));
  rings.rotation.x = -Math.PI / 2;
  rings.position.y = 0.02;
  rings.renderOrder = 2;

  /* ── the seven lamps: small bronze lotus-cups on the water, each with its note ── */
  const bronze = new THREE.MeshStandardMaterial({ color: 0xb08a58, metalness: 0.7, roughness: 0.4, emissive: 0x1a0d05, side: THREE.DoubleSide });
  const lampPetal = petalGeometry(0.3);
  const lamps = [];
  for (let i = 0; i < 7; i++) {
    // round the circle, starting to the left of the way in and going on round
    const a = Math.PI * 0.78 - (i / 7) * Math.PI * 2;
    const L = new THREE.Group();
    L.position.set(Math.sin(a) * R_LAMPS, 0, Math.cos(a) * R_LAMPS);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.14, 0.16, 12), bronze);
    cup.position.y = 0.11;
    L.add(cup);
    for (let k = 0; k < 9; k++) {
      const pa = (k / 9) * Math.PI * 2;
      const pt = new THREE.Mesh(lampPetal, bronze);
      pt.rotation.order = 'YXZ';
      pt.rotation.set(0.75, pa, 0);
      pt.position.set(Math.sin(pa) * 0.16, 0.12, Math.cos(pa) * 0.16);
      pt.scale.setScalar(0.62);
      L.add(pt);
    }
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(2.4, 1.3, 0.5), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    flame.position.y = 0.55;
    flame.scale.set(0.5, 0.75, 1);
    L.add(flame);
    // the waiting lamp: a soft pool of light lying on the water round it; three dots count the beats kept
    const mark = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), new THREE.MeshBasicMaterial({ map: glowTex, color: new THREE.Color(1.5, 0.8, 0.45), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    mark.rotation.x = -Math.PI / 2;
    mark.position.y = 0.03;
    L.add(mark);
    const dots = [0, 1, 2].map((k) => {
      const d = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(2, 1.4, 0.8), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      d.position.set((k - 1) * 0.32, 1.25, 0);
      d.scale.setScalar(0.22);
      L.add(d);
      return d;
    });
    add(L);
    lamps.push({ L, flame, mark, dots, lit: 0, name: NOTES[i][0], freq: NOTES[i][1] });
  }

  /* ── the city on the far shore: needle spires, near-black against the haze, with amber lights ── */
  {
    const geos = [];
    const towerLights = [];
    const place = (a, rad, h, w, keep) => needleTower(r, geos, towerLights, Math.sin(a) * rad, Math.cos(a) * rad, h, w, keep);
    // the giants, placed as in the reference: a great spire left of the flower, a broad one right of it,
    // a cliff-like mass toward each edge of the view from the way in, and one behind
    for (const [a, rad, h, w] of [[Math.PI + 0.3, 235, 230, 13], [Math.PI - 0.26, 265, 175, 18], [Math.PI + 0.85, 205, 205, 16], [Math.PI - 0.95, 215, 190, 15], [0.75, 250, 165, 13]]) place(a, rad, h, w, 0.015);
    for (let i = 0; i < 260; i++) {
      const a = r() * Math.PI * 2;
      // keep the water toward the way in (+z) more open
      const fromIn = Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
      if (fromIn < 0.18 && r() < 0.7) continue;
      const rad = 150 + Math.pow(r(), 0.8) * 180;
      const h = 18 + Math.pow(r(), 1.6) * 72 * (0.6 + (rad - 150) / 300);
      place(a, rad, h, 2.6 + r() * 5, 0.03);
    }
    const city = add(new THREE.Mesh(mergeGeos(geos), new THREE.MeshBasicMaterial({ color: 0x070505 })));
    city.matrixAutoUpdate = false;
    city.updateMatrix();
    // lights crowd along the water line, as in the reference, then thin out up the towers
    const shore = [];
    for (let i = 0; i < 3600; i++) {
      const a = r() * Math.PI * 2;
      const rad = 146 + Math.pow(r(), 1.5) * 150;
      shore.push([Math.sin(a) * rad, 0.15 + Math.pow(r(), 2.2) * 12, Math.cos(a) * rad, r()]);
    }
    const lightMat = pointsMaterial(glowTex, hdr(1.0, 0.55, 0.2, 3), 1.6, 1.2, 9, 0.0012);
    pointMats.push(lightMat);
    add(pointsFrom(towerLights.concat(shore), lightMat));

    // orange haze low on the horizon, behind the city so the spires stand dark against it,
    // and a fainter band nearer in for depth
    const hazeMat = (k) =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
        side: THREE.DoubleSide,
        uniforms: { time: { value: 0 }, k: { value: k } },
        vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float time; uniform float k; varying vec2 vUv;
          float hh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
            return mix(mix(hh(i), hh(i + vec2(1, 0)), f.x), mix(hh(i + vec2(0, 1)), hh(i + vec2(1, 1)), f.x), f.y); }
          void main() {
            vec2 q = vec2(vUv.x * 60.0 + time * 0.01, vUv.y * 3.0);
            float n = vn(q) * 0.55 + vn(q * 2.7 + 4.0) * 0.3 + vn(q * 6.1 - time * 0.02) * 0.15;
            float v = pow(1.0 - vUv.y, 2.2) * smoothstep(0.0, 0.05, vUv.y);
            gl_FragColor = vec4(vec3(1.0, 0.42, 0.16) * k * v * (0.35 + 0.9 * n), 1.0);
          }`,
      });
    const hazeFar = add(new THREE.Mesh(new THREE.CylinderGeometry(345, 345, 150, 128, 1, true), hazeMat(0.75)));
    hazeFar.position.y = 75;
    const hazeNear = add(new THREE.Mesh(new THREE.CylinderGeometry(140, 140, 12, 128, 1, true), hazeMat(0.12)));
    hazeNear.position.y = 6;
    pointMats.push(hazeFar.material, hazeNear.material);
  }

  /* ── the edge of the play area: no wall, only low mist; and the candle-lit way in and out ── */
  const mistMat = new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(0.38, 0.22, 0.14), transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const mists = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2 + r() * 0.1;
    const rad = 31 + r() * 5;
    const m = add(new THREE.Sprite(mistMat));
    m.position.set(Math.sin(a) * rad, 0.6, Math.cos(a) * rad);
    m.scale.set(14 + r() * 6, 2.4 + r() * 1.2, 1);
    m.userData = { a, rad, s: r() };
    mists.push(m);
  }
  {
    const lane = [];
    for (let z = 13; z < 72; z += 1.5 + r() * 0.6) for (const side of [-1, 1]) lane.push([side * (2.4 + r() * 0.5), 0.07, z, r()]);
    const laneMat = pointsMaterial(glowTex, hdr(1.0, 0.62, 0.3, 2.4), 0.55, 1.6, 18);
    pointMats.push(laneMat);
    add(pointsFrom(lane, laneMat));
  }

  scene.add(g);
  const resize = () => {
    const k = innerHeight * Math.min(devicePixelRatio, 1.5) * 0.9;
    for (const m of pointMats) if (m.uniforms.scale) m.uniforms.scale.value = k;
  };
  resize();
  addEventListener('resize', resize);

  /*
   * The trial (LOTUS_SHOCKS_PLAN.md). The octave's two intervals are two different shocks:
   *  - after mi, the drift: the heart keeps beating but bends away, unannounced. Doing more of the
   *    same (raising the lantern at the lamp) or following the false light only makes it worse.
   *    Only stopping to remember yourself (stand still, hold Space) brings it back.
   *  - from fa on, the level carries you less and less (help); remembering yourself renews it.
   *  - after si, the silence: the heart stops. Go back to where you began (do) and give the beat
   *    yourself, three times in its tempo, and the heart answers.
   * Nothing is lost but time.
   */
  const DRIFT_RATE = 1 / 40; // lean per second, left alone
  const HOLLOW_LEAN = 0.06; // each mechanical raise at the lamp
  const DECOY_LEAN = 0.15; // following the false light
  const HELP_FLOOR = 0.35;
  const HELP_FALL = 14; // seconds from 1 to the floor
  const OWN_TOL = 0.35, OWN_TOL_EASY = 0.45;

  /* the false light of the drift: cold, off the circle, with its own pool on the water */
  const decoy = new THREE.Group();
  const decoyFlame = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(1.4, 1.7, 2.0), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  decoyFlame.position.y = 1.8;
  decoyFlame.scale.set(2.6, 4.2, 1);
  decoy.add(decoyFlame);
  const decoyPool = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshBasicMaterial({ map: glowTex, color: new THREE.Color(0.9, 1.1, 1.3), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  decoyPool.rotation.x = -Math.PI / 2;
  decoyPool.position.y = 0.035;
  decoy.add(decoyPool);
  add(decoy);
  // where it burns: 110° round from the lamp fa, away from the way in, so a player standing at fa sees it
  // across the water past the flower (the plan's 70° put it out of view); it moves on when approached
  const faAngle = Math.PI * 0.78 - (3 / 7) * Math.PI * 2;
  let decoyA = faAngle - (110 * Math.PI) / 180;
  const placeDecoy = () => decoy.position.set(Math.sin(decoyA) * 14, 0, Math.cos(decoyA) * 14);
  placeDecoy();

  /* the trial's state */
  const T = {
    active: 0, // the lamp waiting to be lit
    hits: 0, // beats kept in a row at it
    phase: 'beat', // 'beat' | 'drift' | 'silence' | 'done'
    phaseAt: 0,
    lean: 0, // 0..1, how far the heart has drifted
    leanAtShock: 0,
    hold: 0, // seconds of self-remembering given toward the first shock
    help: 1, // 1..HELP_FLOOR, how much the level carries the player
    helpLow: false, // help has fallen below 0.6 at least once
    remHold: 0,
    own: [], // the player's own beats in the silence
    ownFails: 0,
    pulseBack: false, // the faint pulse returned in the silence
    pulseN: -1,
    lastPress: -99,
    shocks: 0,
    done: false,
    open: 0,
    beatOrigin: 0, // when the current run of beats began (shifts when the heart resumes)
    lastBeat: -1,
    crossings: [], // { tc, judged }
    pulse: 0,
  };
  // older code asks whether the heart has faltered: at either interval
  Object.defineProperty(T, 'falter', { get: () => T.phase === 'drift' || T.phase === 'silence' });
  // what the pillar and the flower show
  const look = { lastBeatAt: -100, shockAt: -100, doneAt: -1, open: 0.1, broken: 0, power: 0.15, decoy: 0 };
  const local = new THREE.Vector3();
  const leanAxis = new THREE.Vector3();

  const near = (pos, i, r = 4.5) => Math.hypot(pos.x - (LOTUS_IN.x + lamps[i].L.position.x), pos.z - (LOTUS_IN.z + lamps[i].L.position.z)) < r;
  const ring = (tb) => {
    beatT.shift();
    beatT.push(tb);
    look.lastBeatAt = tb;
  };
  const enter = (phase, t) => {
    T.phase = phase;
    T.phaseAt = t;
  };

  const api = {
    group: g,
    trial: T,
    lamps,
    pillar,
    centre: LOTUS_IN,
    heartY: HEART_Y,
    entry: LOTUS_IN.clone().add(new THREE.Vector3(0, 0, R_PLAY - 4)),
    contains: (p) => Math.hypot(p.x - LOTUS_IN.x, p.z - LOTUS_IN.z) < R_PLAY + 12,
    atExit: (p) => p.z - LOTUS_IN.z > R_PLAY - 3 && Math.abs(p.x - LOTUS_IN.x) < 4,
    collide(p) {
      local.subVectors(p, LOTUS_IN);
      let d = Math.hypot(local.x, local.z);
      // not into the flower
      if (d < R_FLOWER) {
        const k = R_FLOWER / Math.max(d, 1e-3);
        local.x *= k;
        local.z *= k;
        d = R_FLOWER;
      }
      // the mist at the edge, except down the candle-lit way out
      const max = R_PLAY - 1;
      const inLane = local.z > 0 && Math.abs(local.x) < 4;
      if (d > max && !inLane) {
        local.x *= max / d;
        local.z *= max / d;
      }
      local.z = Math.min(R_PLAY + 2, local.z);
      p.x = local.x + LOTUS_IN.x;
      p.z = local.z + LOTUS_IN.z;
    },
    groundAt: () => 0,
    lampWorld: (i) => lamps[i].L.getWorldPosition(new THREE.Vector3()),
    /** Testing: light the first n lamps and set the phase that follows (3 → the drift, 7 → the silence). */
    debugLight(n, t) {
      lamps.forEach((L, i) => (L.lit = i < n ? 1 : 0));
      T.active = n;
      T.hits = 0;
      T.shocks = n > 3 ? 1 : 0;
      T.beatOrigin = t;
      T.lastBeat = -1;
      T.crossings = [];
      if (n === 3) enter('drift', t);
      else if (n >= 7) enter('silence', t);
      else enter('beat', t);
    },
    /**
     * ctx: { pos (player), pressAt (time the lantern was last raised), breathing (0..1), still (bool) }.
     * Returns events: 'beat', 'kept', 'missed', 'lit' {i}, 'drift', 'hollow', 'silence', 'own' {n, ok},
     * 'pulse', 'remembered', 'shock', 'complete'.
     */
    updateTrial(t, dt, ctx) {
      const ev = [];
      if (T.done) return ev;
      const raised = ctx.pressAt !== T.lastPress;
      T.lastPress = ctx.pressAt;
      const remembering = ctx.breathing > 0.7 && ctx.still;

      // the heart beats, true or drifting; in the silence it does not
      if (T.phase === 'beat' || T.phase === 'drift') {
        const n = Math.floor((t - T.beatOrigin) / BEAT);
        if (n !== T.lastBeat) {
          T.lastBeat = n;
          const tb = T.beatOrigin + n * BEAT;
          T.crossings.push({ tc: tb + CROSS, judged: false });
          ring(tb);
          ev.push({ type: 'beat' });
        }
      }

      // keeping time: judge each crossing once its window has passed (only while the heart is true)
      const lamp = lamps[T.active];
      const atLamp = lamp && near(ctx.pos, T.active);
      for (const C of T.crossings) {
        if (C.judged || t < C.tc + WINDOW) continue;
        C.judged = true;
        if (!lamp || T.phase !== 'beat' || !atLamp) continue;
        if (Math.abs(ctx.pressAt - C.tc) <= WINDOW) {
          T.hits++;
          ev.push({ type: 'kept', n: T.hits });
          if (T.hits >= 3) {
            lamp.lit = 1;
            ev.push({ type: 'lit', i: T.active });
            T.active++;
            T.hits = 0;
            // the intervals of the octave: after mi the heart drifts; after si it falls silent
            if (T.active === 3) {
              enter('drift', t);
              T.lean = 0;
              T.hold = 0;
              ev.push({ type: 'drift' });
            } else if (T.active === 7) {
              enter('silence', t);
              T.own = [];
              T.ownFails = 0;
              T.pulseBack = false;
              T.pulseN = -1;
              ev.push({ type: 'silence' });
            }
          }
        } else if (T.hits > 0) {
          T.hits = 0;
          ev.push({ type: 'missed' });
        }
      }
      T.crossings = T.crossings.filter((C) => !C.judged || t < C.tc + 2);

      // the first interval: the drift
      if (T.phase === 'drift') {
        if (!remembering) T.lean = Math.min(1, T.lean + DRIFT_RATE * dt);
        // more of the same makes it worse
        if (raised && atLamp) {
          T.lean = Math.min(1, T.lean + HOLLOW_LEAN);
          ev.push({ type: 'hollow' });
        }
        // and so does following the new impulse: the false light moves on when you reach it
        if (look.decoy > 0.3 && Math.hypot(ctx.pos.x - LOTUS_IN.x - decoy.position.x, ctx.pos.z - LOTUS_IN.z - decoy.position.z) < 3) {
          T.lean = Math.min(1, T.lean + DECOY_LEAN);
          decoyA += (Math.random() < 0.5 ? -1 : 1) * (60 * Math.PI) / 180;
          placeDecoy();
          look.decoy = 0;
        }
        T.hold = remembering ? T.hold + dt : Math.max(0, T.hold - dt * 0.5);
        if (T.hold >= 1.5 + 2.0 * T.lean) {
          T.shocks++;
          T.leanAtShock = T.lean;
          T.beatOrigin = t; // the heart starts again, true, from here
          T.lastBeat = -1;
          T.crossings = [];
          T.help = 1;
          look.shockAt = t;
          enter('beat', t);
          ev.push({ type: 'shock' });
        }
      }

      // carrying it: after the first shock the level helps less and less; remembering yourself renews it
      if (T.phase === 'beat' && T.shocks >= 1) {
        T.help = Math.max(HELP_FLOOR, T.help - ((1 - HELP_FLOOR) / HELP_FALL) * dt);
        if (T.help < 0.6) T.helpLow = true;
        if (remembering && T.remHold >= 0) {
          T.remHold += dt;
          if (T.remHold >= 0.8) {
            T.remHold = -1; // until Space is let go
            if (T.help < 0.95) ev.push({ type: 'remembered' });
            T.help = 1;
          }
        } else if (!remembering) T.remHold = 0;
      }

      // the second interval: the silence. Give the beat yourself, at the first lamp
      if (T.phase === 'silence') {
        T.pulseBack = T.pulseBack || T.ownFails >= 2 || t - T.phaseAt > 40;
        if (T.pulseBack) {
          const n = Math.floor((t - T.phaseAt) / BEAT);
          if (n !== T.pulseN) {
            T.pulseN = n;
            ev.push({ type: 'pulse' });
          }
        }
        if (raised && near(ctx.pos, 0)) {
          const tol = T.pulseBack ? OWN_TOL_EASY : OWN_TOL;
          const last = T.own[T.own.length - 1];
          let ok = true;
          if (last === undefined) T.own = [t];
          else if (Math.abs(t - last - BEAT) <= tol) T.own.push(t);
          else {
            ok = false;
            if (T.own.length >= 2) T.ownFails++;
            T.own = [t];
          }
          ring(t); // the player is the heart now: their beat sends the ring
          ev.push({ type: 'own', n: T.own.length, ok });
          if (T.own.length >= 3) {
            T.shocks++;
            T.beatOrigin = t; // the heart answers on the beat
            T.lastBeat = -1;
            T.done = true;
            look.shockAt = t;
            look.doneAt = t;
            enter('done', t);
            ev.push({ type: 'shock' });
            ev.push({ type: 'complete' });
          }
        }
      }
      return ev;
    },
    update(t, dt, camPos) {
      const drift = T.phase === 'drift';
      const silent = T.phase === 'silence';
      // the heart's pulse: still in the silence (but for the faint returning pulse)
      const ph = (((t - T.beatOrigin) % BEAT) + BEAT) % BEAT / BEAT;
      let beat = silent ? 0 : Math.exp(-ph * 7) + 0.55 * Math.exp(-Math.abs(ph - 0.27) * 22);
      if (silent && T.pulseBack) beat = 0.25 * Math.exp(-((((t - T.phaseAt) % BEAT) / BEAT) * 7));
      T.pulse = beat;
      const dim = silent ? 0.33 + 0.05 * Math.sin(t * 2) : 1;
      const litN = lamps.reduce((n, L) => n + L.lit, 0);
      if (T.done) T.open = Math.min(1, T.open + dt * 0.15);
      // after the shock the drift eases back out over 1.5 s
      if (!drift && T.lean > 0) T.lean = Math.max(0, T.lean - (Math.max(T.leanAtShock, 0.2) / 1.5) * dt);
      const lean = T.lean;

      // the pillar reports the trial
      let power = 0.15 + 0.12 * litN + 0.15 * T.help * Math.max(0, 1 - (t - look.lastBeatAt) / 0.4);
      if (silent) power = 0.04 + (T.pulseBack ? 0.06 * beat * 4 : 0) + 0.25 * Math.max(0, 1 - (t - look.lastBeatAt) / 0.4);
      const sinceShock = t - look.shockAt;
      if (sinceShock >= 0 && sinceShock < 1) power = Math.max(power, 1.15 - (1.15 - power) * sinceShock);
      if (look.doneAt >= 0) power = Math.max(power, 0.99 + (1.3 - 0.99) * Math.min(1, (t - look.doneAt) / 3));
      look.power += (power - look.power) * (1 - Math.exp(-dt * 12));
      // only the silence breaks the pillar; in the drift it stays whole, and leans
      look.broken += ((silent ? 1 : 0) - look.broken) * (1 - Math.exp(-dt * 4));
      pillar.power = look.power;
      pillar.broken = look.broken;
      // lean toward the false light, up to about 9°
      leanAxis.set(decoy.position.z, 0, -decoy.position.x).normalize();
      pillar.group.quaternion.setFromAxisAngle(leanAxis, 0.16 * lean);
      pillar.update(t, camPos || g.position);

      // the false light
      look.decoy += ((drift ? Math.min(1, Math.max(0, (lean - 0.05) / 0.25)) : 0) - look.decoy) * (1 - Math.exp(-dt * (drift ? 1.5 : 3)));
      decoyFlame.material.opacity = look.decoy * (0.75 + 0.25 * Math.sin(t * 1.7));
      decoyPool.material.opacity = look.decoy * 0.45;

      // the heart and the flower
      heartMat.uniforms.time.value = t;
      heartMat.uniforms.power.value = (1.2 + beat * 1.3) * dim + T.open * 1.5;
      heart.scale.setScalar(1 + beat * 0.08 + T.open * 0.3);
      heartLight.intensity = (140 + beat * 200) * dim + T.open * 400;
      heartGlow.material.opacity = (0.22 + beat * 0.18) * dim + T.open * 0.3;
      fill.intensity = 30 + look.power * 25;
      const openTarget = T.done ? 1 : 0.1 + 0.5 * (litN / 7);
      look.open += (openTarget - look.open) * (1 - Math.exp(-dt * 1.2));
      for (const p of petals) p.rotation.x = p.userData.tilt0 + p.userData.dTilt * look.open;
      glow.value = (0.55 + 0.45 * look.power + beat * 0.25) * dim * (1 - 0.3 * lean);

      // the rings of fire: off-centre toward the false light as the heart drifts; dimmer as help falls
      ringsMat.uniforms.time.value = t;
      ringsMat.uniforms.power.value = look.power;
      const dl = Math.hypot(decoy.position.x, decoy.position.z) || 1;
      // (the disc lies rotated: its local y is the world's -z)
      ringsMat.uniforms.shift.value.set((decoy.position.x / dl) * 3 * lean, (-decoy.position.z / dl) * 3 * lean);
      ringsMat.uniforms.help.value = silent ? 1 : T.help;
      ringsMat.uniforms.flood.value = look.doneAt >= 0 ? Math.max(0, 1 - Math.max(0, t - look.doneAt - 2) / 3) : 0;

      // lamps: the waiting one has its pool and count; in the silence, the first lamp waits for your beats
      const sinceSilence = silent ? t - T.phaseAt : 0;
      lamps.forEach((L, i) => {
        L.flame.material.opacity = L.lit * (0.85 + 0.15 * Math.sin(t * 9 + i));
        const waiting = i === T.active && (T.phase === 'beat' || drift);
        const ownLamp = silent && i === 0 && sinceSilence > 16;
        L.mark.material.opacity = waiting ? (0.35 + 0.25 * Math.sin(t * 3)) * (1 - 0.75 * lean) : ownLamp ? 0.18 + 0.08 * Math.sin(t * 2) : 0;
        L.dots.forEach((d, k) => {
          if (waiting) d.material.opacity = (k < T.hits ? 1 : 0.18) * T.help * (1 - lean);
          else if (silent && i === 0) d.material.opacity = k < T.own.length ? 1 : sinceSilence > 16 ? 0.15 : 0;
          else d.material.opacity = 0;
        });
        L.L.position.y = Math.sin(t * 0.8 + i) * 0.03;
      });

      // mist drifting at the edge; city lights flicker; the water moves a little
      for (const m of mists) {
        const a = m.userData.a + Math.sin(t * 0.05 + m.userData.s * 9) * 0.03;
        m.position.set(Math.sin(a) * m.userData.rad, 0.6, Math.cos(a) * m.userData.rad);
      }
      for (const m of pointMats) m.uniforms.time.value = t;
      water.material.uniforms.time.value = t * 0.25;
    },
  };
  return api;
};
