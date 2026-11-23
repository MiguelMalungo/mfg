import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildGallery } from './gallery.js';
import { WATER, ROOM_Y, ROOM_W, Z_STAIR_END, Z_ROOM_END, WAINSCOT } from './house.js';
import { doorLeaf, doorCase, board, moulding, wainscotBay } from './joinery.js';
import { LETTERS, ALBEDO } from './texts.js';

/*
 * Level II, albedo (PLAN.md 10.5), under the house. In order:
 *
 *   1. The stair down (house.js): candles on the steps, into black water.
 *   2. The horse, in the flooded cellar (i15). It will not be driven and will not let you past: it
 *      steps into your way. Stand still with your eyes and your light lowered and it comes to you;
 *      then it turns and walks ahead through the water, and you follow. (Instinct met, not mastered.)
 *   3. Three sealed letters (i16), one after the other. Read, a letter's seal breaks and a door
 *      standing half under the water opens onto a small dream room:
 *        the secret room of the house, never seen (open the box on the table);
 *        a figure of your shape comes for you down a corridor: choose the feeling of the dream;
 *        the same corridor again, as the one who follows: it stops, and you give it what you carry.
 *      Each returns a white bloom to the flask.
 *   4. The oculus hall (i13a, i13b), through a door at the end of the water: a tall narrow ruined
 *      hall, a statue on a column under a round opening, a shaft of light. Venus for a man, Apollo
 *      for a woman (gallery.js). Far off, someone holds up a light of their own; chase them and
 *      they recede.
 *   5. Hold your light on the statue's face: the gold streams into your flask, marble is left. The
 *      Other stops, turns, and waits.
 *   6. Go to them: the white bird comes down through the oculus (i21), the flask goes clear white,
 *      and the Other leads you down a stair at the end of the hall. Then the card.
 *
 * The dream rooms are built far behind the house (z > 100) and you are carried there and back
 * through a fade. No light here casts a shadow (they halve the frame rate); one light moves from
 * place to place instead of each place having its own.
 */

// the hall beyond the cellar
const ARCH_W = 1.8, ARCH_H = 2.7;
const STEPS_UP = 6, STEP_RUN = 0.27;
const HALL_Y = WATER + 0.03; // the hall's floor: broken slabs just clear of the water that lies between them
const STEP_RISE = (HALL_Y - ROOM_Y) / STEPS_UP;
const HALL_Z0 = Z_ROOM_END - STEPS_UP * STEP_RUN; // where the steps come up into the hall
const HALL_LEN = 19, HALL_Z1 = HALL_Z0 - HALL_LEN, HALL_HW = 2.3, HALL_H = 11;
const COLUMN_Z = HALL_Z0 - 6.5;
const COLUMN_TOP = HALL_Y + 5.4; // a tall slender column (i13a, i13b): the statue stands high, near the opening; you hold your light up to it
const OTHER_Z = HALL_Z0 - 13.5;
// the dream rooms
const ROOM1 = new THREE.Vector3(0, 0, 130); // the secret room
const ROOM2 = new THREE.Vector3(0, 0, 175); // the dream corridor (the feeling, then the other role)
const DREAM_LEN = 16, DREAM_HW = 1.3;

const ss = (a, b, x) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};
const angleTo = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
const turnToward = (yaw, want, rate, dt) => yaw + Math.max(-rate * dt, Math.min(rate * dt, angleTo(yaw, want)));

/** A plane with UVs in metres / tile. */
const mplane = (w, h, tile) => {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / tile, (uv.getY(i) * h) / tile);
  return g;
};

/** A word floating in the air, drawn on a canvas (the three feelings). */
const wordSprite = (text) => {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const x = c.getContext('2d');
  x.font = 'italic 96px "Cormorant Garamond", Georgia, serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.shadowColor = 'rgba(255,240,210,0.9)';
  x.shadowBlur = 24;
  x.fillStyle = '#f4ead8';
  x.fillText(text, 256, 84);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false }));
  s.scale.set(0.56, 0.175, 1);
  return s;
};

/** A dark figure with a pale rim of light round it, as figures are seen in dreams. */
const dreamMaterial = (rim) => {
  // unlit: a figure in a dream is not lit by your flask; it is dark, with light only at its edges
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.004, 0.004, 0.005) });
  m.userData.rim = { value: rim.clone() };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.rimCol = m.userData.rim;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRN; varying vec3 vRV;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        #ifdef USE_SKINNING
        vRN = normalize(normalMatrix * objectNormal);
        #else
        vRN = normalize(normalMatrix * normal);
        #endif
        vRV = -mvPosition.xyz;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 rimCol; varying vec3 vRN; varying vec3 vRV;')
      .replace('#include <opaque_fragment>', 'float fr = pow(1.0 - abs(dot(normalize(vRN), normalize(vRV))), 4.0);\noutgoingLight += rimCol * fr;\n#include <opaque_fragment>');
  };
  m.customProgramCacheKey = () => 'st2g-dream-figure';
  return m;
};

export const buildAlbedo = ({ scene, house, people, glowTex, renderer, gender, api }) => {
  const group = new THREE.Group();
  scene.add(group);
  const gltf = new GLTFLoader();
  const stone = house.stoneMat;
  stone.color.setRGB(0.5, 0.47, 0.43); // the stair and the cellar: darker stone, toward i14 and i15
  const add = (m, parent = group) => (parent.add(m), (m.receiveShadow = true), m);
  const box = (w, h, d, mat, x, y, z, parent = group) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    return add(m, parent);
  };
  const st = {
    phase: 'horse', // horse → letters → hall → gold → bird → down → done
    read: [], gold: false, done: false, archOpen: false,
    room: null, // the dream room you are in: { i, kind, ... }
    busy: false, // a fade, a text, a letter in the air: nothing else can be picked
    exposure: 1, // main.js multiplies the picture's exposure by it below the house
  };
  const colliders = [];
  // one light that goes where it is needed (a dream room, an open door), so the number of lights never changes
  const roamLight = new THREE.PointLight(new THREE.Color(1.0, 0.86, 0.66), 0, 7, 2);
  roamLight.userData.base = 0;
  roamLight.userData.seed = 5.1;
  group.add(roamLight);
  house.lights.push(roamLight);
  const setRoam = (pos, color, base, dist = 7) => {
    roamLight.position.copy(pos);
    roamLight.color.copy(color);
    roamLight.userData.base = base;
    roamLight.distance = dist;
  };

  /* ── the fade, for going into the dream rooms and back ── */
  const veil = document.createElement('div');
  veil.style.cssText = 'position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;transition:opacity 0.9s ease;z-index:40';
  document.body.appendChild(veil);
  const fadeThrough = (mid, after) => {
    st.busy = true;
    veil.style.opacity = '1';
    api.later(1.0, () => {
      mid();
      api.later(0.4, () => {
        veil.style.opacity = '0';
        api.later(0.9, () => {
          st.busy = false;
          after?.();
        });
      });
    });
  };

  /* ═════════════ 2. the horse ═════════════ */
  const horse = {
    obj: new THREE.Group(), pos: new THREE.Vector3(0.4, ROOM_Y, Z_STAIR_END - 2.8), yaw: 0, // facing +z: toward you as you come down
    state: 'wait', calm: 0, near: 0, speed: 0, t: 0, ready: false, pushedTold: false, hintAt: 0,
  };
  horse.obj.position.copy(horse.pos);
  group.add(horse.obj);
  const horseCol = [{ x: 0, z: 0, r: 0.42 }, { x: 0, z: 0, r: 0.42 }, { x: 0, z: 0, r: 0.42 }];
  colliders.push(...horseCol);
  gltf.loadAsync('./assets/albedo/horse.glb').then((g) => {
    const model = g.scene;
    // the model's own forward: from the tail to the head, measured on its bones
    model.updateMatrixWorld(true);
    const head = model.getObjectByName('Head_010'), tail = model.getObjectByName('Tail_043');
    const hp = new THREE.Vector3(), tp = new THREE.Vector3();
    head?.getWorldPosition(hp);
    tail?.getWorldPosition(tp);
    const fwd = hp.sub(tp).setY(0).normalize();
    const inner = new THREE.Group();
    inner.rotation.y = -Math.atan2(fwd.x, fwd.z); // so the head points along +z of the holder
    inner.add(model);
    inner.scale.setScalar(1.3); // a large horse: about 1.7 m at the withers
    horse.obj.add(inner);
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false;
      // the horse of i15 is near black: its coat (and its blaze) drained of colour and darkened, catching the candles
      const m = (o.material = o.material.clone());
      m.roughness = 0.72;
      m.metalness = 0;
      if ('specularIntensity' in m) m.specularIntensity = 0.12; // a coat this dark shows little but its sheen
      m.vertexColors = false; // the file's vertex colours lifted the coat to a pale grey whatever its texture
      // repaint the coat: an even dark grey that keeps only a little of the photo's variation, so the
      // chestnut and the white blaze do not come back up when the eye adapts to the dark
      const img = m.map?.image;
      if (img && img.width) {
        const c = document.createElement('canvas');
        c.width = Math.min(1024, img.width);
        c.height = Math.min(1024, img.height);
        const x = c.getContext('2d');
        x.drawImage(img, 0, 0, c.width, c.height);
        const d = x.getImageData(0, 0, c.width, c.height);
        for (let i = 0; i < d.data.length; i += 4) {
          const l = (0.3 * d.data[i] + 0.59 * d.data[i + 1] + 0.11 * d.data[i + 2]) / 255;
          const v = 255 * (0.05 + 0.06 * l);
          d.data[i] = v * 1.03;
          d.data[i + 1] = v;
          d.data[i + 2] = v * 0.96;
        }
        x.putImageData(d, 0, 0);
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        t.flipY = m.map.flipY;
        t.wrapS = m.map.wrapS;
        t.wrapT = m.map.wrapT;
        m.map = t;
      }
      m.color.setRGB(1, 1, 1);
    });
    const clip = g.animations[0];
    const fps = 24;
    horse.mixer = new THREE.AnimationMixer(model);
    horse.walk = horse.mixer.clipAction(THREE.AnimationUtils.subclip(clip, 'walk', 236, 272, fps));
    horse.idle = horse.mixer.clipAction(THREE.AnimationUtils.subclip(clip, 'idle', 360, 700, fps));
    horse.walk.play();
    horse.idle.play();
    horse.walk.weight = 0;
    horse.ready = true;
  });

  const updateHorse = (dt, t, player, camera) => {
    const h = horse;
    h.t += dt;
    const dx = player.pos.x - h.pos.x, dz = player.pos.z - h.pos.z;
    const dist = Math.hypot(dx, dz);
    const towardYou = Math.atan2(dx, dz);
    let want = 0; // how fast it walks this frame
    if (h.state === 'wait') {
      if (player.pos.z < Z_STAIR_END + 1) {
        // it watches you, and steps across into your way if you try to pass
        h.yaw = turnToward(h.yaw, towardYou, 1.2, dt);
        const block = Math.max(-1.4, Math.min(1.4, player.pos.x * 0.8));
        h.pos.x += (block - h.pos.x) * (1 - Math.exp(-dt * 0.9));
        // driven at, it backs away a little, and will not be passed
        if (dist < 3.2 && player.speed > 0.45) {
          h.pos.z = Math.max(Z_STAIR_END - 5.5, h.pos.z - dt * 0.6);
          if (!h.pushedTold) ((h.pushedTold = true), api.words.tip(ALBEDO.horsePushed, { id: 'horsePushed', times: 1 }));
          h.calm = Math.max(0, h.calm - dt * 2);
        }
        // still, eyes and light lowered, within sight of it
        const still = player.speed < 0.15 && camera.rotation.x < -0.26 && dist < 8.5;
        h.calm = still ? h.calm + dt : Math.max(0, h.calm - dt * 0.6);
        h.near += dist < 8 ? dt : 0;
        if (h.near > 9 && !h.hintAt) ((h.hintAt = t), api.words.tip(ALBEDO.horseHint, { id: 'horseHint', times: 1 }));
        if (h.calm > 2.6) {
          h.state = 'come';
          api.sound.glass(392, 0.035, 2.5);
        }
      }
    } else if (h.state === 'come') {
      h.yaw = turnToward(h.yaw, towardYou, 1.0, dt);
      if (dist > 3.1) want = 0.55; // its head reaches a metre and more in front of it: it stops with its nose an arm's length away
      else ((h.state = 'greet'), (h.t = 0), api.words.whisper(ALBEDO.horseCame, 2.6));
    } else if (h.state === 'greet') {
      h.yaw = turnToward(h.yaw, towardYou, 1.0, dt);
      if (h.t > 3.0) ((h.state = 'turn'), (h.t = 0));
    } else if (h.state === 'turn') {
      // it turns away, toward the far end of the water
      h.yaw = turnToward(h.yaw, Math.PI, 0.9, dt);
      want = 0.25;
      if (Math.abs(angleTo(h.yaw, Math.PI)) < 0.05) {
        h.state = 'lead';
        api.words.tip(ALBEDO.horseFollow, { id: 'horseFollow', times: 1 });
        if (st.phase === 'horse') st.phase = 'letters';
      }
    } else if (h.state === 'lead') {
      // ahead of you through the water, waiting when you fall behind
      const goal = new THREE.Vector3(0.9, 0, Z_ROOM_END + 3.2);
      const gx = goal.x - h.pos.x, gz = goal.z - h.pos.z, gd = Math.hypot(gx, gz);
      if (gd < 0.3) ((h.state = 'rest'), (h.t = 0));
      else {
        h.yaw = turnToward(h.yaw, Math.atan2(gx, gz), 0.8, dt);
        const behind = dist; // you are behind it
        want = behind < 4.5 ? 0.8 : behind < 6.5 ? 0.35 : 0;
      }
    } else if (h.state === 'rest') {
      // it stands by the far wall, out of the way of the door, and watches you
      h.yaw = turnToward(h.yaw, dist < 6 ? towardYou : -Math.PI / 2, 0.6, dt);
    }
    h.speed += (want - h.speed) * (1 - Math.exp(-dt * 2.5));
    h.pos.x += Math.sin(h.yaw) * h.speed * dt;
    h.pos.z += Math.cos(h.yaw) * h.speed * dt;
    h.pos.x = Math.max(-ROOM_W / 2 + 0.7, Math.min(ROOM_W / 2 - 0.7, h.pos.x));
    h.pos.z = Math.max(Z_ROOM_END + 1.0, Math.min(Z_STAIR_END - 1.2, h.pos.z));
    h.obj.position.set(h.pos.x, ROOM_Y + 0.02 * Math.sin(t * 1.3), h.pos.z);
    h.obj.rotation.y = h.yaw;
    // its body, as three circles along it, is in your way
    const fx = Math.sin(h.yaw), fz = Math.cos(h.yaw);
    horseCol.forEach((c, i) => ((c.x = h.pos.x + fx * (i - 1) * 0.75), (c.z = h.pos.z + fz * (i - 1) * 0.75)));
    if (h.ready) {
      const g = Math.min(1, h.speed / 0.5);
      h.walk.weight = g;
      h.idle.weight = 1 - g;
      h.walk.timeScale = Math.max(0.3, h.speed / 0.95);
      h.mixer.update(dt);
    }
  };

  /* ═════════════ 3. the letters and the sunken doors ═════════════ */
  const src = house.letters[0];
  const doors = house.cellar.sunk.map((d, i) => {
    // hang the leaf on its hinge so it can swing open; a warm light stands behind it
    const pivot = new THREE.Group();
    pivot.position.set(-0.475, 0, 0);
    d.group.add(pivot);
    d.group.remove(d.leaf);
    d.leaf.position.x = 0.475;
    pivot.add(d.leaf);
    const glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.9, 1.5), transparent: true, opacity: 0, depthWrite: false, fog: false });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.15), glowMat);
    glow.position.set(0, 1.1, -0.08);
    d.group.add(glow);
    const front = new THREE.Vector3(Math.sin(d.ry), 0, Math.cos(d.ry));
    return { ...d, i, pivot, glow, glowMat, front, open: 0, want: 0 };
  });
  const list = LETTERS.map((def, i) => {
    const d = doors[i];
    const m = new THREE.Mesh(src.geometry, src.material.clone());
    m.material.emissive = new THREE.Color(0.5, 0.06, 0.03);
    m.material.emissiveMap = src.material.map;
    m.material.emissiveIntensity = 0;
    m.scale.setScalar(1.6);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = 0.7 * i + 0.4;
    // a step out from its door, toward the middle of the water
    const p = new THREE.Vector3(d.x, WATER + 0.006, d.z).addScaledVector(d.front, 1.1);
    p.x *= 0.7;
    m.position.copy(p);
    m.receiveShadow = true;
    group.add(m);
    return { id: def.id, def, mesh: m, state: 'water', home: p.clone(), seed: i * 1.7, k: 0, door: d };
  });
  const nextLetter = () => list.find((L) => L.state === 'water');
  const _t = new THREE.Vector3(), _f = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4();

  const readLetter = (L) => {
    st.busy = true;
    L.state = 'rising';
    L.k = 0;
    L.from = L.mesh.position.clone();
    L.fromQ = L.mesh.quaternion.clone();
    api.sound.glass(659.3, 0.04, 2);
    api.later(1.2, () =>
      api.words.say({
        title: L.def.title,
        lines: L.def.lines,
        anchor: () => L.mesh.position,
        onDone: () => {
          // the seal breaks; the letter goes down; its door under the water swings open
          L.state = 'sinking';
          L.k = 0;
          L.from = L.mesh.position.clone();
          api.sound.glass(523.3, 0.05, 3);
          L.door.want = 1;
          st.openDoor = L.door;
          st.busy = false;
          api.words.tip(ALBEDO.door, { id: 'door' + L.id, times: 1 });
        },
      }),
    );
  };

  /* ═════════════ the dream rooms ═════════════ */
  const loadModel = (id) => gltf.loadAsync(`./assets/house/models/${id}/${id}_1k.gltf`).then((g) => g.scene);
  const roomShell = (o, w, len, h) => {
    const g = new THREE.Group();
    g.position.copy(o);
    group.add(g);
    const floor = add(new THREE.Mesh(mplane(w, len, 1.28), house.floorMat), g);
    floor.rotation.x = -Math.PI / 2;
    const ceil = add(new THREE.Mesh(mplane(w, len, 2.2), house.ceilMat), g);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = h;
    for (const s of [-1, 1]) {
      const wall = add(new THREE.Mesh(mplane(len, h, 1.7), house.wallMat), g);
      wall.rotation.y = s < 0 ? Math.PI / 2 : -Math.PI / 2;
      wall.position.set((s * w) / 2, h / 2, 0);
      for (const [kind, y] of [['skirting', 0], ['chairRail', 1.0], ['cornice', h]]) {
        const m = add(new THREE.Mesh(moulding(kind, len), house.joinMat), g);
        m.position.set((s * w) / 2, y, len / 2);
        m.scale.x = -s;
      }
    }
    for (const s of [-1, 1]) {
      const end = add(new THREE.Mesh(mplane(w, h, 1.7), house.wallMat), g);
      end.position.set(0, h / 2, (-s * len) / 2);
      if (s < 0) end.rotation.y = Math.PI;
    }
    // a closed door in the wall behind you: the one you came in by
    const leaf = add(new THREE.Mesh(doorLeaf(0.95, 2.2, 0.045), house.joinMat), g);
    leaf.rotation.y = Math.PI;
    leaf.position.set(0, 0, len / 2 - 0.03);
    const cs = add(new THREE.Mesh(doorCase(0.95, 2.2), house.joinMat), g);
    cs.rotation.y = Math.PI;
    cs.position.set(0, 0, len / 2 - 0.005);
    return g;
  };

  // the secret room: a small warm room of the house, a table with a candelabrum, a painting, and a box
  const room1 = roomShell(ROOM1, 4.4, 5.6, 3.1);
  const box1 = new THREE.Group(); // the music box: its lid opens
  {
    const wood = house.joinMat;
    box1.add(new THREE.Mesh(board(0.2, 0.07, 0.13, 0, 0.035, 0, 'x'), wood));
    const lid = new THREE.Group();
    lid.position.set(0, 0.07, -0.065);
    const lm = new THREE.Mesh(board(0.21, 0.018, 0.14, 0, 0.009, 0.065, 'x'), wood);
    lid.add(lm);
    box1.add(lid);
    box1.userData.lid = lid;
    const inside = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.1), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.9, 1.2), fog: false }));
    inside.rotation.x = -Math.PI / 2;
    inside.position.y = 0.0712; // just over the box's top: the light that comes out of it
    inside.visible = false;
    box1.add(inside);
    box1.userData.inside = inside;
    box1.traverse((o) => o.isMesh && (o.castShadow = o.receiveShadow = true));
  }
  Promise.all(['ClassicConsole_01', 'brass_candleholders', 'fancy_picture_frame_01', 'side_table_tall_01'].map(loadModel)).then(([con, cand, frame, side]) => {
    const c = con.clone();
    c.scale.setScalar(0.85);
    c.position.set(0, 0, -2.5);
    room1.add(c);
    const top = 0.949 * 0.85;
    box1.position.set(0.15, top, -2.45);
    room1.add(box1);
    const cd = cand.clone();
    cd.scale.setScalar(1.2);
    cd.position.set(-0.45, top, -2.55);
    cd.traverse((o) => o.isMesh && String(o.material.name).includes('flame') && (o.visible = false));
    room1.add(cd);
    for (const [x, y] of [[-0.6, 0.33], [-0.45, 0.31], [-0.3, 0.33]]) house.candle(room1, x, top + y * 1.2 - 0.02, -2.55, 0.002, 0.3);
    const f = frame.clone();
    f.scale.setScalar(1.7);
    f.position.set(0, 1.75, -2.79);
    room1.add(f);
    const sd = side.clone();
    sd.scale.setScalar(1.1);
    sd.position.set(1.65, 0, -2.1);
    room1.add(sd);
    room1.traverse((o) => o.isMesh && (o.receiveShadow = true));
  });

  // the dream corridor: long, narrow, night; the same for the feeling and for the other role
  const room2 = roomShell(ROOM2, DREAM_HW * 2, DREAM_LEN, 3.1);
  const dreamFig = people.makeFigure(dreamMaterial(new THREE.Color(0.09, 0.1, 0.12)), gender, { neutral: true });
  dreamFig.obj.visible = false;
  dreamFig.mesh.castShadow = false;
  group.add(dreamFig.obj);
  const fig = { pos: new THREE.Vector3(), yaw: 0, speed: 0 };
  const feelings = Object.entries(ALBEDO.rooms.feeling.words).map(([k, text], i) => {
    const s = wordSprite(text);
    s.visible = false;
    group.add(s);
    return { k, s, i, mesh: s, def: {}, onPick: null };
  });
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.012, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.45, 1.2), fog: false }));
  const orbHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(1, 0.92, 0.8), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  orbHalo.scale.setScalar(0.07);
orbHalo.material.opacity = 0.22;
  orb.add(orbHalo);
  orb.visible = false;
  group.add(orb);

  const enterRoom = (L) => {
    const d = L.door;
    fadeThrough(
      () => {
        const kind = L.id;
        st.room = { i: d.i, kind, t: 0, step: 'look', L };
        api.words.clearTips?.();
        if (kind === 'room') {
          api.teleport(ROOM1.x, ROOM1.z + 2.0, 0);
          setRoam(new THREE.Vector3(ROOM1.x - 0.2, 2.2, ROOM1.z - 1.4), new THREE.Color(1.0, 0.78, 0.5), 1.2, 7);
          box1.userData.lid.rotation.x = 0;
          box1.userData.inside.visible = false;
          api.words.tip(ALBEDO.rooms.room.line, { id: 'room1', times: 1 });
        } else {
          api.teleport(ROOM2.x, ROOM2.z + DREAM_LEN / 2 - 1.4, 0);
          dreamFig.obj.visible = true;
          if (kind === 'feeling') {
            // it comes for you from the far end
            fig.pos.set(ROOM2.x, 0, ROOM2.z - DREAM_LEN / 2 + 1.0);
            fig.yaw = 0;
            setRoam(new THREE.Vector3(ROOM2.x, 2.6, ROOM2.z - DREAM_LEN / 2 + 1.5), new THREE.Color(0.55, 0.62, 0.8), 0.9, 12);
            st.room.chosen = null;
          } else {
            // the same corridor; now it goes ahead of you, and you carry something
            fig.pos.set(ROOM2.x, 0, ROOM2.z + DREAM_LEN / 2 - 4.2);
            fig.yaw = Math.PI;
            setRoam(new THREE.Vector3(ROOM2.x, 2.6, ROOM2.z), new THREE.Color(0.75, 0.72, 0.68), 0.8, 12);
            orb.visible = true;
          }
        }
      },
      null,
    );
  };
  const leaveRoom = () => {
    const R = st.room, d = R.L.door;
    fadeThrough(
      () => {
        // back in front of the door you went through, facing the water; the door shuts
        const p = new THREE.Vector3(d.x, 0, d.z).addScaledVector(d.front, 1.5);
        api.teleport(p.x, p.z, Math.atan2(-d.front.x, -d.front.z) + Math.PI);
        d.want = 0;
        st.openDoor = null;
        dreamFig.obj.visible = false;
        feelings.forEach((f) => (f.s.visible = false));
        orb.visible = false;
        st.room = null;
        setRoam(new THREE.Vector3(0, -100, 0), new THREE.Color(1, 1, 1), 0, 1);
        st.read.push(R.L.id);
        api.save.add('letters', R.L.id);
      },
      () => {
        api.vessel.react({ bloom: 0.4 });
        api.words.tip(ALBEDO.back, { id: 'back' + R.L.id, times: 1 });
        if (st.read.length >= LETTERS.length) openHall();
      },
    );
  };
  /** The text of a room, then home. */
  const roomText = (title, lines, anchor) => api.words.say({ title, lines, anchor, onDone: () => api.later(0.8, leaveRoom) });

  const updateRoom = (dt, t, player, camera) => {
    const R = st.room;
    if (!R) return;
    R.t += dt;
    if (R.kind === 'room') return;
    // the figure in the dream corridor
    const dx = player.pos.x - fig.pos.x, dz = player.pos.z - fig.pos.z, dist = Math.hypot(dx, dz);
    let want = 0;
    if (R.kind === 'feeling') {
      if (!R.chosen) {
        // it comes; the three feelings stand in the air before you; it waits at arm's length beyond them
        fig.yaw = turnToward(fig.yaw, Math.atan2(dx, dz), 2, dt);
        want = dist > 4.2 ? 0.55 : 0;
        if (dist < 6.5 && !feelings[0].s.visible) {
          camera.getWorldDirection(_f);
          feelings.forEach((f) => {
            f.s.visible = true;
            f.s.material.opacity = 1;
            f.s.position.set(player.pos.x + (f.i - 1) * 0.34, 1.62 + [0.1, 0.28, -0.04][f.i], player.pos.z - 1.9); // close together: a phone's view is narrow
          });
        }
      } else {
        const c = R.chosen;
        if (c === 'fear') fig.yaw = turnToward(fig.yaw, Math.atan2(dx, dz), 2, dt);
        if (c === 'shame') fig.yaw = turnToward(fig.yaw, Math.atan2(dx, dz) + Math.PI, 1.6, dt);
        feelings.forEach((f) => f.k !== c && (f.s.material.opacity = Math.max(0, f.s.material.opacity - dt)));
      }
    } else {
      // the other role: it goes ahead of you to the end of the corridor, then stops and turns
      const end = ROOM2.z - DREAM_LEN / 2 + 1.2;
      if (R.step === 'look') {
        if (fig.pos.z > end + 0.05) {
          fig.yaw = Math.PI;
          want = dist < 3.2 ? 1.1 : dist < 5 ? 0.6 : 0;
        } else {
          R.step = 'turned';
          api.words.tip(ALBEDO.rooms.other.give, { id: 'give', times: 1 });
        }
      } else fig.yaw = turnToward(fig.yaw, Math.atan2(dx, dz), 1.6, dt);
      // what you carry, low before you
      if (orb.visible && R.step !== 'given') {
        camera.getWorldDirection(_f);
        orb.position.copy(camera.position).addScaledVector(_f, 0.55);
        orb.position.y -= 0.24;
      }
    }
    fig.speed += (want - fig.speed) * (1 - Math.exp(-dt * 3));
    fig.pos.x += Math.sin(fig.yaw) * fig.speed * dt;
    fig.pos.z += Math.cos(fig.yaw) * fig.speed * dt;
    dreamFig.obj.position.copy(fig.pos);
    dreamFig.obj.rotation.y = fig.yaw; // the scans face +z at rest
    dreamFig.setGait(Math.min(1, fig.speed / 0.6));
    dreamFig.walk.timeScale = Math.max(0.4, fig.speed / 1.26);
    dreamFig.mixer.update(dt);
  };

  /* ═════════════ 1. the stair (i14) ═════════════ */
  // Rough damp brick close on both sides, worn treads with rounded nosings that catch the candles, candles in
  // clusters, and their light painted onto the treads and the walls (no light of their own: lights are costly).
  {
    const S = house.stair;
    const tl = new THREE.TextureLoader();
    const bt = (f, srgb) => {
      const t = tl.load('./assets/albedo/castle_brick_01_' + f);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(1.4 / 1.5, 1.4 / 1.5); // the wall's UVs are in 1.4 m; the photo covers 1.5 m
      t.anisotropy = 8;
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };
    const brick = new THREE.MeshStandardMaterial({ map: bt('diff_1k.jpg', true), normalMap: bt('nor_gl_1k.jpg'), roughnessMap: bt('rough_1k.jpg'), roughness: 1, color: new THREE.Color(0.16, 0.14, 0.12), normalScale: new THREE.Vector2(1.4, 1.4) });
    for (const w of S.walls) w.material = brick;
    // the treads: a worn, smoother top on each step and a rounded edge, one merged mesh
    const parts = [];
    for (let i = 0; i < S.steps.length; i++) {
      const st0 = S.steps[i];
      const y = st0.position.y + 0.2, z = st0.position.z, run = 0.3;
      const top = new THREE.BoxGeometry(S.sx - 0.1, 0.014, run - 0.04);
      // dished in the middle where feet have worn it
      const p = top.attributes.position;
      for (let k = 0; k < p.count; k++) if (p.getY(k) > 0) p.setY(k, p.getY(k) - 0.008 * Math.exp(-(p.getX(k) ** 2) / 0.08));
      top.computeVertexNormals();
      top.translate(0, y + 0.003, z - 0.01);
      parts.push(top);
      const nose = new THREE.CylinderGeometry(0.028, 0.028, S.sx - 0.04, 10);
      nose.rotateZ(Math.PI / 2);
      nose.translate(0, y - 0.024, z + run / 2 - 0.012);
      parts.push(nose);
    }
    const treadMat = new THREE.MeshStandardMaterial({ map: house.stoneMat.map, normalMap: house.stoneMat.normalMap, color: new THREE.Color(0.22, 0.2, 0.17), roughness: 0.42 });
    const treads = add(new THREE.Mesh(mergeGeometries(parts.map((gq) => gq.toNonIndexed())), treadMat));
    treads.castShadow = false;
    // more candles round each one already burning on the steps: clusters, as in i14 (halo on the first only)
    const R = (k) => Math.abs(Math.sin(k * 12.9898) * 43758.5453) % 1;
    const glowMat = new THREE.MeshBasicMaterial({ map: glowTex, color: new THREE.Color(0.5, 0.25, 0.09), transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    S.candles.forEach((c, i) => {
      for (let k = 0; k < 2; k++) {
        const dx = (R(i * 7 + k) - 0.5) * 0.16, dz = (R(i * 13 + k) - 0.5) * 0.14;
        const x = Math.max(-S.sx / 2 + 0.05, Math.min(S.sx / 2 - 0.05, c.x + dx));
        const fl = house.candle(group, x, c.y, c.z + dz, 0.04 + R(i * 3 + k) * 0.1, 0.2);
        fl.scale.multiplyScalar(0.7); // smaller flames, or the bloom of so many fills the well with milk
        house.flames[house.flames.length - 1].halo.visible = false;
      }
      // its light, painted: a warm pool on the tread and a glow up the wall beside it
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), glowMat);
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(c.x * 0.6, c.y + 0.012, c.z);
      group.add(pool);
      const side = Math.sign(c.x) || 1;
      const wash = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.1), glowMat);
      wash.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      wash.position.set(side * (S.sx / 2 - 0.012), c.y + 0.35, c.z);
      group.add(wash);
      api.noWaterMirror?.([pool, wash]);
    });
  }

  /* ═════════════ the flooded corridor (i15, iflood) ═════════════ */
  // The cellar is dressed as a corridor of the house gone under: papered walls, panelling down into the
  // water, doors in the walls, a flat ceiling with a chandelier. The stone vault above is hidden.
  const CROOF = WATER + 3.5;
  {
    house.cellar.vault.forEach((m) => (m.visible = false));
    const len = Z_STAIR_END - Z_ROOM_END, mid = (Z_STAIR_END + Z_ROOM_END) / 2, hw = ROOM_W / 2 - 0.012;
    const paper = house.wallMat.clone();
    paper.color = new THREE.Color(0.3, 0.27, 0.22); // damp, darkened
    const ceilP = house.ceilMat.clone();
    ceilP.color = new THREE.Color(0.18, 0.16, 0.13);
    const wood = house.panelMat.clone();
    const topW = ROOM_Y + WAINSCOT;
    for (const s of [-1, 1]) {
      const rot = s < 0 ? Math.PI / 2 : -Math.PI / 2;
      const up = add(new THREE.Mesh(mplane(len, CROOF - topW, 1.7), paper));
      up.rotation.y = rot;
      up.position.set(s * hw, (topW + CROOF) / 2, mid);
      const lo = add(new THREE.Mesh(mplane(len, WAINSCOT, 0.9), wood));
      lo.rotation.y = rot;
      lo.position.set(s * hw, ROOM_Y + WAINSCOT / 2, mid);
      const BAY = 0.75, n = Math.floor(len / BAY);
      const bays = new THREE.InstancedMesh(wainscotBay(BAY, WAINSCOT), wood, n);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot), one = new THREE.Vector3(1, 1, 1);
      for (let k = 0; k < n; k++) bays.setMatrixAt(k, m4.compose(new THREE.Vector3(s * (hw - 0.002), ROOM_Y, Z_STAIR_END - (k + 0.5) * BAY), q, one));
      bays.instanceMatrix.needsUpdate = true;
      bays.receiveShadow = true;
      bays.frustumCulled = false;
      group.add(bays);
      for (const [kind, y] of [['chairRail', topW], ['cornice', CROOF]]) {
        const m = add(new THREE.Mesh(moulding(kind, len), wood));
        m.position.set(s * hw, y, Z_STAIR_END);
        m.scale.x = -s;
      }
      // closed doors in the walls, the water up to their middle rail
      for (const z of s < 0 ? [Z_STAIR_END - 5.0, Z_STAIR_END - 11.4] : [Z_STAIR_END - 2.4, Z_STAIR_END - 9.0, Z_STAIR_END - 12.6]) {
        const leaf = add(new THREE.Mesh(doorLeaf(0.95, 2.2, 0.045), house.joinMat));
        leaf.rotation.y = rot;
        leaf.position.set(s * (hw - 0.03), ROOM_Y + 0.15, z);
        const cs = add(new THREE.Mesh(doorCase(0.95, 2.2), house.joinMat));
        cs.rotation.y = rot;
        cs.position.set(s * hw, ROOM_Y + 0.15, z);
      }
    }
    // papered end walls round the stair's opening and round the arch
    const SX = 0.86 + 0.5;
    for (const s of [-1, 1]) {
      const w = (ROOM_W - SX) / 2;
      const m = add(new THREE.Mesh(mplane(w, CROOF - WATER + 0.4, 1.7), paper));
      m.rotation.y = Math.PI;
      m.position.set(s * (SX / 2 + w / 2), (WATER - 0.4 + CROOF) / 2, Z_STAIR_END - 0.012);
      const w2 = (ROOM_W - ARCH_W) / 2;
      const e = add(new THREE.Mesh(mplane(w2, CROOF - WATER + 0.4, 1.7), paper));
      e.position.set(s * (ARCH_W / 2 + w2 / 2), (WATER - 0.4 + CROOF) / 2, Z_ROOM_END + 0.012);
    }
    const over = add(new THREE.Mesh(mplane(ARCH_W, CROOF - (ROOM_Y + ARCH_H), 1.7), paper));
    over.position.set(0, (ROOM_Y + ARCH_H + CROOF) / 2, Z_ROOM_END + 0.012);
    const arc = add(new THREE.Mesh(doorCase(ARCH_W, ARCH_H), house.joinMat));
    arc.position.set(0, ROOM_Y, Z_ROOM_END + 0.01);
    const ceil = add(new THREE.Mesh(mplane(ROOM_W, len, 2.2), ceilP));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, CROOF, mid);
    // a chandelier over the water (the house's own, once the dressing has hung it), and its light
    // (no light of its own: every extra light costs on every pixel; its candles, their halos and the water's mirror carry it)
    const hang = (tries) => {
      const src = house.chandeliers[1];
      const model = src && src.children.find((c) => c.isGroup || c.type === 'Object3D' || (c.children?.length && !c.isMesh));
      if (!model && tries > 0) return api.later(2, () => hang(tries - 1));
      const c = src.clone(true);
      c.position.set(0, CROOF - 1.05 + 0.0, mid + 1.5);
      c.scale.setScalar(0.85);
      group.add(c);
      api.noWaterMirror?.([c]); // its flames are mirrored already by the candles' glow on the water
    };
    hang(5);
  }

  /* ═════════════ 4. the oculus hall ═════════════ */
  // the cellar's end wall comes down; in its place a wall with an arch, a door in it, and steps up behind
  house.cellar.endW.visible = false;
  const CEIL = house.cellar.CEIL, wallH = CEIL - ROOM_Y;
  {
    const side = (ROOM_W - ARCH_W) / 2;
    for (const s of [-1, 1]) {
      const m = add(new THREE.Mesh(mplane(side, wallH, 1.4), stone));
      m.position.set(s * (ARCH_W / 2 + side / 2), ROOM_Y + wallH / 2, Z_ROOM_END);
    }
    const lintel = add(new THREE.Mesh(mplane(ARCH_W, wallH - ARCH_H, 1.4), stone));
    lintel.position.set(0, ROOM_Y + ARCH_H + (wallH - ARCH_H) / 2, Z_ROOM_END);
    // the passage: steps up out of the water, between stone cheeks
    for (let i = 0; i < STEPS_UP; i++) box(ARCH_W, (i + 1) * STEP_RISE, STEP_RUN, stone, 0, ROOM_Y + ((i + 1) * STEP_RISE) / 2, Z_ROOM_END - STEP_RUN * (i + 0.5));
    for (const s of [-1, 1]) box(0.3, ARCH_H + 1, STEPS_UP * STEP_RUN, stone, s * (ARCH_W / 2 + 0.15), ROOM_Y + (ARCH_H + 1) / 2, Z_ROOM_END - (STEPS_UP * STEP_RUN) / 2);
    box(ARCH_W + 0.6, 0.3, STEPS_UP * STEP_RUN, stone, 0, ROOM_Y + ARCH_H + 0.15, Z_ROOM_END - (STEPS_UP * STEP_RUN) / 2);
  }
  // an old door shuts the arch until the three letters are read
  const hallDoor = new THREE.Group();
  hallDoor.position.set(-ARCH_W / 2 + 0.02, ROOM_Y, Z_ROOM_END - 0.05);
  const hdLeaf = new THREE.Mesh(doorLeaf(ARCH_W - 0.04, ARCH_H - 0.02, 0.06, true), house.joinMat);
  hdLeaf.position.x = (ARCH_W - 0.04) / 2;
  hdLeaf.castShadow = hdLeaf.receiveShadow = true;
  hallDoor.add(hdLeaf);
  group.add(hallDoor);
  let hallDoorK = 0;
  const openHall = () => {
    st.archOpen = true;
    st.phase = 'hall';
    api.sound.glass(261.6, 0.08, 6);
    api.later(1.5, () => api.words.tip(ALBEDO.hallOpen, { id: 'hallOpen', times: 1 }));
  };

  const hallStart = group.children.length; // everything added from here to the Other is the hall (hidden until you can see it)
  // the hall: tall, narrow, ruined, wet underfoot
  const wet = stone.clone();
  wet.roughness = 0.32;
  wet.color = new THREE.Color(0.3, 0.29, 0.27);
  // the hall's own stone: darker and browner than the cellar's (i13a, i13b)
  const hallStone = stone.clone();
  hallStone.color = new THREE.Color(0.42, 0.39, 0.35);
  const hallMid = (HALL_Z0 + HALL_Z1) / 2;
  {
    // the floor: broken flagstones, some tilted, some gone, black water between them (the water is the house's,
    // so it mirrors the statue and the light as the cellar's does)
    {
      const slabs = [];
      const R = (k) => Math.abs(Math.sin(k * 78.233 + 1.7) * 43758.5453) % 1;
      let k = 0;
      for (let z = HALL_Z0 - 0.05; z > HALL_Z1 + 0.05; z -= 0.78)
        for (let x = -HALL_HW + 0.05; x < HALL_HW - 0.05; x += 0.92) {
          k++;
          if (R(k) < 0.22 && Math.abs(x) < HALL_HW - 0.9) continue; // a slab gone: water
          const w = 0.86 - R(k + 1) * 0.08, d = 0.72 - R(k + 2) * 0.08;
          const b = new THREE.BoxGeometry(w, 0.12, d);
          b.rotateX((R(k + 3) - 0.5) * 0.05);
          b.rotateZ((R(k + 4) - 0.5) * 0.05);
          b.rotateY((R(k + 5) - 0.5) * 0.08);
          b.translate(x + w / 2, HALL_Y - 0.06 + (R(k + 6) - 0.5) * 0.025, z - d / 2);
          slabs.push(b.toNonIndexed());
        }
      add(new THREE.Mesh(mergeGeometries(slabs), wet));
      const pool = add(new THREE.Mesh(mplane(HALL_HW * 2, HALL_LEN, 3.0), house.waterMat));
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(0, WATER, hallMid);
      pool.receiveShadow = false;
    }
    for (const s of [-1, 1]) {
      const wl = add(new THREE.Mesh(mplane(HALL_LEN, HALL_H, 1.6), hallStone));
      wl.rotation.y = s < 0 ? Math.PI / 2 : -Math.PI / 2;
      wl.position.set(s * HALL_HW, HALL_Y + HALL_H / 2, hallMid);
      // the ribs of arches across the vault, in the dark overhead
      for (let z = HALL_Z0 - 1.5; z > HALL_Z1 + 1; z -= 3.2) {
        if (s > 0) {
          const rib = add(new THREE.Mesh(new THREE.TorusGeometry(HALL_HW - 0.3, 0.18, 8, 28, Math.PI), stone));
          rib.position.set(0, HALL_Y + HALL_H - 2.6, z);
          rib.scale.y = 1.1;
        }
      }
    }
    // an arcade down each side (i13a): fluted columns on bases, round arches between them at two thirds of the
    // height, a cornice over them and a second, smaller order above; one merged mesh
    {
      const parts = [];
      const fluted = (r, h) => {
        const gq = new THREE.CylinderGeometry(r, r * 1.08, h, 48, 4, true);
        const p = gq.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 - 0.05 * Math.pow(Math.abs(Math.cos(a * 8)), 0.6);
          p.setX(i, x * k);
          p.setZ(i, z * k);
        }
        gq.computeVertexNormals();
        return gq;
      };
      const put = (gq, x, y, z, rx = 0, ry = 0) => {
        gq.rotateX(rx);
        gq.rotateY(ry);
        gq.translate(x, y, z);
        parts.push(gq.index ? gq : gq);
      };
      const COLH = 7.6, R = 0.3, STEP = 3.2;
      const zs = [];
      for (let z = HALL_Z0 - 1.5; z > HALL_Z1 + 1; z -= STEP) zs.push(z);
      for (const s2 of [-1, 1]) {
        const x = s2 * (HALL_HW - 0.42);
        for (const z of zs) {
          put(new THREE.BoxGeometry(0.86, 0.36, 0.86), x, HALL_Y + 0.18, z);
          put(new THREE.TorusGeometry(R + 0.07, 0.07, 8, 32), x, HALL_Y + 0.43, z, Math.PI / 2);
          put(fluted(R, COLH - 0.9), x, HALL_Y + 0.5 + (COLH - 0.9) / 2, z);
          put(new THREE.CylinderGeometry(R + 0.2, R + 0.02, 0.4, 32), x, HALL_Y + COLH - 0.2, z);
          put(new THREE.BoxGeometry(0.9, 0.16, 0.9), x, HALL_Y + COLH + 0.08, z);
          // the upper order: a thinner column over each one
          put(fluted(R * 0.7, 1.9), x, HALL_Y + COLH + 1.25, z);
        }
        // the arches between the columns, in the plane of the wall
        for (let i = 0; i < zs.length - 1; i++) {
          const zc = (zs[i] + zs[i + 1]) / 2, rr = STEP / 2 - 0.05;
          put(new THREE.TorusGeometry(rr, 0.2, 8, 24, Math.PI), x, HALL_Y + COLH + 0.16, zc, 0, Math.PI / 2);
        }
        // the cornice over the arcade, and one under the vault
        put(new THREE.BoxGeometry(0.5, 0.3, HALL_LEN), s2 * (HALL_HW - 0.25), HALL_Y + COLH + STEP / 2 + 0.5, (HALL_Z0 + HALL_Z1) / 2);
        put(new THREE.BoxGeometry(0.4, 0.25, HALL_LEN), s2 * (HALL_HW - 0.2), HALL_Y + HALL_H - 0.4, (HALL_Z0 + HALL_Z1) / 2);
      }
      const merged = mergeGeometries(parts.map((gq) => (gq.index ? gq.toNonIndexed() : gq)).map((gq) => {
        for (const k of Object.keys(gq.attributes)) if (!['position', 'normal', 'uv'].includes(k)) gq.deleteAttribute(k);
        return gq;
      }));
      const arcade = add(new THREE.Mesh(merged, hallStone));
      arcade.castShadow = false;
      colliders.push(...zs.flatMap((z) => [-1, 1].map((s2) => ({ x: s2 * (HALL_HW - 0.42), z, r: 0.45 }))));
    }
    // the front wall of the hall, round the passage
    const fw = (HALL_HW * 2 - ARCH_W - 0.6) / 2;
    for (const s of [-1, 1]) {
      const m = add(new THREE.Mesh(mplane(fw, HALL_H, 1.6), hallStone));
      m.rotation.y = Math.PI;
      m.position.set(s * (ARCH_W / 2 + 0.3 + fw / 2), HALL_Y + HALL_H / 2, HALL_Z0);
    }
    const top = add(new THREE.Mesh(mplane(ARCH_W + 0.6, HALL_H - (ARCH_H - 1.0), 1.6), stone));
    top.rotation.y = Math.PI;
    top.position.set(0, HALL_Y + (ARCH_H - 1.0) + (HALL_H - (ARCH_H - 1.0)) / 2, HALL_Z0);
    // the far wall, with a low dark arch: a stair going down
    const DW = 1.4, DH = 2.3;
    const ew = (HALL_HW * 2 - DW) / 2;
    for (const s of [-1, 1]) {
      const m = add(new THREE.Mesh(mplane(ew, HALL_H, 1.6), hallStone));
      m.position.set(s * (DW / 2 + ew / 2), HALL_Y + HALL_H / 2, HALL_Z1);
    }
    const lt = add(new THREE.Mesh(mplane(DW, HALL_H - DH, 1.6), stone));
    lt.position.set(0, HALL_Y + DH + (HALL_H - DH) / 2, HALL_Z1);
    for (let i = 0; i < 10; i++) box(DW, 0.2, 0.3, stone, 0, HALL_Y - 0.1 - i * 0.2, HALL_Z1 - 0.15 - i * 0.3);
    for (const s of [-1, 1]) box(0.3, DH + 3, 3.2, stone, s * (DW / 2 + 0.15), HALL_Y + DH / 2 - 1.5, HALL_Z1 - 1.6);
    box(DW + 0.6, 0.3, 3.2, stone, 0, HALL_Y + DH + 0.15, HALL_Z1 - 1.6);
    const dark = new THREE.Mesh(new THREE.PlaneGeometry(DW, DH + 3), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    dark.position.set(0, HALL_Y + DH / 2 - 1.5, HALL_Z1 - 3.1);
    group.add(dark);
    // the vault, with the round opening over the column
    const ceil = add(new THREE.Mesh(new THREE.RingGeometry(1.05, 14, 48, 1), stone));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, HALL_Y + HALL_H, COLUMN_Z);
    // rubble along the foot of the walls, and puddles that hold the light
    const rub = new THREE.IcosahedronGeometry(1, 0);
    for (let i = 0; i < 26; i++) {
      const s = i % 2 ? 1 : -1, r = 0.08 + Math.random() * 0.22;
      const m = new THREE.Mesh(rub, stone);
      m.scale.set(r, r * 0.6, r * 1.2);
      m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      m.position.set(s * (HALL_HW - 0.6 - Math.random() * 0.4), HALL_Y + r * 0.25, HALL_Z0 - 0.8 - Math.random() * (HALL_LEN - 2));
      add(m);
    }
    // candles on the floor round the column's foot
    // candles on the lowest step of the column's base
    for (const [a0, h] of [[0.5, 0.12], [0.75, 0.07], [2.4, 0.15], [2.7, 0.08], [-0.3, 0.1]]) house.candle(group, Math.sin(a0) * 0.92, HALL_Y + 0.2, COLUMN_Z + Math.cos(a0) * 0.92, h, 0.24);
  }

  // the statue on its column under the oculus (gallery.js: the gold, and the withdrawing of it)
  const who = gender === 'woman' ? 'god' : 'goddess';
  const gallery = buildGallery(scene, people, house, glowTex, ROOM_W, renderer, [{ who, x: 0, z: COLUMN_Z, y: COLUMN_TOP, face: new THREE.Vector3(0, 0, 1), column: { from: HALL_Y, tall: true }, near: 11, look: 0.985 }]);
  // the opening, and the shaft of pale light that falls through it onto the statue
  const skyTop = HALL_Y + HALL_H;
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.05, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.42, 0.45, 0.5), fog: false })); // pale sky; brighter blooms the whole vault
  disc.rotation.x = Math.PI / 2;
  disc.position.set(0, skyTop - 0.01, COLUMN_Z);
  group.add(disc);
  // the opening's moulded rim, two rings, catching the daylight (i13a)
  for (const [r, t, dy] of [[1.12, 0.11, -0.08], [1.34, 0.08, -0.22]]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r, t, 10, 48), hallStone);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, skyTop + dy, COLUMN_Z);
    group.add(rim);
  }
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
        // brightest between the opening and the statue, fading below it toward the water
        float k = smoothstep(-0.5, 0.5, vP.y / ${HALL_H.toFixed(1)}) * 0.9 + 0.1;
        float edge = 1.0 - abs(dot(normalize(vec3(vP.x, 0.0, vP.z)), normalize(cameraPosition - vW)));
        float dust = 0.8 + 0.2 * h(floor(vP.xz * 40.0 + vec2(0.0, time * 2.0)));
        // looking up the shaft you see through its whole length: it must not burn white
        float along = abs(normalize(cameraPosition - vW).y);
        gl_FragColor = vec4(vec3(0.016, 0.0175, 0.02) * k * dust * (1.0 - edge * 0.9) * (1.0 - 0.85 * along), 1.0);
      }`,
  });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 1.0, HALL_H, 40, 1, true), shaftMat);
  shaft.position.set(0, HALL_Y + HALL_H / 2, COLUMN_Z);
  group.add(shaft);
  const spot = new THREE.SpotLight(new THREE.Color(0.82, 0.88, 1.0), 9, HALL_H + 4, 0.13, 0.5, 2); // the statue is the one lit thing (i13a)
  spot.position.set(0, skyTop, COLUMN_Z + 0.3);
  spot.target.position.set(0, COLUMN_TOP + 1.2, COLUMN_Z);
  group.add(spot, spot.target);
  // the daylight from the opening spreads, faintly, down the walls and the columns: a glow in the stone itself
  // rather than another light (an extra light cost 10 to 20 frames a second)
  // (no glow in the stone: in i13 everything but the column, the statue and the shaft is near black)
  wet.color = new THREE.Color(0.2, 0.19, 0.17);
  wet.roughness = 0.22;

  // gather the hall into its own group, so it is not drawn (nor mirrored in the water) from the cellar
  const hallG = new THREE.Group();
  for (const c of group.children.slice(hallStart)) hallG.add(c);
  group.add(hallG);
  // lights stay where they are (hiding one changes the number of lights and rebuilds every shader)
  for (const c of [...hallG.children]) if (c.isLight || c === spot.target) group.add(c);

  /* ═════════════ the Other ═════════════ */
  const otherWho = gender === 'woman' ? 'man' : 'woman';
  const scanTex = (f, srgb) => {
    const t = new THREE.TextureLoader().load(`./assets/people/${otherWho === 'man' ? 'nathan' : 'sophia'}/${f}`);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const other = people.makeFigure(new THREE.MeshStandardMaterial({ map: scanTex('dif.jpg', true), normalMap: scanTex('norm.jpg'), roughness: 0.9, color: new THREE.Color(0.045, 0.04, 0.036) }), otherWho, { neutral: true }); // dark: seen by their own small light
  other.mesh.castShadow = false;
  group.add(other.obj);
  const oth = { pos: new THREE.Vector3(0.2, HALL_Y, OTHER_Z), yaw: 0, speed: 0, state: 'far', t: 0, told: false };
  const otherLight = house.farLight; // their own light, held up
  const raise = () => {
    // the right arm held up and forward, as one holds up a lamp to see by (after the walk or stand has set the pose)
    const b = other.bones;
    const up = b.upperarm_r, lo = b.lowerarm_r;
    if (!up || !lo) return;
    const right = new THREE.Vector3(Math.cos(oth.yaw), 0, -Math.sin(oth.yaw)); // the figure's right, in the world
    up.parent.updateMatrixWorld(true);
    const q = new THREE.Quaternion().setFromAxisAngle(right, -1.25);
    const pw = up.parent.getWorldQuaternion(new THREE.Quaternion());
    up.quaternion.premultiply(pw.clone().invert().multiply(q).multiply(pw));
    lo.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -0.5));
  };
  const updateOther = (dt, t, player) => {
    const O = oth;
    O.t += dt;
    const dx = player.pos.x - O.pos.x, dz = player.pos.z - O.pos.z, dist = Math.hypot(dx, dz);
    const toYou = Math.atan2(dx, dz);
    let want = 0;
    const inHall = player.pos.z < HALL_Z0 + 0.5;
    if (O.state === 'far') {
      // until the gold is withdrawn they keep their distance: come nearer than nine metres and they go further
      if (inHall && dist < 9 && O.pos.z > HALL_Z1 + 1.4) {
        O.yaw = turnToward(O.yaw, Math.PI, 2, dt);
        want = 0.9;
        if (!O.told) ((O.told = true), api.words.tip(ALBEDO.otherRecedes, { id: 'otherRecedes', times: 1 }));
      } else O.yaw = turnToward(O.yaw, toYou, 1.2, dt);
      if (st.gold) ((O.state = 'wait'), (O.t = 0));
    } else if (O.state === 'wait') {
      // they stop, turn to you, and wait
      O.yaw = turnToward(O.yaw, toYou, 1.0, dt);
      if (dist < 3.4 && st.phase === 'gold') startBird();
    } else if (O.state === 'lead') {
      // down the stair at the end of the hall, looking back for you
      const gz = HALL_Z1 - 3.0;
      if (O.pos.z > gz) {
        O.yaw = turnToward(O.yaw, Math.atan2(0 - O.pos.x, gz - O.pos.z), 1.5, dt);
        want = dist < 4.5 ? 0.7 : 0.15;
      } else O.state = 'gone';
    }
    O.speed += (want - O.speed) * (1 - Math.exp(-dt * 2.5));
    O.pos.x += Math.sin(O.yaw) * O.speed * dt;
    O.pos.z += Math.cos(O.yaw) * O.speed * dt;
    // down the steps beyond the far wall
    O.pos.y = O.pos.z < HALL_Z1 ? HALL_Y - Math.min(2.0, ((HALL_Z1 - O.pos.z) / 0.3) * 0.2) : HALL_Y;
    other.obj.position.copy(O.pos);
    other.obj.rotation.y = O.yaw;
    other.setGait(Math.min(1, O.speed / 0.6));
    other.walk.timeScale = Math.max(0.4, O.speed / 1.26);
    other.mixer.update(dt);
    raise();
    // the light in the raised hand
    const hand = other.bones.hand_r;
    if (hand) hand.getWorldPosition(otherLight.position);
    else otherLight.position.set(O.pos.x, O.pos.y + 1.9, O.pos.z);
    otherLight.userData.dim = O.state === 'gone' ? Math.max(0, (otherLight.userData.dim ?? 1) - dt * 0.5) : 0.8;
  };

  /* ═════════════ 6. the white bird ═════════════ */
  const bird = { obj: new THREE.Group(), on: false, t: 0, ready: false, path: null };
  bird.obj.visible = false;
  group.add(bird.obj);
  gltf.loadAsync('./assets/albedo/bird.glb').then((g) => {
    const model = g.scene;
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.frustumCulled = false;
      const m = (o.material = o.material.clone());
      // white: the bird's own feathers, bleached to white and lit a little from within
      m.onBeforeCompile = (sh) => {
        sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\nfloat lum = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));\ndiffuseColor.rgb = vec3(0.62 + 0.38 * smoothstep(0.0, 0.6, lum));');
      };
      m.customProgramCacheKey = () => 'st2g-white-bird';
      m.emissive = new THREE.Color(0.1, 0.1, 0.105); // it carries its own pale light, as in i21
    });
    const inner = new THREE.Group();
    inner.add(model);
    inner.scale.setScalar(1.9); // the white bird of i21, large enough to read across the hall
    bird.inner = inner;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(0.9, 0.92, 1.0), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    halo.scale.setScalar(0.75);
    halo.material.opacity = 0.16;
    bird.obj.add(halo);
    bird.obj.add(inner);
    // the skin draws the bird several metres from its bones (the file's own offset): measure where the
    // skinned vertices land, and move the model so the bird is on its path
    bird.mixer = new THREE.AnimationMixer(model);
    if (g.animations[0]) bird.mixer.clipAction(g.animations[0]).play();
    bird.mixer.update(0); // the offset is in the animation's root, so measure on an animated frame
    {
      bird.obj.position.set(0, 0, 0);
      bird.obj.rotation.set(0, 0, 0);
      bird.obj.updateMatrixWorld(true);
      let sk = null;
      model.traverse((o) => o.isSkinnedMesh && !sk && (sk = o));
      if (sk) {
        sk.skeleton.update();
        const v = new THREE.Vector3(), bb = new THREE.Box3(), pos = sk.geometry.attributes.position;
        for (let i = 0; i < pos.count; i += 3) bb.expandByPoint(sk.getVertexPosition(i, v).applyMatrix4(sk.matrixWorld));
        inner.position.sub(bb.getCenter(v));
      }
    }
    bird.ready = true;
  });
  const startBird = () => {
    st.phase = 'bird';
    bird.on = true;
    bird.t = 0;
    bird.seg = 'down';
    bird.obj.visible = true;
    // down through the oculus, twice round the statue, then across to the Other's raised light
    const P = [];
    for (let i = 0; i <= 24; i++) {
      const k = i / 24, a = k * Math.PI * 4;
      P.push(new THREE.Vector3(Math.sin(a) * 1.5 * k, skyTop - 0.3 - k * (skyTop - 0.3 - (COLUMN_TOP + 1.6)), COLUMN_Z + Math.cos(a) * 1.5 * k));
    }
    const lp = otherLight.position;
    P.push(new THREE.Vector3(lp.x * 0.5, lp.y + 1.1, (lp.z + COLUMN_Z) / 2), new THREE.Vector3(lp.x, lp.y + 0.22, lp.z));
    bird.path = new THREE.CatmullRomCurve3(P);
    api.sound.glass(1046.5, 0.05, 5);
  };
  const BIRD_DOWN = 11, BIRD_PERCH = 3.5, BIRD_AWAY = 4;
  const updateBird = (dt) => {
    if (!bird.on) return;
    bird.t += dt;
    if (bird.seg === 'down' || bird.seg === 'away') {
      const k = Math.min(1, bird.t / (bird.seg === 'down' ? BIRD_DOWN : BIRD_AWAY));
      const p = bird.path.getPointAt(k), ahead = bird.path.getPointAt(Math.min(1, k + 0.01));
      bird.obj.position.copy(p);
      if (ahead.distanceToSquared(p) > 1e-8) bird.obj.lookAt(ahead);
      bird.mixer?.update(dt);
      if (k >= 1 && bird.seg === 'down') {
        // it lands on the Other's raised hand, by the light: the flask goes clear white
        bird.seg = 'perch';
        bird.t = 0;
        st.phase = 'down';
        api.vessel.react({ bloom: 0.6, still: true }); // the flask stays in its corner: the bird is what you look at
        api.words.whisper(ALBEDO.bird, 2.4);
      } else if (k >= 1) ((bird.on = false), (bird.obj.visible = false));
    } else if (bird.seg === 'perch') {
      // it sits on the hand, its wings slowing and settling, facing you
      bird.obj.position.copy(otherLight.position).y += 0.2;
      bird.obj.lookAt(camPos.x, bird.obj.position.y, camPos.z);
      // it holds its wings up and open (the wide frame of the beat, held), lit from the opening above
      if (bird.mixer && bird.t < 0.05) {
        const act = bird.mixer._actions[0];
        if (act) ((act.time = 15 / 24), (act.timeScale = 0));
      }
      bird.mixer?.update(dt);
      if (bird.t > BIRD_PERCH) {
        // then away down the stair at the end of the hall, and the Other follows it
        bird.seg = 'away';
        bird.t = 0;
        if (bird.mixer?._actions[0]) bird.mixer._actions[0].timeScale = 1;
        const p0 = bird.obj.position.clone();
        bird.path = new THREE.CatmullRomCurve3([p0, p0.clone().add(new THREE.Vector3(0, 0.6, -0.8)), new THREE.Vector3(0, HALL_Y + 1.8, HALL_Z1 + 0.6), new THREE.Vector3(0, HALL_Y - 0.6, HALL_Z1 - 3.2)]);
        oth.state = 'lead';
        api.later(4, () => api.words.tip(ALBEDO.follow, { id: 'followDown', times: 1 }));
      }
    }
  };
  const camPos = new THREE.Vector3();

  /* ═════════════ where you can walk, and the floor under you ═════════════ */
  house.ext.floorAt = (x, z) => {
    if (z > 100) return 0; // the dream rooms
    if (z < Z_ROOM_END && st.archOpen) {
      if (z > HALL_Z0) return ROOM_Y + STEP_RISE * Math.min(STEPS_UP, Math.floor((Z_ROOM_END - z) / STEP_RUN) + 1);
      if (z < HALL_Z1) return HALL_Y - Math.min(2.0, Math.floor((HALL_Z1 - z) / 0.3 + 1) * 0.2);
      return HALL_Y;
    }
    return null;
  };
  house.ext.collide = (p, r) => {
    if (p.z > 100) {
      // inside whichever dream room you are in
      const R = st.room;
      const o = R?.kind === 'room' ? ROOM1 : ROOM2, hw = R?.kind === 'room' ? 2.2 : DREAM_HW, hl = R?.kind === 'room' ? 2.8 : DREAM_LEN / 2;
      p.x = Math.max(o.x - hw + r, Math.min(o.x + hw - r, p.x));
      p.z = Math.max(o.z - hl + r + (R?.kind === 'room' ? 0.35 : 0), Math.min(o.z + hl - r, p.z));
      // the figure in the dream corridor stands at arm's length
      if (R && R.kind !== 'room') {
        const fx = p.x - fig.pos.x, fz = p.z - fig.pos.z, fd = Math.hypot(fx, fz), fr = 0.75;
        if (fd < fr && fd > 1e-4) ((p.x = fig.pos.x + (fx / fd) * fr), (p.z = fig.pos.z + (fz / fd) * fr));
      }
      return true;
    }
    // the horse will not let you past until it leads
    if (horse.state !== 'lead' && horse.state !== 'rest' && p.z < Z_STAIR_END) p.z = Math.max(horse.pos.z + (horse.state === 'wait' ? 3.8 : 1.5), p.z);
    if (st.archOpen && (p.z < Z_ROOM_END - 0.05 || (p.z < Z_ROOM_END + r + 0.3 && Math.abs(p.x) < ARCH_W / 2 - 0.15))) {
      // in the hall, the front wall stands either side of the passage
      if (p.z <= HALL_Z0 && p.z > HALL_Z0 - r && Math.abs(p.x) > ARCH_W / 2 - r) p.z = HALL_Z0 - r;
      if (p.z > HALL_Z0) p.x = Math.max(-ARCH_W / 2 + r, Math.min(ARCH_W / 2 - r, p.x));
      else {
        p.x = Math.max(-HALL_HW + 0.45 + r, Math.min(HALL_HW - 0.45 - r, p.x));
        // the stair down at the end opens only when the Other has gone down it
        const deepest = oth.state === 'lead' || oth.state === 'gone' ? HALL_Z1 - 2.6 : HALL_Z1 + r + 0.2;
        if (p.z < HALL_Z1 + 0.2) p.x = Math.max(-0.55, Math.min(0.55, p.x));
        p.z = Math.max(deepest, p.z);
        // until the gold is withdrawn the Other keeps their distance: you cannot come within six metres
        if (!st.gold) p.z = Math.max(p.z, oth.pos.z + 6);
        // round the column
        const cx = p.x, cz = p.z - COLUMN_Z, cd = Math.hypot(cx, cz), cr = 0.95 + r; // the column's stepped base
        if (cd < cr && cd > 1e-4) ((p.x = (cx / cd) * cr), (p.z = COLUMN_Z + (cz / cd) * cr));
      }
      return true;
    }
    return false;
  };

  /* ═════════════ what you can pick ═════════════ */
  const inView = (camera, pos, reach, cone) => {
    camera.getWorldDirection(_f);
    _t.copy(pos).sub(camera.position);
    const d = _t.length();
    if (d > reach) return Infinity;
    const a = Math.acos(Math.min(1, _t.dot(_f) / d));
    return a < Math.max(cone, 0.2 / d) ? a : Infinity;
  };
  const pickBox = { mesh: box1, def: {}, onPick: () => {
    st.busy = true;
    const lid = box1.userData.lid;
    st.room.step = 'opened';
    // it opens, and plays
    let k = 0;
    const open = () => {
      k = Math.min(1, k + 0.05);
      lid.rotation.x = -1.6 * k;
      if (k < 1) requestAnimationFrame(open);
    };
    open();
    box1.userData.inside.visible = true;
    [523.3, 659.3, 784, 659.3, 587.3, 523.3, 392, 523.3].forEach((f, i) => api.later(0.4 + i * 0.42, () => api.sound.glass(f, 0.035, 2.2)));
    const R = ALBEDO.rooms.room;
    api.later(1.2, () => roomText(R.title, R.lines, () => box1.getWorldPosition(new THREE.Vector3())));
  } };
  feelings.forEach((f) => (f.onPick = () => {
    st.busy = true;
    st.room.chosen = f.k;
    const C = { fear: [0.35, 0.45, 0.8, 0.6], shame: [0.5, 0.42, 0.4, 0.35], relief: [1.0, 0.78, 0.52, 1.3] }[f.k];
    setRoam(roamLight.position, new THREE.Color(C[0], C[1], C[2]), C[3], 12);
    api.sound.glass({ fear: 220, shame: 261.6, relief: 392 }[f.k], 0.05, 3);
    const F = ALBEDO.rooms.feeling;
    api.later(1.6, () => roomText(F.title, F.lines[f.k], () => fig.pos.clone().setY(1.7)));
  }));
  const figPick = { mesh: { position: new THREE.Vector3() }, def: {}, onPick: () => {
    st.busy = true;
    st.room.step = 'given';
    // what you carried goes into its hands, and it lights up a little
    const from = orb.position.clone(), to = fig.pos.clone().setY(1.15);
    let k = 0;
    const fly = () => {
      k = Math.min(1, k + 0.025);
      orb.position.lerpVectors(from, to, k * k * (3 - 2 * k));
      if (k < 1) requestAnimationFrame(fly);
    };
    fly();
    dreamFig.mesh.material.userData.rim.value.setRGB(0.32, 0.28, 0.2);
    api.sound.glass(523.3, 0.05, 4);
    const O = ALBEDO.rooms.other;
    api.later(2.2, () => roomText(O.title, O.lines, () => fig.pos.clone().setY(1.8)));
  } };

  const lookedAt = (camera) => {
    if (st.busy) return null;
    const R = st.room;
    if (R) {
      if (R.kind === 'room' && R.step === 'look') return inView(camera, box1.getWorldPosition(_t.clone()), 2.4, 0.16) < Infinity ? pickBox : null;
      if (R.kind === 'feeling' && !R.chosen && feelings[0].s.visible) {
        let best = null, ba = Infinity;
        for (const f of feelings) {
          const a = inView(camera, f.s.position, 3, 0.12);
          if (a < ba) ((ba = a), (best = f));
        }
        return best;
      }
      if (R.kind === 'other' && R.step === 'turned') {
        figPick.mesh.position.copy(fig.pos).setY(1.2);
        return inView(camera, figPick.mesh.position, 2.4, 0.3) < Infinity ? figPick : null;
      }
      return null;
    }
    // in the cellar: the next sealed letter, once the horse has led you in
    if (horse.state !== 'lead' && horse.state !== 'rest') return null;
    const L = nextLetter();
    if (!L) return null;
    return inView(camera, L.mesh.position, 2.6, 0.12) < Infinity ? { mesh: L.mesh, def: L.def, onPick: () => readLetter(L) } : null;
  };

  /* ═════════════ each frame ═════════════ */
  const update = (dt, t, camera, flaskPos, sound, player) => {
    camPos.copy(camera.position);
    // the exposure of each place, graded against its trailer frame (mean luma: i14 0.08, iflood 0.10, i15 0.14,
    // i13a 0.09): the flask lights the near walls strongly, so the picture is brought down where it is close
    {
      const z = player.pos.z;
      const want = z > 100 ? 0.9 : z > -46.2 ? 1 : z > Z_STAIR_END ? 0.42 : z > Z_ROOM_END ? 0.8 : 0.6;
      st.exposure += (want - st.exposure) * (1 - Math.exp(-dt * 1.5));
    }
    // draw each place only when you can see it: the hall once its door is open and you are near it; each
    // dream room only while you are in it; the cellar not while you are in a dream room
    const inDream = player.pos.z > 100;
    const hallOn = !inDream && st.archOpen && player.pos.z < Z_ROOM_END + 9;
    hallG.visible = hallOn;
    if (gallery.group.userData.on !== hallOn) {
      gallery.group.userData.on = hallOn;
      gallery.group.traverse((o) => (o.isMesh || o.isSprite) && (o.visible = hallOn));
    }
    other.obj.visible = hallOn;
    room1.visible = st.room?.kind === 'room';
    room2.visible = !!st.room && st.room.kind !== 'room';
    shaftMat.uniforms.time.value = t;
    updateHorse(dt, t, player, camera);
    // the letters: the next one glows; a picked one rises to your eye, then sinks with its seal broken
    const nxt = nextLetter();
    for (const L of list) {
      const m = L.mesh;
      if (L.state === 'water') {
        m.position.y = WATER + 0.006 + 0.005 * Math.sin(t * 0.9 + L.seed);
        const lit = L === nxt && (horse.state === 'lead' || horse.state === 'rest');
        m.material.emissiveIntensity += ((lit ? 0.07 + 0.04 * Math.sin(t * 1.6) : 0) - m.material.emissiveIntensity) * (1 - Math.exp(-dt * 2));
      } else if (L.state === 'rising') {
        L.k = Math.min(1, L.k + dt / 1.1);
        const k = L.k * L.k * (3 - 2 * L.k);
        camera.getWorldDirection(_f);
        _t.copy(camera.position).addScaledVector(_f, 0.55);
        m.position.lerpVectors(L.from, _t, k);
        _q.setFromRotationMatrix(_m.lookAt(_t, camera.position, camera.up));
        m.quaternion.slerpQuaternions(L.fromQ, _q, k);
      } else if (L.state === 'sinking') {
        L.k = Math.min(1, L.k + dt / 2.5);
        m.position.lerpVectors(L.from, L.home.clone().setY(WATER - 0.4), L.k * L.k);
        m.material.emissiveIntensity = 0;
        m.material.opacity = 1 - L.k;
        m.material.transparent = true;
        if (L.k >= 1) ((L.state = 'gone'), (m.visible = false));
      }
    }
    // the doors under the water: swing open with light behind; walk in and the dream takes you
    for (const d of doors) {
      d.open += (d.want - d.open) * (1 - Math.exp(-dt * 1.2));
      d.pivot.rotation.y = -1.35 * d.open;
      d.glowMat.opacity = Math.min(1, d.open * 1.4) * (0.85 + 0.15 * Math.sin(t * 2.1));
    }
    const od = st.openDoor;
    // on the stair the roaming light is free: it stands low among the candles, so the treads and risers below
    // you are shaded by them (the candles' own light, without a light of their own)
    if (!od && !st.room && player.pos.z < -46.2 && player.pos.z > Z_STAIR_END - 1.5) {
      const zc = Math.max(Z_STAIR_END + 1.2, player.pos.z - 2.6);
      setRoam(_t.set(0.2, house.floorAt(0, zc) + 0.25, zc), new THREE.Color(1.0, 0.6, 0.28), 0.35, 5);
    } else if (!od && !st.room && roamLight.userData.base > 0 && player.pos.z < Z_STAIR_END - 1.5) roamLight.userData.base = 0;
    if (od) {
      setRoam(new THREE.Vector3(od.x, WATER + 1.0, od.z).addScaledVector(od.front, 0.6), new THREE.Color(1.0, 0.86, 0.66), 0.9 * od.open, 5);
      if (!st.busy && !st.room && od.open > 0.7 && Math.hypot(player.pos.x - od.x, player.pos.z - od.z) < 1.25) {
        const L = list.find((x) => x.door === od);
        enterRoom(L);
      }
    }
    updateRoom(dt, t, player, camera);
    // the hall door swings open once the letters are read
    hallDoorK += ((st.archOpen ? 1 : 0) - hallDoorK) * (1 - Math.exp(-dt * 0.8));
    hallDoor.rotation.y = -1.7 * hallDoorK;
    gallery.update(dt, t, camera, flaskPos, sound);
    if (!st.gold && gallery.items[0].done) ((st.gold = true), (st.phase = 'gold'));
    updateOther(dt, t, player);
    updateBird(dt);
    // the end: down the stair after them
    if (!st.done && oth.state === 'gone' && player.pos.z < HALL_Z1 - 0.6) st.done = true;
    if (!st.done && oth.state === 'gone' && player.pos.z < HALL_Z1 + 2.5 && (otherLight.userData.dim ?? 1) <= 0.05) st.done = true;
  };

  /** The one line at the bottom of the screen, while you are down here. */
  const line = (player) => {
    if (st.room) {
      const R = st.room;
      if (R.kind === 'room') return R.step === 'look' ? ALBEDO.rooms.room.pick : '';
      if (R.kind === 'feeling') return R.chosen ? '' : ALBEDO.rooms.feeling.line;
      return R.step === 'turned' ? ALBEDO.rooms.other.give : R.step === 'look' ? ALBEDO.horseFollow : '';
    }
    if (player.pos.z > Z_STAIR_END) return '';
    if (horse.state === 'wait') return ALBEDO.horseLine;
    if (horse.state === 'come' || horse.state === 'greet') return '';
    if (st.openDoor && st.openDoor.open > 0.3) return ALBEDO.door;
    if (st.read.length < LETTERS.length) return ALBEDO.letterLine(LETTERS.length - st.read.length);
    if (!st.gold) return player.pos.z > HALL_Z0 ? ALBEDO.hallOpen : ALBEDO.statue[who];
    if (st.phase === 'gold') return ALBEDO.goToOther;
    if (st.phase === 'down') return ALBEDO.follow;
    return '';
  };

  /** Coming back to a saved game: what was done stays done. */
  const restore = (save) => {
    for (const L of list)
      if (save.letters.includes(L.id)) {
        L.state = 'gone';
        L.mesh.visible = false;
        st.read.push(L.id);
      }
    if (st.read.length || save.gold) {
      // the horse has already led you in once
      horse.state = 'rest';
      horse.pos.set(0.9, ROOM_Y, Z_ROOM_END + 3.2);
      horse.yaw = -Math.PI / 2;
    }
    if (st.read.length >= LETTERS.length) ((st.archOpen = true), (st.phase = 'hall'), (hallDoorK = 1));
    if (save.gold) {
      const it = gallery.items[0];
      it.done = true;
      it.proj = 0;
      it.w = 1;
      st.gold = true;
      st.phase = 'gold';
      oth.state = 'wait';
    }
  };

  return { group, list, gallery, st, horse, oth, bird, dreamFig, other, lookedAt, update, line, restore, colliders: [...colliders, ...gallery.colliders], places: { HALL_Z0, HALL_Z1, COLUMN_Z, OTHER_Z, ROOM1, ROOM2 } };
};
