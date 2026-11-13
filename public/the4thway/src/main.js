import * as THREE from 'three';
import './atmosphere.js'; // patches fog before any material compiles
import { buildWorld, heightAt, START } from './world.js';
import { createSleepers } from './sleepers.js';
import { loadPeople } from './people.js';
import { buildLantern } from './lantern.js';
import { glowTexture } from './textures.js';
import { makePost, Sound } from './fx.js';
import { NOTES } from './lotus-interior.js';
import { buildFinale } from './finale.js';

/*
 * The Fourth Way, prototype: the plain of sleepers.
 * Walk, keep your presence, read the stones, and wake the companion with your light.
 * There is no failure: losing presence only costs time and distance.
 */

const DEBUG = new URLSearchParams(location.search).has('debug');
// phones and tablets: touch controls, and a lighter render
const TOUCH = matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches;
if (TOUCH) document.body.classList.add('touch');
const $ = (id) => document.getElementById(id);

/* ── the studio mark (same geometry as brand/soul-spiral-logo-*.svg) ── */
const drawMark = (svg) => {
  const arm = (off) => {
    let d = '';
    for (let i = 0; i <= 64; i++) {
      const t = i / 64;
      const r = 0.06 + t * 0.94;
      const a = off + t * Math.PI * 1.25;
      d += `${i ? 'L' : 'M'}${(Math.cos(a) * r * 46).toFixed(2)},${(Math.sin(a) * r * 46).toFixed(2)} `;
    }
    return d;
  };
  svg.innerHTML =
    [0, 1, 2].map((k) => `<path d="${arm(-Math.PI / 2 + (k * 2 * Math.PI) / 3)}" fill="none" stroke="#F2E6CC" stroke-width="5" stroke-linecap="round"/>`).join('') +
    '<circle r="4.5" fill="#F2E6CC"/>';
};
drawMark($('mark'));
drawMark($('mark2'));

/* ── renderer ── */
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, TOUCH ? 1 : 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 4000);
scene.add(camera);

await document.fonts.load('500 64px "Cormorant Garamond"').catch(() => {});

const glowTex = glowTexture();
const world = buildWorld(scene, renderer);
const sleepers = createSleepers(scene, glowTex);
const finale = buildFinale({ scene, glowTex, sleepers });
const people = await loadPeople(scene, glowTex).catch((e) => {
  console.warn('scanned people unavailable, using simple figures', e);
  return null;
});
const lantern = buildLantern(glowTex);
camera.add(lantern.group);
const hand = people?.buildHand();
// stones at the thresholds of the three places: what each one teaches
{
  const F = world.forest;
  const fe = F.entrance.clone().addScaledVector(F.across, -6).addScaledVector(F.out, -2);
  world.addStele(fe.x, fe.z, Math.atan2(F.out.x, F.out.z), ['The moving centre learns by imitation', 'and works faster than thought.', 'Let the body keep the time.'], { symbol: 'moving' });
  const S = world.spire;
  const se = S.doorPos.clone().addScaledVector(S.facing, 26).addScaledVector(new THREE.Vector3(S.facing.z, 0, -S.facing.x), 5);
  world.addStele(se.x, se.z, Math.atan2(S.facing.x, S.facing.z), ['Essence: what you were born with.', 'Personality: what you were given.', 'Only essence can grow.'], { symbol: 'essence' });
  world.addStele(-9, -90, 0, ['The heart, the breath, the day, a life:', 'everything that lives has its rhythm.', 'The lotus keeps time for all of them.'], { symbol: 'rhythm' });
  world.addStele(9, -91, 0, ['Nothing goes straight.', 'Where the line bends,', 'only a shock keeps it true.'], { symbol: 'octave' });
}
// the Lantern-Bearer herself, for the end of the tower's trial (Sophia, grey-haired)
if (people) world.cutscene.setActor(people.makeActor(2));
if (hand) lantern.attachHand(hand);
const post = makePost(renderer, scene, camera);
// on a phone the depth of field costs more than it gives
if (TOUCH) post.dof.enabled = false;
const sound = new Sound();

/* ── sparks for the waking ── */
const SPARKS = 140;
const sparkPos = new Float32Array(SPARKS * 3);
const sparkVel = [];
const sparks = new THREE.Points(
  new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(sparkPos, 3)),
  new THREE.PointsMaterial({ map: glowTex, color: new THREE.Color(3, 1.9, 0.8), size: 0.16, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
);
sparks.frustumCulled = false;
scene.add(sparks);
let sparkAge = -1;
const guide = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(2.4, 1.6, 0.6), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false }));
guide.renderOrder = 10;
scene.add(guide);

/* ── state ── */
const player = { pos: START.clone(), vel: new THREE.Vector3(), yaw: 0, pitch: -0.04, stride: 0, lastStep: 0 };
const state = { pressAt: -99, lotusDone: false, gems: 0, cut: false, towerDone: false, aimed: null, doorsOpen: false, doorsAt: 0, passed: [false, false, false, false], prevAlong: null, hollow: 0, forestDone: false, free: false, goalText: '', goalUntil: 0, started: false, presence: 1, sleep: 0, asleepFor: 0, raise: 0, breathing: 0, ended: false, t: 0, lastBeat: 0 };
const keys = {};
let mouseDown = false;

const begin = () => {
  if (state.started) return;
  state.started = true;
  $('start').classList.add('hidden');
  sound.start();
  setTimeout(() => ($('hints').style.opacity = '0'), 45000);
};

const lock = () => {
  try {
    renderer.domElement.requestPointerLock?.()?.catch?.(() => {});
  } catch {}
};
$('start').addEventListener('click', () => {
  lock();
  begin();
});
renderer.domElement.addEventListener('click', () => {
  if (state.started && document.pointerLockElement !== renderer.domElement) lock();
});
addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
});
addEventListener('keyup', (e) => (keys[e.code] = false));
/* The help screen doubles as the pause menu (H or Esc): continue, or restart from the beginning. */
let unlockingOnPurpose = false;
const toggleHelp = (show = $('help').classList.contains('hidden')) => {
  $('help').classList.toggle('hidden', !show);
  $('restart').classList.remove('confirm');
  $('restart').textContent = 'Restart';
  if (show) {
    unlockingOnPurpose = true;
    document.exitPointerLock?.();
  } else lock();
};
addEventListener('keydown', (e) => {
  if (!state.started || state.ended) return;
  if (e.code === 'KeyH') toggleHelp();
  if (e.code === 'Escape') toggleHelp($('help').classList.contains('hidden'));
});
// the browser takes Esc to release the mouse, so losing the lock in play opens the menu too
document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === renderer.domElement;
  if (!locked && !unlockingOnPurpose && state.started && !state.ended && $('help').classList.contains('hidden')) toggleHelp(true);
  if (!locked) unlockingOnPurpose = false;
});
$('help').addEventListener('click', () => toggleHelp(false));
$('resume').addEventListener('click', (e) => {
  e.stopPropagation();
  toggleHelp(false);
});
$('restart').addEventListener('click', (e) => {
  e.stopPropagation();
  const b = $('restart');
  // ask once more: a restart loses everything gathered so far
  if (!b.classList.contains('confirm')) {
    b.classList.add('confirm');
    b.textContent = 'Click again to restart';
    return;
  }
  location.href = location.pathname; // from the very beginning (and without any test jumps)
});
$('again').addEventListener('click', () => {
  // the end card is only a pause: the plain stays open to explore, with the companion awake
  $('end').classList.add('hidden');
  state.ended = false;
  state.free = true;
  if (world.cutscene.active) {
    world.cutscene.stop();
    state.cut = false;
    lantern.group.visible = true;
  }
  lock();
});
addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  mouseDown = true;
  state.pressAt = state.t; // when the lantern was raised: the lotus judges your timing by it
});
addEventListener('mouseup', (e) => e.button === 0 && (mouseDown = false));
/* Looking: mouse (pointer-locked or not), two-finger trackpad swipe, or the arrow keys.
   Some browsers and embedded panes refuse pointer lock, so none of these depend on it. */
const look = (dx, dy) => {
  if (!state.started || state.sleep > 0.5 || !$('help').classList.contains('hidden')) return;
  player.yaw -= dx;
  player.pitch = Math.max(-1.35, Math.min(1.35, player.pitch - dy));
};
// where the cursor is, for turning at the screen's edges when the pointer isn't locked
const cursor = { x: 0.5, inside: false };
addEventListener('mouseleave', () => (cursor.inside = false));
document.addEventListener('mouseleave', () => (cursor.inside = false));
addEventListener('mousemove', (e) => {
  cursor.x = e.clientX / innerWidth;
  cursor.inside = true;
  const locked = document.pointerLockElement === renderer.domElement;
  // without the lock the cursor moves too, so turn a little faster to reach around
  look(e.movementX * (locked ? 0.0022 : 0.004), e.movementY * (locked ? 0.0022 : 0.004));
});
addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    const k = e.deltaMode === 1 ? 16 : 1; // lines → pixels
    look(e.deltaX * k * 0.0035, e.deltaY * k * 0.0035);
  },
  { passive: false },
);
/* ── touch: a thumbstick wherever the left thumb lands, drag on the right to look, hold buttons ── */
const touchMove = { x: 0, y: 0, mag: 0 };
if (TOUCH) {
  const stick = $('stick'), nub = $('nub');
  const R = 50; // px of thumb travel for full speed
  let stickId = null, lookId = null, sx = 0, sy = 0, lx = 0, ly = 0;
  const inPlay = () => state.started && !state.ended && $('help').classList.contains('hidden');
  addEventListener(
    'touchstart',
    (e) => {
      if (!inPlay() || e.target.closest?.('.tbtn')) return;
      for (const t of e.changedTouches) {
        if (t.clientX < innerWidth * 0.45 && stickId === null) {
          stickId = t.identifier;
          sx = t.clientX;
          sy = t.clientY;
          stick.style.left = sx + 'px';
          stick.style.top = sy + 'px';
          nub.style.transform = '';
          stick.classList.add('on');
        } else if (lookId === null) {
          lookId = t.identifier;
          lx = t.clientX;
          ly = t.clientY;
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
          look((t.clientX - lx) * 0.006, (t.clientY - ly) * 0.006);
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
        // back to its resting place
        stick.style.left = stick.style.top = '';
        nub.style.transform = '';
      }
      if (t.identifier === lookId) lookId = null;
    }
  };
  addEventListener('touchend', end);
  addEventListener('touchcancel', end);
  // hold buttons: Light raises the lantern (as the mouse button does), Remember is Space
  const hold = (id, on, off) => {
    const b = $(id);
    b.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      b.classList.add('held');
      on();
    }, { passive: false });
    const up = (e) => {
      e.preventDefault();
      b.classList.remove('held');
      off();
    };
    b.addEventListener('touchend', up);
    b.addEventListener('touchcancel', up);
  };
  hold('tLight', () => {
    mouseDown = true;
    state.pressAt = state.t; // the lotus judges your timing by this
  }, () => (mouseDown = false));
  hold('tBreath', () => (keys.Space = true), () => (keys.Space = false));
  $('tPause').addEventListener('touchstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (state.started && !state.ended) toggleHelp(true);
  }, { passive: false });
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  post.resize();
});

/* ── physics: heightfield ground, circle colliders, soft pushes from sleepers ── */
const collide = (p) => {
  if (world.lotusIn.contains(p)) {
    world.lotusIn.collide(p);
    return;
  }
  // inside the tower its own walls, piers and dais hold you
  if (world.interior.contains(p)) {
    world.interior.collide(p);
    return;
  }
  for (const c of world.colliders) {
    const dx = p.x - c.x;
    const dz = p.z - c.z;
    const d = Math.hypot(dx, dz);
    const min = c.r + 0.35;
    if (d < min && d > 1e-4) {
      p.x = c.x + (dx / d) * min;
      p.z = c.z + (dz / d) * min;
    }
  }
  const sp = sleepers.positions;
  for (let i = 0; i < sleepers.count; i++) {
    const dx = p.x - sp[i * 2];
    const dz = p.z - sp[i * 2 + 1];
    const d2 = dx * dx + dz * dz;
    if (d2 < 0.5 && d2 > 1e-6) {
      const d = Math.sqrt(d2);
      p.x = sp[i * 2] + (dx / d) * 0.71;
      p.z = sp[i * 2 + 1] + (dz / d) * 0.71;
    }
  }
  const r = Math.hypot(p.x, p.z);
  // far enough to walk into the forest, up to the tower's dais and the lotus
  if (r > 188) {
    p.x *= 188 / r;
    p.z *= 188 / r;
  }
};

/* ── the diamonds: one for each teaching stone of the plain read with the raised lantern ── */
const gemsNeeded = () => world.steles.filter((s) => s.required).length;
// "Here nothing is lost", by the place you wake, is read first; after it the stones go in any order
const firstStone = () => world.steles.find((s) => s.required) || null;
const nextStone = () => {
  const f = firstStone();
  return f && !f.read ? f : null;
};
const nearestUnread = () => {
  const f = nextStone();
  if (f) return { s: f, d: Math.hypot(player.pos.x - f.pos.x, player.pos.z - f.pos.z) };
  let best = null;
  for (const s of world.steles) {
    if (!s.required || s.read) continue;
    const d = Math.hypot(player.pos.x - s.pos.x, player.pos.z - s.pos.z);
    if (!best || d < best.d) best = { s, d };
  }
  return best;
};
const gemSVG = (got) =>
  `<svg viewBox="-9 -12 18 24"><path d="M0 -11 L8 -3 L0 11 L-8 -3 Z M-8 -3 L8 -3 M0 -11 L-3 -3 L0 11 L3 -3 Z" fill="${got ? 'rgba(220,235,255,0.9)' : 'none'}" stroke="${got ? '#ffffff' : 'rgba(242,230,204,0.45)'}" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
const drawGems = (pop) => {
  const n = gemsNeeded();
  $('gems').innerHTML = Array.from({ length: n }, (_, i) => gemSVG(i < state.gems)).join('');
  if (pop && state.gems > 0) $('gems').children[state.gems - 1]?.classList.add('got');
};
drawGems(false);

/* ── moving between places: fade to black, move, fade back ── */
const travel = (to, yaw) => {
  state.fading = true;
  $('fade').style.opacity = '1';
  sound.bell(146.8, 0.08, 5);
  setTimeout(() => {
    player.pos.set(to.x, 0, to.z);
    player.vel.set(0, 0, 0);
    player.yaw = yaw;
    player.pitch = 0.02;
    state.prevAlong = null;
    $('fade').style.opacity = '0';
    setTimeout(() => (state.fading = false), 900);
  }, 750);
};

/* ── the forest chapter: the breathing roots across the path, and the hollow ── */
const _rel = new THREE.Vector3();
const forestFrame = () => {
  const F = world.forest;
  _rel.subVectors(player.pos, F.pos);
  return { F, along: _rel.dot(F.out), acr: _rel.dot(F.across) };
};
const forestPath = (dt) => {
  const { F, along: a0, acr } = forestFrame();
  let along = a0;
  const prev = state.prevAlong ?? along;
  if (Math.abs(acr) < F.gateHalfWidth) {
    for (const G of F.gates) {
      if (G.up < 0.35 || Math.abs(along - G.along) > 2.5) continue;
      // a raised wall of roots: you stay on the side you came from
      const fromPlain = prev >= G.along;
      if (fromPlain && along < G.along + 0.9) along = G.along + 0.9;
      else if (!fromPlain && along > G.along - 0.9) along = G.along - 0.9;
    }
  }
  if (along !== a0) {
    player.pos.copy(F.pos).addScaledVector(F.out, along).addScaledVector(F.across, acr);
    player.vel.multiplyScalar(0.2);
  }
  // crossing a sunk root toward the tree, in order, counts
  if (state.doorsOpen && Math.abs(acr) < F.gateHalfWidth) {
    F.gates.forEach((G, k) => {
      if (prev > G.along && along <= G.along && !state.passed[k] && (k === 0 || state.passed[k - 1])) {
        state.passed[k] = true;
        sound.bell(220 * Math.pow(1.25, k), 0.08, 5);
      }
    });
  }
  state.prevAlong = along;
};
const seedFly = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(0.5, 2.2, 1.4), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false }));
seedFly.renderOrder = 11;
scene.add(seedFly);
let seedFlyAge = -1;
const seedFrom = new THREE.Vector3();
const _lp = new THREE.Vector3();
const _sp = new THREE.Vector3();
// the end of the game: a line of Gurdjieff's and the credits the project owes
const FINAL_LINE = 'Remember yourself always and everywhere.<br><span style="opacity:0.7;letter-spacing:0.3em">G. I. Gurdjieff</span>';
const CREDITS = [
  'A game by Soul Spiral Studio',
  'Scanned people: Renderpeople (Nathan, Sophia)',
  'The Moon: NASA Scientific Visualization Studio, LRO colour mosaic',
  'Built with three.js',
].join('<br>');

/* ── autofocus: the distance to whatever is at the centre of the view ── */
const _fd = new THREE.Vector3();
let focusDist = 10;
const autofocus = (dt) => {
  camera.getWorldDirection(_fd);
  const o = camera.position;
  let best = Infinity;
  // sleepers: a cylinder around each body
  const sp = sleepers.positions;
  for (let i = 0; i < sleepers.count; i++) {
    const vx = sp[i * 2] - o.x;
    const vz = sp[i * 2 + 1] - o.z;
    const vy = -0.5;
    const t = vx * _fd.x + vy * _fd.y + vz * _fd.z;
    if (t < 0.8 || t > best) continue;
    const px = vx - _fd.x * t, py = vy - _fd.y * t, pz = vz - _fd.z * t;
    if (px * px + pz * pz < 0.45 && Math.abs(py) < 1.0) best = t;
  }
  // stones and monuments: vertical cylinders
  const l2 = Math.hypot(_fd.x, _fd.z);
  if (l2 > 1e-3) {
    const dx = _fd.x / l2, dz = _fd.z / l2;
    for (const c of world.colliders) {
      const ox = c.x - o.x, oz = c.z - o.z;
      const tc = ox * dx + oz * dz;
      if (tc <= 0) continue;
      const d2 = ox * ox + oz * oz - tc * tc;
      if (d2 > c.r * c.r) continue;
      const th = (tc - Math.sqrt(c.r * c.r - d2)) / l2;
      if (th > 0 && th < best) best = th;
    }
  }
  // the ground or water, when looking down
  if (_fd.y < -0.01) best = Math.min(best, (o.y - 0.0) / -_fd.y);
  let target = Math.min(120, Math.max(1.6, best === Infinity ? 80 : best));
  // over the lotus's lake, keep the flower and the pillar sharp
  if (world.lotusIn.contains(o)) target = Math.max(25, target);
  // ease, faster toward near things, like an eye
  focusDist += (target - focusDist) * (1 - Math.exp(-dt * (target < focusDist ? 6 : 3)));
  post.dof.uniforms.focus.value = focusDist;
};

/* ── loop ── */
const presenceArc = $('presence');
const core = $('core');
const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const wish = new THREE.Vector3();
let last = performance.now();

const tick = (now) => {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  state.t += dt;
  const t = state.t;
  const active = state.started && !state.ended;

  /* input → desired motion */
  forward.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  right.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  wish.set(0, 0, 0);
  const controlled = state.sleep > 0.5;
  if (active && !controlled && !state.cut && !state.walk) {
    if (keys.KeyW) wish.add(forward);
    if (keys.KeyS) wish.sub(forward);
    if (keys.KeyD) wish.add(right);
    if (keys.KeyA) wish.sub(right);
    if (touchMove.mag > 0.12) {
      wish.addScaledVector(forward, -touchMove.y);
      wish.addScaledVector(right, touchMove.x);
    }
    // arrow keys (and Q / E) turn and tilt the view
    const turn = (keys.ArrowLeft || keys.KeyQ ? 1 : 0) - (keys.ArrowRight || keys.KeyE ? 1 : 0);
    const tilt = (keys.ArrowUp ? 1 : 0) - (keys.ArrowDown ? 1 : 0);
    if (turn || tilt) look(-turn * 1.8 * dt, -tilt * 1.2 * dt);
    // without the pointer lock the cursor stops at the screen's edge: resting it near an edge keeps turning
    if (document.pointerLockElement !== renderer.domElement && cursor.inside) {
      const edge = cursor.x > 0.93 ? (cursor.x - 0.93) / 0.07 : cursor.x < 0.07 ? -(0.07 - cursor.x) / 0.07 : 0;
      if (edge) look(edge * 2.2 * dt, 0);
    }
  }
  if (finale.locked) wish.set(0, 0, 0); // the diamond and the gate: watch (you can still look round)
  if (finale.tiltUp) player.pitch += (0.5 - player.pitch) * Math.min(1, dt * 0.7);
  if (controlled) {
    // an "I" has taken over: it walks you on in a slow curve, like the sleepers
    player.yaw += dt * 0.22;
    wish.copy(forward);
    player.pitch += (-0.32 - player.pitch) * dt * 1.5;
  }
  if (state.walk && !state.cut) {
    // walking into the last mask: steady, unhurried, eyes on it
    const W = state.walk;
    const want = Math.atan2(-(W.at.x - player.pos.x), -(W.at.z - player.pos.z));
    let dy = want - player.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    player.yaw += dy * Math.min(1, dt * 2.5);
    player.pitch += (0.12 - player.pitch) * Math.min(1, dt * 2);
    forward.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    wish.copy(forward);
  }
  const hurry = !controlled && !state.walk && (keys.ShiftLeft || keys.ShiftRight);
  if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(state.walk ? 1.1 : controlled ? 1.2 : hurry ? 3.3 : 2.0);
  // the thumbstick walks slower when only pushed a little
  if (touchMove.mag > 0.12 && !controlled && !state.walk) wish.multiplyScalar(Math.max(0.35, touchMove.mag));
  player.vel.lerp(wish, 1 - Math.exp(-dt * 5));
  player.pos.addScaledVector(player.vel, dt);
  collide(player.pos);
  forestPath(dt);
  const speed = player.vel.length();
  const moving = Math.min(1, speed / 2);

  /* presence: drains with movement, refills when you stop and remember yourself */
  const breathing = active && !controlled && keys.Space && speed < 0.6;
  state.breathing += ((breathing ? 1 : 0) - state.breathing) * (1 - Math.exp(-dt * 3));
  if (finale.phase >= 2) state.presence = 1; // in the finale nothing drains
  if (active && !controlled) {
    // gentle: about a minute of walking before the ring empties
    const drain = 0.003 + moving * 0.014 * (hurry ? 1.7 : 1);
    state.presence += breathing ? 0.3 * dt : -drain * dt;
    state.presence = Math.max(0, Math.min(1, state.presence));
    if (state.presence <= 0) state.asleepFor = 5;
  }
  if (state.asleepFor > 0) {
    state.asleepFor -= dt;
    if (state.asleepFor <= 0) state.presence = 0.3;
  }
  const targetSleep = state.asleepFor > 0 ? 1 : 0;
  state.sleep += (targetSleep - state.sleep) * (1 - Math.exp(-dt * 2.2));

  /* the lantern */
  const wantRaise = active && mouseDown && !controlled;
  state.raise += ((wantRaise ? 1 : 0) - state.raise) * (1 - Math.exp(-dt * 6));

  /* camera */
  const inside = world.interior.contains(player.pos);
  const inLotus = world.lotusIn.contains(player.pos);
  // on the plain you walk on the still water's surface, like the sleepers
  const ground = inLotus ? 0 : inside ? world.interior.groundAt(player.pos) : Math.max(heightAt(player.pos.x, player.pos.z), 0);
  player.stride += speed * dt * 1.9;
  const bob = Math.sin(player.stride * 2) * 0.025 * moving;
  camera.position.set(player.pos.x, ground + 1.66 + bob + Math.sin(t * 1.3) * 0.006, player.pos.z);
  camera.rotation.set(player.pitch, player.yaw, Math.sin(player.stride) * 0.004 * moving, 'YXZ');

  /* the tower's trial: find the masks that speak, face them, look into the mirror */
  if (inside && active && !state.cut) {
    state.aimed = null;
    for (const ev of world.interior.updateTrial(t, dt, { camera, raise: state.raise })) {
      if (ev.type === 'aim') state.aimed = ev.mask;
      if (ev.type === 'faced') {
        sound.bell(392 * Math.pow(1.122, world.interior.trial.count), 0.1, 6);
        state.goalUntil = t + 5;
      }
      if (ev.type === 'allFaced') {
        sound.bell(196, 0.16, 9);
        setTimeout(() => sound.bell(293.7, 0.12, 9), 500);
      }
      if (ev.type === 'walkThrough') {
        // you are walked, slowly, into the last mask of light
        state.walk = { at: ev.at, flashed: false };
        world.interior.passing = true;
        sound.bell(261.6, 0.12, 9);
      }
    }
  }
  if (state.walk) {
    const W = state.walk;
    const dx = W.at.x - player.pos.x, dz = W.at.z - player.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 1.2 && !W.flashed) {
      W.flashed = true;
      // through it, into the light, and the thread is cut
      state.cut = true;
        $('fade').style.background = '#fff';
        $('fade').style.opacity = '1';
        sound.bell(523.3, 0.12, 10);
        setTimeout(() => {
          world.cutscene.start();
          lantern.group.visible = false;
          $('fade').style.opacity = '0';
          setTimeout(() => ($('fade').style.background = '#000'), 900);
          state.walk = null;
          world.interior.passing = false;
        }, 900);
    }
  }
  if (world.cutscene.active) {
    const ct = world.cutscene.update(t, dt, camera);
    if (ct > 6 && !state.cutChimed) {
      state.cutChimed = true;
      sound.bell(880, 0.08, 8);
      sound.bell(587.3, 0.1, 10);
    }
    if (ct > 12.5 && !state.towerDone) {
      state.towerDone = true;
      // and then toward the lotus
      sleepers.companion.goal = new THREE.Vector3(-4, 0, -138); // to the lotus's door
      $('fade').style.opacity = '1';
      setTimeout(() => {
        lantern.addSeed(new THREE.Color(0.6, 1.0, 2.4)); // the mind's seed, blue
        $('endTitle').textContent = 'THE TOWER';
        $('endSmall').textContent = 'What you were taught is not who you are';
        $('endPrompt').textContent = 'Next: the last level, coming soon';
        state.ended = true;
        document.exitPointerLock?.();
        $('end').classList.remove('hidden');
        $('fade').style.opacity = '0';
      }, 900);
    }
  }

  /* the lotus's trial: keep the heart's time, light the octave, give the shocks */
  if (inLotus && active && !state.cut) {
    const L = world.lotusIn;
    for (const ev of L.updateTrial(t, dt, { pos: player.pos, pressAt: state.pressAt, breathing: state.breathing, still: speed < 0.6 })) {
      if (ev.type === 'beat') sound.thump(0.22 * (0.4 + 0.6 * L.trial.help));
      if (ev.type === 'kept') sound.bell(1046.5, 0.035, 1.2);
      if (ev.type === 'missed') sound.bell(207.7, 0.03, 1.5);
      if (ev.type === 'lit') {
        sound.bell(NOTES[ev.i][1], 0.16, 7);
        state.goalUntil = t + 5;
      }
      // the drift is not announced: no sound, no words (that is the point)
      if (ev.type === 'hollow') sound.bell(98, 0.06, 0.5); // a dull thud: more of the same does nothing
      if (ev.type === 'silence') {
        sound.bell(155.6, 0.1, 6);
        state.goalUntil = t + 30;
      }
      if (ev.type === 'own') sound.thump(ev.ok ? 0.32 : 0.2); // your raise sounds as the heart
      if (ev.type === 'pulse') sound.thump(0.05); // the faint pulse that returns to help
      if (ev.type === 'remembered') sound.bell(1568, 0.03, 1.5);
      if (ev.type === 'shock') {
        sound.bell(261.6, 0.12, 8);
        setTimeout(() => sound.bell(392, 0.1, 8), 120);
        state.goalUntil = t + 5;
      }
      if (ev.type === 'complete') {
        // the octave closes on the high do; the heart opens and gives its seed
        sound.bell(NOTES[7][1], 0.18, 10);
        setTimeout(() => sound.bell(NOTES[4][1], 0.1, 10), 200);
        setTimeout(() => sound.bell(NOTES[2][1], 0.1, 10), 400);
        state.seedColor = new THREE.Color(2.4, 0.6, 0.45);
        seedFly.material.color.copy(state.seedColor);
        seedFrom.copy(L.centre).setY(L.heartY + 1);
        seedFlyAge = 0;
        setTimeout(() => {
          state.lotusDone = true;
          // the last level: back out onto the plain, facing the sleepers, to give it all back
          travel(new THREE.Vector3(0, 0, -139), Math.PI);
          setTimeout(() => finale.start(state.t), 900);
        }, 9000);
      }
    }
  }

  /* through the tower's crack of light, and back out by the doorway */
  if (active && !state.fading && !state.cut) {
    const S = world.spire;
    const dS = Math.hypot(player.pos.x - S.doorPos.x, player.pos.z - S.doorPos.z);
    const LD = new THREE.Vector3(0, 0, -144); // just outside the opening in the lotus's petals
    const dL = Math.hypot(player.pos.x - LD.x, player.pos.z - LD.z);
    if (!inside && !inLotus && state.doorsOpen && dL < 3.6) travel(world.lotusIn.entry, 0);
    else if (inLotus && world.lotusIn.atExit(player.pos)) travel(new THREE.Vector3(0, 0, -139), Math.PI);
    else if (!inside && state.doorsOpen && dS < 3.4) travel(world.interior.entry, 0);
    else if (inside && world.interior.atExit(player.pos)) {
      const out = S.doorPos.clone().addScaledVector(S.facing, 4.5);
      travel(out, Math.atan2(-S.facing.x, -S.facing.z));
    }
  }

  /* footsteps: two per stride cycle */
  if (active && moving > 0.2 && Math.floor(player.stride / Math.PI) !== player.lastStep) {
    player.lastStep = Math.floor(player.stride / Math.PI);
    sound.step(0.6 + moving * 0.5);
  }

  /* inscriptions appear in the lantern's light */
  const next = nextStone();
  state.waitingStone = null;
  for (const s of world.steles) {
    const d = camera.position.distanceTo(s.pos);
    // until the first stone is read, the others stay faint
    const locked = !!next && s.required && !s.read && s !== next;
    if (locked && d < 7) state.waitingStone = s;
    const near = d < 7 ? 1 : 0;
    // near, the words show faintly; only the raised lantern lights them fully and takes their knowledge.
    // The lantern's progress is kept when you lower it for a moment (it fades slowly), so a brief
    // slip of the button doesn't send the reading back to the start.
    const lit = near && !locked && state.raise > 0.6;
    s.progress = s.read ? 1 : Math.max(0, Math.min(1, (s.progress || 0) + (lit ? 0.5 : -0.12) * dt));
    const faint = near ? 0.3 : 0;
    s.reveal += (Math.max(faint, s.progress) - s.reveal) * (1 - Math.exp(-dt * 3));
    s.mat.opacity = s.reveal * (0.75 + 0.25 * Math.sin(t * 2.1));
    if (!s.seen && s.reveal > 0.25) {
      s.seen = true;
      sound.bell(392, 0.06, 3);
    }
    if (!s.read && s.progress >= 1) {
      s.read = true;
      if (s.required) {
        state.gems++;
        drawGems(true);
        sound.bell(587.3, 0.12, 6);
        setTimeout(() => sound.bell(880, 0.07, 5), 180);
        state.goalUntil = t + 6;
      }
    }
  }

  /* waking the companion */
  const c = sleepers.companion;
  if (active && c.awake < 0.01) {
    const d = Math.hypot(player.pos.x - c.pos.x, player.pos.z - c.pos.z);
    const lit = d < 3.5 && state.raise > 0.6 && state.presence > 0.1 && state.gems >= gemsNeeded();
    c.waking = Math.max(0, Math.min(1, c.waking + (lit ? 0.2 : -0.3) * dt));
    if (c.waking >= 1) {
      c.awake = 0.011;
      sound.bell(293.7, 0.16, 6);
      setTimeout(() => sound.bell(440, 0.1, 6), 260);
      sparkAge = 0;
      for (let i = 0; i < SPARKS; i++) {
        sparkPos[i * 3] = c.pos.x + (Math.random() - 0.5) * 0.4;
        sparkPos[i * 3 + 1] = c.pos.y + 1.4 + Math.random() * 0.5;
        sparkPos[i * 3 + 2] = c.pos.z + (Math.random() - 0.5) * 0.4;
        sparkVel.push([(Math.random() - 0.5) * 0.8, 0.8 + Math.random() * 1.8, (Math.random() - 0.5) * 0.8]);
      }
      // a few breaths later the three places wake with her, and she sets off toward the forest
      setTimeout(() => {
        world.openDoors();
        state.doorsOpen = true;
        state.doorsAt = state.t;
        sound.bell(196, 0.14, 8);
        setTimeout(() => sound.bell(261.6, 0.1, 8), 400);
        setTimeout(() => sound.bell(329.6, 0.1, 8), 800);
        const F = world.forest;
        c.goal = F.entrance.clone().addScaledVector(F.across, 3.5);
      }, 5000);
    }
  }
  if (c.awake > 0) c.awake = Math.min(1, c.awake + dt * 0.3);
  if (sparkAge >= 0) {
    sparkAge += dt;
    for (let i = 0; i < SPARKS; i++) {
      sparkPos[i * 3] += sparkVel[i][0] * dt;
      sparkPos[i * 3 + 1] += sparkVel[i][1] * dt;
      sparkPos[i * 3 + 2] += sparkVel[i][2] * dt;
    }
    sparks.geometry.attributes.position.needsUpdate = true;
    sparks.material.opacity = Math.max(0, 1 - sparkAge / 6);
  }

  /* the hollow: with the whole root path walked, raise your light to it and the tree wakes */
  {
    const F = world.forest;
    const dDoor = Math.hypot(player.pos.x - F.doorPos.x, player.pos.z - F.doorPos.z);
    const ready = state.doorsOpen && !F.solved && state.passed.every(Boolean);
    const lit = ready && dDoor < 8 && state.raise > 0.6;
    state.hollow = Math.max(0, Math.min(1, state.hollow + (lit ? 0.4 : -0.3) * dt));
    if (ready && state.hollow >= 1) {
      F.wake();
      sound.bell(174.6, 0.18, 9);
      setTimeout(() => sound.bell(261.6, 0.12, 9), 300);
      setTimeout(() => sound.bell(392, 0.1, 9), 650);
      seedFlyAge = 0;
      state.seedColor = new THREE.Color(0.4, 2.2, 1.3);
      seedFly.material.color.copy(state.seedColor);
      seedFrom.copy(F.doorPos).setY(3.2);
      // an inscription by the hollow, for the one who walked with the breath
      const side = F.doorPos.clone().addScaledVector(F.across, 5.5).addScaledVector(F.out, 4);
      world.addStele(side.x, side.z, Math.atan2(F.out.x, F.out.z) - 0.4, ['The body knew the way.', 'It only asked you to be there.'], { symbol: 'tree' });
      setTimeout(() => {
        state.forestDone = true;
        // the companion walks on toward the tower's stepping stones
        const S = world.spire;
        c.goal = S.doorPos.clone().addScaledVector(S.facing, 22).addScaledVector(new THREE.Vector3(S.facing.z, 0, -S.facing.x), -3);
        if (state.free) return;
        $('endTitle').textContent = 'THE ROOT TREE';
        $('endSmall').textContent = 'The body remembers';
        $('endPrompt').textContent = 'The tower and the lotus: coming soon';
        state.ended = true;
        document.exitPointerLock?.();
        $('end').classList.remove('hidden');
      }, 7000);
    }
    if (seedFlyAge >= 0) {
      // the tree's seed of green light flies into the lantern
      seedFlyAge += dt;
      const k = Math.min(1, seedFlyAge / 2.4);
      const target = new THREE.Vector3(0.2, -0.25, -0.7).applyMatrix4(camera.matrixWorld);
      seedFly.position.lerpVectors(seedFrom, target, k * k * (3 - 2 * k)).y += Math.sin(k * Math.PI) * 3;
      seedFly.scale.setScalar(1.6 * (1 - k) + 0.1);
      seedFly.material.opacity = k < 1 ? 1 : 0;
      if (k >= 1) {
        seedFlyAge = -1;
        lantern.addSeed((state.seedColor || new THREE.Color(0.4, 2.2, 1.3)).clone());
        state.seedColor = null;
        sound.bell(523, 0.08, 4);
      }
    }
  }

  /* heartbeat from the lotus, louder as you approach */
  const pulse = world.lotus.pulse;
  if (pulse > 0.95 && t - state.lastBeat > 0.5) {
    state.lastBeat = t;
    const d = Math.hypot(player.pos.x, player.pos.z + 175);
    sound.thump(Math.min(0.3, 9 / Math.max(15, d)));
  }

  /* update everything */
  world.update(t, dt, camera);
  world.followShadow(player.pos);
  sleepers.update(t, dt, player.pos);
  people?.update(t, dt, sleepers, player.pos);
  lantern.update(t, state.presence * (1 - state.sleep * 0.7), state.raise, player.stride, moving, camera.aspect);
  sound.update(state.breathing, state.sleep);
  post.finish.uniforms.time.value = t;
  post.finish.uniforms.sleep.value = state.sleep;

  /* what to do next: a short line at the top; it shows when it changes, while you hold Space, or with H */
  {
    const dC = Math.hypot(player.pos.x - c.pos.x, player.pos.z - c.pos.z);
    const { F, along, acr } = forestFrame();
    const onPath = Math.abs(acr) < 12 && along > 30 && along < 96;
    const next = state.passed.findIndex((p) => !p);
    const dDoor = Math.hypot(player.pos.x - F.doorPos.x, player.pos.z - F.doorPos.z);
    let goal;
    let target = c.pos; // where the gold column stands when you hold Space
    const S = world.spire;
    const dS = Math.hypot(player.pos.x - S.doorPos.x, player.pos.z - S.doorPos.z);
    const LT = world.lotusIn.trial;
    if (finale.phase && !inLotus) {
      goal = finale.goal() || '';
      target = finale.target();
    } else if (state.cut) {
      goal = '';
      target = null;
    } else if (inLotus) {
      const lampN = Math.min(LT.active, 6);
      if (state.lotusDone || LT.done) {
        goal = 'The octave is whole. The heart keeps time. The opening behind you leads back out.';
        target = null;
      } else if (LT.phase === 'drift') {
        // the drift is silent: only after a while does the screen ask, and later say plainly
        const since = t - LT.phaseAt;
        const lp = world.lotusIn.lampWorld(lampN);
        const near = Math.hypot(player.pos.x - lp.x, player.pos.z - lp.z) < 4.5;
        target = null;
        if (state.breathing > 0.5) goal = 'Remember yourself…';
        else if (since < 12) {
          goal = near
            ? `${NOTES[lampN][0]}: raise your lantern each time the heart's ring reaches the lamp. (${LT.hits} of 3)`
            : `Seven lamps, seven notes. Go to the glowing lamp, ${NOTES[lampN][0]}. (${LT.active} of 7 lit)`;
          target = lp;
        } else if (since < 28) goal = 'Something has changed. Is this still your direction?';
        else goal = 'The heart has drifted, at the interval between mi and fa. More of the same will not bring it back. Stop. Stand still and hold Space to remember yourself.';
      } else if (LT.phase === 'silence') {
        const since = t - LT.phaseAt;
        const lp = world.lotusIn.lampWorld(0);
        const near = Math.hypot(player.pos.x - lp.x, player.pos.z - lp.z) < 4.5;
        target = since > 6 && !near ? lp : null;
        if (since < 6) goal = '';
        else if (near && since > 6) goal = `Give the beat yourself: raise your lantern three times, as the heart did. (${LT.own.length} of 3)`;
        else if (since < 16) goal = 'The heart is silent. No one will keep time for you now.';
        else goal = 'Go back to where you began: the first lamp, do.';
      } else if (LT.helpLow && (!state.helpShownAt || t - state.helpShownAt < 8)) {
        state.helpShownAt = state.helpShownAt || t;
        goal = 'The heart carried you this far. Now you carry it. (Hold Space a moment to see clearly again.)';
        target = world.lotusIn.lampWorld(lampN);
      } else {
        const lp = world.lotusIn.lampWorld(lampN);
        const near = Math.hypot(player.pos.x - lp.x, player.pos.z - lp.z) < 4.5;
        goal = near
          ? `${NOTES[lampN][0]}: raise your lantern each time the heart's ring reaches the lamp. (${LT.hits} of 3)`
          : `Seven lamps, seven notes. Go to the glowing lamp, ${NOTES[lampN][0]}. (${LT.active} of 7 lit)`;
        target = lp;
      }
    } else if (state.doorsOpen && Math.hypot(player.pos.x, player.pos.z + 144) < 40 && !state.lotusDone) {
      goal = 'Walk into the lotus through the opening in its petals.';
      target = new THREE.Vector3(0, 0, -144);
    } else if (inside) {
      const T = world.interior.trial;
      if (state.towerDone) {
        goal = 'The masks are faced. The doorway behind you leads back out.';
        target = null;
      } else if (state.walk) {
        goal = '';
        target = null;
      } else if (T.count === world.interior.special.length) {
        goal = T.mirror < 0.98 ? 'The masks have fallen. One remains.' : 'Look at the last mask. Go to it.';
        target = world.interior.fire;
      } else if (state.aimed) {
        goal = `${state.aimed.label}: “${state.aimed.line}” Hold your light on it to face it.`;
        target = null;
      } else {
        goal = `Raise your light to find the masks that speak, and hold it on each to face it. (${T.count} of ${world.interior.special.length})`;
        // the guide marks the nearest one still unfaced
        let best = null, bd = 1e9;
        for (const S of world.interior.special) {
          if (S.faced) continue;
          const w = S.m.getWorldPosition(new THREE.Vector3());
          const d = w.distanceTo(player.pos);
          if (d < bd) {
            bd = d;
            best = w;
          }
        }
        target = best;
      }
    } else if (state.doorsOpen && dS < 30) {
      goal = 'Walk into the crack of light at the foot of the tower.';
      target = S.doorPos;
    } else if (state.towerDone && !state.lotusDone) {
      goal = 'Your companion walks on, toward the lotus. Follow.';
      target = c.pos;
    } else if (state.forestDone || F.solved) {
      goal = 'The body remembers. Follow your companion to the tower.';
      target = c.walking > 0.5 ? c.pos : S.doorPos;
    } else if (state.doorsOpen && next === -1) {
      goal = dDoor < 8 ? (state.raise > 0.6 ? 'Hold your light to the hollow…' : 'Raise your light to the hollow.') : 'Go on to the glowing hollow at the foot of the tree.';
      target = F.doorPos;
    } else if (state.doorsOpen && dDoor < 12) {
      goal = 'Walk the root path from its first root, with the breath.';
      target = F.entrance;
    } else if (state.doorsOpen && onPath) {
      goal = 'The roots breathe in and out. Cross each one while it sinks into the water.';
      target = F.pos.clone().addScaledVector(F.out, F.gates[next].along);
    } else if (state.doorsOpen) {
      goal = 'The three places have woken. Follow your companion to the forest.';
      target = c.walking > 0.5 ? c.pos : F.entrance;
    } else if (c.awake > 0) goal = 'They are awake.';
    else if (state.gems < gemsNeeded()) {
      const ns = nearestUnread();
      goal = state.waitingStone && !(ns && ns.d < 7)
        ? 'This stone waits. First read the one where you woke: "Here nothing is lost."'
        : ns && ns.d < 7
        ? (state.raise > 0.6 ? 'Hold your light on the stone…' : 'Raise your lantern (hold the mouse button) to read the stone.')
        : `Find the standing stones and read each one with your raised lantern. (${state.gems} of ${gemsNeeded()})`;
      target = ns ? ns.s.pos : null;
    } else if (dC < 3.5) goal = state.raise > 0.6 ? 'Hold your light up to them…' : 'Hold the mouse button to raise your light to them.';
    else if (dC < 14) goal = 'The one with the gold spark is near. Go to them.';
    else goal = 'You carry the knowledge of the stones. Now find the sleeper with the spark of gold. Hold Space to see where.';
    if (goal !== state.goalText) {
      state.goalText = goal;
      state.goalUntil = t + 7;
    }
    const showGoal = state.started && !state.ended && !state.cut && (t < state.goalUntil || state.breathing > 0.3 || state.presence < 0.15 || state.aimed);
    const line = state.presence < 0.15 && !controlled && !F.solved ? 'Your presence is fading. Stop and hold Space.' : goal;
    // on a phone the lines name the on-screen buttons instead of the keys
    $('goal').textContent = TOUCH ? line.replace(/hold the mouse button/g, 'hold Light').replace(/Hold the mouse button/g, 'Hold Light').replace(/hold Space/g, 'hold Remember').replace(/Hold Space/g, 'Hold Remember') : line;
    $('goal').style.opacity = showGoal ? '0.9' : '0';
    // remembering yourself shows the way: a gold light where the companion walks, seen through everything
    // a tall column of gold light over them, sized to stay visible from anywhere on the plain
    const dT = target ? Math.hypot(player.pos.x - target.x, player.pos.z - target.z) : 0;
    const k = Math.max(1, dT * 0.05);
    guide.scale.set(1.6 * k, 9 * k, 1);
    if (target) guide.position.set(target.x, Math.max(0, target.y || 0) + 1.4 + 3.2 * k, target.z);
    const guideOn = target && (c.awake <= 0 || state.doorsOpen);
    guide.material.opacity = guideOn ? state.breathing * (0.75 + 0.25 * Math.sin(t * 3)) : 0;
  }

  /* HUD */
  presenceArc.setAttribute('stroke-dashoffset', String(138.2 * (1 - state.presence)));
  core.setAttribute('r', String(2.5 + state.breathing * 2.5));
  $('hud').style.opacity = state.started && !state.ended && !state.cut ? '1' : '0';
  $('gems').style.opacity = state.started && !state.ended && !state.cut ? '0.95' : '0';

  /* the completion of the game */
  if (finale.phase) {
    _lp.setFromMatrixPosition(lantern.group.matrixWorld);
    for (const ev of finale.update(t, dt, { pos: player.pos, raise: state.raise, lanternPos: _lp, companion: sleepers.companion, camPos: camera.position })) {
      if (ev.type === 'arrived') state.goalUntil = t + 30;
      if (ev.type === 'light') {
        // the six diamonds, then the three seeds, leave the lantern; a bell for each, up the octave
        sound.bell(NOTES[Math.min(7, ev.i)][1] * (ev.i === 8 ? 2 : 1), 0.12, 6);
        if (ev.i < 6) {
          state.gems = Math.max(0, state.gems - 1);
          drawGems(false);
        } else lantern.removeSeed();
      }
      if (ev.type === 'fused') sound.bell(130.8, 0.14, 12);
      if (ev.type === 'rays') {
        // a held chord: do, sol, high do
        for (const [f, d] of [[261.63, 0], [392.0, 150], [523.25, 300]]) setTimeout(() => sound.bell(f, 0.09, 14), d);
        state.chordAt = t;
      }
      if (ev.type === 'cuts' && t - (state.lastCut || 0) > 0.125) {
        state.lastCut = t;
        sound.bell(1046.5 + Math.random() * 400, 0.025, 2.5);
      }
      if (ev.type === 'corner') sound.bell([392.0, 329.63, 261.63][ev.k], 0.14, 9);
      if (ev.type === 'env') world.refreshEnv();
      if (ev.type === 'free') state.goalUntil = t + 30;
      if (ev.type === 'through') {
        // through the gate: white-gold, then the end
        $('fade').style.background = '#fff4dc';
        $('fade').style.transition = 'opacity 3s';
        $('fade').style.opacity = '1';
        setTimeout(() => {
          $('endTitle').textContent = 'THE FOURTH WAY';
          $('endSmall').innerHTML = FINAL_LINE;
          $('endPrompt').innerHTML = CREDITS;
          $('again').textContent = 'Play again';
          $('again').onclick = () => location.reload();
          $('end').classList.add('light');
          state.ended = true;
          document.exitPointerLock?.();
          $('end').classList.remove('hidden');
        }, 3200);
      }
    }
    // the chord is struck again quietly while the diamond hangs there
    if (state.chordAt && finale.phase >= 3 && finale.phase <= 4 && t - state.chordAt > 2) {
      state.chordAt = t;
      for (const f of [261.63, 392.0, 523.25]) sound.bell(f, 0.035, 10);
    }
    // the slow heartbeat returns with the gate, and keeps going to the end
    if (finale.phase >= 4 && Math.floor(t / 1.15) !== state.finaleBeat) {
      state.finaleBeat = Math.floor(t / 1.15);
      sound.thump(0.16);
    }
    world.dawn = finale.dawn;
    post.finish.uniforms.dawn.value = finale.dawn;
    // light shafts from the diamond, faded as it leaves the frame
    const sh = finale.shafts;
    _sp.copy(finale.diamondPos).project(camera);
    const behind = _sp.z > 1;
    const u = _sp.x * 0.5 + 0.5, v = _sp.y * 0.5 + 0.5;
    const off = Math.max(0, Math.max(Math.abs(u - 0.5), Math.abs(v - 0.5)) - 0.5);
    const k = behind ? 0 : sh * Math.max(0, 1 - off * 2);
    post.shaft.enabled = k > 0.01;
    post.shaft.uniforms.shafts.value = k;
    post.shaft.uniforms.lightPos.value.set(Math.min(1.3, Math.max(-0.3, u)), Math.min(1.3, Math.max(-0.3, v)));
    post.shaft.uniforms.time.value = t;
  }

  autofocus(dt);
  // over the lotus's lake the light blooms wider (the pillar, the rings of fire)
  {
    const k = world.lotusInAmt;
    post.bloom.strength = 0.36 + (0.5 - 0.36) * k;
    post.bloom.threshold = 0.92 - (0.92 - 0.85) * k;
    post.finish.uniforms.lake.value = k;
    // a shallower depth of field over the lake, so the rings at your feet stay crisp
    post.dof.uniforms.aperture.value = (11 - 9.5 * k) * (innerHeight * renderer.getPixelRatio()) / 1080;
  }
  // the pillar's voice: a quiet held note on the last lamp lit; it drops out while the heart falters
  {
    const LT = world.lotusIn.trial;
    const n = world.lotusIn.lamps.reduce((a, L) => a + L.lit, 0);
    // in the drift it goes flat (up to a semitone); in the silence it stops
    const on = inLotus && n > 0 && LT.phase !== 'silence';
    sound.tone((NOTES[Math.max(0, Math.min(7, LT.done ? 7 : n - 1))][1] / 2) * (1 - 0.06 * LT.lean), on ? (LT.done ? 0.05 : 0.03) : 0);
  }
  if (world.cutscene.active) post.dof.uniforms.focus.value = camera.position.distanceTo(world.cutscene.centre) - 0.2;
  post.composer.render(dt);
  requestAnimationFrame(tick);
};

if (DEBUG) {
  begin();
  $('hints').style.opacity = '0';
  window.__g = {
    player,
    state,
    sleepers,
    people,
    hand,
    lantern,
    post,
    renderer,
    world,
    keys,
    finale,
    tp(x, z, yaw = player.yaw, pitch = player.pitch) {
      player.pos.set(x, 0, z);
      player.vel.set(0, 0, 0);
      player.yaw = yaw;
      player.pitch = pitch;
    },
  };
  // testing only: ?debug&at=lotus starts inside the lotus with the earlier levels done
  const at = new URLSearchParams(location.search).get('at');
  if (at === 'lotus' || at === 'finale') {
    for (const s of world.steles) if (s.required) s.read = true;
    state.gems = gemsNeeded();
    drawGems(false);
    world.openDoors();
    state.doorsOpen = state.forestDone = state.towerDone = true;
    lantern.addSeed(new THREE.Color(0.5, 2.2, 1.4));
    lantern.addSeed(new THREE.Color(0.6, 1.0, 2.4));
    if (at === 'lotus') {
      player.pos.copy(world.lotusIn.entry);
      player.yaw = 0;
      // &lit=3 starts at the drift, &lit=7 at the silence
      const lit = +new URLSearchParams(location.search).get('lit');
      if (lit) world.lotusIn.debugLight(lit, state.t);
    }
    if (at === 'finale') {
      // ?debug&at=finale[&phase=2..5]: the lotus done, the finale begun
      state.lotusDone = true;
      lantern.addSeed(new THREE.Color(2.4, 0.6, 0.45));
      sleepers.companion.awake = 1;
      player.pos.set(0, 0, -139);
      player.yaw = Math.PI;
      finale.start(state.t);
      const ph = +new URLSearchParams(location.search).get('phase');
      if (ph >= 2) {
        player.pos.set(0, 0, 4);
        player.yaw = 0;
        finale.skipTo(ph, state.t);
      }
    }
  }
}
requestAnimationFrame(tick);
