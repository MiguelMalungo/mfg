import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/*
 * The hand (PLAN.md 10.3). It is not on screen while you walk. When something you can pick is
 * within reach and you are looking at it, the hand rises from the bottom of the view toward it,
 * open, palm toward you, index finger leading (trailer/favorites/i10, i24a, i24b). On a pick it
 * closes, then withdraws.
 *
 * The models are scanned hands rigged in Blender (assets/hands/CREDITS.md): 16 bones, and one
 * animation that holds four poses (rest, reach, touch, hold) which are blended here.
 * Model frame: wrist at the origin, fingers along +Y, palm facing +Z, thumb toward +X.
 */

const LEVEL = 1.45; // how brightly the hand is lit, whatever its distance from the flask (tuned by eye against i24a)
const POSE_TIMES = { rest: 0, reach: 10 / 24, touch: 20 / 24, hold: 30 / 24 - 1e-3 };
const ss = (a, b, x) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

export const makeHand = async (camera, who) => {
  const gltf = await new GLTFLoader().loadAsync(`./assets/hands/${who}.glb`);
  const model = gltf.scene;
  let mesh = null;
  const bones = [];
  model.traverse((o) => {
    if (o.isSkinnedMesh) mesh = o;
    if (o.isBone) bones.push(o);
  });
  mesh.frustumCulled = false;
  mesh.castShadow = true; // the flask throws the hand's shadow on the wall it reaches for
  mesh.receiveShadow = true;

  /* The skin: dark and sooty, as in the reference frames. The scan's creases are in the normal
     map; the second map darkens them further (soot settles in the lines of a hand). */
  const occ = new THREE.TextureLoader().load(`./assets/hands/${who}-occ.jpg`);
  occ.flipY = false;
  const src = mesh.material;
  // the geometry keeps the scan's own origin; the rig node carries it to the wrist
  let wristY = 0;
  model.traverse((o) => o.name.endsWith('_rig') && (wristY = -o.position.y));
  const u = { occMap: { value: occ }, uGain: { value: 0.3 }, uCap: { value: 0.3 }, uWristY: { value: wristY } };
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.26, 0.175, 0.12),
    normalMap: src.normalMap,
    normalScale: new THREE.Vector2(2.0, 2.0),
    roughness: 0.6,
    metalness: 0,
  });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vRestY; uniform float uWristY;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvRestY = position.y;\n// the sleeve stands a little proud of the wrist\ntransformed += objectNormal * 0.007 * smoothstep(0.0, -0.012, position.y - uWristY);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D occMap; uniform float uGain; uniform float uCap; uniform float uWristY; varying float vRestY;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec3 oc = texture2D(occMap, vNormalMapUv).rgb;
        // creases (green: dark in the lines) and the larger hollows between the fingers (red)
        float crease = smoothstep(0.28, 0.56, oc.g);
        float sootK = mix(0.22, 1.0, crease) * mix(0.45, 1.0, oc.r);
        // below the wrist the scan ends: a plain forearm was added in Blender, and here it is a dark sleeve
        float forearm = smoothstep(0.003, -0.004, vRestY - uWristY);
        sootK = mix(sootK, 0.07, forearm);
        diffuseColor.rgb *= sootK;`,
      )
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(mix(0.82, roughnessFactor, crease), 1.0, forearm);')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = normalize(mix(normal, nonPerturbedNormal, forearm));')
      // the flask can be a hand's breadth away. update() sets uGain from how strong its light is at the palm, so the
      // skin is lit to the same dark level however near the flask is, and keeps its shading; uCap only tames glints
      .replace('#include <opaque_fragment>', 'outgoingLight *= uGain; outgoingLight = outgoingLight / (1.0 + outgoingLight / uCap);\n#include <opaque_fragment>');
  };
  mat.customProgramCacheKey = () => 'st2g-hand-v1';
  mesh.material = mat;

  /* The four poses, read once from the animation. */
  const mixer = new THREE.AnimationMixer(model);
  const action = mixer.clipAction(gltf.animations[0]);
  action.play();
  const P = {};
  for (const [name, time] of Object.entries(POSE_TIMES)) {
    mixer.setTime(time);
    P[name] = bones.map((b) => b.quaternion.clone());
  }
  action.stop();
  mixer.uncacheRoot(model);
  const _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion();
  /** Blends rest→reach by `open`, then reach→touch→hold by `grip` (0..2). */
  const pose = (open, grip) => {
    const g1 = Math.min(1, grip), g2 = Math.max(0, grip - 1);
    for (let i = 0; i < bones.length; i++) {
      _qa.slerpQuaternions(P.rest[i], P.reach[i], open);
      _qb.slerpQuaternions(P.touch[i], P.hold[i], g2);
      bones[i].quaternion.slerpQuaternions(_qa, _qb, g1);
    }
  };

  // how far the index fingertip is from the wrist, to know where the wrist must be for the tip to arrive
  model.updateMatrixWorld(true);
  const tipBone = bones.find((b) => b.name === 'index3');
  const reachLen = tipBone.getWorldPosition(new THREE.Vector3()).length() + 0.022;

  const pivot = new THREE.Group(); // the wrist, in the camera's space
  pivot.add(model);
  pivot.visible = false;
  camera.add(pivot);

  const st = { k: 0, grip: 0, phase: 'down', gt: 0, aim: new THREE.Vector2(), has: false };
  const _t = new THREE.Vector3(), F = new THREE.Vector3(), N = new THREE.Vector3(), X = new THREE.Vector3(), tip = new THREE.Vector3(), basis = new THREE.Matrix4();
  const tanHalf = () => Math.tan((camera.fov * Math.PI) / 360);

  /**
   * Every frame. target: a world position to reach toward, or null. Rises when there is one,
   * sinks when there is not; a grab plays through to its end either way.
   */
  const _l = new THREE.Vector3(), _p = new THREE.Vector3();
  const palmBone = bones.find((b) => b.name === 'middle1');
  const update = (dt, t, target, light) => {
    if (target) {
      _t.copy(target).applyMatrix4(camera.matrixWorldInverse);
      const z = Math.max(0.2, -_t.z);
      const ax = _t.x / z, ay = _t.y / z;
      if (!st.has) st.aim.set(ax, ay);
      st.aim.x += (ax - st.aim.x) * (1 - Math.exp(-dt * 9));
      st.aim.y += (ay - st.aim.y) * (1 - Math.exp(-dt * 9));
      st.has = true;
    }
    if (st.phase === 'grab') {
      st.gt += dt;
      // touch, close, hold a moment, then take it away
      st.grip = ss(0, 0.16, st.gt) + ss(0.16, 0.5, st.gt);
      if (st.gt > 0.85) st.phase = 'down';
    }
    const want = st.phase === 'grab' ? 1 : st.phase === 'down' ? 0 : target ? 1 : 0;
    st.k += Math.sign(want - st.k) * Math.min(Math.abs(want - st.k), dt / (want > st.k ? 0.42 : 0.5));
    if (st.phase === 'down' && st.k <= 0.001) {
      st.phase = 'idle';
      st.grip = 0;
      st.has = false;
    }
    if (st.phase === 'idle' && !target) st.has = false;
    pivot.visible = st.k > 0.002;
    if (!pivot.visible) return;
    // on a tall, narrow screen the flask sits right beside the hand, and the shadow it would throw covers the wall
    mesh.castShadow = camera.aspect > 1;
    const k = ss(0, 1, st.k);
    const h = tanHalf(), a = camera.aspect;
    // the fingertip stops short of the thing, a little under it, so the thing itself stays in view
    const D = 0.52;
    const sx = THREE.MathUtils.clamp(st.aim.x * 0.72 + 0.02, -h * a * 0.7, h * a * 0.7);
    const sy = THREE.MathUtils.clamp(st.aim.y * 0.72 - 0.34 * h, -h * 0.75, h * 0.15);
    const thrust = st.phase === 'grab' ? 0.03 * ss(0, 0.16, st.gt) * (1 - ss(0.5, 0.85, st.gt)) : 0;
    tip.set(sx * D, sy * D, -D - thrust);
    // the fingers point up and away, leaning toward the thing; lower and flatter while it is still rising
    F.set(st.aim.x * 0.3 - 0.05, 0.76 - 0.3 * (1 - k), -0.66).normalize();
    // the palm is turned toward you and a little up, the thumb out to the right
    N.set(0.3, 0.42, 1).addScaledVector(F, -N.dot(F)).normalize();
    X.crossVectors(F, N);
    basis.makeBasis(X, F, N);
    pivot.quaternion.setFromRotationMatrix(basis);
    pivot.position.copy(tip).addScaledVector(F, -reachLen);
    pivot.position.y -= (1 - k) * 0.34;
    pivot.position.z += (1 - k) * 0.06;
    // alive: the smallest tremor of a held-out hand
    pivot.position.x += 0.0016 * Math.sin(t * 2.3) * k;
    pivot.position.y += 0.0022 * Math.sin(t * 1.7 + 1) * k;
    pose(k, st.grip);
    if (light) {
      // how strong the flask's light is where the palm is (three.js: intensity / distance^decay)
      pivot.updateMatrixWorld(true);
      const d = Math.max(0.06, light.getWorldPosition(_l).distanceTo(palmBone.getWorldPosition(_p)));
      const E = light.intensity / Math.pow(d, light.decay);
      u.uGain.value = Math.min(1, LEVEL / Math.max(E, 1e-3));
    }
  };

  /** Closes on the thing. Resolves nothing: the caller starts what happens next on its own clock. */
  const grab = () => {
    if (st.phase === 'grab') return;
    st.phase = 'grab';
    st.gt = 0;
  };

  return { pivot, model, mesh, mat, bones, u, st, P, update, grab, pose, reachLen, get busy() { return st.phase === 'grab' || st.phase === 'down'; } };
};
