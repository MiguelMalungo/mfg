import * as THREE from 'three';
import { fbm, noise2, rng } from './textures.js';
import { mergeGeos } from './monuments.js';
import { applyStone } from './stone.js';

/*
 * The root tree and its forest (body), after the owner's reference film of 2026-11-28
 * (refs/forest-film-*.jpg): a flooded wood.
 *
 *  - A channel of dark water runs from the plain to the root tree, between two low banks of rock and root.
 *  - On the banks stand huge twisted trees. They lean over the water and their limbs meet overhead,
 *    so the channel is a tunnel; behind them more trees stand in rows, each fainter in the mist.
 *  - Teal mist fills the air (the fog and the sky are set in world.js), brightest round the hollow
 *    that shines at the far end.
 *  - Veins of light climb the roots and the feet of the trunks: a fine web, with brighter main veins.
 *  - Moss hangs from the limbs; small lamps stand on rocks by the water; gold leaves lie on it.
 *
 * The chapter's play is unchanged: four walls of roots across the channel that rise and sink with the
 * tree's breath, and the hollow at its foot.
 *
 * Everything is generated in code. Trees, roots and gates are one merged mesh; the banks and rocks
 * another; moss and leaves are instanced.
 */

const UP = new THREE.Vector3(0, 1, 0);
const XAXIS = new THREE.Vector3(1, 0, 0);
// metres of bark covered by one tile of the vein map: along the wood, and round it
const TILE_U = 4.8, TILE_V = 3.2;
const LAMPS = 8;
// a limb's uv starts here along the wood (the maps repeat, so only the shader's test for it sees the difference)
const LIMB = 1000;

const hdr = (r, g, b, k) => new THREE.Color(r * k, g * k, b * k);
const smooth01 = (x) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

/** GLSL: 3D value noise. */
const NOISE3 = /* glsl */ `
  float mh(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float mn(vec3 p) { vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(mh(i), mh(i + vec3(1,0,0)), f.x), mix(mh(i + vec3(0,1,0)), mh(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(mh(i + vec3(0,0,1)), mh(i + vec3(1,0,1)), f.x), mix(mh(i + vec3(0,1,1)), mh(i + vec3(1,1,1)), f.x), f.y), f.z); }
`;

/* ───────────────────────── textures ───────────────────────── */

const dataTexture = (data, S) => {
  const t = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
};

/**
 * A Voronoi pattern on an nx × ny grid of cells that tiles: for each pixel, how far it is from the
 * nearest border between two cells (0 on a border), in cell units.
 */
const voronoi = (S, nx, ny, r, jitter = 1, drop = 0) => {
  const px = new Float32Array(nx * ny), py = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      px[j * nx + i] = i + 0.5 + (r() - 0.5) * jitter;
      py[j * nx + i] = j + 0.5 + (r() - 0.5) * jitter;
    }
  // `drop`: the share of seeds taken away (their neighbours' cells grow into the gap), so the cells
  // come in very different sizes, as cracks do. (A seed is sent far off, never doubled: two seeds in
  // one place would make a whole cell count as a border.)
  for (let k = 0; k < nx * ny; k++) if (r() < drop) px[k] = 1e6;
  const out = new Float32Array(S * S);
  for (let y = 0; y < S; y++) {
    const v = (y / S) * ny, cj = Math.floor(v);
    for (let x = 0; x < S; x++) {
      const u = (x / S) * nx, ci = Math.floor(u);
      let d1 = 9, d2 = 9;
      for (let dj = -2; dj <= 2; dj++)
        for (let di = -2; di <= 2; di++) {
          const ii = (ci + di + nx * 2) % nx, jj = (cj + dj + ny * 2) % ny;
          const k = jj * nx + ii;
          const d = Math.hypot(px[k] + (ci + di - ii) - u, py[k] + (cj + dj - jj) - v);
          if (d < d1) {
            d2 = d1;
            d1 = d;
          } else if (d < d2) d2 = d;
        }
      out[y * S + x] = d2 - d1;
    }
  }
  return out;
};

/** Smooth noise that tiles (sampled on a torus), about `f` blobs across the tile. */
const tileNoise = (S, f, seed, oct = 3) => {
  // computed coarse and stretched: it is smooth anyway
  const C = 128;
  const c = new Float32Array(C * C);
  for (let y = 0; y < C; y++)
    for (let x = 0; x < C; x++) {
      const a = (x / C) * Math.PI * 2, b = (y / C) * Math.PI * 2;
      c[y * C + x] = fbm(Math.cos(a) * f + Math.cos(b) * f * 0.7 + seed, Math.sin(a) * f + Math.sin(b) * f * 0.7 + seed * 1.7, oct);
    }
  const out = new Float32Array(S * S);
  for (let y = 0; y < S; y++) {
    const fy = (y / S) * C, y0 = Math.floor(fy) % C, y1 = (y0 + 1) % C, ty = fy - Math.floor(fy);
    for (let x = 0; x < S; x++) {
      const fx = (x / S) * C, x0 = Math.floor(fx) % C, x1 = (x0 + 1) % C, tx = fx - Math.floor(fx);
      out[y * S + x] = (c[y0 * C + x0] * (1 - tx) + c[y0 * C + x1] * tx) * (1 - ty) + (c[y1 * C + x0] * (1 - tx) + c[y1 * C + x1] * tx) * ty;
    }
  }
  return out;
};

/** A box blur that wraps round the tile's edges. */
const blurWrap = (src, S, rad, horizontal) => {
  const dst = new Float32Array(S * S);
  const w = 2 * rad + 1;
  for (let p = 0; p < S; p++) {
    let sum = 0;
    for (let q = -rad; q <= rad; q++) sum += horizontal ? src[p * S + ((q + S) % S)] : src[((q + S) % S) * S + p];
    for (let q = 0; q < S; q++) {
      if (horizontal) dst[p * S + q] = sum / w;
      else dst[q * S + p] = sum / w;
      const add = (q + rad + 1) % S, sub = (q - rad + S) % S;
      sum += horizontal ? src[p * S + add] - src[p * S + sub] : src[add * S + p] - src[sub * S + p];
    }
  }
  return dst;
};
const glowOf = (src, S, rx, ry) => {
  let g = src;
  for (let k = 0; k < 2; k++) g = blurWrap(blurWrap(g, S, rx, true), S, ry, false);
  return g;
};

/**
 * The veins of light, as one tiling map (x runs along the wood, y round it):
 *   r: the web, hairline cracks between cells about 25 cm across, with dark stretches;
 *   g: the web blurred, its glow;
 *   b: the main veins, a few bright lines that climb the wood and fork like lightning;
 *   a: the main veins blurred, their glow.
 */
const veinTexture = () => {
  const S = 1024;
  const r = rng(404);
  const e = voronoi(S, 20, 16, r, 1, 0.42);
  // not every crack is alight: stretches of the web are dark
  const lit = tileNoise(S, 2.6, 5.3);
  const thick = tileNoise(S, 4.3, 11.9);
  const web = new Float32Array(S * S);
  // (the lines are fine in places and heavier in others)
  for (let i = 0; i < S * S; i++) web[i] = Math.pow(Math.max(0, 1 - e[i] / (0.05 + 0.1 * thick[i])), 1.4) * (0.05 + 0.95 * smooth01((lit[i] - 0.36) / 0.16));
  // the main veins, drawn: each crosses the whole tile along x (and comes back to where it began, so it tiles)
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, S, S);
  g.strokeStyle = '#fff';
  g.lineCap = g.lineJoin = 'round';
  const wrap = (draw) => {
    for (const oy of [-S, 0, S])
      for (const ox of [-S, 0, S]) {
        g.save();
        g.translate(ox, oy);
        draw();
        g.restore();
      }
  };
  const NV = 4;
  for (let k = 0; k < NV; k++) {
    const y0 = ((k + 0.2 + r() * 0.6) / NV) * S;
    const a1 = 18 + r() * 30, a2 = 8 + r() * 14, p1 = r() * 6.28, p2 = r() * 6.28, f2 = 3 + Math.floor(r() * 3);
    const jag = Array.from({ length: 65 }, () => (r() - 0.5) * 12);
    jag[64] = jag[0];
    const yAt = (x) => y0 + a1 * Math.sin((x / S) * 6.2832 + p1) + a2 * Math.sin((x / S) * 6.2832 * f2 + p2) + jag[Math.round(x / 16)];
    wrap(() => {
      g.lineWidth = 3.6;
      g.beginPath();
      for (let x = 0; x <= S; x += 16) (x ? g.lineTo(x, yAt(x)) : g.moveTo(x, yAt(x)));
      g.stroke();
    });
    // forks: they leave the vein and climb away from it, thinning, and fork again
    const fork = (x, y, way, n, w) => {
      const pts = [[x, y]];
      for (let s = 0; s < n; s++) {
        x += 12 + r() * 22;
        y += way * (4 + r() * 15) + (r() - 0.5) * 9;
        pts.push([x, y]);
      }
      wrap(() => {
        for (let s = 0; s < pts.length - 1; s++) {
          g.lineWidth = w * (1 - s / pts.length) + 1.1;
          g.beginPath();
          g.moveTo(pts[s][0], pts[s][1]);
          g.lineTo(pts[s + 1][0], pts[s + 1][1]);
          g.stroke();
        }
      });
      if (n > 4 && r() < 0.7) {
        const m = pts[2 + Math.floor(r() * (pts.length - 3))];
        fork(m[0], m[1], -way, n - 3, w * 0.6);
      }
    };
    const forks = 6 + Math.floor(r() * 4);
    for (let f = 0; f < forks; f++) {
      const x = r() * S;
      fork(x, yAt(x), r() < 0.5 ? -1 : 1, 5 + Math.floor(r() * 6), 2.6);
    }
  }
  const mainPx = g.getImageData(0, 0, S, S).data;
  const main = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) main[i] = mainPx[i * 4] / 255;
  const webGlow = glowOf(web, S, 4, 6);
  const mainGlow = glowOf(main, S, 9, 13);
  const data = new Uint8Array(S * S * 4);
  for (let i = 0; i < S * S; i++) {
    data[i * 4] = Math.min(1, web[i]) * 255;
    data[i * 4 + 1] = Math.min(1, webGlow[i] * 2.6) * 255;
    data[i * 4 + 2] = main[i] * 255;
    data[i * 4 + 3] = Math.min(1, mainGlow[i] * 2.6) * 255;
  }
  return dataTexture(data, S);
};

/**
 * The relief of the bark (r = height): long plates of wood between deep furrows that join and part
 * as they climb, finer cracks across the plates, and a grain of fibres.
 */
const barkTexture = () => {
  const S = 512;
  const r = rng(977);
  const plates = voronoi(S, 3, 18, r);
  const cracks = voronoi(S, 9, 50, r);
  const grain = tileNoise(S, 9, 2.1, 2);
  const lump = tileNoise(S, 3, 8.4, 3);
  const data = new Uint8Array(S * S * 4);
  for (let i = 0; i < S * S; i++) {
    const plate = Math.pow(Math.min(1, plates[i] / 0.6), 0.85);
    const h = Math.max(0, Math.min(1, plate * (0.6 + 0.4 * lump[i]) * (0.86 + 0.14 * smooth01(cracks[i] / 0.4)) + (grain[i] - 0.5) * 0.1));
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = h * 255;
    data[i * 4 + 3] = 255;
  }
  return dataTexture(data, S);
};

/** Hanging moss: a few ragged wisps of different lengths, each tapering to a point. */
const mossTexture = () => {
  const W = 128, H = 512;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const r = rng(61);
  g.fillStyle = '#fff';
  g.strokeStyle = '#fff';
  g.lineCap = 'round';
  for (let k = 0; k < 6; k++) {
    const x0 = 12 + ((k + r() * 0.8) / 6) * (W - 24);
    const len = H * (0.25 + 0.72 * Math.pow(r(), 0.7));
    const w0 = 3 + r() * 5;
    const amp = 3 + r() * 7, f = 0.012 + r() * 0.02, ph = r() * 6.28;
    // the body of the wisp: a ragged shape that thins as it falls
    g.beginPath();
    const n = 30;
    const edge = (side) => {
      for (let s = 0; s <= n; s++) {
        const t = side > 0 ? s / n : 1 - s / n;
        const y = t * len;
        const w = w0 * Math.pow(1 - t, 0.75) * (0.7 + 0.6 * r());
        const x = x0 + amp * Math.sin(y * f + ph) * t + side * w;
        if (side > 0 && s === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
    };
    edge(1);
    edge(-1);
    g.closePath();
    g.fill();
    // a few loose threads beside it
    for (let m = 0; m < 3; m++) {
      const lx = x0 + (r() - 0.5) * w0 * 3.2, ll = len * (0.3 + 0.6 * r());
      g.lineWidth = 1.6 + r() * 1.6;
      g.beginPath();
      g.moveTo(lx, 0);
      g.quadraticCurveTo(lx + (r() - 0.5) * 12, ll * 0.5, lx + (r() - 0.5) * 10, ll);
      g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
};

/**
 * A spray of bare twigs, rooted at the middle of the bottom edge: the fine ends of the branches,
 * drawn once and hung on flat cards high in the canopy (where no one sees that they are flat).
 */
const sprayTexture = (seed) => {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const r = rng(seed);
  g.strokeStyle = '#fff';
  g.lineCap = g.lineJoin = 'round';
  const twig = (x, y, ang, len, w, depth) => {
    const n = Math.max(3, Math.round(len / 14));
    let curl = (r() - 0.5) * 0.22;
    const kids = [];
    for (let s = 0; s < n; s++) {
      const t = s / n;
      const nx = x + Math.cos(ang) * 14, ny = y - Math.sin(ang) * 14;
      g.lineWidth = Math.max(2.2, w * (1 - 0.6 * t));
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(nx, ny);
      g.stroke();
      x = nx;
      y = ny;
      // old twigs wander, and curl at the end
      ang += curl + (r() - 0.5) * 0.24 + (t > 0.7 ? curl * 3 : 0);
      if (r() < 0.06) curl = (r() - 0.5) * 0.3;
      if (depth > 0 && s > 1 && r() < 0.34) kids.push([x, y, ang + (r() < 0.5 ? -1 : 1) * (0.45 + r() * 0.7), len * (0.4 + r() * 0.35) * (1 - t * 0.5), w * 0.62]);
    }
    for (const k of kids) twig(k[0], k[1], k[2], k[3], k[4], depth - 1);
  };
  for (let k = 0; k < 3; k++) twig(S / 2 + (r() - 0.5) * 30, S - 4, Math.PI / 2 + (k - 1) * 0.55 + (r() - 0.5) * 0.3, 300 + r() * 120, 11, 3);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
};

/* ───────────────────────── geometry ───────────────────────── */

/**
 * A tube through `pts` with a radius at each point. `radial` sides; `around`: how many tiles of the
 * vein map go round it (a whole number); shape(a, i, len): multiplies the radius at angle a of ring i;
 * u0: where its uv starts along the wood (LIMB for limbs: the bark shader gives those no veins).
 * The frame is carried along the curve without twisting.
 */
const tube = (pts, rad, radial, around = 1, shape = null, u0 = 0) => {
  const n = pts.length;
  const ring = radial + 1;
  const pos = new Float32Array(n * ring * 3);
  const uv = new Float32Array(n * ring * 2);
  const T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3(), prevT = new THREE.Vector3();
  const q = new THREE.Quaternion();
  let len = 0;
  for (let i = 0; i < n; i++) {
    if (i === 0) T.subVectors(pts[1], pts[0]);
    else if (i === n - 1) T.subVectors(pts[i], pts[i - 1]);
    else T.subVectors(pts[i + 1], pts[i - 1]);
    T.normalize();
    if (i === 0) {
      N.copy(Math.abs(T.x) > 0.9 ? UP : XAXIS);
      N.addScaledVector(T, -N.dot(T)).normalize();
    } else {
      q.setFromUnitVectors(prevT, T);
      N.applyQuaternion(q);
      N.addScaledVector(T, -N.dot(T)).normalize();
      len += pts[i].distanceTo(pts[i - 1]);
    }
    B.crossVectors(T, N);
    prevT.copy(T);
    for (let j = 0; j <= radial; j++) {
      const a = ((j % radial) / radial) * Math.PI * 2;
      const k = rad[i] * (shape ? shape(a, i, len) : 1);
      const ca = Math.cos(a) * k, sa = Math.sin(a) * k;
      const o = (i * ring + j) * 3;
      pos[o] = pts[i].x + N.x * ca + B.x * sa;
      pos[o + 1] = pts[i].y + N.y * ca + B.y * sa;
      pos[o + 2] = pts[i].z + N.z * ca + B.z * sa;
      const w = (i * ring + j) * 2;
      uv[w] = u0 + len / TILE_U;
      uv[w + 1] = (j / radial) * around;
    }
  }
  const idx = new Uint32Array((n - 1) * radial * 6);
  let k = 0;
  for (let i = 0; i < n - 1; i++)
    for (let j = 0; j < radial; j++) {
      const a = i * ring + j, b = a + ring;
      idx[k++] = a;
      idx[k++] = a + 1;
      idx[k++] = b;
      idx[k++] = b;
      idx[k++] = a + 1;
      idx[k++] = b + 1;
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();
  // the seam's two columns of vertices share one normal
  const nn = geo.attributes.normal;
  for (let i = 0; i < n; i++) {
    const a = i * ring, b = a + radial;
    const x = nn.getX(a) + nn.getX(b), y = nn.getY(a) + nn.getY(b), z = nn.getZ(a) + nn.getZ(b);
    const l = Math.hypot(x, y, z) || 1;
    nn.setXYZ(a, x / l, y / l, z / l);
    nn.setXYZ(b, x / l, y / l, z / l);
  }
  return geo;
};

/** A smooth tube through a few control points, the radius set by taper(u). */
const curveTube = (ctrl, radius, taper, seg, radial, around = 1) => {
  const pts = new THREE.CatmullRomCurve3(ctrl).getPoints(seg);
  return tube(pts, pts.map((_, i) => radius * taper(i / seg)), radial, around);
};

/**
 * Grows a limb: from `start` along `dir` for `len` metres, bending as it goes (old wood never runs
 * straight: long slow bends, with shorter ones on top, and a curl toward the tip), drawn toward
 * `trop` if given, lifting at first and sagging toward its end. Returns its points and radii.
 */
const grow = (r, start, dir, len, r0, r1, o) => {
  const step = o.step;
  const n = Math.max(2, Math.round(len / step));
  const pts = [start.clone()], rad = [r0];
  const d = dir.clone().normalize();
  const ph = [r() * 6.28, r() * 6.28, r() * 6.28, r() * 6.28];
  const slow = o.slow ?? 1;
  const f1 = ((0.04 + r() * 0.04) * 6.28) / slow, f2 = ((0.13 + r() * 0.12) * 6.28) / slow;
  const ax1 = new THREE.Vector3(), ax2 = new THREE.Vector3();
  const p = start.clone();
  for (let i = 1; i <= n; i++) {
    const s = i * step, t = i / n;
    const w = o.wander * step * (1 + (o.curl ?? 0) * t * t * t);
    ax1.crossVectors(d, Math.abs(d.y) > 0.9 ? XAXIS : UP).normalize();
    ax2.crossVectors(d, ax1);
    d.applyAxisAngle(ax1, w * (Math.sin(s * f1 + ph[0]) + 0.6 * Math.sin(s * f2 + ph[1])));
    d.applyAxisAngle(ax2, w * (Math.cos(s * f1 + ph[2]) + 0.6 * Math.sin(s * f2 + ph[3])));
    if (o.trop) d.addScaledVector(o.trop, o.tropK * step);
    if (o.lift) d.y += o.lift * step * (1 - t);
    if (o.droop) d.y -= o.droop * step * t * t;
    // it never hangs lower than `floor` (so nothing crosses the channel at head height): it turns up again
    if (o.floor !== undefined && p.y + d.y * step * 3 < o.floor) d.y = Math.abs(d.y) * 0.6 + 0.25;
    d.normalize();
    p.addScaledVector(d, step);
    pts.push(p.clone());
    rad.push(r0 + (r1 - r0) * Math.pow(t, o.taper ?? 0.8));
  }
  return { pts, rad };
};

/** A direction that leaves `tangent` at about `angle` radians, preferring to climb. */
const forkDir = (r, tangent, angle, climb = 0.5) => {
  let best = null;
  for (let k = 0; k < 3; k++) {
    const any = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5);
    const perp = any.addScaledVector(tangent, -any.dot(tangent)).normalize();
    const d = tangent.clone().applyAxisAngle(perp, angle);
    if (!best || d.y * climb + r() * 0.4 > best.s) best = { d, s: d.y * climb + r() * 0.4 };
  }
  return best.d;
};

/** A boulder: a ball pushed about by noise and cut by a few flat breaks. */
const rockGeometry = (seed, sx, sy, sz, detail = 12) => {
  const geo = new THREE.SphereGeometry(1, detail, Math.round(detail * 0.7));
  const pp = geo.attributes.position;
  const r = rng(Math.floor(seed * 7919) + 3);
  const cuts = [];
  for (let k = 0; k < 4; k++) {
    const n = new THREE.Vector3(r() - 0.5, r() * 0.9 - 0.2, r() - 0.5).normalize();
    cuts.push([n, 0.62 + r() * 0.3]);
  }
  const v = new THREE.Vector3();
  for (let i = 0; i < pp.count; i++) {
    v.fromBufferAttribute(pp, i).normalize();
    const k = 1 + (fbm(v.x * 1.5 + seed, v.y * 1.5 + v.z * 1.9 + seed * 0.7, 3) - 0.5) * 0.75 + (noise2(v.x * 4.1 + v.z * 2.3 + seed, v.y * 3.7 - seed) - 0.5) * 0.22;
    v.multiplyScalar(k);
    for (const [n, d] of cuts) {
      const over = v.dot(n) - d;
      if (over > 0) v.addScaledVector(n, -over * 0.92);
    }
    pp.setXYZ(i, v.x * sx, v.y * sy, v.z * sz);
  }
  geo.computeVertexNormals();
  return geo;
};

/* ───────────────────────── materials ───────────────────────── */

/** The small lamps on the rocks, as lights for the forest's own materials (cheaper than eight real lamps for the whole world). */
const lampUniforms = {
  fLampPos: { value: Array.from({ length: LAMPS }, () => new THREE.Vector3(0, -100, 0)) },
  fLampPow: { value: new Array(LAMPS).fill(0) },
  fLampCol: { value: new THREE.Color(1.0, 0.5, 0.17) },
};
const addLamps = (sh) => {
  Object.assign(sh.uniforms, lampUniforms);
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', `#include <common>\nuniform vec3 fLampPos[${LAMPS}]; uniform float fLampPow[${LAMPS}]; uniform vec3 fLampCol;`)
    .replace(
      '#include <lights_fragment_end>',
      `#include <lights_fragment_end>
      #ifdef USE_FOG
      {
        vec3 lampN = inverseTransformDirection(geometryNormal, viewMatrix);
        for (int i = 0; i < ${LAMPS}; i++) {
          vec3 toL = fLampPos[i] - vFogWorld;
          float d2 = dot(toL, toL);
          float lit = clamp((dot(lampN, toL * inversesqrt(d2)) + 0.4) / 1.4, 0.0, 1.0);
          reflectedLight.directDiffuse += material.diffuseColor * fLampCol * (fLampPow[i] * lit / (1.0 + d2 * 0.3));
        }
      }
      #endif`,
    );
};

/**
 * Bark for the whole forest: black, wet plates of wood between deep furrows, moss on what faces the
 * sky. Light lives in it: a web of hairline veins that climbs a few metres from the roots, in patches,
 * and a few brighter veins that climb higher; they pulse with the tree's breath, a wave that runs out
 * from the root tree. `power` scales the veins (the root gates carry only a little).
 */
const forestBark = (shared, power, key) => {
  // (no normal map: three ignores a bump map when one is set, and the plates are the bark)
  const bark = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0.02 });
  bark.bumpMap = shared.ridges;
  bark.bumpScale = 3.4;
  const veinPower = { value: power };
  bark.userData.veinPower = veinPower;
  bark.userData.veinBase = power;
  bark.onBeforeCompile = (sh) => {
    sh.uniforms.breath = shared.breath;
    sh.uniforms.veins = shared.veins;
    sh.uniforms.barkTime = shared.time;
    sh.uniforms.veinPower = veinPower;
    sh.uniforms.treeAt = { value: shared.centre };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec2 vCu; varying vec3 vNw;')
      .replace('#include <project_vertex>', '#include <project_vertex>\n vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;\n vCu = uv;\n vNw = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vWP; varying vec2 vCu; varying vec3 vNw; uniform float breath; uniform float barkTime; uniform float veinPower; uniform vec3 treeAt; uniform sampler2D veins;
        ${NOISE3}
        float glowCrack; float wetBark;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        {
          // wood: dull grey-green on the plates, black in the furrows, a grain along the fibres
          float ridgeH = texture2D(bumpMap, vBumpMapUv).x;
          float fibre = mn(vWP * vec3(5.0, 0.6, 5.0));
          vec3 wood = mix(vec3(0.004, 0.006, 0.005), vec3(0.07, 0.075, 0.062), smoothstep(0.2, 0.9, ridgeH) * (0.45 + 0.55 * fibre));
          // moss and lichen where the wood faces the sky, in patches
          float up = smoothstep(0.2, 0.8, vNw.y);
          float mossy = up * smoothstep(0.36, 0.6, mn(vWP * 0.6 + 11.0));
          wood = mix(wood, vec3(0.016, 0.046, 0.026) * (0.6 + 0.8 * fibre), mossy * 0.85);
          // wet and dark near the water
          wetBark = 1.0 - smoothstep(0.0, 1.8, vWP.y);
          wood *= 1.0 - 0.4 * wetBark;
          diffuseColor.rgb = wood;
          glowCrack = 0.0;
          // the veins: a web low on the wood, in patches; main veins that climb higher; all brightest at the foot
          // (nothing of them above 9 m, nor on the limbs, whose uv starts at 1000: the canopy skips the work)
          if (vWP.y < 9.0 && vCu.x < 500.0) {
            // (the map is looked up a little off true, by a slow noise, so no line runs ruler-straight)
            vec2 vuv = vCu + (vec2(mn(vWP * 1.5), mn(vWP * 1.5 + 7.0)) - 0.5) * 0.13;
            vec4 vt = texture2D(veins, vuv);
            float fine = texture2D(veins, vuv * 2.7 + vec2(0.31, 0.17)).r;
            float far = length(vWP.xz - treeAt.xz);
            float top = 3.6 + 4.4 * mn(vec3(vWP.xz * 0.13, 3.0));
            float webMask = 1.0 - smoothstep(top * 0.4, top, vWP.y);
            float fineMask = 1.0 - smoothstep(0.2, top * 0.4, vWP.y);
            float mainMask = 1.0 - smoothstep(top * 0.5, top * 0.95, vWP.y);
            float patchy = 0.25 + 0.75 * smoothstep(0.34, 0.6, mn(vWP * vec3(0.45, 0.25, 0.45) + 3.0));
            float foot = 1.0 + 1.3 * (1.0 - smoothstep(0.0, 1.4, vWP.y));
            float wave = 0.72 + 0.28 * sin(far * 0.16 - barkTime * 0.9);
            float webA = webMask * patchy, mainA = mainMask * (0.4 + 0.6 * patchy);
            float core = vt.r * webA + fine * 0.3 * fineMask * patchy + vt.b * 1.15 * mainA;
            float halo = vt.g * webA * 0.12 + vt.a * mainA * 0.26;
            glowCrack = (core + halo) * foot * wave;
            diffuseColor.rgb *= 1.0 - 0.6 * clamp(core, 0.0, 1.0);
          }
        }`,
      )
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, 0.4, wetBark * 0.8);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vec3(0.13, 1.0, 0.72) * glowCrack * (0.75 + 0.5 * breath) * veinPower;');
    addLamps(sh);
  };
  bark.customProgramCacheKey = () => 'forest-bark-v13';
  return bark;
};

/** The banks and the rocks: dark wet stone and earth, mossed over on top. */
const forestGround = (stoneMaterial, normalMap) => {
  const opts = { scale: 0.42, bump: 0.06, contrast: 1 };
  const m = stoneMaterial(normalMap, 0x4a544e, 10, opts);
  m.roughness = 0.9;
  m.onBeforeCompile = (sh) => {
    applyStone(sh, opts);
    sh.fragmentShader = sh.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      {
        float gUp = smoothstep(0.3, 0.85, vStoneN.y);
        float gN = texture2D(stoneMap, vStoneP.xz * 0.045).r * 0.65 + texture2D(stoneMap, vStoneP.xz * 0.21 + 0.37).r * 0.35;
        float gMoss = gUp * smoothstep(0.36, 0.56, gN);
        diffuseColor.rgb = mix(diffuseColor.rgb * vec3(0.72, 0.8, 0.74), vec3(0.028, 0.075, 0.04), gMoss * 0.85);
        // wet and dark at the waterline
        diffuseColor.rgb *= 0.45 + 0.55 * smoothstep(-0.05, 0.6, vStoneP.y);
      }`,
    );
    addLamps(sh);
  };
  m.customProgramCacheKey = () => 'forest-ground-v2';
  return m;
};

/* ───────────────────────── the forest ───────────────────────── */

export const buildTree = ({ scene, pos, glowTex, stoneMaterial, normalMap, updaters, colliders, hush = { value: 1 } }) => {
  const g = new THREE.Group();
  g.position.copy(pos);
  const r = rng(23);
  const shared = { breath: { value: 0.5 }, time: { value: 0 }, veins: { value: veinTexture() }, ridges: barkTexture(), centre: pos };
  const bark = forestBark(shared, 0.75, 'tree');
  const geos = [];
  // The channel runs from the tree out to the plain: `out` along it, `across` to its right as you leave.
  // It runs almost due south. (It used to aim at the player's starting point, which laid its west bank
  // across the lotus avenue's outer towers and its mouth across the sleepers' outer circles.)
  const out = new THREE.Vector3(6, 0, 184).normalize();
  const across = new THREE.Vector3().crossVectors(UP, out);
  const pathA = Math.atan2(out.x, out.z);
  /** A point given along the channel (metres from the tree) and across it, in the group's own space. */
  const at = (along, off, y = 0) => new THREE.Vector3().addScaledVector(out, along).addScaledVector(across, off).setY(y);

  /* ── the lie of the land: water in the channel and round the root tree, low banks under the trees ── */
  const chanW = (a) => 5.2 + 0.8 * Math.sin(a * 0.21 + 1.3) + 0.45 * Math.sin(a * 0.47 + 0.4) + Math.max(0, a - 84) * 0.4; // half-width of the water
  const mounds = []; // [along, across, height, radius]: the ground heaped at the feet of the great trees
  const landAt = (a, o) => {
    const ao = Math.abs(o), d = Math.hypot(a, o);
    const ringLand = 1 - smooth01((d - 48) / 12);
    const corridor = a > 0 ? (1 - smooth01((ao - 30) / 12)) * (1 - smooth01((a - 87) / 9)) : 0;
    let L = Math.max(ringLand, corridor);
    if (a > 0) L *= smooth01((ao - chanW(a) + 1.2) / 2.4);
    // (no ground under the lotus avenue's towers, to the west)
    const xw = pos.x + out.x * a + across.x * o, zw = pos.z + out.z * a + across.z * o;
    L *= Math.max(smooth01((xw - 48) / 7), smooth01((zw + 88) / 8));
    return L * smooth01((d - 15.5) / 3.5);
  };
  /** Whether a tree may stand here: not among the lotus avenue's towers. */
  const clearOfAvenue = (a, o) => pos.x + out.x * a + across.x * o > 52 || pos.z + out.z * a + across.z * o > -84;
  const groundLocal = (a, o) => {
    const L = landAt(a, o);
    if (L <= 0) return -0.6;
    let h = -0.6 + L * (1.25 + 0.7 * (fbm(a * 0.13 + 4, o * 0.13 + 9, 3) - 0.5));
    for (const [ma, mo, mh, mr] of mounds) {
      const d2 = (a - ma) * (a - ma) + (o - mo) * (o - mo);
      if (d2 < mr * mr * 6) h += mh * Math.exp(-d2 / (mr * mr)) * L;
    }
    return h;
  };

  /* ── where the trees stand ── */
  const heroes = [];
  for (const a0 of [20, 32, 44, 56, 68, 80, 91]) {
    for (const side of [-1, 1]) {
      const a = a0 + (r() - 0.5) * 2.4;
      heroes.push({ a, o: side * (8.9 + r() * 1.2), side, H: 16 + r() * 6, lean: 3 + r() * 2.5, rb: 1.5 + r() * 0.6 });
    }
  }
  for (const T of heroes) mounds.push([T.a, T.o, 0.55, 3.8]);
  let backs = [];
  for (const side of [-1, 1]) {
    for (let a = 13 + r() * 4; a < 97; a += 8 + r() * 3.5) backs.push({ a, o: side * (18.5 + r() * 6), H: 14 + r() * 7, rb: 0.95 + r() * 0.5 });
    for (let a = 16 + r() * 6; a < 94; a += 11 + r() * 6) backs.push({ a, o: side * (29 + r() * 9), H: 13 + r() * 8, rb: 0.85 + r() * 0.5 });
  }
  // and a looser ring all round the root tree, so it stands in a wood
  for (let i = 0; i < 30; i++) {
    const ang = r() * Math.PI * 2;
    if (Math.abs(((ang - pathA + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.75) continue;
    const d = 27 + r() * 30;
    const p = new THREE.Vector3(Math.sin(ang) * d, 0, Math.cos(ang) * d);
    backs.push({ a: p.dot(out), o: p.dot(across), H: 14 + r() * 9, rb: 0.95 + r() * 0.6 });
  }

  backs = backs.filter((T) => clearOfAvenue(T.a, T.o));

  const mossPts = []; // [x, y, z, length]: where moss hangs
  const sprays = []; // [x, y, z, yaw, size]: where a spray of twigs grows
  const hang = (L, from, chance) => {
    for (let i = from; i < L.pts.length; i += 2) {
      const p = L.pts[i];
      if (p.y < 5 || r() > chance) continue;
      mossPts.push([p.x, p.y - L.rad[i] * 0.6, p.z, Math.min(p.y - 2.6, 0.8 + r() * r() * 3.6)]);
    }
  };
  const tangentAt = (L, i) => new THREE.Vector3().subVectors(L.pts[Math.min(L.pts.length - 1, i + 1)], L.pts[Math.max(0, i - 1)]).normalize();
  /** Sprays of twigs along a limb, from `from` (0..1) to its tip. */
  const spray = (L, count, from, size) => {
    for (let k = 0; k < count; k++) {
      const i = Math.min(L.pts.length - 1, Math.round((from + (1 - from) * (count > 1 ? k / (count - 1) : 1)) * (L.pts.length - 1)));
      const p = L.pts[i];
      if (p.y < 6) continue;
      const tg = tangentAt(L, i);
      sprays.push([p.x, p.y, p.z, Math.atan2(tg.x, tg.z) + Math.PI / 2 + (r() - 0.5) * 1.6, size * (0.75 + r() * 0.5)]);
    }
  };
  /* ── the great trees of the banks ── */
  for (const T of heroes) {
    const base = at(T.a, T.o, groundLocal(T.a, T.o));
    const leanDir = across.clone().multiplyScalar(-T.side).addScaledVector(out, (r() - 0.5) * 0.5).normalize();
    const N = Math.round(T.H / 0.45);
    const w1 = r() * 6.28, w2 = r() * 6.28, w3 = r() * 6.28;
    const pts = [], rad = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, y = t * T.H;
      const p = base.clone();
      p.y += y - 1.3; // it starts under the ground
      p.addScaledVector(leanDir, T.lean * Math.pow(t, 1.5));
      // the bends of an old trunk: a long S, and a shorter twist on top of it
      p.x += Math.sin(t * 5.2 + w1) * 1.25 * t + Math.sin(t * 13 + w3) * 0.3 * t;
      p.z += Math.cos(t * 4.1 + w2) * 1.25 * t + Math.cos(t * 11 + w3) * 0.3 * t;
      pts.push(p);
      rad.push(T.rb * (1 + 1.2 * Math.exp(-y / 1.6)) * (1 - 0.74 * Math.pow(t, 0.9)));
    }
    const lobes = 4 + Math.floor(r() * 3), lph = r() * 6.28, tw = (r() - 0.5) * 1.6;
    const shape = (a, i) => {
      const y = (i / N) * T.H;
      const butt = Math.exp(-y / 2.2); // the buttresses die out by five or six metres up
      const fin = Math.pow(0.5 + 0.5 * Math.cos(a * lobes + lph + y * 0.3 + 0.8 * Math.sin(a * 2 + lph)), 1.4);
      // the rope-like twist of the wood, all the way up
      const rope = Math.sin(a * 7 + y * tw + lph) * 0.07 + Math.sin(a * 15 - y * tw * 1.6 + lph * 2) * 0.03;
      const lump = (noise2(Math.cos(a) * 1.3 + lph, Math.sin(a) * 1.3 + y * 0.5) - 0.5) * 0.34;
      return 1 + butt * (fin * 0.62 - 0.16) + rope + lump * (1 - 0.5 * butt);
    };
    geos.push(tube(pts, rad, 24, Math.max(2, Math.round((2 * Math.PI * T.rb * 1.7) / TILE_V)), shape));
    const wp = base.clone().add(pos);
    colliders.push({ x: wp.x, z: wp.z, r: T.rb * 1.7 });
    // roots: they leave the flare, run over the bank and go under, some into the water
    const nr = 6 + Math.floor(r() * 3);
    for (let k = 0; k < nr; k++) {
      const a = (k / nr) * Math.PI * 2 + r() * 0.7;
      const dirH = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
      const len = 2.6 + r() * 3.4;
      const bend = (r() - 0.5) * 2.4, ph = r() * 6.28;
      const rp = [];
      for (let m = 0; m <= 6; m++) {
        const u = m / 6;
        const d = T.rb * 1.05 + u * len;
        const p = base.clone().addScaledVector(dirH, d).addScaledVector(new THREE.Vector3(dirH.z, 0, -dirH.x), Math.sin(u * Math.PI) * bend + Math.sin(u * 7 + ph) * 0.35 * u);
        p.y = Math.max(groundLocal(p.dot(out), p.dot(across)), -0.15) + 1.9 * Math.pow(1 - u, 2.4) + 0.2 * Math.sin(u * Math.PI) - u * u * 0.75 - 0.1;
        rp.push(p);
      }
      geos.push(curveTube(rp, 0.55 + r() * 0.3, (u) => 1 - u * 0.8, 16, 8, 1));
    }
    // limbs: the first reach over the water toward the far bank; the rest go where they will
    const nl = 5 + Math.floor(r() * 2);
    for (let b = 0; b < nl; b++) {
      const t0 = 0.34 + (b / nl) * 0.5 + r() * 0.05;
      const i0 = Math.round(t0 * N);
      const over = b < 3 || r() < 0.3;
      const az = Math.atan2(leanDir.x, leanDir.z) + (over ? (b - 1) * 0.55 + (r() - 0.5) * 0.5 : Math.PI * (0.55 + r() * 0.9));
      const elev = 0.15 + r() * 0.5;
      const dir = new THREE.Vector3(Math.sin(az) * Math.cos(elev), Math.sin(elev), Math.cos(az) * Math.cos(elev));
      const len = (over ? 12 + r() * 7 : 7 + r() * 6) * (1 - (t0 - 0.34) * 0.45);
      const r0 = rad[i0] * 0.7;
      const L = grow(r, pts[i0], dir, len, r0, 0.1, { step: 0.7, wander: 0.24, curl: 1.2, trop: over ? leanDir : null, tropK: 0.04, lift: 0.05, droop: 0.12, floor: 4.6 });
      geos.push(tube(L.pts, L.rad, r0 > 0.45 ? 10 : 8, Math.max(1, Math.round((2 * Math.PI * r0) / TILE_V)), (a, i) => 1 + Math.sin(a * 5 + i * 0.5) * 0.06, LIMB));
      hang(L, 3, over ? 0.42 : 0.25);
      spray(L, 3, 0.45, 6.5);
      const ns = 3 + Math.floor(r() * 3);
      for (let s = 0; s < ns; s++) {
        const i = Math.min(L.pts.length - 2, Math.floor((0.25 + 0.7 * r()) * L.pts.length));
        const S2 = grow(r, L.pts[i], forkDir(r, tangentAt(L, i), 0.6 + r() * 0.7), 4 + r() * 4.5, L.rad[i] * 0.62, 0.035, { step: 0.6, wander: 0.36, curl: 2, lift: 0.04, droop: 0.18, floor: 4.2 });
        geos.push(tube(S2.pts, S2.rad, 6, 1, null, LIMB));
        hang(S2, 2, 0.3);
        spray(S2, 2, 0.6, 4.5);
      }
    }
    // the crown: the trunk's top breaks into a few thin leaders
    const top = { pts, rad };
    for (let k = 0; k < 3; k++) {
      const i = N - 1 - k * 3;
      const C = grow(r, pts[i], forkDir(r, tangentAt(top, i), 0.35 + r() * 0.5, 1), 4 + r() * 4, rad[i] * 0.7, 0.03, { step: 0.6, wander: 0.3, curl: 2, droop: 0.12 });
      geos.push(tube(C.pts, C.rad, 6, 1, null, LIMB));
      spray(C, 2, 0.5, 5);
    }
  }

  /* ── the trees behind them: simpler, fainter in the mist ── */
  for (const T of backs) {
    const base = at(T.a, T.o, Math.max(groundLocal(T.a, T.o), -0.2));
    const leanDir = new THREE.Vector3(r() - 0.5, 0, r() - 0.5).normalize();
    const N = Math.round(T.H / 0.7);
    const w1 = r() * 6.28, w2 = r() * 6.28, lean = 1 + r() * 3.5;
    const pts = [], rad = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, y = t * T.H;
      const p = base.clone();
      p.y += y - 1;
      p.addScaledVector(leanDir, lean * Math.pow(t, 1.6));
      p.x += Math.sin(t * 4.6 + w1) * 1.2 * t;
      p.z += Math.cos(t * 3.7 + w2) * 1.2 * t;
      pts.push(p);
      rad.push(T.rb * (1 + 1.1 * Math.exp(-y / 1.4)) * (1 - 0.78 * Math.pow(t, 0.9)));
    }
    const lph = r() * 6.28;
    geos.push(tube(pts, rad, 12, Math.max(1, Math.round((2 * Math.PI * T.rb) / TILE_V)), (a, i) => 1 + Math.exp(-((i / N) * T.H) / 1.8) * (Math.pow(0.5 + 0.5 * Math.cos(a * 5 + lph), 1.4) * 0.55 - 0.14) + Math.sin(a * 7 + i * 0.35 + lph) * 0.07));
    const wp = base.clone().add(pos);
    colliders.push({ x: wp.x, z: wp.z, r: T.rb * 1.6 });
    for (let k = 0; k < 3; k++) {
      const a = r() * Math.PI * 2;
      const rp = [];
      for (let m = 0; m <= 4; m++) {
        const u = m / 4;
        rp.push(base.clone().add(new THREE.Vector3(Math.sin(a) * (T.rb + u * 4.5), 1.4 * Math.pow(1 - u, 2) - 0.25 - u * 0.4, Math.cos(a) * (T.rb + u * 4.5))));
      }
      geos.push(curveTube(rp, T.rb * 0.42, (u) => 1 - u * 0.85, 8, 6, 1));
    }
    const nl = 4 + Math.floor(r() * 2);
    for (let b = 0; b < nl; b++) {
      const i0 = Math.round((0.36 + (b / nl) * 0.54) * N);
      const az = r() * Math.PI * 2, elev = 0.15 + r() * 0.55;
      const dir = new THREE.Vector3(Math.sin(az) * Math.cos(elev), Math.sin(elev), Math.cos(az) * Math.cos(elev));
      const L = grow(r, pts[i0], dir, 7 + r() * 8, rad[i0] * 0.7, 0.06, { step: 0.85, wander: 0.26, curl: 1.5, lift: 0.04, droop: 0.12, floor: 4 });
      geos.push(tube(L.pts, L.rad, 7, 1, null, LIMB));
      if (Math.abs(T.o) < 28) hang(L, 3, 0.3);
      spray(L, 3, 0.4, 6);
      for (let s = 0; s < 2; s++) {
        const i = Math.min(L.pts.length - 2, Math.floor((0.3 + 0.65 * r()) * L.pts.length));
        const S2 = grow(r, L.pts[i], forkDir(r, tangentAt(L, i), 0.6 + r() * 0.7), 3 + r() * 4, L.rad[i] * 0.6, 0.025, { step: 0.75, wander: 0.38, curl: 2, droop: 0.18, floor: 3.6 });
        geos.push(tube(S2.pts, S2.rad, 5, 1, null, LIMB));
        spray(S2, 1, 1, 4.5);
      }
    }
  }

  /* ── the root tree itself: flared buttresses, twisting ridges, a hollow broken crown ── */
  const H = 46;
  {
    const trunkGeo = new THREE.CylinderGeometry(1, 1, 1, 96, 72, true);
    const pp = trunkGeo.attributes.position;
    for (let i = 0; i < pp.count; i++) {
      const a = Math.atan2(pp.getX(i), pp.getZ(i));
      // more rows of the mesh low on the trunk, where the buttresses flare and you stand
      const h = Math.pow(pp.getY(i) + 0.5, 1.6);
      const ca = Math.cos(a), sa = Math.sin(a);
      let R = 3.9 + 6.2 * Math.exp(-h * 7.0) + 1.4 * (1 - h);
      // the hollow: a deep niche in the foot of the trunk, facing the channel
      let da = a - pathA;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      const niche = Math.exp(-Math.pow(da / 0.4, 2)) * (1 - smooth01((h - 0.13) / 0.09));
      const twist = a * 9 + h * 2.6 + fbm(ca * 1.5 + 3, sa * 1.5 + h * 2.2, 3) * 5;
      R *= 1 + (0.22 * Math.sin(twist) * (1 - h * 0.45) + (fbm(ca * 3.1 + 7, sa * 3.1 + h * 8, 4) - 0.5) * 0.4) * (1 - niche);
      R *= 1 - 0.3 * niche;
      let y = h * H;
      if (h > 0.8) {
        const k = (h - 0.8) / 0.2;
        const spike = Math.pow(noise2(ca * 2.4 + 5, sa * 2.4 + 1.3), 2);
        y += k * k * spike * 20 - k * 3;
        R *= 1 - k * 0.5 * (1 - spike * 0.6);
      }
      pp.setXYZ(i, sa * R + h * h * 3.2, y - 0.8, ca * R - h * h * 1.2);
    }
    trunkGeo.computeVertexNormals();
    const uv = trunkGeo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (Math.pow(uv.getY(i), 1.6) * H) / TILE_U, uv.getX(i) * 10);
    geos.push(trunkGeo);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + r() * 0.3;
      // keep the roots off the channel, so you can walk up to the hollow
      if (Math.abs(((a - pathA + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.5) continue;
      const len = 10 + r() * 11, h0 = 5 + r() * 4, lift = 0.8 + r() * 1.6;
      const w1 = r() * 6.28, w2 = r() * 6.28, sway = 0.1 + r() * 0.1;
      const rp = [];
      for (let k = 0; k <= 8; k++) {
        const u = k / 8;
        // they snake from side to side as they go, and rise once or twice before they sink
        const side = (Math.sin(u * Math.PI * 1.6 + w1) * sway + Math.sin(u * Math.PI * 4.1 + w2) * 0.035) * len * u;
        const d = 3 + u * len;
        rp.push(new THREE.Vector3(Math.sin(a) * d + Math.cos(a) * side, h0 * Math.pow(1 - u, 1.9) + Math.sin(u * Math.PI) * lift + Math.sin(u * 9 + w2) * 0.25 * u - u * 1.5 - 0.3, Math.cos(a) * d - Math.sin(a) * side));
      }
      const rr = 1.15 + r() * 0.6;
      const cp = new THREE.CatmullRomCurve3(rp).getPoints(44);
      const lph = r() * 6.28;
      geos.push(
        tube(
          cp,
          cp.map((_, k) => rr * (0.12 + 0.88 * Math.pow(1 - k / 44, 0.8))),
          12,
          Math.max(1, Math.round((2 * Math.PI * rr * 0.7) / TILE_V)),
          (ang, k) => 1 + 0.16 * Math.sin(ang * 3 + k * 0.35 + lph) + (noise2(Math.cos(ang) * 1.4 + lph, Math.sin(ang) * 1.4 + k * 0.3) - 0.5) * 0.4,
        ),
      );
    }
  }
  const forest = new THREE.Mesh(mergeGeos(geos), bark);
  forest.userData.noShadow = true; // the mist hides the moon in here
  g.add(forest);
  {
    // The bark's shader is costly and the wood hides itself many times over (limb behind limb behind
    // trunk). A plain copy that writes only depth is drawn first; after it the bark is shaded once
    // for each pixel, on the surface that shows. (Measured: the forest drew a third faster.)
    const pre = new THREE.Mesh(forest.geometry, new THREE.MeshBasicMaterial({ colorWrite: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2 }));
    pre.renderOrder = -1;
    pre.userData.noShadow = true;
    g.add(pre);
  }

  /* ── the fine ends of the branches: sprays of twigs on flat cards, high in the canopy ── */
  {
    const card = new THREE.PlaneGeometry(1, 1);
    card.translate(0, 0.5, 0); // rooted at the middle of its bottom edge
    const d = new THREE.Object3D();
    d.rotation.order = 'YXZ';
    for (let v = 0; v < 2; v++) {
      const mine = sprays.filter((_, i) => i % 2 === v);
      const mat = new THREE.MeshBasicMaterial({ map: sprayTexture(71 + v * 13), color: 0x040a08, alphaTest: 0.4, side: THREE.DoubleSide });
      const mesh = new THREE.InstancedMesh(card, mat, mine.length);
      mine.forEach(([x, y, z, yaw, size], i) => {
        d.position.set(x, y, z);
        d.rotation.set((r() - 0.5) * 0.9, yaw, (r() - 0.5) * 1.3);
        d.scale.set(size * (r() < 0.5 ? -1 : 1), size, 1);
        d.updateMatrix();
        mesh.setMatrixAt(i, d.matrix);
      });
      mesh.frustumCulled = false;
      mesh.userData.noShadow = true;
      g.add(mesh);
    }
  }

  /* ── the banks and their rocks ── */
  const lamps = []; // { p: Vector3 (group space), seed }
  const ground = forestGround(stoneMaterial, normalMap);
  {
    const parts = [];
    // the banks: a grid over the whole wood, the cells that lie wholly under water left out
    const CELL = 1.25, A0 = -62, A1 = 100, O0 = -62, O1 = 62;
    const na = Math.round((A1 - A0) / CELL), no = Math.round((O1 - O0) / CELL);
    const hgt = new Float32Array((na + 1) * (no + 1));
    const bp = new Float32Array((na + 1) * (no + 1) * 3), buv = new Float32Array((na + 1) * (no + 1) * 2);
    for (let i = 0; i <= na; i++)
      for (let j = 0; j <= no; j++) {
        const a = A0 + i * CELL, o = O0 + j * CELL;
        const k = i * (no + 1) + j;
        const h = groundLocal(a, o);
        hgt[k] = h;
        const p = at(a, o, h);
        bp.set([p.x, p.y, p.z], k * 3);
        buv.set([a * 0.1, o * 0.1], k * 2);
      }
    const bi = [];
    for (let i = 0; i < na; i++)
      for (let j = 0; j < no; j++) {
        const k = i * (no + 1) + j;
        if (Math.max(hgt[k], hgt[k + 1], hgt[k + no + 1], hgt[k + no + 2]) < -0.3) continue;
        bi.push(k, k + 1, k + no + 1, k + no + 1, k + 1, k + no + 2);
      }
    const bank = new THREE.BufferGeometry();
    bank.setAttribute('position', new THREE.BufferAttribute(bp, 3));
    bank.setAttribute('uv', new THREE.BufferAttribute(buv, 2));
    bank.setIndex(bi);
    bank.computeVertexNormals();
    parts.push(bank);
    const rock = (a, o, size, sink = 0.35, flat = 0.62) => {
      const s = size * (0.75 + r() * 0.5);
      const geo = rockGeometry(r() * 100, s * (0.8 + r() * 0.5), s * flat * (0.8 + r() * 0.5), s * (0.8 + r() * 0.5), size > 0.9 ? 14 : 10);
      geo.rotateY(r() * Math.PI * 2);
      const y = Math.max(groundLocal(a, o), -0.25) + s * flat * (0.5 - sink);
      const p = at(a, o, y);
      // its top, near the middle (for whatever stands on it)
      const gp = geo.attributes.position;
      let top = -9;
      for (let i = 0; i < gp.count; i++) if (Math.hypot(gp.getX(i), gp.getZ(i)) < 0.25 * s) top = Math.max(top, gp.getY(i));
      geo.translate(p.x, p.y, p.z);
      parts.push(geo);
      return { p, top: y + top, s };
    };
    // along the water's edge on both banks
    for (const side of [-1, 1])
      for (let a = 11; a < 97; a += 1.4 + r() * 1.9) {
        if (r() < 0.2) continue;
        const big = r() < 0.25;
        const R = rock(a, side * (chanW(a) + (r() - 0.35) * 1.7), big ? 0.75 + r() * 0.5 : 0.3 + r() * 0.45);
        if (big && R.s > 0.95) {
          const wp = R.p.clone().add(pos);
          colliders.push({ x: wp.x, z: wp.z, r: R.s * 0.8 });
        }
      }
    // heaped at the feet of the great trees, and scattered over the banks
    for (const T of heroes) for (let k = 0; k < 5; k++) rock(T.a + (r() - 0.5) * 8, T.o + (r() - 0.5) * 6 - T.side * 1.6, 0.4 + r() * 0.9);
    for (let k = 0; k < 110; k++) {
      const a = r() * 96, o = (r() < 0.5 ? -1 : 1) * (7 + r() * 28);
      if (landAt(a, o) > 0.6) rock(a, o, 0.25 + r() * r() * 1.1, 0.45);
    }
    // round the pool at the root tree's foot
    for (let k = 0; k < 26; k++) {
      const ang = r() * Math.PI * 2, d = 17 + r() * 3.5;
      const p = new THREE.Vector3(Math.sin(ang) * d, 0, Math.cos(ang) * d);
      const a = p.dot(out), o = p.dot(across);
      if (a > 6 && Math.abs(o) < chanW(a) + 1) continue;
      rock(a, o, 0.4 + r() * 0.9);
    }
    // the lamps' own rocks: flat-topped, at the water's edge
    for (const [a, side] of [[23.5, -1], [21.5, 1], [45, 1], [57.5, -1], [70.5, 1], [83, -1], [92.5, 1]]) {
      const o = side * (chanW(a) + 0.15);
      const R = rock(a, o, 1.0, 0.3, 0.55);
      lamps.push({ p: at(a, o, R.top), seed: r() });
    }
    const land = new THREE.Mesh(mergeGeos(parts), ground);
    land.userData.noShadow = true;
    g.add(land);
  }

  /* ── the lamps on the rocks ── */
  const lampGlows = [];
  {
    const frame = [], glass = [];
    const box = (list, w, h, d, x, y, z) => {
      const b = new THREE.BoxGeometry(w, h, d);
      b.translate(x, y, z);
      list.push(b);
    };
    for (const L of lamps) {
      const { x, y, z } = L.p;
      const base = new THREE.CylinderGeometry(0.1, 0.12, 0.04, 8);
      base.translate(x, y + 0.02, z);
      frame.push(base);
      for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box(frame, 0.016, 0.26, 0.016, x + dx * 0.075, y + 0.17, z + dz * 0.075);
      const cap = new THREE.ConeGeometry(0.14, 0.1, 4);
      cap.rotateY(Math.PI / 4);
      cap.translate(x, y + 0.35, z);
      frame.push(cap);
      const ring = new THREE.TorusGeometry(0.045, 0.008, 5, 12);
      ring.translate(x, y + 0.44, z);
      frame.push(ring);
      box(glass, 0.13, 0.24, 0.13, x, y + 0.17, z);
    }
    const frameMesh = new THREE.Mesh(mergeGeos(frame), new THREE.MeshStandardMaterial({ color: 0x4a3826, metalness: 0.6, roughness: 0.5 }));
    frameMesh.userData.noShadow = true;
    g.add(frameMesh);
    g.add(new THREE.Mesh(mergeGeos(glass), new THREE.MeshBasicMaterial({ color: hdr(1.0, 0.6, 0.24, 2.0), fog: false })));
    lamps.forEach((L, i) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: hdr(1.0, 0.56, 0.2, 1.0), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      s.position.copy(L.p).setY(L.p.y + 0.2);
      s.scale.setScalar(0.95);
      g.add(s);
      lampGlows.push(s);
      lampUniforms.fLampPos.value[i].copy(L.p).add(pos).setY(L.p.y + 0.25);
    });
  }

  /* ── hanging moss: ragged wisps that sway ── */
  {
    const strand = new THREE.PlaneGeometry(1, 1, 1, 5);
    strand.translate(0, -0.5, 0);
    const mossMat = new THREE.MeshLambertMaterial({ map: mossTexture(), color: 0x202c25, alphaTest: 0.45, side: THREE.DoubleSide });
    const sway = { value: 0 };
    mossMat.onBeforeCompile = (sh) => {
      sh.uniforms.sway = sway;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float sway;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n float mossD = -position.y;\n transformed.x += sin(sway + instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 0.4) * 0.16 * mossD * mossD;');
    };
    mossMat.customProgramCacheKey = () => 'forest-moss-v2';
    const moss = new THREE.InstancedMesh(strand, mossMat, mossPts.length * 2);
    const d = new THREE.Object3D();
    let k = 0;
    for (const [x, y, z, len] of mossPts) {
      const yaw = r() * Math.PI;
      // two crossed planes, so a wisp has some body from every side
      for (let m = 0; m < 2; m++) {
        d.position.set(x, y, z);
        d.rotation.set(0, yaw + m * (Math.PI / 2) + (r() - 0.5) * 0.5, 0);
        d.scale.set((0.6 + r() * 0.6) * (r() < 0.5 ? -1 : 1), len * (0.8 + r() * 0.3), 1);
        d.updateMatrix();
        moss.setMatrixAt(k++, d.matrix);
      }
    }
    moss.frustumCulled = false;
    moss.userData.noShadow = true;
    g.add(moss);
    updaters.push((t) => (sway.value = t * 0.6));
  }

  /* ── leaves on the water: gold where a lamp finds them ── */
  const leafU = { time: { value: 0 }, lampPos: { value: new THREE.Vector3(0, -100, 0) }, lampK: { value: 0 }, ambient: { value: new THREE.Color(0.017, 0.017, 0.01) } };
  {
    const N = 3400;
    const quad = new THREE.PlaneGeometry(1, 1);
    quad.rotateX(-Math.PI / 2);
    const seeds = new Float32Array(N), bake = new Float32Array(N);
    const leafMat = new THREE.ShaderMaterial({
      fog: true,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -2,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {}]),
      vertexShader: /* glsl */ `
        attribute float seed; attribute float bake; uniform float time;
        varying vec2 vUv; varying float vSeed; varying float vBake; varying vec3 vW;
        #include <common>
        #include <fog_pars_vertex>
        void main() {
          vUv = uv; vSeed = seed; vBake = bake;
          vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
          // they hardly move: a slow slide, and the water's own small rise and fall
          w.x += sin(time * 0.05 + seed * 40.0) * 0.3;
          w.z += cos(time * 0.04 + seed * 17.0) * 0.3;
          w.y += sin(time * 0.9 + seed * 60.0) * 0.005;
          vW = w.xyz;
          vec4 mvPosition = viewMatrix * w;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 lampPos; uniform float lampK; uniform vec3 ambient;
        varying vec2 vUv; varying float vSeed; varying float vBake; varying vec3 vW;
        #include <common>
        #include <fog_pars_fragment>
        void main() {
          vec2 p = vUv * 2.0 - 1.0;
          // a pointed leaf with a midrib
          float halfW = 0.62 * pow(max(0.0, 1.0 - p.y * p.y), 0.8) * (1.0 - 0.25 * p.y);
          if (abs(p.x) > halfW) discard;
          vec3 base = mix(vec3(0.55, 0.27, 0.06), vec3(0.9, 0.68, 0.24), fract(vSeed * 7.31));
          base *= 0.7 + 0.3 * smoothstep(0.0, 0.1, abs(p.x));
          vec3 toL = lampPos - vW;
          float d2 = dot(toL, toL);
          vec3 light = ambient + vec3(1.0, 0.6, 0.26) * (lampK / (1.0 + d2 * 0.35) + vBake);
          gl_FragColor = vec4(base * light, 1.0);
          #include <fog_fragment>
        }`,
    });
    Object.assign(leafMat.uniforms, leafU);
    const leaves = new THREE.InstancedMesh(quad, leafMat, N);
    const d = new THREE.Object3D();
    let k = 0, guard = 0;
    while (k < N && guard++ < N * 30) {
      // in the channel, on the pool round the tree, and a few drifting out past the mouth
      const inPool = r() < 0.12;
      let a, o;
      if (inPool) {
        const ang = r() * Math.PI * 2, dd = 13.5 + r() * 6;
        const p = new THREE.Vector3(Math.sin(ang) * dd, 0, Math.cos(ang) * dd);
        a = p.dot(out);
        o = p.dot(across);
      } else {
        a = 10 + r() * 98;
        o = (r() - 0.5) * 2 * (chanW(a) + 1.5);
      }
      if (groundLocal(a, o) > -0.12) continue;
      // they gather in drifts, and against the banks
      const drift = smooth01((fbm(a * 0.16 + 2, o * 0.16 + 7, 3) - 0.38) / 0.25);
      const edge = smooth01((Math.abs(o) - chanW(a) + 2.6) / 2.2);
      if (r() > 0.1 + 0.9 * Math.max(drift, edge * 0.8)) continue;
      const p = at(a, o, 0.012);
      d.position.copy(p);
      d.rotation.set(0, r() * Math.PI * 2, 0);
      const s = 0.065 + r() * 0.085;
      d.scale.set(s * (0.55 + r() * 0.3), 1, s);
      d.updateMatrix();
      leaves.setMatrixAt(k, d.matrix);
      seeds[k] = r();
      let b = 0;
      for (const L of lamps) b += 1.5 / (1 + p.distanceToSquared(L.p) * 0.35);
      bake[k] = b;
      k++;
    }
    leaves.count = k;
    quad.setAttribute('seed', new THREE.InstancedBufferAttribute(seeds, 1));
    quad.setAttribute('bake', new THREE.InstancedBufferAttribute(bake, 1));
    leaves.frustumCulled = false;
    g.add(leaves);
  }

  /* ── the hollow at the root tree's foot, facing the channel: arch within arch of teal light ── */
  const doorPower = { value: 0.55 }; // dim until the companion wakes; full when the doors open
  const doorWorld = new THREE.Vector3();
  let doorHalo = null, doorMist = null;
  {
    const door = new THREE.Group();
    door.position.copy(out.clone().multiplyScalar(7.6)).setY(3.2);
    door.rotation.y = pathA;
    const inner = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 11),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { time: { value: 0 }, power: doorPower },
        vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `varying vec2 vUv; uniform float time; uniform float power;
          void main() {
            vec2 p = (vUv - 0.5) * vec2(9.0, 11.0);
            p.y += 1.3;
            // an arch: straight legs below the springing line, half an ellipse above it
            float f = p.y > 0.0 ? length(vec2(p.x / 2.45, p.y / 3.5)) : abs(p.x) / 2.45;
            // arch within arch, receding into the tree and drifting slowly outward, as if you were entering
            float q = log(max(f, 0.02)) / log(0.7);
            float ph = fract(q + time * 0.05);
            float band = smoothstep(0.0, 0.1, ph) * (1.0 - smoothstep(0.3, 0.55, ph));
            float inside = 1.0 - smoothstep(0.98, 1.02, f);
            float core = exp(-f * f * 16.0);
            float rim = exp(-pow((f - 1.0) / 0.045, 2.0));
            float outer = exp(-max(f - 1.0, 0.0) * 5.0) * (1.0 - inside);
            vec3 teal = vec3(0.05, 0.8, 0.56);
            // the arches brighten toward the heart of it
            float deep = max(1.0 - f, 0.0); // (never a negative number to a power: that is not a number, and one such pixel blacks out the frame)
            vec3 col = teal * (inside * (band * (0.1 + 0.5 * pow(deep, 1.5)) + 0.03 + 0.14 * deep * deep * deep) + rim * 0.5 + outer * 0.08);
            col += vec3(0.42, 1.0, 0.82) * core * 0.6;
            gl_FragColor = vec4(col * power, 1.0);
          }`,
      }),
    );
    door.add(inner);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(0.2, 0.9, 0.66), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.scale.set(11, 13, 1);
    halo.position.set(0, -0.4, 0.5);
    door.add(halo);
    doorHalo = halo;
    // the mist round it, lit from within: this is the bright end of the tunnel
    const mist = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(0.1, 0.62, 0.5), transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    mist.scale.set(74, 52, 1);
    mist.position.set(0, 5, 1);
    door.add(mist);
    doorMist = mist;
    g.add(door);
    doorWorld.copy(door.position).add(pos).setY(0);
    updaters.push((t) => (inner.material.uniforms.time.value = t));
  }

  /* teal light on the wood near the hollow */
  const light = new THREE.PointLight(0x4af0c8, 40, 60, 1.6);
  light.position.copy(out.clone().multiplyScalar(13)).setY(5);
  g.add(light);
  // a few drifting motes of teal light
  const N = 150;
  const mp = new Float32Array(N * 3);
  const seeds = [];
  for (let i = 0; i < N; i++) seeds.push([r() * Math.PI * 2, 4 + r() * 50, r() * 14, r()]);
  const motes = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(mp, 3)),
    new THREE.PointsMaterial({ map: glowTex, color: hdr(0.35, 1, 0.85, 1.2), size: 0.2, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  motes.frustumCulled = false;
  g.add(motes);

  /*
   * The forest chapter's puzzle (body: timing and movement): walls of roots across the channel that
   * rise on the tree's in-breath and sink into the water on its out-breath, in a wave that runs
   * toward the tree. Sunk until the doors open; sunk for good once the tree has woken.
   */
  const gateBark = forestBark(shared, 0.22, 'gate');
  const GATE_ALONG = [74, 62, 50, 38];
  const SUNK = 4.1; // how far under the water a gate lies when it is down (its tallest root is 3.8 m)
  const gateYaw = Math.atan2(-across.z, across.x); // local x = across the channel, local z = out of the forest
  const gates = GATE_ALONG.map((along, k) => {
    const gg = new THREE.Group();
    gg.position.copy(out).multiplyScalar(along);
    gg.rotation.y = gateYaw;
    const parts = [];
    const glowParts = [];
    for (let j = 0; j < 5; j++) {
      const pts = [];
      for (let m = 0; m <= 8; m++) {
        const u = m / 8;
        const x = -9.5 + u * 19;
        pts.push(new THREE.Vector3(x, 0.35 + j * 0.5 + Math.sin(u * Math.PI * 2 + j * 1.7) * 0.28 + Math.pow(Math.abs(x) / 9.5, 2) * 1.6, Math.sin(u * 5 + j * 2.1) * 0.55));
      }
      const rr = 0.42 - j * 0.04;
      const cp = new THREE.CatmullRomCurve3(pts).getPoints(40);
      parts.push(tube(cp, cp.map((_, i) => rr * (1 + 0.22 * Math.sin(i * 0.9 + j) + (noise2(i * 0.5 + j * 7, k * 3.1) - 0.5) * 0.4)), 8, 1));
      if (j % 2 === 0) glowParts.push(curveTube(pts.map((p) => p.clone().add(new THREE.Vector3(0, 0.05, 0.3))), 0.06, () => 1, 40, 5, 1));
    }
    for (let v = 0; v < 7; v++) {
      const x = -7.5 + v * 2.5 + (r() - 0.5);
      const pts = [new THREE.Vector3(x, -0.6, 0), new THREE.Vector3(x + (r() - 0.5) * 1.2, 1.4, (r() - 0.5) * 0.8), new THREE.Vector3(x + (r() - 0.5) * 1.6, 3.0 + r() * 0.8, (r() - 0.5) * 0.8)];
      parts.push(curveTube(pts, 0.32, (u) => 1 - u * 0.8, 14, 7, 1));
    }
    const mesh = new THREE.Mesh(mergeGeos(parts), gateBark);
    mesh.userData.noShadow = true;
    gg.add(mesh);
    const glowMat = new THREE.MeshBasicMaterial({ color: hdr(0.15, 1, 0.65, 0.9), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    gg.add(new THREE.Mesh(mergeGeos(glowParts), glowMat));
    gg.position.y = -SUNK;
    g.add(gg);
    return { along, g: gg, glowMat, up: 0, k };
  });
  let gatesActive = false;
  let solved = false;
  let surge = 0;
  const _l = new THREE.Vector3();
  const api = {
    out,
    across,
    pos: pos.clone(),
    doorPos: doorWorld,
    entrance: pos.clone().addScaledVector(out, 88),
    gates,
    gateHalfWidth: 8.5,
    /** Testing: keep the root gates sunk (for pictures of the channel). */
    hold: false,
    /** The height of the forest's own ground at a point of the world (its banks); below zero where it is water. */
    groundAt(x, z) {
      _l.set(x - pos.x, 0, z - pos.z);
      const a = _l.dot(out), o = _l.dot(across);
      if (a < -64 || a > 102 || Math.abs(o) > 64) return -1;
      return groundLocal(a, o);
    },
    /** The player's lantern, for the leaves on the water: where it is, and how bright (0..1). */
    setLamp(p, k) {
      leafU.lampPos.value.copy(p);
      leafU.lampK.value = k;
    },
    /** The doors of the three places open: the hollow brightens and the roots start to breathe. */
    open() {
      gatesActive = true;
    },
    /** The tree wakes: a surge of light, and the roots sink for good. */
    wake() {
      solved = true;
      surge = 1;
    },
    get solved() {
      return solved;
    },
  };

  scene.add(g);
  // (the buttresses reach about 13 m from the heart of the trunk at the waterline)
  colliders.push({ x: pos.x, z: pos.z, r: 13.2 });
  updaters.push((t, dt = 0.016, camera = null) => {
    shared.time.value = t;
    // (in the ending the forest's light is hushed: world.js)
    for (const m of [bark, gateBark]) m.userData.veinPower.value = m.userData.veinBase * hush.value;
    leafU.time.value = t;
    // gates: up on the in-breath, the wave reaching each gate 1.6 s after the one before
    for (const G of gates) {
      const target = gatesActive && !solved && !api.hold ? smooth01((Math.sin(0.9 * (t - G.k * 1.6)) + 0.3) / 0.6) : 0;
      G.up += (target - G.up) * (1 - Math.exp(-dt * 3));
      G.g.position.y = -SUNK * (1 - G.up);
      G.glowMat.opacity = G.up * (0.5 + 0.5 * Math.sin(t * 3 + G.k));
    }
    surge = Math.max(0, surge - dt * 0.25);
    doorPower.value += (((gatesActive ? (solved ? 1.6 : 1.15) : 0.55) + surge * 2) * hush.value - doorPower.value) * (1 - Math.exp(-dt * 2));
    // the lit mist round the hollow is the far end of the tunnel: up close it would only wash the picture out
    const dCam = camera ? Math.hypot(camera.position.x - doorWorld.x, camera.position.z - doorWorld.z) : 60;
    if (doorHalo) doorHalo.material.opacity = 0.02 + doorPower.value * 0.04;
    if (doorMist) doorMist.material.opacity = (0.1 + doorPower.value * 0.13) * (0.25 + 0.75 * smooth01((dCam - 14) / 40));
    const b = 0.5 + 0.5 * Math.sin(t * 0.9) + surge * 1.1;
    shared.breath.value = b;
    light.intensity = 26 + b * 22;
    // the lamps flicker, each to itself
    lamps.forEach((L, i) => {
      const f = 0.86 + 0.09 * Math.sin(t * (7 + L.seed * 5) + L.seed * 40) + 0.05 * Math.sin(t * (17 + L.seed * 9));
      lampUniforms.fLampPow.value[i] = 2.2 * f;
      lampGlows[i].material.opacity = 0.9 * f;
    });
    for (let i = 0; i < N; i++) {
      const [a, rad, y0, s] = seeds[i];
      const aa = a + t * 0.03 * (s - 0.5);
      mp[i * 3] = Math.cos(aa) * rad;
      mp[i * 3 + 1] = ((y0 + t * (0.1 + s * 0.2)) % 14) + 0.3;
      mp[i * 3 + 2] = Math.sin(aa) * rad;
    }
    motes.geometry.attributes.position.needsUpdate = true;
  });
  return api;
};
