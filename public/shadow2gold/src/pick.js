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

const LEVEL = 0.6; // how brightly the hand is lit, whatever its distance from the flask (2026-11-23: lowered twice; it read as pale plaster against the dark, sooty hand of i24a)
const SKIN = new THREE.Color(0.3, 0.245, 0.2); // multiplies the baked colour map: dark, sooty, a little warm
const NORMAL_SCALE = 2.3; // the crackle and the creases deep enough to catch the light (i24a)
const ROUGH = 0.95; // multiplies the baked roughness: a little greasy sheen on the pads
const FLASK_SHARE = 0.3; // of the flask's direct light on the hand
const KEY = 1.9; // the warm light from the flask below, grazing up the fingers, relative to the flask's light at the palm
const RIM = 1.15; // the edge light, same units (raised 2026-11-23: below the house the hand read as a shadow)
const KEY_DIR = new THREE.Vector3(0.42, -0.62, 0.66).normalize(); // view space: from below and to the right, where the flask hangs (i24a, i24b)
const WARM = new THREE.Color(1.0, 0.62, 0.32);
const WRIST_CREASE = { man: 0.022, woman: 0.024 }; // m above the 'hand' bone's head where the forearm starts to go dark
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

  /* The skin (rebuilt 2026-11-17, BUILD.md "The hand"): the colour map carries the soot (in every
     crease, on the fingertips and the finger pads, under the nails) and the normal map the relief
     (cracked dry skin, wrinkles over the knuckles, the palm's creases), both baked in Blender. The
     third map is red = occlusion, green = roughness, blue = how deep in a line the point lies. */
  const occ = new THREE.TextureLoader().load(`./assets/hands/${who}-occ.jpg`);
  occ.flipY = false;
  const src = mesh.material;
  // the wrist's height in the geometry's own space (exports differ in where they put the origin): measured, as the
  // mean rest height of the vertices that the skinning places in the plane of the 'hand' bone's head
  const wristY = (() => {
    model.updateMatrixWorld(true);
    const hb = model.getObjectByName('hand');
    const hp = hb.getWorldPosition(new THREE.Vector3());
    const ax = new THREE.Vector3(0, 1, 0).transformDirection(hb.matrixWorld);
    const pos = mesh.geometry.attributes.position, v = new THREE.Vector3();
    let s = 0, n = 0;
    for (let i = 0; i < pos.count; i++) {
      mesh.getVertexPosition(i, v).applyMatrix4(mesh.matrixWorld);
      if (Math.abs(v.sub(hp).dot(ax)) < 0.003) (s += pos.getY(i)), n++;
    }
    // the skin crease of the wrist lies a little above the bone's head (more so on the man's scan)
    return (n ? s / n : 0) + (WRIST_CREASE[who] ?? 0);
  })();
  const u = {
    occMap: { value: occ },
    uGain: { value: 0.3 }, // scales the light so the skin sits at LEVEL whatever the flask's distance (update())
    uCap: { value: 0.3 }, // soft ceiling that only tames glints
    uWristY: { value: wristY },
    uFlaskK: { value: FLASK_SHARE }, // how much of the flask's own (frontal, flattening) light the hand keeps
    uKeyDir: { value: new THREE.Vector3() }, // view space: a grazing warm light from above, as in i24a
    uKeyCol: { value: new THREE.Color() },
    uRimCol: { value: new THREE.Color() },
  };
  const mat = new THREE.MeshStandardMaterial({
    color: SKIN,
    map: src.map,
    normalMap: src.normalMap,
    normalScale: new THREE.Vector2(NORMAL_SCALE, NORMAL_SCALE),
    roughnessMap: occ, // green
    roughness: ROUGH,
    metalness: 0,
  });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vRestY;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvRestY = position.y;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D occMap; uniform float uGain; uniform float uCap; uniform float uWristY; uniform float uFlaskK; uniform vec3 uKeyDir; uniform vec3 uKeyCol; uniform vec3 uRimCol; varying float vRestY;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec3 oc = texture2D(occMap, vNormalMapUv).rgb;
        // soot in every line: the creases and the crackle go nearly black, as on the hand of i24a
        diffuseColor.rgb *= mix(0.3, 1.0, oc.r) * (1.0 - 0.6 * oc.b);
        // the forearm goes into the dark a few centimetres below the wrist
        float fore = smoothstep(0.0, -0.06, vRestY - uWristY);
        diffuseColor.rgb *= mix(1.0, 0.06, fore);`,
      )
      .replace(
        '#include <lights_fragment_end>',
        `// the flask sits low beside the eye and lights the palm head-on, which flattens it: keep only part of that,
        // add a grazing key from above (the light of i24a) and a soft rim so the hand never reads as a cut-out
        reflectedLight.directDiffuse *= uFlaskK;
        reflectedLight.directSpecular *= uFlaskK;
        {
          IncidentLight key;
          key.direction = uKeyDir;
          key.color = uKeyCol * (1.0 - fore);
          key.visible = true;
          RE_Direct(key, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight);
          float nv = clamp(dot(geometryNormal, geometryViewDir), 0.0, 1.0);
          float rim = pow(1.0 - nv, 3.0) * smoothstep(-0.4, 0.6, dot(geometryNormal, uKeyDir));
          reflectedLight.directDiffuse += uRimCol * rim * mix(1.0, 0.25, oc.b) * (1.0 - fore);
        }
        #include <lights_fragment_end>`,
      )
      // the flask can be a hand's breadth away. update() sets uGain from how strong its light is at the palm, so the
      // skin is lit to the same dark level however near the flask is, and keeps its shading; uCap only tames glints
      .replace('#include <opaque_fragment>', 'outgoingLight *= uGain; outgoingLight = outgoingLight / (1.0 + outgoingLight / uCap);\n#include <opaque_fragment>');
  };
  mat.customProgramCacheKey = () => 'st2g-hand-v3';
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

  const st = { k: 0, grip: 0, phase: 'down', gt: 0, aim: new THREE.Vector2(), has: false, comp: 1 };
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
      // st.comp (set by main.js each frame) undoes most of the picture's grading for each place and the eye's
      // adapting, so the hand stays a hand where the picture is brought down (the stair, the flooded corridor)
      u.uGain.value = Math.min(2.5, (LEVEL * st.comp) / Math.max(E, 1e-3));
      // the key and the rim are in the same units as the flask's light at the palm, so uGain treats them alike
      u.uKeyCol.value.copy(WARM).multiply(light.color).multiplyScalar(E * KEY);
      u.uRimCol.value.copy(WARM).multiply(light.color).multiplyScalar(E * RIM);
    }
    u.uKeyDir.value.copy(KEY_DIR);
  };

  /** Closes on the thing. Resolves nothing: the caller starts what happens next on its own clock. */
  const grab = () => {
    if (st.phase === 'grab') return;
    st.phase = 'grab';
    st.gt = 0;
  };

  return { pivot, model, mesh, mat, bones, u, st, P, update, grab, pose, reachLen, get busy() { return st.phase === 'grab' || st.phase === 'down'; } };
};
