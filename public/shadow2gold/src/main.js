import * as THREE from 'three';
import { glowTexture } from './textures.js';
import { buildHouse, W, H, Z_BACK, Z_END, MASK_WALL, SACK_AT, WATER, Z_STAIR_END } from './house.js';
import { buildVessel } from './vessel.js';
import { loadPeople } from './people.js';
import { buildSack } from './sack.js';
import { buildChild } from './child.js';
import { buildMaskHall } from './masks.js';
import { makeHand } from './pick.js';
import { makeWords } from './words.js';
import { save } from './save.js';
import { LINES, TIPS, HINTS } from './texts.js';
import { makePost, Sound } from './fx.js';
import { makeFloorReflection } from './reflect.js';

/*
 * Shadow to Gold · level 1 (Nigredo): the corridor of the house and the hall of masks.
 * You walk with the sealed vessel floating low at the right of the view. On the wall hang sixteen
 * masks. A white one you pick comes to you, shows what it is, and goes back. A black one asks if it
 * is yours: taken, it becomes a shadow of your own shape loose in the corridor, which grows until
 * you go to it and through it. Three of them faced, and the door that was never there opens.
 * See ../PLAN.md (section 10) for the design and ./BUILD.md for how this is put together.
 * (The statues of src/gallery.js belong to level 2 and are no longer built here.)
 */

const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
const TOUCH = matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && matchMedia('(hover: none)').matches);
/* Touch controls show on a touch device, and also from the first finger that lands (a laptop with a touch screen, a phone the browser did not announce). */
const touch = { on: TOUCH };
const touchOn = () => {
  touch.on = true;
  document.body.classList.add('touch');
};
if (TOUCH) touchOn();
const $ = (id) => document.getElementById(id);

/* ── the studio mark: three spiral arms ── */
{
  const arm = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const a = t * Math.PI * 1.55, r = 6 + t * 40;
    arm.push(`${i ? 'L' : 'M'}${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`);
  }
  $('mark').innerHTML = [0, 120, 240].map((d) => `<path d="${arm.join(' ')}" transform="rotate(${d})" fill="none" stroke="#f2e6cc" stroke-width="5" stroke-linecap="round"/>`).join('');
}

/* ── renderer ── */
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, TOUCH ? 1 : 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.NoToneMapping; // the finish pass grades the image
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap; // soft by default in this three.js version
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(new THREE.Color(0.006, 0.005, 0.003), 0.03);
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.03, 120);
camera.rotation.order = 'YXZ';
scene.add(camera);
// the faintest fill, so black still has shape in it
scene.add(new THREE.HemisphereLight(new THREE.Color(0.9, 0.7, 0.45), new THREE.Color(0.25, 0.2, 0.12), 0.012));

const glowTex = glowTexture();
const house = buildHouse(scene, glowTex);
const sack = buildSack(scene, SACK_AT);
const vessel = buildVessel(glowTex);
const post = makePost(renderer, scene, camera);
// the floor mirrors the corridor; the haze motes and the dust are left out of the mirror
const refl = makeFloorReflection(renderer, scene, camera, house.floorMat);
// the cellar's black water mirrors too, with its own pass (only one of the two runs at a time)
const waterRefl = makeFloorReflection(renderer, scene, camera, house.waterMat, { planeY: WATER, key: 'water' });
waterRefl.u.reflStrength.value = 1.6;
waterRefl.u.glowStrength.value = 0.004;
const sound = new Sound();
const words = makeWords(camera, () => (touch.on ? 'touch' : 'desk'));
/* Things that happen a little later, on the game's own clock (so they also run when frames are stepped by hand). */
const timers = [];
const later = (seconds, fn) => timers.push({ at: state.t + seconds, fn });

/* The vessel rides on a rig that follows the eye a beat late, so it swings a little as you turn. */
const rig = new THREE.Group();
scene.add(rig);
rig.add(vessel.group);

/* ── dust in the air, lit by the vessel as it passes ── */
const dust = (() => {
  const N = 420, BOX = 7;
  const g = new THREE.BufferGeometry();
  const p = new Float32Array(N * 3), s = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    p[i * 3] = (Math.random() - 0.5) * BOX;
    p[i * 3 + 1] = Math.random() * H;
    p[i * 3 + 2] = (Math.random() - 0.5) * BOX;
    s[i] = Math.random();
  }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  g.setAttribute('seed', new THREE.BufferAttribute(s, 1));
  const u = { time: { value: 0 }, eye: { value: new THREE.Vector3() }, lightPos: { value: new THREE.Vector3() }, lightPow: { value: 1 }, px: { value: renderer.getPixelRatio() * innerHeight } };
  const m = new THREE.ShaderMaterial({
    uniforms: u,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float seed; uniform float time; uniform vec3 eye; uniform vec3 lightPos; uniform float lightPow; uniform float px;
      varying float vB;
      void main() {
        // the motes drift, and the box of them wraps around the eye along the corridor
        vec3 p = position + vec3(sin(time * 0.11 + seed * 40.0), sin(time * 0.07 + seed * 17.0) * 0.6, cos(time * 0.09 + seed * 29.0)) * 0.25;
        p.z = eye.z + mod(p.z - eye.z + ${(BOX / 2).toFixed(1)}, ${BOX.toFixed(1)}) - ${(BOX / 2).toFixed(1)};
        p.x = clamp(p.x, -${(W / 2 - 0.05).toFixed(2)}, ${(W / 2 - 0.05).toFixed(2)});
        float d = distance(p, lightPos);
        vB = lightPow * 0.012 / (0.02 + d * d) * (0.4 + 0.6 * seed);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(px * 0.0032 / max(-mv.z, 0.05), 1.0, 5.0);
      }`,
    fragmentShader: /* glsl */ `
      varying float vB;
      void main() {
        float r = length(gl_PointCoord - 0.5);
        gl_FragColor = vec4(vec3(1.0, 0.72, 0.42) * vB * smoothstep(0.5, 0.1, r), 1.0);
      }`,
  });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  scene.add(pts);
  return { u };
})();

/* ── state ── */
const START = new THREE.Vector3(0, 0, 2.2);
const EYE = 1.62;
const player = { y: 0, pos: START.clone(), vel: new THREE.Vector3(), yaw: 0, pitch: -0.05, stride: 0, lastStep: 0, speed: 0 };
const state = { started: false, ended: false, t: 0, charge: 1, runDebt: 0, lastBeat: 0, faced: save.data.faced.length, facedAt: null, doorAt: save.data.faced.length >= 3 ? -10 : null };
/** The Shadow: where it stands, how tall it has grown, how near it feels. `facing` (below) says which mask gave it a face. */
const sh = { awake: false, pos: new THREE.Vector3(0, 0, 0), dread: 0, fade: 1, scale: 1, grow: 0, meet: false, dip: 0, gait: 0, stride: 0, prev: new THREE.Vector3(), lastStep: 0, prevDist: 0, echo: 0 };
const EXPOSURE = post.finish.uniforms.exposure.value;
const keys = {};
/* ?debug: keys 1 to 4 show the four stages in the glass (black, white, red, gold); 0 returns to the game. ?demo cycles them. */
const demo = { stage: null };

/* Man or woman (PLAN.md 10.3): chosen on the title card, saved, changeable only there. */
let gender = params.get('g') || save.data.gender || (DEBUG ? 'man' : null);
const whoButtons = [...document.querySelectorAll('#who button')];
const showChoice = () => {
  whoButtons.forEach((b) => b.classList.toggle('on', b.dataset.g === gender));
  if (!ready) return;
  $('go').style.display = gender ? '' : 'none';
  $('choose').style.display = gender ? 'none' : '';
  $('restart').style.display = save.hasProgress ? '' : 'none';
};
whoButtons.forEach((b) =>
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    gender = b.dataset.g;
    showChoice();
  }),
);
$('restart').addEventListener('click', (e) => {
  e.stopPropagation();
  save.reset();
  location.reload();
});

const begin = () => {
  if (state.started || !ready || !gender) return;
  state.started = true;
  save.set({ gender });
  // your own unseen body and the shadows you will face have your shape; the hand is yours too
  body = people.makeBodyCaster(gender);
  scene.add(body.obj);
  shadow = people.makeShadowFigure(scene, glowTex, gender);
  shadow.obj.visible = false;
  shadow.shells.forEach((m) => (m.visible = false));
  scene.add(shadow.obj);
  makeHand(camera, gender)
    .then((h) => {
      hand = h;
      window.__g.hand = h;
    })
    .catch((err) => console.error('The hand did not load:', err));
  Object.assign(window.__g, { body, shadow });
  $('start').classList.add('hidden');
  if (!DEBUG) sound.start();
  // how to play, said once when you first wake
  if (!save.hasProgress) later(1.5, () => TIPS.wake[touch.on ? 'touch' : 'desk'].forEach((text, i) => words.tip(text, { id: 'wake' + i })));
};
const lock = () => {
  try {
    renderer.domElement.requestPointerLock?.()?.catch?.(() => {});
  } catch {}
};
$('start').addEventListener('click', () => {
  if (!ready || !gender) return;
  lock();
  begin();
});
renderer.domElement.addEventListener('click', () => {
  if (state.started && document.pointerLockElement !== renderer.domElement) lock();
});
$('again2').addEventListener('click', () => {
  $('end2').classList.add('hidden');
  state.ended = false;
  lock();
});
addEventListener('keydown', (e) => {
  if (!e.repeat && e.code === 'KeyE') act();
  if (!e.repeat && e.code === 'KeyQ') words.answer('leave');
  // Space turns you round (a trackpad makes a half turn a long swipe)
  if (!e.repeat && e.code === 'Space' && state.started && !state.ended && !stand.on) turn.left += Math.PI;
  keys[e.code] = true;
  if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
});
/* Picking: click or E (tap on touch). The same press dismisses a text, or answers "take". */
addEventListener('mousedown', (e) => {
  if (!state.started || e.target.closest?.('.overlay, .say-btn')) return;
  if (e.button === 2) return void words.answer('leave');
  // the click that takes the mouse is not also a pick
  if (e.button === 0 && (DEBUG || document.pointerLockElement === renderer.domElement)) act();
});
addEventListener('contextmenu', (e) => state.started && e.preventDefault());
addEventListener('keyup', (e) => (keys[e.code] = false));
addEventListener('keydown', (e) => {
  if (!DEBUG && !params.has('demo')) return;
  const m = /^Digit([0-4])$/.exec(e.code);
  if (m) demo.stage = m[1] === '0' ? null : Number(m[1]) - 1;
});
addEventListener('blur', () => Object.keys(keys).forEach((k) => (keys[k] = false)));

/* Looking: mouse (locked or not), two-finger swipe, or the arrow keys. */
const look = (dx, dy) => {
  if (!state.started || state.ended || stand.on || window.__g.noLook) return; // held while a mask is out; __g.noLook: tests hold the view still
  player.yaw -= dx;
  player.pitch = Math.max(-1.3, Math.min(1.3, player.pitch - dy));
};
addEventListener('mousemove', (e) => {
  const locked = document.pointerLockElement === renderer.domElement;
  look(e.movementX * (locked ? 0.0022 : 0.004), e.movementY * (locked ? 0.0022 : 0.004));
});
addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    // two fingers on a trackpad: across turns you (quickly: a half turn is about one swipe), up and down tilts the view
    const k = e.deltaMode === 1 ? 16 : 1;
    look(e.deltaX * k * 0.0085, e.deltaY * k * 0.004);
  },
  { passive: false },
);
const touchMove = { x: 0, y: 0, mag: 0 };
const turn = { left: 0 }; // radians still to turn after Space
/*
 * While a mask is out you stand in the middle of the corridor, looking along it, and the view is
 * held still (owner, 2026-11-17). The mask comes to you there, clear of both walls. If you take
 * it, its shadow stands up straight ahead and you can walk straight to it; if not, the mask goes
 * back and you can move again.
 */
const stand = { on: false, k: 1, x0: 0, yaw0: 0, pitch0: 0, yaw1: 0 };
const standStill = () => {
  // look toward the door, where a shadow will have room to stand (or back up the corridor if there is none)
  const want = player.pos.z - 12 > Z_END + 4 ? 0 : Math.PI;
  const yaw1 = Math.round((player.yaw - want) / (2 * Math.PI)) * 2 * Math.PI + want;
  Object.assign(stand, { on: true, k: 0, x0: player.pos.x, yaw0: player.yaw, pitch0: player.pitch, yaw1 });
  turn.left = 0;
};
const walkOn = () => (stand.on = false);
{
  const stick = $('stick'), nub = $('nub');
  const R = 50;
  let stickId = null, lookId = null, sx = 0, sy = 0, lx = 0, ly = 0, tap = null;
  const inPlay = () => state.started && !state.ended;
  addEventListener(
    'touchstart',
    (e) => {
      if (!touch.on) touchOn();
      if (!inPlay()) return;
      for (const t of e.changedTouches) {
        if (t.clientX < innerWidth * 0.45 && stickId === null) {
          stickId = t.identifier;
          sx = t.clientX;
          sy = t.clientY;
          stick.style.left = sx + 'px';
          stick.style.top = sy + 'px';
          stick.classList.add('on');
        } else if (lookId === null) {
          lookId = t.identifier;
          lx = t.clientX;
          ly = t.clientY;
          tap = { x: lx, y: ly, at: performance.now(), button: !!t.target.closest?.('.say-btn') };
        }
      }
      e.preventDefault();
    },
    { passive: false },
  );
  addEventListener(
    'touchmove',
    (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === stickId) {
          let dx = t.clientX - sx, dy = t.clientY - sy;
          const l = Math.hypot(dx, dy);
          if (l > R) (dx *= R / l), (dy *= R / l);
          nub.style.transform = `translate(${dx}px, ${dy}px)`;
          touchMove.x = dx / R;
          touchMove.y = dy / R;
          touchMove.mag = Math.min(1, l / R);
        } else if (t.identifier === lookId) {
          look((t.clientX - lx) * 0.009, (t.clientY - ly) * 0.006);
          lx = t.clientX;
          ly = t.clientY;
        }
      }
      if (inPlay()) e.preventDefault();
    },
    { passive: false },
  );
  const end = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === stickId) {
        stickId = null;
        touchMove.x = touchMove.y = touchMove.mag = 0;
        stick.classList.remove('on');
        stick.style.left = stick.style.top = '';
        nub.style.transform = '';
      }
      if (t.identifier === lookId) {
        lookId = null;
        // a short touch that did not move is a tap: pick, or dismiss
        if (tap && !tap.button && performance.now() - tap.at < 320 && Math.hypot(t.clientX - tap.x, t.clientY - tap.y) < 14) act();
        tap = null;
      }
    }
  };
  addEventListener('touchend', end);
  addEventListener('touchcancel', end);
}

/*
 * The flask is small, in the bottom right corner, a seventh of the screen's height, and still lights
 * the scene from there. For a reaction it comes to the middle and grows three times (vessel.react).
 */
const VESSEL_AT = 0.4; // metres in front of the eye
const layout = { corner: new THREE.Vector3(), centre: new THREE.Vector3(0, -0.035, -VESSEL_AT), scale: 1 };
const applyLayout = () => {
  const a = innerWidth / innerHeight;
  const halfH = VESSEL_AT * Math.tan((camera.fov * Math.PI) / 360), halfW = halfH * a;
  layout.scale = (2 * halfH) / 7 / vessel.height;
  const r = vessel.R * layout.scale, margin = 0.02;
  layout.corner.set(halfW - margin * 1.25 - r, -halfH + margin + r, -VESSEL_AT);
  vessel.group.position.copy(layout.corner);
  vessel.group.scale.setScalar(layout.scale);
};
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  post.resize();
  refl.resize();
  waterRefl.resize();
  dust.u.px.value = renderer.getPixelRatio() * innerHeight;
  shadow?.wisps.resize();
  applyLayout();
});

/* ── the people: loaded after the first frame is up ── */
let ready = false;
let body = null, shadow = null, masks = null, child = null, hand = null, people = null;
applyLayout();
loadPeople()
  .then((p) => {
    people = p;
    masks = buildMaskHall(scene, people, MASK_WALL, W / 2);
    // what has been faced stays faced: those masks hang mended
    for (const id of save.data.faced) {
      const m = masks.byId(id);
      if (m) masks.seal(m, true);
    }
    child = buildChild(scene, people, sack, sound);
    applyLayout();
    ready = true;
    $('loading').style.display = 'none';
    showChoice();
    Object.assign(window.__g, { masks, people, child });
    if (DEBUG) begin();
  })
  .catch((err) => {
    console.error(err);
    $('loading').textContent = 'Could not load the figures: ' + err.message;
  });

/* ── frame ── */
let lastT = performance.now();
const fwd = new THREE.Vector3(), right = new THREE.Vector3(), wish = new THREE.Vector3(), tmp = new THREE.Vector3(), toSh = new THREE.Vector3();
const rigQ = new THREE.Quaternion();
const accel = new THREE.Vector3(), prevVel = new THREE.Vector3();
let prevYaw = 0;
const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const movePlayer = (dt) => {
  fwd.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  right.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  let f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - touchMove.y;
  let r = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0) + touchMove.x;
  if (stand.on) {
    // glide to the middle of the corridor and turn to look along it
    stand.k = Math.min(1, stand.k + dt / 0.9);
    const e = stand.k * stand.k * (3 - 2 * stand.k);
    player.pos.x = stand.x0 * (1 - e);
    player.yaw = stand.yaw0 + (stand.yaw1 - stand.yaw0) * e;
    player.pitch = stand.pitch0 * (1 - e);
    f = r = 0;
  } else {
    if (keys.ArrowLeft) player.yaw += dt * 2.4;
    if (keys.ArrowRight) player.yaw -= dt * 2.4;
  }
  if (turn.left > 0) {
    const d = Math.min(turn.left, (dt * Math.PI) / 0.5);
    turn.left -= d;
    player.yaw += d;
  }
  const hurry = (keys.ShiftLeft || keys.ShiftRight || touchMove.mag > 0.95) && (f !== 0 || r !== 0);
  const active = state.started && !state.ended;
  wish.set(0, 0, 0);
  if (active) wish.addScaledVector(fwd, f).addScaledVector(right, r);
  if (wish.lengthSq() > 1) wish.normalize();
  // dread roots you: the closer it comes while you hold, the heavier your feet
  // wading is slow; on the stair you go carefully
  const wet = smoothstep(WATER + 0.2, WATER - 0.4, player.y);
  const onStair = player.pos.z < Z_END - 1 && player.pos.z > Z_STAIR_END ? 0.25 : 0;
  wish.multiplyScalar((hurry ? 2.7 : 1.4) * (1 - 0.6 * sh.dread) * (1 - 0.5 * wet) * (1 - onStair));
  player.vel.lerp(wish, 1 - Math.exp(-dt * 7));
  player.pos.addScaledVector(player.vel, dt);
  house.collide(player.pos, 0.32, doorOpen());
  // round the sack
  const SP = sack.bag.position;
  tmp.set(player.pos.x - SP.x, 0, player.pos.z - SP.z);
  const rr = sack.radius + 0.3;
  if (tmp.lengthSq() < rr * rr) {
    tmp.setLength(rr);
    player.pos.x = SP.x + tmp.x;
    player.pos.z = SP.z + tmp.z;
    house.collide(player.pos, 0.32, doorOpen());
  }
  player.speed = player.vel.length();
  player.stride += player.speed * dt;
  if (player.stride - player.lastStep > (hurry ? 0.95 : 0.74)) {
    player.lastStep = player.stride;
    sound.step((hurry ? 1.3 : 0.8) * (player.y < WATER + 0.3 ? 0.45 : 1));
  }
  // hold or discharge: hurrying leaks the vessel, stillness mends it
  if (hurry) {
    state.charge = Math.max(0.3, state.charge - dt * 0.2);
    state.runDebt = Math.min(1, state.runDebt + dt * 0.14);
  } else {
    state.charge = Math.min(1, state.charge + dt * (player.speed < 0.2 ? 0.16 : 0.05));
    state.runDebt = Math.max(0, state.runDebt - dt * (player.speed < 0.2 ? 0.05 : 0.012));
  }
  return hurry;
};

/* ── picking a mask ── */
let facing = null; // while a black mask's shadow is loose: { mask, def, kind, phase: 'smoke' | 'loose' | 'meet' | 'after', … }
let candidate = null; // the mask the eye is on, within reach

/** Click, E or tap: dismisses a text (or answers "take"), or picks what the hand is reaching for. */
const act = () => {
  if (!state.started || state.ended) return;
  if (words.open) return void words.click();
  if (candidate && !hand?.busy) pickMask(candidate);
};
const pickMask = (m) => {
  candidate = null;
  standStill();
  hand?.grab();
  sound.glass(m.black ? 196 : 784, 0.03, 1.2);
  m.state = 'picked'; // the hand closes first; then the mask comes off the wall
  later(0.3, () => masks.comeTo(m, () => showMask(m)));
};
const showMask = (m) => {
  const anchor = () => m.mesh.position;
  const back = () => {
    masks.sendBack(m);
    walkOn();
  };
  if (m.black) words.ask({ lines: m.def.lines, anchor, onDone: (k) => (k === 'take' ? takeMask(m) : back()) });
  else
    words.say({
      title: m.def.title,
      lines: m.def.lines,
      anchor,
      onDone: () => {
        back();
        if (!save.data.read.length) words.tip(TIPS.persona, { id: 'persona' });
        save.add('read', m.id);
        // the face you wear keeps another out of sight: that one moves on the wall
        if (m.def.hides && !facing && masks.stir(m.def.hides)) {
          sound.glass(147, 0.025, 1.6);
          words.tip(TIPS.stirred, { id: 'stirred', times: 2, gap: 60 });
        }
      },
    });
};
/** A black mask taken: it crumbles to smoke, the smoke runs down the corridor and stands up as a shadow. */
const takeMask = (m) => {
  facing = { mask: m, def: m.def, kind: m.def.kind, phase: 'smoke', t0: state.t, acc: 0, spot: null, from: new THREE.Vector3(), head: new THREE.Vector3(), st: 'wait', timer: 0, hold: 0, back: 0, wait: 0, side: 1, swap: 0, homeZ: 0 };
  words.clearTips(); // what was being said about walking and masks has had its moment
  sound.exhale();
  masks.crumble(m, walkOn); // once it has crumbled you can walk: its shadow will stand straight ahead
};

const corridorClamp = (z) => Math.max(Z_END + 1.4, Math.min(Z_BACK - 1.4, z));
const stepToward = (cur, want, max) => cur + Math.sign(want - cur) * Math.min(Math.abs(want - cur), max);
/** Where a shadow first stands: further in, toward the door; one of them behind you. */
const spotFor = (kind) => {
  if (kind === 'abandonment') return corridorClamp(player.pos.z + (fwd.z < 0 ? 1 : -1) * 5);
  const d = kind === 'confrontation' ? 9 : 12;
  let z = player.pos.z - d;
  if (z < Z_END + 4) z = player.pos.z + d; // no room there: back toward the start
  return corridorClamp(z);
};

/** You are inside it. The light goes; one line; then the signs that it is done, the flask, and what is next. */
const integrate = (F, t) => {
  F.phase = 'after';
  F.tIn = t;
  state.facedAt = t;
  sound.exhale();
  shadow.obj.updateMatrixWorld(true);
  shadow.wisps.burst(camera.position.clone().addScaledVector(fwd, 0.3));
  shadow.u.ash.value = 1;
  words.clearTips();
  words.whisper(F.def.inside, 3.6);
  later(3.7, () => {
    sound.glass(392, 0.12, 6);
    masks.seal(F.mask); // back on the wall, mended with gold
  });
  later(5.0, () => {
    sound.glass(587.3, 0.08, 7);
    words.word(F.def.strength, F.def.gives, 3.2);
  });
  later(8.6, () => {
    state.faced += 1;
    save.add('faced', F.mask.id);
    // the flask comes forward: the black boils, a bloom opens; after the third, the first white stays
    vessel.react({
      bloom: state.faced === 3 ? 0.55 : 0.3,
      onDone: () => {
        if (state.faced >= 3 && state.doorAt == null) {
          state.doorAt = state.t; // the door that was never there swings open
          sound.glass(261.6, 0.1, 8);
        }
        facing = null;
      },
    });
  });
};

/*
 * The Shadow. Until you take a black mask it is only a presence: steps behind you, a beat late.
 * A mask you take gives it a face: its smoke runs down the corridor and stands up in your shape,
 * person-sized, and grows toward the ceiling over about a minute (faster if you hurry). Each one
 * behaves in its own way and asks for its own way of facing it (PLAN.md 10.4):
 *   anger          comes at you fast and stands over you: stand; step back and it draws off, larger, and comes again
 *   abandonment    small, keeps behind you: stop, turn round and wait, and it comes
 *   confrontation  gives way as you come: walk at it steadily; hurrying drives it off
 *   (the rest)     stands and grows: walk to it
 * Once it is close and you have done what it asks, the meeting cannot be undone: it walks into you,
 * the light goes for a breath, and what it was made of rises as pale ash.
 */
const updateShadow = (dt, t, hurry) => {
  if (!shadow) return;
  if (!sh.awake && player.pos.z < -7.5) sh.awake = true;
  const F = facing, o = shadow.obj;
  let wispRate = 0, dreadWant = 0, visible = false, dist = 99;
  sh.dip = 0;

  if (!F) {
    // you hear it before it has a face: your own steps, from behind
    if (sh.awake && player.speed > 0.3) {
      sh.echo += player.speed * dt;
      if (sh.echo > 0.86) {
        sh.echo = 0;
        later(0.32, () => sound.echoStep(0.3));
      }
    }
  } else if (F.phase === 'smoke') {
    F.acc += dt * 70;
    const n = Math.floor(F.acc);
    F.acc -= n;
    if (t - F.t0 < 1.5) {
      if (n) shadow.wisps.puff(F.mask.mesh.position, n, 0.16, 0.2);
    } else {
      if (F.spot == null) {
        F.spot = spotFor(F.kind);
        F.from.copy(F.mask.mesh.position);
        F.run0 = t;
      }
      // the smoke runs low along the floor to where it will stand
      const k = Math.min(1, (t - F.run0) / 2.2), e = k * k * (3 - 2 * k);
      F.head.set(F.from.x + (0.2 - F.from.x) * e, F.from.y + (0.9 - F.from.y) * e - 0.55 * Math.sin(Math.PI * e), F.from.z + (F.spot - F.from.z) * e);
      if (n) shadow.wisps.puff(F.head, n, 0.22, 0.1);
      if (k >= 1) {
        F.phase = 'loose';
        F.unseen = 0;
        words.tip(TIPS.taken, { id: 'taken' });
        if (F.kind !== 'abandonment') words.tip(TIPS.light, { id: 'light' });
        F.timer = 0;
        sh.pos.set(0.2, 0, F.spot);
        sh.prev.copy(sh.pos);
        Object.assign(sh, { fade: 1, grow: 0, meet: false, scale: F.kind === 'abandonment' ? 0.62 : 1, prevDist: 99 });
        shadow.u.ash.value = 0;
        F.side = Math.sign(F.spot - player.pos.z) || 1;
      }
    }
  }

  if (F && (F.phase === 'loose' || F.phase === 'meet')) {
    visible = true;
    toSh.set(sh.pos.x - player.pos.x, 0, sh.pos.z - player.pos.z);
    dist = toSh.length();
    // for "close enough", across the corridor counts half: you may be standing by the wall
    const reach = Math.hypot(toSh.x * 0.5, toSh.z);
    toSh.normalize();
    const toward = player.vel.dot(toSh); // how fast you are closing on it (negative: backing off)
    const away = Math.sign(sh.pos.z - player.pos.z) || 1; // the way along the corridor that leads from you to it
    // you are looking at it: squarely from afar; close up, it is enough to face its end of the corridor
    // (you may be standing by a wall, with it a step to one side)
    const looking = fwd.dot(toSh) > 0.8 || (dist < 3.5 && fwd.z * away > 0.6);
    let wantZ = sh.pos.z, speed = 0, fadeWant = 0;
    F.timer += dt;
    if (!sh.meet) {
      // it grows toward the ceiling over about a minute; three times as fast while you hurry; and not at all while
      // you face it with your light
      const lit = looking && dist < 14;
      if (F.kind !== 'abandonment') sh.grow = Math.min(1, sh.grow + (dt / 60) * (hurry ? 3 : lit ? 0 : 1));
      // tips, when they are of use
      F.unseen = looking ? 0 : F.unseen + dt;
      if (hurry && player.speed > 2) words.tip(TIPS.hurry, { id: 'hurry', times: 2, gap: 25 });
      if (F.kind === 'abandonment') {
        if (looking && player.speed > 0.4 && F.timer > 4) words.tip(TIPS.waitForIt, { id: 'wait', times: 2, gap: 20 });
      } else if (F.unseen > 7 && F.st !== 'recoil') words.tip(TIPS.growing, { id: 'growing', times: 3, gap: 22 });
      if ((F.kind === 'still' || F.kind === 'confrontation') && looking && dist < 3.2 && player.speed < 0.3 && F.timer > 3) words.tip(TIPS.through, { id: 'through', times: 2, gap: 20 });
      if (F.kind === 'anger') {
        const stop = player.pos.z + away * 1.25;
        if (F.st === 'wait') {
          if (F.timer > 1.3) F.st = 'charge';
        } else if (F.st === 'charge') {
          speed = 5.4;
          wantZ = stop;
          if (Math.abs(sh.pos.z - stop) < 0.1) (F.st = 'loom'), (F.hold = 0);
        } else if (F.st === 'loom') {
          speed = 3;
          wantZ = stop;
          F.hold += dt;
          if (F.hold > 3.2) sh.meet = true;
        } else if (F.st === 'recoil') {
          speed = 6.5;
          wantZ = F.homeZ;
          if (F.timer > 2.4) F.st = 'charge';
        }
        // stepping back feeds it: it draws off, larger, and comes again
        if ((F.st === 'charge' && dist < 5) || F.st === 'loom') {
          F.back = toward < -0.45 ? F.back + dt : Math.max(0, F.back - dt * 2);
          if (F.back > 0.3) {
            Object.assign(F, { st: 'recoil', timer: 0, back: 0, homeZ: corridorClamp(player.pos.z + away * 10) });
            words.tip(TIPS.steppedBack, { id: 'steppedBack', times: 2, gap: 8 });
            sh.grow = Math.min(1, sh.grow + 0.2);
          }
        }
      } else if (F.kind === 'abandonment') {
        const still = player.speed < 0.3;
        // while you walk it keeps to the end of the corridor you have your back to. Once you stop it stays
        // where it is, so that turning round finds it there.
        const behind = fwd.z < 0 ? 1 : -1;
        F.turned = !still && !looking && Math.abs(fwd.z) > 0.55 && behind !== away && F.swap <= 0 ? (F.turned || 0) + dt : 0;
        if (F.turned > 0.5) (F.side = behind), (F.swap = 1), (F.turned = 0);
        if (F.swap > 0) {
          // it does not pass you: it lets go of its shape and takes it again behind you
          const before = F.swap;
          F.swap -= dt / 0.9;
          fadeWant = F.swap > 0.5 ? 1 : 0;
          if (before > 0.5 && F.swap <= 0.5) {
            sh.pos.z = corridorClamp(player.pos.z + F.side * 5);
            sh.prev.copy(sh.pos);
          }
        } else if (looking && still) {
          // you have stopped and turned: it dares to come
          F.wait += dt;
          if (F.wait > 0.7) (speed = 0.85), (wantZ = player.pos.z + away * 0.9);
        } else {
          F.wait = 0;
          speed = looking ? 3.0 : 2.4;
          wantZ = player.pos.z + away * (looking ? 6 : 5);
        }
        if (looking && reach < 1.2 && F.swap <= 0) sh.meet = true;
      } else if (F.kind === 'confrontation') {
        if (dist < 7.5) {
          if (toward > 0.3) {
            // it gives way before you: slower than you walk, faster than you run
            speed = hurry ? player.speed * 1.12 : toward * 0.42;
            wantZ = sh.pos.z + away * 10;
            if (hurry) sh.grow = Math.min(1, sh.grow + dt * 0.06);
          } else if (player.speed < 0.3 && dist < 6) {
            speed = 0.45; // you stop: it takes its distance back
            wantZ = player.pos.z + away * 6;
          }
        }
        if (reach < 1.6 && !hurry) sh.meet = true;
      } else if (reach < 1.75 && !hurry) sh.meet = true;
      if (reach < 0.7 && F.swap <= 0) sh.meet = true; // you walked into it
      sh.pos.z = corridorClamp(stepToward(sh.pos.z, wantZ, speed * dt));
      // it weaves a little, and walks round the sack rather than through it
      let sx = 0.22 * Math.sin(sh.pos.z * 0.4);
      // the one that comes at you comes at you, wherever in the corridor you stand
      if ((F.kind === 'anger' && (F.st === 'charge' || F.st === 'loom')) || (F.kind === 'abandonment' && F.wait > 0.7)) sx += (player.pos.x * 0.9 - sx) * smoothstep(6, 2, dist);
      const SP = sack.bag.position, clear = sack.radius + 0.35;
      const nearSack = Math.max(0, 1 - Math.abs(sh.pos.z - SP.z) / clear);
      if (nearSack > 0) sx += (SP.x + (SP.x < 0 ? 1 : -1) * clear - sx) * Math.min(1, nearSack * 1.6);
      sh.pos.x += (sx - sh.pos.x) * (1 - Math.exp(-dt * 5));
      if (sh.meet) F.phase = 'meet';
    } else {
      // from here it comes on its own
      tmp.set(player.pos.x - sh.pos.x, 0, player.pos.z - sh.pos.z);
      const d = tmp.length();
      if (d > 1e-3) sh.pos.addScaledVector(tmp, Math.min(1, (0.95 * dt) / d));
      if (dist < 0.45) integrate(F, t);
    }
    sh.fade = stepToward(sh.fade, fadeWant, dt / (fadeWant ? 0.35 : 1.3)); // it gathers itself out of the smoke
    dreadWant = sh.meet ? 1 : smoothstep(7, 1.4, dist) * (looking ? 1 : 0.4) * (F.kind === 'abandonment' ? 0.45 : 1);
    wispRate = 90 + 120 * sh.dread;
    // person-sized, growing toward the ceiling; the small one grows up as it comes; at the meeting, exactly your size
    const tall = F.kind === 'abandonment' ? 0.62 + 0.38 * smoothstep(4.5, 1.3, dist) * (F.wait > 0.5 ? 1 : 0.25) : (F.kind === 'anger' ? 1.12 : 1) + 0.8 * sh.grow;
    const want = sh.meet ? 1 : Math.min(1.8, tall);
    sh.scale += (want - sh.scale) * (1 - Math.exp(-dt * (sh.meet ? 1.6 : 0.9)));
  }

  if (F && F.phase === 'after') {
    const since = t - F.tIn;
    sh.fade = Math.min(1, sh.fade + dt / 0.6);
    visible = sh.fade < 0.999;
    dist = Math.hypot(sh.pos.x - player.pos.x, sh.pos.z - player.pos.z);
    // the light goes out for a breath (long enough to read the line), then comes back
    sh.dip = smoothstep(0.0, 0.35, since) * (1 - smoothstep(2.0, 4.4, since));
  }

  o.visible = visible && sh.fade < 0.999;
  shadow.shells.forEach((m) => (m.visible = o.visible));
  if (o.visible) {
    const s = sh.scale, thin = s > 1 ? 1 + 0.22 * (s - 1) : s; // grown, it is drawn out: tall and narrow
    o.position.copy(sh.pos);
    o.scale.set(0.0094 * thin, 0.0108 * s, 0.0094 * thin);
    o.rotation.y = Math.atan2(player.pos.x - sh.pos.x, player.pos.z - sh.pos.z);
    // walking or standing, from how fast it actually moves through the corridor
    const moved = o.position.distanceTo(sh.prev) / Math.max(dt, 1e-4);
    const approaching = dist < sh.prevDist;
    sh.prev.copy(o.position);
    sh.prevDist = dist;
    sh.gait += (smoothstep(0.08, 0.45, moved) - sh.gait) * (1 - Math.exp(-dt * 6));
    shadow.setGait(sh.gait);
    shadow.walk.timeScale = (approaching ? 1 : -1) * Math.min(1.4, moved / 1.26 / Math.max(0.6, s)) + 0.0001;
    shadow.mixer.update(dt);
    o.updateMatrixWorld(true);
    shadow.posture(sh.dread * (1 - smoothstep(1.5, 0.6, dist)), smoothstep(2.2, 0.8, dist) * (sh.meet ? 1 : 0.5));
    sh.stride += moved * dt;
    if (sh.gait > 0.3 && sh.stride - sh.lastStep > 0.8 * Math.max(0.6, s)) {
      sh.lastStep = sh.stride;
      sound.echoStep(smoothstep(16, 2, dist) * (1 - sh.fade));
    }
  }
  sh.dread += (dreadWant - sh.dread) * (1 - Math.exp(-dt * (F?.phase === 'after' ? 0.8 : 1.5)));
  shadow.u.time.value = t;
  shadow.u.fade.value = sh.fade;
  shadow.u.smoke.value = 1 + sh.dread * 0.6;
  shadow.wisps.update(dt, t, o.visible ? wispRate : 0);
};

/*
 * The eye adapts. Nine rays are cast in a cone round the view against the house's surfaces; the
 * nearer they are, the more the exposure comes down, eased over about half a second like an eye
 * getting used to a light held close to a wall. Far views keep the full exposure.
 */
const adapt = { value: 1, list: null, ray: new THREE.Raycaster(), dirs: [] };
for (const [h, v] of [[0, 0], [-0.45, 0], [0.45, 0], [0, -0.32], [0, 0.32], [-0.35, -0.25], [0.35, -0.25], [-0.35, 0.25], [0.35, 0.25]]) adapt.dirs.push(new THREE.Vector3(Math.sin(h), Math.sin(v), -1).normalize());
adapt.ray.far = 6;
const adaptExposure = (dt) => {
  if (!adapt.list) {
    adapt.list = [];
    const take = (root) => root.traverse((o) => o.isMesh && !o.isInstancedMesh && !o.isSkinnedMesh && o.visible && o.material && !o.material.transparent && adapt.list.push(o));
    take(house.group);
    take(sack.bag);
  }
  const list = adapt.list || [];
  let sum = 0;
  const d = new THREE.Vector3();
  for (const dir of adapt.dirs) {
    d.copy(dir).applyQuaternion(camera.quaternion);
    adapt.ray.set(camera.position, d);
    const hit = adapt.ray.intersectObjects(list, false)[0];
    sum += hit ? hit.distance : 6;
  }
  const mean = sum / adapt.dirs.length;
  const want = 1 - 0.76 * smoothstep(3.4, 0.7, mean);
  // the eye closes down quickly and opens up more slowly
  adapt.value += (want - adapt.value) * (1 - Math.exp(-dt * (want < adapt.value ? 4 : 1.5)));
  adapt.mean = mean;
};
/** The one instruction low on the screen: always what there is to do now. */
const lineNow = () => {
  if (!state.started || state.ended || words.open || vessel.rx.on || player.pos.z < Z_END - 0.4) return '';
  if (facing) return facing.phase === 'loose' || facing.phase === 'meet' ? (facing.def.hint ?? HINTS[facing.kind]) : '';
  if (state.faced >= 3) return state.t - state.doorAt < 40 ? LINES.door : LINES.doorAgain;
  if (state.faced > 0) return LINES.another(3 - state.faced);
  if (save.data.read.length) return LINES.afterWhite;
  const dMasks = Math.max(0, Math.max(player.pos.z - MASK_WALL.z0, MASK_WALL.z1 - player.pos.z));
  return dMasks < 4 ? LINES.wall[touch.on ? 'touch' : 'desk'] : LINES.start;
};
const doorOpen = () => state.doorAt != null && state.t - state.doorAt > 1.2;
const tick = (forceDt) => {
  const now = performance.now();
  const dt = forceDt ?? Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  const t = (state.t += dt);
  for (let i = timers.length - 1; i >= 0; i--)
    if (timers[i].at <= t) timers.splice(i, 1)[0].fn();
  const hurry = movePlayer(dt);
  if (params.has('demo')) demo.stage = (t / 9) % 4 < 3.5 ? Math.min(3, ((t / 9) % 4)) : 0;
  // reading is never under time pressure: the world slows while a text is open
  const slow = words.open ? 0.25 : 1;
  updateShadow(dt * slow, t, hurry);

  /* the eye */
  const bob = Math.sin(player.stride * 4.2) * 0.022 * Math.min(1, player.speed / 1.4);
  const sway = Math.cos(player.stride * 2.1) * 0.012 * Math.min(1, player.speed / 1.4);
  // down the stair the eye follows the steps, smoothed so each one is a soft drop
  player.y += (house.floorAt(player.pos.x, player.pos.z) - player.y) * (1 - Math.exp(-dt * 9));
  camera.position.set(player.pos.x + right.x * sway, player.y + EYE + bob, player.pos.z + right.z * sway);
  camera.rotation.set(player.pitch, player.yaw, 0);
  camera.updateMatrixWorld(true);

  /* the rig follows the eye a beat late; the vessel swings out as you turn */
  rig.position.copy(camera.position);
  rigQ.copy(camera.quaternion);
  rig.quaternion.slerp(rigQ, 1 - Math.exp(-dt * (state.started ? 12 : 60)));
  // the flask stays upright in the world whatever the eye does, so its liquid's "up" is the world's
  vessel.body.quaternion.copy(rig.quaternion).invert();
  // the liquid sloshes against how you speed up, slow down and turn
  accel.copy(player.vel).sub(prevVel).divideScalar(Math.max(dt, 1e-3));
  prevVel.copy(player.vel);
  const yawRate = (player.yaw - prevYaw) / Math.max(dt, 1e-3);
  prevYaw = player.yaw;
  // turning swings the flask sideways round you
  vessel.slosh(accel.x + right.x * yawRate * -1.2, accel.z + right.z * yawRate * -1.2, dt);
  // in its corner; for a reaction it comes to the middle and grows three times, the scene dimmed and blurred behind it
  const walk = Math.min(1, player.speed / 1.4);
  const rk = vessel.stepReaction(dt);
  vessel.group.position.lerpVectors(layout.corner, layout.centre, rk);
  vessel.group.scale.setScalar(layout.scale * (1 + 2 * rk));
  vessel.group.position.y += Math.sin(player.stride * 4.2 + 0.6) * 0.003 * walk;
  vessel.group.position.x += Math.cos(player.stride * 2.1) * 0.0025 * walk;
  post.dof.uniforms.veil.value = rk;

  /* the masks, the hand, the words */
  if (masks) {
    masks.update(dt, t, camera);
    const free = state.started && !state.ended && !words.open && !facing && !masks.held() && !vessel.rx.on && player.pos.z > Z_END;
    candidate = free ? masks.lookedAt(camera) : null;
  }
  hand?.update(dt, t, candidate && !hand.busy ? candidate.mesh.position : null, vessel.light);
  if (state.started && !save.hasProgress && player.pos.z < MASK_WALL.z0 + 3.5) words.tip(TIPS.wall, { id: 'wall' });
  words.update(t);
  words.line(lineNow());

  /* the sack breathes; nearer, you hear it; right beside it, it holds its breath */
  const dSack = Math.hypot(player.pos.x - sack.bag.position.x, player.pos.z - sack.bag.position.z);
  // the child drags it while it can (child.js); after that it only breathes
  if (child) child.update(dt * slow, t, player.pos);
  else sack.update(t, 0, 0);
  if (child && child.st.phase !== 'wait' && child.st.phase !== 'drag') sack.update(t, smoothstep(2.4, 1.3, dSack), 0);
  const breathLoud = Math.max(0, sack.u.breath.value) * smoothstep(11, 2.5, dSack) * (1 - smoothstep(2.4, 1.3, dSack));

  /* the vessel: what is in the glass answers what you do */
  const since = state.facedAt != null ? t - state.facedAt : 99;
  const n = state.faced;
  const V = vessel.state;
  const ease = (cur, target, rate) => cur + (target - cur) * (1 - Math.exp(-dt * rate));
  // its light is your charge; it shrinks while a shadow is near, and burns a little higher for each one faced
  V.heat = state.charge * (1 - 0.35 * sh.dread) * (1 + 0.12 * Math.min(n, 4));
  // hurrying makes it boil; going through a shadow sets it seething, then it settles
  V.boil = ease(V.boil, Math.min(1, (hurry ? 1 : player.speed > 0.2 ? 0.1 : 0.02) + Math.exp(-since / 3.5)), 1.6);
  // dread fills the bulb with black vapour; so does a shadow loose in the house
  V.fume = ease(V.fume, 1 + 0.9 * sh.dread + (facing && facing.phase !== 'after' ? 0.35 : 0), 2);
  // by the wall of masks pale grains rise in it; one stays for each shadow faced
  const dMasks = Math.max(0, Math.max(player.pos.z - MASK_WALL.z0, MASK_WALL.z1 - player.pos.z));
  V.flecks = ease(V.flecks, Math.max(0.6 * smoothstep(5, 0.5, dMasks), Math.min(1, 0.2 * n)), 1.2);
  // the liquid rises and falls with the sack's breath
  V.heave = 0.07 * sack.u.breath.value * smoothstep(10, 2.5, dSack);
  // the work: black; a little less black for each one faced; after the third, the first white
  const wantStage = demo.stage ?? [0, 0.1, 0.2, 0.55][Math.min(n, 3)] + 0.03 * Math.max(0, n - 3);
  V.stage = ease(V.stage, wantStage, 0.5);
  vessel.update(t);
  house.update(t);

  /* your own unseen body, for the shadow the vessel throws behind you */
  if (body) {
    body.obj.position.set(player.pos.x, player.y, player.pos.z);
    body.obj.rotation.y = player.yaw + Math.PI;
    body.walk.timeScale = player.speed / 1.26;
    body.mixer.update(dt);
  }

  /* heartbeat: faster and louder as it comes */
  if (sh.dread > 0.05 && t - state.lastBeat > 1.15 - 0.55 * sh.dread) {
    state.lastBeat = t;
    sound.heart(0.05 + 0.3 * sh.dread);
  }
  sound.update(breathLoud, sh.dread);

  /* haze: the vessel and the nearest candles */
  vessel.light.getWorldPosition(tmp);
  dust.u.time.value = t;
  dust.u.eye.value.copy(camera.position);
  dust.u.lightPos.value.copy(tmp);
  dust.u.lightPow.value = vessel.light.intensity;
  const near = house.lights
    .filter((l) => (player.pos.z < Z_END ? true : l !== house.stairLight && l !== house.spill))
    // below ground the air is closer and the candles are near the eye: less glow in it
    .map((l) => ({ light: l, weight: player.y < -1 ? 0.3 : 1, d: Math.abs(l.position.z - player.pos.z) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 6);
  post.setHaze([{ light: vessel.light, weight: 0.004 }, ...near]);
  refl.setGlow(near);
  post.haze.uniforms.time.value = t;
  post.finish.uniforms.time.value = t;
  post.finish.uniforms.close.value = sh.dread * (1 - sh.fade);
  post.finish.uniforms.pale.value = ease(post.finish.uniforms.pale.value, [0, 0.25, 0.5, 1][Math.min(n, 3)], 0.4);
  // ?norefl turns the floor's reflection off (to compare, or on a slow machine)
  adaptExposure(dt);
  post.finish.uniforms.exposure.value = EXPOSURE * adapt.value * (1 - 0.94 * (sh.dip || 0));
  refl.update(params.has('norefl') || player.y < -1.2);
  waterRefl.setGlow(near);
  waterRefl.update(params.has('norefl') || player.pos.z > Z_END + 1.5);
  // the door swings open once three shadows have been faced
  if (state.doorAt != null) house.openDoor(smoothstep(0, 3.5, t - state.doorAt));
  // wading out across the black water: the threshold of the second work
  if (!state.ended && !state.albedo && player.pos.z < Z_STAIR_END - 3.5) {
    state.albedo = true;
    state.ended = true;
    $('end2').classList.remove('hidden');
    document.exitPointerLock?.();
  }
  post.composer.render(dt);
};
const frame = () => {
  tick();
  requestAnimationFrame(frame);
};

/* testing hooks: ?debug skips the title and the mouse lock; __g.tp(x, z, yaw, pitch) jumps */
window.__g = {
  THREE, scene, camera, renderer, post, refl, waterRefl, house, adapt, sack, vessel, player, state, sh, layout, dust, rig, words, save, timers, act,
  get facing() { return facing; },
  get candidate() { return candidate; },
  stand,
  tp: (x, z, yaw = player.yaw, pitch = player.pitch) => {
    player.pos.set(x, 0, z);
    player.y = house.floorAt(x, z);
    player.yaw = yaw;
    player.pitch = pitch;
    player.vel.set(0, 0, 0);
    prevVel.set(0, 0, 0);
    prevYaw = yaw;
    rig.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
  },
  applyLayout, demo,
  /** Runs n frames by hand (the pane throttles animation when it is hidden). */
  step: (n = 1, dt = 1 / 60) => {
    if (n === 0) return void tick(0); // draw again without moving time on
    for (let i = 0; i < n; i++) tick(dt);
  },
  keys,
  /** Saves the frame as shots/<name>.png through the dev server (serve.py). */
  shot: async (name) => {
    tick(1 / 60);
    const blob = await new Promise((res) => renderer.domElement.toBlob(res, 'image/png'));
    await fetch('/shot?name=' + encodeURIComponent(name), { method: 'POST', body: blob });
    return name;
  },
  /** Brightness of the frame just drawn (sRGB luma 0..1), to compare with the references (mean 0.12, median 0.08, p90 0.25). */
  luma: () => {
    tick(1 / 60);
    const gl = renderer.getContext();
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    const px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const l = [];
    for (let i = 0; i < px.length; i += 4 * 37) l.push((0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255);
    l.sort((a, b) => a - b);
    const q = (f) => +l[Math.floor(f * (l.length - 1))].toFixed(3);
    return { mean: +(l.reduce((a, b) => a + b, 0) / l.length).toFixed(3), median: q(0.5), p90: q(0.9), p99: q(0.99) };
  },
};
requestAnimationFrame(frame);
