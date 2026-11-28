import * as THREE from 'three';
import { fbm, noise2, rng } from './textures.js';
import { applyStone } from './stone.js';

/*
 * The three monuments, modelled on the key art and the trailer frames:
 *  - the spire (mind): a carved octagonal obelisk, thin rings of light, floating glyph tablets
 *  - the lotus (heart): thick stone petals around a glowing heart, on a stepped dais
 *  - the root tree (body) and its forest are in forest.js
 * Everything is generated in code.
 */

const hdr = (r, g, b, k) => new THREE.Color(r * k, g * k, b * k);
const smooth01 = (x) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

/** Flat facets (for cut stone): each face gets its own normal. */
const flat = (geo) => {
  const g = geo.toNonIndexed();
  g.computeVertexNormals();
  return g;
};

/** GLSL: 3D value noise, shared by the monument shaders. */
const NOISE3 = /* glsl */ `
  float mh(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float mn(vec3 p) { vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(mh(i), mh(i + vec3(1,0,0)), f.x), mix(mh(i + vec3(0,1,0)), mh(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(mh(i + vec3(0,0,1)), mh(i + vec3(1,0,1)), f.x), mix(mh(i + vec3(0,1,1)), mh(i + vec3(1,1,1)), f.x), f.y), f.z); }
`;

/* ───────────────────────── textures ───────────────────────── */

/** A random glyph: a few confident strokes, like a letter of an unknown script. */
const drawGlyph = (g, r, cx, cy, s) => {
  g.save();
  g.translate(cx, cy);
  const n = 2 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const kind = r();
    g.beginPath();
    if (kind < 0.35) {
      const rad = s * (0.18 + r() * 0.3);
      const a0 = r() * Math.PI * 2;
      g.arc((r() - 0.5) * s * 0.4, (r() - 0.5) * s * 0.5, rad, a0, a0 + Math.PI * (0.6 + r() * 1.1));
    } else if (kind < 0.75) {
      const x0 = (r() - 0.5) * s * 0.8;
      const y0 = (r() - 0.5) * s;
      g.moveTo(x0, y0);
      g.quadraticCurveTo((r() - 0.5) * s, (r() - 0.5) * s, (r() - 0.5) * s * 0.8, (r() - 0.5) * s);
    } else {
      const y0 = (r() - 0.5) * s * 0.9;
      g.moveTo(-s * 0.3, y0);
      g.lineTo(s * 0.3, y0 + (r() - 0.5) * s * 0.2);
    }
    g.stroke();
  }
  if (r() > 0.5) {
    g.beginPath();
    g.arc((r() - 0.5) * s * 0.5, (r() - 0.5) * s * 0.8, s * 0.045, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
};

/**
 * One carved panel of the spire as a height map (light = raised): a framed niche with an arch,
 * a column of glyphs, and bands of ornament above and below. Returns the canvas.
 */
const carvedCanvas = (seed) => {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const r = rng(seed);
  g.fillStyle = '#8c8c8c';
  g.fillRect(0, 0, S, S);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  // bands of ornament at the top and bottom
  for (const y of [0, S - 70]) {
    g.fillStyle = '#6a6a6a';
    g.fillRect(0, y, S, 70);
    g.strokeStyle = '#b4b4b4';
    g.lineWidth = 7;
    g.beginPath();
    for (let x = -20; x < S + 40; x += 64) {
      // a running meander
      g.moveTo(x, y + 52);
      g.lineTo(x, y + 18);
      g.lineTo(x + 40, y + 18);
      g.lineTo(x + 40, y + 40);
      g.lineTo(x + 20, y + 40);
    }
    g.stroke();
    g.fillStyle = '#3c3c3c';
    g.fillRect(0, y === 0 ? 66 : y - 4, S, 8);
  }
  // the niche: a deep frame, a raised panel, an arch
  g.strokeStyle = '#3a3a3a';
  g.lineWidth = 16;
  g.strokeRect(46, 100, S - 92, S - 200);
  g.fillStyle = '#9c9c9c';
  g.fillRect(70, 124, S - 140, S - 248);
  g.strokeStyle = '#555555';
  g.lineWidth = 9;
  g.beginPath();
  g.moveTo(104, S - 150);
  g.lineTo(104, 250);
  g.arc(S / 2, 250, S / 2 - 104, Math.PI, 0);
  g.lineTo(S - 104, S - 150);
  g.stroke();
  // vertical ribs at the panel's edges
  g.fillStyle = '#b0b0b0';
  g.fillRect(0, 0, 22, S);
  g.fillRect(S - 22, 0, 22, S);
  g.fillStyle = '#4a4a4a';
  g.fillRect(22, 0, 7, S);
  g.fillRect(S - 29, 0, 7, S);
  // glyphs cut into the niche
  g.strokeStyle = '#3e3e3e';
  g.fillStyle = '#3e3e3e';
  g.lineWidth = 8;
  for (let i = 0; i < 3; i++) drawGlyph(g, r, S / 2 + (r() - 0.5) * 30, 215 + i * 62, 50);
  // pitting and wear
  for (let i = 0; i < 2600; i++) {
    const v = r() > 0.5 ? 255 : 0;
    g.fillStyle = `rgba(${v},${v},${v},${0.03 + r() * 0.07})`;
    const rad = 1 + r() * r() * 9;
    g.beginPath();
    g.arc(r() * S, r() * S, rad, 0, Math.PI * 2);
    g.fill();
  }
  // soften the edges, as weathered stone
  const out = document.createElement('canvas');
  out.width = out.height = S;
  const o = out.getContext('2d');
  o.filter = 'blur(1.6px)';
  o.drawImage(c, 0, 0);
  return out;
};

const canvasTex = (canvas, repX, repY, srgb) => {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repX, repY);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

/** A glowing glyph on transparent, for the floating tablets and the spire's faces. */
const glyphTexture = (seed) => {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 192;
  const g = c.getContext('2d');
  const r = rng(seed);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.strokeStyle = '#ffffff';
  g.fillStyle = '#ffffff';
  g.shadowColor = '#ffffff';
  g.shadowBlur = 10;
  g.lineWidth = 7;
  drawGlyph(g, r, 64, 70, 78);
  drawGlyph(g, r, 64, 138, 46);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

/** A tube that narrows along its length (taper(u) in 0..1 multiplies the radius). */
const taperedTube = (pts, radius, taper, mat, seg = 36, radial = 10) => {
  const curve = new THREE.CatmullRomCurve3(pts);
  const geo = new THREE.TubeGeometry(curve, seg, radius, radial, false);
  const pp = geo.attributes.position;
  const c = new THREE.Vector3();
  const v = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    curve.getPointAt(i / seg, c);
    const k = taper(i / seg);
    for (let j = 0; j <= radial; j++) {
      const idx = i * (radial + 1) + j;
      const jj = j % radial; // the seam's two vertices must agree
      const lump = 1 + 0.2 * Math.sin(jj * ((Math.PI * 2) / radial) * 3 + i * 0.35) + (noise2(jj * 1.7 + pts[0].x, i * 0.45 + pts[0].z) - 0.5) * 0.5;
      v.fromBufferAttribute(pp, idx).sub(c).multiplyScalar(k * lump).add(c);
      pp.setXYZ(idx, v.x, v.y, v.z);
    }
  }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
};

/* ───────────────────────── the spire ───────────────────────── */

// where the player comes from: monuments turn their face toward it
const PLAIN = new THREE.Vector3(0, 0, 34);

/** Joins geometries (each with position, normal, uv) into one, so a whole grove is one draw call. */
export const mergeGeos = (geos) => {
  let nv = 0, ni = 0;
  for (const g of geos) {
    nv += g.attributes.position.count;
    ni += g.index ? g.index.count : g.attributes.position.count;
  }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2);
  const idx = new Uint32Array(ni);
  let ov = 0, oi = 0;
  for (const g of geos) {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array, ov * 3);
    nor.set(g.attributes.normal.array, ov * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, ov * 2);
    if (g.index) for (let i = 0; i < g.index.count; i++) idx[oi + i] = g.index.array[i] + ov;
    else for (let i = 0; i < n; i++) idx[oi + i] = ov + i;
    oi += g.index ? g.index.count : n;
    ov += n;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
};

/** A carved wall as a height map: rows of framed cells, each with a glyph, between bands of ornament. */
const glyphWallCanvas = (seed) => {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const r = rng(seed);
  g.fillStyle = '#7a7a7a';
  g.fillRect(0, 0, S, S);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const cols = 3, rows = 5;
  const cw = S / cols, rh = (S - 40) / rows;
  // a band of ornament across the top
  g.fillStyle = '#5c5c5c';
  g.fillRect(0, 0, S, 40);
  g.strokeStyle = '#a4a4a4';
  g.lineWidth = 5;
  g.beginPath();
  for (let x = -10; x < S + 30; x += 34) {
    g.moveTo(x, 30);
    g.lineTo(x + 10, 10);
    g.lineTo(x + 20, 30);
  }
  g.stroke();
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const x = i * cw, y = 40 + j * rh;
      // recessed cell with a raised rim
      g.fillStyle = '#4c4c4c';
      g.fillRect(x + 6, y + 6, cw - 12, rh - 12);
      g.fillStyle = '#8e8e8e';
      g.fillRect(x + 12, y + 12, cw - 24, rh - 24);
      g.strokeStyle = '#3a3a3a';
      g.fillStyle = '#3a3a3a';
      g.lineWidth = 7;
      drawGlyph(g, r, x + cw / 2, y + rh / 2, Math.min(cw, rh) * 0.62);
      if (r() > 0.5) drawGlyph(g, r, x + cw / 2 + (r() - 0.5) * 20, y + rh / 2 + 18, Math.min(cw, rh) * 0.3);
    }
  // weathering
  for (let i = 0; i < 3800; i++) {
    const v = r() > 0.5 ? 255 : 0;
    g.fillStyle = `rgba(${v},${v},${v},${0.03 + r() * 0.08})`;
    g.beginPath();
    g.arc(r() * S, r() * S, 1 + r() * r() * 8, 0, Math.PI * 2);
    g.fill();
  }
  const out = document.createElement('canvas');
  out.width = out.height = S;
  const o = out.getContext('2d');
  o.filter = 'blur(1.3px)';
  o.drawImage(c, 0, 0);
  return out;
};

/** A rough, eroded standing block: tapering square section, chipped edges, a broken top. */
const monolithGeometry = (w0, w1, H, seed, seg = 40) => {
  const geo = new THREE.BoxGeometry(1, 1, 1, 6, seg, 6);
  const pp = geo.attributes.position;
  for (let i = 0; i < pp.count; i++) {
    let x = pp.getX(i), y = pp.getY(i), z = pp.getZ(i);
    const h = y + 0.5;
    const w = w0 + (w1 - w0) * h;
    // chipped corners and a gently uneven surface
    const corner = Math.abs(x) * Math.abs(z) * 4; // 1 at the edges' corners
    const n = fbm(x * 3 + seed, h * 18 + z * 3, 4) - 0.5;
    x *= w * (1 + n * 0.05 - corner * 0.04);
    z *= w * (1 + n * 0.05 - corner * 0.04);
    let yy = h * H;
    if (h > 0.98) yy -= (fbm(x * 0.5 + seed, z * 0.5, 3)) * 3.5; // the top is broken off
    pp.setXYZ(i, x, yy, z);
  }
  geo.computeVertexNormals();
  return geo;
};

/**
 * The spire (mind), after the owner's reference: a square monolith covered in carving, split from top
 * to bottom by a crack of golden light that bursts out at its foot; thin rings of blue light around its
 * lower half; a vast white halo standing behind it; two lesser stones beside it; stepping stones
 * across the water to its dais.
 */
export const buildSpire = ({ scene, pos, glowTex, stoneMaterial, normalMap, updaters, colliders, farDim = { value: 1 }, hush = { value: 1 } }) => {
  const g = new THREE.Group();
  g.position.copy(pos);
  g.rotation.y = Math.atan2(PLAIN.x - pos.x, PLAIN.z - pos.z); // local +z faces the plain
  const wall = glyphWallCanvas(5);
  const carved = new THREE.MeshStandardMaterial({ color: 0xa79a86, map: canvasTex(wall, 1.6, 14, true), bumpMap: canvasTex(wall, 1.6, 14, false), bumpScale: 5, roughness: 0.9, metalness: 0.02 });
  carved.onBeforeCompile = (sh) => applyStone(sh, { scale: 0.22, bump: 0.05, contrast: 0.75 });
  const H = 84, W0 = 11.5, W1 = 9;
  g.add(new THREE.Mesh(monolithGeometry(W0, W1, H, 3), carved));

  // the crack of light, a little off centre on the face toward the plain
  const crackGeo = new THREE.PlaneGeometry(1, 1, 1, 60);
  {
    const cp = crackGeo.attributes.position;
    for (let i = 0; i < cp.count; i++) {
      const h = cp.getY(i) + 0.5;
      const w = W0 + (W1 - W0) * h;
      cp.setXYZ(i, cp.getX(i) * 2.4 - w * 0.06, h * H, w / 2 + 0.12);
    }
  }
  const crackMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 }, dim: farDim },
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv; uniform float time; uniform float dim;
      ${NOISE3}
      void main() {
        // a jagged line: it wanders and steps sideways as it runs down the stone
        float y = vUv.y;
        float cx = 0.5 + (mn(vec3(y * 22.0, 1.0, 0.0)) - 0.5) * 0.06 + (mn(vec3(y * 4.0, 5.0, 0.0)) - 0.5) * 0.08;
        float d = abs(vUv.x - cx);
        float core = exp(-pow(d / 0.012, 2.0));
        float glow = exp(-d / 0.07) * 0.45;
        float flicker = 0.85 + 0.15 * mn(vec3(y * 30.0, time * 2.0, 3.0));
        float foot = 1.0 + 2.5 * exp(-y * 14.0); // it burns brightest where it meets the ground
        vec3 col = vec3(1.0, 0.68, 0.3) * (core * 4.0 + glow) * flicker * foot;
        gl_FragColor = vec4(col * dim, 1.0);
      }`,
  });
  const crack = new THREE.Mesh(crackGeo, crackMat);
  g.add(crack);
  // light bursting out at the foot
  const burst = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(2.2, 1.3, 0.5), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  burst.position.set(-W0 * 0.06, 1.2, W0 / 2 + 1);
  burst.scale.set(16, 7, 1);
  g.add(burst);
  const gold = new THREE.PointLight(0xffb060, 260, 70, 1.6);
  gold.position.set(0, 3, W0 / 2 + 4);
  g.add(gold);

  // thin rings of blue light around its lower half: three pairs
  const RING_COL = hdr(0.45, 0.72, 1, 2.0);
  const ringMat = new THREE.MeshBasicMaterial({ color: RING_COL.clone(), fog: false });
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const ry = 18 + i * 8;
    const pair = new THREE.Group();
    const rad = W0 * 0.75 + 5.5;
    pair.add(new THREE.Mesh(new THREE.TorusGeometry(rad, 0.07, 6, 160), ringMat));
    const t2 = new THREE.Mesh(new THREE.TorusGeometry(rad * 0.93, 0.05, 6, 160), ringMat);
    t2.position.z = 0.6;
    pair.add(t2);
    pair.position.y = ry;
    // each pair also rides slowly up and down the stone, at its own pace, passing the others
    pair.userData = { phase: i * 1.9, speed: (i % 2 ? -1 : 1) * 0.15, y0: 20 + i * 11, travel: 13 + i * 3, pace: 0.21 - i * 0.045 };
    g.add(pair);
    rings.push(pair);
  }
  // the halo: a vast thin ring of white light standing behind the stone
  const haloY = H * 0.66;
  const haloMat = new THREE.MeshBasicMaterial({ color: hdr(0.85, 0.95, 1, 3.2), fog: false });
  const halo = new THREE.Mesh(new THREE.TorusGeometry(40, 0.32, 8, 256), haloMat);
  halo.position.set(0, haloY, -14);
  g.add(halo);
  const haloGlow = new THREE.Mesh(
    new THREE.RingGeometry(37.5, 42.5, 256),
    new THREE.MeshBasicMaterial({ color: hdr(0.6, 0.8, 1, 1), transparent: true, opacity: 0.035, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }),
  );
  haloGlow.position.copy(halo.position);
  g.add(haloGlow);

  // two lesser stones beside it, and a low dais
  const plain = stoneMaterial(normalMap, 0x6a625a, 3, { scale: 0.45, bump: 0.05 });
  for (const [x, z, h, w, s] of [[-30, 2, 28, 4.2, 11], [31, -4, 22, 3.8, 17]]) {
    const m = new THREE.Mesh(monolithGeometry(w, w * 0.82, h, s, 20), carved);
    m.position.set(x, -0.6, z);
    m.rotation.y = s * 0.3;
    g.add(m);
    const wp = new THREE.Vector3(x, 0, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), g.rotation.y).add(pos);
    colliders.push({ x: wp.x, z: wp.z, r: w * 0.75 });
  }
  const r = rng(91);
  const slab = (x, z, sx, sz, y = 0.08, rot = 0) => {
    const m = new THREE.Mesh(flat(new THREE.BoxGeometry(sx, 0.45, sz, 2, 1, 2)), plain);
    m.position.set(x, y - 0.2, z);
    m.rotation.set((r() - 0.5) * 0.04, rot, (r() - 0.5) * 0.04);
    g.add(m);
  };
  // the dais: broken flagstones around the foot
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2, d = 6 + r() * 11;
    slab(Math.sin(a) * d, Math.cos(a) * d, 2.5 + r() * 3, 2 + r() * 3, 0.18 + r() * 0.1, r());
  }
  // stepping stones toward the plain
  for (let i = 0; i < 16; i++) {
    const z = 16 + i * 3.1;
    slab((r() - 0.5) * 1.6 + Math.sin(i * 0.5) * 1.5, z, 2.6 + r() * 1.4, 1.8 + r() * 0.7, 0.12, (r() - 0.5) * 0.4);
  }

  const blue = new THREE.PointLight(0x7aa6ff, 160, 120, 1.6);
  blue.position.set(0, 26, 14);
  g.add(blue);
  scene.add(g);
  colliders.push({ x: pos.x, z: pos.z, r: W0 * 0.72 });
  let spireOpen = 0, spireOpenTarget = 0;
  updaters.push((t, dt = 0.016) => {
    spireOpen += (spireOpenTarget - spireOpen) * (1 - Math.exp(-dt));
    crackMat.uniforms.time.value = t;
    for (const p of rings) {
      const u = p.userData;
      p.rotation.set(Math.PI / 2 + Math.sin(t * 0.3 + u.phase) * 0.025, Math.cos(t * 0.27 + u.phase) * 0.025, t * u.speed);
      p.position.y = u.y0 + u.travel * Math.sin(t * u.pace + u.phase * 1.7);
    }
    // the blue light rides with the middle pair, so the carving is lit as the rings pass
    blue.position.y = rings[1].position.y;
    const b = 0.85 + 0.15 * Math.sin(t * 0.7);
    burst.material.opacity = 0.45 * b;
    gold.intensity = 220 * b * (1 + spireOpen * 1.5);
    burst.scale.set(16 + spireOpen * 10, 7 + spireOpen * 5, 1);
    // (these are not touched by the fog, so where the air is thick, in the forest, they are dimmed by hand)
    // (and in the ending its cold lights are hushed: `hush`. The gold at its foot stays.)
    const cold = farDim.value * hush.value;
    haloMat.color.copy(hdr(0.85, 0.95, 1, 1.9 + 0.3 * Math.sin(t * 0.25))).multiplyScalar(cold);
    ringMat.color.copy(RING_COL).multiplyScalar(cold);
    haloGlow.material.opacity = 0.035 * cold;
    blue.intensity = 160 * hush.value;
  });
  // the way in: the crack of light at the stone's foot
  const facing = new THREE.Vector3(Math.sin(g.rotation.y), 0, Math.cos(g.rotation.y));
  const doorPos = new THREE.Vector3(-W0 * 0.06, 0, W0 / 2 + 1.5).applyAxisAngle(new THREE.Vector3(0, 1, 0), g.rotation.y).add(pos);
  return { top: H, open: () => (spireOpenTarget = 1), doorPos, facing };
};

/* ───────────────────────── the lotus ───────────────────────── */

/** A thick stone petal, 1 unit long: narrow foot, broad middle, pointed tip; cupped toward the heart, tip curling out. */
export const petalGeometry = (curlOut = 0.3) => {
  const geo = new THREE.SphereGeometry(1, 22, 30);
  const pp = geo.attributes.position;
  for (let i = 0; i < pp.count; i++) {
    const x = pp.getX(i);
    const y = pp.getY(i);
    const z = pp.getZ(i);
    const t = (y + 1) / 2;
    const rho = Math.sqrt(Math.max(0, 1 - y * y));
    const xn = rho > 1e-4 ? x / rho : 0;
    const zn = rho > 1e-4 ? z / rho : 0;
    const w = 0.4 * (0.34 + 0.66 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.06)), 0.7)) * Math.pow(1 - t, 0.3);
    const th = 0.014 + 0.05 * Math.pow(1 - t, 0.8);
    const X = xn * w;
    const cup = -(X * X) * 1.5; // the edges fold in toward the heart
    const belly = Math.sin(Math.PI * Math.min(1, t * 1.15)) * 0.1; // the back swells outward
    const curl = Math.pow(t, 2.6) * curlOut;
    pp.setXYZ(i, X, t, zn * th + cup + belly + curl);
  }
  geo.computeVertexNormals();
  return geo;
};

export const buildLotus = ({ scene, pos, glowTex, stoneMaterial, normalMap, updaters, colliders, farDim = { value: 1 } }) => {
  const state = { pulse: 0, open: 0, openTarget: 0, lit: 0 };
  state.doOpen = () => (state.openTarget = 1);
  /** The ending: the whole flower alight, 0..1 (gold within, ember without). */
  state.setLit = (k) => (state.lit = k);
  const lit = { value: 0 };
  const g = new THREE.Group();
  g.position.copy(pos);
  const stone = stoneMaterial(normalMap, 0x77726e, 6, { scale: 0.26, bump: 0.06 });
  // the dais: three worn steps
  [
    [27, 28.5, 1.3, 0.25],
    [22.5, 23.5, 1.3, 1.5],
    [17.5, 18.5, 1.5, 2.9],
  ].forEach(([rt, rb, h, y]) => {
    const m = new THREE.Mesh(flat(new THREE.CylinderGeometry(rt, rb, h, 24)), stone);
    m.position.y = y;
    g.add(m);
  });
  const BASE = 3.5;
  const HEART_Y = BASE + 5.5;

  // petals: pale stone outside; inside, lit by the heart and beating with it
  const petalMat = stoneMaterial(normalMap, 0x8d8782, 3);
  petalMat.roughness = 0.74;
  const pulse = { value: 0 };
  petalMat.onBeforeCompile = (sh) => {
    applyStone(sh, { scale: 0.2, bump: 0.07, contrast: 0.85 });
    sh.uniforms.pulse = pulse;
    sh.uniforms.lotusLit = lit;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vT; varying float vIn; varying vec3 vOP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n vT = position.y; vIn = -normal.z; vOP = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying float vT; varying float vIn; varying vec3 vOP; uniform float pulse; uniform float lotusLit;${NOISE3}`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        // marble: faint dark veins running up the petal
        float vein = mn(vOP * vec3(9.0, 2.2, 9.0)) * 0.6 + mn(vOP * vec3(21.0, 5.0, 21.0)) * 0.4;
        diffuseColor.rgb *= 0.8 + 0.3 * smoothstep(0.02, 0.12, abs(vein - 0.5));
        // carved: a midrib and shallow flutes fanning from the foot, as on a stone lotus
        float fan = vOP.x / max(0.06, 0.4 * (0.3 + 0.7 * sin(3.14159 * min(1.0, vT * 1.06))));
        float flute = abs(fract(fan * 4.5 + 0.5) - 0.5) * 2.0;
        diffuseColor.rgb *= 1.0 - 0.3 * smoothstep(0.82, 1.0, flute) * smoothstep(0.02, 0.2, vT) * (1.0 - smoothstep(0.75, 0.98, vT));
        // rain-dark streaks down from the tip, and a darker foot
        diffuseColor.rgb *= 0.78 + 0.22 * smoothstep(0.0, 0.3, vT);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float inner = smoothstep(0.05, 0.55, vIn);
        float low = pow(1.0 - vT, 1.8);
        // the heart's light on the inner faces, and a little passing through the thin stone
        totalEmissiveRadiance += vec3(1.0, 0.3, 0.2) * (inner * (0.1 + 1.5 * low) + (1.0 - inner) * 0.14 * low * low) * (0.55 + pulse * 0.9);
        // the ending: the whole flower alight, as thin petals are with a great light inside them
        float lotusRim = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 1.5);
        totalEmissiveRadiance += lotusLit * (mix(vec3(0.9, 0.27, 0.08) * 0.3, vec3(1.0, 0.5, 0.2) * 0.8, inner) * (0.5 + 0.5 * (1.0 - vT)) + vec3(1.0, 0.58, 0.3) * lotusRim * 0.28);`,
      );
  };
  petalMat.customProgramCacheKey = () => 'lotus-petal-v5';
  const layers = [
    { n: 5, s: 23, tilt: 0.2, r: 3.6, curl: 0.12, off: Math.PI / 5 },
    { n: 7, s: 25, tilt: 0.42, r: 5.8, curl: 0.2, off: 0 },
    { n: 9, s: 24, tilt: 0.74, r: 8.2, curl: 0.3, off: 0 },
    { n: 11, s: 21, tilt: 1.12, r: 11, curl: 0.4, off: Math.PI / 11 },
  ];
  layers.forEach((L, li) => {
    const geo = petalGeometry(L.curl);
    for (let i = 0; i < L.n; i++) {
      const a = (i / L.n) * Math.PI * 2 + L.off;
      // the flower stands open toward the plain: a doorway to the heart
      if ((li === 1 || li === 2) && i === 0) continue;
      if (li === 3 && (i === 0 || i === L.n - 1)) continue;
      const p = new THREE.Mesh(geo, petalMat);
      p.rotation.order = 'YXZ';
      p.rotation.set(L.tilt, a, 0);
      p.position.set(Math.sin(a) * L.r, BASE, Math.cos(a) * L.r);
      p.scale.setScalar(L.s * (0.96 + 0.08 * ((i * 7) % 3) * 0.5));
      g.add(p);
    }
  });

  // the heart: a slowly churning ember, white-hot at its centre, darker red toward the rim
  const coreMat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, power: { value: 2.5 } },
    vertexShader: /* glsl */ `varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main() { vP = position; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `varying vec3 vN; varying vec3 vV; varying vec3 vP; uniform float time; uniform float power;
      ${NOISE3}
      void main() {
        float facing = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
        vec3 q = vP * 0.9 + vec3(0.0, time * 0.25, 0.0);
        float fl = mn(q) * 0.6 + mn(q * 2.3 - time * 0.2) * 0.4;
        vec3 deep = vec3(0.6, 0.06, 0.03); vec3 hot = vec3(1.0, 0.42, 0.24); vec3 white = vec3(1.0, 0.84, 0.7);
        vec3 col = mix(deep, hot, smoothstep(0.1, 0.7, facing + fl * 0.35));
        col = mix(col, white, smoothstep(0.75, 1.0, facing) * (0.5 + fl * 0.5));
        gl_FragColor = vec4(col * power, 1.0);
      }`,
    fog: false,
  });
  const core = new THREE.Mesh(new THREE.SphereGeometry(3.8, 48, 32), coreMat);
  core.position.y = HEART_Y;
  g.add(core);
  const light = new THREE.PointLight(0xff5a3c, 500, 190, 1.6);
  light.position.set(0, HEART_Y, 3); // a little toward the doorway, so it spills onto the steps
  g.add(light);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff6a4c, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  glow.position.set(0, HEART_Y + 1, 6);
  glow.scale.set(60, 50, 1);
  g.add(glow);


  // the heart's light spilling out of the doorway: it washes the front petals, the steps and the water in rose
  const spill = new THREE.PointLight(0xff5a3c, 300, 130, 1.7);
  spill.position.set(0, 9, 26);
  g.add(spill);
  // rings of light spreading over the water with each beat
  const ripples = [];
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(0.992, 1, 160),
      new THREE.MeshBasicMaterial({ color: hdr(1, 0.34, 0.24, 2.4), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.06;
    // (the water itself now carries each beat's ring: see water.js; these stay only as a faint tint)
    m.visible = false;
    g.add(m);
    ripples.push(m);
  }
  scene.add(g);
  colliders.push({ x: pos.x, z: pos.z, r: 29.5 });
  const BEAT = 1.15;
  updaters.push((t) => {
    const ph = (t % BEAT) / BEAT;
    const beat = Math.exp(-ph * 7) + 0.55 * Math.exp(-Math.abs(ph - 0.27) * 22);
    state.pulse = beat;
    state.open += (state.openTarget - state.open) * 0.02;
    pulse.value = beat;
    lit.value = state.lit;
    // (alight, its heart burns gold rather than red)
    light.color.setRGB(1, 0.1 + 0.26 * state.lit, 0.045 + 0.06 * state.lit);
    coreMat.uniforms.power.value = (1.4 + beat * 1.8) * farDim.value;
    coreMat.uniforms.time.value = t;
    core.scale.setScalar(1 + beat * 0.06);
    light.intensity = 360 + beat * 520;
    spill.intensity = (240 + beat * 340) * (1 + state.open * 1.4) * (1 - 0.45 * state.lit);
    // (alight, the flower is its own light: the soft glow in front of it would only hide it)
    glow.material.opacity = (0.14 + beat * 0.14) * (1 + state.open) * farDim.value * (1 - 0.75 * state.lit);
    ripples.forEach((m, i) => {
      const k = ((t / (BEAT * 5) + i / 5) % 1 + 1) % 1;
      m.scale.setScalar(30 + k * 42);
      m.material.opacity = (1 - k) ** 2.4 * 0.5;
    });
  });
  return state;
};

/* (The root tree and its forest live in forest.js.) */

/* ───────────────────────── the way to the lotus ───────────────────────── */

/**
 * After the owner's reference: the water avenue to the lotus is lined with towers like a city of
 * needles, every ledge and window holding a small warm light, and the water itself is covered in
 * floating candles. Everything here is merged or instanced: one draw for the stone, one for the
 * lights, one for the candles.
 */
/**
 * A needle tower: stacked tapering tiers with balconies, then a long spire; lights on every tier.
 * Pushes its pieces into `geos` (to be merged) and its lamps into `lightPts` as [x, y, z, seed].
 * `keep` thins the lamps (1 keeps all).
 */
export const needleTower = (r, geos, lightPts, x, z, h, w, keep = 1, detail = false) => {
  const push = (p) => { if (keep >= 1 || r() < keep) lightPts.push(p); };
    let y = 0;
    let ww = w;
    const turn = r() * Math.PI;
    const tiers = 3 + Math.floor(r() * 3);
    if (detail) {
      // a stepped plinth standing in the water
      const pl = flat(new THREE.CylinderGeometry(w * 1.18, w * 1.3, 1.5, 8, 1));
      pl.rotateY(turn);
      pl.translate(x, 0.2, z);
      geos.push(pl);
    }
    for (let k = 0; k < tiers; k++) {
      const th = (h * 0.55) / tiers;
      // cut stone: eight flat faces, not a round pipe
      const b = flat(new THREE.CylinderGeometry(ww * 0.86, ww, th, 8, 1));
      b.rotateY(turn);
      b.translate(x, y + th / 2, z);
      geos.push(b);
      const ledge = flat(new THREE.CylinderGeometry(ww * 1.1, ww * 1.02, 0.5, 8, 1));
      ledge.rotateY(turn);
      ledge.translate(x, y + th, z);
      geos.push(ledge);
      if (detail) {
        // a string course under the ledge, and a slender buttress up each corner
        const band = flat(new THREE.CylinderGeometry(ww * 0.93, ww * 0.95, 0.3, 8, 1));
        band.rotateY(turn);
        band.translate(x, y + th * 0.62, z);
        geos.push(band);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + turn;
          const bt = new THREE.BoxGeometry(ww * 0.16, th, ww * 0.16);
          bt.rotateY(-a);
          bt.translate(x + Math.sin(a) * ww * 0.95, y + th / 2, z + Math.cos(a) * ww * 0.95);
          geos.push(bt);
        }
      }
      // windows and lamps round the tier
      const n = 8 + Math.floor(ww * 2);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        for (let j = 0; j < 4; j++) if (r() > 0.25) push([x + Math.cos(a) * ww * 0.95, y + th * (0.25 + j * 0.25), z + Math.sin(a) * ww * 0.95, r()]);
        if (r() > 0.4) push([x + Math.cos(a) * ww * 1.1, y + th + 0.4, z + Math.sin(a) * ww * 1.1, r()]);
      }
      // little pinnacles at the corners of the ledge
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const p = new THREE.ConeGeometry(0.35, 2.6 + r() * 2, 6);
        p.translate(x + Math.cos(a) * ww, y + th + 1.4, z + Math.sin(a) * ww);
        geos.push(p);
        push([x + Math.cos(a) * ww, y + th + 2.9, z + Math.sin(a) * ww, r()]);
      }
      y += th;
      ww *= 0.78;
    }
    const sh = h - y;
    const spire = flat(new THREE.ConeGeometry(ww * 0.9, sh, 8, 6));
    spire.rotateY(turn);
    spire.translate(x, y + sh / 2, z);
    geos.push(spire);
    for (let k = 0; k < 10; k++) push([x + (r() - 0.5) * ww * 0.6, y + (k / 10) * sh * 0.8, z + (r() - 0.5) * ww * 0.6, r()]);
};

export const buildLotusAvenue = ({ scene, glowTex, stoneMaterial, normalMap, updaters, colliders, lotusPos, farDim = { value: 1 } }) => {
  const g = new THREE.Group();
  const r = rng(808);
  const stone = stoneMaterial(normalMap, 0x3a332e, 4, { scale: 0.3, bump: 0.05 });
  stone.roughness = 0.85;
  const geos = [];
  const lightPts = [];
  const Z_NEAR = -92, Z_FAR = lotusPos.z + 12;
  const tower = (x, z, h, w) => {
    needleTower(r, geos, lightPts, x, z, h, w, 1, true);
    colliders.push({ x, z, r: w + 0.6 });
  };
  for (const side of [-1, 1]) {
    // a dense front row along the water, then taller towers behind
    for (let z = Z_NEAR; z > Z_FAR; z -= 7 + r() * 5) tower(side * (17 + r() * 5), z, 22 + r() * 26, 2.2 + r() * 1.6);
    for (let z = Z_NEAR - 4; z > Z_FAR - 10; z -= 9 + r() * 7) tower(side * (30 + r() * 12), z, 40 + r() * 45, 3 + r() * 2.5);
  }
  const city = new THREE.Mesh(mergeGeos(geos), stone);
  city.castShadow = city.receiveShadow = true;
  g.add(city);

  // the lights of the towers: warm points that flicker, each its own rhythm
  const lightMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 }, tex: { value: glowTex }, scale: { value: 600 }, dim: farDim, low: { value: 0 }, quiet: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute float seed; uniform float time; uniform float scale; uniform float dim; uniform float low; uniform float quiet; varying float vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        // (low: in the ending only the lamps near the water burn, as in the owner's film)
        vA = (0.65 + 0.35 * sin(time * (1.5 + seed * 3.0) + seed * 40.0)) * dim * mix(1.0, 0.02 + 0.98 * smoothstep(16.0, 3.0, position.y), low) * (1.0 - quiet);
        gl_PointSize = clamp(scale * (0.9 + seed * 0.6) / -mv.z, 2.0, 30.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tex; varying float vA;
      void main() {
        float a = texture2D(tex, gl_PointCoord).a;
        gl_FragColor = vec4(vec3(1.0, 0.66, 0.32) * 2.2 * vA * a, a);
      }`,
  });
  const lp = new Float32Array(lightPts.length * 3);
  const ls = new Float32Array(lightPts.length);
  lightPts.forEach(([x, y, z, s], i) => {
    lp.set([x, y, z], i * 3);
    ls[i] = s;
  });
  const lightGeo = new THREE.BufferGeometry();
  lightGeo.setAttribute('position', new THREE.BufferAttribute(lp, 3));
  lightGeo.setAttribute('seed', new THREE.BufferAttribute(ls, 1));
  const lights = new THREE.Points(lightGeo, lightMat);
  lights.frustumCulled = false;
  g.add(lights);

  // candles floating on the water, thickest down the middle of the avenue
  const NC = 2600;
  const cp = new Float32Array(NC * 3);
  const cs = new Float32Array(NC);
  for (let i = 0; i < NC; i++) {
    const z = Z_NEAR + 8 - r() * (Z_NEAR + 8 - lotusPos.z - 30);
    const spread = 14 + Math.max(0, (Z_NEAR - z) * 0.05);
    const x = (r() - 0.5) * 2 * spread * Math.pow(r(), 0.6);
    cp.set([x, 0.07, z], i * 3);
    cs[i] = r();
  }
  const candleGeo = new THREE.BufferGeometry();
  candleGeo.setAttribute('position', new THREE.BufferAttribute(cp, 3));
  candleGeo.setAttribute('seed', new THREE.BufferAttribute(cs, 1));
  const candleMat = lightMat.clone();
  candleMat.uniforms.tex.value = glowTex;
  candleMat.uniforms.dim = farDim;
  candleMat.vertexShader = candleMat.vertexShader.replace('gl_PointSize = clamp(scale * (0.55 + seed * 0.35) / -mv.z, 1.5, 22.0);', 'gl_PointSize = clamp(scale * (0.45 + seed * 0.3) / -mv.z, 1.6, 20.0);');
  candleMat.vertexShader = candleMat.vertexShader.replace('vec4 mv = modelViewMatrix * vec4(position, 1.0);', 'vec3 p = position; p.y += sin(time * 0.8 + seed * 30.0) * 0.03; p.x += sin(time * 0.1 + seed * 9.0) * 0.4;\n        vec4 mv = modelViewMatrix * vec4(p, 1.0);');
  const candles = new THREE.Points(candleGeo, candleMat);
  candles.frustumCulled = false;
  g.add(candles);
  // a few real lights so the stone and water catch the glow
  for (const [x, z] of [[-14, -105], [14, -120], [-14, -140], [14, -155]]) {
    const l = new THREE.PointLight(0xffa860, 260, 55, 1.7);
    l.position.set(x, 6, z);
    g.add(l);
  }
  scene.add(g);
  const resize = () => {
    const k = innerHeight * Math.min(devicePixelRatio, 1.5) * 0.9;
    lightMat.uniforms.scale.value = k;
    candleMat.uniforms.scale.value = k;
  };
  resize();
  addEventListener('resize', resize);
  updaters.push((t) => {
    lightMat.uniforms.time.value = t;
    candleMat.uniforms.time.value = t;
  });
  return {
    zNear: Z_NEAR,
    zFar: lotusPos.z,
    /** 0: every ledge and window lit; 1: only the lamps near the water. */
    setLow(k) {
      lightMat.uniforms.low.value = k;
      // (and the candles on the water burn lower: seen from the plain, thousands of them in one line were a white bar)
      candleMat.uniforms.quiet.value = 0.93 * k;
    },
  };
};
