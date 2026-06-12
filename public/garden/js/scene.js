/* ════════════════════════════════════════════════════════
   THE GARDEN — spore field
   Instanced points drifting upward through a sway field,
   repelled by the cursor. Ink dots with a scatter of lime.
   ════════════════════════════════════════════════════════ */

import * as THREE from "three";

const canvas = document.getElementById("field-canvas");
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: false,
  powerPreference: "low-power",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
const CAM_Z = 14;
camera.position.set(0, 0, CAM_Z);

// guard against 0×0 first layout (hidden tab / iframe)
let dimsValid = window.innerWidth > 0 && window.innerHeight > 0;
let W = window.innerWidth || 1280;
let H = window.innerHeight || 720;

// world-units height/width of the frustum at z=0
function viewSize() {
  const h = 2 * Math.tan(THREE.MathUtils.degToRad(30)) * CAM_Z;
  return { h, w: h * (W / H) };
}

// ─── geometry ────────────────────────────────────────────
const COUNT = Math.min(1400, Math.max(450, Math.round((W * H) / 1300)));

const positions = new Float32Array(COUNT * 3);
const seeds = new Float32Array(COUNT);
const speeds = new Float32Array(COUNT);
const sizes = new Float32Array(COUNT);
const tints = new Float32Array(COUNT);

function seedPositions() {
  const { w: vw, h: vh } = viewSize();
  for (let i = 0; i < COUNT; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * vw * 1.25;
    positions[i * 3 + 1] = (Math.random() - 0.5) * vh * 1.6;
    positions[i * 3 + 2] = -5 + Math.random() * 8;
  }
}
seedPositions();

for (let i = 0; i < COUNT; i++) {
  seeds[i] = Math.random();
  speeds[i] = 0.35 + Math.random() * 0.9;
  // mostly fine grain, ~5% larger soft "pollen" for depth
  sizes[i] = Math.random() < 0.05 ? 4 + Math.random() * 3 : 1.2 + Math.random() * 2.2;
  tints[i] = Math.random() < 0.12 ? 1 : 0; // 12% lime
}

const geo = new THREE.BufferGeometry();
geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
geo.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));
geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
geo.setAttribute("aTint", new THREE.BufferAttribute(tints, 1));

const { w: VW0, h: VH0 } = viewSize();
const uniforms = {
  uTime: { value: 0 },
  uMouse: { value: new THREE.Vector2(999, 999) },
  uArea: { value: new THREE.Vector2(VW0 * 1.25, VH0 * 1.6) },
  uDpr: { value: Math.min(window.devicePixelRatio || 1, 2) },
  uInk: { value: new THREE.Color("#0a0a0a") },
  uLime: { value: new THREE.Color("#9ec700") },
};

const mat = new THREE.ShaderMaterial({
  uniforms,
  transparent: true,
  depthWrite: false,
  vertexShader: /* glsl */ `
    attribute float aSeed;
    attribute float aSpeed;
    attribute float aSize;
    attribute float aTint;
    uniform float uTime;
    uniform vec2 uMouse;
    uniform vec2 uArea;
    uniform float uDpr;
    varying float vTint;
    varying float vFade;

    void main() {
      vTint = aTint;
      vec3 p = position;

      // slow upward drift, wrapped vertically
      float travel = uTime * aSpeed * 0.45;
      p.y = mod(p.y + travel + uArea.y * 0.5, uArea.y) - uArea.y * 0.5;

      // lateral sway — layered sines stand in for wind
      p.x += sin(uTime * 0.22 + aSeed * 43.0 + p.y * 0.55) * 0.38;
      p.x += sin(uTime * 0.07 + aSeed * 17.0) * 0.22;

      // cursor repulsion
      vec2 d = p.xy - uMouse;
      float L = length(d);
      float push = smoothstep(2.4, 0.0, L);
      p.xy += (d / max(L, 0.001)) * push * 1.25;

      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = aSize * uDpr * (24.0 / -mv.z);

      // gentle twinkle
      vFade = 0.5 + 0.5 * sin(uTime * 0.55 + aSeed * 81.0);
    }
  `,
  fragmentShader: /* glsl */ `
    precision mediump float;
    uniform vec3 uInk;
    uniform vec3 uLime;
    varying float vTint;
    varying float vFade;

    void main() {
      float d = length(gl_PointCoord - 0.5);
      float disc = smoothstep(0.5, 0.16, d);
      vec3 col = mix(uInk, uLime, step(0.5, vTint));
      float op = vTint > 0.5
        ? mix(0.45, 0.9, vFade)
        : mix(0.12, 0.42, vFade);
      gl_FragColor = vec4(col, disc * op);
      if (gl_FragColor.a < 0.01) discard;
    }
  `,
});

const points = new THREE.Points(geo, mat);
points.frustumCulled = false; // shader moves points; skip bounding-sphere math
scene.add(points);

// ─── interaction state ───────────────────────────────────
let scrollTarget = 0;
let camY = 0;
const mouseTarget = new THREE.Vector2(999, 999);

window.addEventListener("pointermove", (e) => {
  const { w, h } = viewSize();
  const nx = (e.clientX / W) * 2 - 1;
  const ny = -((e.clientY / H) * 2 - 1);
  mouseTarget.set((nx * w) / 2, (ny * h) / 2 + camY);
}, { passive: true });

window.addEventListener("scroll", () => {
  scrollTarget = -window.scrollY * 0.0011;
}, { passive: true });

// ─── resize ──────────────────────────────────────────────
function resize() {
  if (window.innerWidth > 0 && window.innerHeight > 0) {
    W = window.innerWidth;
    H = window.innerHeight;
    if (!dimsValid) {
      dimsValid = true;
      seedPositions();
      geo.attributes.position.needsUpdate = true;
    }
  }
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
  renderer.setSize(W, H, false);
  const { w, h } = viewSize();
  uniforms.uArea.value.set(w * 1.25, h * 1.6);
}
window.addEventListener("resize", resize);
resize();

// ─── loop ────────────────────────────────────────────────
const clock = new THREE.Clock();
let running = !reduced;

function tick() {
  if (!running) return;
  uniforms.uTime.value = clock.getElapsedTime();

  camY += (scrollTarget - camY) * 0.06;
  camera.position.y = camY;

  uniforms.uMouse.value.lerp(mouseTarget, 0.08);

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

if (reduced) {
  // single static frame — presence without motion
  uniforms.uTime.value = 4;
  renderer.render(scene, camera);
} else {
  tick();
  document.addEventListener("visibilitychange", () => {
    const wasRunning = running;
    running = !document.hidden;
    if (running && !wasRunning) {
      clock.getDelta();
      tick();
    }
  });
}
