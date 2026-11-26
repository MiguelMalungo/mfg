import * as THREE from 'three';
import { RUBEDO } from './texts.js';
import { readMesh } from './cave.js';

/*
 * The horned skull (PLAN.md 10.6.3): the archetypal shadow, which is not yours. It lies by the path and whispers
 * the missing half of each black mask you have not faced, as power; the more of them are left on the wall, the
 * oftener and the further it is heard. In nigredo the question "Is this one yours?" was answered by taking it;
 * here the answer is "This is not mine".
 *
 * It may be answered by the path (pick it up) or before the third heating, when the fire sinks and it is on the
 * furnace's edge. Put on, it wears you: you see through its eyes, everything obeys, the flask goes black, the Other
 * draws off. Only going to their light takes it off (stand still, and they come to you). Nothing is lost or
 * counted; the answer is kept for the round, so that it is asked once.
 *
 * The model is a scan of an impala's skull (assets/rubedo/CREDITS.md), cut from the stump it stood on and darkened to
 * the old bronze of i19; a coded one stands in until it has loaded.
 */
const C = RUBEDO.skull;
const ss = (a, b, x) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

export const buildSkull = ({ group, glowTex, st, api, oth, albedo, stones, places, hold, resume }) => {
  const { Z0, Z1, CAVE_Y, FURN, OTHER_AT } = places;
  let load = null;
  const rim = { value: new THREE.Color(0.03, 0.008, 0.003) };
  const bone = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.03, 0.026, 0.022), roughness: 0.5 });
  const hornPts = (s) => new THREE.CatmullRomCurve3([[0.07, 0.1, 0.08], [0.15, 0.26, 0.12], [0.23, 0.44, 0.1], [0.24, 0.58, 0.03], [0.17, 0.68, -0.03]].map(([x, y, z]) => new THREE.Vector3(s * x, y, z)));
  const horns = () =>
    [-1, 1].map((s) => {
      const g = new THREE.TubeGeometry(hornPts(s), 24, 0.045, 8);
      // tapered to a point
      const p = g.attributes.position, c = hornPts(s), v = new THREE.Vector3(), q = new THREE.Vector3();
      for (let i = 0; i <= 24; i++) {
        c.getPointAt(i / 24, q);
        for (let j = 0; j <= 8; j++) {
          const n = i * 9 + j;
          v.fromBufferAttribute(p, n).sub(q).multiplyScalar(1 - 0.9 * Math.pow(i / 24, 1.4) + 0.06 * Math.sin(i * 2.2)).add(q);
          p.setXYZ(n, v.x, v.y, v.z);
        }
      }
      g.computeVertexNormals();
      return g;
    });
  const obj = new THREE.Group();
  {
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 16), bone);
    head.scale.set(0.85, 0.75, 1);
    head.position.set(0, 0.06, 0.05);
    const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.095, 0.34, 16), bone);
    snout.rotation.x = Math.PI / 2 + 0.25;
    snout.position.set(0, 0.015, 0.24);
    obj.add(head, snout, ...horns().map((g) => new THREE.Mesh(g, bone)));
    obj.traverse((o) => o.isMesh && (o.castShadow = o.receiveShadow = true));
    // the scan
    const tl = new THREE.TextureLoader(), T = (f, srgb) => {
      const t = tl.load('./assets/rubedo/' + f);
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      return t;
    };
    load = Promise.all([fetch('./assets/rubedo/skull.json').then((r) => r.json()), fetch('./assets/rubedo/skull.bin').then((r) => r.arrayBuffer())])
      .then(([j, b]) => {
        const m = new THREE.MeshStandardMaterial({ map: T('skull_d.jpg', true), normalMap: T('skull_n.jpg'), roughness: 0.4, metalness: 0.2 });
        // black, old, with gilt left in it where the bone is palest
        m.onBeforeCompile = (sh) => {
          sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
            { float l = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
              diffuseColor.rgb = vec3(0.020, 0.0155, 0.011) + diffuseColor.rgb * 0.10 + vec3(0.20, 0.135, 0.05) * smoothstep(0.42, 0.95, l) * 0.5; }`)
            // a smoulder along its edges, or black bone is lost in the dark (as the Shadow's)
            .replace('#include <common>', '#include <common>\nuniform vec3 rim;')
            .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += rim * pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 2.4);');
          sh.uniforms.rim = rim;
        };
        m.customProgramCacheKey = () => 'st2g-skull';
        const mesh = new THREE.Mesh(readMesh(b, j), m);
        mesh.castShadow = mesh.receiveShadow = true;
        mesh.raycast = () => {};
        for (const o of [...obj.children]) if (o.isMesh) obj.remove(o);
        obj.add(mesh);
      })
      .catch((e) => console.error('The skull did not load (the stand-in stays):', e));
  }
  const eyes = [-1, 1].map((s) => {
    const socket = new THREE.Mesh(new THREE.SphereGeometry(0.036, 12, 10), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    socket.position.set(s * 0.085, 0.065, 0.13); // (the stand-in's)
    const e = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(0.5, 0.02, 0.008), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    e.scale.setScalar(0.045);
    e.position.set(s * 0.070 - 0.008, 0.014, -0.012);
    obj.add(socket, e);
    return e;
  });
  group.add(obj);
  // by the path it calls you: a slow ember breath on the stone under it (and along its own edges, below in update)
  const call = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: glowTex, color: new THREE.Color(0.75, 0.2, 0.045), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  call.rotation.x = -Math.PI / 2;
  call.raycast = () => {};
  group.add(call);
  // your own cast shadow, horned: a mesh that only casts
  const shadowHorns = new THREE.Group();
  for (const g of horns()) {
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
    m.castShadow = true;
    m.frustumCulled = false;
    shadowHorns.add(m);
  }
  shadowHorns.visible = false;
  group.add(shadowHorns);

  // what it says, and what it is like inside it
  const say = document.createElement('div');
  say.className = 'skullsay';
  document.body.appendChild(say);
  const inside = document.createElement('div');
  inside.className = 'skullin';
  {
    // two ragged holes in the dark, drawn once
    const hole = (cx, cy, rx, ry, seed) => {
      const pts = [];
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * Math.PI * 2, n = 1 + 0.09 * Math.sin(a * 5 + seed) + 0.06 * Math.sin(a * 11 + seed * 2.3) + 0.04 * Math.sin(a * 17 + seed * 5.1);
        pts.push(`${(cx + Math.cos(a) * rx * n).toFixed(2)} ${(cy + Math.sin(a) * ry * n).toFixed(2)}`);
      }
      return 'M' + pts.join('L') + 'Z';
    };
    inside.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><defs><filter id="skb" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="0.8"/></filter></defs><mask id="skm" maskUnits="userSpaceOnUse" x="-150" y="-150" width="400" height="400"><rect x="-150" y="-150" width="400" height="400" fill="#fff"/><g fill="#000" filter="url(#skb)"><path d="${hole(29, 47, 24, 31, 1)}"/><path d="${hole(71, 47, 24, 31, 4)}"/></g></mask><rect x="-150" y="-150" width="400" height="400" fill="#020101" mask="url(#skm)"/></svg>`;
    document.body.appendChild(inside);
  }

  const S = {
    where: 'path', answered: null, offering: null, worn: false, black: false,
    eye: 0.6, t: 0, next: 4, sayT: 0, still: 0, tipped: false, off: 0, inK: 0, roarK: 0, kept: new THREE.Vector3(),
  };
  const PATH = new THREE.Vector3(0.85, CAVE_Y + 0.17, Z0 - 5.2);
  const EDGE = new THREE.Vector3(0.47, CAVE_Y + 1.10, FURN.z + 0.36);
  const put = (where) => {
    S.where = where;
    obj.visible = true;
    obj.scale.setScalar(1);
    obj.rotation.set(0.1, 0, 0);
    rim.value.setRGB(0.03, 0.008, 0.003);
    if (where === 'edge') (obj.position.copy(EDGE), obj.scale.setScalar(0.98), (obj.rotation.y = -0.3), rim.value.setRGB(0.11, 0.028, 0.008));
    else if (where === 'down') (obj.position.copy(PATH).setY(CAVE_Y + 0.12), obj.rotation.set(Math.PI * 0.5, 0.5, 0.15)); // face down
    else (obj.position.copy(PATH), (obj.rotation.y = -0.55));
  };
  put('path');

  const answer = (a) => {
    S.answered = a;
    api.setRubedo({ skull: a });
  };
  const pagesFor = (pages) => (api.seen() ? [{ title: '', lines: [C.again] }] : pages);

  /* ── the question ── */
  const ask = (lines, at) =>
    api.words.ask({ lines, question: C.question, choice: C.choice, plain: false, aside: at === 'fire', anchor: () => _a.copy(obj.position).setY(obj.position.y + 0.25), onDone: (k) => (k === 'take' ? wear(at) : leave(at)) });
  const _a = new THREE.Vector3(), _v = new THREE.Vector3(), _f = new THREE.Vector3();
  /** By the path: you are stood there, it rises to your eye, and asks. */
  const pickUp = (player) => {
    S.offering = 'path';
    api.words.clearTips();
    st.standAt(player.pos.x, player.pos.z, player.yaw, -0.08);
    S.from = obj.position.clone();
    S.fromQ = obj.quaternion.clone();
    S.rise = 0;
    api.sound.glass(98, 0.06, 3);
    api.later(1.5, () => ask([C.offer], 'path'));
  };
  /** Before the third heating: the fire sinks, and when you can see again it is on the furnace's edge. */
  const offerAtFire = () => {
    S.offering = 'fire';
    st.step = 'skull';
    st.sunk = 1;
    api.sound.exhale();
    api.later(2.6, () => {
      put('edge');
      S.eye = 0;
      api.sound.glass(98, 0.07, 4);
    });
    api.later(5.2, () => speak(1));
    api.later(8.2, () => ask([C.offer], 'fire'));
  };
  const leave = (at) => {
    answer('left');
    api.sound.glass(523.3, 0.05, 4);
    const done = () => {
      S.offering = null;
      st.sunk = 0;
      if (at === 'path') {
        st.standing = false;
        S.rise = null;
        put('path');
      } else api.later(1.6, resume);
    };
    api.later(1.6, () => api.words.tell(pagesFor(C.left), { aside: at === 'fire', onDone: done }));
  };

  /* ── wearing it ── */
  let pick = null;
  const wear = (at) => {
    answer('worn');
    S.at = at;
    S.worn = S.black = true;
    S.t = 0;
    S.still = 0;
    S.off = 0;
    S.rise = null;
    S.said = 0;
    S.far = null;
    S.fled = false;
    st.sunk = 0;
    api.words.clearTips();
    st.standing = false;
    obj.visible = false;
    api.sound.slam(0.9);
    api.sound.glass(65.4, 0.12, 8);
  };
  const takeOff = (player) => {
    S.off = 1;
    S.black = false;
    api.sound.exhale();
    api.sound.glass(392, 0.08, 6);
    const c = camPos.clone();
    api.shadow()?.wisps.puff(c, 60, 0.3, 0.1);
    put('down');
    S.eye = 0;
    st.standAt(player.pos.x, player.pos.z, player.yaw, -0.05);
    api.later(2.2, () =>
      api.words.tell(pagesFor(C.wore), {
        aside: true,
        onDone: () => {
          const free = () => {
            S.worn = false;
            S.offering = null;
            st.standing = false;
          };
          if (S.at === 'fire')
            albedo.fadeThrough(
              () => {
                free();
                st.standing = true; // before the furnace again
                api.teleport(0, FURN.z + 2.7, 0, -0.16);
                oth.pos.set(OTHER_AT.x, CAVE_Y, OTHER_AT.z);
                oth.yaw = 0;
              },
              () => api.later(0.8, resume),
            );
          else free();
        },
      }),
    );
  };
  const camPos = new THREE.Vector3();

  /* ── its voice ── */
  const left = () => api.masksLeft();
  const speak = (loud) => {
    const l = left(), id = l.length ? l[Math.floor(Math.random() * l.length)] : null;
    let text = id ? C.calls[id] : C.none;
    if (text === S.last && l.length > 1) text = C.calls[l[(l.indexOf(id) + 1) % l.length]];
    S.last = text;
    say.textContent = text;
    S.sayT = 3.4;
    S.loud = loud;
    api.sound.hiss(0.35 + 0.65 * loud, 1.2 + text.length * 0.035);
  };
  const reach = () => {
    const n = Math.min(17, left().length);
    const k = n <= 2 ? 0 : (n - 2) / 15;
    return { near: 3 + 6 * k, every: (15 - 8 * k) * (api.turned() ? 1.6 : 1) };
  };

  const update = (dt, t, camera, player) => {
    camPos.copy(camera.position);
    const ease = (c, w, r) => c + (w - c) * (1 - Math.exp(-dt * r));
    st.sunkK = ease(st.sunkK ?? 0, st.sunk, 1.1);
    S.roarK = ease(S.roarK, S.worn && !S.off ? 1 : 0, 2);
    // the eyes: kindled when you are near, out when it has been answered
    const quiet = S.answered && !S.worn;
    const d = obj.position.distanceTo(camera.position);
    S.eye = ease(S.eye, quiet ? 0 : S.offering ? 1 : ss(10, 3, d) * 0.8 + 0.1, 1.2);
    for (const e of eyes) e.material.opacity = S.eye * (0.8 + 0.2 * Math.sin(t * 2.3) * Math.sin(t * 0.9));
    // waiting by the path, it glows to be picked up: a slow breath, stronger as you come near, out once answered
    const calling = S.where === 'path' && !S.answered && !S.offering && obj.visible ? 1 : 0;
    S.callK = ease(S.callK ?? 0, calling, 1.5);
    const breath = 0.55 + 0.45 * Math.sin(t * 1.9);
    const callA = S.callK * breath * (0.6 + 0.4 * ss(9, 2.5, d));
    call.visible = S.callK > 0.01;
    call.position.set(obj.position.x, CAVE_Y + 0.03, obj.position.z);
    call.material.opacity = callA * 0.9;
    if (S.where === 'path') rim.value.setRGB(0.03 + 0.2 * callA, 0.008 + 0.05 * callA, 0.003 + 0.014 * callA);
    // by the path it rises to your eye, as a mask does
    if (S.rise != null && obj.visible) {
      S.rise = Math.min(1, S.rise + dt / 1.3);
      const k = S.rise * S.rise * (3 - 2 * S.rise);
      camera.getWorldDirection(_f);
      _v.copy(camera.position).addScaledVector(_f, 1.15).y -= 0.3;
      obj.position.lerpVectors(S.from, _v, k);
      obj.rotation.set(0.12, player.yaw, 0);
    }
    // it speaks, while nothing else does
    const talk = !S.answered && !S.offering && !S.worn && st.entered && (st.phase === 'cave' || st.phase === 'furnace') && !api.words.open && !hold().on && st.step !== 'burn' && !(st.phase === 'furnace' && st.step === 'choose');
    const R = reach();
    if (talk && d < R.near && !api.busyHand()) {
      if (!S.tipped && st.t > 8) ((S.tipped = true), api.words.tip(C.tip, { id: 'skullTip' }));
      if ((S.next -= dt) <= 0) {
        S.next = R.every * (0.85 + 0.3 * Math.random());
        speak(ss(R.near, 1.2, d) * (R.near / 9));
      }
    }
    S.sayT = Math.max(0, S.sayT - dt);
    say.style.opacity = api.words.open ? 0 : (Math.min(1, S.sayT * 1.4) * (0.45 + 0.55 * (S.loud ?? 0))).toFixed(3);

    /* worn */
    if (S.worn && !S.off) {
      S.t += dt;
      if (S.said === 0 && S.t > 3) ((S.said = 1), api.words.whisper(C.power[0], 3, { low: true }), api.sound.glass(55, 0.1, 6));
      if (S.said === 1 && S.t > 8) ((S.said = 2), api.words.whisper(C.power[1], 3, { low: true }), api.sound.glass(49, 0.1, 6));
      S.still = player.speed < 0.25 && S.t > 6 ? S.still + dt : 0;
      const od = Math.hypot(player.pos.x - oth.pos.x, player.pos.z - oth.pos.z);
      if (S.t > 4 && od < 1.35 && (S.fled || S.still > 15)) takeOff(player);
    }
    // the holes: wide at first, closing as it grows heavy; gone at once when it falls
    S.inK = ease(S.inK, S.worn && !S.off ? 1 : 0, S.off ? 5 : 2.2);
    inside.style.opacity = S.inK < 0.01 ? 0 : S.inK.toFixed(3);
    inside.style.transform = `scale(${(1.9 - 0.75 * S.inK - 0.22 * ss(6, 30, S.t)).toFixed(3)}) translateY(${(0.6 * Math.sin(player.stride * 2.1)).toFixed(2)}%)`;
    shadowHorns.visible = S.worn && !S.off;
    if (shadowHorns.visible) {
      shadowHorns.position.set(player.pos.x, player.y + 1.6, player.pos.z);
      shadowHorns.rotation.y = player.yaw + Math.PI;
    }
    // the stones bow away from where you look
    const bow = S.worn && !S.off ? 1 : 0;
    for (const m of stones) {
      m.userData.b = ease(m.userData.b ?? 0, bow * ss(7, 1.5, Math.hypot(m.position.x - player.pos.x, m.position.z - player.pos.z)), 1.5);
      if (!m.userData.r) m.userData.r = m.rotation.clone();
      const a = Math.atan2(m.position.x - player.pos.x, m.position.z - player.pos.z);
      m.rotation.x = m.userData.r.x + 0.7 * m.userData.b * Math.cos(a);
      m.rotation.z = m.userData.r.z - 0.7 * m.userData.b * Math.sin(a);
    }
  };

  const redCol = new THREE.Color(1.0, 0.16, 0.05), _l = new THREE.Vector3();
  return {
    update, offerAtFire, load,
    get worn() { return S.worn; },
    get black() { return S.black; },
    get answered() { return S.answered; },
    get state() { return S; },
    /** The Other, while you wear it: drawn off, a small light; they come to you if you stand still. */
    leadOther(player) {
      if (S.still > 15 || S.off) oth.guide = { x: player.pos.x, z: player.pos.z, yaw: null, speed: S.off ? 0 : 0.9, dim: S.off ? 0.8 : 0.4 };
      else {
        if (!S.far) S.far = S.at === 'fire' ? { x: -0.6, z: FURN.z - 2.6 } : { x: 0, z: Math.max(FURN.z + 2.2, Math.min(oth.pos.z, player.pos.z - 8)) };
        // no one comes near the one who wears it: the first time you reach them they draw off once more
        if (!S.fled && S.t > 3 && Math.hypot(player.pos.x - oth.pos.x, player.pos.z - oth.pos.z) < 2.6) {
          S.fled = true;
          S.far = S.at === 'fire' ? { x: player.pos.x > 0 ? -2.9 : 2.9, z: FURN.z + 1.2 } : { x: -2.3, z: FURN.z + 3.6 };
        }
        oth.guide = { x: S.far.x, z: S.far.z, yaw: null, speed: 1.7, dim: 0.35 };
      }
    },
    /** How fast you can walk under it. */
    pace: () => (S.off ? 0 : 0.62 - 0.28 * ss(3, 16, S.t)),
    step: () => !S.off && api.sound.slam(0.22),
    /** What the fire does when it obeys. */
    roar: () => S.roarK * (S.at === 'fire' ? 1.1 : 0),
    line: () => (S.off || S.t < 3 ? '' : C.worn),
    /** Worn away from the fire (by the path): its own red light goes with you. True when it has set the light. */
    light(player) {
      if (!S.worn) return false;
      if (S.at === 'fire') {
        // the fire obeys: it stands out of the furnace and reddens the whole cave
        albedo.setRoam(_l.set(0, CAVE_Y + 1.9, FURN.z + 0.5), redCol, 3.4 * S.roarK, 22);
        return true;
      }
      _l.set(player.pos.x - Math.sin(player.yaw) * 1.4, CAVE_Y + 1.7, player.pos.z - Math.cos(player.yaw) * 1.4);
      albedo.setRoam(_l, redCol, 1.1 * S.roarK, 12);
      return true;
    },
    lookedAt(camera, W) {
      if (S.answered || S.offering || S.where !== 'path' || st.phase !== 'cave') return false;
      camera.getWorldDirection(_f);
      _v.copy(obj.position).sub(camera.position);
      const d = _v.length();
      return d < 2.3 * W && Math.acos(Math.min(1, _v.dot(_f) / d)) < Math.max(0.2 * W, 0.25 / d);
    },
    get pick() {
      return pick;
    },
    setPick(p) {
      pick = p;
    },
    pickUp,
    mesh: obj,
    colliders: () => (S.where === 'path' || S.where === 'down' ? [{ x: PATH.x, z: PATH.z, r: 0.28 }] : []),
    restore(a) {
      S.answered = a || null;
      put(a === 'worn' ? 'down' : 'path');
    },
  };
};
