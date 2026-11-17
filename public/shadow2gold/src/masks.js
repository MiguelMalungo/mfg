import * as THREE from 'three';
import { WHITE, BLACK } from './texts.js';

/*
 * The hall of masks (PLAN.md 10.4): sixteen masks on the right wall, eight white in the light of
 * two sconces, eight black in the dark between and beyond them.
 *
 * A mask you pick leaves the wall, turns to face you and stops about 0.6 m from your eye. A white
 * mask goes back by itself. A black mask you take crumbles to smoke; once you have gone through
 * its shadow it is back on the wall, mended with a gold seam.
 *
 * Each mask is its own mesh (the front of one of the two scanned faces, cut to an oval, from
 * people.faceGeometry). States: wall → coming → held → returning → wall; a black mask taken:
 * held → crumbling → gone → sealing → sealed.
 */

const COLS = 8, DZ = 0.72, ROWS = [1.36, 1.86];
const WHITE_COLS = [1, 2, 5, 6]; // either side of each sconce; the rest of the wall is dark
const HELD = 0.6; // metres from the eye
const ease = (k) => k * k * (3 - 2 * k);

const makeMaterial = (black, seed, tint) => {
  const u = { uCrumble: { value: 0 }, uSeam: { value: 0 }, uDim: { value: 1 }, uSeed: { value: seed } };
  const mat = new THREE.MeshPhysicalMaterial(
    black
      ? { color: new THREE.Color(0.012, 0.011, 0.012), roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.12 }
      : { color: new THREE.Color(0.4, 0.375, 0.32).multiply(tint), roughness: 0.36, clearcoat: 0.55, clearcoatRoughness: 0.3 },
  );
  mat.side = THREE.DoubleSide;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float oval; varying float vOval; varying vec3 vMaskP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvOval = oval; vMaskP = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying float vOval; varying vec3 vMaskP;
        uniform float uCrumble; uniform float uSeam; uniform float uDim; uniform float uSeed;
        float mh(vec3 p) { return fract(sin(dot(floor(p), vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
        float mn(vec3 p) { vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(mh(p), mh(p + vec3(1, 0, 0)), f.x), mix(mh(p + vec3(0, 1, 0)), mh(p + vec3(1, 1, 0)), f.x), f.y),
                     mix(mix(mh(p + vec3(0, 0, 1)), mh(p + vec3(1, 0, 1)), f.x), mix(mh(p + vec3(0, 1, 1)), mh(p + vec3(1, 1, 1)), f.x), f.y), f.z); }`,
      )
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        if (vOval > 1.0) discard;
        // crumbling: it goes in flakes, from the rim inward
        float flake = 0.5 * mn(vMaskP * 55.0 + uSeed * 31.0) + 0.3 * mn(vMaskP * 190.0 + uSeed * 7.0) + 0.2 * (1.0 - vOval);
        if (uCrumble > 0.0 && flake < uCrumble * 1.08 - 0.04) discard;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        // dust settled in the hollows and along the rim; fine crazing in the glaze
        float rim = smoothstep(0.7, 1.0, vOval);
        float hollow = smoothstep(0.03, 0.0, vMaskP.z);
        float craze = mh(vMaskP * 600.0) * 0.12;
        diffuseColor.rgb *= (1.0 - 0.5 * rim) * (1.0 - 0.45 * hollow) * (0.9 + craze);
        // the gold seam: where it broke, it is mended with gold (a crack down the face, and one branch)
        float sx = vMaskP.x - (0.012 * sin(vMaskP.y * 38.0 + uSeed * 6.0) + 0.006 * sin(vMaskP.y * 97.0 + uSeed * 11.0) + 0.016 * (uSeed - 0.5));
        float seamK = smoothstep(0.0042, 0.0018, abs(sx));
        float sb = vMaskP.y - (0.015 + 0.55 * vMaskP.x + 0.005 * sin(vMaskP.x * 120.0 + uSeed * 20.0));
        seamK = max(seamK, smoothstep(0.0032, 0.0013, abs(sb)) * step(0.0, sx) * step(sx, 0.055));
        seamK *= uSeam;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.8, 0.45, 0.04), seamK);
        // the back of a mask is bare, dark clay
        if (!gl_FrontFacing) { diffuseColor.rgb = vec3(0.03, 0.022, 0.015); seamK = 0.0; }`,
      )
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.28, seamK);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 1.0, seamK);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0, 0.52, 0.06) * seamK * 0.12;')
      // held up close to the flask a mask would burn out: its light is turned down as it comes
      .replace('#include <opaque_fragment>', 'outgoingLight *= uDim;\n#include <opaque_fragment>');
  };
  mat.customProgramCacheKey = () => 'st2g-mask-v2';
  return { mat, u };
};

/**
 * Turns a face so that it looks straight out along +Z. The faces are cut in a frame taken from the
 * scan's eye bones, and Sophia's comes out turned to one side; on a wall of hundreds that did not
 * show, held up before the eye it does. The way a face looks is the mean of its normals.
 */
const squareUp = (geo) => {
  const n = geo.attributes.normal, mean = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i < n.count; i++) mean.add(v.fromBufferAttribute(n, i));
  geo.rotateY(-Math.atan2(mean.x, mean.z));
  mean.set(0, 0, 0);
  for (let i = 0; i < n.count; i++) mean.add(v.fromBufferAttribute(n, i));
  geo.rotateX(Math.atan2(mean.y, mean.z) * 0.6); // most of the tilt, not all: a face looks a little down its nose
  geo.computeBoundingSphere();
  return geo;
};

export const buildMaskHall = (scene, people, area, wallX) => {
  const geos = [people.faceGeometry(people.src.sophiaFBX), people.faceGeometry(people.src.nathanFBX)].map(squareUp);
  const group = new THREE.Group();
  scene.add(group);
  // seeded, so the wall is the same every time
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  // where each text hangs: the three shadows that are built are in the middle of the dark stretch
  const blackAt = { '3,1': 'anger', '4,1': 'abandonment', '3,0': 'confrontation', '4,0': 'judgement', '0,1': 'envy', '0,0': 'shame', '7,1': 'need', '7,0': 'control' };
  const whites = [...WHITE];
  const list = [];
  const e = new THREE.Euler();
  for (let c = 0; c < COLS; c++)
    for (let r = 0; r < ROWS.length; r++) {
      const black = !WHITE_COLS.includes(c);
      const def = black ? BLACK.find((b) => b.id === blackAt[`${c},${r}`]) : whites.shift();
      const age = rnd();
      const tint = new THREE.Color(1, 1 - 0.1 * age, 1 - 0.28 * age).multiplyScalar(0.8 + 0.3 * rnd());
      const { mat, u } = makeMaterial(black, rnd(), tint);
      const mesh = new THREE.Mesh(geos[(c + r) % 2], mat);
      mesh.castShadow = mesh.receiveShadow = true;
      const pos = new THREE.Vector3(wallX - 0.02 - rnd() * 0.012, ROWS[r] + (rnd() - 0.5) * 0.09, area.z0 - 0.35 - c * DZ + (rnd() - 0.5) * 0.1);
      // facing out from the wall (-X), each hung a little crooked
      e.set((rnd() - 0.5) * 0.16, -Math.PI / 2 + (rnd() - 0.5) * 0.22, (rnd() - 0.5) * 0.2, 'YXZ');
      const quat = new THREE.Quaternion().setFromEuler(e);
      const scale = 1.16 + (rnd() - 0.5) * 0.12;
      mesh.position.copy(pos);
      mesh.quaternion.copy(quat);
      mesh.scale.setScalar(scale);
      group.add(mesh);
      list.push({ id: def.id, def, black, mesh, u, home: { pos, quat }, state: 'wall', k: 0, from: { pos: new THREE.Vector3(), quat: new THREE.Quaternion() }, onHeld: null });
    }

  const _t = new THREE.Vector3(), _f = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4();
  /** The turn that makes a mask at `pos` look straight at the eye (it hangs off-centre, so this is not the camera's own turn). */
  const facingEye = (camera, pos, out) => {
    camera.matrixWorld.extractBasis(_r, _u, _f);
    return out.setFromRotationMatrix(_m.lookAt(camera.position, pos, _u));
  };
  /** Where a held mask floats: in front of the eye, a little to the left so its text has room. */
  const heldTarget = (camera, out) => {
    camera.matrixWorld.extractBasis(_r, _u, _f); // _f is the camera's +Z: backwards
    const narrow = innerWidth < 760 || innerWidth < innerHeight;
    return out.copy(camera.position).addScaledVector(_f, -HELD).addScaledVector(_r, narrow ? 0 : -0.12).addScaledVector(_u, narrow ? 0.1 : -0.01);
  };

  const start = (m, state) => {
    m.state = state;
    m.k = 0;
    m.from.pos.copy(m.mesh.position);
    m.from.quat.copy(m.mesh.quaternion);
  };
  /** The mask leaves the wall and comes to the eye; onHeld() when it has arrived. */
  const comeTo = (m, onHeld) => {
    m.onHeld = onHeld;
    start(m, 'coming');
  };
  const sendBack = (m) => start(m, 'returning');
  /** A black mask taken: it crumbles where it floats. onGone() when nothing is left. */
  const crumble = (m, onGone) => {
    m.onGone = onGone;
    start(m, 'crumbling');
  };
  /** Faced: it is back on the wall, whole, with its gold seam. */
  const seal = (m, instant = false) => {
    m.mesh.position.copy(m.home.pos);
    m.mesh.quaternion.copy(m.home.quat);
    m.mesh.visible = true;
    m.u.uSeam.value = 1;
    m.u.uDim.value = 1;
    m.u.uCrumble.value = instant ? 0 : 1;
    m.state = instant ? 'sealed' : 'sealing';
    m.k = 0;
  };

  const update = (dt, t, camera) => {
    for (const m of list) {
      const o = m.mesh;
      if (m.state === 'coming') {
        m.k = Math.min(1, m.k + dt / 1.15);
        const k = ease(m.k);
        heldTarget(camera, _t);
        o.position.lerpVectors(m.from.pos, _t, k);
        // it lifts off the wall before it turns: out into the corridor first
        o.position.x -= Math.sin(Math.PI * k) * 0.08;
        o.quaternion.slerpQuaternions(m.from.quat, facingEye(camera, _t, _q), k);
        m.u.uDim.value = 1 - 0.58 * k;
        if (m.k >= 1) {
          m.state = 'held';
          const f = m.onHeld;
          m.onHeld = null;
          f?.();
        }
      } else if (m.state === 'held' || m.state === 'crumbling') {
        // it stays before the eye, a beat late, and breathes a little
        heldTarget(camera, _t);
        _t.y += 0.004 * Math.sin(t * 1.3);
        o.position.lerp(_t, 1 - Math.exp(-dt * 9));
        o.quaternion.slerp(facingEye(camera, o.position, _q), 1 - Math.exp(-dt * 7));
        if (m.state === 'crumbling') {
          m.k = Math.min(1, m.k + dt / 1.5);
          m.u.uCrumble.value = m.k;
          if (m.k >= 1) {
            m.state = 'gone';
            o.visible = false;
            const f = m.onGone;
            m.onGone = null;
            f?.();
          }
        }
      } else if (m.state === 'returning') {
        m.k = Math.min(1, m.k + dt / 1.2);
        const k = ease(m.k);
        o.position.lerpVectors(m.from.pos, m.home.pos, k);
        o.position.x -= Math.sin(Math.PI * k) * 0.06;
        o.quaternion.slerpQuaternions(m.from.quat, m.home.quat, k);
        m.u.uDim.value = 0.42 + 0.58 * k;
        if (m.k >= 1) m.state = 'wall';
      } else if (m.state === 'sealing') {
        m.k = Math.min(1, m.k + dt / 2.2);
        m.u.uCrumble.value = 1 - m.k;
        if (m.k >= 1) m.state = 'sealed';
      }
    }
  };

  /** The mask the eye is on: on the wall, within reach, nearest the middle of the view. */
  const lookedAt = (camera, reach = 1.5, cone = 0.2) => {
    let best = null, bestA = cone;
    camera.getWorldDirection(_f);
    for (const m of list) {
      if (m.state !== 'wall') continue;
      _t.copy(m.mesh.position).sub(camera.position);
      const d = _t.length();
      if (d > reach) continue;
      const a = Math.acos(Math.min(1, _t.dot(_f) / d));
      if (a < bestA) (bestA = a), (best = m);
    }
    return best;
  };

  const byId = (id) => list.find((m) => m.id === id);
  /** A mask that is off the wall and in front of you (or on its way there). */
  const held = () => list.find((m) => m.state === 'picked' || m.state === 'coming' || m.state === 'held' || m.state === 'crumbling');
  return { group, list, update, comeTo, sendBack, crumble, seal, lookedAt, byId, held, meshes: list.map((m) => m.mesh) };
};
