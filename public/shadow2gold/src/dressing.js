import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { W, H, Z_BACK, MASK_WALL } from './house.js';

/*
 * The look pass (PLAN.md 10.7, stage C): real surfaces and real objects in the corridor, all from
 * Poly Haven (CC0; credits in assets/house/CREDITS.md).
 *   surfaces   herringbone parquet on the floor, decrepit wallpaper on the walls and ceiling, dark
 *              wood on the doors and panelling (replacing the textures painted in code)
 *   objects    candle chandeliers in place of the coded ones (i25), a carved console with candles
 *              near the start (i10), a grandfather clock behind you (the clock you hear), marble busts
 *              on dark plinths at both ends of the hall of masks (i11), old paintings on the walls
 * Everything is loaded after the first frame; until it arrives the house keeps its coded look.
 */

const tex = (loader, url, srgb, repeat) => {
  const t = loader.load(url);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.repeat.set(repeat, repeat);
  return t;
};

/** Gives a material three Poly Haven maps. `tile`: metres one repeat of the material covers in the house's UVs; `real`: metres the texture shows. */
const surface = (mat, loader, base, ext, tile, real, { color, normal = 1, rough = null } = {}) => {
  const r = tile / real;
  mat.map = tex(loader, `${base}_diff_${ext}.jpg`, true, r);
  mat.normalMap = tex(loader, `${base}_nor_gl_${ext.replace('2k', '2k')}.jpg`, false, r);
  mat.roughnessMap = tex(loader, `${base}_rough_1k.jpg`, false, r);
  mat.normalScale.set(normal, normal);
  if (rough != null) mat.roughness = rough;
  if (color) mat.color.copy(color);
  mat.needsUpdate = true;
};

/**
 * A roughness map made rougher: r' = lo + (1 - lo) r. Photographed parquet is waxed and smooth;
 * in the flask's light it read as a sheet of water, and the pattern was lost.
 */
const rougher = (url, lo, repeat) =>
  new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const x = c.getContext('2d');
      x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height);
      for (let i = 0; i < d.data.length; i += 4) for (let k = 0; k < 3; k++) d.data[i + k] = 255 * lo + (1 - lo) * d.data[i + k];
      x.putImageData(d, 0, 0);
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeat, repeat);
      t.anisotropy = 8;
      res(t);
    };
    img.src = url;
  });

/** lite: the phone setting (main.js): the surfaces and the console only; no chandelier models, busts, clock or paintings. */
export const dressHouse = async (scene, house, { lite = false } = {}) => {
  const loader = new THREE.TextureLoader();
  const T = './assets/house/tex/';

  /* surfaces */
  // the floor: the house's UVs repeat every 1.28 m; the parquet photo covers 3.4 m
  surface(house.floorMat, loader, T + 'herringbone_parquet', '2k', 1.28, 3.4, { color: new THREE.Color(0.26, 0.2, 0.15), normal: 0.9, rough: 1 });
  rougher(T + 'herringbone_parquet_rough_1k.jpg', 0.5, 1.28 / 3.4).then((t) => {
    house.floorMat.roughnessMap = t;
    house.floorMat.needsUpdate = true;
  });
  // the walls and ceiling: stained old wallpaper, darkened and greyed toward the references
  surface(house.wallMat, loader, T + 'decrepit_wallpaper', '2k', 1.7, 2.5, { color: new THREE.Color(0.5, 0.43, 0.33), normal: 0.8, rough: 1 });
  surface(house.ceilMat, loader, T + 'decrepit_wallpaper', '2k', 2.2, 2.5, { color: new THREE.Color(0.3, 0.27, 0.22), normal: 0.6, rough: 1 });
  /*
   * The woodwork: old lacquered cherry, dark and glossy, so the candles catch in the varnish. (Owner, 2026-11-17:
   * the first wood "looks terrible": its grain ran across every stile and rail, and it was a flat matt brown.)
   * Joinery UVs run the grain along v and repeat every 0.9 m; the photo's grain runs along u and covers 1.2 m,
   * so the maps are turned a quarter round.
   */
  for (const m of [house.joinMat, house.panelMat]) {
    surface(m, loader, T + 'lacquered_cherry_wood', '2k', 0.9, 1.2, { color: new THREE.Color(1.15, 1.0, 0.88), normal: 0.8, rough: 1 });
    for (const t of [m.map, m.normalMap, m.roughnessMap]) (t.rotation = Math.PI / 2), t.center.set(0.5, 0.5);
    m.metalness = 0;
    // varnish needs something to reflect: a dim room with candles in it, seen only in the wood's gloss
    m.envMap = varnishEnv();
    m.envMapIntensity = 0.9;
  }

  /* objects */
  const gltf = new GLTFLoader();
  const M = './assets/house/models/';
  const load = (id) => gltf.loadAsync(`${M}${id}/${id}_1k.gltf`).then((g) => g.scene);
  const all = ['Chandelier_03', 'ClassicConsole_01', 'vintage_grandfather_clock_01', 'marble_bust_01', 'fancy_picture_frame_01'];
  const [chandelier, console_, clock, bust, frame] = await Promise.all(all.map((id) => (lite && id !== 'ClassicConsole_01' ? null : load(id))));
  const shadowed = (o, cast = true) => o.traverse((c) => c.isMesh && ((c.castShadow = cast), (c.receiveShadow = true)));
  const colliders = [];
  // what is too heavy to draw twice more: left out of the floor's mirror (main.js), and casting no shadow from the flask
  // (the flask's shadow is a cube map: every caster is drawn six more times). Measured 2026-11-17: the dressing had
  // doubled the draw calls (924 to 1717) and the triangles (0.9 to 2.3 million) of a frame.
  const noMirror = [];

  /*
   * Chandeliers: the coded brass is hidden and the model hangs in its place; flames are set on the
   * model's own candles, found as the tops of the white candle sleeves (local maxima of height in
   * the ring between 0.1 and 0.4 m from the stem).
   */
  const tips = chandelier ? candleTips(chandelier) : [];
  const S = 1.15; // a little larger than life, for a high corridor
  if (chandelier) for (const g of house.chandeliers) {
    g.traverse((o) => {
      if (o !== g && (o.isMesh || o.isSprite)) o.visible = false;
    });
    const c = chandelier.clone();
    c.scale.setScalar(S);
    c.position.y = 1.05; // the model's top is its origin: hang it from the ceiling
    shadowed(c, false);
    g.add(c);
    noMirror.push(c);
    tips.forEach((p, i) => {
      const fl = house.candle(g, p.x * S, 1.05 + p.y * S, p.z * S, 0.002, 0.085);
      fl.scale.multiplyScalar(0.8);
      // one halo in three: the bloom does the rest
      if (i % 3) house.flames[house.flames.length - 1].halo.visible = false;
      fl.parent.children[fl.parent.children.indexOf(fl) - 1].visible = false; // the coded stick: the model has its own
    });
  }

  /* the console against the left wall near the start, with three candles on it (i10) */
  {
    const c = console_.clone();
    c.rotation.y = Math.PI / 2;
    c.scale.setScalar(0.85);
    c.position.set(-W / 2 + 0.24, 0, -1.6);
    shadowed(c);
    scene.add(c);
    colliders.push({ x: -W / 2 + 0.25, z: -1.6, r: 0.55, along: 0.62 });
    const top = 0.949 * 0.85;
    for (const [dz, h] of [[-0.18, 0.16], [0.02, 0.22], [0.2, 0.12]]) house.candle(house.group, -W / 2 + 0.26, top, -1.6 + dz, h, 0.3);
    const l = new THREE.PointLight(new THREE.Color(1.0, 0.56, 0.24), 0.45, 4.5, 2);
    l.position.set(-W / 2 + 0.45, top + 0.35, -1.6);
    l.userData.base = 0.45;
    l.userData.seed = 3.3;
    house.group.add(l);
    house.lights.push(l);
  }

  /* the grandfather clock: behind you at the start, in the corner (the ticking you hear) */
  if (clock) {
    const c = clock.clone();
    c.rotation.y = Math.PI; // facing down the corridor
    c.scale.setScalar(0.95);
    c.position.set(W / 2 - 0.42, 0, Z_BACK - 0.3);
    shadowed(c, false);
    scene.add(c);
    colliders.push({ x: W / 2 - 0.42, z: Z_BACK - 0.3, r: 0.45 });
  }

  /* marble busts on dark plinths at both ends of the hall of masks, either side of the corridor (i11) */
  if (bust) {
    const plinthMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.035, 0.03, 0.026), roughness: 0.32, metalness: 0 });
    const plinth = new THREE.Group();
    const add = (geo, y) => {
      const m = new THREE.Mesh(geo, plinthMat);
      m.position.y = y;
      plinth.add(m);
    };
    add(new THREE.BoxGeometry(0.46, 0.08, 0.46), 0.04);
    add(new THREE.BoxGeometry(0.36, 0.95, 0.36), 0.08 + 0.475);
    add(new THREE.BoxGeometry(0.44, 0.06, 0.44), 1.06);
    shadowed(plinth);
    for (const z of [MASK_WALL.z0 + 0.85, MASK_WALL.z1 - 0.45])
      for (const s of [-1, 1]) {
        const p = plinth.clone();
        p.position.set(s * (W / 2 - 0.38), 0, z);
        scene.add(p);
        const b = bust.clone();
        b.scale.setScalar(1.25);
        b.position.set(s * (W / 2 - 0.38), 1.09, z);
        b.rotation.y = -s * Math.PI / 2 + (s > 0 ? 0.25 : -0.25); // facing across the corridor, turned a little toward you
        shadowed(b, false);
        noMirror.push(b);
        scene.add(b);
        colliders.push({ x: s * (W / 2 - 0.38), z, r: 0.34 });
      }
  }

  /* old paintings in heavy frames, where the walls are bare */
  if (frame) {
    for (const [s, z] of [[1, -3.3], [-1, -7.6], [1, -21.6], [-1, -27.0], [1, -31.2], [-1, -39.6]]) {
      const f = frame.clone();
      f.scale.setScalar(1.55);
      f.rotation.y = -s * Math.PI / 2;
      f.position.set(s * (W / 2 - 0.005), 1.85, z);
      f.traverse((o) => {
        if (o.isMesh && o.material.name.includes('canvas')) {
          // the painting has gone dark under old varnish
          o.material = o.material.clone();
          o.material.color.setRGB(0.32, 0.27, 0.2);
          o.material.roughness = 0.45;
        }
      });
      shadowed(f, false);
      scene.add(f);
    }
  }

  // the photographed parquet is smoother than the coded one: it would mirror like water at the old strength
  return { colliders, tips, noMirror, floorReflection: 2.2 };
};

/**
 * What the varnished wood reflects: a dark room with a candle glow down the corridor each way and a dimmer
 * warmth at the sides, painted as a small panorama (three.js prefilters it for gloss). Only the woodwork
 * uses it; it is not the scene's light. (A PMREM rendered from a little 3D room came out white on some loads.)
 */
let _env = null;
const varnishEnv = () => {
  if (_env) return _env;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = 'rgb(10,7,5)';
  x.fillRect(0, 0, 512, 256);
  const blob = (u, v, r, a) => {
    const g = x.createRadialGradient(u, v, 0, u, v, r);
    g.addColorStop(0, `rgba(255,190,120,${a})`);
    g.addColorStop(0.25, `rgba(200,120,60,${a * 0.5})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(u - r, v - r, 2 * r, 2 * r);
  };
  for (const u of [128, 384]) blob(u, 105, 40, 1), blob(u, 112, 14, 1); // the corridor's two ends
  for (const u of [0, 256, 512]) blob(u, 140, 70, 0.25); // the walls
  _env = new THREE.CanvasTexture(c);
  _env.mapping = THREE.EquirectangularReflectionMapping;
  _env.colorSpace = THREE.SRGBColorSpace;
  return _env;
};

/** The tops of the model's candles, in its own space. */
const candleTips = (model) => {
  let geo = null;
  model.traverse((o) => o.isMesh && !geo && !String(o.material.name).includes('glass') && (geo = o.geometry));
  if (!geo) model.traverse((o) => o.isMesh && !geo && (geo = o.geometry));
  const p = geo.attributes.position;
  const cell = 0.012, cells = new Map();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 0.1 || r > 0.4) continue;
    const k = Math.round(x / cell) + ',' + Math.round(z / cell);
    const c = cells.get(k);
    if (!c || y > c.y) cells.set(k, { x, y, z });
  }
  const tips = [];
  for (const [k, c] of cells) {
    const [i, j] = k.split(',').map(Number);
    let top = true;
    for (let di = -2; di <= 2 && top; di++)
      for (let dj = -2; dj <= 2 && top; dj++) {
        if (!di && !dj) continue;
        const n = cells.get(i + di + ',' + (j + dj));
        if (n && n.y >= c.y) top = false;
      }
    // a candle stands up out of its cup: nothing near it rises as high
    if (top) tips.push(c);
  }
  // keep the ones in the candle tier (not the crown above, not the drops below)
  tips.sort((a, b) => b.y - a.y);
  return tips.filter((t) => t.y < -0.25 && t.y > -0.8).slice(0, 24);
};
