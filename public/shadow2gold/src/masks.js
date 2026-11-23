import * as THREE from 'three';
import { WHITE, BLACK } from './texts.js';
import { varnishEnv } from './dressing.js';

/*
 * The hall of masks (PLAN.md 10.4), on both walls of one stretch of the corridor. The right wall
 * has two sconces: the white masks hang in their light, with a few black ones in the dark at its
 * ends. The left wall has no light of its own and is all black masks, found by bringing your
 * flask near. How many there are is decided by the lists in texts.js (12 white, 20 black).
 *
 * A mask you pick leaves the wall and comes to the middle of the corridor, straight before your
 * eye (main.js stands you in the middle, looking down the corridor, and holds the view still while
 * it is out). A white mask goes back by itself. A black mask you take crumbles to smoke; once you
 * have gone through its shadow it is back on the wall, mended with a gold seam.
 *
 * Each mask is its own mesh (the front of one of the two scanned faces, cut to an oval, from
 * people.faceGeometry). States: wall → picked → coming → held → returning → wall; a black mask
 * taken: held → crumbling → gone → sealing → sealed.
 */

const COLS = 8, DZ = 0.72, ROWS = [1.36, 1.86];
const WHITE_COLS = [1, 2, 3, 4, 5, 6]; // on the right wall, between and beside its sconces; its two end columns are dark
const HELD = 0.62; // metres from the eye
const ease = (k) => k * k * (3 - 2 * k);

const makeMaterial = (black, seed, tint) => {
  const u = { uCrumble: { value: 0 }, uSeam: { value: 0 }, uDim: { value: 1 }, uSeed: { value: seed } };
  const mat = new THREE.MeshPhysicalMaterial(
    black
      ? { color: new THREE.Color(0.012, 0.011, 0.012), roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.32 }
      : { color: new THREE.Color(0.4, 0.375, 0.32).multiply(tint), roughness: 0.36, clearcoat: 0.55, clearcoatRoughness: 0.3 },
  );
  mat.side = THREE.DoubleSide;
  // the glaze and the gold catch the candles (the same candle-lit panorama the varnish and brass reflect)
  mat.envMap = varnishEnv();
  // the lacquer at 0.8 and glossier showed every candle of the panorama as a sharp white dot: it read as noise
  mat.envMapIntensity = black ? 0.35 : 0.5;
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
        // kintsugi: where it broke it is mended with gold. The cracks are the edges of a few large shards
        // (a Voronoi pattern, its lines wandered by noise); some edges stayed whole, so the gold runs in
        // branching lines that end, thick where the gap was wide and thin where it closed.
        vec2 kp = vMaskP.xy * 9.0 + uSeed * 17.0;
        kp += 0.6 * vec2(mn(vec3(vMaskP.xy * 16.0, uSeed * 5.0)) - 0.5, mn(vec3(vMaskP.yx * 16.0, uSeed * 9.0 + 3.0)) - 0.5);
        vec2 ki = floor(kp), kf = fract(kp);
        float d1 = 8.0, d2 = 8.0; vec2 c1 = vec2(0.0), c2 = vec2(0.0);
        for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
          vec2 g = vec2(float(i), float(j));
          vec2 o = vec2(mh(vec3(ki + g, 1.0)), mh(vec3(ki + g, 2.0)));
          vec2 r = g + o - kf; float d = dot(r, r);
          if (d < d1) { d2 = d1; c2 = c1; d1 = d; c1 = ki + g; } else if (d < d2) { d2 = d; c2 = ki + g; }
        }
        float edge = sqrt(d2) - sqrt(d1);
        // whether this pair of shards broke apart at all
        float broke = step(0.55, mh(vec3(c1 + c2 * 1.7, 4.0 + uSeed)));
        float wid = 0.035 + 0.05 * mn(vec3(vMaskP.xy * 70.0, uSeed));
        float seamK = smoothstep(wid, wid * 0.45, edge) * broke * step(vOval, 0.97);
        seamK *= uSeam;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.95, 0.56, 0.12), seamK);
        // the back of a mask is bare, dark clay
        if (!gl_FrontFacing) { diffuseColor.rgb = vec3(0.03, 0.022, 0.015); seamK = 0.0; }`,
      )
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.22, seamK);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.55, seamK);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0, 0.5, 0.06) * seamK * 0.12;')
      // held up close to the flask a mask would burn out: its light is turned down as it comes
      .replace('#include <opaque_fragment>', 'outgoingLight *= uDim;\n#include <opaque_fragment>');
  };
  mat.customProgramCacheKey = () => 'st2g-mask-v3';
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

/*
 * Every mask its own face. Only two faces were scanned, so each mask is one of them reshaped: wider or
 * narrower, longer or shorter, the nose, the brows, the mouth's corners, the cheeks and the jaw moved,
 * a little lopsided. A black mask wears the look of what it hides (anger's brows drawn down, grief's
 * raised in the middle, shame's eyes sunk); a white one, the face it shows (the polite smile, the
 * raised brows of the clever one). Sizes in metres on the squared-up face: nose tip near (0, 0.006),
 * eyes near (±0.032, 0.04), mouth corners near (±0.025, -0.035), chin near -0.07.
 */
const LOOKS = {
  anger: { brow: -1, mouth: -0.7, jaw: 0.6, squint: 0.6 },
  abandonment: { brow: 1, mouth: -0.8, cheek: -0.6, deep: 0.5 },
  confrontation: { brow: -0.6, mouth: -0.3, jaw: 0.8, nose: 0.4 },
  judgement: { brow: 0.5, lopsided: 1, mouth: -0.4, long: 0.6 },
  envy: { squint: 1, lopsided: 0.6, mouth: -0.3, cheek: -0.5 },
  shame: { deep: 1, brow: 0.6, mouth: -0.5, long: 0.4 },
  need: { brow: 0.8, mouth: 0.1, cheek: -0.8, deep: 0.6 },
  control: { mouth: -0.2, jaw: 0.9, squint: 0.4, nose: 0.6 },
  // white: the faces shown
  nice: { mouth: 1, brow: 0.4, cheek: 0.8 }, strong: { jaw: 1, brow: -0.3, mouth: 0 }, clever: { brow: 0.9, lopsided: 0.5, mouth: 0.4 },
  helper: { mouth: 0.8, brow: 0.7, cheek: 0.5 }, goodchild: { mouth: 0.6, brow: 0.8, cheek: 0.9, long: -0.6 }, joker: { mouth: 1.2, cheek: 1, squint: 0.5, lopsided: 0.6 },
  needsnothing: { mouth: 0, jaw: 0.4, deep: 0.3 }, fine: { mouth: 0.5, brow: 0.2 }, perfect: { mouth: 0.3, nose: -0.4, long: 0.3 },
  busy: { brow: 0.5, squint: 0.3, mouth: 0.2 }, rebel: { brow: -0.7, lopsided: 0.8, jaw: 0.5 }, above: { brow: 0.3, nose: 0.5, long: 0.8, mouth: -0.1 },
};
const g2 = (x, y, cx, cy, sx, sy) => Math.exp(-((x - cx) ** 2) / (2 * sx * sx) - ((y - cy) ** 2) / (2 * sy * sy));
const varyFace = (base, look, rnd) => {
  const geo = base.clone();
  const p = geo.attributes.position;
  const j = (a) => (rnd() - 0.5) * 2 * a; // a little of everything on every face, so no two are alike
  const L = { brow: 0, mouth: 0, jaw: 0, squint: 0, cheek: 0, deep: 0, nose: 0, long: 0, lopsided: 0, ...look };
  const k = {
    wide: 1 + j(0.09), tall: 1 + j(0.06) + 0.06 * L.long,
    brow: 0.0055 * L.brow + j(0.002), mouth: 0.005 * L.mouth + j(0.002), jaw: 0.1 * L.jaw + j(0.06),
    squint: 0.004 * L.squint + j(0.0015), cheek: 0.005 * L.cheek + j(0.003), deep: 0.005 * L.deep + j(0.002),
    nose: 0.007 * L.nose + j(0.005), noseLen: j(0.006), side: (rnd() < 0.5 ? -1 : 1) * (0.4 * L.lopsided + j(0.3)),
  };
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const ax = Math.abs(x);
    const sideK = 1 + 0.5 * k.side * Math.sign(x); // one side moves more than the other
    // the brows: + raises the inner ends (grief, surprise), - draws them down and in (anger)
    const browW = g2(ax, y, 0.022, 0.058, 0.016, 0.01);
    y += k.brow * browW * sideK;
    z -= Math.abs(k.brow) * 0.25 * browW;
    // the eyes narrowed: the lids and cheeks below them rise
    const lid = g2(ax, y, 0.032, 0.032, 0.014, 0.01);
    y += k.squint * lid * sideK;
    z += k.squint * 0.5 * lid;
    // sunken eyes
    z -= k.deep * g2(ax, y, 0.032, 0.04, 0.014, 0.012);
    // the mouth's corners up (a smile, the cheeks lifting with it) or down
    const corner = g2(ax, y, 0.026, -0.035, 0.012, 0.01);
    y += k.mouth * corner * sideK;
    z += Math.max(0, k.mouth) * 0.6 * g2(ax, y, 0.04, -0.012, 0.016, 0.014);
    // the cheeks full or hollow
    z += k.cheek * g2(ax, y, 0.046, -0.008, 0.016, 0.018);
    // the nose: larger or smaller, longer or shorter
    const nose = g2(x, y, 0, 0.012, 0.011, 0.022);
    z += k.nose * nose;
    y -= k.noseLen * g2(x, y, 0, 0.0, 0.01, 0.012);
    // the jaw wider or narrower, below the mouth
    const below = Math.min(1, Math.max(0, (-0.02 - y) / 0.05));
    x *= 1 + k.jaw * below;
    // the whole face wider or narrower, longer or shorter (about the nose)
    x *= k.wide;
    y = 0.006 + (y - 0.006) * k.tall;
    p.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
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

  // Right wall (x = +wallX, facing -X): white where it is lit, black in its two dark end columns.
  // Left wall (x = -wallX, facing +X): black. The lists are dealt out in order; if texts.js has
  // fewer than there are places the last places stay empty, if more the extra ones are not hung.
  const whites = [...WHITE], blacks = [...BLACK];
  const list = [];
  // Each mask's shadow on the wall: a soft dark patch a little below it, as if lit from above (the
  // sconces and chandeliers). Real shadows from those candles halved the frame rate (2026-11-23).
  // It fades as the mask leaves the wall and comes back with it.
  const shadeTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.5, 'rgba(0,0,0,0.6)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const SHADE = 0.6;
  const shadeGeo = new THREE.PlaneGeometry(0.23, 0.3);
  const e = new THREE.Euler();
  for (const side of [1, -1])
    for (let c = 0; c < COLS; c++)
      for (let r = 0; r < ROWS.length; r++) {
        const black = side < 0 || !WHITE_COLS.includes(c);
        const def = black ? blacks.shift() : whites.shift();
        if (!def) continue;
        const age = rnd();
        const tint = new THREE.Color(1, 1 - 0.1 * age, 1 - 0.28 * age).multiplyScalar(0.8 + 0.3 * rnd());
        const { mat, u } = makeMaterial(black, rnd(), tint);
        const mesh = new THREE.Mesh(varyFace(geos[(c + r) % 2], LOOKS[def.kind ?? def.id] ?? {}, rnd), mat);
        mesh.castShadow = mesh.receiveShadow = true;
        const pos = new THREE.Vector3(side * (wallX - 0.035 - rnd() * 0.012), ROWS[r] + (rnd() - 0.5) * 0.09, area.z0 - 0.35 - c * DZ + (rnd() - 0.5) * 0.1);
        // facing out from its wall, each hung a little crooked
        e.set((rnd() - 0.5) * 0.16, -side * (Math.PI / 2) + (rnd() - 0.5) * 0.22, (rnd() - 0.5) * 0.2, 'YXZ');
        const quat = new THREE.Quaternion().setFromEuler(e);
        const scale = 1.16 + (rnd() - 0.5) * 0.12;
        mesh.position.copy(pos);
        mesh.quaternion.copy(quat);
        mesh.scale.setScalar(scale);
        group.add(mesh);
        const shade = new THREE.Mesh(shadeGeo, new THREE.MeshBasicMaterial({ map: shadeTex, color: 0x000000, transparent: true, opacity: SHADE, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
        shade.position.set(side * (wallX - 0.004), pos.y - 0.075, pos.z);
        shade.rotation.y = -side * (Math.PI / 2);
        shade.scale.setScalar(scale);
        shade.renderOrder = -1;
        group.add(shade);
        list.push({ id: def.id, def, black, side, mesh, shade, u, home: { pos, quat }, state: 'wall', k: 0, stir: 0, from: { pos: new THREE.Vector3(), quat: new THREE.Quaternion() }, onHeld: null });
      }

  const _t = new THREE.Vector3(), _f = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4();
  /** The turn that makes a mask at `pos` look straight at the eye (it hangs off-centre, so this is not the camera's own turn). */
  const facingEye = (camera, pos, out) => {
    camera.matrixWorld.extractBasis(_r, _u, _f);
    return out.setFromRotationMatrix(_m.lookAt(camera.position, pos, _u));
  };
  /**
   * Where a held mask floats: straight before the eye. main.js has stood you in the middle of the
   * corridor looking along it, so this is the middle of the corridor too, clear of both walls.
   * (On a tall narrow screen it sits a little high, to leave room for its text underneath.)
   */
  const heldTarget = (camera, out) => {
    camera.matrixWorld.extractBasis(_r, _u, _f); // _f is the camera's +Z: backwards
    const narrow = innerWidth < 760 || innerWidth < innerHeight;
    return out.copy(camera.position).addScaledVector(_f, -HELD).addScaledVector(_u, narrow ? 0.1 : 0);
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
      // its shadow on the wall stays only while it hangs there
      m.shade.material.opacity = SHADE * Math.max(0, 1 - o.position.distanceTo(m.home.pos) / 0.12) * (m.state === 'crumbling' || m.state === 'gone' ? 0 : 1);
      if (m.state === 'coming') {
        m.k = Math.min(1, m.k + dt / 1.15);
        const k = ease(m.k);
        heldTarget(camera, _t);
        o.position.lerpVectors(m.from.pos, _t, k);
        // it lifts off the wall before it turns: out into the corridor first
        o.position.x -= m.side * Math.sin(Math.PI * k) * 0.08;
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
        o.position.x -= m.side * Math.sin(Math.PI * k) * 0.06;
        o.quaternion.slerpQuaternions(m.from.quat, m.home.quat, k);
        m.u.uDim.value = 0.42 + 0.58 * k;
        if (m.k >= 1) m.state = 'wall';
      } else if (m.state === 'sealing') {
        m.k = Math.min(1, m.k + dt / 2.2);
        m.u.uCrumble.value = 1 - m.k;
        if (m.k >= 1) m.state = 'sealed';
      }
      // stirred (a white mask that hides it was read): it rocks on its nail for a few seconds
      if (m.stir > 0 && m.state === 'wall') {
        m.stir = Math.max(0, m.stir - dt);
        const a = 0.22 * Math.min(1, m.stir / 2) * Math.sin(t * 9) * Math.sin(Math.min(1, (STIR - m.stir) * 2) * Math.PI * 0.5);
        o.quaternion.copy(m.home.quat).multiply(_q.setFromAxisAngle(_z, a));
      }
    }
  };
  /** Makes a black mask on the wall move, so the eye finds it. */
  const STIR = 7, _z = new THREE.Vector3(0, 0, 1);
  const stir = (id) => {
    const m = list.find((x) => x.id === id);
    if (!m || m.state !== 'wall') return false;
    m.stir = STIR;
    return true;
  };

  /**
   * The mask the eye is on: on a wall, within `reach`, nearest the middle of the view. From the
   * middle of the corridor both walls are in reach. How squarely you must look depends on how far
   * it is: a mask at arm's length fills more of the view than one across the corridor.
   */
  const lookedAt = (camera, reach = 2.8) => {
    let best = null, bestA = 1e9;
    camera.getWorldDirection(_f);
    for (const m of list) {
      if (m.state !== 'wall') continue;
      _t.copy(m.mesh.position).sub(camera.position);
      const d = _t.length();
      if (d > reach) continue;
      const a = Math.acos(Math.min(1, _t.dot(_f) / d));
      if (a < Math.max(0.13, 0.17 / d) && a < bestA) (bestA = a), (best = m);
    }
    return best;
  };

  const byId = (id) => list.find((m) => m.id === id);
  /** A mask that is off the wall and in front of you (or on its way there). */
  const held = () => list.find((m) => m.state === 'picked' || m.state === 'coming' || m.state === 'held' || m.state === 'crumbling');
  return { group, list, update, comeTo, sendBack, crumble, seal, stir, lookedAt, byId, held, meshes: list.map((m) => m.mesh) };
};
