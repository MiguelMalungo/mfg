import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

/*
 * Scanned people (Renderpeople "Nathan" and "Sophia") for the sleepers nearest the player.
 * - Both share Renderpeople's standard 88-bone skeleton, so Nathan's walk drives Sophia too.
 * - Clothes were repainted as plain pale linen offline (assets/people/<name>/dif.jpg);
 *   dif_old.jpg is the same person with grey hair.
 * - They walk ON the water: below the ankles they dissolve into light, which also hides the shoes.
 * - A grey aura (cool rim light plus a soft haze) marks them as asleep; it turns gold and fades on waking.
 */

const NEAR = 20; // scanned figures shown at once
const SWAP_EVERY = 0.4; // seconds between re-picking the nearest sleepers
const WALK_SPEED = 1.26; // metres per second the source walk clip covers at timeScale 1
const AURA = new THREE.Color(0.62, 0.68, 0.78);
const GOLD = new THREE.Color(1.0, 0.72, 0.35);

/** Bones and tracks are prefixed with the file name (rp_nathan_animated_003_walking_hip); strip it. */
const plain = (name) => name.replace(/^rp_[a-z]+_animated_\d+_[a-z]+_/i, '');

const loadFBX = async (url) => {
  // Its own manager: textures are assigned by hand below, so skip the paths baked into the FBX
  // without affecting any other loader.
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((u) => (/\.(jpe?g|png|tga)$/i.test(u) ? 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' : u));
  const fbx = await new FBXLoader(manager).loadAsync(url);
  fbx.traverse((o) => (o.name = plain(o.name)));
  for (const clip of fbx.animations) {
    for (const t of clip.tracks) {
      const dot = t.name.lastIndexOf('.');
      t.name = plain(t.name.slice(0, dot)) + t.name.slice(dot);
    }
  }
  return fbx;
};

const texLoader = new THREE.TextureLoader();
const tex = (url, srgb) => {
  const t = texLoader.load(url);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};

/** Removes root motion and, for another body, the source's bone lengths (keeps rotations). */
const inPlace = (clip, hipScale = 1) => {
  const c = clip.clone();
  c.tracks = c.tracks.filter((t) => {
    if (t.name === 'root.position') return false;
    if (t.name.endsWith('.scale')) return false;
    if (t.name.endsWith('.position') && t.name !== 'hip.position') return false;
    return true;
  });
  const hip = c.tracks.find((t) => t.name === 'hip.position');
  if (hip) for (let i = 0; i < hip.values.length; i++) hip.values[i] *= hipScale;
  return c;
};

/** Standard material plus: ankle dissolve into light, grey/gold aura rim, and a dither fade for swaps. */
const personMaterial = (maps) => {
  const m = new THREE.MeshStandardMaterial({ map: maps.dif, normalMap: maps.norm, roughnessMap: maps.rough, roughness: 1, metalness: 0 });
  const u = {
    footY: { value: 0 },
    aura: { value: 1 },
    auraColor: { value: AURA.clone() },
    fade: { value: 1 },
    time: { value: 0 },
  };
  m.userData.u = u;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vWY; attribute vec2 cloth; varying float vCloth; varying vec3 vObj;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        // long sleeves to the wrist and loose trousers: the cloth stands off the skin (bind space is cm)
        vCloth = max(cloth.x, cloth.y);
        vObj = position;
        transformed += normal * (cloth.x * (1.6 + 0.5 * sin(position.y * 0.35 + position.x * 0.2)) + cloth.y * 1.1);`,
      )
      .replace('#include <project_vertex>', '#include <project_vertex>\n vWY = (modelMatrix * vec4(transformed, 1.0)).y;');
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying float vWY; varying float vCloth; varying vec3 vObj;
        uniform float footY; uniform float aura; uniform vec3 auraColor; uniform float fade; uniform float time;
        float h21(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        const vec3 LINEN = vec3(0.66, 0.64, 0.6);`,
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        // moonlight drains colour: skin and cloth sit close to the silver of the scene
        diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11))), diffuseColor.rgb, 0.55);
        // the same pale linen as the robe, with soft creases
        float crease = 0.5 + 0.5 * sin(vObj.y * 0.55 + sin(vObj.x * 0.3 + vObj.z * 0.25) * 2.5);
        diffuseColor.rgb = mix(diffuseColor.rgb, LINEN * (0.8 + 0.25 * crease), vCloth);`,
      )
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        // below the ankle the body dissolves into light where it meets the water
        float above = vWY - footY;
        float keep = smoothstep(0.03, 0.17, above + 0.015 * sin(time * 3.0 + gl_FragCoord.x * 0.05));
        float d = h21(floor(gl_FragCoord.xy));
        if (keep * fade < d) discard;`,
      )
      .replace(
        '#include <opaque_fragment>',
        `// grey aura: a cool rim of light around the sleeper, and a glow at the dissolving ankles
        vec3 vdir = normalize(vViewPosition);
        float rim = pow(1.0 - clamp(dot(normal, vdir), 0.0, 1.0), 2.6);
        outgoingLight += auraColor * rim * aura * 0.55;
        outgoingLight += auraColor * (1.0 - smoothstep(0.03, 0.18, above)) * aura * 1.0;
        // a lantern held close would burn the face out: roll the highlights off like film
        outgoingLight = outgoingLight / (1.0 + outgoingLight * 0.85);
        #include <opaque_fragment>`,
      );
  };
  m.customProgramCacheKey = () => 'person-v4';
  return m;
};

/**
 * Per-vertex cloth amounts on a scan's own mesh (shared by all its clones):
 * x = sleeve (upper and lower arm, ending at the wrist), y = loose trouser leg (thigh and shin).
 */
const addClothAttribute = (src) => {
  let mesh = null;
  src.traverse((o) => o.isSkinnedMesh && (mesh = o));
  const geo = mesh.geometry;
  if (geo.attributes.cloth) return;
  const names = mesh.skeleton.bones.map((b) => b.name);
  const isArm = names.map((n) => /^(upperarm|lowerarm)/.test(n));
  const isHand = names.map((n) => /^(hand|thumb|index|middle|ring|pinky)_/.test(n));
  const isLeg = names.map((n) => /^(upperleg|lowerleg)/.test(n));
  const si = geo.attributes.skinIndex;
  const sw = geo.attributes.skinWeight;
  const cloth = new Float32Array(si.count * 2);
  const ss = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  for (let i = 0; i < si.count; i++) {
    let arm = 0, hand = 0, leg = 0;
    for (let c = 0; c < 4; c++) {
      const j = si.getComponent(i, c);
      const w = sw.getComponent(i, c);
      if (isArm[j]) arm += w;
      if (isHand[j]) hand += w;
      if (isLeg[j]) leg += w;
    }
    cloth[i * 2] = ss(0.35, 0.75, arm) * (1 - ss(0.12, 0.45, hand));
    cloth[i * 2 + 1] = ss(0.4, 0.8, leg);
  }
  geo.setAttribute('cloth', new THREE.BufferAttribute(cloth, 2));
};

/**
 * A long tunic for one scan, in its bind space: a flared, folded skirt from just above the hips
 * to mid-calf, skinned to the hip and leg bones so it swings with the walk.
 */
const buildRobeGeometry = (src) => {
  let mesh = null;
  src.traverse((o) => o.isSkinnedMesh && (mesh = o));
  const sk = mesh.skeleton;
  const idx = (n) => sk.bones.findIndex((b) => b.name === n);
  const bindInv = mesh.bindMatrix.clone().invert();
  const at = (n) => new THREE.Vector3().setFromMatrixPosition(sk.boneInverses[idx(n)].clone().invert()).applyMatrix4(bindInv);
  const hip = at('hip');
  const legL = at('upperleg_l'), legR = at('upperleg_r');
  const kneeL = at('lowerleg_l'), kneeR = at('lowerleg_r');
  const footL = at('foot_l'), footR = at('foot_r');
  const ballL = at('ball_l');
  const feet = footL.clone().add(footR).multiplyScalar(0.5);
  const knees = kneeL.clone().add(kneeR).multiplyScalar(0.5);
  const up = hip.clone().sub(feet).normalize();
  const side = legL.clone().sub(legR); // toward the left leg
  side.addScaledVector(up, -side.dot(up)).normalize();
  // forward is perpendicular to both; the toes only choose its sign
  const fwd = new THREE.Vector3().crossVectors(side, up).normalize();
  if (fwd.dot(ballL.clone().sub(footL)) < 0) fwd.negate();
  const sep = legL.distanceTo(legR);
  const hipH = hip.clone().sub(feet).dot(up);
  const kneeH = knees.clone().sub(feet).dot(up);
  const top = hipH + 11; // over the shirt's hem, which the sash at its top hides
  const hem = kneeH * 0.42; // mid-calf
  const base = feet.clone().addScaledVector(up, -feet.clone().sub(feet).dot(up));
  const rings = 28, segs = 72;
  const pos = [], skinI = [], skinW = [], uv = [];
  const iHip = idx('hip'), iUL = idx('upperleg_l'), iUR = idx('upperleg_r'), iLL = idx('lowerleg_l'), iLR = idx('lowerleg_r');
  const kneeT = (top - kneeH) / (top - hem);
  for (let k = 0; k <= rings; k++) {
    const t = k / rings; // 0 at the waist, 1 at the hem
    const h = top + (hem - top) * t;
    const c = base.clone().addScaledVector(up, h);
    const a0 = sep * 0.5 + 11.5 + 15 * Math.pow(t, 1.25); // half-width, flaring toward the hem
    const b0 = 13 + 12 * Math.pow(t, 1.25); // half-depth
    for (let j = 0; j <= segs; j++) {
      const th = (j / segs) * Math.PI * 2;
      const sx = Math.cos(th), fz = Math.sin(th);
      // Soft folds: few and broad at the waist, deeper and rounder toward the hem. A raised cosine
      // gives rounded crests and narrow valleys, like cloth hanging under its own weight.
      const ph = th * 8 + Math.sin(th * 3 + 1.1) * 1.2;
      const wave = Math.pow(0.5 + 0.5 * Math.cos(ph), 1.6) - 0.42;
      const fold = 1 + (0.02 + 0.2 * Math.pow(t, 1.4)) * wave + 0.025 * t * Math.sin(th * 19 + 0.7);
      const p = c.clone().addScaledVector(side, sx * a0 * fold).addScaledVector(fwd, fz * b0 * fold + t * t * 2.5);
      // the hem dips where a fold hangs, so the edge is uneven
      if (k === rings) p.addScaledVector(up, -3.5 * (wave + 0.42));
      pos.push(p.x, p.y, p.z);
      uv.push(j / segs, t);
      // skin weights: the hip near the waist, the legs below, the shins near the hem
      const wl = Math.min(1, Math.max(0, 0.5 + 0.35 * sx)); // left leg share (both legs everywhere)
      // mostly the hips: the legs only sway it; the shader pushes the cloth out of the legs' way
      const legW = Math.min(0.35, Math.pow(t, 0.9) * 0.4);
      const shin = Math.min(1, Math.max(0, (t - kneeT + 0.15) / 0.4)) * 0.55;
      const L = wl >= 0.5;
      const wUL = legW * wl * (L ? 1 - shin : 1);
      const wUR = legW * (1 - wl) * (L ? 1 : 1 - shin);
      const wLow = legW * (L ? wl : 1 - wl) * shin;
      skinI.push(iHip, iUL, iUR, L ? iLL : iLR);
      skinW.push(1 - legW, wUL, wUR, wLow);
    }
  }
  const index = [];
  for (let k = 0; k < rings; k++)
    for (let j = 0; j < segs; j++) {
      const a = k * (segs + 1) + j, b = a + segs + 1;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinI, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinW, 4));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
};

/** Pale linen for the robe; shares the person's aura uniforms so it glows and turns gold with them. */
const robeMaterial = (u) => {
  // six points per figure, updated every frame: hip joint, knee and ankle of each leg (mesh space, cm)
  const legs = { value: Array.from({ length: 6 }, () => new THREE.Vector3()) };
  const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.66, 0.64, 0.6), roughness: 0.96, metalness: 0, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.uniforms.legs = legs;
    sh.vertexShader = sh.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec2 vRUv;
        uniform vec3 legs[6];
        // keeps a point outside the capsule around segment a-b
        vec3 pushOut(vec3 p, vec3 a, vec3 b, float r) {
          vec3 ab = b - a;
          float h = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
          vec3 c = a + ab * h;
          vec3 d = p - c;
          float l = length(d);
          return l < r ? c + d / max(l, 1e-3) * r : p;
        }`,
      )
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n vRUv = uv;')
      .replace(
        '#include <skinning_vertex>',
        `#include <skinning_vertex>
        // the cloth can't pass through the legs: it rides over the thigh and shin of the striding leg
        for (int i = 0; i < 2; i++) {
          transformed = pushOut(transformed, legs[i * 3], legs[i * 3 + 1], 12.5);
          transformed = pushOut(transformed, legs[i * 3 + 1], legs[i * 3 + 2], 10.0);
        }`,
      );
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vRUv; uniform float aura; uniform vec3 auraColor; uniform float fade;\nfloat rh(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }')
      .replace(
        '#include <clipping_planes_fragment>',
        '#include <clipping_planes_fragment>\n if (fade < rh(floor(gl_FragCoord.xy))) discard;',
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        // worn linen: a faint weave, a darker, dirtier hem, the inside in shadow
        float weave = 0.94 + 0.06 * rh(floor(vRUv * vec2(900.0, 260.0)));
        diffuseColor.rgb *= weave * mix(1.0, 0.72, smoothstep(0.8, 1.0, vRUv.y)) * (gl_FrontFacing ? 1.0 : 0.45);
        // a plain cloth sash at the waist
        float sash = 1.0 - smoothstep(0.075, 0.09, vRUv.y);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.3, 0.29, 0.27) * weave, sash);`,
      )
      .replace(
        '#include <opaque_fragment>',
        `vec3 vdir = normalize(vViewPosition);
        float rim = pow(1.0 - clamp(abs(dot(normal, vdir)), 0.0, 1.0), 2.6);
        outgoingLight += auraColor * rim * aura * 0.5;
        outgoingLight = outgoingLight / (1.0 + outgoingLight * 0.85);
        #include <opaque_fragment>`,
      );
  };
  m.userData.legs = legs.value;
  m.customProgramCacheKey = () => 'robe-v3';
  return m;
};

export const loadPeople = async (scene, glowTex) => {
  const [nathanFBX, sophiaFBX] = await Promise.all([loadFBX('./assets/people/nathan/model.fbx'), loadFBX('./assets/people/sophia/model.fbx')]);
  const walkNathan = inPlace(nathanFBX.animations[0], 1);
  const walkSophia = inPlace(nathanFBX.animations[0], 84.2 / 94.6); // Sophia's hips are lower
  const idleSophia = inPlace(sophiaFBX.animations[0], 1);

  const maps = {};
  for (const n of ['nathan', 'sophia']) {
    const base = { norm: tex(`./assets/people/${n}/norm.jpg`), rough: tex(`./assets/people/${n}/rough.jpg`) };
    maps[n] = { ...base, dif: tex(`./assets/people/${n}/dif.jpg`, true) };
    maps[`${n}_old`] = { ...base, dif: tex(`./assets/people/${n}/dif_old.jpg`, true) };
  }
  const variants = [
    { src: sophiaFBX, maps: maps.sophia, walk: walkSophia, idle: idleSophia },
    { src: nathanFBX, maps: maps.nathan, walk: walkNathan, idle: null },
    { src: sophiaFBX, maps: maps.sophia_old, walk: walkSophia, idle: idleSophia },
    { src: nathanFBX, maps: maps.nathan_old, walk: walkNathan, idle: null },
  ];
  // long robes, as in the key art: sleeves and loose trousers on the scan itself, plus a skinned tunic skirt
  const robes = new Map();
  for (const src of [sophiaFBX, nathanFBX]) addClothAttribute(src);

  const makeFigure = (v) => {
    const obj = SkeletonUtils.clone(v.src);
    obj.scale.setScalar(0.01); // centimetres → metres
    let mesh = null;
    obj.traverse((o) => {
      if (o.isSkinnedMesh) {
        mesh = o;
        o.frustumCulled = false;
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    const mat = personMaterial(v.maps);
    mesh.material = mat;
    // (the skinned tunic skirt was removed at the owner's request: it never moved convincingly)
    const robe = null;
    const mixer = new THREE.AnimationMixer(obj);
    const walk = mixer.clipAction(v.walk);
    walk.play();
    const idle = v.idle ? mixer.clipAction(v.idle) : null;
    if (idle) {
      idle.play();
      idle.weight = 0;
    }
    const bones = {};
    obj.traverse((o) => o.isBone && (bones[o.name] = o));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: AURA.clone(), transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.scale.set(1.5, 2.3, 1);
    scene.add(halo);
    obj.visible = false;
    halo.visible = false;
    scene.add(obj);
    return { obj, mat, robe, mixer, walk, idle, bones, halo, slot: -1, t0: Math.random() * 3, rate: 0.9 + Math.random() * 0.2 };
  };

  // Pools: enough per variant to cover the nearest set, plus the companion.
  const pools = variants.map((v) => Array.from({ length: Math.ceil(NEAR / variants.length) + 3 }, () => makeFigure(v)));
  const companionFig = makeFigure(variants[0]);
  const active = new Map(); // sleeper index → figure
  let swapTimer = 0;
  const _q = new THREE.Quaternion();
  const _pq = new THREE.Quaternion();
  const _axis = new THREE.Vector3();

  /** Adds a rotation around a world axis to a bone, after the animation has posed it. */
  const bendBone = (bone, axis, angle) => {
    if (!bone || angle === 0) return;
    bone.parent.getWorldQuaternion(_pq);
    _q.setFromAxisAngle(axis, angle);
    // local delta = parent⁻¹ · world delta · parent
    const local = _pq.clone().invert().multiply(_q).multiply(_pq);
    bone.quaternion.premultiply(local);
    bone.updateMatrixWorld(true);
  };

  const place = (fig, s, dt, t) => {
    const { obj, mat, mixer, walk, idle, bones, halo } = fig;
    obj.visible = true;
    halo.visible = true;
    const awake = s.awake;
    obj.position.set(s.x, s.y, s.z);
    obj.rotation.set(0, s.face, 0);
    // the walk slows to a stop as they wake; Sophia then eases into her own standing idle
    // awake and standing: her own idle; awake and walking (the companion leading the way): the walk
    const still = awake * (1 - (s.walking || 0));
    walk.timeScale = (s.speed / WALK_SPEED) * fig.rate * (1 - still);
    if (idle) {
      idle.weight = still;
      walk.weight = 1 - still;
    }
    mixer.update(dt);
    obj.updateMatrixWorld(true);
    // sleepwalking: head and neck bowed, a slight slump; all released on waking
    _axis.set(Math.cos(s.face), 0, -Math.sin(s.face));
    const sleep = 1 - awake;
    bendBone(bones.spine_03, _axis, 0.08 * sleep);
    // in the finale the awake lift their heads to the light
    const up = s.lookUp || 0;
    bendBone(bones.neck, _axis, 0.28 * sleep - 0.18 * up);
    bendBone(bones.head, _axis, 0.38 * sleep - 0.05 * awake - 0.22 * up);
    if (fig.robe) {
      // the legs, in the robe's own space, for its cloth collision
      const L = fig.robe.material.userData.legs;
      ['upperleg_l', 'lowerleg_l', 'foot_l', 'upperleg_r', 'lowerleg_r', 'foot_r'].forEach((n, i) => fig.robe.worldToLocal(bones[n].getWorldPosition(L[i])));
    }
    const u = mat.userData.u;
    u.footY.value = s.y;
    u.time.value = t;
    u.aura.value = sleep + awake * Math.max(0, 1 - (awake - 0.2) * 1.6) * 1.4;
    u.auraColor.value.copy(AURA).lerp(GOLD, Math.min(1, awake * 2.5));
    halo.position.set(s.x, s.y + 1.05, s.z);
    halo.material.color.copy(u.auraColor.value);
    halo.material.opacity = 0.11 * u.aura.value;
  };

  /*
   * The player's hand: Sophia's scanned right forearm and hand, closed in a fist around the lantern's ring.
   * The forearm bone is lifted out of his skeleton into its own group (origin at the wrist, in the
   * bind pose's axes: forearm along -X, palm facing -Y, thumb toward +Z), the fingers are curled
   * once, and every vertex not skinned to the forearm or hand is discarded in the shader.
   */
  const buildHand = () => {
    const v = variants[0]; // Sophia: the Lantern-Bearer's arm
    const obj = SkeletonUtils.clone(v.src);
    let mesh = null;
    obj.traverse((o) => o.isSkinnedMesh && (mesh = o));
    const bones = {};
    obj.traverse((o) => o.isBone && (bones[o.name] = o));
    obj.updateMatrixWorld(true);
    // per-vertex weight on the forearm and hand bones
    const keepIdx = new Set();
    const handIdx = new Set();
    mesh.skeleton.bones.forEach((b, i) => {
      if (/^(upperarm|lowerarm|hand|thumb|index|middle|ring|pinky)_.*r$/.test(b.name)) keepIdx.add(i);
      if (/^(hand|thumb|index|middle|ring|pinky)_.*r$/.test(b.name)) handIdx.add(i);
    });
    const geo = mesh.geometry.clone();
    const si = geo.attributes.skinIndex;
    const sw = geo.attributes.skinWeight;
    const keep = new Float32Array(si.count);
    const handW = new Float32Array(si.count);
    for (let i = 0; i < si.count; i++)
      for (let c = 0; c < 4; c++) {
        const j = si.getComponent(i, c);
        if (keepIdx.has(j)) keep[i] += sw.getComponent(i, c);
        if (handIdx.has(j)) handW[i] += sw.getComponent(i, c);
      }
    geo.setAttribute('keep', new THREE.BufferAttribute(keep, 1));
    geo.setAttribute('handW', new THREE.BufferAttribute(handW, 1));
    // the arm's top end fades into the dark (dithered) instead of showing a cut: distance from the shoulder joint
    {
      const sk = mesh.skeleton;
      const iSh = sk.bones.findIndex((b) => b.name === 'upperarm_r');
      const sh = new THREE.Vector3().setFromMatrixPosition(sk.boneInverses[iSh].clone().invert()).applyMatrix4(mesh.bindMatrix.clone().invert());
      const pos = geo.attributes.position;
      const fadeA = new Float32Array(pos.count);
      const v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        const d = v.fromBufferAttribute(pos, i).distanceTo(sh);
        fadeA[i] = Math.min(1, Math.max(0, (d - 5) / 14));
      }
      geo.setAttribute('fadeA', new THREE.BufferAttribute(fadeA, 1));
    }
    // Kept vertices follow only the arm bones (no pull toward the hidden body), and only triangles
    // whose three corners are kept are drawn, so nothing stretches across the cut.
    for (let i = 0; i < si.count; i++) {
      if (keep[i] < 0.5) continue;
      let sum = 0;
      for (let c = 0; c < 4; c++) {
        if (!keepIdx.has(si.getComponent(i, c))) sw.setComponent(i, c, 0);
        sum += sw.getComponent(i, c);
      }
      for (let c = 0; c < 4; c++) sw.setComponent(i, c, sw.getComponent(i, c) / sum);
    }
    sw.needsUpdate = true;
    const tri = [];
    const src = geo.index ? geo.index.array : null;
    const nTri = (src ? src.length : si.count) / 3;
    for (let t = 0; t < nTri; t++) {
      const a = src ? src[t * 3] : t * 3;
      const b = src ? src[t * 3 + 1] : t * 3 + 1;
      const c = src ? src[t * 3 + 2] : t * 3 + 2;
      if (keep[a] >= 0.5 && keep[b] >= 0.5 && keep[c] >= 0.5) tri.push(a, b, c);
    }
    geo.setIndex(tri);
    mesh.geometry = geo;
    const mat = new THREE.MeshStandardMaterial({ map: v.maps.dif, normalMap: v.maps.norm, roughnessMap: v.maps.rough, roughness: 1, metalness: 0 });
    // a dark wool coat sleeve over the arm, ending just above the wrist; skin stays on the hand
    mat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float keep; attribute float handW; attribute float fadeA; varying float vKeep; varying float vSleeve; varying vec3 vObj; varying float vFadeA;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          vKeep = keep;
          vFadeA = fadeA;
          vSleeve = 1.0 - smoothstep(0.1, 0.45, handW);
          vObj = position;
          // the cloth stands off the skin (geometry is in centimetres)
          // a loose sleeve: it stands well off the arm, in soft folds, and widens toward the cuff
          float cuff = smoothstep(0.0, 0.12, handW) * (1.0 - smoothstep(0.12, 0.4, handW));
          transformed += normal * (vSleeve * (3.4 + 1.3 * sin(position.x * 0.7 + position.y * 0.35) + 0.8 * sin(position.y * 1.7 + position.z)) + cuff * 2.6);`,
        );
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vKeep; varying float vSleeve; varying vec3 vObj; varying float vFadeA;\nfloat hh(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }')
        .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n if (vKeep < 0.5) discard;\n if (vFadeA < hh(floor(gl_FragCoord.xy))) discard;')
        .replace(
          '#include <map_fragment>',
          `#include <map_fragment>
          // a heavy dark wool sleeve in herringbone, as in the key art: soft folds, a woven pattern up close
          float fold = 0.5 + 0.5 * sin(vObj.x * 0.6 + sin(vObj.y * 0.3 + vObj.z * 0.2) * 2.0);
          vec2 wv = vec2(vObj.x + vObj.z * 0.6, vObj.y) * 5.0;
          float colm = floor(wv.x * 0.5);
          float dirn = mod(colm, 2.0) * 2.0 - 1.0;
          float weave = step(0.5, fract(wv.y * 1.6 + dirn * wv.x * 1.6));
          vec3 linen = mix(vec3(0.028, 0.027, 0.03), vec3(0.085, 0.078, 0.072), weave) * (0.7 + 0.5 * fold);
          diffuseColor.rgb = mix(diffuseColor.rgb, linen, vSleeve);`,
        )
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, 0.95, vSleeve);')
        .replace(
          '#include <opaque_fragment>',
          `// the flame is a hand's width away: roll off the hot spots instead of clipping
          outgoingLight = outgoingLight / (1.0 + outgoingLight * 0.9);
          #include <opaque_fragment>`,
        );
    };
    mat.customProgramCacheKey = () => 'hand-v5';
    mesh.material = mat;
    mesh.frustumCulled = false;
    mesh.castShadow = mesh.receiveShadow = false;

    const root = new THREE.Group();
    // The whole arm from the shoulder joint; the cut at the shoulder stays off-screen.
    // Each scan rests differently (Nathan in a T-pose; Sophia with a bent elbow and curled fingers),
    // so first give the arm Nathan's straight rest pose: both share Renderpeople's skeleton layout.
    const ref = {};
    const refSrc = variants[1].src;
    refSrc.updateMatrixWorld(true);
    refSrc.traverse((o) => o.isBone && (ref[o.name] = o));
    for (const [n, b] of Object.entries(bones)) if (/^(upperarm_twist|lowerarm|hand|thumb|index|middle|ring|pinky)_.*r$/.test(n) && ref[n]) b.quaternion.copy(ref[n].quaternion);
    const fore = bones.upperarm_r;
    root.add(fore);
    fore.position.set(0, 0, 0);
    fore.quaternion.copy(ref.upperarm_r.getWorldQuaternion(new THREE.Quaternion()));
    root.updateMatrixWorld(true);
    // then turn it so the forearm runs along -X and the thumb side faces +Z (the frame posing assumes),
    // with the wrist at the origin
    const wp = (n) => root.worldToLocal(bones[n].getWorldPosition(new THREE.Vector3()));
    const wrist = wp('hand_r');
    const fDir = wrist.clone().sub(wp('lowerarm_r')).normalize();
    const tDir = wp('thumb_01_r').sub(wp('pinky_01_r'));
    tDir.addScaledVector(fDir, -tDir.dot(fDir)).normalize();
    const basis = (e1, e3) => new THREE.Matrix4().makeBasis(e1, e3.clone().cross(e1), e3);
    const align = new THREE.Quaternion().setFromRotationMatrix(
      basis(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1)).multiply(basis(fDir, tDir).invert()),
    );
    fore.position.copy(wrist).negate().applyQuaternion(align);
    fore.quaternion.premultiply(align);
    root.scale.setScalar(0.01); // centimetres → metres
    // the rest of the body collapses to a point out of sight (its vertices are discarded anyway)
    obj.scale.setScalar(1e-4);
    obj.position.set(0, -1, 1);
    root.add(obj);

    const rest = new Map();
    fore.traverse((b) => rest.set(b, b.quaternion.clone()));
    const _rq = new THREE.Quaternion();
    const bend = (name, axis, ang) => {
      root.updateMatrixWorld(true);
      bendBone(bones[name], new THREE.Vector3(...axis).applyQuaternion(root.getWorldQuaternion(_rq)), ang);
    };
    const Z = [0, 0, 1];
    const X = [1, 0, 0];
    const Y = [0, 1, 0];
    /** Closes the hand into a grip. Angles in radians; tune live with __g.hand.pose({...}). */
    const P = { mcp: 1.25, pip: 1.45, dip: 0.75, spread: 0.06, t1x: -0.5, t1y: 0.25, t2: -0.55, t3: -0.6, wristUp: 0.12, elbow: 0.2 };
    const pose = (o = {}) => {
      Object.assign(P, o);
      for (const [b, q] of rest) b.quaternion.copy(q);
      bend('lowerarm_r', Y, -P.elbow);
      bend('hand_r', Z, -P.wristUp);
      ['index', 'middle', 'ring', 'pinky'].forEach((f, i) => {
        const k = 1 + i * 0.06; // the outer fingers close a little more
        bend(`${f}_01_r`, Y, (i - 1.5) * -P.spread);
        bend(`${f}_01_r`, Z, P.mcp * k);
        bend(`${f}_02_r`, Z, P.pip);
        bend(`${f}_03_r`, Z, P.dip);
      });
      bend('thumb_01_r', X, P.t1x);
      bend('thumb_01_r', Y, P.t1y);
      bend('thumb_02_r', X, P.t2);
      bend('thumb_03_r', X, P.t3);
    };
    // where the ring's bar sits inside the fist (root frame, cm): the centre of the curled middle finger
    const grip = new THREE.Vector3();
    const measureGrip = () => {
      const saveQ = root.quaternion.clone();
      const saveP = root.position.clone();
      const parent = root.parent;
      parent?.remove(root);
      root.quaternion.identity();
      root.position.set(0, 0, 0);
      root.updateMatrixWorld(true);
      grip.set(0, 0, 0);
      const v3 = new THREE.Vector3();
      for (const n of ['middle_01_r', 'middle_02_r', 'middle_03_r', 'middle_end_r', 'ring_02_r', 'index_02_r']) grip.add(bones[n].getWorldPosition(v3));
      grip.multiplyScalar(1 / 6 / 0.01);
      root.quaternion.copy(saveQ);
      root.position.copy(saveP);
      parent?.add(root);
    };
    pose();
    measureGrip();
    /**
     * Places the fist so the grip lands on `at` (lantern space), with the forearm running back toward `elbowDir`.
     */
    const place = (at, elbowDir) => {
      const x = elbowDir.clone().normalize();
      const z = x.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
      const y = z.clone().cross(x);
      root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
      root.position.copy(at).sub(grip.clone().multiplyScalar(0.01).applyQuaternion(root.quaternion));
    };
    return { root, pose, place, grip, P, measureGrip };
  };

  /**
   * A person for a scene of its own (the end of the tower chapter): a variant standing in its idle,
   * placed by hand. tilt() lifts or bows the head after the animation.
   */
  const makeActor = (vi = 2) => {
    const fig = makeFigure(variants[vi]);
    fig.walk.weight = 0;
    if (fig.idle) fig.idle.weight = 1;
    const u = fig.mat.userData.u;
    u.footY.value = -100; // no dissolving feet
    u.aura.value = 0.25;
    fig.halo.visible = false;
    const axis = new THREE.Vector3();
    return {
      obj: fig.obj,
      show(v) {
        fig.obj.visible = v;
      },
      update(t, dt, headTilt = 0) {
        u.time.value = t;
        fig.mixer.update(dt);
        fig.obj.updateMatrixWorld(true);
        const f = fig.obj.rotation.y;
        axis.set(Math.cos(f), 0, -Math.sin(f));
        bendBone(fig.bones.head, axis, headTilt);
        bendBone(fig.bones.neck, axis, headTilt * 0.5);
      },
      bones: fig.bones,
    };
  };

  return {
    _debug: { companionFig, active, variants },
    makeActor,
    buildHand,
    /**
     * @param sleepers  the procedural crowd from sleepers.js (positions and state per index)
     * @param playerPos player position
     */
    update(t, dt, sleepers, playerPos) {
      swapTimer -= dt;
      if (swapTimer <= 0) {
        swapTimer = SWAP_EVERY;
        // pick the NEAR closest sleepers (index 0, the companion, has its own figure)
        const order = [];
        for (let i = 1; i < sleepers.count; i++) {
          const s = sleepers.state[i];
          order.push([(s.x - playerPos.x) ** 2 + (s.z - playerPos.z) ** 2, i]);
        }
        order.sort((a, b) => a[0] - b[0]);
        const want = new Set(order.slice(0, NEAR).map((o) => o[1]));
        for (const [i, fig] of active) {
          if (!want.has(i)) {
            fig.obj.visible = fig.halo.visible = false;
            fig.slot = -1;
            active.delete(i);
            sleepers.setHidden(i, false);
          }
        }
        for (const i of want) {
          if (active.has(i)) continue;
          const fig = pools[i % pools.length].find((f) => f.slot === -1);
          if (!fig) continue;
          fig.slot = i;
          fig.walk.time = (i * 0.37) % fig.walk.getClip().duration;
          active.set(i, fig);
          sleepers.setHidden(i, true);
        }
      }
      for (const [i, fig] of active) place(fig, sleepers.state[i], dt, t);
      sleepers.setHidden(0, true);
      place(companionFig, sleepers.state[0], dt, t);
    },
  };
};
