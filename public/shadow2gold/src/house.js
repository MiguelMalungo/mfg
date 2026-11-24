import * as THREE from 'three';
import { parquet, wallpaper, wood, stone, rng } from './textures.js';
import { doorLeaf, doorCase, doorKnob, wainscotBay, cornerShade, moulding, board } from './joinery.js';

/*
 * Level 1, the house: one long corridor (refs/v08.jpg): herringbone parquet, dark panelling under
 * old wallpaper, candle chandeliers, closed doors, and at the far end the narrow door that was never
 * there, ajar, with a candle-lit stair going down behind it (refs/i14.jpeg).
 * The corridor runs along -Z. x is across, y is up. All sizes in metres.
 */

export const W = 3.4; // corridor width
export const H = 3.5; // ceiling height
export const Z_BACK = 4; // wall behind the start
export const Z_END = -46; // wall with the narrow door
export const WAINSCOT = 1.15;
export const CHANDELIERS = [-9, -24, -38];
/** The stretch of the right wall where the masks hang (the hall of masks, src/masks.js). */
export const MASK_WALL = { z0: -13.2, z1: -18.9, y0: 0.82, y1: 3.0 };
/** Two sconces on that wall: the white masks hang in their light, the black ones in the dark between and beyond. */
export const MASK_SCONCES = [-14.63, -17.51];
/** Behind the door: the stair goes down into a flooded cellar (the threshold of level 2, albedo). */
export const STEPS = 22, RUN = 0.3, RISE = 0.19;
export const Z_STAIR_END = Z_END - 1.0 - STEPS * RUN; // where the last step ends and the cellar begins
export const ROOM_Y = -STEPS * RISE - 0.02; // the cellar floor, under the water
export const WATER = -3.3; // the water's surface
export const ROOM_W = 5.0;
export const Z_ROOM_END = Z_STAIR_END - 14.5;
export const SACK_AT = new THREE.Vector3(-0.35, 0, -29.5);
const DOOR_W = 0.86, DOOR_H = 2.15;
/** The closed doors along the walls: [side, z]. The skirting and the chair rail stop at their cases. */
const SIDE_DOORS = [[-1, -3.2], [1, -6.4], [-1, -12.5], [-1, -19.5], [1, -25.5], [-1, -33.5], [1, -35.8], [1, -41.5]];
const DOOR_GAP = 0.95 / 2 + 0.11; // half a door and its architrave

const metricPlane = (w, h, tileU, tileV) => {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / tileU, (uv.getY(i) * h) / tileV);
  return g;
};

const rotateMaps = (maps, angle) => {
  for (const t of Object.values(maps)) {
    t.center.set(0, 0);
    t.rotation = angle;
  }
  return maps;
};

export const buildHouse = (scene, glowTex) => {
  const group = new THREE.Group();
  scene.add(group);
  const L = Z_BACK - Z_END;
  const zMid = (Z_BACK + Z_END) / 2;

  /* ── materials ── */
  const floorMaps = rotateMaps(parquet(1024), Math.PI / 4);
  const floorMat = new THREE.MeshStandardMaterial({ ...floorMaps, roughness: 1, metalness: 0, normalScale: new THREE.Vector2(0.9, 0.9) });
  const paper = wallpaper(1024);
  // walls and woodwork go darker where they meet the floor and the ceiling (joinery.js: cornerShade)
  const wallMat = cornerShade(new THREE.MeshStandardMaterial({ ...paper, roughness: 1, normalScale: new THREE.Vector2(0.55, 0.55) }), H, 0, 'wall-shade');
  const ceilMat = new THREE.MeshStandardMaterial({ ...paper, roughness: 1, color: new THREE.Color(0.5, 0.48, 0.44) });
  // the doors and the panelling are modelled (joinery.js); this is their wood
  const woodMaps = wood(512);
  const joinMat = cornerShade(new THREE.MeshStandardMaterial({ ...woodMaps, roughness: 1, normalScale: new THREE.Vector2(0.55, 0.55) }), H, 0, 'join-shade');
  // the panelling also sits in the shadow of its own chair rail
  const panelMat = cornerShade(new THREE.MeshStandardMaterial({ ...woodMaps, roughness: 1, normalScale: new THREE.Vector2(0.55, 0.55) }), H, WAINSCOT, 'panel-shade');
  const woodMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.03, 0.019, 0.011), roughness: 0.5 });
  const brassMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.38, 0.25, 0.09), roughness: 0.38, metalness: 1 });
  const waxMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.55, 0.47, 0.33), roughness: 0.6, emissive: new THREE.Color(0.25, 0.1, 0.02), emissiveIntensity: 0.6 });
  const stoneMaps = stone(512);
  const stoneMat = new THREE.MeshStandardMaterial({ ...stoneMaps, roughness: 1 });
  // flames are brighter than white so the bloom picks them up
  const flameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(5.0, 2.6, 0.8), fog: false });
  const haloMat = new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(1.0, 0.55, 0.2), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });

  const add = (mesh, cast = false) => {
    mesh.receiveShadow = true;
    mesh.castShadow = cast;
    group.add(mesh);
    return mesh;
  };
  const box = (w, h, d, mat, x, y, z, cast = true) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    return add(m, cast);
  };

  /* ── shell ── */
  const floor = add(new THREE.Mesh(metricPlane(W, L, 1.28, 1.28), floorMat));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, zMid);
  const ceil = add(new THREE.Mesh(metricPlane(W, L, 2.2, 2.2), ceilMat));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, H, zMid);
  for (const side of [-1, 1]) {
    const x = (side * W) / 2;
    const rotY = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    const lower = add(new THREE.Mesh(metricPlane(L, WAINSCOT, 0.9, 0.9), panelMat));
    lower.rotation.y = rotY;
    lower.position.set(x, WAINSCOT / 2, zMid);
    const upper = add(new THREE.Mesh(metricPlane(L, H - WAINSCOT, 1.7, 1.7), wallMat));
    upper.rotation.y = rotY;
    upper.position.set(x, (H + WAINSCOT) / 2, zMid);
    // skirting and chair rail, in lengths that stop at each door's case; the cornice runs through
    let from = Z_BACK;
    const stops = SIDE_DOORS.filter(([s]) => s === side).map(([, z]) => z).sort((a, b) => b - a);
    // moulded in the doors' cherry (joinery.js: moulding); the left wall's profiles are the right's mirrored
    const run = (kind, len, y, z0) => {
      const m = add(new THREE.Mesh(moulding(kind, len), joinMat), kind !== 'skirting');
      m.position.set(x, y, z0);
      m.scale.x = -side;
      return m;
    };
    for (const z of [...stops, null]) {
      const to = z == null ? Z_END : z + DOOR_GAP, len = from - to;
      run('skirting', len, 0, from);
      run('chairRail', len, WAINSCOT, from);
      if (z != null) from = z - DOOR_GAP;
    }
    run('cornice', L, H, Z_BACK);
  }
  // panelling: a framed, fielded panel every three quarters of a metre, one instanced mesh for both walls
  {
    const BAY = 0.75, n = Math.floor(L / BAY);
    const bays = new THREE.InstancedMesh(wainscotBay(BAY, WAINSCOT), panelMat, n * 2);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
    let i = 0;
    for (const side of [-1, 1]) {
      q.setFromAxisAngle(up, side < 0 ? Math.PI / 2 : -Math.PI / 2);
      for (let k = 0; k < n; k++) bays.setMatrixAt(i++, m4.compose(p.set((side * W) / 2 - side * 0.001, 0, Z_BACK - (k + 0.5) * BAY), q, one));
    }
    bays.instanceMatrix.needsUpdate = true;
    bays.receiveShadow = true;
    bays.castShadow = false;
    bays.frustumCulled = false;
    group.add(bays);
  }
  // the wall behind the start
  const back = add(new THREE.Mesh(metricPlane(W, H, 1.7, 1.7), wallMat));
  back.rotation.y = Math.PI;
  back.position.set(0, H / 2, Z_BACK);

  /* ── closed doors along the walls ── */
  const sideLeafGeo = doorLeaf(0.95, 2.2, 0.045), sideCaseGeo = doorCase(0.95, 2.2), knobGeo = doorKnob();
  /** The closed doors along the walls: a shadow of control slams them as it passes (`slamDoor`). */
  const doors = [];
  const sideDoor = (side, z) => {
    const x = (side * W) / 2;
    const w = 0.95, h = 2.2;
    const rotY = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    // a framed four-panel leaf in its case, a turned knob on a rose
    const leaf = add(new THREE.Mesh(sideLeafGeo, joinMat));
    leaf.rotation.y = rotY;
    leaf.position.set(x - side * 0.024, 0, z);
    doors.push({ side, z, leaf, x0: leaf.position.x, shake: 0, shut: false });
    const frame = add(new THREE.Mesh(sideCaseGeo, joinMat));
    frame.rotation.y = rotY;
    frame.position.set(x, 0, z);
    const knob = add(new THREE.Mesh(knobGeo, brassMat));
    knob.rotation.y = rotY;
    knob.position.set(x - side * 0.047, 1.0, z + (side < 0 ? 0.39 : -0.39));
  };
  for (const [side, z] of SIDE_DOORS) sideDoor(side, z);

  /* ── candles: chandeliers and sconces ── */
  const flames = []; // { mesh, halo, light?, seed, base }
  const lights = []; // every warm point light, for the haze pass
  const flameGeo = new THREE.SphereGeometry(1, 10, 8);
  flameGeo.translate(0, 0.75, 0);
  const candle = (parent, x, y, z, h = 0.1, haloSize = 0.28) => {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, h, 8), waxMat);
    stick.position.set(x, y + h / 2, z);
    parent.add(stick);
    const fl = new THREE.Mesh(flameGeo, flameMat);
    fl.scale.set(0.0085, 0.02, 0.0085);
    fl.position.set(x, y + h + 0.004, z);
    parent.add(fl);
    const halo = new THREE.Sprite(haloMat.clone());
    halo.scale.setScalar(haloSize);
    halo.position.set(x, y + h + 0.02, z);
    parent.add(halo);
    flames.push({ mesh: fl, halo, seed: Math.random() * 100, haloSize });
    return fl;
  };
  const pointLight = (x, y, z, intensity, distance) => {
    const l = new THREE.PointLight(new THREE.Color(1.0, 0.56, 0.24), intensity, distance, 2);
    l.position.set(x, y, z);
    l.userData.base = intensity;
    l.userData.seed = Math.random() * 100;
    group.add(l);
    lights.push(l);
    return l;
  };

  const chandeliers = [];
  for (const z of CHANDELIERS) {
    const g = new THREE.Group();
    chandeliers.push(g);
    g.position.set(0, H - 1.05, z);
    group.add(g);
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.05, 6), brassMat);
    chain.position.y = 0.52;
    g.add(chain);
    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), brassMat);
    hub.scale.y = 1.6;
    g.add(hub);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.012, 8, 40), brassMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.06;
    g.add(ring);
    const N = 6;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + 0.3;
      const arm = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.008, 6, 14, Math.PI), brassMat);
      arm.position.set(Math.cos(a) * 0.17, -0.06, Math.sin(a) * 0.17);
      arm.rotation.set(Math.PI, -a, 0);
      g.add(arm);
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.012, 0.025, 10), brassMat);
      cup.position.set(Math.cos(a) * 0.34, -0.045, Math.sin(a) * 0.34);
      g.add(cup);
      candle(g, Math.cos(a) * 0.34, -0.035, Math.sin(a) * 0.34, 0.11, 0.34);
    }
    g.traverse((o) => o.isMesh && o.material !== flameMat && (o.castShadow = true));
    pointLight(0, H - 0.98, z, 3.0, 16);
  }
  // two sconces light the white masks; the black ones are left in the dark
  // (dressing.js swaps each for a brass candelabrum on a wall bracket: `sconces` lists what it hides)
  const sconces = [];
  for (const z of MASK_SCONCES) {
    const x = W / 2 - 0.1;
    const plate = box(0.02, 0.2, 0.09, brassMat, W / 2 - 0.012, 1.72, z);
    const arm = add(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.1, 6), brassMat), true);
    arm.rotation.z = Math.PI / 2;
    arm.position.set(W / 2 - 0.06, 1.68, z);
    const cup = add(new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.012, 0.02, 10), brassMat), true);
    cup.position.set(x, 1.69, z);
    const n0 = group.children.length;
    candle(group, x, 1.7, z, 0.09, 0.3);
    const light = pointLight(x - 0.3, 1.86, z, 0.34, 3.2);
    sconces.push({ z, parts: [plate, arm, cup, ...group.children.slice(n0, n0 + 3)], flame: flames[flames.length - 1], light });
  }

  /* ── the end wall, the narrow door, and the stair behind it ── */
  const side = (W - DOOR_W) / 2;
  for (const s of [-1, 1]) {
    const wm = add(new THREE.Mesh(metricPlane(side, H, 1.7, 1.7), wallMat));
    wm.position.set(s * (DOOR_W / 2 + side / 2), H / 2, Z_END);
    const wn = add(new THREE.Mesh(metricPlane(side, WAINSCOT, 0.9, 0.9), panelMat));
    wn.position.set(s * (DOOR_W / 2 + side / 2), WAINSCOT / 2, Z_END + 0.012);
    // the end wall's rails, turned to run across it; the narrow door's jambs as boards of the same wood
    for (const [kind, y] of [['skirting', 0], ['chairRail', WAINSCOT], ['cornice', H]]) {
      const m = add(new THREE.Mesh(moulding(kind, side), joinMat));
      m.rotation.y = -Math.PI / 2;
      m.position.set(s < 0 ? -W / 2 : DOOR_W / 2, y, Z_END);
    }
    add(new THREE.Mesh(board(0.09, DOOR_H + 0.1, 0.16, s * (DOOR_W / 2 + 0.045), (DOOR_H + 0.1) / 2, Z_END + 0.02, 'y'), joinMat), true);
  }
  const lintel = add(new THREE.Mesh(metricPlane(DOOR_W, H - DOOR_H, 1.7, 1.7), wallMat));
  lintel.position.set(0, (H + DOOR_H) / 2, Z_END);
  add(new THREE.Mesh(board(DOOR_W + 0.3, 0.12, 0.16, 0, DOOR_H + 0.06, Z_END + 0.02, 'x'), joinMat), true);
  // the leaf, hinged on the left, standing ajar into the corridor (openDoor swings it wide)
  const hinge = new THREE.Group();
  hinge.position.set(-DOOR_W / 2, 0, Z_END + 0.03);
  hinge.rotation.y = 1.12;
  group.add(hinge);
  const leaf = new THREE.Mesh(doorLeaf(DOOR_W, DOOR_H, 0.045, true), joinMat);
  leaf.position.set(DOOR_W / 2, 0, 0);
  leaf.castShadow = leaf.receiveShadow = true;
  hinge.add(leaf);
  for (const s of [-1, 1]) {
    const knob2 = new THREE.Mesh(knobGeo, brassMat);
    knob2.rotation.y = s < 0 ? Math.PI : 0;
    knob2.position.set(DOOR_W - 0.075, 1.0, s * 0.0225);
    hinge.add(knob2);
  }

  // the stair: a landing, then steps down between rough stone walls
  const sx = DOOR_W + 0.5; // stair well width
  const stairMat = stoneMat;
  box(sx, 0.2, 1.0, stairMat, 0, -0.1, Z_END - 0.5, false);
  const rnd = rng(11);
  const stair = { steps: [], walls: [], candles: [] }; // albedo.js dresses them (brick, worn treads, candle glow)
  for (let i = 0; i < STEPS; i++) {
    const z = Z_END - 1.0 - RUN * (i + 0.5);
    const y = -RISE * (i + 1);
    stair.steps.push(box(sx, 0.4, RUN, stairMat, 0, y - 0.2, z, false));
    // candles left burning on the steps, down to the water
    if (y > WATER + 0.06 && (i % 2 === 0 || rnd() < 0.35)) {
      const cx = (rnd() < 0.5 ? -1 : 1) * (sx / 2 - 0.08 - rnd() * 0.12);
      const cz = z + (rnd() - 0.5) * 0.1;
      candle(group, cx, y, cz, 0.05 + rnd() * 0.08, 0.26);
      stair.candles.push(new THREE.Vector3(cx, y, cz));
    }
  }
  const wellLen = 1.0 + STEPS * RUN;
  const drop = STEPS * RISE + 0.3;
  for (const s of [-1, 1]) {
    const wl = add(new THREE.Mesh(metricPlane(wellLen, H + drop, 1.4, 1.4), stoneMat));
    wl.rotation.y = s < 0 ? Math.PI / 2 : -Math.PI / 2;
    wl.position.set((s * sx) / 2, (H - drop) / 2, Z_END - wellLen / 2);
    stair.walls.push(wl);
  }
  const wellTop = add(new THREE.Mesh(metricPlane(sx, wellLen, 1.4, 1.4), stoneMat));
  wellTop.rotation.x = Math.PI / 2;
  wellTop.position.set(0, DOOR_H + 0.25, Z_END - wellLen / 2);
  // warm light climbing the stair and spilling through the gap
  const stairLight = pointLight(0, -0.9, Z_END - 2.6, 1.3, 9);
  const spill = pointLight(0.1, 1.0, Z_END - 0.5, 0.7, 5);

  /* ── the flooded cellar (refs/i14.jpeg, the flooded-steps still): a tall stone room under the house ── */
  const CEIL = DOOR_H + 0.25;
  const roomLen = Z_STAIR_END - Z_ROOM_END;
  const roomMid = (Z_STAIR_END + Z_ROOM_END) / 2;
  const roomH = CEIL - ROOM_Y;
  // the wall the stair comes through, either side of the well's opening
  for (const s2 of [-1, 1]) {
    const wseg = (ROOM_W - sx) / 2;
    const m = add(new THREE.Mesh(metricPlane(wseg, roomH, 1.4, 1.4), stoneMat));
    m.rotation.y = Math.PI;
    m.position.set(s2 * (sx / 2 + wseg / 2), ROOM_Y + roomH / 2, Z_STAIR_END);
  }
  for (const s2 of [-1, 1]) {
    const m = add(new THREE.Mesh(metricPlane(roomLen, roomH, 1.4, 1.4), stoneMat));
    m.rotation.y = s2 < 0 ? Math.PI / 2 : -Math.PI / 2;
    m.position.set((s2 * ROOM_W) / 2, ROOM_Y + roomH / 2, roomMid);
  }
  const endW = add(new THREE.Mesh(metricPlane(ROOM_W, roomH, 1.4, 1.4), stoneMat));
  endW.position.set(0, ROOM_Y + roomH / 2, Z_ROOM_END);
  const rFloor = add(new THREE.Mesh(metricPlane(ROOM_W, roomLen, 1.4, 1.4), stoneMat));
  rFloor.rotation.x = -Math.PI / 2;
  rFloor.position.set(0, ROOM_Y, roomMid);
  const rCeil = add(new THREE.Mesh(metricPlane(ROOM_W, roomLen, 1.4, 1.4), stoneMat));
  rCeil.rotation.x = Math.PI / 2;
  rCeil.position.set(0, CEIL, roomMid);
  // stone ribs of a vault across the ceiling (albedo.js hides them when it panels the cellar as a flooded corridor)
  const vault = [];
  for (let z = Z_STAIR_END - 2.2; z > Z_ROOM_END + 0.5; z -= 3.2) {
    const rib = add(new THREE.Mesh(new THREE.TorusGeometry(ROOM_W / 2 - 0.05, 0.16, 8, 32, Math.PI), stoneMat), true);
    rib.position.set(0, CEIL - ROOM_W / 2 + 0.4, z);
    rib.scale.y = (CEIL - (CEIL - ROOM_W / 2 + 0.4)) / (ROOM_W / 2 - 0.05);
    vault.push(rib);
    for (const s2 of [-1, 1]) vault.push(box(0.36, CEIL - ROOM_W / 2 + 0.4 - ROOM_Y, 0.36, stoneMat, (s2 * (ROOM_W / 2 - 0.18)), (ROOM_Y + CEIL - ROOM_W / 2 + 0.4) / 2, z));
  }
  // the water: black, still, a mirror (main.js gives it its own reflection pass)
  const rip = (() => {
    const N = 256, c = document.createElement('canvas');
    c.width = c.height = N;
    const ctx = c.getContext('2d'), img = ctx.createImageData(N, N);
    const h = new Float32Array(N * N);
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        let v = 0;
        for (let k = 1; k <= 4; k++) v += Math.sin(((x * (3 + k * 2) + y * (k * 3 - 1)) / N) * Math.PI * 2 + k) / k + Math.sin(((y * (2 + k * 3) - x * k) / N) * Math.PI * 2 + k * 1.7) / k;
        h[y * N + x] = v;
      }
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const dx = h[y * N + ((x + 1) % N)] - h[y * N + ((x + N - 1) % N)], dy = h[((y + 1) % N) * N + x] - h[((y + N - 1) % N) * N + x];
        const l = Math.hypot(dx * 0.15, dy * 0.15, 1), i = (y * N + x) * 4;
        img.data[i] = (-dx * 0.15 / l) * 127 + 128;
        img.data[i + 1] = (dy * 0.15 / l) * 127 + 128;
        img.data[i + 2] = (1 / l) * 127 + 128;
        img.data[i + 3] = 255;
      }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  })();
  const waterZ0 = Z_END - 1.0 - 17 * RUN + 0.1; // the first step below the surface
  const waterLen = waterZ0 - Z_ROOM_END;
  const waterMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.006, 0.0055, 0.005), roughness: 0.08, metalness: 0, normalMap: rip, normalScale: new THREE.Vector2(0.25, 0.25), transparent: true, opacity: 0.94 });
  const water = add(new THREE.Mesh(metricPlane(ROOM_W, waterLen, 3.0, 3.0), waterMat));
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, WATER, (waterZ0 + Z_ROOM_END) / 2);
  water.receiveShadow = false;
  // doors standing half under the water, as if the house had sunk round them
  const rnd2 = rng(41);
  const sunkLeafGeo = doorLeaf(0.95, 2.2, 0.05, true);
  const sunk = []; // albedo.js opens them onto the dream rooms
  for (const [x, z, ry] of [[-1.6, Z_STAIR_END - 3.2, 0.5], [1.7, Z_STAIR_END - 6.0, -0.35], [-1.2, Z_STAIR_END - 9.6, 0.2]]) {
    const g2 = new THREE.Group();
    g2.position.set(x, ROOM_Y - 0.1, z);
    g2.rotation.set((rnd2() - 0.5) * 0.18, ry, (rnd2() - 0.5) * 0.22);
    const lf = new THREE.Mesh(sunkLeafGeo, joinMat);
    lf.castShadow = lf.receiveShadow = true;
    g2.add(lf);
    // its frame, moulded on both faces like the house's own doors (a plain box here read as a dark slab
    // standing out above and beside the leaf)
    for (const back of [false, true]) {
      const fr = new THREE.Mesh(sideCaseGeo, joinMat);
      fr.receiveShadow = true;
      if (back) fr.rotation.y = Math.PI;
      fr.position.z = back ? -0.035 : 0.015;
      g2.add(fr);
    }
    group.add(g2);
    sunk.push({ group: g2, leaf: lf, x, z, ry });
  }
  // sealed letters floating on the water
  // old envelopes gone soft in the water (i16): stained, foxed and darkened at the edges, the flap's folds,
  // a few lines of faded ink showing through, and a red wax seal with a raised rim and a drip
  const letterTex = (() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 336;
    const x = c.getContext('2d');
    const R = rng(77);
    // paper, warmer and darker toward the edges
    const base = x.createRadialGradient(256, 168, 40, 256, 168, 330);
    base.addColorStop(0, '#cdb68c');
    base.addColorStop(0.7, '#a88f63');
    base.addColorStop(1, '#5e4a2f');
    x.fillStyle = base;
    x.fillRect(0, 0, 512, 336);
    // fibres and foxing
    for (let i = 0; i < 1400; i++) {
      x.fillStyle = `rgba(${70 + R() * 40},${50 + R() * 30},${25 + R() * 20},${R() * 0.07})`;
      x.fillRect(R() * 512, R() * 336, 1 + R() * 5, 1 + R() * 2);
    }
    for (let i = 0; i < 26; i++) {
      x.fillStyle = `rgba(110,72,30,${0.05 + R() * 0.12})`;
      x.beginPath();
      x.arc(R() * 512, R() * 336, 1 + R() * 4, 0, Math.PI * 2);
      x.fill();
    }
    // water stains: pale centres with dark tide lines
    for (let i = 0; i < 5; i++) {
      const cx = R() * 512, cy = R() * 336, r = 30 + R() * 90;
      const g = x.createRadialGradient(cx, cy, r * 0.6, cx, cy, r);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.85, 'rgba(70,45,20,0.18)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g;
      x.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    }
    // ink of the address, faded, showing through
    x.strokeStyle = 'rgba(40,28,18,0.22)';
    x.lineWidth = 2;
    for (let l = 0; l < 4; l++) {
      x.beginPath();
      let px = 70 + R() * 30;
      const py = 210 + l * 24;
      x.moveTo(px, py);
      while (px < 330 + R() * 90) {
        px += 6 + R() * 10;
        x.lineTo(px, py + (R() - 0.5) * 6);
      }
      x.stroke();
    }
    // the flap's folds, dark where they crease
    x.strokeStyle = 'rgba(55,38,20,0.45)';
    x.lineWidth = 3;
    x.beginPath();
    x.moveTo(0, 0);
    x.lineTo(256, 188);
    x.lineTo(512, 0);
    x.stroke();
    x.strokeStyle = 'rgba(255,240,210,0.12)';
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(0, 4);
    x.lineTo(256, 192);
    x.lineTo(512, 4);
    x.stroke();
    // the seal: a drip, the body with a soft highlight, a raised rim, a pressed mark
    x.fillStyle = '#5e0805';
    x.beginPath();
    x.ellipse(268, 222, 9, 22, 0.2, 0, Math.PI * 2);
    x.fill();
    const sg = x.createRadialGradient(248, 178, 4, 256, 188, 40);
    sg.addColorStop(0, '#b3271c');
    sg.addColorStop(0.6, '#7d0e08');
    sg.addColorStop(1, '#3d0403');
    x.fillStyle = sg;
    x.beginPath();
    for (let k = 0; k <= 24; k++) {
      const a = (k / 24) * Math.PI * 2, r = 38 + (R() - 0.5) * 6;
      k ? x.lineTo(256 + Math.cos(a) * r, 188 + Math.sin(a) * r) : x.moveTo(256 + Math.cos(a) * r, 188 + Math.sin(a) * r);
    }
    x.fill();
    x.strokeStyle = 'rgba(25,0,0,0.6)';
    x.lineWidth = 4;
    x.beginPath();
    x.arc(256, 188, 25, 0, Math.PI * 2);
    x.stroke();
    x.strokeStyle = 'rgba(255,150,120,0.25)';
    x.lineWidth = 2;
    x.beginPath();
    x.arc(255, 186, 25, Math.PI * 1.1, Math.PI * 1.7);
    x.stroke();
    x.fillStyle = 'rgba(30,0,0,0.5)';
    x.font = 'italic bold 28px Georgia, serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText('S', 256, 190);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  })();
  const letterMat = new THREE.MeshStandardMaterial({ map: letterTex, roughness: 0.8, color: new THREE.Color(0.6, 0.56, 0.5), side: THREE.DoubleSide });
  // a little curled by the wet: the corners lift
  const letterGeo = new THREE.PlaneGeometry(0.24, 0.16, 10, 6);
  {
    const p = letterGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) / 0.12, v = p.getY(i) / 0.08;
      p.setZ(i, 0.006 * (u * u * u * u) + 0.004 * (v * v) * Math.abs(u));
    }
    letterGeo.computeVertexNormals();
  }
  const letters = [];
  for (let i = 0; i < 16; i++) {
    const m = new THREE.Mesh(letterGeo, letterMat);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = rnd2() * Math.PI * 2;
    m.position.set((rnd2() - 0.5) * (ROOM_W - 0.8), WATER + 0.004, waterZ0 - 0.6 - rnd2() * (waterLen - 1.5));
    m.receiveShadow = true;
    m.userData.seed = rnd2() * 10;
    group.add(m);
    letters.push(m);
  }
  // candles floating among the letters, each on a small wooden float
  const floatMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.05, 0.035, 0.02), roughness: 0.8 });
  const floats = [];
  for (let i = 0; i < 8; i++) {
    const g3 = new THREE.Group();
    g3.position.set((rnd2() - 0.5) * (ROOM_W - 1.2), WATER, waterZ0 - 0.8 - rnd2() * (waterLen - 3));
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.02, 12), floatMat);
    g3.add(disc);
    candle(g3, 0, 0.01, 0, 0.04 + rnd2() * 0.05, 0.22);
    g3.userData.seed = rnd2() * 10;
    group.add(g3);
    floats.push(g3);
  }
  for (const k of [0, 3]) {
    const l = pointLight(floats[k].position.x, WATER + 0.3, floats[k].position.z, 0.35, 7);
    floats[k].userData.light = l;
  }

  // a single far light across the water: someone holding up their own small light (the Other, level 2)
  const farLight = new THREE.PointLight(new THREE.Color(0.72, 0.82, 1.0), 0.9, 20, 2);
  farLight.position.set(0.3, WATER + 1.2, Z_ROOM_END + 3.2);
  group.add(farLight);
  const farHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(1.6, 1.8, 2.2), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  farHalo.scale.setScalar(0.22);
  farHalo.position.copy(farLight.position);
  group.add(farHalo);
  const farCore = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 4.4, 5), fog: false }));
  farCore.position.copy(farLight.position);
  group.add(farCore);

  /** Swings the narrow door open: k 0 (ajar) .. 1 (wide). */
  const openDoor = (k) => (hinge.rotation.y = 1.12 + (1.95 - 1.12) * k);

  /** Height of the floor under a point: corridor, landing, the steps, the cellar floor. */
  const ext = { floorAt: null, collide: null }; // level II (albedo.js) adds its own places: the hall beyond the cellar, the dream rooms
  const floorAt = (x, z) => {
    const e = ext.floorAt?.(x, z);
    if (e != null) return e;
    if (z > Z_END - 1.0) return 0;
    const i = Math.floor((Z_END - 1.0 - z) / RUN);
    if (i < STEPS) return -RISE * (i + 1);
    return ROOM_Y;
  };

  /** A door jolts in its frame as if slammed from the other side, and stays shut. */
  const slamDoor = (d) => {
    d.shake = 1;
    d.shut = true;
  };
  let lastT = 0;
  /** Candle flicker: flames lean and stretch, their lights breathe. */
  const update = (t) => {
    const dt = Math.min(0.05, Math.max(0, t - lastT));
    lastT = t;
    for (const d of doors) {
      if (d.shake <= 0) continue;
      d.shake = Math.max(0, d.shake - dt * 2.2);
      // it jumps out of its frame toward the corridor and settles back, rattling
      d.leaf.position.x = d.x0 - d.side * 0.035 * d.shake * Math.abs(Math.sin(d.shake * 26));
    }
    // the letters ride the water; the far light breathes
    for (const m of letters) {
      m.position.y = WATER + 0.004 + 0.004 * Math.sin(t * 0.9 + m.userData.seed);
      m.rotation.z += 0.0006 * Math.sin(m.userData.seed);
    }
    for (const f of floats) {
      f.position.y = WATER + 0.004 * Math.sin(t * 0.9 + f.userData.seed);
      f.position.x += 0.0004 * Math.sin(t * 0.13 + f.userData.seed);
      f.userData.light?.position.set(f.position.x, WATER + 0.3, f.position.z);
    }
    farLight.intensity = 0.9 * (1 + 0.15 * Math.sin(t * 0.7)) * (farLight.userData.dim ?? 1);
    farHalo.position.copy(farLight.position);
    farCore.position.copy(farLight.position);
    farHalo.material.opacity = 0.22 * (farLight.userData.dim ?? 1);
    rip.offset.set(t * 0.004, t * 0.0025);
    for (const f of flames) {
      const a = Math.sin(t * 11.3 + f.seed) * Math.sin(t * 5.1 + f.seed * 1.7);
      const b = Math.sin(t * 2.3 + f.seed * 0.6);
      f.mesh.scale.y = 0.02 * (1 + 0.14 * a + 0.06 * b);
      f.mesh.rotation.z = 0.12 * Math.sin(t * 3.1 + f.seed) + 0.05 * a;
      f.halo.scale.setScalar(f.haloSize * (1 + 0.1 * a));
    }
    for (const l of lights) {
      const s = l.userData.seed;
      l.intensity = l.userData.base * (1 + 0.07 * Math.sin(t * 9.7 + s) * Math.sin(t * 4.3 + s * 2.1) + 0.04 * Math.sin(t * 1.7 + s));
    }
  };

  /**
   * Keeps the walker inside. Until the door is open the gap is shut; after, it leads through the
   * narrow door, down the well of the stair and into the cellar.
   */
  const gap = DOOR_W / 2 - 0.16;
  const collide = (p, r = 0.32, doorOpen = false) => {
    if (ext.collide?.(p, r)) return;
    if (!doorOpen || p.z > Z_END + r) {
      p.x = Math.max(-W / 2 + r, Math.min(W / 2 - r, p.x));
      // the end wall, except through the gap of the open door
      const through = doorOpen && Math.abs(p.x) < gap;
      if (!through) p.z = Math.max(Z_END + r, p.z);
      p.z = Math.min(Z_BACK - r, p.z);
      return;
    }
    if (p.z > Z_STAIR_END) {
      const half = p.z > Z_END - 0.12 ? gap : sx / 2 - 0.25;
      p.x = Math.max(-half, Math.min(half, p.x));
    } else {
      // the cellar; you can only enter it from the well's opening
      p.x = Math.max(-ROOM_W / 2 + r, Math.min(ROOM_W / 2 - r, p.x));
      p.z = Math.max(Z_ROOM_END + r + 0.3, p.z);
    }
  };

  return { group, floor, floorMat, wallMat, ceilMat, joinMat, panelMat, chandeliers, candle, flameMat, water, waterMat, openDoor, floorAt, doors, slamDoor, letters, farLight, lights, flames, stairLight, spill, update, collide, brassMat, woodMat, sconces, stoneMat, ext, cellar: { endW, sunk, CEIL, waterZ0, metricPlane, vault }, stair: { ...stair, sx, wellLen, drop } };
};
