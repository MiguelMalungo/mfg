import * as THREE from 'three';
import { buildGallery } from './gallery.js';
import { W, WATER, ROOM_Y, Z_STAIR_END, Z_ROOM_END } from './house.js';
import { LETTERS } from './texts.js';

/*
 * Level II, albedo: a first playable slice (PLAN.md 10.5), in the flooded cellar under the house.
 *   - Three sealed letters float among the others, larger, their seals catching the light. Picked
 *     with the hand, each opens on one way of working with a dream (the secret room, the feeling of
 *     the dream, playing the other role) and puts a little white into the flask.
 *   - At the far end, on a tall column under a round opening in the vault, the statue the start set
 *     (Venus for a man, Apollo for a woman: the anima, the animus) shines gold. Hold your light on its
 *     face and the gold comes back into your flask; a statue is left, not a god (gallery.js).
 *   - Someone far off holds up a light of their own. Until the gold is back they keep their
 *     distance; after, they stay.
 * Not built yet: the horse, the dream rooms behind the sunken doors, the bird (see BUILD.md).
 */

const COLUMN_Z = Z_ROOM_END + 2.4;
const COLUMN_TOP = WATER + 0.55; // the statue's pedestal stands just clear of the water

export const buildAlbedo = (scene, house, people, glowTex, renderer, gender) => {
  const group = new THREE.Group();
  scene.add(group);

  /* the three letters you can pick: copies of the floating ones, larger, with a faint warm glow on the seal */
  const src = house.letters[0];
  const list = [];
  const spots = [
    { x: -1.15, z: Z_STAIR_END - 2.6, r: 0.4 },
    { x: 1.2, z: Z_STAIR_END - 6.4, r: 2.1 },
    { x: -0.6, z: Z_STAIR_END - 9.8, r: 4.0 },
  ];
  LETTERS.forEach((def, i) => {
    const m = new THREE.Mesh(src.geometry, src.material.clone());
    m.material.emissive = new THREE.Color(0.5, 0.06, 0.03);
    m.material.emissiveMap = src.material.map;
    m.material.emissiveIntensity = 0.06;
    m.scale.setScalar(1.6);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = spots[i].r;
    m.position.set(spots[i].x, WATER + 0.006, spots[i].z);
    m.receiveShadow = true;
    group.add(m);
    list.push({ id: def.id, def, mesh: m, state: 'water', home: m.position.clone(), seed: i * 1.7, k: 0 });
  });

  /* the statue on its column, under the oculus */
  const who = gender === 'woman' ? 'god' : 'goddess';
  const gallery = buildGallery(scene, people, house, glowTex, W, renderer, [{ who, x: 0, z: COLUMN_Z, y: COLUMN_TOP, face: new THREE.Vector3(0, 0, 1), column: { from: ROOM_Y } }]);
  // the round opening in the vault, and the shaft of pale light that falls through it onto the statue
  const CEIL = 2.4;
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.9, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.7, 1.9), fog: false }));
  disc.rotation.x = Math.PI / 2;
  disc.position.set(0, CEIL - 0.01, COLUMN_Z);
  group.add(disc);
  const shaftMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { time: { value: 0 } },
    vertexShader: /* glsl */ `varying vec3 vP; varying vec3 vW; void main() { vP = position; vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `uniform float time; varying vec3 vP; varying vec3 vW;
      float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main() {
        // brightest at the top, fading to the water; dust drifting in it
        float k = smoothstep(-0.5, 0.5, vP.y) * 0.75 + 0.25;
        // thin at its edges, as a shaft of light is seen through dusty air
        float edge = 1.0 - abs(dot(normalize(vec3(vP.x, 0.0, vP.z)), normalize(cameraPosition - vW)));
        float dust = 0.8 + 0.2 * h(floor(vP.xz * 40.0 + vec2(0.0, time * 2.0)));
        gl_FragColor = vec4(vec3(0.05, 0.055, 0.062) * k * dust * (1.0 - edge * 0.85), 1.0);
      }`,
  });
  const shaftH = CEIL - WATER;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.25, shaftH, 40, 1, true), shaftMat);
  shaft.position.set(0, WATER + shaftH / 2, COLUMN_Z);
  group.add(shaft);
  const spot = new THREE.SpotLight(new THREE.Color(0.8, 0.86, 1.0), 2.2, 9, 0.42, 0.6, 2);
  spot.position.set(0, CEIL, COLUMN_Z + 0.2);
  spot.target.position.set(0, COLUMN_TOP + 1.2, COLUMN_Z);
  group.add(spot, spot.target);

  /* the Other: the far light, beyond the column */
  const other = house.farLight;
  const otherHome = new THREE.Vector3(1.4, WATER + 1.2, Z_ROOM_END + 0.9);

  const st = { read: [], gold: false, done: false, otherK: 0 };
  const _t = new THREE.Vector3(), _f = new THREE.Vector3();

  /** The letter the eye is on, within reach. */
  const lookedAt = (camera, reach = 2.6) => {
    let best = null, bestA = 1e9;
    camera.getWorldDirection(_f);
    for (const L of list) {
      if (L.state !== 'water') continue;
      _t.copy(L.mesh.position).sub(camera.position);
      const d = _t.length();
      if (d > reach) continue;
      const a = Math.acos(Math.min(1, _t.dot(_f) / d));
      if (a < Math.max(0.12, 0.2 / d) && a < bestA) (bestA = a), (best = L);
    }
    return best;
  };

  /** A letter picked: it rises from the water to before your eye (main.js shows its text). */
  const lift = (L, camera) => {
    L.state = 'rising';
    L.k = 0;
    L.from = L.mesh.position.clone();
    L.fromQ = L.mesh.quaternion.clone();
  };
  /** Read: it sinks, its seal broken (the light goes out of it). */
  const sink = (L) => {
    L.state = 'sinking';
    L.k = 0;
    L.from = L.mesh.position.clone();
    st.read.push(L.id);
  };

  const update = (dt, t, camera, flaskPos, sound, player) => {
    shaftMat.uniforms.time.value = t;
    for (const L of list) {
      const m = L.mesh;
      if (L.state === 'water') {
        m.position.y = WATER + 0.006 + 0.005 * Math.sin(t * 0.9 + L.seed);
        m.material.emissiveIntensity = 0.05 + 0.03 * Math.sin(t * 1.3 + L.seed);
      } else if (L.state === 'rising' || L.state === 'held') {
        L.k = Math.min(1, L.k + dt / 1.1);
        const k = L.k * L.k * (3 - 2 * L.k);
        camera.getWorldDirection(_f);
        _t.copy(camera.position).addScaledVector(_f, 0.55);
        m.position.lerpVectors(L.from, _t, k);
        // it turns up to face you
        const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(_t, camera.position, camera.up));
        m.quaternion.slerpQuaternions(L.fromQ, q, k);
        if (L.k >= 1) L.state = 'held';
      } else if (L.state === 'sinking') {
        L.k = Math.min(1, L.k + dt / 2.5);
        m.position.lerpVectors(L.from, L.home.clone().setY(WATER - 0.4), L.k * L.k);
        m.material.emissiveIntensity = 0.05 * (1 - L.k);
        m.material.opacity = 1 - L.k;
        m.material.transparent = true;
        if (L.k >= 1) (L.state = 'gone'), (m.visible = false);
      }
    }
    gallery.update(dt, t, camera, flaskPos, sound);
    if (!st.gold && gallery.items[0].done) st.gold = true;
    // the Other keeps its distance until the gold is withdrawn: it backs off and dims as you come
    const near = player ? Math.max(0, 1 - Math.abs(player.pos.z - otherHome.z) / 9) : 0;
    st.otherK += ((st.gold ? 0 : near) - st.otherK) * (1 - Math.exp(-dt * 1.5));
    other.position.copy(otherHome).add(_t.set(0.5 * st.otherK, 0, -0.6 * st.otherK));
    other.userData.dim = st.gold ? 1.25 : 1 - 0.7 * st.otherK;
    st.done = st.gold && st.read.length >= LETTERS.length;
  };

  return { group, list, gallery, st, lookedAt, lift, sink, update, colliders: gallery.colliders, column: { z: COLUMN_Z } };
};
