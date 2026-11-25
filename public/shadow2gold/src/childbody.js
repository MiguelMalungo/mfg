import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/*
 * The child's own body (2026-11-25): a boy or a girl of Microsoft's Rocketbox library (MIT; assets/people/CREDITS.md),
 * in place of a scanned man made small. Its movements are still those of people.js, makeChild: the scan's skeleton goes
 * on walking, leaning and reaching unseen, and every frame this body's bones are turned the same way. Only turns are
 * taken over, never lengths, so the build stays a child's.
 */
const DIR = './assets/people/';
const MAP = {
  Pelvis: 'hip', Spine: 'spine_01', Spine1: 'spine_02', Spine2: 'spine_03', Neck: 'neck', Head: 'head',
  L_Clavicle: 'shoulder_l', L_UpperArm: 'upperarm_l', L_Forearm: 'lowerarm_l', L_Hand: 'hand_l',
  R_Clavicle: 'shoulder_r', R_UpperArm: 'upperarm_r', R_Forearm: 'lowerarm_r', R_Hand: 'hand_r',
  L_Thigh: 'upperleg_l', L_Calf: 'lowerleg_l', L_Foot: 'foot_l', L_Toe0: 'ball_l', R_Thigh: 'upperleg_r', R_Calf: 'lowerleg_r', R_Foot: 'foot_r', R_Toe0: 'ball_r',
};
// the limbs stand differently at rest in the two skeletons (arms out, arms down): each is first laid along the other
const ALONG = {
  L_UpperArm: ['L_Forearm', 'lowerarm_l'], L_Forearm: ['L_Hand', 'hand_l'], R_UpperArm: ['R_Forearm', 'lowerarm_r'], R_Forearm: ['R_Hand', 'hand_r'],
  L_Thigh: ['L_Calf', 'lowerleg_l'], L_Calf: ['L_Foot', 'foot_l'], R_Thigh: ['R_Calf', 'lowerleg_r'], R_Calf: ['R_Foot', 'foot_r'],
};
const HEIGHT = 1.2; // metres
const bare = (n) => n.replace(/^Bip0\d_/, '');

export const loadChildBodies = async () => {
  const gltf = new GLTFLoader();
  const [boy, girl] = await Promise.all(['boy', 'girl'].map((w) => gltf.loadAsync(`${DIR}${w}/model.glb`)));
  return { boy: boy.scene, girl: girl.scene };
};

/** driver: { obj, mesh, bones } of the unseen skeleton (people.js). root: what both hang from. u: { fade, time }. */
export const makeChildBody = (src, who, { root, driver, u }) => {
  const tl = new THREE.TextureLoader();
  const T = (f, srgb) => {
    const t = tl.load(`${DIR}${who}/${f}.jpg`);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.flipY = false; // (glTF)
    t.anisotropy = 4;
    return t;
  };
  const tone = { value: 0.22 }; // how much of its own colour it has: in the house it is a shape against the light; more in the cave (child.js)
  const material = (part) => {
    const m = new THREE.MeshStandardMaterial({ map: T(part, true), normalMap: T(part + '_n'), roughness: part === 'head' ? 0.8 : 0.95 });
    m.defines = { PART_K: part === 'head' ? '0.72' : '1.0' }; // (the face stays a little in the shade)
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, u, { tone });
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float fade, time, tone;\nfloat hh(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }')
        .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (fade > hh(floor(gl_FragCoord.xy) + floor(time * 20.0) * 3.0)) discard;')
        .replace('#include <map_fragment>', '#include <map_fragment>\n{ float l = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11)); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(l) * vec3(1.0, 0.9, 0.76), 0.45) * tone * PART_K; }');
    };
    m.customProgramCacheKey = () => 'st2g-childbody';
    return m;
  };
  const obj = new THREE.Group();
  obj.add(src);
  const B = {};
  const mats = { body: material('body'), head: material('head') };
  const meshes = [];
  src.traverse((o) => {
    if (o.isBone) B[bare(o.name)] = o;
    if (o.isSkinnedMesh) {
      meshes.push(o);
      o.frustumCulled = false;
      o.castShadow = o.receiveShadow = true;
    }
  });
  meshes.forEach((m, i) => (m.material = i === 0 ? mats.body : mats.head)); // (in the file's order: the body, then the head)
  root.add(obj);

  /* the two rests, both seen from the root */
  const inv = new THREE.Quaternion(), q = new THREE.Quaternion(), v = new THREE.Vector3(), w = new THREE.Vector3();
  const rootQ = () => root.getWorldQuaternion(inv).invert();
  const keep = new Map();
  for (const k in driver.bones) keep.set(driver.bones[k], [driver.bones[k].position.clone(), driver.bones[k].quaternion.clone(), driver.bones[k].scale.clone()]);
  driver.mesh.skeleton.pose();
  root.updateMatrixWorld(true);
  const at = (b) => root.worldToLocal(b.getWorldPosition(new THREE.Vector3()));
  const turn = (b) => rootQ().clone().multiply(b.getWorldQuaternion(q)).clone();
  const D0 = {}, C0 = {}, OFF = {}, LAY = {};
  for (const [c, d] of Object.entries(MAP)) ((D0[c] = turn(driver.bones[d])), (C0[c] = turn(B[c])));
  for (const [c, [cNext, dNext]] of Object.entries(ALONG)) {
    const dc = at(B[cNext]).sub(at(B[c])).normalize(), dd = at(driver.bones[dNext]).sub(at(driver.bones[MAP[c]])).normalize();
    LAY[c] = new THREE.Quaternion().setFromUnitVectors(dc, dd);
  }
  LAY.L_Hand = LAY.L_Forearm;
  LAY.R_Hand = LAY.R_Forearm;
  for (const c in MAP) OFF[c] = D0[c].clone().invert().multiply(LAY[c] ? LAY[c].clone().multiply(C0[c]) : C0[c]);
  // (parents first)
  const ORDER = [];
  src.traverse((o) => o.isBone && MAP[bare(o.name)] && ORDER.push(bare(o.name)));
  const S = HEIGHT / Math.max(0.5, at(B.Head).y + 0.18);
  const ankle = Math.min(at(B.L_Foot).y, at(B.R_Foot).y) * S;
  obj.scale.setScalar(S);
  B.Head.scale.setScalar(1.1);
  for (const [b, [p, r, s]] of keep) (b.position.copy(p), b.quaternion.copy(r), b.scale.copy(s));
  // the hand that holds the rope is half closed
  for (const f of ['1', '2', '3', '4'])
    for (const j of ['', '1', '2']) {
      const b = B[`R_Finger${f}${j}`];
      if (b) b.rotateZ(j ? 0.95 : 0.75);
    }
  let lift = 0;
  const _pq = new THREE.Quaternion();
  const follow = () => {
    const back = rootQ().clone(), fwd = back.clone().invert();
    for (const c of ORDER) {
      const b = B[c];
      driver.bones[MAP[c]].getWorldQuaternion(q);
      // the driver's turn, seen from the root, carried on to this bone; then into the bone's own parent
      q.premultiply(back).multiply(OFF[c]).premultiply(fwd);
      b.parent.getWorldQuaternion(_pq);
      b.quaternion.copy(_pq.invert().multiply(q));
      b.updateMatrixWorld(true);
    }
    // the lower foot rests on the floor
    const low = Math.min(B.L_Foot.getWorldPosition(v).y, B.R_Foot.getWorldPosition(w).y);
    const s = root.getWorldScale(w).y;
    const want = lift - ((low - root.getWorldPosition(v).y) / s - ankle);
    lift += (want - lift) * 0.5;
    obj.position.y = lift;
    obj.updateMatrixWorld(true);
  };
  const hand = () => B.R_Hand.getWorldPosition(new THREE.Vector3()).lerp(B.R_Finger2.getWorldPosition(v), 0.75);
  return { obj, B, meshes, mats, tone, follow, hand };
};
