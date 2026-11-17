import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { rng } from './textures.js';

/*
 * Everything made from the two scanned people (Renderpeople "Nathan" and "Sophia", see
 * fourth-way-game/web/BUILD.md for the licence note). Both share one 88-bone skeleton.
 *  - the player's own unseen body, which only casts a shadow
 *  - the Shadow: a too-tall black figure whose edges smoke
 *  - the faces of the masks: the front of each scan's face, cut to an oval (the masks themselves are in masks.js)
 * Scan geometry is in centimetres.
 */

const plain = (name) => name.replace(/^rp_[a-z]+_animated_\d+_[a-z]+_/i, '');

const loadFBX = async (url) => {
  // textures are assigned by hand, so skip the paths baked into the FBX
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((u) => (/\.(jpe?g|png|tga)$/i.test(u) ? 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' : u));
  const fbx = await new FBXLoader(manager).loadAsync(url);
  fbx.traverse((o) => (o.name = plain(o.name)));
  for (const clip of fbx.animations)
    for (const t of clip.tracks) {
      const dot = t.name.lastIndexOf('.');
      t.name = plain(t.name.slice(0, dot)) + t.name.slice(dot);
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
  c.tracks = c.tracks.filter((t) => t.name !== 'root.position' && !t.name.endsWith('.scale') && !(t.name.endsWith('.position') && t.name !== 'hip.position'));
  const hip = c.tracks.find((t) => t.name === 'hip.position');
  if (hip) for (let i = 0; i < hip.values.length; i++) hip.values[i] *= hipScale;
  return c;
};

/** Which way a turn about the body's side axis swings an arm forward (checked against side-view screenshots, 2026-11-17). */
const ARM_SIGN = -1;
const ARM_SWAP = false;
const _q = new THREE.Quaternion();
const _pq = new THREE.Quaternion();
/** Adds a rotation around a world axis to a bone, after the animation has posed it. */
const bendBone = (bone, axis, angle) => {
  if (!bone || angle === 0) return;
  bone.parent.getWorldQuaternion(_pq);
  _q.setFromAxisAngle(axis, angle);
  bone.quaternion.premultiply(_pq.clone().invert().multiply(_q).multiply(_pq));
  bone.updateMatrixWorld(true);
};

const skinnedMesh = (obj) => {
  let mesh = null;
  obj.traverse((o) => o.isSkinnedMesh && (mesh = o));
  return mesh;
};
const boneMap = (obj) => {
  const bones = {};
  obj.traverse((o) => o.isBone && (bones[o.name] = o));
  return bones;
};

export const loadPeople = async () => {
  const [nathanFBX, sophiaFBX] = await Promise.all([loadFBX('./assets/people/nathan/model.fbx'), loadFBX('./assets/people/sophia/model.fbx')]);
  const walkNathan = inPlace(nathanFBX.animations[0], 1);
  /* The player is a man or a woman (PLAN.md 10.3): Nathan's scan or Sophia's. Both share one
     skeleton, so each walks with Nathan's walk and stands with Sophia's idle, rescaled to its own hips. */
  const SCAN = { man: nathanFBX, woman: sophiaFBX };
  const WALK = { man: walkNathan, woman: inPlace(nathanFBX.animations[0], 84.2 / 94.6) };
  const IDLE = { man: inPlace(sophiaFBX.animations[0], 94.6 / 84.2), woman: inPlace(sophiaFBX.animations[0], 1) };

  /** A whole figure from one of the scans with its walk, at metre scale. */
  const makeBody = (material, who = 'man') => {
    const obj = SkeletonUtils.clone(SCAN[who]);
    // Sophia's file is Z-up and the loader tips it with a rotation on its root: reset, or she lies on the floor
    obj.rotation.set(0, 0, 0);
    obj.scale.setScalar(0.01);
    const mesh = skinnedMesh(obj);
    mesh.frustumCulled = false;
    mesh.material = material;
    const mixer = new THREE.AnimationMixer(obj);
    const walk = mixer.clipAction(WALK[who]);
    walk.play();
    return { obj, mesh, mixer, walk, bones: boneMap(obj) };
  };

  /** The player's own body: never drawn, but the vessel's light throws its shadow behind you. */
  const makeBodyCaster = (who = 'man') => {
    const b = makeBody(new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }), who);
    b.mesh.castShadow = true;
    b.mesh.receiveShadow = false;
    b.mesh.renderOrder = -1;
    return b;
  };

  /**
   * The Shadow (2026-11-15 rebuild). Three layers, all driven by one skeleton:
   *  - the core: Nathan's scanned body, flat black, never lit; it only dissolves by `u.fade`
   *  - two smoke shells: the same skinned mesh pushed out along its normals, drawn as soft dark
   *    translucency that is thickest at the silhouette and streams upward, so the outline is smoke
   *    rather than an edge
   *  - wisps: dark particles shed from its limbs that rise and curl away (`wisps.update`)
   * It walks with Nathan's walk and stands with Sophia's idle (the two share one skeleton), and
   * its forearms are drawn a little too long.
   */
  const makeShadowFigure = (scene, glowTex, who = 'man') => {
    const u = { time: { value: 0 }, fade: { value: 0 }, smoke: { value: 1 }, ash: { value: 0 }, rim: { value: new THREE.Color(0.075, 0.022, 0.006) } };
    const core = new THREE.MeshBasicMaterial({ color: 0x000000 });
    core.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float time; uniform float smoke; varying vec3 vObj; varying vec3 vRN; varying vec3 vRV;')
        .replace('#include <project_vertex>', `#include <project_vertex>
          #ifdef USE_SKINNING
          vRN = normalize(normalMatrix * objectNormal);
          #else
          vRN = normalize(normalMatrix * normal);
          #endif
          vRV = -mvPosition.xyz;`)
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          vObj = position;
          // the surface never quite holds still (geometry is in centimetres)
          float sw = sin(position.y * 0.09 - time * 1.3 + position.x * 0.05) * sin(position.z * 0.11 + time * 0.7);
          transformed += normal * (1.0 + 1.6 * sw) * smoke;`,
        );
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float time; uniform float fade; uniform vec3 rim; varying vec3 vObj; varying vec3 vRN; varying vec3 vRV;\nfloat hh(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }')
        /*
         * Black on black it was lost in the dark end of the corridor (owner, 2026-11-17): its edges smoulder,
         * a faint ember where the body turns away from the eye, flickering, so the figure reads against any dark.
         */
        .replace(
          '#include <opaque_fragment>',
          `float edgeK = pow(1.0 - abs(dot(normalize(vRN), normalize(vRV))), 2.5);
          float flick = 0.75 + 0.25 * sin(time * 7.0 + vObj.y * 0.05) * sin(time * 3.1 + vObj.x * 0.08);
          outgoingLight += rim * edgeK * flick * (1.0 - fade);
          #include <opaque_fragment>`,
        )
        .replace(
          '#include <clipping_planes_fragment>',
          `#include <clipping_planes_fragment>
          // it dissolves from the feet up, in a moving grain
          float rise = fade * 230.0 - vObj.y;
          if (fade > 0.0 && rise + 30.0 * hh(floor(gl_FragCoord.xy * 0.5) + floor(time * 30.0)) > 30.0) discard;`,
        );
    };
    core.customProgramCacheKey = () => 'st2g-shadow-core-v3';
    const b = makeBody(core, who);
    b.mesh.castShadow = true;
    b.mesh.receiveShadow = false;
    const walk = b.walk;
    const idle = b.mixer.clipAction(IDLE[who]);
    idle.play();
    idle.weight = 1;
    walk.weight = 0;

    // the smoke shells: same mesh, same skeleton, pushed out along the normals
    const shellMat = (push, alpha, key) => {
      const m = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, depthWrite: false, side: THREE.DoubleSide });
      m.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, u);
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nuniform float time; uniform float smoke; varying vec3 vObj; varying vec3 vN; varying vec3 vV;')
          .replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
            vObj = position;
            float sw = sin(position.y * 0.07 - time * 1.6 + position.x * 0.06) * sin(position.z * 0.09 + time * 0.9);
            // the further shells drift upward, as smoke does
            transformed += normal * (${push.toFixed(1)} + 3.0 * sw) * smoke + vec3(0.0, ${(push*0.25).toFixed(1)} * smoke, 0.0);`,
          )
          .replace(
            '#include <project_vertex>',
            `#include <project_vertex>
            vN = normalize(normalMatrix * objectNormal);
            vV = -mvPosition.xyz;`,
          );
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', `#include <common>
            uniform float time; uniform float fade; uniform float smoke; uniform float ash; varying vec3 vObj; varying vec3 vN; varying vec3 vV;
            float n3(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
              float h000 = fract(sin(dot(i, vec3(127.1, 311.7, 74.7))) * 43758.5453);
              float h100 = fract(sin(dot(i + vec3(1,0,0), vec3(127.1, 311.7, 74.7))) * 43758.5453);
              float h010 = fract(sin(dot(i + vec3(0,1,0), vec3(127.1, 311.7, 74.7))) * 43758.5453);
              float h110 = fract(sin(dot(i + vec3(1,1,0), vec3(127.1, 311.7, 74.7))) * 43758.5453);
              float h001 = fract(sin(dot(i + vec3(0,0,1), vec3(127.1, 311.7, 74.7))) * 43758.5453);
              float h101 = fract(sin(dot(i + vec3(1,0,1), vec3(127.1, 311.7, 74.7))) * 43758.5453);
              float h011 = fract(sin(dot(i + vec3(0,1,1), vec3(127.1, 311.7, 74.7))) * 43758.5453);
              float h111 = fract(sin(dot(i + vec3(1,1,1), vec3(127.1, 311.7, 74.7))) * 43758.5453);
              return mix(mix(mix(h000, h100, f.x), mix(h010, h110, f.x), f.y), mix(mix(h001, h101, f.x), mix(h011, h111, f.x), f.y), f.z); }`)
          .replace(
            '#include <color_fragment>',
            `#include <color_fragment>
            // thickest where the surface turns away from the eye: the silhouette is smoke
            float fres = 1.0 - abs(dot(normalize(vN), normalize(vV)));
            // streaming upward, in curls
            vec3 p = vObj * 0.07 + vec3(0.0, -time * 0.7, time * 0.15);
            float n = n3(p) * 0.6 + n3(p * 2.3 + 4.1) * 0.4;
            // the smoke is heavier toward the top of the figure, where it rises off the head and shoulders
            float up = smoothstep(60.0, 170.0, vObj.y);
            // patchy: curls of smoke with clear gaps between them, never a second outline
            float a = smoothstep(0.1, 0.85, fres) * smoothstep(0.46 - 0.08 * up, 0.7, n) * ${alpha.toFixed(2)} * smoke * (0.75 + 0.5 * up);
            a *= 1.0 - smoothstep(0.0, 0.7, fade);
            diffuseColor = vec4(vec3(0.0), a);`,
          );
      };
      m.customProgramCacheKey = () => key;
      return m;
    };
    const shells = [
      [4.0, 0.95, 'st2g-shadow-shell-a2'],
      [9.0, 0.6, 'st2g-shadow-shell-b2'],
    ].map(([push, alpha, key]) => {
      const sm = b.mesh.clone(); // a skinned clone shares the skeleton
      sm.material = shellMat(push, alpha, key);
      sm.castShadow = false;
      sm.frustumCulled = false;
      sm.renderOrder = 4;
      b.mesh.parent.add(sm);
      return sm;
    });

    // forearms a little too long (the scale passes on to the hands: long fingers too)
    const stretch = () => {
      for (const n of ['lowerarm_l', 'lowerarm_r']) if (b.bones[n]) b.bones[n].scale.setScalar(1.16);
    };

    /* wisps: dark smoke shed from its limbs, rising and curling away; after the meeting, pale ash */
    const SOURCES = ['head', 'neck', 'spine_03', 'spine_02', 'upperarm_l', 'upperarm_r', 'lowerarm_l', 'lowerarm_r', 'hand_l', 'hand_r', 'upperleg_l', 'upperleg_r', 'lowerleg_l', 'lowerleg_r'].map((n) => b.bones[n]).filter(Boolean);
    const NW = 700;
    const wg = new THREE.BufferGeometry();
    const wp = new Float32Array(NW * 3), wa = new Float32Array(NW * 2);
    wg.setAttribute('position', new THREE.BufferAttribute(wp, 3));
    wg.setAttribute('life', new THREE.BufferAttribute(wa, 2)); // age 0..1, seed
    const wv = new Float32Array(NW * 3);
    const wl = new Float32Array(NW).fill(1);
    const wu = { ash: u.ash, px: { value: innerHeight }, tex: { value: glowTex } };
    const wm = new THREE.ShaderMaterial({
      uniforms: wu,
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        attribute vec2 life; uniform float px; varying vec2 vL;
        void main() {
          vL = life;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          // grow as they rise and thin out
          float size = (0.08 + 0.32 * life.x) * (0.7 + 0.6 * life.y);
          gl_PointSize = px * size / max(-mv.z, 0.05);
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D tex; uniform float ash; varying vec2 vL;
        void main() {
          if (vL.x >= 1.0) discard;
          float a = texture2D(tex, gl_PointCoord).a;
          a *= smoothstep(0.0, 0.12, vL.x) * (1.0 - smoothstep(0.4, 1.0, vL.x)) * mix(0.7, 0.4, ash);
          gl_FragColor = vec4(mix(vec3(0.0), vec3(0.11, 0.105, 0.095), ash), a);
        }`,
    });
    const wisp = new THREE.Points(wg, wm);
    wisp.frustumCulled = false;
    wisp.renderOrder = 5;
    scene.add(wisp);
    let wNext = 0, wAcc = 0;
    const _v = new THREE.Vector3();
    const spawn = (pos, vx, vy, vz, life) => {
      const i = wNext;
      wNext = (wNext + 1) % NW;
      wp[i * 3] = pos.x;
      wp[i * 3 + 1] = pos.y;
      wp[i * 3 + 2] = pos.z;
      wv[i * 3] = vx;
      wv[i * 3 + 1] = vy;
      wv[i * 3 + 2] = vz;
      wa[i * 2] = 0;
      wa[i * 2 + 1] = Math.random();
      wl[i] = life;
    };
    const wisps = {
      /** rate: wisps per second (0 when it is not there). */
      update: (dt, t, rate) => {
        wAcc += rate * dt;
        while (wAcc >= 1) {
          wAcc -= 1;
          SOURCES[(Math.random() * SOURCES.length) | 0].getWorldPosition(_v);
          _v.x += (Math.random() - 0.5) * 0.12;
          _v.z += (Math.random() - 0.5) * 0.12;
          spawn(_v, (Math.random() - 0.5) * 0.12, 0.18 + Math.random() * 0.25, (Math.random() - 0.5) * 0.12, 1.6 + Math.random() * 1.6);
        }
        for (let i = 0; i < NW; i++) {
          if (wa[i * 2] >= 1) continue;
          wa[i * 2] = Math.min(1, wa[i * 2] + dt / wl[i]);
          const k = i * 3;
          // a slow curl as they rise
          const sd = wa[i * 2 + 1] * 40;
          wv[k] += Math.sin(t * 1.3 + sd) * 0.15 * dt;
          wv[k + 2] += Math.cos(t * 1.1 + sd) * 0.15 * dt;
          wp[k] += wv[k] * dt;
          wp[k + 1] += wv[k + 1] * dt;
          wp[k + 2] += wv[k + 2] * dt;
        }
        wg.attributes.position.needsUpdate = true;
        wg.attributes.life.needsUpdate = true;
      },
      /** Everything it is made of, thrown out at once (the meeting): it rises as ash. */
      burst: (center, count = 260) => {
        for (let n = 0; n < count; n++) {
          SOURCES[(Math.random() * SOURCES.length) | 0].getWorldPosition(_v);
          _v.lerp(center, 0.3);
          const a = Math.random() * Math.PI * 2, sp = 0.2 + Math.random() * 0.9;
          spawn(_v, Math.cos(a) * sp, 0.25 + Math.random() * 0.6, Math.sin(a) * sp, 2.5 + Math.random() * 3);
        }
      },
      /** A few puffs of smoke at a point (a black mask crumbling; the smoke running down the corridor). */
      puff: (pos, count = 4, spread = 0.1, rise = 0.12) => {
        for (let n = 0; n < count; n++) {
          _v.set(pos.x + (Math.random() - 0.5) * spread, pos.y + (Math.random() - 0.5) * spread, pos.z + (Math.random() - 0.5) * spread);
          spawn(_v, (Math.random() - 0.5) * 0.25, rise * (0.4 + Math.random()), (Math.random() - 0.5) * 0.25, 1.1 + Math.random() * 1.4);
        }
      },
      resize: () => (wu.px.value = innerHeight * Math.min(devicePixelRatio, 1.5)),
    };
    wisps.resize();

    /**
     * Its bearing after the animation: the head bowed and the shoulders a little forward while it
     * follows; `lean` bows it further as it comes; `lift` raises the head to meet your eyes.
     */
    /*
     * Bends on top of the animation must be undone before the next frame: the mixer only writes a
     * bone when the animation's value for it has changed, so a held pose (or a frame drawn again
     * without time moving) would otherwise add the same bend twice (found 2026-11-17: arms raised
     * twice as far as asked). `unbend()` is called before each `mixer.update`.
     */
    const saved = new Map();
    const bend = (bone, axis, angle) => {
      if (!bone || angle === 0) return;
      if (!saved.has(bone)) saved.set(bone, bone.quaternion.clone());
      bendBone(bone, axis, angle);
    };
    const unbend = () => {
      for (const [bone, q] of saved) bone.quaternion.copy(q);
      saved.clear();
    };
    const posture = (lean, lift = 0) => {
      stretch();
      const ax = new THREE.Vector3(1, 0, 0).applyQuaternion(b.obj.quaternion);
      bend(b.bones.spine_03, ax, 0.06 + 0.1 * lean - 0.08 * lift);
      bend(b.bones.neck, ax, 0.18 + 0.12 * lean - 0.26 * lift);
      bend(b.bones.head, ax, 0.22 + 0.15 * lean - 0.3 * lift);
    };
    /**
     * Its arms, after the animation (0..1 each): `point` the right arm raised straight at you
     * (judgement), `reach` both arms held out (need), `cover` both hands over the face (shame).
     */
    const arms = ({ point = 0, reach = 0, cover = 0 } = {}) => {
      // which body axis swings an arm forward, and which way, is read off a screenshot (ARM below);
      // __g.armDebug = { swap, sign } overrides it while testing
      const dbg = window.__g?.armDebug;
      const X = new THREE.Vector3(1, 0, 0).applyQuaternion(b.obj.quaternion);
      const Z = new THREE.Vector3(0, 0, 1).applyQuaternion(b.obj.quaternion);
      const swap = dbg?.swap ?? ARM_SWAP;
      const side = swap ? Z : X, fwdA = swap ? X : Z;
      const A = dbg?.sign ?? ARM_SIGN;
      if (point > 0) {
        bend(b.bones.upperarm_r, side, A * 1.65 * point);
        bend(b.bones.lowerarm_r, side, -A * 0.5 * point); // the elbow straightened: a pointing arm
        bend(b.bones.upperarm_r, fwdA, 0.25 * point);
      }
      if (reach > 0)
        for (const [s, k] of [['l', -1], ['r', 1]]) {
          bend(b.bones['upperarm_' + s], side, A * 1.25 * reach);
          bend(b.bones['lowerarm_' + s], side, -A * 0.35 * reach);
          bend(b.bones['upperarm_' + s], fwdA, k * 0.15 * reach);
        }
      if (cover > 0)
        for (const [s, k] of [['l', -1], ['r', 1]]) {
          bend(b.bones['upperarm_' + s], side, A * 0.95 * cover);
          bend(b.bones['upperarm_' + s], fwdA, k * 0.35 * cover);
          bend(b.bones['lowerarm_' + s], side, A * 1.9 * cover);
        }
    };
    /** move 0..1: how much it is walking rather than standing. */
    const setGait = (move) => {
      walk.weight = move;
      idle.weight = 1 - move;
    };
    return { ...b, u, posture, arms, unbend, setGait, idle, shells, wisps };
  };

  /**
   * The child (refs/v06.jpg, refs/i06): Sophia's scan made small, with a child's proportions
   * (a larger head, shorter legs and arms), in plain dark clothes, seen from behind. It walks
   * with Nathan's walk, stands with Sophia's idle, and can lean into a pull. `u.fade` dissolves it.
   */
  const makeChild = () => {
    const obj = SkeletonUtils.clone(sophiaFBX);
    const SCALE = 0.0066; // Sophia is ~1.65 m: about 1.1 m once the proportions change
    obj.scale.setScalar(SCALE);
    // the file is Z-up and the loader tips it with a rotation on its root; the root group turns it instead
    obj.rotation.set(0, 0, 0);
    const mesh = skinnedMesh(obj);
    mesh.frustumCulled = false;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const bones = boneMap(obj);
    const u = { fade: { value: 0 }, time: { value: 0 } };
    const mat = new THREE.MeshStandardMaterial({ map: tex('./assets/people/sophia/dif.jpg', true), normalMap: tex('./assets/people/sophia/norm.jpg'), roughness: 0.95 });
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, u);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float fade; uniform float time;\nfloat hh(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }')
        .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (fade > hh(floor(gl_FragCoord.xy) + floor(time * 20.0) * 3.0)) discard;')
        .replace(
          '#include <map_fragment>',
          `#include <map_fragment>
          // plain dark clothes and drained skin: the child is mostly a shape against the light
          float l = dot(diffuseColor.rgb, vec3(0.3, 0.6, 0.1));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(l) * vec3(1.0, 0.88, 0.72), 0.85) * 0.075;`,
        );
    };
    mat.customProgramCacheKey = () => 'st2g-child-v1';
    mesh.material = mat;
    // a child's proportions: the head larger, legs and arms shorter
    // Bones run along their local x: scale.x is length, y and z are girth. A child is not a small woman: the
    // hips and chest narrow and flatten, the limbs are thinner as well as shorter, and the head is large. A
    // bone's girth passes to its children, so the head is given back what the chest took away.
    const shape = () => {
      const S = (n, x, y = x, z = y) => bones[n] && bones[n].scale.set(x, y, z);
      const TORSO = 0.8;
      S('pelvis', 1, 0.84, 0.84);
      S('spine_01', 1, 0.95, 0.95);
      S('spine_02', 0.97, 0.92, 0.92);
      S('spine_03', 0.95, TORSO / (0.84 * 0.95 * 0.92), TORSO / (0.84 * 0.95 * 0.92) * 0.93);
      S('neck', 0.9, 1 / TORSO, 1 / TORSO);
      S('head', 1.4, 1.4, 1.4);
      for (const sd of ['l', 'r']) {
        S('upperleg_' + sd, 0.86, 0.95 / 0.84, 0.95 / 0.84); // the legs keep their girth against the narrowed hips, then thin
        S('lowerleg_' + sd, 0.98, 0.84, 0.84);
        S('upperarm_' + sd, 0.9, 1.0, 1.0); // thin already: the chest's girth passes to the arms
      }
    };
    shape();
    const mixer = new THREE.AnimationMixer(obj);
    const walk = mixer.clipAction(inPlace(nathanFBX.animations[0], 84.2 / 94.6));
    const idle = mixer.clipAction(inPlace(sophiaFBX.animations[0], 1));
    walk.play();
    idle.play();
    walk.weight = 0;
    idle.weight = 1;
    const root = new THREE.Group(); // ground-level anchor; obj is lifted so the feet touch the floor
    root.add(obj);
    const _v = new THREE.Vector3();
    let lift = 0;
    /**
     * After the mixer: lean (0..1) into the pull, the right arm drawn back with the rope,
     * then set the feet on the floor.
     */
    const pose = (lean, hold) => {
      shape();
      obj.updateMatrixWorld(true);
      const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(root.quaternion);
      const side = new THREE.Vector3(1, 0, 0).applyQuaternion(root.quaternion);
      bendBone(bones.spine_01, side, 0.12 * lean);
      bendBone(bones.spine_03, side, 0.22 * lean);
      bendBone(bones.neck, side, 0.12 + 0.1 * lean);
      bendBone(bones.head, side, 0.08);
      if (hold > 0) {
        // the right arm reaches back and down, holding the rope over the shoulder
        bendBone(bones.upperarm_r, side, -0.75 * hold);
        bendBone(bones.lowerarm_r, side, -0.35 * hold);
        bendBone(bones.upperarm_r, fwd, -0.15 * hold);
      }
      // the lowest foot rests on the floor
      const fl = bones.foot_l.getWorldPosition(_v).y, fr = bones.foot_r.getWorldPosition(_v).y;
      const want = lift - (Math.min(fl, fr) - root.position.y - 0.045);
      lift += (want - lift) * 0.5;
      obj.position.y = lift / root.scale.y;
      obj.updateMatrixWorld(true);
    };
    const hand = () => bones.hand_r.getWorldPosition(new THREE.Vector3());
    return { root, obj, mesh, mixer, walk, idle, bones, u, pose, hand };
  };

  /**
   * A bust from a scan (the gallery): head, neck and the top of the chest and shoulders, in the
   * bind pose, cut flat across the chest. Metres; the bottom of the cut at y = 0, facing +Z.
   * `faceP` holds each vertex's position relative to the eyes (metres), for the projection shader.
   */
  const bustGeometry = (src) => {
    const mesh = skinnedMesh(src);
    src.updateMatrixWorld(true);
    const sk = mesh.skeleton;
    const bind = (name) => {
      const i = sk.bones.findIndex((b) => b.name === name);
      return new THREE.Vector3().setFromMatrixPosition(sk.boneInverses[i].clone().invert()).applyMatrix4(mesh.bindMatrix.clone().invert());
    };
    const eL = bind('eye_l'), eR = bind('eye_r');
    const o = eL.clone().add(eR).multiplyScalar(0.5);
    const X = eL.clone().sub(eR).normalize();
    const Y = new THREE.Vector3(0, 1, 0);
    Y.addScaledVector(X, -Y.dot(X)).normalize();
    const Z = X.clone().cross(Y);
    const CUT = -46, HALF = 23; // centimetres below the eyes; half the width kept
    const g = mesh.geometry, pos = g.attributes.position, nor = g.attributes.normal;
    const v = new THREE.Vector3(), q = new THREE.Vector3();
    const local = (i) => (v.fromBufferAttribute(pos, i).sub(o), q.set(v.dot(X), v.dot(Y), v.dot(Z)));
    const keepV = (i) => {
      const p = local(i);
      return p.y > CUT && Math.abs(p.x) < HALF + Math.max(0, p.y + 30) * 0.0;
    };
    const remap = new Int32Array(pos.count).fill(-1);
    const P = [], N = [], F = [];
    const idx = g.index ? g.index.array : null;
    const nTri = (idx ? idx.length : pos.count) / 3;
    const tri = [];
    for (let t = 0; t < nTri; t++) {
      const a = idx ? idx[t * 3] : t * 3, b = idx ? idx[t * 3 + 1] : t * 3 + 1, c = idx ? idx[t * 3 + 2] : t * 3 + 2;
      if (!(keepV(a) && keepV(b) && keepV(c))) continue;
      for (const i of [a, b, c]) {
        if (remap[i] < 0) {
          remap[i] = P.length / 3;
          const p = local(i);
          P.push(p.x * 0.01, (p.y - CUT) * 0.01, p.z * 0.01);
          F.push(p.x * 0.01, p.y * 0.01, p.z * 0.01);
          v.fromBufferAttribute(nor, i);
          N.push(v.dot(X), v.dot(Y), v.dot(Z));
        }
        tri.push(remap[i]);
      }
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
    out.setAttribute('faceP', new THREE.Float32BufferAttribute(F, 3));
    out.setIndex(tri);
    out.computeBoundingSphere();
    out.userData = { eyeHeight: -CUT * 0.01 };
    return out;
  };

  /** A whole standing figure (the golden statue): Sophia, held in her idle at one moment. */
  const makeStatueFigure = () => {
    const obj = SkeletonUtils.clone(sophiaFBX);
    obj.rotation.set(0, 0, 0);
    obj.scale.setScalar(0.01);
    const mesh = skinnedMesh(obj);
    mesh.frustumCulled = false;
    mesh.castShadow = mesh.receiveShadow = true;
    const mixer = new THREE.AnimationMixer(obj);
    const a = mixer.clipAction(inPlace(sophiaFBX.animations[0], 1));
    a.play();
    mixer.update(1.2);
    obj.updateMatrixWorld(true);
    return { obj, mesh, bones: boneMap(obj) };
  };

  /**
   * The front of a scan's face as a mask: metre-sized geometry, centred, facing +Z, with an
   * `oval` attribute (below 1 inside the mask's outline) for a clean cut in the shader.
   */
  const faceGeometry = (src) => {
    const mesh = skinnedMesh(src);
    src.updateMatrixWorld(true);
    const sk = mesh.skeleton;
    const bind = (name) => {
      const i = sk.bones.findIndex((b) => b.name === name);
      return new THREE.Vector3().setFromMatrixPosition(sk.boneInverses[i].clone().invert()).applyMatrix4(mesh.bindMatrix.clone().invert());
    };
    // The face's own frame, from the eye and jaw bones (Sophia's head is turned in her rest pose):
    // origin between the eyes, X from the right eye to the left, Y up, Z out of the face.
    const eL = bind('eye_l'), eR = bind('eye_r'), chin = bind('jaw_end');
    const o = eL.clone().add(eR).multiplyScalar(0.5);
    const X = eL.clone().sub(eR).normalize();
    const Y = new THREE.Vector3(0, 1, 0);
    Y.addScaledVector(X, -Y.dot(X)).normalize();
    const Z = X.clone().cross(Y);
    const face = o.y - chin.y; // eyes to chin, centimetres
    const cy = -0.3 * face, ay = 1.06 * face, ax = 0.72 * face;
    const back = -0.5 * face; // how far behind the eyes the mask reaches: the cheeks, not the ears
    const g = mesh.geometry;
    const pos = g.attributes.position, nor = g.attributes.normal;
    const v = new THREE.Vector3(), q = new THREE.Vector3();
    const local = (i) => {
      v.fromBufferAttribute(pos, i).sub(o);
      return q.set(v.dot(X), v.dot(Y), v.dot(Z));
    };
    const oval = (p) => (p.x / ax) ** 2 + ((p.y - cy) / ay) ** 2;
    const keepV = (i) => {
      const p = local(i);
      return p.z > back && p.z < face && oval(p) < 1.35;
    };
    const remap = new Int32Array(pos.count).fill(-1);
    const P = [], Nn = [], O = [];
    const srcIdx = g.index ? g.index.array : null;
    const nTri = (srcIdx ? srcIdx.length : pos.count) / 3;
    const tri = [];
    for (let t = 0; t < nTri; t++) {
      const a = srcIdx ? srcIdx[t * 3] : t * 3, b = srcIdx ? srcIdx[t * 3 + 1] : t * 3 + 1, c = srcIdx ? srcIdx[t * 3 + 2] : t * 3 + 2;
      if (!(keepV(a) && keepV(b) && keepV(c))) continue;
      for (const i of [a, b, c]) {
        if (remap[i] < 0) {
          remap[i] = P.length / 3;
          const p = local(i);
          P.push(p.x * 0.01, (p.y - cy) * 0.01, (p.z - back) * 0.01);
          O.push(oval(p));
          v.fromBufferAttribute(nor, i);
          Nn.push(v.dot(X), v.dot(Y), v.dot(Z));
        }
        tri.push(remap[i]);
      }
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3));
    out.setAttribute('oval', new THREE.Float32BufferAttribute(O, 1));
    out.setIndex(tri);
    out.computeBoundingSphere();
    out.userData = { tris: tri.length / 3, face };
    return out;
  };

  return { makeBodyCaster, makeShadowFigure, makeChild, bustGeometry, makeStatueFigure, faceGeometry, src: { nathanFBX, sophiaFBX } };
};
