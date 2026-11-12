import * as THREE from 'three';
import { rng, textTexture } from './textures.js';

/*
 * Inside the tower (mind), after the owner's reference: a vast gothic hall. Clustered piers carry
 * pointed arches; above them a pointed, ribbed vault. At the far end an apse of tall lancet windows
 * lets shafts of cold light fall through dusty air. On a stepped dais in the middle of the floor a
 * fire burns, and pale masks (the many "I"s) drift around it. Wet cobbles, rows of candles.
 *
 * It stands far outside the plain (no terrain or water there) and is reached through the crack of
 * light at the tower's foot; the doorway at the near end leads back out.
 */

export const INTERIOR = new THREE.Vector3(1500, 0, 0);
const HALF = 8; // half-width of the nave
const SPRING = 16; // where the vault springs
const Z0 = 20; // entrance end (local z)
const Z1 = -36; // where the apse begins
const BAY = 6;
const hdr = (r, g, b, k) => new THREE.Color(r * k, g * k, b * k);
const smooth01 = (x) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

/* ───── textures ───── */

const canvas = (w, h, draw) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  return c;
};
const tex = (c, rx, ry, srgb) => {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

/** Ashlar: courses of squared blocks with dark mortar; light = raised. */
const ashlar = () =>
  canvas(512, 512, (g, W, H) => {
    const r = rng(31);
    g.fillStyle = '#2a2a2a';
    g.fillRect(0, 0, W, H);
    const rows = 8;
    const rh = H / rows;
    for (let j = 0; j < rows; j++) {
      let x = j % 2 ? -40 : 0;
      while (x < W) {
        const w = 70 + r() * 70;
        const v = 120 + r() * 70;
        g.fillStyle = `rgb(${v},${v * 0.96},${v * 0.9})`;
        g.fillRect(x + 3, j * rh + 3, w - 6, rh - 6);
        // worn faces
        for (let k = 0; k < 14; k++) {
          const d = r() > 0.5 ? 18 : -18;
          g.fillStyle = `rgba(${v + d},${v + d},${v + d},0.25)`;
          g.beginPath();
          g.arc(x + r() * w, j * rh + r() * rh, 2 + r() * 9, 0, Math.PI * 2);
          g.fill();
        }
        x += w;
      }
    }
  });

/** Cobbles: irregular worn stones of mixed sizes, set in uneven courses, dark gaps between. */
const cobbles = () =>
  canvas(1024, 1024, (g, W, H) => {
    const r = rng(77);
    g.fillStyle = '#161616';
    g.fillRect(0, 0, W, H);
    let y = 0;
    while (y < H) {
      const rh = 46 + r() * 34;
      let x = -r() * 60;
      while (x < W + 60) {
        const w = 50 + r() * 70;
        const v = 85 + r() * 85;
        const cx = x + w / 2, cy = y + rh / 2;
        // an irregular rounded polygon
        const n = 7 + Math.floor(r() * 4);
        const pts = [];
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2 + r() * 0.3;
          const rr = 0.82 + r() * 0.18;
          pts.push([cx + Math.cos(a) * (w / 2 - 4) * rr, cy + Math.sin(a) * (rh / 2 - 4) * rr]);
        }
        const grad = g.createRadialGradient(cx - w * 0.12, cy - rh * 0.15, 3, cx, cy, Math.max(w, rh) * 0.6);
        grad.addColorStop(0, `rgb(${v + 34},${v + 30},${v + 24})`);
        grad.addColorStop(1, `rgb(${v - 34},${v - 36},${v - 38})`);
        g.fillStyle = grad;
        g.beginPath();
        pts.forEach(([px, py], k) => {
          const [qx, qy] = pts[(k + 1) % n];
          if (k === 0) g.moveTo((px + qx) / 2, (py + qy) / 2);
          else g.quadraticCurveTo(px, py, (px + qx) / 2, (py + qy) / 2);
        });
        g.quadraticCurveTo(pts[0][0], pts[0][1], (pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2);
        g.fill();
        x += w + r() * 6;
      }
      y += rh + r() * 4;
    }
    // grime in the gaps and on the stones
    for (let k = 0; k < 2200; k++) {
      g.fillStyle = `rgba(0,0,0,${0.04 + r() * 0.08})`;
      g.beginPath();
      g.arc(r() * W, r() * H, 2 + r() * 14, 0, Math.PI * 2);
      g.fill();
    }
  });

/** A pale mask: an oval face with empty eyes, a nose ridge and closed lips (alpha cut-out). */
const maskCanvas = () =>
  canvas(256, 320, (g, W, H) => {
    const grad = g.createRadialGradient(W / 2, H * 0.42, 10, W / 2, H / 2, W * 0.62);
    grad.addColorStop(0, '#f2ece2');
    grad.addColorStop(1, '#a9a49b');
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(W / 2, H / 2, W * 0.46, H * 0.47, 0, 0, Math.PI * 2);
    g.fill();
    // a calm, closed face: brow ridges, almond eyes in shadow, a long nose, closed lips
    g.fillStyle = 'rgba(80,74,66,0.28)';
    g.beginPath();
    g.ellipse(W / 2, H * 0.56, W * 0.05, H * 0.12, 0, 0, Math.PI * 2);
    g.fill();
    for (const x of [0.33, 0.67]) {
      const sh = g.createRadialGradient(W * x, H * 0.43, 2, W * x, H * 0.43, W * 0.14);
      sh.addColorStop(0, 'rgba(40,36,32,0.95)');
      sh.addColorStop(0.45, 'rgba(60,55,50,0.6)');
      sh.addColorStop(1, 'rgba(60,55,50,0)');
      g.fillStyle = sh;
      g.beginPath();
      g.ellipse(W * x, H * 0.43, W * 0.13, H * 0.06, x < 0.5 ? 0.15 : -0.15, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(70,64,58,0.55)';
      g.lineWidth = 4;
      g.beginPath();
      g.arc(W * x, H * 0.45, W * 0.12, Math.PI * 1.15, Math.PI * 1.85);
      g.stroke();
    }
    g.strokeStyle = 'rgba(60,55,50,0.7)';
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(W * 0.4, H * 0.75);
    g.quadraticCurveTo(W / 2, H * 0.78, W * 0.6, H * 0.75);
    g.stroke();
  });

/* ───── geometry helpers ───── */

/** Height of an equilateral pointed arch of half-span a at offset x from its centre. */
const pointed = (x, a) => Math.sqrt(Math.max(0, 4 * a * a - (a + Math.abs(x)) ** 2));

const tube = (pts, r, mat, seg = 32) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, 6), mat);

export const buildInterior = ({ scene, glowTex }) => {
  const g = new THREE.Group();
  g.position.copy(INTERIOR);
  const wallTex = ashlar();
  const stone = new THREE.MeshStandardMaterial({ color: 0x9c8f7e, map: tex(wallTex, 3, 3, true), bumpMap: tex(wallTex, 3, 3, false), bumpScale: 3, roughness: 0.92, side: THREE.DoubleSide });
  const stoneFine = new THREE.MeshStandardMaterial({ color: 0x8d8070, map: tex(wallTex, 1, 6, true), bumpMap: tex(wallTex, 1, 6, false), bumpScale: 2, roughness: 0.9 });
  const cob = cobbles();
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x8a8174, map: tex(cob, 3.2, 8, true), bumpMap: tex(cob, 3.2, 8, false), bumpScale: 5, roughness: 0.38, metalness: 0.05 });
  const add = (m) => (g.add(m), m);

  /* floor and outer walls */
  const floor = add(new THREE.Mesh(new THREE.PlaneGeometry(26, Z0 - Z1 + 20), floorMat));
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = (Z0 + Z1 - 8) / 2;
  for (const s of [-1, 1]) {
    const w = add(new THREE.Mesh(new THREE.BoxGeometry(1, 11, Z0 - Z1 + 2), stone));
    w.position.set(s * 13, 5.5, (Z0 + Z1) / 2);
    // aisle ceiling
    const c = add(new THREE.Mesh(new THREE.BoxGeometry(5, 0.6, Z0 - Z1), stone));
    c.position.set(s * 10.5, 10.6, (Z0 + Z1) / 2);
  }

  /* clustered piers, the arcade and the walls above it */
  const piers = [];
  const pierGeo = (() => {
    const parts = [new THREE.CylinderGeometry(0.95, 1.05, SPRING, 8)];
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const sh = new THREE.CylinderGeometry(0.26, 0.28, SPRING, 8);
      sh.translate(Math.cos(a) * 1.0, 0, Math.sin(a) * 1.0);
      parts.push(sh);
    }
    return parts;
  })();
  for (let z = Z0 - 2; z >= Z1; z -= BAY) {
    for (const s of [-1, 1]) {
      const p = new THREE.Group();
      p.position.set(s * HALF, 0, z);
      for (const pg of pierGeo) {
        const m = new THREE.Mesh(pg, stoneFine);
        m.position.y = SPRING / 2;
        p.add(m);
      }
      // base and capital
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.7, 0.9, 8), stone);
      base.position.y = 0.45;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.25, 0.9, 8), stone);
      cap.position.y = 9.9;
      p.add(base, cap);
      add(p);
      piers.push({ x: s * HALF, z });
    }
  }
  // spandrel walls between the piers: solid above a pointed arch from 9.5 m to the vault
  {
    const a = 2.3;
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(BAY / 2 - a, 0);
    for (let k = 0; k <= 24; k++) {
      const x = -a + (k / 24) * 2 * a;
      shape.lineTo(BAY / 2 + x, pointed(x, a));
    }
    shape.lineTo(BAY, 0);
    shape.lineTo(BAY, SPRING - 9.5);
    shape.lineTo(0, SPRING - 9.5);
    shape.closePath();
    const sg = new THREE.ExtrudeGeometry(shape, { depth: 1.0, bevelEnabled: false, curveSegments: 1 });
    sg.translate(0, 0, -0.5);
    for (let z = Z0 - 2; z > Z1; z -= BAY)
      for (const s of [-1, 1]) {
        const m = add(new THREE.Mesh(sg, stone));
        m.rotation.y = Math.PI / 2;
        m.position.set(s * HALF, 9.5, z);
      }
  }

  /* the vault: a pointed barrel, ribs across each bay, diagonal ribs and a ridge rib */
  {
    const nx = 40, nz = 60;
    const vg = new THREE.PlaneGeometry(1, 1, nx, nz);
    const vp = vg.attributes.position;
    for (let i = 0; i < vp.count; i++) {
      const x = vp.getX(i) * 2 * HALF;
      const z = Z1 + (vp.getY(i) + 0.5) * (Z0 - Z1);
      vp.setXYZ(i, x, SPRING + pointed(x, HALF), z);
    }
    vg.computeVertexNormals();
    const uv = vg.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 4, uv.getY(i) * 12);
    add(new THREE.Mesh(vg, stone));
    const rib = new THREE.MeshStandardMaterial({ color: 0x7c7064, roughness: 0.85 });
    const arch = (z) => Array.from({ length: 17 }, (_, k) => {
      const x = -HALF + (k / 16) * 2 * HALF;
      return new THREE.Vector3(x, SPRING + pointed(x, HALF) - 0.15, z);
    });
    for (let z = Z0 - 2; z >= Z1; z -= BAY) add(tube(arch(z), 0.32, rib));
    for (let z = Z0 - 2; z - BAY >= Z1 - 0.01; z -= BAY)
      for (const d of [-1, 1]) {
        const pts = Array.from({ length: 17 }, (_, k) => {
          const s = k / 16;
          const x = d * (-HALF + s * 2 * HALF);
          return new THREE.Vector3(x, SPRING + pointed(x, HALF) - 0.12, z - s * BAY);
        });
        add(tube(pts, 0.2, rib));
      }
    add(tube([new THREE.Vector3(0, SPRING + pointed(0, HALF) - 0.1, Z0), new THREE.Vector3(0, SPRING + pointed(0, HALF) - 0.1, Z1)], 0.22, rib, 4));
  }

  /* the apse: five tall lancet windows of cold light around the far end */
  const winMat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { time: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `varying vec2 vUv;
      void main() {
        // tracery: two lancets and a small rose above, dark leading between the panes
        vec2 p = vUv;
        float lead = step(0.47, p.x) * step(p.x, 0.53) * step(p.y, 0.72);
        float bars = step(0.97, fract(p.y * 9.0)) * step(p.y, 0.72);
        float rose = smoothstep(0.1, 0.09, length((p - vec2(0.5, 0.83)) * vec2(1.0, 2.2)));
        float glass = 1.0 - max(lead, bars);
        vec3 col = vec3(0.85, 0.92, 1.0) * (2.4 + 1.2 * p.y) * glass;
        col = mix(col, vec3(0.06), rose * 0.6);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const lancet = (() => {
    const s = new THREE.Shape();
    const a = 1.0;
    s.moveTo(-a, 0);
    s.lineTo(-a, 9);
    for (let k = 0; k <= 20; k++) {
      const x = -a + (k / 20) * 2 * a;
      s.lineTo(x, 9 + pointed(x, a) * 1.4);
    }
    s.lineTo(a, 0);
    s.closePath();
    const geo = new THREE.ShapeGeometry(s, 8);
    // uv: 0..1 over the window's own box
    const uv = geo.attributes.uv;
    const pos = geo.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + a) / (2 * a), pos.getY(i) / (9 + a * Math.sqrt(3) * 1.4));
    return geo;
  })();
  const APSE_R = 8;
  const apseC = new THREE.Vector3(0, 0, Z1);
  const windows = [];
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k / 4) * Math.PI; // from one side to the other, round the far end
    const px = Math.sin(a) * APSE_R, pz = Z1 - Math.cos(a) * APSE_R;
    // a wall panel
    const w = add(new THREE.Mesh(new THREE.BoxGeometry(6.4, SPRING + 14, 1), stone));
    w.position.set(px * 1.06, (SPRING + 14) / 2, Z1 - Math.cos(a) * APSE_R * 1.06);
    w.rotation.y = -a;
    // the window, a little inside the wall
    const win = add(new THREE.Mesh(lancet, winMat));
    win.position.set(px * 0.99, 14, Z1 - Math.cos(a) * APSE_R * 0.99);
    win.rotation.y = -a; // facing into the hall
    win.scale.setScalar(k === 2 ? 1.25 : 1);
    windows.push(win);
  }
  // the aisles end where the apse begins
  for (const s of [-1, 1]) {
    const e = add(new THREE.Mesh(new THREE.BoxGeometry(5.6, 11, 1), stone));
    e.position.set(s * 10.7, 5.5, Z1 - 0.6);
  }
  // the half-dome over the apse
  const dome = add(new THREE.Mesh(new THREE.SphereGeometry(APSE_R, 24, 12, Math.PI, Math.PI, 0, Math.PI / 2), stone));
  dome.position.set(0, SPRING + 9, Z1);
  dome.scale.set(1, 1.6, 1);
  // the entrance wall, with a doorway of pale night light back to the plain
  {
    const s = new THREE.Shape();
    s.moveTo(-13, 0);
    s.lineTo(-2.2, 0);
    s.lineTo(-2.2, 4.5);
    for (let k = 0; k <= 16; k++) {
      const x = -2.2 + (k / 16) * 4.4;
      s.lineTo(x, 4.5 + pointed(x, 2.2));
    }
    s.lineTo(2.2, 0);
    s.lineTo(13, 0);
    s.lineTo(13, 34);
    s.lineTo(-13, 34);
    s.closePath();
    const eg = new THREE.ExtrudeGeometry(s, { depth: 1.2, bevelEnabled: false, curveSegments: 1 });
    const ew = add(new THREE.Mesh(eg, stone));
    ew.position.z = Z0 + 0.4;
    const out = add(
      new THREE.Mesh(new THREE.PlaneGeometry(4.4, 8.4), new THREE.MeshBasicMaterial({ color: hdr(0.5, 0.62, 0.75, 1.1), fog: false })),
    );
    out.position.set(0, 4.2, Z0 + 1.4);
    out.rotation.y = Math.PI;
  }

  /* shafts of light from the windows, falling through dust onto the floor */
  const shaftMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { time: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vUv; varying vec3 vP; void main() { vUv = uv; vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `varying vec2 vUv; varying vec3 vP; uniform float time;
      float h(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 15731.743); }
      void main() {
        float across = 1.0 - abs(vUv.x - 0.5) * 2.0;
        float along = smoothstep(0.0, 0.15, vUv.y) * (1.0 - smoothstep(0.55, 1.0, vUv.y));
        // dust drifting in the beam
        vec2 q = vec2(vUv.x * 40.0, vUv.y * 120.0 - time * 1.5);
        float dust = step(0.995, h(floor(q))) * 3.0;
        float a = pow(across, 1.6) * along * (0.06 + dust * 0.4);
        gl_FragColor = vec4(vec3(0.8, 0.88, 1.0) * a, 1.0);
      }`,
  });
  const shafts = [];
  for (const [wx, wz, fx, fz, wdt] of [[-4, Z1 - 6, -2, -18, 2.6], [0, Z1 - 8, 1.5, -22, 3.2], [4, Z1 - 6, 4, -14, 2.6], [-6.5, Z1 - 2, -5, -8, 2]]) {
    const top = new THREE.Vector3(wx, 18, wz);
    const bottom = new THREE.Vector3(fx, 0, fz);
    const len = top.distanceTo(bottom);
    for (const rot of [0, Math.PI / 2]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(wdt, len), shaftMat);
      m.position.copy(top).lerp(bottom, 0.5);
      m.lookAt(bottom.clone().add(g.position));
      m.rotateX(Math.PI / 2);
      m.rotateY(rot);
      add(m);
      shafts.push(m);
    }
  }

  /* the fire on its dais */
  const FIRE = new THREE.Vector3(0, 0, -16);
  [[4.6, 0.32, 0.16], [3.7, 0.32, 0.48], [2.8, 0.32, 0.8]].forEach(([r, h, y]) => {
    const m = add(new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.1, h, 32), stone));
    m.position.set(FIRE.x, y, FIRE.z);
  });
  const fireMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { time: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `varying vec2 vUv; uniform float time;
      float n(float x) { return sin(x) * 0.5 + sin(x * 2.3 + 1.7) * 0.3 + sin(x * 5.1 + 0.4) * 0.2; }
      void main() {
        vec2 p = vUv - vec2(0.5, 0.08);
        float hgt = clamp(p.y / 0.85, 0.0, 1.0);
        p.x += n(time * 5.0 + p.y * 8.0) * 0.06 * hgt;
        float width = mix(0.32, 0.0, pow(hgt, 0.9));
        float d = abs(p.x) / max(width, 1e-3);
        float body = smoothstep(1.0, 0.2, d) * smoothstep(-0.05, 0.05, p.y) * (1.0 - hgt);
        float core = smoothstep(0.5, 0.0, d) * smoothstep(0.5, 0.05, p.y) * smoothstep(-0.03, 0.04, p.y);
        vec3 col = vec3(1.0, 0.45, 0.12) * body * 2.4 + vec3(1.0, 0.86, 0.6) * core * 3.2;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const flames = [];
  for (let k = 0; k < 3; k++) {
    const f = add(new THREE.Mesh(new THREE.PlaneGeometry(1.8, 3.2), fireMat));
    f.position.set(FIRE.x, 0.96 + 1.6, FIRE.z);
    f.rotation.y = (k / 3) * Math.PI;
    flames.push(f);
  }
  const fireGlow = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(1.3, 0.7, 0.3), transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false })));
  fireGlow.position.set(FIRE.x, 2.2, FIRE.z);
  fireGlow.scale.set(9, 9, 1);
  const fireLight = add(new THREE.PointLight(0xffa050, 150, 50, 1.9));
  fireLight.position.set(FIRE.x, 2.5, FIRE.z);
  // embers rising
  const NE = 120;
  const ep = new Float32Array(NE * 3);
  const es = Array.from({ length: NE }, () => [Math.random() * 6.28, Math.random() * 0.9, Math.random() * 8, 0.6 + Math.random()]);
  const embers = add(new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(ep, 3)), new THREE.PointsMaterial({ map: glowTex, color: new THREE.Color(2.2, 1.0, 0.3), size: 0.12, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
  embers.frustumCulled = false;

  /* cool light from the windows, and candles along the aisles */
  const winLight = add(new THREE.PointLight(0xb8c8ff, 260, 70, 1.4));
  winLight.position.set(0, 14, Z1 - 2);
  const candleMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.6, emissive: 0x3a2410 });
  const flameDot = new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(2.4, 1.3, 0.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  for (let z = Z0 - 4; z > Z1 + 1; z -= 3)
    for (const s of [-1, 1]) {
      const c = add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.4 + Math.random() * 0.3, 8), candleMat));
      c.position.set(s * 12.2, 0.25, z + Math.random());
      const f = add(new THREE.Sprite(flameDot));
      f.position.set(c.position.x, 0.62, c.position.z);
      f.scale.setScalar(0.35);
    }
  for (const s of [-1, 1]) {
    const l = add(new THREE.PointLight(0xffa860, 40, 22, 1.6));
    l.position.set(s * 11.5, 1.2, -4);
  }

  /* masks: the many "I"s, drifting round the fire */
  const NM = 72;
  const maskTex = new THREE.CanvasTexture(maskCanvas());
  maskTex.colorSpace = THREE.SRGBColorSpace;
  const maskGeo = new THREE.SphereGeometry(1, 24, 16, 0, Math.PI); // the front half (facing +z)
  maskGeo.scale(0.24, 0.32, 0.13);
  const masks = new THREE.InstancedMesh(maskGeo, new THREE.MeshStandardMaterial({ map: maskTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.55, color: 0xf0e8dc, emissive: 0x8a8378, emissiveMap: maskTex }), NM);
  masks.castShadow = true;
  masks.frustumCulled = false; // they move far from where they started
  add(masks);
  const mr = rng(12);
  const maskData = Array.from({ length: NM }, () => ({ rad: 2.4 + mr() * 6.5, y: 1.6 + mr() * 6, a: mr() * Math.PI * 2, speed: (0.04 + mr() * 0.08) * (mr() > 0.3 ? 1 : -1), bob: mr() * 6, turn: mr() }));
  const dmy = new THREE.Object3D();

  /*
   * The trial (mind): among the masks drift seven that speak. They are the faces we learn to put on
   * over our essence: what Gurdjieff calls personality, acquired from outside (family, school,
   * culture, beliefs, the role we play, imitation, and the constant weighing of what others think).
   * Raise the light to find one; hold it there to face it, and it falls away.
   */
  const SPEAKING = [
    ['FAMILY', 'Be who they needed you to be.'],
    ['SCHOOL', 'The right answer is the one they expect.'],
    ['CULTURE', 'Want what everyone wants.'],
    ['BELIEFS', 'Believe what you were told.'],
    ['ROLE', 'You are what you do.'],
    ['IMITATION', 'Do as they do.'],
    ['OTHERS', 'What will they think of you?'],
  ];
  const special = SPEAKING.map(([label, line], i) => {
    const m = new THREE.Group();
    const face = new THREE.Mesh(maskGeo, new THREE.MeshStandardMaterial({ map: maskTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.5, color: 0xf6efe4, emissive: 0x9a9286, emissiveMap: maskTex, transparent: true }));
    face.scale.setScalar(1.25);
    m.add(face);
    // a faint gold seam marks the masks that speak, once you know to look
    const seam = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.012, 6, 40), new THREE.MeshBasicMaterial({ color: hdr(1, 0.75, 0.4, 1.6), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
    seam.scale.set(0.9, 1.25, 1);
    m.add(seam);
    const textMat = new THREE.MeshBasicMaterial({ map: textTexture([label, line], { width: 1024, height: 256, size: 64 }), color: hdr(1, 0.8, 0.5, 2), transparent: true, opacity: 0, depthWrite: false, depthTest: false });
    const text = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.65), textMat);
    text.position.y = -0.75;
    text.renderOrder = 12;
    m.add(text);
    add(m);
    return { m, face, seam, textMat, label, line, rad: 3.2 + (i % 3) * 2.1, y: 2.2 + ((i * 3) % 5) * 0.9, a: (i / 7) * Math.PI * 2, speed: 0.06 * (i % 2 ? 1 : -1), hold: 0, found: 0, faced: false, gone: 0 };
  });
  const trial = { count: 0, settle: 0, fall: 0, mirror: 0, mirrorHold: 0, done: false, aimed: null };
  // the last mask: when the social masks have fallen, one more rises on the dais, grows, and turns to light.
  // The player walks through it (main.js drives that walk).
  const lastMat = new THREE.MeshStandardMaterial({ map: maskTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.5, color: 0xf6efe4, emissive: 0xffffff, emissiveMap: maskTex, emissiveIntensity: 0 });
  const lastMask = new THREE.Mesh(maskGeo, lastMat);
  lastMask.visible = false;
  add(lastMask);
  const lastGlow = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(1.2, 1.2, 1.3), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })));
  const mirrorLight = add(new THREE.PointLight(0xe8eeff, 0, 40, 1.6));
  mirrorLight.position.set(FIRE.x, 3, FIRE.z + 1);
  const LAST_SCALE = 8; // about 5 m tall when grown
  const lastCentre = new THREE.Vector3();
  const _wp = new THREE.Vector3();
  const _fwd = new THREE.Vector3();
  const _to = new THREE.Vector3();

  scene.add(g);

  /* the space, for the player */
  const local = new THREE.Vector3();
  const api = {
    origin: INTERIOR,
    entry: INTERIOR.clone().add(new THREE.Vector3(0, 0, Z0 - 3)),
    fire: INTERIOR.clone().add(FIRE),
    contains: (p) => Math.abs(p.x - INTERIOR.x) < 14 && p.z - INTERIOR.z < Z0 + 3 && p.z - INTERIOR.z > Z1 - APSE_R - 3,
    /** Back toward the doorway: past this you leave. */
    atExit: (p) => p.z - INTERIOR.z > Z0 - 0.9 && Math.abs(p.x - INTERIOR.x) < 2.4,
    collide(p) {
      local.subVectors(p, INTERIOR);
      local.x = Math.max(-12.2, Math.min(12.2, local.x));
      local.z = Math.min(Z0 - 0.5, local.z);
      // the apse's round end
      const dz = local.z - Z1;
      if (dz < 0) {
        const d = Math.hypot(local.x, dz);
        if (d > APSE_R - 0.8) {
          local.x *= (APSE_R - 0.8) / d;
          local.z = Z1 + dz * ((APSE_R - 0.8) / d);
        }
      }
      for (const c of piers) {
        const dx = local.x - c.x, dzz = local.z - c.z;
        const d = Math.hypot(dx, dzz);
        if (d < 1.9 && d > 1e-4) {
          local.x = c.x + (dx / d) * 1.9;
          local.z = c.z + (dzz / d) * 1.9;
        }
      }
      // the dais: you can walk up to the fire, not into it (except through the last mask)
      if (!api.passing) {
        const dx = local.x - FIRE.x, dzz = local.z - FIRE.z;
        const d = Math.hypot(dx, dzz);
        if (d < 2.2 && d > 1e-4) {
          local.x = FIRE.x + (dx / d) * 2.2;
          local.z = FIRE.z + (dzz / d) * 2.2;
        }
      }
      p.x = local.x + INTERIOR.x;
      p.z = local.z + INTERIOR.z;
    },
    /** Floor height (the dais's steps lift you a little). */
    groundAt(p) {
      const d = Math.hypot(p.x - INTERIOR.x - FIRE.x, p.z - INTERIOR.z - FIRE.z);
      return d < 2.8 ? 0.96 : d < 3.7 ? 0.64 : d < 4.6 ? 0.32 : 0;
    },
    trial,
    special,
    /**
     * The trial, each frame while inside. ctx: { camera, raise }. Returns events:
     * { type: 'aim', mask } while a speaking mask is in the light; { type: 'faced', mask }; 'allFaced'; 'mirror'.
     */
    updateTrial(t, dt, ctx) {
      const events = [];
      ctx.camera.getWorldDirection(_fwd);
      const raised = ctx.raise > 0.6;
      // which speaking mask is in the light, if any
      let best = null, bestAng = 0.2;
      for (const S of special) {
        if (S.faced) continue;
        S.m.getWorldPosition(_wp);
        _to.subVectors(_wp, ctx.camera.position);
        const d = _to.length();
        if (d > 9) continue;
        const ang = Math.acos(Math.min(1, _to.dot(_fwd) / d));
        if (ang < bestAng) {
          bestAng = ang;
          best = S;
        }
      }
      trial.aimed = raised ? best : null;
      for (const S of special) {
        const lit = S === trial.aimed;
        S.found = Math.max(0, Math.min(1, S.found + (lit ? 1.5 : -0.5) * dt));
        S.hold = lit ? S.hold + dt : Math.max(0, S.hold - dt * 0.8);
        if (lit) events.push({ type: 'aim', mask: S });
        if (!S.faced && S.hold >= 2.6) {
          S.faced = true;
          trial.count++;
          events.push({ type: 'faced', mask: S });
          if (trial.count === special.length) events.push({ type: 'allFaced' });
        }
      }
      // all faced: the fire sinks, the masks settle, the mirror rises
      if (trial.count === special.length) {
        trial.settle = Math.min(1, trial.settle + dt * 0.25);
        trial.fall += dt;
        // the last mask rises once the others have fallen, then grows and turns to light
        if (trial.fall > 3) trial.mirror = Math.min(1, trial.mirror + dt * 0.16);
        const dM = Math.hypot(ctx.camera.position.x - (INTERIOR.x + FIRE.x), ctx.camera.position.z - (INTERIOR.z + FIRE.z));
        _to.set(INTERIOR.x + FIRE.x, 3, INTERIOR.z + FIRE.z).sub(ctx.camera.position).normalize();
        const facing = _to.dot(_fwd) > 0.8;
        // look at it from close by (raising your light hurries it) and you walk into it
        const ok = trial.mirror > 0.98 && dM < 14 && facing && !trial.done;
        trial.mirrorHold = ok ? trial.mirrorHold + dt * (raised ? 2 : 1) : Math.max(0, trial.mirrorHold - dt);
        if (trial.mirrorHold > 2.5 && !trial.done) {
          trial.done = true;
          events.push({ type: 'walkThrough', at: lastCentre.clone().add(INTERIOR) });
        }
      }
      return events;
    },
    update(t, dt, playerPos) {
      fireMat.uniforms.time.value = t;
      // the speaking masks: drifting like the rest; found, they stop and turn to you; faced, they fall away in light
      special.forEach((S, i) => {
        const a = S.a + t * S.speed * (1 - S.found);
        const x = FIRE.x + Math.cos(a) * S.rad, z = FIRE.z + Math.sin(a) * S.rad;
        if (!S.faced) S.m.position.set(x, S.y + Math.sin(t * 0.4 + i) * 0.3, z);
        else {
          S.gone = Math.min(1, S.gone + dt * 0.5);
          S.m.position.y -= dt * (0.2 + S.gone * 2);
          S.m.rotation.x += dt * 1.5;
        }
        if (!S.faced) S.m.lookAt(playerPos.x, S.m.position.y + INTERIOR.y, playerPos.z);
        if (!S.faced && S.found < 0.05) S.m.rotation.y += Math.sin(t * 0.3 + i) * 0.6;
        S.textMat.opacity = S.faced ? Math.max(0, 1 - S.gone * 3) : S.found;
        S.seam.material.opacity = S.faced ? Math.max(0, 0.9 - S.gone) : 0.25 + S.found * 0.6 + S.hold * 0.25;
        S.face.material.opacity = 1 - S.gone;
        S.face.material.emissive.setRGB(0.6 + S.hold * 0.25, 0.57 + S.hold * 0.2, 0.52 + S.hold * 0.1);
      });
      const st = trial.settle;
      flames.forEach((f) => (f.visible = st < 0.95));
      {
        // the last mask: rises from the dais, grows, and becomes light
        const k = trial.mirror;
        lastMask.visible = k > 0;
        const grow = 1 + (LAST_SCALE - 1) * smooth01((k - 0.15) / 0.7);
        const rise = smooth01(k / 0.25);
        lastMask.scale.setScalar(grow);
        lastCentre.set(FIRE.x, 0.96 + rise * (0.6 + 0.33 * grow), FIRE.z);
        lastMask.position.copy(lastCentre);
        lastMask.rotation.set(0, Math.sin(t * 0.2) * 0.05, 0); // facing down the hall
        const light = smooth01((k - 0.4) / 0.5);
        lastMat.emissiveIntensity = 0.6 + light * 3.5;
        lastMat.color.setScalar(1 - light * 0.5);
        lastGlow.position.copy(lastCentre).add(new THREE.Vector3(0, 0, -0.4));
        lastGlow.scale.setScalar(2 + grow * 1.2);
        lastGlow.material.opacity = light * 0.7;
        mirrorLight.intensity = light * 200;
      }
      shaftMat.uniforms.time.value = t;
      const fl = 0.85 + 0.1 * Math.sin(t * 11) + 0.05 * Math.sin(t * 23.7);
      fireLight.intensity = 150 * fl * (1 - trial.settle);
      fireGlow.material.opacity = (0.3 + 0.1 * fl) * (1 - trial.settle);
      embers.visible = trial.settle < 0.9;
      for (const f of flames) f.scale.y = 0.9 + 0.15 * Math.sin(t * 7 + f.rotation.y * 3);
      for (let i = 0; i < NE; i++) {
        const [a, r0, y0, s] = es[i];
        const y = (y0 + t * s) % 8;
        const rr = r0 + y * 0.12;
        ep[i * 3] = FIRE.x + Math.cos(a + y * 0.6) * rr;
        ep[i * 3 + 1] = 1 + y;
        ep[i * 3 + 2] = FIRE.z + Math.sin(a + y * 0.6) * rr;
      }
      embers.geometry.attributes.position.needsUpdate = true;
      // masks orbit and bob; some slowly turn to look at you
      const px = playerPos.x - INTERIOR.x, pz = playerPos.z - INTERIOR.z;
      maskData.forEach((m, i) => {
        // once the seven are faced, every mask drops where it is and lies on the floor
        if (trial.count === special.length && m.fx === undefined) {
          const a0 = m.a + t * m.speed;
          m.fx = FIRE.x + Math.cos(a0) * m.rad;
          m.fz = FIRE.z + Math.sin(a0) * m.rad;
          m.fy = m.y + Math.sin(t * 0.4 + m.bob) * 0.35;
          m.delay = (i % 12) * 0.07 + m.bob * 0.05;
        }
        const falling = m.fx !== undefined;
        const a = m.a + t * m.speed;
        let x = FIRE.x + Math.cos(a) * m.rad, z = FIRE.z + Math.sin(a) * m.rad;
        let y = m.y + Math.sin(t * 0.4 + m.bob) * 0.35;
        let landed = 0;
        if (falling) {
          const ft = Math.max(0, trial.fall - m.delay);
          x = m.fx;
          z = m.fz;
          // the floor here: the dais's steps near the centre
          const r = Math.hypot(x - FIRE.x, z - FIRE.z);
          const floor = (r < 2.8 ? 0.96 : r < 3.7 ? 0.64 : r < 4.6 ? 0.32 : 0) + 0.2;
          y = Math.max(floor, m.fy - 4.9 * ft * ft);
          landed = y <= floor + 1e-3 ? 1 : 0;
          m.land = Math.min(1, (m.land || 0) + landed * dt * 6);
        }
        dmy.position.set(x, y, z);
        // they mostly look down the hall, toward whoever comes in
        const outward = (m.turn - 0.5) * 1.4;
        const toYou = Math.atan2(px - x, pz - z);
        let d = toYou - outward;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        dmy.rotation.set(Math.sin(t * 0.3 + m.bob) * 0.15, outward + d * (0.35 + 0.65 * m.turn) * (0.5 + 0.5 * Math.sin(t * 0.2 + m.bob)), Math.sin(t * 0.25 + m.bob) * 0.1);
        if (falling) {
          // tumbling down, then lying face up (or down) on the stone
          const l = m.land || 0;
          // resting tilted on their rims, so the floor is seen to be strewn with faces
          dmy.rotation.x = (1 - l) * (dmy.rotation.x + (trial.fall - m.delay) * 3) + l * (m.turn > 0.5 ? -1.0 : 1.15);
          dmy.rotation.z = (1 - l) * dmy.rotation.z + l * (m.bob - 3) * 0.25;
        }
        dmy.scale.setScalar(1);
        dmy.updateMatrix();
        masks.setMatrixAt(i, dmy.matrix);
      });
      masks.instanceMatrix.needsUpdate = true;
    },
  };
  return api;
};


/* ───── the thread is cut ───── */

/**
 * After the mirror: in a dark, still water, the Lantern-Bearer stands chest-deep, eyes closed, a beam
 * of light rising from the crown of her head (the thread). The camera draws close; the thread is cut
 * at the crown and rises away; she lifts her face.
 */
export const buildCutscene = ({ scene, glowTex, normalMap }) => {
  const C = new THREE.Vector3(1500, 0, 420);
  const g = new THREE.Group();
  g.position.copy(C);
  g.visible = false;
  // the dark: a black shell so nothing of the world shows
  g.add(new THREE.Mesh(new THREE.SphereGeometry(45, 24, 16), new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide, fog: false })));
  // still dark water, lit only where the light falls
  const wn = normalMap.clone();
  wn.repeat.set(10, 10);
  wn.needsUpdate = true;
  const water = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshStandardMaterial({ color: 0x050607, roughness: 0.16, metalness: 0.0, envMapIntensity: 0, normalMap: wn, normalScale: new THREE.Vector2(0.3, 0.3) }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = 1.18;
  g.add(water);
  // the thread: a beam of white light from her crown upward
  const beamMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { cut: { value: 0 }, fade: { value: 1 } },
    vertexShader: /* glsl */ `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main() { vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `varying vec2 vUv; varying vec3 vN; varying vec3 vV; uniform float cut; uniform float fade;
      void main() {
        float edge = pow(clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0), 1.5);
        // once cut, the gap opens upward from the crown
        float y = vUv.y;
        float keep = smoothstep(cut - 0.02, cut + 0.02, y);
        float top = 1.0 - smoothstep(0.6, 1.0, y);
        gl_FragColor = vec4(vec3(0.95, 0.97, 1.0) * edge * 1.8 * keep * top * fade, 1.0);
      }`,
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 40, 24, 1, true), beamMat);
  beam.position.y = 1.78 + 20;
  g.add(beam);
  const crown = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(2, 2, 2.2), transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
  crown.position.set(0, 1.8, 0);
  crown.scale.setScalar(0.5);
  g.add(crown);
  const top = new THREE.SpotLight(0xdfe6ff, 140, 30, 0.22, 0.7, 1.4);
  top.position.set(0, 14, 0.4);
  top.target.position.set(0, 1.4, 0);
  g.add(top, top.target);
  // a warm light far off to one side, as in the owner's image
  const warm = new THREE.PointLight(0xffa850, 25, 20, 1.6);
  warm.position.set(4.5, 1.6, -2.5);
  g.add(warm);
  const warmDot = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(2.2, 1.2, 0.5), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
  warmDot.position.set(5.5, 1.5, -4);
  warmDot.scale.setScalar(1.6);
  g.add(warmDot);
  // motes released when the thread is cut
  const NM = 90;
  const mp = new Float32Array(NM * 3);
  const mv = Array.from({ length: NM }, () => [(Math.random() - 0.5) * 0.3, 0.6 + Math.random() * 2.2, (Math.random() - 0.5) * 0.3]);
  const motes = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(mp, 3)), new THREE.PointsMaterial({ map: glowTex, color: new THREE.Color(1.8, 1.9, 2.2), size: 0.05, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  motes.frustumCulled = false;
  g.add(motes);
  scene.add(g);

  let actor = null;
  let t0 = -1;
  const look = new THREE.Vector3();
  const headW = new THREE.Vector3();
  return {
    centre: C,
    setActor(a) {
      actor = a;
      actor.obj.position.set(C.x, 0.0, C.z);
      actor.obj.rotation.set(0, 0, 0); // upright (the file carries a Z-up turn), facing +z toward the camera
      actor.show(false);
    },
    get active() {
      return t0 >= 0;
    },
    start() {
      t0 = 0;
      g.visible = true;
      actor?.show(true);
      beamMat.uniforms.cut.value = 0;
      beamMat.uniforms.fade.value = 1;
      for (let i = 0; i < NM; i++) mp.set([0, 1.8, 0], i * 3);
    },
    stop() {
      t0 = -1;
      g.visible = false;
      actor?.show(false);
    },
    /** Moves the camera; returns the elapsed time. */
    update(t, dt, camera) {
      if (t0 < 0) return -1;
      t0 += dt;
      const k = Math.min(1, t0 / 9);
      // draw close, slowly, a little below her eyes
      const dist = 3.0 - 1.3 * (1 - Math.pow(1 - k, 2));
      camera.position.set(C.x + Math.sin(t0 * 0.05) * 0.15, 1.42 + k * 0.08, C.z + dist);
      // the beam, its glow and the camera all follow her head (her idle sways)
      if (actor) {
        actor.bones.head.getWorldPosition(headW);
        beam.position.set(headW.x - C.x, headW.y + 0.14 + 20, headW.z - C.z);
        crown.position.set(headW.x - C.x, headW.y + 0.14, headW.z - C.z);
        look.set(headW.x, headW.y - 0.05 + Math.max(0, t0 - 6.5) * 0.06, headW.z);
        camera.position.x = headW.x + Math.sin(t0 * 0.05) * 0.15;
      } else look.set(C.x, 1.62, C.z);
      camera.lookAt(look);
      // the cut, at 6 s: a flash at the crown, the beam lets go upward, motes rise
      const c = Math.max(0, t0 - 6);
      beamMat.uniforms.cut.value = Math.min(1.1, c * c * 0.12);
      beamMat.uniforms.fade.value = Math.max(0, 1 - c * 0.25);
      crown.material.opacity = 0.6 + (c > 0 ? Math.exp(-c * 2) * 3 : 0);
      crown.scale.setScalar(0.5 + (c > 0 ? Math.exp(-c * 2.5) * 0.8 : 0));
      motes.material.opacity = c > 0 ? Math.max(0, 1 - c * 0.2) : 0;
      if (c > 0) {
        for (let i = 0; i < NM; i++) {
          mp[i * 3] += mv[i][0] * dt;
          mp[i * 3 + 1] += mv[i][1] * dt;
          mp[i * 3 + 2] += mv[i][2] * dt;
        }
        motes.geometry.attributes.position.needsUpdate = true;
      }
      wn.offset.x += dt * 0.004;
      // she lifts her face after the thread is gone
      actor?.update(t, dt, -Math.min(0.32, Math.max(0, t0 - 7) * 0.12));
      return t0;
    },
  };
};
