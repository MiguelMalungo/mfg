import * as THREE from 'three';

/* Procedural textures and noise. Nothing is loaded from disk. */

const hash = (x, y) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};

/** Smooth value noise in 0..1. */
export const noise2 = (x, y) => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  const d = hash(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
};

export const fbm = (x, y, octaves = 5) => {
  let v = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < octaves; i++) {
    v += amp * noise2(x * f, y * f);
    f *= 2.03;
    amp *= 0.5;
  }
  return v;
};

export const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Small seeded random generator. */
export const rng = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Tileable normal map built from summed sine waves (used for water ripples and stone grain). */
export const tileNormalMap = (size = 256, waves = 18, strength = 2.2, seed = 7) => {
  const r = rng(seed);
  const comps = [];
  for (let i = 0; i < waves; i++) {
    const kx = Math.round((r() * 2 - 1) * 9);
    const ky = Math.round((r() * 2 - 1) * 9);
    const k = Math.hypot(kx, ky) || 1;
    comps.push({ kx, ky, amp: 1 / k, ph: r() * Math.PI * 2 });
  }
  const height = (u, v) => {
    let h = 0;
    for (const c of comps) h += c.amp * Math.sin(2 * Math.PI * (c.kx * u + c.ky * v) + c.ph);
    return h;
  };
  const data = new Uint8Array(size * size * 4);
  const e = 1 / size;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const dx = (height(u + e, v) - height(u - e, v)) * strength;
      const dy = (height(u, v + e) - height(u, v - e)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      data[i] = (-dx / len * 0.5 + 0.5) * 255;
      data[i + 1] = (-dy / len * 0.5 + 0.5) * 255;
      data[i + 2] = (1 / len * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
};

/** Soft round glow for sprites. */
export const glowTexture = () => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.42)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.09)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
};

/* 3D value noise, so the moon's map has no seam and no pinching at the poles. */
const hash3 = (x, y, z) => {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return n - Math.floor(n);
};
const noise3 = (x, y, z) => {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), uz = fz * fz * (3 - 2 * fz);
  const l = (a, b, t) => a + (b - a) * t;
  return l(
    l(l(hash3(ix, iy, iz), hash3(ix + 1, iy, iz), ux), l(hash3(ix, iy + 1, iz), hash3(ix + 1, iy + 1, iz), ux), uy),
    l(l(hash3(ix, iy, iz + 1), hash3(ix + 1, iy, iz + 1), ux), l(hash3(ix, iy + 1, iz + 1), hash3(ix + 1, iy + 1, iz + 1), ux), uy),
    uz,
  );
};
const fbm3 = (x, y, z, oct) => {
  let v = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) {
    v += a * noise3(x * f, y * f, z * f);
    f *= 2.07;
    a *= 0.5;
  }
  return v;
};

/**
 * The moon's face, as an equirectangular map: bright highlands, dark maria (the "seas"),
 * thousands of craters with bright rims, and a few young craters with rays.
 */
export const moonTexture = () => {
  const W = 2048, H = 1024;
  // 1) albedo from noise at half resolution
  const w = W / 2, h = H / 2;
  const base = document.createElement('canvas');
  base.width = w;
  base.height = h;
  const bg = base.getContext('2d');
  const img = bg.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const lat = (0.5 - (y + 0.5) / h) * Math.PI;
    const cl = Math.cos(lat), sl = Math.sin(lat);
    for (let x = 0; x < w; x++) {
      const lon = ((x + 0.5) / w) * Math.PI * 2;
      const px = cl * Math.cos(lon), py = sl, pz = cl * Math.sin(lon);
      // maria: large connected dark plains, warped so their shores are irregular
      const wx = fbm3(px * 2.1 + 5, py * 2.1, pz * 2.1, 3) - 0.5;
      const m = fbm3(px * 1.25 + wx * 0.9 + 11, py * 1.25 + wx * 0.6, pz * 1.25 + 3, 5);
      // seas with a firm shore and a soft shelf around it
      const mare = (0.62 * smoothstep(0.588, 0.622, m) + 0.38 * smoothstep(0.545, 0.66, m)) * (1 - Math.abs(py) ** 3);
      const rough = fbm3(px * 9, py * 9, pz * 9, 5);
      const fine = fbm3(px * 40, py * 40, pz * 40, 3);
      let v = 0.86 + (rough - 0.5) * 0.26 + (fine - 0.5) * 0.1; // highlands
      v = v * (1 - mare) + (0.55 + (rough - 0.5) * 0.3 + (fine - 0.5) * 0.08) * mare;
      const i = (y * w + x) * 4;
      img.data[i] = 255 * Math.min(1, v * 0.98);
      img.data[i + 1] = 255 * Math.min(1, v);
      img.data[i + 2] = 255 * Math.min(1, v * 1.035);
      img.data[i + 3] = 255;
    }
  }
  bg.putImageData(img, 0, 0);
  // 2) craters at full resolution
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(base, 0, 0, W, H);
  const r = rng(11);
  const crater = (x, y, rad, depth) => {
    const sx = 1 / Math.max(0.25, Math.cos((0.5 - y / H) * Math.PI)); // undo the map's stretch near the poles
    g.save();
    g.translate(x, y);
    g.scale(sx, 1);
    // floor: darker, offset shadow on one side, light on the other (sun from the upper left)
    let grad = g.createRadialGradient(rad * 0.18, rad * 0.18, 0, 0, 0, rad);
    grad.addColorStop(0, `rgba(60,64,74,${0.13 * depth})`);
    grad.addColorStop(0.75, `rgba(60,64,74,${0.09 * depth})`);
    grad.addColorStop(1, 'rgba(60,64,74,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(0, 0, rad, 0, Math.PI * 2);
    g.fill();
    // rim: bright crescent toward the light, dark crescent inside the opposite wall
    g.lineWidth = Math.max(0.8, rad * 0.14);
    g.strokeStyle = `rgba(255,255,255,${0.26 * depth})`;
    g.beginPath();
    g.arc(0, 0, rad, Math.PI * 0.15, Math.PI * 1.15);
    g.stroke();
    g.strokeStyle = `rgba(40,44,54,${0.14 * depth})`;
    g.beginPath();
    g.arc(0, 0, rad * 0.86, Math.PI * 1.1, Math.PI * 2.1);
    g.stroke();
    g.restore();
  };
  // rays first, so later craters sit on top of them
  const rayed = [];
  for (let i = 0; i < 9; i++) rayed.push([r() * W, H * (0.2 + r() * 0.6), 4 + r() * 6]);
  for (const [x, y, rad] of rayed) {
    const sx = 1 / Math.max(0.25, Math.cos((0.5 - y / H) * Math.PI));
    g.save();
    g.translate(x, y);
    g.scale(sx, 1);
    const n = 14 + Math.floor(r() * 12);
    for (let k = 0; k < n; k++) {
      const a = r() * Math.PI * 2;
      const len = rad * (8 + r() * 30);
      const grad = g.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len);
      grad.addColorStop(0, 'rgba(255,255,255,0.22)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.strokeStyle = grad;
      g.lineWidth = 1 + r() * rad * 0.35;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(Math.cos(a) * len, Math.sin(a) * len);
      g.stroke();
    }
    const halo = g.createRadialGradient(0, 0, 0, 0, 0, rad * 3.2);
    halo.addColorStop(0, 'rgba(255,255,255,0.4)');
    halo.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = halo;
    g.beginPath();
    g.arc(0, 0, rad * 3.2, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  for (let i = 0; i < 9000; i++) {
    const big = r();
    const rad = big > 0.992 ? 7 + r() * 9 : big > 0.93 ? 3 + r() * 4 : 0.8 + r() * r() * 2.6;
    crater(r() * W, r() * H, rad, 0.5 + r() * 0.5);
  }
  for (const [x, y, rad] of rayed) crater(x, y, rad, 1);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
};

/** Carved text for inscriptions: light letters on transparent. */
export const textTexture = (lines, { width = 1024, height = 512, size = 64, image = null, imageH = 0 } = {}) => {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const g = c.getContext('2d');
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const font = (px) => `500 ${px}px "Cormorant Garamond", Georgia, "Times New Roman", serif`;
  g.font = font(size);
  // shrink to fit the widest line, so long inscriptions are never cut at the edges
  // a little open tracking, like letters cut by hand (real letter-spacing, not inserted spaces)
  const track = (px) => {
    if ('letterSpacing' in g) g.letterSpacing = `${Math.round(px * 0.06)}px`;
  };
  track(size);
  const widest = Math.max(...lines.map((l) => g.measureText(l).width));
  if (widest > width * 0.95) {
    size = Math.floor((size * width * 0.95) / widest);
    g.font = font(size);
    track(size);
  }
  g.fillStyle = '#ffffff';
  const lh = size * 1.35;
  // an optional carved image above the words
  if (image) g.drawImage(image, (width - image.width * (imageH / image.height)) / 2, 0, image.width * (imageH / image.height), imageH);
  const y0 = imageH + (height - imageH) / 2 - ((lines.length - 1) * lh) / 2;
  lines.forEach((line, i) => {
    g.fillText(line, width / 2, y0 + i * lh);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
};

/**
 * Weathered standing-stone surface (colour; also used as a bump map): grey granite grain, darker
 * mottling, pale lichen, hairline cracks. Tileable enough for a menhir.
 */
export const rockTexture = () => {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const img = g.createImageData(S, S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const u = x / S, v = y / S;
      // tileable fbm: sample on a torus
      const a = u * Math.PI * 2, b = v * Math.PI * 2;
      const n = fbm(Math.cos(a) * 1.6 + 10, Math.sin(a) * 1.6 + Math.cos(b) * 1.6 + Math.sin(b) * 0.7, 6);
      const grain = noise2(x * 0.9, y * 0.9);
      let k = 0.5 + (n - 0.5) * 1.1 + (grain - 0.5) * 0.22;
      k = Math.max(0, Math.min(1, k));
      const i = (y * S + x) * 4;
      img.data[i] = 70 + k * 120;
      img.data[i + 1] = 72 + k * 118;
      img.data[i + 2] = 76 + k * 112;
      img.data[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  const r = rng(61);
  // lichen
  for (let k = 0; k < 160; k++) {
    const x = r() * S, y = r() * S, rad = 3 + r() * r() * 26;
    const grad = g.createRadialGradient(x, y, 0, x, y, rad);
    grad.addColorStop(0, `rgba(196,200,178,${0.18 + r() * 0.2})`);
    grad.addColorStop(1, 'rgba(196,200,178,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, rad, 0, Math.PI * 2);
    g.fill();
  }
  // hairline cracks
  g.strokeStyle = 'rgba(25,25,28,0.55)';
  for (let k = 0; k < 14; k++) {
    let x = r() * S, y = r() * S;
    g.lineWidth = 0.8 + r() * 1.6;
    g.beginPath();
    g.moveTo(x, y);
    for (let s = 0; s < 12; s++) {
      x += (r() - 0.5) * 40;
      y += r() * 30;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  return c;
};

/**
 * A carved diagram for the self-observation stone: Ouspensky's double-headed arrow of attention.
 * On the left, a small figure (I); on the right, what is seen. One arrow goes out to the object,
 * the other comes back to the one who looks: I see it, and I am here.
 */
export const attentionDiagram = (w = 1024, h = 420) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.strokeStyle = '#ffffff';
  g.fillStyle = '#ffffff';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.lineWidth = 9;
  // the one who looks: head and body
  const fx = w * 0.2, fy = h * 0.55;
  g.beginPath();
  g.arc(fx, fy - 95, 34, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.moveTo(fx, fy - 58);
  g.lineTo(fx, fy + 60);
  g.moveTo(fx - 50, fy - 15);
  g.lineTo(fx + 50, fy - 15);
  g.moveTo(fx, fy + 60);
  g.lineTo(fx - 38, fy + 140);
  g.moveTo(fx, fy + 60);
  g.lineTo(fx + 38, fy + 140);
  g.stroke();
  // what is seen: a flame
  const ox = w * 0.8, oy = h * 0.55;
  g.beginPath();
  g.moveTo(ox, oy - 110);
  g.bezierCurveTo(ox + 60, oy - 30, ox + 45, oy + 60, ox, oy + 70);
  g.bezierCurveTo(ox - 45, oy + 60, ox - 60, oy - 30, ox, oy - 110);
  g.stroke();
  // the arrow out (attention to the object) and the arrow back (to oneself): one double-headed arrow
  const ay = h * 0.42;
  const x0 = fx + 70, x1 = ox - 75;
  g.beginPath();
  g.moveTo(x0, ay);
  g.lineTo(x1, ay);
  g.stroke();
  const head = (x, dir) => {
    g.beginPath();
    g.moveTo(x, ay);
    g.lineTo(x - dir * 34, ay - 22);
    g.lineTo(x - dir * 34, ay + 22);
    g.closePath();
    g.fill();
  };
  head(x1, 1);
  head(x0, -1);
  // labels
  g.font = '600 46px "Cormorant Garamond", Georgia, serif';
  g.textAlign = 'center';
  g.fillText('I', fx, fy + 190 > h ? h - 12 : fy + 190);
  g.fillText('it', ox, h - 12);
  g.font = 'italic 500 40px "Cormorant Garamond", Georgia, serif';
  g.fillText('I see it', (x0 + x1) / 2, ay - 40);
  g.fillText('and I am here', (x0 + x1) / 2, ay + 70);
  return c;
};

/** Carved symbols for the teaching stones (white strokes on transparent, 1024×420). */
export const stoneSymbol = (kind, w = 1024, h = 420) => {
  if (kind === 'attention') return attentionDiagram(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.strokeStyle = '#fff';
  g.fillStyle = '#fff';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.lineWidth = 9;
  const cx = w / 2, cy = h / 2;
  const circle = (x, y, r, fill = false) => {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    fill ? g.fill() : g.stroke();
  };
  const figure = (x, y, s = 1) => {
    circle(x, y - 120 * s, 30 * s);
    g.beginPath();
    g.moveTo(x, y - 88 * s);
    g.lineTo(x, y + 40 * s);
    g.moveTo(x - 46 * s, y - 50 * s);
    g.lineTo(x + 46 * s, y - 50 * s);
    g.moveTo(x, y + 40 * s);
    g.lineTo(x - 36 * s, y + 140 * s);
    g.moveTo(x, y + 40 * s);
    g.lineTo(x + 36 * s, y + 140 * s);
    g.stroke();
  };
  const eye = (x, y, s, open) => {
    g.beginPath();
    g.moveTo(x - 90 * s, y);
    g.quadraticCurveTo(x, y - (open ? 70 : 8) * s, x + 90 * s, y);
    g.quadraticCurveTo(x, y + 60 * s, x - 90 * s, y);
    g.stroke();
    if (open) circle(x, y, 22 * s, true);
    else
      for (let k = -2; k <= 2; k++) {
        g.beginPath();
        g.moveTo(x + k * 30 * s, y + 18 * s);
        g.lineTo(x + k * 34 * s, y + 42 * s);
        g.stroke();
      }
  };
  const flame = (x, y, s) => {
    g.beginPath();
    g.moveTo(x, y - 100 * s);
    g.bezierCurveTo(x + 55 * s, y - 25 * s, x + 42 * s, y + 55 * s, x, y + 62 * s);
    g.bezierCurveTo(x - 42 * s, y + 55 * s, x - 55 * s, y - 25 * s, x, y - 100 * s);
    g.stroke();
  };
  switch (kind) {
    case 'hourglass': {
      // time passes, nothing is lost
      g.beginPath();
      g.moveTo(cx - 90, 40);
      g.lineTo(cx + 90, 40);
      g.lineTo(cx + 12, cy);
      g.lineTo(cx + 90, h - 40);
      g.lineTo(cx - 90, h - 40);
      g.lineTo(cx - 12, cy);
      g.closePath();
      g.stroke();
      g.beginPath();
      g.moveTo(cx - 55, h - 50);
      g.lineTo(cx + 55, h - 50);
      g.lineTo(cx, h - 110);
      g.closePath();
      g.fill();
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx, h - 110);
      g.stroke();
      break;
    }
    case 'sleep': {
      // the closed eye of sleep, and the flame that lights it
      eye(cx - 170, cy + 10, 1.2, false);
      flame(cx + 190, cy + 10, 1.25);
      g.beginPath();
      g.moveTo(cx - 20, cy + 10);
      g.lineTo(cx + 90, cy + 10);
      g.stroke();
      g.beginPath();
      g.moveTo(cx - 20, cy + 10);
      g.lineTo(cx + 8, cy - 10);
      g.lineTo(cx + 8, cy + 30);
      g.closePath();
      g.fill();
      break;
    }
    case 'observe': {
      // an eye that watches the one who walks
      eye(cx, 95, 1.3, true);
      figure(cx, cy + 90, 0.85);
      g.setLineDash([4, 22]);
      g.beginPath();
      g.moveTo(cx, 150);
      g.lineTo(cx, 215);
      g.stroke();
      g.setLineDash([]);
      break;
    }
    case 'brains': {
      // three centres in one body: thinking (head), feeling (chest), moving (belly)
      figure(cx, cy + 30, 1.3);
      g.lineWidth = 7;
      circle(cx, cy + 30 - 156, 52);
      circle(cx, cy + 30 - 40, 40);
      circle(cx, cy + 30 + 60, 40);
      g.font = 'italic 500 38px "Cormorant Garamond", Georgia, serif';
      g.textAlign = 'left';
      g.fillText('thinking', cx + 80, cy + 30 - 146);
      g.fillText('feeling', cx + 80, cy + 30 - 30);
      g.fillText('moving', cx + 80, cy + 30 + 70);
      break;
    }
    case 'seven': {
      // five lower centres in a row; two higher ones above, always lit
      for (let k = 0; k < 5; k++) circle(cx - 280 + k * 140, h - 110, 44);
      for (const x of [cx - 120, cx + 120]) {
        const grad = g.createRadialGradient(x, 110, 4, x, 110, 80);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(0.5, 'rgba(255,255,255,0.5)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grad;
        g.fillRect(x - 80, 30, 160, 160);
        g.fillStyle = '#fff';
        circle(x, 110, 44);
      }
      g.setLineDash([4, 20]);
      g.beginPath();
      g.moveTo(cx - 140, 200);
      g.lineTo(cx + 140, 200);
      g.stroke();
      g.setLineDash([]);
      break;
    }
    case 'moving': {
      // a walking figure over a wave: the body keeps the time
      g.beginPath();
      for (let x = 60; x <= w - 60; x += 6) {
        const y = h - 80 + Math.sin((x / w) * Math.PI * 6) * 26;
        x === 60 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.stroke();
      const x = cx, y = cy - 10;
      circle(x, y - 110, 28);
      g.beginPath();
      g.moveTo(x, y - 80);
      g.lineTo(x - 10, y + 30);
      g.moveTo(x - 4, y - 50);
      g.lineTo(x + 50, y - 10);
      g.moveTo(x - 4, y - 50);
      g.lineTo(x - 52, y - 20);
      g.moveTo(x - 10, y + 30);
      g.lineTo(x + 48, y + 100);
      g.moveTo(x - 10, y + 30);
      g.lineTo(x - 56, y + 96);
      g.stroke();
      break;
    }
    case 'essence': {
      // the essence, a small lit core; around it, layer on layer of masks
      for (let k = 3; k >= 1; k--) {
        g.globalAlpha = 0.35 + 0.2 * (3 - k);
        g.beginPath();
        g.ellipse(cx, cy, 60 + k * 45, 80 + k * 50, 0, 0, Math.PI * 2);
        g.stroke();
      }
      g.globalAlpha = 1;
      const grad = g.createRadialGradient(cx, cy, 2, cx, cy, 46);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.fillRect(cx - 50, cy - 50, 100, 100);
      g.fillStyle = '#fff';
      circle(cx, cy, 18, true);
      // eyes on the outermost mask
      for (const x of [cx - 70, cx + 70]) {
        g.beginPath();
        g.ellipse(x, cy - 95, 26, 11, 0, 0, Math.PI * 2);
        g.stroke();
      }
      break;
    }
    case 'rhythm': {
      // a lotus over the line of a heartbeat
      const ly = cy - 40;
      for (const [dx, hgt, wd] of [[0, 130, 50], [-70, 100, 45], [70, 100, 45], [-130, 66, 40], [130, 66, 40]]) {
        g.beginPath();
        g.moveTo(cx + dx * 0.4, ly + 50);
        g.quadraticCurveTo(cx + dx - wd, ly + 50 - hgt * 0.5, cx + dx, ly + 50 - hgt);
        g.quadraticCurveTo(cx + dx + wd, ly + 50 - hgt * 0.5, cx + dx * 0.4, ly + 50);
        g.stroke();
      }
      g.beginPath();
      const by = h - 70;
      g.moveTo(60, by);
      g.lineTo(cx - 120, by);
      g.lineTo(cx - 80, by - 70);
      g.lineTo(cx - 40, by + 50);
      g.lineTo(cx, by - 20);
      g.lineTo(cx + 30, by);
      g.lineTo(w - 60, by);
      g.stroke();
      break;
    }
    case 'octave': {
      // the octave: eight notes rising, with wider gaps after mi and after si, where the line bends
      const pts = [];
      let x = 130;
      for (let k = 0; k < 8; k++) {
        pts.push([x, h - 80 - (k / 7) * (h - 170)]);
        x += 95 + (k === 2 || k === 6 ? 80 : 0);
      }
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (let k = 1; k < 8; k++) {
        const [x0, y0] = pts[k - 1];
        const [x1, y1] = pts[k];
        if (k === 3 || k === 7) g.quadraticCurveTo((x0 + x1) / 2, Math.max(y0, y1) + 55, x1, y1); // the interval: the line sags
        else g.lineTo(x1, y1);
      }
      g.stroke();
      g.fillStyle = g.strokeStyle;
      for (const [px, py] of pts) {
        g.beginPath();
        g.arc(px, py, 15, 0, Math.PI * 2);
        g.fill();
      }
      break;
    }
    case 'tree': {
      // trunk, branches and roots: the body
      g.beginPath();
      g.moveTo(cx, cy + 50);
      g.lineTo(cx, cy - 60);
      for (const [dx, dy] of [[-120, -150], [120, -150], [-60, -180], [60, -180], [0, -190]]) {
        g.moveTo(cx, cy - 40);
        g.quadraticCurveTo(cx + dx * 0.3, cy - 80, cx + dx, cy + dy + 40);
      }
      for (const dx of [-160, -90, -30, 30, 90, 160]) {
        g.moveTo(cx, cy + 50);
        g.quadraticCurveTo(cx + dx * 0.4, cy + 70, cx + dx, cy + 150);
      }
      g.stroke();
      break;
    }
    default:
      return null;
  }
  return c;
};
