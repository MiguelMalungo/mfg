import * as THREE from 'three';
import { RUBEDO } from './texts.js';
import { wordSprite } from './albedo.js';
import { makeHold, ZONE } from './hold.js';
import { buildSkull } from './skull.js';
import { buildCave } from './cave.js';
import { buildOpenSack } from './sackopen.js';
import { Z_END } from './house.js';

/*
 * Level III, rubedo (PLAN.md 10.6), under the water. Only with ?rubedo until it is finished.
 *
 * Stages F1 and F2: the way down and back, and the long hold (hold.js), IN GREY. The cave, the furnace and the stairs
 * here are stand-ins; the look is stage F5 (Blender), the skull F3, the child and the pages F4.
 *
 *   1. The dark stair at the end of Albedo's hall, after the Other (albedo.js hands over: st.below).
 *   2. The cave: a passage, then the chamber; in the far wall a round opening with the sun in it. The sun is the
 *      only progress bar: black, white, red, gold.
 *   3. The furnace: the flask is set on it, the Other stands behind it, the fire lights.
 *   4. Three heatings: a strength chosen for the fire, then the hold: with the dark (your Shadow, left), with the white
 *      (right), with both. Then red: the Other's light goes into the glass.
 *   5. The sack and the child by the left wall: take the rope, untie it: gold.
 *   6. A second stair, up; a fade; the corridor of the house, walked the other way; the end card.
 *
 * No light here casts a shadow but the flask (it stands on the furnace). The one other light is Albedo's roaming
 * light, in the fire's mouth.
 */

const STEP_H = 0.2, STEP_D = 0.3, STEPS = 18;
const UP_STEPS = 13, UP_H = 0.19, UP_D = 0.3, UP_X = 2.7;

const ss = (a, b, x) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};
const h3 = (x, y, z) => {
  const v = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return v - Math.floor(v);
};
const vnoise = (x, y, z) => {
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z);
  const f = (t) => t * t * (3 - 2 * t), u = f(x - i), v = f(y - j), w = f(z - k);
  const L = (a, b, t) => a + (b - a) * t;
  return L(
    L(L(h3(i, j, k), h3(i + 1, j, k), u), L(h3(i, j + 1, k), h3(i + 1, j + 1, k), u), v),
    L(L(h3(i, j, k + 1), h3(i + 1, j, k + 1), u), L(h3(i, j + 1, k + 1), h3(i + 1, j + 1, k + 1), u), v),
    w,
  );
};

/** The sun in the opening: s 0 black, 1 white, 2 red, 3 gold; in between, one turns into the next from its rim inward. */
const makeSun = () => {
  const u = { s: { value: 0 }, time: { value: 0 }, rimUp: { value: 0 } };
  const mat = new THREE.ShaderMaterial({
    uniforms: u,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    fog: false,
    vertexShader: /* glsl */ `varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float s; uniform float time; uniform float rimUp; varying vec2 vP;
      float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p) { return 0.5 * n(p) + 0.25 * n(p * 2.1 + 3.1) + 0.125 * n(p * 4.3 + 7.7) + 0.06 * n(p * 8.7 + 1.3); }
      vec3 disc(float i) { return i < 0.5 ? vec3(0.0) : i < 1.5 ? vec3(0.16, 0.155, 0.14) : i < 2.5 ? vec3(0.15, 0.016, 0.005) : vec3(0.36, 0.2, 0.04); }
      vec3 halo(float i) { return i < 0.5 ? vec3(0.12, 0.03, 0.006) : i < 1.5 ? vec3(0.05, 0.05, 0.048) : i < 2.5 ? vec3(0.11, 0.014, 0.004) : vec3(0.14, 0.075, 0.016); }
      void main() {
        float r = length(vP), a = atan(vP.y, vP.x);
        vec2 q = vec2(cos(a), sin(a));
        float lick = fbm(q * 3.0 + vec2(r * 2.0 - time * 0.12, time * 0.05));
        float i0 = floor(min(s, 2.999)), f = s - i0;
        // the new colour comes in from the rim
        float in_ = smoothstep(1.0 - f * 1.25 - 0.22, 1.0 - f * 1.25 + 0.1, r + (lick - 0.45) * 0.25);
        in_ = f <= 0.001 ? 0.0 : in_;
        float body = 1.0 - smoothstep(0.985, 1.0, r);
        vec3 d = mix(disc(i0), disc(i0 + 1.0), in_) * (0.75 + 0.5 * fbm(vP * 2.2 + time * 0.02));
        // a thin burning rim and what licks off it
        float rim = exp(-abs(r - 1.0) * 46.0) * (0.5 + 1.3 * lick);
        float cor = smoothstep(0.98, 1.0, r) * exp(-(r - 1.0) * mix(7.5, 3.2, smoothstep(0.4, 1.0, f + i0))) * (0.35 + 1.4 * lick * lick);
        vec3 hc = mix(halo(i0), halo(i0 + 1.0), f);
        vec3 col = d * body + hc * (rim * (1.6 + rimUp) * 2.0 + cor * 1.1);
        float edge = 1.0 - smoothstep(1.3, 1.72, r); // (no further: the second stair is beside it)
        gl_FragColor = vec4(col * edge, body);
      }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), mat);
  return { mesh: m, u };
};

/** api: { teleport, words, vessel, sound, later, save (or a stand-in that keeps nothing), setRubedo, strengths, shadow, mode, seconds }. */
export const buildRubedo = ({ scene, house, glowTex, albedo, sack, child, round = 1, lite = false, keys = {}, api }) => {
  const { HALL_Y, HALL_Z0, HALL_Z1 } = albedo.places;
  const oth = albedo.oth;
  const group = new THREE.Group();
  scene.add(group);

  /* ═════════════ the places (metres, all from the foot of Albedo's hall) ═════════════ */
  const Z0 = HALL_Z1 - STEPS * STEP_D; // where the stair ends
  const CAVE_Y = HALL_Y - STEPS * STEP_H;
  const Z1 = Z0 - 23; // the cave's far wall
  const CH0 = Z0 - 6.5, CH1 = Z0 - 12; // the passage widens into the chamber between these
  const FURN = new THREE.Vector3(0, CAVE_Y, Z0 - 16);
  const FLASK_S = 6.0; // how large the flask grows on it
  const FLASK_AT = new THREE.Vector3(0, CAVE_Y + 0.948 + 0.05 * FLASK_S * 0.965, FURN.z); // the flask's middle, on the furnace
  // (a phone held upright is narrow: further back)
  const STAND = new THREE.Vector3(0, CAVE_Y, FURN.z + (innerWidth < innerHeight * 0.9 ? 3.2 : 2.7));
  const NOWHERE = new THREE.Vector3(0, -60, Z0 - 16);
  const OTHER_AT = new THREE.Vector3(0.66, CAVE_Y, FURN.z - 1.35); // beside the flask, beyond it: it would hide them
  const SACK_AT = new THREE.Vector3(-3.0, CAVE_Y, Z0 - 12.6);
  const CHILD_AT = new THREE.Vector3(-1.75, CAVE_Y, Z0 - 13.5);
  const SUN = new THREE.Vector3(0.25, CAVE_Y + 4.15, FURN.z - 9.4);
  const HOLE_R = 1.55;
  const UP_END = Z1 - UP_STEPS * UP_D;
  /** Half the cave's width, and its height, along its length. */
  const halfW = (z) => {
    const k = ss(CH0, CH1, z), e = ss(Z1 + 5, Z1, z);
    return 1.15 + 3.75 * k - 0.5 * e;
  };
  const highAt = (z) => 2.5 + 4.6 * ss(CH0 + 0.5, CH1 - 1.5, z);

  const hold = makeHold();
  addEventListener('resize', () => (STAND.z = FURN.z + (innerWidth < innerHeight * 0.9 ? 3.2 : 2.7)));
  const st = {
    phase: 'above', // above → stair → cave → furnace → red → sack → gold → up → home → done
    heats: 0, heat: 0, heating: false, // the three heatings, and how far the one burning has come
    stage: 1, // the flask's: 1 white, 2 red, 3 gold (main.js, wantStage)
    sun: 0,
    entered: false, standing: false, flaskK: 0, flaskOn: false, fire: 0, warm: 0, join: 0, rope: false, goldAt: null,
    busy: false,
    t: 0,
    step: 'choose', // in the furnace phase: choose → burn → hold → after
    glass: { fume: 0, flecks: 0, boil: 0, heat: 0 }, // what the flask shows of the hold (main.js)
    dark: 0, white: 0, used: [], hush: 0, beat: 0,
    sunk: 0, sunkK: 0, // the fire sunk low while the skull speaks (0..1, and eased)
  };
  const open = () => oth.state === 'lead' || oth.state === 'guided' || st.phase !== 'above';
  albedo.st.below = true; // the Other walks on past the hall's end, and Albedo ends without a card
  if (albedo.st.stairDark) albedo.st.stairDark.visible = false;

  /* ═════════════ grey stand-ins ═════════════ */
  const tl = new THREE.TextureLoader();
  const bt = (f, srgb) => {
    const t = tl.load('./assets/albedo/castle_brick_01_' + f);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const rock = house.stoneMat.clone();
  rock.color = new THREE.Color(0.34, 0.3, 0.27);
  rock.side = THREE.DoubleSide;
  const brick = new THREE.MeshStandardMaterial({ map: bt('diff_1k.jpg', true), normalMap: bt('nor_gl_1k.jpg'), roughnessMap: bt('rough_1k.jpg'), roughness: 1, color: new THREE.Color(0.3, 0.25, 0.22) });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0a0908, roughness: 0.9 });
  const grey = new THREE.Group(); // the stand-ins: shown only until the cave has loaded
  group.add(grey);
  const add = (m, cast = false) => (grey.add(m), (m.receiveShadow = true), (m.castShadow = cast), m);
  const box = (w, h, d, mat, x, y, z, cast = false) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    return add(m, cast);
  };
  // the stair: the hall's ten steps end 3 m in; these are the rest, and its walls and roof
  for (let i = 10; i < STEPS; i++) box(1.4, STEP_H, STEP_D, rock, 0, HALL_Y - STEP_H / 2 - i * STEP_H, HALL_Z1 - STEP_D / 2 - i * STEP_D);
  {
    const z0 = HALL_Z1 - 3.2, len = z0 - Z0, mid = (z0 + Z0) / 2;
    for (const s of [-1, 1]) box(0.3, 7, len, rock, s * 0.85, HALL_Y - 1.2, mid);
    const roof = box(2, 0.3, len + 1.4, rock, 0, HALL_Y + 0.75, mid);
    roof.rotation.x = -Math.atan2(STEP_H, STEP_D) * 0.75;
  }
  // the cave's shell: a tube of stone along z, open at the floor
  {
    const NZ = 56, NA = 30, pos = [], uv = [], idx = [];
    for (let i = 0; i <= NZ; i++) {
      const z = Z0 + (Z1 - Z0) * (i / NZ), w = halfW(z) + 0.15, h = highAt(z);
      let arc = 0, px = null, py = null;
      for (let j = 0; j <= NA; j++) {
        const a = Math.PI * (j / NA), c = Math.cos(a), s = Math.sin(a);
        // a rounded vault, its walls rather upright; broken by noise (none where it meets the stair)
        const sx = Math.sign(c) * Math.pow(Math.abs(c), 0.55), sy = Math.pow(s, 0.7);
        const k = ss(Z0, Z0 - 1.5, z);
        const nn = (vnoise(c * 3 + 7, s * 3, z * 0.55) - 0.5) * 1.1 + (vnoise(c * 8, s * 8 + 3, z * 1.7) - 0.5) * 0.4;
        const r = 1 + k * nn * (0.5 / Math.max(1.2, w));
        const x = sx * w * Math.max(0.97, r), y = CAVE_Y - 0.05 + sy * h * r;
        if (px != null) arc += Math.hypot(x - px, y - py);
        px = x;
        py = y;
        pos.push(x, y, z + k * nn * 0.25);
        uv.push(arc / 1.6, z / 1.6);
      }
    }
    for (let i = 0; i < NZ; i++)
      for (let j = 0; j < NA; j++) {
        const a = i * (NA + 1) + j, b = a + NA + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    add(new THREE.Mesh(g, rock));
    // the floor
    const fl = new THREE.PlaneGeometry(11, Z0 - Z1 + 0.6, 40, 80);
    fl.rotateX(-Math.PI / 2);
    const p = fl.attributes.position, fu = fl.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      p.setY(i, (vnoise(x * 1.3, 0, z * 1.3) - 0.5) * 0.06);
      fu.setXY(i, x / 1.6, z / 1.6);
    }
    fl.computeVertexNormals();
    const floor = add(new THREE.Mesh(fl, rock));
    floor.position.set(0, CAVE_Y - 0.01, (Z0 + Z1) / 2);
    // the near wall, round the foot of the stair (seen looking back)
    const wallWith = (z, holes, w, h) => {
      const sh = new THREE.Shape([new THREE.Vector2(-w, -0.2), new THREE.Vector2(w, -0.2), new THREE.Vector2(w, h), new THREE.Vector2(-w, h)]);
      sh.holes.push(...holes);
      const gg = new THREE.ShapeGeometry(sh, 24), pp = gg.attributes.position, uu = gg.attributes.uv;
      for (let i = 0; i < pp.count; i++) uu.setXY(i, pp.getX(i) / 1.6, pp.getY(i) / 1.6);
      const m = add(new THREE.Mesh(gg, rock));
      m.position.set(0, CAVE_Y, z);
      return m;
    };
    const door = (x, w, h) => {
      const q = new THREE.Path();
      q.moveTo(x - w / 2, -0.1);
      q.lineTo(x - w / 2, h - w / 2);
      q.absarc(x, h - w / 2, w / 2, Math.PI, 0, true);
      q.lineTo(x + w / 2, -0.1);
      q.closePath();
      return q;
    };
    wallWith(Z0 + 0.02, [door(0, 1.4, 2.35)], 2.2, 3.4);
    const hole = new THREE.Path();
    hole.absarc(SUN.x, SUN.y - CAVE_Y, HOLE_R, 0, Math.PI * 2, true);
    wallWith(Z1, [hole, door(UP_X, 1.3, 2.3)], 6, 8);
    // the opening's throat, and the dark behind the sun
    const throat = new THREE.Mesh(new THREE.CylinderGeometry(HOLE_R, HOLE_R * 1.5, 1.6, 40, 1, true), rock);
    throat.rotation.x = -Math.PI / 2;
    throat.position.set(SUN.x, SUN.y, Z1 - 0.8);
    add(throat);
  }
  const sun = makeSun();
  sun.mesh.position.copy(SUN);
  group.add(sun.mesh);
  // the second stair, up, in the far wall; shut by the dark until the sack is open
  for (let i = 0; i < UP_STEPS; i++) box(1.3, UP_H, UP_D, rock, UP_X, CAVE_Y + UP_H / 2 + i * UP_H, Z1 - UP_D / 2 - i * UP_D);
  for (const s of [-1, 1]) box(0.3, 8, UP_STEPS * UP_D + 0.6, rock, UP_X + s * 0.8, CAVE_Y + 2.5, (Z1 + UP_END) / 2);
  // the light at the top of it: a dark doorway that glows from beyond, brightest low in the middle (not a flat card)
  const upGlow = new THREE.Group();
  upGlow.add(new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.05, 0.026, 0.008), fog: false })));
  for (const [w, h, y, c] of [[2.6, 3.6, -0.3, [0.2, 0.1, 0.024]], [1.5, 2.2, -0.5, [0.22, 0.12, 0.035]]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: glowTex, color: new THREE.Color(...c), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    m.position.set(0, y, 0.02);
    upGlow.add(m);
  }
  upGlow.position.set(UP_X, CAVE_Y + UP_STEPS * UP_H + 1.4, UP_END - 0.2);
  group.add(upGlow);
  // the cave as it was built in Blender (cave.js)
  const cave = buildCave({ group, at: new THREE.Vector3(FURN.x, CAVE_Y, FURN.z), glowTex, lite, renderer: api.renderer });
  cave.load
    .then(() => {
      // the stand-ins are not drawn any more; their plain shapes stay for the eye's rays (main.js, adaptExposure),
      // which would be far too slow against the real rock
      const unseen = new THREE.MeshBasicMaterial({ visible: false });
      grey.traverse((o) => o.isMesh && ((o.material = unseen), (o.castShadow = o.receiveShadow = false)));
      coal.visible = false;
      for (const m of albedo.st.stairParts ?? []) ((m.material = unseen), (m.castShadow = m.receiveShadow = false));
      bowing();
    })
    .catch((e) => console.error('The cave did not load (the stand-ins stay):', e));
  // the furnace: a low block of brick, its mouth, and a glow in it
  const furnace = box(1.05, 0.86, 1.0, brick, FURN.x, CAVE_Y + 0.43, FURN.z, true);
  box(0.46, 0.4, 0.02, dark, 0, CAVE_Y + 0.28, FURN.z + 0.505);
  const coal = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.36), new THREE.MeshBasicMaterial({ map: glowTex, color: new THREE.Color(0.16, 0.035, 0.006), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  coal.position.set(0, CAVE_Y + 0.24, FURN.z + 0.53);
  grey.add(coal);
  // stones lying about (they bow away from whoever wears the mask)
  const stones = [];
  for (let i = 0; i < 16; i++) {
    const z = CH1 - 0.5 - 9.6 * h3(i, 3, 1), x = (h3(i, 7, 2) - 0.5) * 2 * (halfW(z) - 0.9), r = 0.1 + 0.18 * h3(i, 5, 9);
    if (Math.hypot(x - FURN.x, z - FURN.z) < 1.6 || Math.hypot(x - SACK_AT.x, z - SACK_AT.z) < 1.9) continue;
    const m = add(new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), rock), true);
    m.position.set(x, CAVE_Y + r * 0.45, z);
    m.rotation.set(h3(i, 1, 1) * 3, h3(i, 2, 1) * 3, 0);
    m.scale.y = 0.75;
    stones.push(m);
  }
  // the real ones, once the cave is there: loose stones of its own, in the same places
  const bowing = () => {
    for (const m of stones) {
      m.geometry = cave.looseGeo;
      m.material = cave.looseMat;
      m.raycast = () => {};
      m.scale.setScalar(m.geometry.boundingSphere.radius > 0 ? (0.16 + 0.22 * h3(m.position.x, 1, m.position.z)) : 1);
      m.position.y = CAVE_Y + 0.05;
      group.add(m);
    }
  };
  // the horned skull (skull.js), by the path
  const skull = buildSkull({ group, glowTex, st, api, oth, albedo, stones, places: { Z0, Z1, CAVE_Y, FURN, OTHER_AT }, hold: () => hold, resume: () => next() });
  let _player = null;
  skull.setPick({ mesh: skull.mesh, def: {}, onPick: () => skull.pickUp(_player) });
  // what the hand reaches for
  const firePick = { mesh: { position: FLASK_AT.clone().setZ(FURN.z + 0.3) }, def: {}, onPick: () => placeFlask() };
  const ropePick = { mesh: { position: new THREE.Vector3() }, def: {}, onPick: () => takeRope() };
  const neckPick = { mesh: { position: new THREE.Vector3() }, def: {}, onPick: () => untie() };

  /* ═════════════ what happens ═════════════ */
  const setPhase = (p) => {
    st.phase = p;
    st.t = 0;
  };
  /** Stood in place: the spot and the view are eased there. */
  const standAt = (x, z, yaw, pitch) => {
    st.standing = true;
    st.spot = { x, z, yaw, pitch };
  };
  st.standAt = standAt;
  const placeFlask = () => {
    standAt(STAND.x, STAND.z, 0, -0.16);
    st.flaskOn = true;
    setPhase('furnace');
    api.words.clearTips();
    // both lights go down into the bricks, and it lights
    api.later(1.6, () => {
      api.sound.glass(196, 0.06, 4);
      st.lit = true;
    });
    api.later(4.4, () => (st.heats ? next() : page('vessel', next)));
  };
  /** The pages about what has just happened (texts.js); from the second time in Rubedo, one line. */
  const page = (key, onDone, pages = RUBEDO.pages[key]) => api.words.tell(api.seen() ? [{ title: '', lines: [RUBEDO.again[key]] }] : pages, { aside: true, onDone });
  /* the strengths to choose from: words over the fire, as the three feelings in Albedo */
  let wordsUp = [];
  const chooseUp = () => {
    st.step = 'choose';
    const left = api.strengths().filter((w) => !st.used.includes(w)).slice(-(3 - st.heats) || undefined);
    const tall = innerWidth < innerHeight * 0.9; // a phone held upright: one above the other
    wordsUp = left.map((w, i) => {
      const s = wordSprite(w), k = i - (left.length - 1) / 2;
      s.position.set(tall ? 0 : k * 0.66, CAVE_Y + (tall ? 1.68 - k * 0.2 : 1.46), STAND.z - 1.5);
      s.material.opacity = 0;
      s.material.color.setScalar(0.26); // under the bloom: lit, not burning
      group.add(s);
      return { s, w, k: 0, mesh: s, def: {}, onPick: () => burn(w) };
    });
  };
  const burn = (w) => {
    if (st.step !== 'choose') return;
    st.step = 'burn';
    st.t = 0;
    st.used.push(w);
    for (const o of wordsUp) o.gone = o.w === w ? 'burn' : 'fade';
    api.sound.glass(261.6, 0.04, 3);
    api.later(1.4, () => {
      api.words.whisper(RUBEDO.fire[w] ?? '', 4.6, { low: true });
      api.sound.exhale();
    });
    api.later(3.4, () => {
      st.step = 'hold';
      hold.begin({
        kind: ['dark', 'white', 'both'][st.heats], T: [round > 1 ? 20 : 25, round > 1 ? 20 : 25, 40][st.heats], strengths: st.heats + 1, slow: round > 1 ? 0.8 : 1,
        onThird: (n) => {
          api.sound.glass([0, 293.7, 349.2, 392][n] * [1, 1.122, 1.26][st.heats], 0.07, 4);
          if (navigator.userActivation?.isActive) navigator.vibrate?.(30);
        },
        onLatch: () => api.words.tip(RUBEDO.lines.latch[api.mode()], { id: 'holdLatch' }),
        onDone: heatDone,
      });
    });
  };
  /** The next heating; before the third, the skull has something to say (once in a round). */
  const next = () => {
    if (st.heats === 2 && !skull.answered) skull.offerAtFire();
    else if (st.heats === 2) page('both', chooseUp);
    else chooseUp();
  };
  const heatDone = () => {
    st.heats += 1;
    st.heat = 0;
    st.step = 'after';
    api.setRubedo({ heats: st.heats });
    if (st.heats >= 3) {
      setPhase('red');
      api.vessel.react({ bloom: 0.2, still: true });
      api.words.word(RUBEDO.red, '', 3.4);
      api.sound.glass(392, 0.08, 7);
    } else api.later(2.6, () => page(st.heats === 1 ? 'dark' : 'white', () => api.later(0.8, next)));
  };
  const takeRope = () => {
    st.rope = true;
    st.reading = true;
    api.sound.glass(293.7, 0.04, 3);
    if (child) {
      // it lets go: the rope is yours
      child.st.phase = 'given';
      child.st.ropeEnd.copy(child.child.root.position).setY(CAVE_Y + 0.016);
    }
    api.later(0.8, () => page('child', () => (st.reading = false)));
  };
  const untie = () => {
    setPhase('gold');
    st.goldAt = 0;
    api.sound.glass(523.3, 0.08, 8);
    [261.6, 329.6, 392, 523.3].forEach((f, i) => api.later(1.2 + i * 0.9, () => api.sound.glass(f, 0.06, 7))); // one tone for each colour
    // the gold pours over, and then the flask comes forward and turns
    api.later(5.5, () =>
      api.vessel.react({
        bloom: 0.6,
        onDone: () => {
          api.words.word(RUBEDO.gold, '', 3.2);
          api.later(3.6, () =>
            page('gold', () =>
              page('self', () => {
                setPhase('up');
                api.words.tip(RUBEDO.up, { id: 'rubedoUp' });
                child?.go([{ x: -1.1, z: STAND.z + 0.6 }, { x: 1.6, z: FURN.z + 2 }, { x: 2.6, z: FURN.z - 1.5 }, { x: UP_X, z: Z1 + 0.8 }, { x: UP_X, z: UP_END + 0.5 }], house.floorAt);
              }),
            ),
          );
        },
      }),
    );
  };

  /* ═════════════ where you can walk ═════════════ */
  const prevFloor = house.ext.floorAt, prevCollide = house.ext.collide;
  house.ext.floorAt = (x, z) => {
    if (open() && z < HALL_Z1 && z > -1000) {
      if (z < Z1) return CAVE_Y + UP_H * Math.max(0, Math.min(UP_STEPS, Math.floor((Z1 - z) / UP_D) + 1));
      return HALL_Y - Math.min(STEPS * STEP_H, Math.floor((HALL_Z1 - z) / STEP_D + 1) * STEP_H);
    }
    return prevFloor(x, z);
  };
  house.ext.collide = (p, r) => {
    if (!(open() && p.z < HALL_Z1 - 0.3 && p.z > -1000)) return prevCollide(p, r);
    if (p.z > Z0) p.x = Math.max(-0.45, Math.min(0.45, p.x));
    else if (p.z > Z1 + r) {
      const w = halfW(p.z) - r - 0.1;
      p.x = Math.max(-w, Math.min(w, p.x));
      // the broken stone before the far wall: only the way to the second stair goes through it
      const way = st.phase === 'up' ? ss(1.3, 0.6, Math.abs(p.x - UP_X)) : 0;
      p.z = Math.max(FURN.z - 2.9 - 5 * way, p.z);
      if (p.z < FURN.z - 4.1) p.x = Math.max(UP_X - 0.3, Math.min(UP_X + 0.3, p.x));
      // coming out of the stair's foot
      if (p.z > Z0 - 0.25) p.x = Math.max(-0.5, Math.min(0.5, p.x));
    } else {
      // the far wall, and the second stair once it is open
      const through = st.phase === 'up' && Math.abs(p.x - UP_X) < 0.6;
      if (!through && p.z > Z1 - 0.1) p.z = Z1 + r;
      else {
        p.x = Math.max(UP_X - 0.35, Math.min(UP_X + 0.35, p.x));
        p.z = Math.max(UP_END + 0.2, p.z);
      }
    }
    for (const c of [{ x: FURN.x, z: FURN.z, r: 0.72 }, ...skull.colliders()]) {
      const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), rr = c.r + r;
      if (d < rr && d > 1e-4) ((p.x = c.x + (dx / d) * rr), (p.z = c.z + (dz / d) * rr));
    }
    // not through the Other
    if (!oth.hidden && oth.state === 'guided') {
      const dx = p.x - oth.pos.x, dz = p.z - oth.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.75 && d > 1e-4) ((p.x = oth.pos.x + (dx / d) * 0.75), (p.z = oth.pos.z + (dz / d) * 0.75));
    }
    return true;
  };

  /* ═════════════ what you can pick, and the line ═════════════ */
  const _f = new THREE.Vector3(), _t = new THREE.Vector3(), _q = new THREE.Quaternion(), _j = new THREE.Vector3();
  const sees = (camera, pos, reach, cone) => {
    camera.getWorldDirection(_f);
    _t.copy(pos).sub(camera.position);
    const d = _t.length();
    if (d > reach) return false;
    return Math.acos(Math.min(1, _t.dot(_f) / d)) < Math.max(cone, 0.25 / d);
  };
  const lookedAt = (camera, wide = false) => {
    const W = wide ? 1.6 : 1.25;
    if (skull.lookedAt(camera, W)) return skull.pick;
    if (st.phase === 'cave' && camera.position.z < FURN.z + 4) return sees(camera, firePick.mesh.position, 2.6 * W, 0.25 * W) ? firePick : null;
    if (st.phase === 'furnace') {
      // the strength nearest the middle of the view
      if (st.step !== 'choose') return null;
      let best = null, ba = 0.3;
      camera.getWorldDirection(_f);
      for (const o of wordsUp) {
        const a = _t.copy(o.s.position).sub(camera.position).normalize().angleTo(_f);
        if (a < ba) ((ba = a), (best = o));
      }
      return best;
    }
    if (st.phase === 'sack') {
      if (!st.rope) {
        if (!st.offered) return null;
        ropePick.mesh.position.copy(child ? child.child.hand() : CHILD_AT);
        return sees(camera, ropePick.mesh.position, 2.3 * W, 0.3 * W) ? ropePick : null;
      }
      if (st.reading) return null;
      neckPick.mesh.position.copy(sack.bag.position).setY(CAVE_Y + 0.95);
      return sees(camera, neckPick.mesh.position, 2.6 * W, 0.35 * W) ? neckPick : null;
    }
    return null;
  };
  /** Are you anywhere this level speaks for (below the hall, or back in the house at the end)? */
  const here = (player) => player.pos.z < HALL_Z1 - 0.3 && player.pos.z > -1000;
  /** Back in the house at the end. */
  const home = () => st.phase === 'home' || st.phase === 'done';
  const line = (player) => {
    if (st.phase === 'home') return RUBEDO.lines.home;
    if (!here(player)) return null;
    const L = RUBEDO.lines;
    if (skull.worn) return skull.line();
    if (st.phase === 'stair') return L.follow;
    if (st.phase === 'cave') return player.pos.z < FURN.z + 4 ? L.place : L.toFire;
    if (st.phase === 'furnace') {
      if (st.step === 'choose') return wordsUp.length ? L.choose[api.mode()] : '';
      if (!hold.on) return '';
      if (!hold.begun) return hold.latch ? L.latch[api.mode()] : L.hold[api.mode()];
      if (!hold.down) return L.again;
      if (hold.still() > 0.5) return L.still;
      return hold.lean < -ZONE ? L.dark : hold.lean > ZONE ? L.white : L.holding;
    }
    if (st.phase === 'sack') return st.rope ? (st.reading ? '' : L.untie) : st.offered ? L.rope : L.child;
    if (st.phase === 'up') return L.up;
    return '';
  };

  /* ═════════════ the Other, led on ═════════════ */
  const lead = (player, x, z, { near = 5.5, speed = 0.95, yaw = null } = {}) => {
    const d = Math.hypot(player.pos.x - oth.pos.x, player.pos.z - oth.pos.z);
    oth.guide = { x, z, yaw, speed: d < near ? speed : d < near + 3 ? 0.25 : 0, dim: 0.8 };
  };

  /* ═════════════ each frame ═════════════ */
  const toYaw = (yaw, want, k) => yaw + Math.atan2(Math.sin(want - yaw), Math.cos(want - yaw)) * k;
  const update = (dt, t, camera, player) => {
    st.t += dt;
    const inCave = here(player);
    // (frame 23: the sack glows in the dark; then the gold fills the cave)
    albedo.st.expo = inCave ? (st.phase === 'gold' ? 0.5 : st.phase === 'up' ? 0.72 : 0.85) : null;
    albedo.st.hallOff = player.pos.z < HALL_Z1 - 4.2 && player.pos.z > -1000;
    group.visible = open() && player.pos.z < HALL_Z1 + 8 && player.pos.z > -1000;
    sun.mesh.visible = group.visible;

    // the sack and the child wait in the cave once you are in the hall: the sack is no longer in the corridor
    if (!st.moved && open() && player.pos.z < HALL_Z0) {
      st.moved = true;
      sack.bag.position.copy(SACK_AT);
      sack.drum.visible = false; // (it comes out of the sack again)
      sack.bag.rotation.y = Math.PI * 0.75;
      child?.st.ropeEnd.copy(CHILD_AT).setY(CAVE_Y + 0.016);
      child?.toCave(CHILD_AT, -Math.PI / 2); // its back to you, as ever
      // a little taller each round, and the sack a little smaller
      child?.child.root.scale.setScalar(1 + Math.min(0.12, 0.04 * (round - 1)));
      sack.size.k = Math.max(0.7, 1 - 0.08 * (round - 1));
    }
    if (st.phase === 'above' && inCave) {
      setPhase('stair');
      api.words.clearTips();
      api.words.tip(RUBEDO.down, { id: 'rubedoDown' });
    }
    if (st.phase === 'stair') {
      if (oth.state === 'guided') lead(player, 0, Z0 - 4.5);
      if (player.pos.z < Z0 - 0.6) {
        setPhase('cave');
        st.entered = true;
        api.save.set({ level: 3 });
        api.words.clearTips();
        api.words.word(RUBEDO.title, RUBEDO.enter, 5.5);
        api.later(6.5, () => api.words.tip(RUBEDO.dream, { id: 'rubedoDream' }));
      }
    }
    if (skull.worn) skull.leadOther(player);
    else if (st.phase === 'cave') {
      // ahead to the furnace, round it, and behind it, facing you
      if (oth.pos.z > FURN.z + 2.2) lead(player, 1.5, FURN.z + 1.6, { near: 7 });
      else if (oth.pos.z > FURN.z - 1.2 && oth.pos.x > 1.2) lead(player, 1.5, FURN.z - 1.2, { near: 12 });
      else lead(player, OTHER_AT.x, OTHER_AT.z, { near: 14, yaw: 0 });
    }
    if ((st.phase === 'furnace' || st.phase === 'red') && !skull.worn) oth.guide = st.step === 'skull' && st.phase === 'furnace' ? { x: OTHER_AT.x + 1.35, z: OTHER_AT.z - 0.9, yaw: -0.3, speed: 0.7, dim: 0.5 } : { x: OTHER_AT.x, z: OTHER_AT.z, yaw: 0, speed: 0.8, dim: 0.8 }; // (she or he steps back while the skull speaks)

    // stood before the furnace: the place and the view are eased there
    if (st.standing) {
      const k = 1 - Math.exp(-dt * 2.2);
      const P = st.flaskOn && !skull.worn ? { x: STAND.x, z: STAND.z, yaw: 0, pitch: -0.16 } : st.spot;
      player.pos.x += (P.x - player.pos.x) * k;
      player.pos.z += (P.z - player.pos.z) * k;
      if (choosing()) {
        // look about a little, to the words over the fire
        player.yaw = Math.max(-0.45, Math.min(0.45, Math.atan2(Math.sin(player.yaw), Math.cos(player.yaw))));
        player.pitch = Math.max(-0.4, Math.min(0.15, player.pitch));
      } else {
        // the pull turns the view: 7 degrees at most (3 if less motion is asked for)
        const kl = 1 - Math.exp(-dt * 6);
        player.yaw = toYaw(player.yaw, hold.on ? -hold.lean * SWAY : P.yaw, hold.on ? kl : k);
        player.pitch += (P.pitch - player.pitch) * k;
      }
      player.vel.set(0, 0, 0);
    }
    st.flaskK += ((st.flaskOn ? 1 : 0) - st.flaskK) * (1 - Math.exp(-dt * 1.4));
    st.fire += ((st.lit ? 1 - 0.8 * st.sunk : 0) + skull.roar() - st.fire) * (1 - Math.exp(-dt * 1.2));
    skull.update(dt, t, camera, player);
    _player = player;

    // the hold
    if (hold.on && hold.down) hold.move(((keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0)) * 1.3 * dt);
    hold.update(dt);
    if (hold.on) st.heat = hold.heat;
    showHold(dt, t, player);
    const done = st.heats + st.heat;
    const sunWant = st.goldAt != null ? 3 : st.phase === 'red' || st.heats >= 3 ? 2 : done < 2 ? done * 0.5 : 1 + (done - 2);
    st.sun += (sunWant - st.sun) * (1 - Math.exp(-dt * 0.8));
    const stageWant = st.goldAt != null ? 3 : st.heats >= 3 ? 2 : 1 + 0.25 * Math.min(2, done);
    st.stage = stageWant;
    st.warm += ((st.heats >= 3 ? 1 : st.heats * 0.3) - st.warm) * (1 - Math.exp(-dt * 0.6));
    // in the gold the picture's sepia gives way: the cave is gold, not beige (main.js, the grade)
    st.goldK = (st.goldK ?? 0) + (((st.phase === 'gold' || st.phase === 'up') && inCave ? 1 : 0) - (st.goldK ?? 0)) * (1 - Math.exp(-dt * 0.5));

    // red: the Other's light crosses the furnace and goes into the glass
    if (st.phase === 'red') {
      st.join = ss(1.5, 5, st.t);
      oth.guide.lightAt = FLASK_AT;
      oth.guide.lightK = st.join;
      oth.guide.dim = 0.8 * (1 - ss(5, 6.5, st.t));
      if (st.t > 5) oth.hidden = true; // where they stood there is only warm air
      if (st.t > 8.5 && !st.redSaid) {
        st.redSaid = true;
        const P = RUBEDO.pages.lights, who = api.gender === 'woman' ? 'god' : 'goddess';
        page('reddening', () =>
          page(
            'lights',
            () => {
              setPhase('sack');
              st.standing = false;
              st.flaskOn = false;
            },
            [...P[who], ...P.both],
          ),
        );
      }
    }
    // gone into the glass: their light (and its halo) is nowhere any more
    if (oth.hidden && oth.guide && (st.phase !== 'red' || st.t > 6.5)) oth.guide = { x: OTHER_AT.x, z: OTHER_AT.z, speed: 0, dim: 0, lightAt: NOWHERE, lightK: 1 };

    // the child: you come near, and it turns round at last, and holds out the rope
    if (st.phase === 'sack' && child && !st.rope) {
      const c = child.child.root.position, d = Math.hypot(player.pos.x - c.x, player.pos.z - c.z);
      if (d < 3.6 && !st.turning) {
        st.turning = true;
        api.sound.glass(440, 0.03, 4);
      }
      if (st.turning) {
        child.st.turnTo = Math.atan2(player.pos.x - c.x, player.pos.z - c.z);
        if (child.st.turned && !st.offered) ((st.offered = true), (child.st.phase = 'give'));
      }
    }
    if (child && st.rope && st.phase !== 'up' && child.st.phase === 'given') {
      const c = child.child.root.position;
      child.st.turnTo = st.goldAt != null ? Math.atan2(SACK_AT.x - c.x, SACK_AT.z - c.z) : Math.atan2(player.pos.x - c.x, player.pos.z - c.z);
    }
    if (st.goldAt != null) st.goldAt += dt;
    showGold(dt, t, player);
    const gold = st.goldAt != null ? ss(0, 4, st.goldAt) : 0;

    // the one roaming light: in the fire's mouth; gold at the sack once it is open
    if (inCave && skull.light(player)) {
      // the mask's own red, where it is worn away from the fire
    } else if (inCave) {
      if (st.phase === 'gold' || st.phase === 'up') albedo.setRoam(_t.set(SACK_AT.x + 0.4, CAVE_Y + 0.8, SACK_AT.z + 0.5), goldCol, (0.16 + 0.03 * Math.sin(t * 1.3)) * gold, 9);
      else albedo.setRoam(_t.set(0, CAVE_Y + 0.26, FURN.z + 0.3), fireCol, (0.07 + 0.06 * st.heat + 0.03 * st.heats) * st.fire, skull.worn ? 16 : 6);
    }
    // the cave's own light: the day by the sun's colour, the fire, the gold of the sack
    dayCol.copy(SUNS[Math.floor(Math.min(st.sun, 2.999))]).lerp(SUNS[Math.floor(Math.min(st.sun, 2.999)) + 1], Math.min(st.sun, 2.999) % 1);
    cave.update(dt, t, { day: 0.58, dayColor: dayCol, fire: Math.min(1.6, st.fire), heat: st.phase === 'red' || st.heats >= 3 ? 0.8 : st.heat * 0.7 + 0.12 * st.heats, gold: gold * 1.0, camera });
    coal.material.opacity = st.fire * (0.7 + 0.3 * st.heat) * (0.9 + 0.1 * Math.sin(t * 9.1) * Math.sin(t * 4.7));
    upGlow.visible = st.phase === 'up';
    sun.u.s.value = st.sun;
    sun.u.time.value = t;
    sun.u.rimUp.value = Math.min(1, 0.25 * (round - 1));

    // up the second stair, into the house
    if (st.phase === 'up' && !st.busy && player.pos.z < UP_END + 0.7) {
      st.busy = true;
      albedo.fadeThrough(
        () => {
          setPhase('home');
          api.words.clearTips();
          oth.hidden = true;
          // the gold comes up the stair behind you, through the door that was never there (i25)
          albedo.setRoam(_t.set(0, 1.1, Z_END - 0.5), goldCol, 1.1, 12);
          drum.position.set(0.95, 0.132, Z_END + 1.5);
          scene.add(drum);
          api.teleport(0, Z_END + 0.9, Math.PI, -0.03);
        },
        () => (st.busy = false),
      );
    }
    if (home()) {
      albedo.setRoam(_t.set(0, 1.1, Z_END - 0.5), goldCol, 1.1, 12);
      albedo.st.expo = 1.15; // every candle a little warmer
    }
    if (st.phase === 'home') {
      if (!st.changesSaid && player.pos.z > -11) {
        st.changesSaid = true;
        api.words.clearTips();
        page('changes');
      }
      if (!st.masksSaid && player.pos.z > -20.5) {
        st.masksSaid = true;
        api.words.tip(RUBEDO.masks, { id: 'rubedoMasks' });
      }
      if (player.pos.z > 0.2 && !api.words.open) {
        setPhase('done');
        api.setRubedo({ done: true });
        api.save.set({ rubedoSeen: true });
      }
    }
  };
  /* what the hold looks and sounds like */
  const SWAY = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.052 : 0.122;
  const choosing = () => st.phase === 'furnace' && st.step === 'choose' && wordsUp.length > 0;
  // the two sides close in on the picture as you lean to them
  const sides = ['to right, rgba(0,0,0,0.97), rgba(0,0,0,0.55) 30%, rgba(0,0,0,0) 62%', 'to left, rgba(236,232,220,0.62), rgba(236,232,220,0.2) 34%, rgba(236,232,220,0) 66%'].map((c) => {
    const e = document.createElement('div');
    e.style.cssText = `position:fixed;inset:0;pointer-events:none;z-index:2;opacity:0;background:linear-gradient(${c})`;
    document.body.appendChild(e);
    return e;
  });
  // the white: a shaft like Albedo's, on the right, and the dove in it
  const shaftU = { k: { value: 0 }, time: { value: 0 } };
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 1.15, 7.5, 36, 1, true),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: shaftU,
      vertexShader: /* glsl */ `varying vec3 vP; varying vec3 vW; void main() { vP = position; vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `uniform float k; uniform float time; varying vec3 vP; varying vec3 vW;
        void main() {
          float edge = 1.0 - abs(dot(normalize(vec3(vP.x, 0.0, vP.z)), normalize(vec3(cameraPosition.x - vW.x, 0.0, cameraPosition.z - vW.z))));
          float y = vP.y / 7.5 + 0.5;
          float s = 0.85 + 0.15 * sin(vP.x * 9.0 + time * 0.3) * sin(vP.z * 7.0 - time * 0.2);
          gl_FragColor = vec4(vec3(0.07, 0.072, 0.072) * k * (0.25 + 0.75 * y) * smoothstep(0.0, 0.4, y) * s * (1.0 - smoothstep(0.25, 1.0, edge)), 1.0);
        }`,
    }),
  );
  shaft.position.set(2.5, CAVE_Y + 3.7, FURN.z - 0.6);
  shaft.visible = false;
  group.add(shaft);
  // the dark stands against a dull red glow, so that it can be seen in the dark
  const backGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(0.1, 0.026, 0.008), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  backGlow.scale.set(4.6, 6, 1);
  group.add(backGlow);
  /** How far to the side something can stand, at distance d, and be in the picture (a phone held upright is narrow). */
  const sideX = (d) => Math.min(1.9, d * Math.tan((29 * Math.PI) / 180) * (innerWidth / innerHeight) * 0.74);
  const showHold = (dt, t, player) => {
    const L = hold.on ? hold.lean : 0, H = hold.on ? hold.heat : 0, still = hold.on ? hold.still() : 0;
    const ease = (c, w, r) => c + (w - c) * (1 - Math.exp(-dt * r));
    // the words: come up, then the chosen one sinks into the coals and the others go out
    for (const o of wordsUp) {
      if (o.gone) {
        o.k -= dt * (o.gone === 'burn' ? 0.6 : 1.6);
        if (o.gone === 'burn') o.s.position.lerp(coal.position, 1 - Math.exp(-dt * 1.8)), o.s.scale.multiplyScalar(1 - dt * 0.35);
        if (o.k <= 0) group.remove(o.s);
      } else o.k = Math.min(1, o.k + dt * 0.8);
      o.s.material.opacity = Math.max(0, o.k) * (0.85 + 0.15 * Math.sin(t * 1.7 + o.s.position.x * 5));
    }
    wordsUp = wordsUp.filter((o) => o.k > 0 || !o.gone);

    // who is there: the dark in the first and third, the white in the second and third; both go with the stillness
    const at = st.phase === 'furnace' && (st.step === 'hold' || st.step === 'burn');
    const d = at && (st.heats === 0 || st.heats === 2), w = at && (st.heats === 1 || st.heats === 2);
    st.dark = ease(st.dark, d ? 0.55 + 0.45 * Math.max(H, -L) - 0.25 * still : 0, d ? 0.8 : 1.4);
    st.white = ease(st.white, w ? 0.5 + 0.5 * Math.max(H, L) - 0.25 * still : 0, w ? 0.8 : 1.4);
    const sh = api.shadow();
    if (sh && st.phase === 'furnace') {
      const on = st.dark > 0.02, K = Math.min(1, st.dark);
      sh.obj.visible = on;
      sh.shells.forEach((m) => (m.visible = on));
      if (on) {
        const s = 1 + 0.4 * H + 0.15 * Math.max(0, -L), x = -sideX(STAND.z - FURN.z + 0.7) * (1 - 0.2 * Math.max(0, -L) - 0.08 * H), z = FURN.z - 0.7 + 0.3 * H;
        sh.obj.position.set(x, CAVE_Y, z);
        sh.obj.scale.set(0.0094 * (1 + 0.22 * (s - 1)), 0.0108 * s, 0.0094 * (1 + 0.22 * (s - 1)));
        sh.obj.rotation.y = Math.atan2(player.pos.x - x, player.pos.z - z);
        sh.standStill();
        sh.unbend();
        sh.mixer.update(dt);
        sh.obj.updateMatrixWorld(true);
        sh.posture(0.3 + 0.7 * Math.max(0, -L), 0.4 + 0.6 * Math.max(0, -L));
        sh.u.fade.value = 1 - K;
        sh.u.soft.value = 1;
        sh.u.smoke.value = 0.8 + 0.25 * H; // (more, and the smoke comes away from the body as a second outline)
        backGlow.position.set(x * 1.12, CAVE_Y + 1.5 * s, z - 1.4);
      }
    }
    backGlow.material.opacity = Math.min(1, st.dark) * 0.9;
    shaft.visible = st.white > 0.02;
    shaft.position.x = sideX(STAND.z - FURN.z + 0.7) * 1.18;
    shaft.scale.x = shaft.scale.z = Math.min(1, sideX(STAND.z - FURN.z + 0.7) / 1.8);
    shaftU.k.value = st.white * (1 + 0.6 * Math.max(0, L));
    shaftU.time.value = t;
    const bird = albedo.bird;
    if (bird.ready !== undefined && st.entered && !bird.on) {
      bird.obj.visible = st.white > 0.25 && inFurnace();
      if (bird.obj.visible) {
        // (so near the flask its white burns flat: its feathers are brought back)
        if (!bird.dimmed) bird.obj.traverse((o) => o.isMesh && o.material.color?.setScalar(0.36)), (bird.dimmed = true);
        const a = t * 0.35;
        bird.obj.position.set(shaft.position.x + 0.42 * shaft.scale.x * Math.sin(a), CAVE_Y + 2.5 + 0.3 * Math.sin(t * 0.5), shaft.position.z + 0.42 * shaft.scale.x * Math.cos(a));
        bird.obj.rotation.set(0, a + Math.PI / 2, 0);
        bird.mixer?.update(dt * 0.6);
      }
    }
    // the picture's sides, and what the glass shows
    sides[0].style.opacity = Math.max(0, (-L - 0.12) / 0.88).toFixed(3);
    sides[1].style.opacity = Math.max(0, (L - 0.12) / 0.88).toFixed(3);
    const g = st.glass;
    g.fume = ease(g.fume, Math.max(0, -L) * 2.2, 3);
    g.flecks = ease(g.flecks, Math.max(0, L), 3);
    g.boil = ease(g.boil, hold.on && hold.down ? (0.15 + 0.75 * H) * (1 - still) : 0, 1.5);
    g.heat = ease(g.heat, hold.on && hold.begun ? 0.25 + 0.5 * H : st.step === 'after' ? 0.4 : 0, 1.2);
    // sound: the fire, the glass ringing higher, the heart; at the end of the third only the glass
    st.hush = ease(st.hush, still, 1.5);
    const S = api.sound;
    S.hush(st.hush);
    S.fire(st.fire * (st.phase === 'furnace' || st.phase === 'red' ? 0.35 + (hold.on && hold.down ? 0.25 + 0.4 * H : 0) : 0.15) * (here(player) ? 1 : 0), dt);
    S.ring((st.heats + H) / 3, hold.on && hold.begun ? (0.25 + 0.75 * H) * (hold.down ? 1 : 0.35) : 0);
    if (hold.on && hold.down && still < 0.5 && (st.beat -= dt) <= 0) {
      st.beat = 1.25 - 0.5 * H;
      S.heart(0.06 + 0.16 * H + 0.1 * Math.abs(L));
    }
  };
  /* the sack opened: gold light, what was in it, and the gold that pours over to the flask */
  const drum = sack.drum.clone();
  const things = new THREE.Group();
  group.add(things);
  {
    drum.position.set(0.75, 0.13, 0.55);
    drum.rotation.set(Math.PI / 2, 0, -0.7);
    things.add(drum);
    // a letter, a white mask (stand-ins; the wooden horse comes with stage F5b)
    const paper = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.008, 0.13), new THREE.MeshStandardMaterial({ color: new THREE.Color(0.5, 0.45, 0.36), roughness: 0.9 }));
    paper.position.set(0.55, 0.02, 0.95);
    paper.rotation.y = 0.5;
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: new THREE.Color(0.55, 0.52, 0.48), roughness: 0.35 }));
    face.scale.set(0.85, 0.55, 1.15);
    face.position.set(1.05, 0.015, 0.85);
    things.add(paper, face);
    things.traverse((o) => o.isMesh && (o.castShadow = o.receiveShadow = true));
    things.position.set(SACK_AT.x, CAVE_Y, SACK_AT.z);
    things.visible = false;
  }
  // the opened sack takes the tied one's place in the burst of light
  const openSack = buildOpenSack({ parent: group, glowTex, clothMat: () => sack.clothMat(), lite });
  openSack.load.catch((e) => console.error('The opened sack did not load (the tied one stays):', e));
  const burst = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(1.2, 0.55, 0.12), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false }));
  burst.scale.setScalar(4.2);
  burst.renderOrder = 8;
  group.add(burst);
  const goldN = lite ? 70 : 170;
  const goldG = new THREE.BufferGeometry();
  const goldP = new Float32Array(goldN * 3), goldS = new Float32Array(goldN);
  for (let i = 0; i < goldN; i++) goldS[i] = h3(i, 4, 2);
  goldG.setAttribute('position', new THREE.BufferAttribute(goldP, 3));
  const goldM = new THREE.PointsMaterial({ map: glowTex, color: new THREE.Color(0.6, 0.3, 0.05), size: 0.022, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const goldPts = new THREE.Points(goldG, goldM);
  goldPts.frustumCulled = false;
  goldPts.visible = false;
  group.add(goldPts);
  const goldGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(0.22, 0.10, 0.018), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  goldGlow.scale.setScalar(2.6);
  group.add(goldGlow);
  const sparks = []; // the strengths' own words, rising out of it
  const _a = new THREE.Vector3(), _b = new THREE.Vector3();
  const showGold = (dt, t, player) => {
    const k = st.goldAt != null ? ss(0, 3, st.goldAt) : 0;
    sack.size.gold = k;
    st.openK = 1 + 0.35 * k;
    if (!k || !group.visible) return void ((goldPts.visible = false), (goldGlow.material.opacity = 0));
    // the neck loosens, light bursts out of it, and when you can see again the sack lies open
    const opened = openSack.ready && st.goldAt > 1.9;
    if (opened && !openSack.root.visible) {
      openSack.root.visible = true;
      sack.body.visible = false;
      for (const c of sack.coils) c.visible = false;
      openSack.root.position.copy(sack.bag.position);
      openSack.root.scale.setScalar(sack.size.k * 1.08);
      openSack.root.rotation.y = Math.atan2(player.pos.x - SACK_AT.x, player.pos.z - SACK_AT.z);
      things.visible = false;
      drum.position.set(0.95, 0.13, 1.0); // beside the heap, in front
      drum.rotation.set(Math.PI / 2, 0, -0.7);
      openSack.root.add(drum);
    }
    openSack.update(t, ss(1.6, 3.2, st.goldAt));
    burst.material.opacity = ss(0.8, 1.8, st.goldAt) * (1 - ss(1.95, 3.4, st.goldAt));
    burst.position.copy(sack.bag.position).setY(CAVE_Y + 0.75);
    burst.visible = burst.material.opacity > 0.01;
    _a.copy(sack.bag.position).setY(CAVE_Y + (opened ? 0.62 : 1.0) * sack.size.k);
    things.visible = !opened && !openSack.ready;
    things.scale.setScalar(Math.max(0.001, ss(0.4, 1.6, st.goldAt)));
    goldGlow.position.copy(_a);
    goldGlow.material.opacity = 0.55 * k * (0.85 + 0.15 * Math.sin(t * 2.1));
    // the pour: grains that leave the neck and bend over to the flask
    const pour = st.phase === 'gold' ? ss(0.6, 2, st.goldAt) : Math.max(0, (st.pourK ?? 0) - dt * 0.4);
    st.pourK = pour;
    goldPts.visible = pour > 0.01;
    goldM.opacity = 0.9 * pour;
    api.vessel.group.getWorldPosition(_b);
    for (let i = 0; i < goldN; i++) {
      const s = goldS[i], f = (t * (0.22 + 0.12 * s) + s * 7.3) % 1, e = f * f * (3 - 2 * f);
      goldP[i * 3] = _a.x + (_b.x - _a.x) * e + Math.sin(s * 40 + t * 1.4) * 0.16 * (1 - e) * (0.3 + e);
      goldP[i * 3 + 1] = _a.y + (_b.y - _a.y) * e + 0.75 * Math.sin(Math.PI * f) * (0.4 + 0.6 * s);
      goldP[i * 3 + 2] = _a.z + (_b.z - _a.z) * e + Math.cos(s * 57 + t * 1.1) * 0.16 * (1 - e) * (0.3 + e);
    }
    goldG.attributes.position.needsUpdate = true;
    if (!sparks.length && st.goldAt > 1.4)
      api.strengths().slice(-3).forEach((w, i) => {
        const s = wordSprite(w);
        s.material.color.setRGB(0.3, 0.2, 0.07);
        s.scale.multiplyScalar(0.6);
        group.add(s);
        sparks.push({ s, t: -i * 1.9, side: (i - 1) * 0.28 }); // (one after another, and apart: they never sit on each other)
      });
    for (const o of sparks) {
      o.t += dt;
      const f = Math.max(0, Math.min(1, o.t / 4.2));
      o.s.position.lerpVectors(_a, _b, f * f);
      o.s.position.y += 0.5 * Math.sin(Math.PI * f) + o.side * 0.6;
      o.s.position.x += o.side * Math.sin(Math.PI * f);
      o.s.material.opacity = o.t < 0 ? 0 : Math.sin(Math.PI * f);
    }
  };
  const inFurnace = () => st.phase === 'furnace';
  /** A tap on a word (a phone): true if one was under the finger. */
  const tapAt = (x, y, camera) => {
    if (!choosing()) return false;
    let best = null, bd = 90;
    for (const o of wordsUp) {
      if (o.gone) continue;
      _t.copy(o.s.position).project(camera);
      const d = Math.hypot(((_t.x + 1) / 2) * innerWidth - x, (((1 - _t.y) / 2) * innerHeight - y) * 1.6);
      if (d < bd) ((bd = d), (best = o));
    }
    best?.onPick();
    return !!best;
  };
  // the day that comes in at the opening, by the sun: black, white, red, gold
  const SUNS = [new THREE.Color(0.52, 0.24, 0.105), new THREE.Color(1.0, 0.93, 0.8), new THREE.Color(1.0, 0.46, 0.25), new THREE.Color(1.15, 0.68, 0.24)];
  const dayCol = new THREE.Color(), _back = new THREE.Color();
  const fireCol = new THREE.Color(1.0, 0.42, 0.12), goldCol = new THREE.Color(1.0, 0.6, 0.18);

  /** Where the flask is, between the eye's corner (0) and the furnace (1), in the rig's own space. */
  const placeVessel = (rig, vessel) => {
    if (st.flaskK < 0.002) return void vessel.setLarge(0);
    const k = st.flaskK * st.flaskK * (3 - 2 * st.flaskK);
    // it trembles with the heat, and not at all at the end
    const j = hold.on && hold.down ? 0.0035 * hold.heat * hold.heat * (1 - hold.still()) : 0;
    _t.copy(FLASK_AT).add(_j.set(Math.sin(st.t * 61), Math.sin(st.t * 73 + 1), Math.sin(st.t * 67 + 2)).multiplyScalar(j)).sub(rig.position).applyQuaternion(_q.copy(rig.quaternion).invert());
    vessel.group.position.lerp(_t, k);
    vessel.group.scale.setScalar(vessel.group.scale.x * (1 - k) + FLASK_S * k);
    vessel.setLarge(k, _back.copy(dayCol).multiplyScalar(0.05));
  };

  /** Its light, standing half a hand above the bricks, is held lower than in its corner. */
  const lightK = () => (1 - 0.6 * st.flaskK) * (1 - 0.75 * (st.sunkK ?? 0)) * (skull.worn ? 1.6 : 1);

  /** Coming back to a saved game: the heatings already held stay held. */
  const restore = (save) => {
    st.heats = save.rubedo?.done ? 0 : Math.min(3, save.rubedo?.heats | 0);
    if (st.heats >= 3) st.heats = 2; // the third is held again: what follows it is not kept
    st.sun = st.heats * 0.5;
    skull.restore(save.rubedo?.done ? null : save.rubedo?.skull);
  };

  // what main.js makes ready for the graphics card beforehand (warmUp)
  const loaded = Promise.allSettled([cave.load, openSack.load, skull.load]);

  return { loaded, hold, choosing, tapAt, group, st, update, lookedAt, line, here, home, skull, placeVessel, lightK, restore, sun, places: { Z0, Z1, CAVE_Y, FURN, SACK_AT, CHILD_AT, UP_X, UP_END, STAND } };
};
