import * as THREE from 'three';
import { glowTexture } from './textures.js';
import { buildHouse, W, H, Z_BACK, Z_END, MASK_WALL, MASK_SCONCES, CHANDELIERS, SACK_AT, WATER, Z_STAIR_END } from './house.js';
import { buildVessel } from './vessel.js';
import { loadPeople } from './people.js';
import { buildSack } from './sack.js';
import { buildChild } from './child.js';
import { buildMaskHall } from './masks.js';
import { dressHouse } from './dressing.js';
import { buildAlbedo } from './albedo.js';
import { makeHand } from './pick.js';
import { makeWords } from './words.js';
import { save } from './save.js';
import { LINES, TIPS, HINTS, PAUSE_HOW, LETTERS, ALBEDO, INTRO } from './texts.js';
import { makePost, Sound } from './fx.js';
import { makeFloorReflection } from './reflect.js';
import { applyBake } from './bake.js';
import { makeWater } from './water.js';

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
/* Level II (albedo, src/albedo.js) is under the house. On since 2026-11-23 (the owner: "build albedo now"); ?noalbedo shows the old threshold card instead. */
const ALBEDO_ON = !params.has('noalbedo');
const TOUCH = matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && matchMedia('(hover: none)').matches);
/*
 * The lighter setting for phones: on a touch device, or with ?lite (?full forces the whole look on a phone).
 * The surfaces and the console stay; the chandelier models, busts, clock and paintings, the floor's mirror
 * and the masks' shadows go, and the flask's shadow map is halved.
 */
const LITE = (TOUCH && !params.has('full')) || params.has('lite');
/* Touch controls show on a touch device, and also from the first finger that lands (a laptop with a touch screen, a phone the browser did not announce). */
const touch = { on: TOUCH };
const touchOn = () => {
  touch.on = true;
  document.body.classList.add('touch');
};
if (TOUCH) touchOn();
const $ = (id) => document.getElementById(id);
/*
 * A button that works by tap as well as by click. While the game is running it takes every touch for walking
 * and looking (and so the browser makes no click of a tap): the pause card's Go on and Start again did nothing
 * on a phone (owner, 2026-11-17). Each button here answers its own touchend, and that stops the click after it.
 */
const onTap = (el, fn) => {
  el.addEventListener('click', fn);
  el.addEventListener('touchend', (e) => (e.preventDefault(), fn(e)), { passive: false });
};

/* ── the studio mark: three spiral arms ── */
{
  const arm = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const a = t * Math.PI * 1.55, r = 6 + t * 40;
    arm.push(`${i ? 'L' : 'M'}${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`);
  }
  const svg = [0, 120, 240].map((d) => `<path d="${arm.join(' ')}" transform="rotate(${d})" fill="none" stroke="#f2e6cc" stroke-width="5" stroke-linecap="round"/>`).join('');
  $('mark').innerHTML = svg;
  $('mark2').innerHTML = svg;
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
if (LITE) vessel.light.shadow.mapSize.set(512, 512);
// the phone keeps the coded chandeliers (no models), whose candle halos are large: on a small screen they
// read as blinding discs, so they are drawn smaller there
if (LITE) for (const f of house.flames) f.haloSize *= 0.5;
const post = makePost(renderer, scene, camera);
// the floor mirrors the corridor; the haze motes and the dust are left out of the mirror
const refl = makeFloorReflection(renderer, scene, camera, house.floorMat);
// the cellar's black water mirrors too, with its own pass (only one of the two runs at a time)
const waterRefl = makeFloorReflection(renderer, scene, camera, house.waterMat, { planeY: WATER, key: 'water', streak: 1 });
waterRefl.u.reflStrength.value = 1.6;
waterRefl.u.glowStrength.value = 0.004;
// the candles' light baked in Blender (bake.js); ?nobake shows the corridor without it
// the water moves, rings spread from what moves in it, and you see into it (water.js)
const water = makeWater(house.waterMat, { shallowZ: house.cellar.waterZ0, lite: LITE });
{
  const wz = house.cellar.waterZ0;
  water.track(() => (player.y < WATER - 0.05 && player.pos.z < wz && player.pos.z > -1000 ? player.pos : null), 0.0032, 0.5);
  // the candles standing at the waterline on the stair send out a slow ring now and then
  scene.updateMatrixWorld(true);
  const _f = new THREE.Vector3();
  const spots = [];
  for (const f of house.flames) {
    f.mesh.getWorldPosition(_f);
    // one per cluster of candles
    if (_f.y > WATER - 0.1 && _f.y < WATER + 0.45 && _f.z < wz + 0.5 && !spots.some((q) => q.distanceTo(_f) < 0.5)) spots.push(_f.clone().setY(WATER));
  }
  for (const at of spots) water.bob(() => at, 0.0009, 6);
}
// the phone has no mirror pass: the water mirrors the nearest candle flames itself (water.js)
const flameAt = [];
const _fwd = new THREE.Vector3();
let flamesAge = 9;
const waterFlames = () => {
  if ((flamesAge += 1) > 15 || !flameAt.length) {
    flamesAge = 0;
    flameAt.length = 0;
    const f = new THREE.Vector3();
    scene.traverseVisible((o) => {
      if (o.material !== house.flameMat) return;
      o.getWorldPosition(f);
      if (f.y > WATER + 0.01 && f.z < Z_END) flameAt.push({ p: f.clone(), d: 0 });
    });
  }
  // only what is ahead can be mirrored in the water before you
  camera.getWorldDirection(_fwd);
  for (const q of flameAt) {
    q.d = q.p.distanceToSquared(camera.position);
    if (_fwd.x * (q.p.x - camera.position.x) + _fwd.z * (q.p.z - camera.position.z) < 0.3) q.d += 1e6;
  }
  flameAt.sort((a, b) => a.d - b.d);
  water.setFlames(flameAt.filter((q) => q.d < 1e6).map((q) => q.p));
};
const bakeK = params.has('nobake') ? null : applyBake([house.floorMat, house.wallMat, house.panelMat, house.joinMat, house.ceilMat]);
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


/*
 * The introduction page (INTRO in texts.js) before the title card. "Begin" is the real path; a playable level card
 * sets `startAt` for this visit only, so nothing is saved by jumping. ?debug and ?at=... skip the page.
 */
let startAt = params.get('at');
{
  const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  $('intro-studio').textContent = INTRO.studio;
  $('intro-title').innerHTML = INTRO.title.map(esc).join('<br />');
  $('intro-tag').textContent = INTRO.tag;
  $('intro-concept').innerHTML = INTRO.concept.map((l) => `<p>${esc(l)}</p>`).join('');
  $('intro-begin').textContent = INTRO.begin;
  $('intro-hint').textContent = INTRO.testHint;
  const intro = $('intro');
  const leave = (at) => {
    startAt = at;
    intro.classList.add('hidden');
    setTimeout(() => (intro.style.display = 'none'), 1000);
  };
  const cards = $('intro-cards');
  INTRO.cards.forEach((c) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'lcard' + (c.playable ? '' : ' off');
    b.innerHTML = `<span class="num">${esc(c.num)}</span><span class="nm">${esc(c.name)}</span><span class="sb">${esc(c.sub)}</span><span class="tx">${esc(c.text)}</span>` + (c.playable ? `<span class="try">${esc(INTRO.test)}</span>` : '');
    if (!c.playable) {
      b.disabled = true;
      b.setAttribute('aria-disabled', 'true');
    } else onTap(b, (e) => (e.stopPropagation(), leave(c.at)));
    cards.appendChild(b);
  });
  onTap($('intro-begin'), (e) => (e.stopPropagation(), leave(params.get('at'))));
  if (DEBUG || params.has('at')) {
    intro.style.display = 'none';
  }
}

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
  onTap(b, (e) => {
    e.stopPropagation();
    gender = b.dataset.g;
    showChoice();
  }),
);
onTap($('restart'), (e) => {
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
  // level II waits under the house: its statue is the one the choice sets (Venus for a man, Apollo for a woman)
  if (ALBEDO_ON) {
    albedo = buildAlbedo({ scene, house, people, glowTex, renderer, gender, api: { teleport, words, vessel, sound, later, save, noWaterMirror: (list) => waterRefl.hideAlso(list) } });
    albedo.restore(save.data);
    // the horse's legs and the letters afloat break the water too
    water.track(() => (albedo.horse.pos.z < house.cellar.waterZ0 ? albedo.horse.pos : null), 0.0038, 0.45);
    for (const L of albedo.list) water.bob(() => (L.state === 'water' ? L.mesh.position : null), 0.0014, 4.5);
    // ?at=albedo: start at the top of the stair, level I counted as done for this visit only (nothing is saved)
    if (startAt === 'albedo') {
      state.faced = Math.max(3, state.faced);
      state.doorAt = -10;
      teleport(0, Z_END - 0.9, 0, -0.25);
    }
  }
  Object.assign(window.__g, { body, shadow, albedo });
  $('start').classList.add('hidden');
  if (!DEBUG) sound.start();
  // how to play, said once when you first wake
  if (!save.hasProgress) later(1.5, () => TIPS.wake[touch.on ? 'touch' : 'desk'].forEach((text, i) => words.tip(text, { id: 'wake' + i })));
};
/* ── the pause card: Esc or P, losing the mouse, or the II button on touch ── */
const pause = () => {
  if (state.paused || !state.started || state.ended) return;
  state.paused = true;
  Object.keys(keys).forEach((k) => (keys[k] = false));
  window.__releaseTouches?.();
  $('pausehow').textContent = albedo && (player.pos.z < Z_END - 0.4 || player.pos.z > 100) ? ALBEDO.pauseHow : PAUSE_HOW;
  $('restartgame').textContent = 'Start again';
  $('pause').classList.remove('hidden');
  sound.ctx?.suspend?.();
  if (document.pointerLockElement) document.exitPointerLock?.();
};
const resume = () => {
  if (!state.paused) return;
  state.paused = false;
  $('pause').classList.add('hidden');
  sound.ctx?.resume?.();
  lastT = performance.now(); // no jump in time for the pause
  if (!touch.on && !DEBUG) lock();
};
onTap($('resume'), (e) => (e.stopPropagation(), resume()));
onTap($('restartgame'), (e) => {
  e.stopPropagation();
  // asked twice: it forgets every mask faced
  const b = $('restartgame');
  if (b.dataset.sure !== '1') {
    b.dataset.sure = '1';
    b.textContent = touch.on ? 'Forget everything? Tap again' : 'Forget everything? Click again';
    return;
  }
  save.reset();
  location.reload();
});
$('restartgame').addEventListener('mouseleave', () => {
  $('restartgame').dataset.sure = '';
  $('restartgame').textContent = 'Start again';
});
$('pausebtn').addEventListener('touchstart', (e) => (e.preventDefault(), e.stopPropagation(), pause()), { passive: false });
$('pausebtn').addEventListener('click', (e) => (e.stopPropagation(), pause()));
// losing the mouse (Esc in the browser) pauses, on a computer
document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement && state.started && !state.ended && !touch.on && !DEBUG) pause();
});
addEventListener('blur', () => !DEBUG && pause());
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
  if (!e.repeat && (e.code === 'KeyP' || e.code === 'Escape') && state.started && !state.ended) state.paused ? resume() : pause();
  // Space turns you round (a trackpad makes a half turn a long swipe)
  if (!e.repeat && e.code === 'Space' && state.started && !state.ended && !stand.on) turn.left += Math.PI;
  keys[e.code] = true;
  if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
});
/* Picking: click or E (tap on touch). The same press dismisses a text, or answers "take". */
addEventListener('mousedown', (e) => {
  if (!state.started || e.target.closest?.('.overlay, .say-btn, .tbtn')) return;
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
const edge = { x: null }; // where the looking finger is, while it is down: held near either side of the screen, it keeps turning
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
/* Touch button: Pick (shown while a mask is within reach). It swallows its own touch so it neither starts the circle nor counts as a tap. */
for (const [id, fn] of [['pickbtn', () => act()]]) {
  const b = $(id);
  const go = (e) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };
  b.addEventListener('touchstart', go, { passive: false });
  b.addEventListener('click', go);
}
{
  const stick = $('stick'), nub = $('nub');
  const R = 50;
  let stickId = null, lookId = null, sx = 0, sy = 0, lx = 0, ly = 0, tap = null;
  const inPlay = () => state.started && !state.ended;
  /*
   * A finger lifted from a button that was taken away while it was down (the Take and Leave buttons go the
   * moment you tap them) sends its touchend to the removed button, and it never reaches the window. The game
   * then thought the finger was still down: held where the button was, near the side of the screen, it kept
   * turning you round and round, and no new touch could take over (owner, 2026-11-17, after the second
   * shadow). So: a touch that starts on a button is never a looking or walking finger; and any finger the
   * browser no longer lists as down is let go of, at every touch.
   */
  const release = (which) => {
    if (which === 'stick') {
      stickId = null;
      touchMove.x = touchMove.y = touchMove.mag = 0;
      stick.classList.remove('on');
      stick.style.left = stick.style.top = '';
      nub.style.transform = '';
    } else {
      lookId = null;
      edge.x = null;
      tap = null;
    }
  };
  const heal = (e) => {
    const down = new Set([...e.touches].map((t) => t.identifier));
    if (stickId !== null && !down.has(stickId)) release('stick');
    if (lookId !== null && !down.has(lookId)) release('look');
  };
  window.__releaseTouches = () => (release('stick'), release('look'));
  addEventListener(
    'touchstart',
    (e) => {
      if (!touch.on) touchOn();
      heal(e);
      if (!inPlay()) return;
      for (const t of e.changedTouches) {
        if (t.target.closest?.('button, .say-btn, .tbtn')) continue;
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
          edge.x = lx;
          tap = { x: lx, y: ly, at: performance.now(), button: false };
        }
      }
      e.preventDefault();
    },
    { passive: false },
  );
  addEventListener(
    'touchmove',
    (e) => {
      heal(e);
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
          // fine enough to aim at a mask (a phone's view is only about 30 degrees wide); big turns are made by holding the finger at the side
          look((t.clientX - lx) * 0.007, (t.clientY - ly) * 0.006);
          lx = t.clientX;
          ly = t.clientY;
          edge.x = lx;
        }
      }
      if (inPlay()) e.preventDefault();
    },
    { passive: false },
  );
  const end = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === stickId) release('stick');
      if (t.identifier === lookId) {
        // a short touch that did not move is a tap: pick, or dismiss
        const wasTap = tap && performance.now() - tap.at < 320 && Math.hypot(t.clientX - tap.x, t.clientY - tap.y) < 14;
        release('look');
        if (wasTap) act();
      }
    }
    heal(e);
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
let body = null, shadow = null, masks = null, child = null, hand = null, people = null, dressing = null, albedo = null;
// the look pass: real surfaces and objects, loaded alongside the people (the house keeps its coded look until they arrive)
// ?nodress leaves the coded look (to compare, or on a slow machine)
(params.has('nodress') ? new Promise(() => {}) : dressHouse(scene, house, { lite: LITE }))
  .then((d) => {
    dressing = d;
    refl.u.reflStrength.value = d.floorReflection;
    refl.hideAlso(d.noMirror);
    adapt.list = null; // the eye's rays now meet the new objects too
    window.__g.dressing = d;
  })
  .catch((err) => console.error('The house dressing did not load:', err));
applyLayout();
loadPeople()
  .then((p) => {
    people = p;
    masks = buildMaskHall(scene, people, MASK_WALL, W / 2);
    if (LITE) masks.meshes.forEach((m) => (m.castShadow = false));
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

/*
 * The puppet master (PLAN.md 10.4: "appears as fate"). While a shadow you took is loose, the house acts for it:
 * a candle ahead of you goes out, now and then; a door ahead shudders in its frame as if slammed; and your steps
 * drift, a slow pull to one side and back that you have to correct. It stops when you go through it: the candles
 * come back one by one. (Control also slams every door it passes: that is its own way, in updateShadow.)
 */
const puppet = { k: 0, drift: 0, nextCandle: 0, door: false, out: [], since: 0 };
const _pw = new THREE.Vector3();
const updatePuppet = (dt, t) => {
  const loose = !!facing && (facing.phase === 'loose' || facing.phase === 'meet');
  if (loose && !puppet.since) ((puppet.since = t), (puppet.nextCandle = t + 5 + Math.random() * 4), (puppet.door = false));
  if (!loose) puppet.since = 0;
  puppet.k += ((loose ? 1 : 0) - puppet.k) * (1 - Math.exp(-dt * 0.8));
  // the drift: a slow wander, never the same twice, at most a fifth of walking pace
  puppet.drift = puppet.k * 0.28 * Math.sin(t * 0.37 + 1.3 * Math.sin(t * 0.13)) * Math.sin(t * 0.21 + 0.7);
  if (loose && t > puppet.nextCandle) {
    puppet.nextCandle = t + 9 + Math.random() * 7;
    // a flame ahead of you, between three and twelve metres, that is still burning
    let best = null, bestD = 1e9;
    for (const f of house.flames) {
      if (f.out || !f.mesh.visible) continue;
      f.mesh.getWorldPosition(_pw);
      const dx = _pw.x - player.pos.x, dz = _pw.z - player.pos.z, d = Math.hypot(dx, dz);
      if (d < 3 || d > 12 || (dx * fwd.x + dz * fwd.z) / d < 0.55) continue;
      const score = Math.abs(d - 6) + Math.random() * 2;
      if (score < bestD) ((bestD = score), (best = f));
    }
    if (best) {
      best.out = true;
      best.haloWas = best.halo.visible;
      best.mesh.visible = best.halo.visible = false;
      best.mesh.getWorldPosition(_pw);
      shadow?.wisps.puff(_pw, 8, 0.03, 0.12); // a thread of smoke where it was
      // the light nearest to it loses a share of its strength
      let near = null, nd = 1e9;
      for (const l of house.lights) {
        const d = l.position.distanceTo(_pw);
        if (d < nd) ((nd = d), (near = l));
      }
      if (near && nd < 2.5) {
        near.userData.base0 ??= near.userData.base;
        near.userData.base = Math.max(near.userData.base0 * 0.35, near.userData.base - near.userData.base0 * 0.3);
      }
      puppet.out.push({ f: best, l: near && nd < 2.5 ? near : null });
    }
  }
  // once, a few seconds in: a door ahead jumps in its frame with a slam (not for control, whose way is the doors)
  if (loose && !puppet.door && facing.kind !== 'control' && t - puppet.since > 7) {
    const d = house.doors.find((d) => {
      const dz = d.z - player.pos.z, dx = d.side * W / 2 - player.pos.x, dist = Math.hypot(dx, dz);
      return dist > 3 && dist < 13 && (dx * fwd.x + dz * fwd.z) / dist > 0.6 && d.shake <= 0;
    });
    if (d) {
      puppet.door = true;
      d.shake = 1;
      sound.slam(smoothstep(30, 2, Math.abs(d.z - player.pos.z)));
    }
  }
  // after: the candles come back, one at a time
  if (!loose && puppet.out.length && t > (puppet.relight ?? 0)) {
    puppet.relight = t + 0.45;
    const { f, l } = puppet.out.shift();
    f.out = false;
    f.mesh.visible = true;
    f.halo.visible = f.haloWas;
    if (l) l.userData.base = l.userData.base0;
  }
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
  // the looking finger held near a side of the screen keeps turning that way, so a half turn needs no second swipe
  if (edge.x != null && !stand.on) {
    const m = Math.min(70, innerWidth * 0.2);
    if (edge.x < m) player.yaw += dt * 2.6 * (1 - edge.x / m);
    else if (edge.x > innerWidth - m) player.yaw -= dt * 2.6 * (1 - (innerWidth - edge.x) / m);
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
  // the puppet master's pull: only while you walk
  if (wish.lengthSq() > 0.01) wish.addScaledVector(right, puppet.drift * Math.min(1, wish.length()));
  player.vel.lerp(wish, 1 - Math.exp(-dt * 7));
  player.pos.addScaledVector(player.vel, dt);
  house.collide(player.pos, 0.32, doorOpen());
  // round the furniture: the console, the clock, the plinths, the column below
  if (dressing || albedo)
    for (const c of [...(dressing?.colliders ?? []), ...(albedo?.colliders ?? [])]) {
      const dx = player.pos.x - c.x, dz = (player.pos.z - c.z) / (c.along ? c.along / c.r : 1), rr2 = c.r + 0.25, dd = Math.hypot(dx, dz);
      if (dd < rr2 && dd > 1e-4) {
        player.pos.x = c.x + (dx / dd) * rr2;
        player.pos.z = c.z + (dz / dd) * rr2 * (c.along ? c.along / c.r : 1);
      }
    }
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
  if (candidate && !hand?.busy) {
    // level II's things to pick (letters, the box, the feelings, the figure) say what picking them does
    if (candidate.onPick) {
      const c = candidate;
      candidate = null;
      hand?.grab();
      return void c.onPick();
    }
    pickMask(candidate);
  }
};
/** A sealed letter: it rises from the water to your eye; read, its seal breaks and it sinks, and white comes into the flask. */
const pickLetter = (L) => {
  candidate = null;
  hand?.grab();
  sound.glass(659.3, 0.04, 2);
  albedo.lift(L, camera);
  L.reading = true;
  later(1.2, () =>
    words.say({
      title: L.def.title,
      lines: L.def.lines,
      anchor: () => L.mesh.position,
      onDone: () => {
        L.reading = false;
        albedo.sink(L);
        save.add('letters', L.id);
        vessel.react({ bloom: 0.35 });
      },
    }),
  );
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
/**
 * Where a shadow first stands ({ x, z }): further in, toward the door; abandonment behind you;
 * envy by a light; shame in the darkest place the corridor has.
 */
const ahead = (d) => {
  let z = player.pos.z - d;
  if (z < Z_END + 4) z = player.pos.z + d; // no room there: back toward the start
  return corridorClamp(z);
};
/** The places that shine: under the chandeliers, and by the two sconces of the masks. */
const SHINING = [...CHANDELIERS.map((z) => ({ x: 0.55, z: z + 0.4 })), ...MASK_SCONCES.map((z) => ({ x: W / 2 - 0.55, z }))];
const shiningSpot = (minD = 8, notZ = null) => {
  const ok = SHINING.filter((p) => Math.abs(p.z - player.pos.z) > minD && p.z !== notZ);
  ok.sort((a, b) => Math.abs(a.z - player.pos.z) - Math.abs(b.z - player.pos.z));
  return ok[0] || SHINING.find((p) => p.z !== notZ) || SHINING[0];
};
/** The darkest place in the corridor away from you: the point furthest from every light, by a wall. */
const darkestSpot = () => {
  let best = null;
  for (let z = Z_BACK - 0.9; z > Z_END + 1.2; z -= 0.25) {
    if (Math.abs(z - player.pos.z) < 7) continue;
    let near = 1e9;
    for (const l of house.lights) if (l.position.y > -0.5) near = Math.min(near, Math.hypot(l.position.z - z, l.position.x * 0.5));
    if (!best || near > best.near) best = { z, near };
  }
  const x = (Math.abs(best.z + 30) % 2 < 1 ? -1 : 1) * (W / 2 - 0.45);
  return { x, z: best.z };
};
const spotFor = (kind) => {
  if (kind === 'abandonment') return { x: 0.2, z: corridorClamp(player.pos.z + (fwd.z < 0 ? 1 : -1) * 5) };
  if (kind === 'envy') return shiningSpot();
  if (kind === 'shame') return darkestSpot();
  const d = { confrontation: 9, need: 9, judgement: 11, control: 14 }[kind] ?? 12;
  return { x: 0.2, z: ahead(d) };
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
          words.whisper(LINES.more, 3.4);
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
 *   judgement      tall, points; its look pushes you back: keep walking into it
 *   envy           stands by a light and moves on as you come: stop near it, hold your light on it
 *   shame          hides in the darkest place, face covered: find it, hold your light on it
 *   need           reaches for you, then pulls away: hold out your light and wait
 *   control        walks at you stiffly, slamming every door it passes: stand still, then walk to it
 *   still          (spare) stands and grows: walk to it
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
        const sp = spotFor(F.kind);
        F.spot = sp.z;
        F.spotX = sp.x;
        F.from.copy(F.mask.mesh.position);
        F.run0 = t;
      }
      // the smoke runs low along the floor to where it will stand
      const k = Math.min(1, (t - F.run0) / 2.2), e = k * k * (3 - 2 * k);
      F.head.set(F.from.x + (F.spotX - F.from.x) * e, F.from.y + (0.9 - F.from.y) * e - 0.55 * Math.sin(Math.PI * e), F.from.z + (F.spot - F.from.z) * e);
      if (n) shadow.wisps.puff(F.head, n, 0.22, 0.1);
      if (k >= 1) {
        F.phase = 'loose';
        F.unseen = 0;
        words.tip(TIPS.taken, { id: 'taken' });
        if (F.kind !== 'abandonment') words.tip(TIPS.light, { id: 'light' });
        F.timer = 0;
        sh.pos.set(F.spotX, 0, F.spot);
        sh.prev.copy(sh.pos);
        Object.assign(sh, { fade: 1, grow: 0, meet: false, scale: F.kind === 'abandonment' ? 0.62 : F.kind === 'shame' ? 0.82 : 1, prevDist: 99 });
        Object.assign(F, { hold: 0, slips: 0, pose: { point: 0, reach: 0, cover: 0 }, found: false, doorsLeft: null, still: 0, pushed: 0 });
        if (F.kind === 'envy') F.light = { x: F.spotX, z: F.spot };
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
      if (F.kind !== 'abandonment' && F.kind !== 'shame') sh.grow = Math.min(1, sh.grow + (dt / 60) * (hurry ? 3 : lit ? 0 : 1));
      // tips, when they are of use
      F.unseen = looking ? 0 : F.unseen + dt;
      if (hurry && player.speed > 2) words.tip(TIPS.hurry, { id: 'hurry', times: 2, gap: 25 });
      if (F.kind === 'abandonment') {
        if (looking && player.speed > 0.4 && F.timer > 4) words.tip(TIPS.waitForIt, { id: 'wait', times: 2, gap: 20 });
      } else if (F.unseen > 7 && F.st !== 'recoil' && F.kind !== 'shame') words.tip(TIPS.growing, { id: 'growing', times: 3, gap: 22 });
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
      } else if (F.kind === 'judgement') {
        // tall, pointing at you; while you face it its look pushes you back, harder the nearer you are
        F.pose.point = Math.min(1, F.pose.point + dt);
        if (looking && dist < 10) {
          // walking into it, it takes up to 60% of your stride (so you always get there); standing, it moves you back
          const k = smoothstep(10, 2.5, dist);
          const push = toward > 0.2 ? toward * 0.6 * k : 0.55 * k;
          player.pos.addScaledVector(toSh, -push * dt);
          house.collide(player.pos, 0.32, doorOpen());
          F.pushed = toward < 0.15 ? F.pushed + dt : Math.max(0, F.pushed - dt);
          if (F.pushed > 2.5) words.tip(TIPS.pushed, { id: 'pushed', times: 2, gap: 15 });
        }
        if (reach < 1.6) sh.meet = true;
      } else if (F.kind === 'envy') {
        // it stands by a light, its back to you, gazing up into it
        if (F.swap > 0) {
          const before = F.swap;
          F.swap -= dt / 0.9;
          fadeWant = F.swap > 0.5 ? 1 : 0;
          if (before > 0.5 && F.swap <= 0.5) {
            F.light = shiningSpot(7, F.light.z);
            sh.pos.set(F.light.x, 0, F.light.z);
            sh.prev.copy(sh.pos);
          }
        } else if (F.st !== 'come') {
          const still = player.speed < 0.3;
          // walk up to it and it moves on to another light; stop near it and hold your light on it, and it turns to yours
          if (!still && dist < 4.2 && F.hold < 0.5) {
            F.swap = 1;
            F.hold = 0;
            F.slips += 1;
            if (F.slips === 1) words.tip(TIPS.slipped, { id: 'slipped', times: 1 });
          } else if (still && looking && dist < 7) {
            F.hold += dt;
            if (F.hold > 0.8) words.tip(TIPS.holdLight, { id: 'holdLight', times: 1 });
            if (F.hold > 2.6) F.st = 'come';
          } else F.hold = Math.max(0, F.hold - dt * 0.5);
        }
        if (F.st === 'come') {
          speed = 0.9;
          wantZ = player.pos.z + away * 0.9;
          if (reach < 1.3) sh.meet = true;
        }
      } else if (F.kind === 'shame') {
        // it hides by a wall where no candle reaches, its back to you and its face in its hands
        F.pose.cover = F.found ? Math.max(0, F.pose.cover - dt / 1.6) : 1;
        if (!F.found) {
          if (looking && dist < 4.2) {
            F.hold += dt;
            if (F.hold > 0.6) words.tip(TIPS.holdLight, { id: 'holdLight', times: 1 });
            if (F.hold > 3) {
              F.found = true;
              sound.glass(220, 0.04, 2.5);
            }
          } else F.hold = Math.max(0, F.hold - dt * 0.5);
          if (F.timer > 35 && dist > 8) words.tip(TIPS.hidden, { id: 'hidden', times: 2, gap: 40 });
        } else {
          // found, it turns, lowers its hands, and comes the last step itself
          speed = F.pose.cover < 0.4 ? 0.6 : 0;
          wantZ = player.pos.z + away * 0.8;
          if (reach < 1.1) sh.meet = true;
        }
      } else if (F.kind === 'need') {
        // it comes, arms out, and stops short; reach for it and it pulls its hands back and goes
        if (F.st === 'withdraw') {
          F.pose.reach = Math.max(0, F.pose.reach - dt * 3);
          speed = 1.7;
          wantZ = player.pos.z + away * 5;
          if (F.timer > 2.2) (F.st = 'wait'), (F.hold = 0);
        } else {
          F.pose.reach = Math.min(1, F.pose.reach + dt * 0.8);
          speed = dist > 2.6 ? 1.0 : 0;
          wantZ = player.pos.z + away * 2.4;
          if (toward > 0.3 && dist < 4) {
            Object.assign(F, { st: 'withdraw', timer: 0, hold: 0 });
            words.tip(TIPS.grabbed, { id: 'grabbed', times: 2, gap: 15 });
          } else if (player.speed < 0.3 && looking && dist < 3.2) {
            F.hold += dt;
            if (F.hold > 3) (speed = 0.55), (wantZ = player.pos.z + away * 0.7);
            if (F.hold > 3 && reach < 1.05) sh.meet = true;
          } else F.hold = Math.max(0, F.hold - dt);
        }
      } else if (F.kind === 'control') {
        // it walks at you stiffly, and every door it passes slams shut; move, and it stops dead and tightens
        // the doors it still has to pass on its way to where it stops, 3.4 m short of you
        const stopZ = player.pos.z + away * 3.4;
        F.doorsLeft = house.doors.filter((d) => !d.shut && (d.z - sh.pos.z) * (d.z - stopZ) < 0);
        const still = player.speed < 0.3;
        F.still = still ? F.still + dt : 0;
        if (F.doorsLeft.length) {
          if (F.st === 'frozen') {
            sh.grow = Math.min(1, sh.grow + dt * 0.03);
            if (F.still > 1) F.st = 'walk';
          } else if (!still && F.timer > 1) {
            F.st = 'frozen';
            words.tip(TIPS.frozen, { id: 'frozen', times: 2, gap: 15 });
          } else {
            speed = 0.75;
            wantZ = stopZ;
          }
        } else if (reach < 1.6 && !hurry) sh.meet = true;
      } else if (reach < 1.75 && !hurry) sh.meet = true;
      if (reach < 0.7 && F.swap <= 0) sh.meet = true; // you walked into it
      const z0 = sh.pos.z;
      sh.pos.z = corridorClamp(stepToward(sh.pos.z, wantZ, speed * dt));
      if (F.kind === 'control') {
        // every door it walks past slams shut behind it
        let slammed = false;
        for (const d of house.doors)
          if (!d.shut && z0 !== sh.pos.z && (d.z - z0) * (d.z - sh.pos.z) <= 0) {
            house.slamDoor(d);
            sound.slam(smoothstep(30, 2, Math.abs(d.z - player.pos.z)));
            slammed = true;
          }
        if (slammed && !house.doors.some((d) => !d.shut && (d.z - sh.pos.z) * (d.z - (player.pos.z + away * 3.4)) < 0)) words.tip(TIPS.doorsShut, { id: 'doorsShut', times: 1 });
      }
      // it weaves a little, and walks round the sack rather than through it
      let sx = 0.22 * Math.sin(sh.pos.z * 0.4);
      // the one that comes at you comes at you, wherever in the corridor you stand
      if ((F.kind === 'anger' && (F.st === 'charge' || F.st === 'loom')) || (F.kind === 'abandonment' && F.wait > 0.7) || F.st === 'come' || F.found || (F.kind === 'need' && F.hold > 3)) sx += (player.pos.x * 0.9 - sx) * smoothstep(6, 2, dist);
      // the ones that keep to a place keep to it
      if ((F.kind === 'shame' && !F.found) || (F.kind === 'envy' && F.st !== 'come')) sx = F.kind === 'shame' ? F.spotX : F.light.x;
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
    // shame is found by its heartbeat as much as by the eye: you hear it before you see it
    if (F.kind === 'shame' && !F.found) dreadWant = Math.max(dreadWant, 0.25 * smoothstep(12, 3, dist));
    wispRate = 90 + 120 * sh.dread;
    // person-sized, growing toward the ceiling; the small one grows up as it comes; at the meeting, exactly your size
    const tall = F.kind === 'abandonment' ? 0.62 + 0.38 * smoothstep(4.5, 1.3, dist) * (F.wait > 0.5 ? 1 : 0.25) : F.kind === 'shame' ? 0.82 + 0.18 * (F.found ? 1 : 0) : ({ anger: 1.12, judgement: 1.3, control: 1.06 }[F.kind] ?? 1) + 0.8 * sh.grow;
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
    // shame turns its back to you and its face to the wall; envy gazes into its light; until they are met
    if (F && F.kind === 'shame' && !F.found && !sh.meet) o.rotation.y = Math.atan2(Math.sign(sh.pos.x) || 1, 0);
    if (F && F.kind === 'envy' && F.st !== 'come' && !sh.meet) o.rotation.y += Math.PI;
    if (window.__g.faceYaw != null) o.rotation.y = window.__g.faceYaw; // testing: hold its facing (to see it from the side)
    // walking or standing, from how fast it actually moves through the corridor
    const moved = o.position.distanceTo(sh.prev) / Math.max(dt, 1e-4);
    const approaching = dist < sh.prevDist;
    sh.prev.copy(o.position);
    sh.prevDist = dist;
    sh.gait += (smoothstep(0.08, 0.45, moved) - sh.gait) * (1 - Math.exp(-dt * 6));
    shadow.setGait(F?.kind === 'control' ? Math.min(sh.gait, 0.35) : sh.gait);
    shadow.walk.timeScale = (approaching ? 1 : -1) * Math.min(1.4, moved / 1.26 / Math.max(0.6, s)) + 0.0001;
    shadow.unbend();
    shadow.mixer.update(dt);
    o.updateMatrixWorld(true);
    const P = F?.pose;
    const bowed = F?.kind === 'shame' && !F.found ? 1 : 0, gazing = F?.kind === 'envy' && F.st !== 'come' && !sh.meet ? 1 : 0;
    shadow.posture(Math.max(bowed, sh.dread * (1 - smoothstep(1.5, 0.6, dist))), Math.max(gazing * 1.4, smoothstep(2.2, 0.8, dist) * (sh.meet ? 1 : 0.5)));
    if (P) {
      // as it meets you its arms come down
      const k = sh.meet ? Math.max(0, 1 - (F.metAt != null ? t - F.metAt : 0) / 1.2) : 1;
      if (sh.meet && F.metAt == null) F.metAt = t;
      shadow.arms({ point: P.point * k, reach: P.reach * k, cover: P.cover * k });
    }
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
  // what the eye can be close to: the house, the sack and (below the house) albedo's stair walls, flooded
  // corridor, dream rooms and hall, whichever are shown; gathered again twice a second as parts are hidden
  adapt.age = (adapt.age ?? 1) + dt;
  if (!adapt.list || adapt.age > 0.5) {
    adapt.age = 0;
    adapt.list = [];
    const take = (root) => root?.traverseVisible((o) => o.isMesh && !o.isInstancedMesh && !o.isSkinnedMesh && o.material && !o.material.transparent && adapt.list.push(o));
    take(house.group);
    take(sack.bag);
    take(albedo?.group);
  }
  const list = adapt.list || [];
  let sum = 0, nearest = 6;
  const d = new THREE.Vector3();
  for (const dir of adapt.dirs) {
    d.copy(dir).applyQuaternion(camera.quaternion);
    adapt.ray.set(camera.position, d);
    const hit = adapt.ray.intersectObjects(list, false)[0];
    sum += hit ? hit.distance : 6;
    if (hit) nearest = Math.min(nearest, hit.distance);
  }
  // pressed up against a wall or a door, the flask's light (falling off as 1/d^1.6) would burn a white
  // spot into it: it is held lower the closer the nearest surface is
  const dimWant = 0.22 + 0.78 * smoothstep(0.2, 1.2, nearest);
  adapt.dim = (adapt.dim ?? 1) + (dimWant - (adapt.dim ?? 1)) * (1 - Math.exp(-dt * 5));
  const mean = sum / adapt.dirs.length;
  const want = 1 - 0.76 * smoothstep(3.4, 0.7, mean);
  // the eye closes down quickly and opens up more slowly
  adapt.value += (want - adapt.value) * (1 - Math.exp(-dt * (want < adapt.value ? 4 : 1.5)));
  adapt.mean = mean;
};
/** The one instruction low on the screen: always what there is to do now. */
const lineNow = () => {
  if (!state.started || state.ended || words.open || vessel.rx.on) return '';
  if (player.pos.z < Z_END - 0.4 || player.pos.z > 100) {
    if (!albedo) return player.pos.z < Z_STAIR_END ? 'Wade out into the water.' : '';
    return albedo.line(player);
  }
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
  updatePuppet(dt * slow, t);

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
  // but never so late that the flask in its corner swings out of the frame on a fast turn (0.07 rad of lag at most)
  const lag = rig.quaternion.angleTo(rigQ);
  if (lag > 0.07) rig.quaternion.rotateTowards(rigQ, lag - 0.07);
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
    const free = state.started && !state.ended && !words.open && !facing && !masks.held() && !vessel.rx.on;
    const below = player.pos.z < Z_END - 1;
    const reading = albedo?.list.some((L) => L.state === 'rising' || L.state === 'held');
    const dream = player.pos.z > 100; // albedo's dream rooms are built far behind the house
    candidate = free && !below && !dream ? masks.lookedAt(camera) : free && (below || dream) && albedo && !reading ? albedo.lookedAt(camera, touch.on) : null;
  }
  // the touch buttons and the circle follow what can be done: nothing to walk or turn while a mask is out
  if (touch.on) {
    $('pickbtn').classList.toggle('hidden', !(candidate && !hand?.busy && !stand.on));
    $('stick').classList.toggle('away', !state.started || stand.on);
  }
  // the hand keeps most of its brightness where the picture is graded down (pick.js, st.comp)
  if (hand) hand.st.comp = Math.min(2.2, Math.pow(1 / Math.max(0.3, (albedo?.st.exposure ?? 1) * (LITE ? 0.85 : 1)), 0.75)) * (player.pos.z < Z_END - 0.5 ? 1.25 : 1);
  hand?.update(dt, t, candidate && !hand.busy ? candidate.mesh.position : null, vessel.light);
  // the first time a letter is within reach: how to pick it up, said for the screen you play on
  if (albedo && state.started && !words.open && albedo.letterNear(camera) < 4.2) words.tip(TIPS.letter[touch.on ? 'touch' : 'desk'], { id: 'letter' });
  if (state.started && !save.hasProgress && player.pos.z < MASK_WALL.z0 + 3.5 && player.pos.z > MASK_WALL.z1 - 6) words.tip(TIPS.wall, { id: 'wall' }); // at the wall of masks only, not below the house
  words.update(t);
  words.line(lineNow());

  /* the sack breathes; nearer, you hear it; right beside it, it holds its breath */
  const dSack = Math.hypot(player.pos.x - sack.bag.position.x, player.pos.z - sack.bag.position.z);
  // the child drags it while it can (child.js); after that it only breathes
  if (child) child.update(dt * slow, t, player.pos);
  else sack.update(t, 0, 0);
  if (child && child.st.phase !== 'wait' && child.st.phase !== 'drag') sack.update(t, smoothstep(2.4, 1.3, dSack), 0);
  // after the third shadow the sack's tie slips and something warm shows at its neck
  state.loose = (state.loose ?? 0) + ((state.doorAt != null ? 1 : 0) - (state.loose ?? 0)) * (1 - Math.exp(-dt * 0.5));
  sack.loosen(state.loose, t);
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
  const lettersRead = save.data.letters.length, goldBack = albedo?.st.gold ? 1 : 0;
  const wantStage = demo.stage ?? Math.min(1, [0, 0.1, 0.2, 0.55][Math.min(n, 3)] + 0.03 * Math.max(0, n - 3) + 0.1 * lettersRead + 0.15 * goldBack);
  V.stage = ease(V.stage, wantStage, 0.5);
  water.update(t, dt, player.pos.z < Z_END);
  if (LITE && player.pos.z < Z_END) waterFlames();
  vessel.update(t);
  vessel.light.intensity *= adapt.dim ?? 1; // held lower close to a surface (adaptExposure)
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
  post.finish.uniforms.pale.value = ease(post.finish.uniforms.pale.value, [0, 0.25, 0.5, 1][Math.min(n, 3)] * (1 - 0.3 * goldBack), 0.4);
  // ?norefl turns the floor's reflection off (to compare, or on a slow machine)
  adaptExposure(dt);
  // phones are looked at close, in the dark, on a bright screen: 15% less there (the owner found it blinding)
  post.finish.uniforms.exposure.value = EXPOSURE * adapt.value * (1 - 0.94 * (sh.dip || 0)) * (albedo?.st.exposure ?? 1) * (LITE ? 0.85 : 1);
  // an opened letter is held at the eye and shown as at the house's own exposure, however dark the place is graded
  if (albedo) albedo.st.paperGain = Math.min(3, EXPOSURE / Math.max(1e-3, post.finish.uniforms.exposure.value));
  refl.update(params.has('norefl') || LITE || player.y < -1.2);
  waterRefl.setGlow(near);
  waterRefl.update(params.has('norefl') || LITE || player.pos.z > Z_END + 1.5);
  // the door swings open once three shadows have been faced
  if (state.doorAt != null) house.openDoor(smoothstep(0, 3.5, t - state.doorAt));
  // below the house: level II, albedo (albedo.js)
  if (albedo) {
    vessel.light.getWorldPosition(tmp);
    albedo.update(dt, t, camera, tmp, sound, player);
    if (!state.albedo && player.pos.z < Z_STAIR_END - 0.5) {
      state.albedo = true;
      words.word(ALBEDO.title, ALBEDO.enter, 4.5);
    }
    if (albedo.st.gold && !save.data.gold) {
      save.set({ gold: true });
      words.tip(ALBEDO.goldBack, { id: 'goldBack' });
      later(6, () => words.tip(ALBEDO.otherWaits, { id: 'otherWaits' }));
      vessel.react({ bloom: 0.4 });
    }
    if (albedo.st.done && !state.albedoDone && !words.open && !vessel.rx.on) {
      state.albedoDone = true;
      later(4, () => {
        state.ended = true;
        $('end2text').innerHTML = ALBEDO.endCard;
        $('end2small').textContent = ALBEDO.next;
        $('end2').classList.remove('hidden');
        document.exitPointerLock?.();
      });
    }
  } else if (!state.ended && !state.albedo && player.pos.z < Z_STAIR_END - 3.5) {
    // level II is not open yet: wading out across the black water shows its threshold card
    state.albedo = true;
    state.ended = true;
    $('end2').classList.remove('hidden');
    document.exitPointerLock?.();
  }
  post.composer.render(dt);
};
const frame = () => {
  // paused: the picture stays, nothing moves (dt 0: no walking, no clock, no timers)
  if (state.paused) tick(0);
  else tick();
  requestAnimationFrame(frame);
};

/* testing hooks: ?debug skips the title and the mouse lock; __g.tp(x, z, yaw, pitch) jumps */
/** Puts you somewhere at once (albedo's dream rooms and back; the tests). */
function teleport(x, z, yaw = player.yaw, pitch = player.pitch) {
  player.pos.set(x, 0, z);
  player.y = house.floorAt(x, z);
  player.yaw = yaw;
  player.pitch = pitch;
  player.vel.set(0, 0, 0);
  prevVel.set(0, 0, 0);
  prevYaw = yaw;
  rig.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
}
window.__g = {
  bakeK,
  water,
  THREE, scene, camera, renderer, post, refl, waterRefl, house, adapt, sack, vessel, player, state, sh, layout, dust, rig, words, save, timers, act,
  get facing() { return facing; },
  get candidate() { return candidate; },
  edge, touchMove,
  puppet,
  LITE,
  stand, spotFor, darkestSpot, shiningSpot,
  tp: (x, z, yaw = player.yaw, pitch = player.pitch) => teleport(x, z, yaw, pitch),
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
