import * as THREE from 'three';

/*
 * Procedural textures, drawn once at load. Every surface gets three maps from one height field:
 * colour, normal and roughness. All of them tile.
 */

const hash = (x, y) => {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

/** Value noise that tiles with period `per` (in lattice cells). */
const tnoise = (x, y, per) => {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const m = (a) => ((a % per) + per) % per;
  const a = hash(m(xi), m(yi)), b = hash(m(xi + 1), m(yi)), c = hash(m(xi), m(yi + 1)), d = hash(m(xi + 1), m(yi + 1));
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};

/** Value noise with separate periods along x and y, for stretched grain that still tiles. */
const tnoise2 = (x, y, px, py) => {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const mx = (a) => ((a % px) + px) % px, my = (a) => ((a % py) + py) % py;
  const a = hash(mx(xi), my(yi)), b = hash(mx(xi + 1), my(yi)), c = hash(mx(xi), my(yi + 1)), d = hash(mx(xi + 1), my(yi + 1));
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};

/** Stretched tiling fractal noise: `fu` cells across and `fv` cells up at the first octave. */
export const tfbm2 = (u, v, fu, fv, oct = 4) => {
  let s = 0, a = 0.5, n = 0;
  for (let i = 0; i < oct; i++) {
    s += a * tnoise2(u * fu, v * fv, fu, fv);
    n += a;
    a *= 0.5;
    fu *= 2;
    fv *= 2;
  }
  return s / n;
};

/** Tiling fractal noise on the unit square; `freq` lattice cells across at the first octave. */
export const tfbm = (u, v, freq = 4, oct = 5) => {
  let s = 0, a = 0.5, f = freq, n = 0;
  for (let i = 0; i < oct; i++) {
    s += a * tnoise(u * f, v * f, f);
    n += a;
    a *= 0.5;
    f *= 2;
  }
  return s / n;
};

export const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export const rng = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) | 0;
  return (seed >>> 0) / 4294967295;
};

const canvasTex = (data, size, srgb) => {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.putImageData(new ImageData(data, size, size), 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

/**
 * Builds { map, normalMap, roughnessMap } from a per-pixel function.
 * fn(u, v) → { h, r, g, b, rough }: height (any range), linear-ish colour 0..1, roughness 0..1.
 */
export const surface = (size, fn, bump = 2) => {
  const H = new Float32Array(size * size);
  const col = new Uint8ClampedArray(size * size * 4);
  const rgh = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const o = fn((x + 0.5) / size, (y + 0.5) / size);
      const i = y * size + x;
      H[i] = o.h;
      col[i * 4] = Math.pow(Math.max(0, o.r), 1 / 2.2) * 255;
      col[i * 4 + 1] = Math.pow(Math.max(0, o.g), 1 / 2.2) * 255;
      col[i * 4 + 2] = Math.pow(Math.max(0, o.b), 1 / 2.2) * 255;
      col[i * 4 + 3] = 255;
      // three reads roughness from G and metalness from B
      rgh[i * 4] = 255;
      rgh[i * 4 + 1] = o.rough * 255;
      rgh[i * 4 + 2] = 0;
      rgh[i * 4 + 3] = 255;
    }
  const nrm = new Uint8ClampedArray(size * size * 4);
  const at = (x, y) => H[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * bump * size * 0.01;
      const dy = (at(x, y + 1) - at(x, y - 1)) * bump * size * 0.01;
      const l = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      nrm[i] = (-dx / l) * 127.5 + 127.5;
      // canvas rows run top to bottom, texture v runs bottom to top
      nrm[i + 1] = (dy / l) * 127.5 + 127.5;
      nrm[i + 2] = (1 / l) * 127.5 + 127.5;
      nrm[i + 3] = 255;
    }
  return { map: canvasTex(col, size, true), normalMap: canvasTex(nrm, size, false), roughnessMap: canvasTex(rgh, size, false) };
};

/**
 * Herringbone parquet, worn and polished (the corridor floor of the references).
 * Planks are 1×N cells; the pattern repeats every 2N cells, so `cells` must be a multiple of 2N.
 */
export const parquet = (size = 1024, N = 4, cells = 16) => {
  const P = 2 * N;
  return surface(size, (u, v) => {
    const x = u * cells, y = v * cells;
    const i = Math.floor(x), j = Math.floor(y);
    const s = (((i - j) % P) + P) % P;
    let along, across, id;
    if (s < N) {
      along = (s + (x - i)) / N;
      across = y - j;
      id = hash((((i - s) % cells) + cells) % cells, j + 31);
    } else {
      const t = s - N;
      along = (N - 1 - t + (y - j)) / N;
      across = x - i;
      id = hash(i + 57, (((j - (N - 1 - t)) % cells) + cells) % cells);
    }
    // the gaps between planks
    const edge = Math.min(across, 1 - across, along * N, (1 - along) * N);
    const groove = smooth(0.0, 0.07, edge);
    // grain runs along the plank
    const gu = s < N ? u : v, gv = s < N ? v : u;
    const grain = tfbm2(gu + id * 0.37, gv + id * 0.61, 12, 180, 4);
    const pores = tfbm2(gu + 0.3, gv, 60, 700, 2);
    const wear = tfbm(u + 0.3, v + 0.7, 3, 4); // big soft patches where the polish has gone
    const stain = tfbm(u + id, v, 6, 3);
    const tone = 0.55 + 0.6 * id + 0.35 * (grain - 0.5);
    const base = [0.105 * tone, 0.062 * tone, 0.03 * tone];
    const dirt = (1 - groove) * 0.85 + smooth(0.55, 0.8, stain) * 0.35;
    const k = 1 - Math.min(1, dirt);
    return {
      h: groove * 0.8 + grain * 0.12 + pores * 0.05 + (id - 0.5) * 0.12,
      r: base[0] * k,
      g: base[1] * k,
      b: base[2] * k,
      // polished where walked on, dull in the gaps and the worn patches
      rough: Math.min(1, 0.2 + 0.3 * smooth(0.45, 0.75, wear) + 0.25 * (pores - 0.5) + (1 - groove) * 0.5 + 0.1 * id),
    };
  }, 2.4);
};

/** Old wallpaper over plaster: faint vertical stripes and a damask, grime running down, cracks. */
export const wallpaper = (size = 1024) =>
  surface(size, (u, v) => {
    const n = tfbm(u, v, 5, 5);
    const fine = tfbm(u, v, 180, 2); // paper fibre
    const streak = tfbm2(u, v + 0.4, 26, 2, 3); // long vertical runs (v is up)
    const stripe = 0.5 + 0.5 * Math.cos(u * Math.PI * 2 * 8);
    const dam = Math.sin(u * Math.PI * 2 * 8) * Math.sin(v * Math.PI * 2 * 8 + Math.sin(u * Math.PI * 16) * 1.2);
    const pattern = smooth(0.25, 0.6, dam) * 0.5 + stripe * 0.25;
    const grime = smooth(0.4, 0.75, streak) * 0.6 + smooth(0.5, 0.8, n) * 0.4;
    // hairline cracks only where the paper is already stained
    const crack = smooth(0.0028, 0.0, Math.abs(tfbm(u + 3.1, v + 1.7, 3, 4) - 0.5)) * smooth(0.45, 0.7, n);
    const t = (0.75 + 0.3 * pattern) * (1 - 0.6 * grime) * (1 - 0.5 * crack);
    return {
      h: fine * 0.1 + pattern * 0.12 - crack * 0.5 + n * 0.03,
      r: 0.16 * t,
      g: 0.125 * t,
      b: 0.07 * t,
      rough: Math.min(1, 0.78 + 0.2 * grime - 0.12 * pattern),
    };
  }, 1.6);

/** Dark wood panelling: `cols` framed panels across the tile, with grain. */
export const panelling = (size = 1024, cols = 2) =>
  surface(size, (u, v) => {
    const pu = (u * cols) % 1;
    const m = 0.11; // frame width as a fraction of the panel
    const inner = Math.min(pu - m, 1 - m - pu, v - 0.1, 0.9 - v);
    const frame = smooth(-0.012, 0.012, -inner); // 1 on the frame, 0 in the field
    const bevel = smooth(0.0, 0.05, inner) * (1 - frame);
    // grain: vertical on the field and the stiles, horizontal on the rails
    const rail = v < 0.1 || v > 0.9;
    const g = rail ? tfbm2(u, v, 6, 160, 4) : tfbm2(u, v, 160, 5, 4);
    const big = tfbm(u, v, 4, 4);
    const t = (0.7 + 0.6 * (g - 0.5) + 0.3 * (big - 0.5)) * (0.75 + 0.25 * frame);
    return {
      h: frame * 0.9 + bevel * 0.5 + g * 0.035,
      r: 0.055 * t,
      g: 0.034 * t,
      b: 0.018 * t,
      rough: 0.45 + 0.2 * (g - 0.5) + 0.2 * (1 - smooth(0.3, 0.7, big)),
    };
  }, 1.5);

/**
 * Old dark wood, plain: long grain running along v, wider figure across it, worn and stained in
 * patches. For the modelled doors and panelling (joinery.js), which bring their own relief.
 */
export const wood = (size = 512) =>
  surface(size, (u, v) => {
    const fig = tfbm2(u, v, 9, 2, 4); // the figure of the board: slow bands across it
    const g = tfbm2(u + fig * 0.01, v, 110, 2, 4); // fine grain lines along it
    const pore = tfbm2(u, v, 260, 14, 2);
    const stain = tfbm(u + 0.3, v + 0.7, 3, 4);
    const t = (0.66 + 0.45 * (fig - 0.5) + 0.3 * (g - 0.5)) * (0.72 + 0.5 * stain);
    return {
      h: g * 0.5 + pore * 0.25 + fig * 0.2,
      r: 0.074 * t,
      g: 0.043 * t,
      b: 0.021 * t,
      // polished where hands and years have rubbed it, dull in the stains
      rough: 0.52 + 0.2 * (1 - smooth(0.35, 0.7, stain)) + 0.1 * (pore - 0.5),
    };
  }, 1.1);

/** Coarse burlap: an over-under weave with slubs. */
export const burlap = (size = 512, threads = 48) =>
  surface(size, (u, v) => {
    const x = u * threads, y = v * threads;
    const wob = tfbm(u, v, 8, 3) - 0.5;
    const fx = x + wob * 0.6, fy = y + wob * 0.6;
    const cx = Math.floor(fx), cy = Math.floor(fy);
    const over = (cx + cy) % 2 === 0;
    const a = Math.sin((fx - cx) * Math.PI), b = Math.sin((fy - cy) * Math.PI);
    const warp = b * (over ? 1 : 0.55), weft = a * (over ? 0.55 : 1);
    const h = Math.max(warp, weft);
    const slub = tfbm(u, v, 24, 2);
    const hole = (1 - a) * (1 - b);
    const big = tfbm(u + 0.5, v, 3, 4);
    const t = (0.55 + 0.5 * h) * (0.75 + 0.5 * slub) * (0.7 + 0.5 * big) * (1 - 0.7 * smooth(0.5, 1, hole));
    return { h: h + slub * 0.3, r: 0.105 * t, g: 0.078 * t, b: 0.043 * t, rough: 0.95 };
  }, 3);

/** Stone flags for the stair behind the door. */
export const stone = (size = 512) =>
  surface(size, (u, v) => {
    const n = tfbm(u, v, 6, 5);
    const f = tfbm(u, v, 40, 3);
    const t = 0.6 + 0.6 * n;
    return { h: n * 0.8 + f * 0.25, r: 0.085 * t, g: 0.075 * t, b: 0.055 * t, rough: 0.8 + 0.15 * f };
  }, 2.5);

/** Soft round glow for halos. */
export const glowTexture = (size = 128) => {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.12, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.12)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};
