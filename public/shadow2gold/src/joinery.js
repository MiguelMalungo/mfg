import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/*
 * Joinery: the doors and the panelling as real shapes instead of flat boards with a painted
 * relief (owner, 2026-11-16: "the wood and doors are a bit too low poly"). Everything is built
 * from a few kinds of part (boards, half-round beads, a turned knob) and merged, so a whole door
 * is one mesh and the panelling of a wall is one instanced mesh.
 *
 * A panel here is what a joiner makes: a frame of stiles (upright) and rails (across), a thinner
 * field set back inside it, and a bead of moulding round the field where it meets the frame.
 * Sizes in metres. Wood grain runs along each part (uv.y is along the grain).
 */

const GRAIN = 0.9; // metres of wood per repeat of the texture

/** Gives a part its texture coordinates: projected flat on each face, grain along `along` ('x', 'y' or 'z'). */
const grain = (geo, along) => {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const p = g.attributes.position, n = g.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  const off = Math.random() * 7; // each part cut from a different stretch of board
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    const l = along === 'x' ? x : along === 'y' ? y : z; // along the grain
    // across the grain: whichever of the other two axes lies in this face
    const c = along === 'x' ? (ay > az ? z : y) : along === 'y' ? (ax > az ? z : x) : ax > ay ? y : x;
    uv[i * 2] = c / GRAIN + off;
    uv[i * 2 + 1] = l / GRAIN + off * 0.37;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
};

const board = (w, h, d, x, y, z, along) => {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return grain(g, along);
};
/** A half-round bead lying along x or y, its flat side on the plane z = z0, bulging toward +Z. */
const bead = (len, r, x, y, z0, along) => {
  // a cylinder stands along Y; this half of it (theta from -90° to 90°) is the half that faces +Z
  const g = new THREE.CylinderGeometry(r, r, len, 10, 1, true, -Math.PI / 2, Math.PI);
  if (along === 'x') g.rotateZ(Math.PI / 2);
  g.translate(x, y, z0);
  return grain(g, along);
};

/**
 * One framed panel: the field set back, a bead round it. The opening is w × h, centred on (cx, cy);
 * `face` is the z of the frame's front, `back` how far the field sits behind it.
 */
const panel = (parts, w, h, cx, cy, face, back = 0.014, r = 0.009) => {
  parts.push(board(w, h, 0.006, cx, cy, face - back - 0.003, 'y'));
  const z = face - back;
  parts.push(bead(h, r, cx - w / 2 + r * 0.9, cy, z, 'y'), bead(h, r, cx + w / 2 - r * 0.9, cy, z, 'y'));
  parts.push(bead(w, r, cx, cy - h / 2 + r * 0.9, z, 'x'), bead(w, r, cx, cy + h / 2 - r * 0.9, z, 'x'));
  // the field is raised in the middle, as fielded panels are
  if (w > 0.2 && h > 0.25) parts.push(board(w - 0.11, h - 0.11, 0.006, cx, cy, z + 0.001, 'y'));
};

/**
 * A door leaf, w × h × t, centred on x and standing on y = 0, its faces at z = ±t/2: two stiles,
 * three rails, a muntin, four panels (two tall above the lock rail, two short below). With
 * `both` the back is panelled too (a door that swings open); otherwise it is left plain.
 */
export const doorLeaf = (w, h, t = 0.045, both = false) => {
  const parts = [];
  const stile = 0.115, top = 0.115, lock = 0.17, bottom = 0.21, muntin = 0.095, lockY = 0.98;
  const face = t / 2;
  parts.push(board(stile, h, t, -w / 2 + stile / 2, h / 2, 0, 'y'), board(stile, h, t, w / 2 - stile / 2, h / 2, 0, 'y'));
  const inner = w - 2 * stile;
  parts.push(board(inner, top, t, 0, h - top / 2, 0, 'x'), board(inner, lock, t, 0, lockY, 0, 'x'), board(inner, bottom, t, 0, bottom / 2, 0, 'x'));
  const y0 = bottom, y1 = lockY - lock / 2, y2 = lockY + lock / 2, y3 = h - top;
  parts.push(board(muntin, y1 - y0, t, 0, (y0 + y1) / 2, 0, 'y'), board(muntin, y3 - y2, t, 0, (y2 + y3) / 2, 0, 'y'));
  const pw = (inner - muntin) / 2;
  const panels = [];
  for (const s of [-1, 1]) {
    const cx = s * (muntin / 2 + pw / 2);
    panel(panels, pw, y1 - y0, cx, (y0 + y1) / 2, face);
    panel(panels, pw, y3 - y2, cx, (y2 + y3) / 2, face);
  }
  parts.push(...panels);
  if (both) parts.push(...panels.map((g) => g.clone().rotateY(Math.PI)));
  const geo = mergeGeometries(parts);
  geo.computeBoundingSphere();
  return geo;
};

/** The case round a door in a wall: stepped architrave with a bead on its inner edge, plinth blocks, a head. */
export const doorCase = (w, h) => {
  const parts = [];
  const a = 0.11; // architrave width
  for (const s of [-1, 1]) {
    const x = s * (w / 2 + a / 2);
    parts.push(board(a, h + a, 0.03, x, (h + a) / 2, 0.015, 'y'));
    parts.push(board(a * 0.55, h + a, 0.02, x + s * a * 0.2, (h + a) / 2, 0.04, 'y'));
    parts.push(bead(h, 0.011, s * (w / 2 + 0.012), h / 2, 0.03, 'y'));
    parts.push(board(a + 0.02, 0.2, 0.05, x, 0.1, 0.025, 'y')); // plinth block
  }
  parts.push(board(w + 2 * a, a, 0.03, 0, h + a / 2, 0.015, 'x'));
  parts.push(board(w + 2 * a + 0.06, 0.035, 0.055, 0, h + a + 0.0175, 0.0275, 'x')); // a small cornice over the head
  parts.push(board(w + 2 * a, a * 0.55, 0.02, 0, h + a * 0.72, 0.04, 'x'));
  parts.push(bead(w, 0.011, 0, h + 0.012, 0.03, 'x'));
  const geo = mergeGeometries(parts);
  geo.computeBoundingSphere();
  return geo;
};

/** A turned brass knob on its rose, with a keyhole plate under it. Stands out along +Z from z = 0. */
export const doorKnob = () => {
  const profile = [[0.0, 0.062], [0.012, 0.061], [0.022, 0.055], [0.027, 0.045], [0.026, 0.035], [0.018, 0.027], [0.009, 0.022], [0.008, 0.012], [0.013, 0.008], [0.03, 0.006], [0.033, 0.003], [0.033, 0.0]];
  const knob = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 20);
  knob.rotateX(Math.PI / 2);
  const plate = new THREE.BoxGeometry(0.03, 0.07, 0.004);
  plate.translate(0, -0.11, 0.002);
  const hole = new THREE.CylinderGeometry(0.005, 0.005, 0.005, 10);
  hole.rotateX(Math.PI / 2);
  hole.translate(0, -0.1, 0.0045);
  const geo = mergeGeometries([knob.toNonIndexed(), plate.toNonIndexed(), hole.toNonIndexed()].map((g) => (g.deleteAttribute('uv'), g)));
  return geo;
};

/**
 * One bay of wainscot, `bay` wide and `h` high, standing on y = 0 against the plane z = 0 and
 * facing +Z: a stile at the left, a rail under the chair rail and one over the skirting, the
 * field (the wall's own boards show through) and a bead round it.
 */
export const wainscotBay = (bay, h, skirting = 0.16) => {
  const parts = [];
  const stile = 0.1, rail = 0.09, t = 0.02;
  const y0 = skirting, y1 = h - 0.05;
  parts.push(board(stile, y1 - y0, t, -bay / 2 + stile / 2, (y0 + y1) / 2, t / 2, 'y'));
  parts.push(board(bay - stile, rail, t, stile / 2, y0 + rail / 2, t / 2, 'x'), board(bay - stile, rail, t, stile / 2, y1 - rail / 2, t / 2, 'x'));
  const w = bay - stile, hh = y1 - y0 - 2 * rail, cx = stile / 2, cy = (y0 + y1) / 2, r = 0.009;
  parts.push(bead(hh, r, cx - w / 2 + r * 0.9, cy, 0.004, 'y'), bead(hh, r, cx + w / 2 - r * 0.9, cy, 0.004, 'y'));
  parts.push(bead(w, r, cx, cy - hh / 2 + r * 0.9, 0.004, 'x'), bead(w, r, cx, cy + hh / 2 - r * 0.9, 0.004, 'x'));
  parts.push(board(w - 0.13, hh - 0.13, 0.008, cx, cy, 0.004, 'y')); // the raised field
  const geo = mergeGeometries(parts);
  geo.computeBoundingSphere();
  return geo;
};

/**
 * Shading where surfaces meet (a cheap stand-in for baked light): a material given this goes
 * darker toward the floor and the ceiling and under the chair rail, by its height in the world.
 * `H` is the ceiling height, `rail` the height of the chair rail (0 for none).
 */
export const cornerShade = (mat, H, rail = 0, key = 'shade') => {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    prev?.(sh, r);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vWorldY;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWorldY = (modelMatrix * vec4(position, 1.0)).y;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vWorldY;')
      .replace(
        '#include <opaque_fragment>',
        `// light does not reach into corners: darker toward the floor, toward the ceiling, and just under the rail
        float cs = 1.0 - 0.55 * (1.0 - smoothstep(0.0, 0.3, vWorldY)) - 0.5 * smoothstep(${(H - 0.5).toFixed(2)}, ${H.toFixed(2)}, vWorldY);
        ${rail > 0 ? `cs -= 0.3 * smoothstep(${(rail - 0.12).toFixed(2)}, ${(rail - 0.02).toFixed(2)}, vWorldY) * (1.0 - step(${rail.toFixed(2)}, vWorldY));` : ''}
        outgoingLight *= clamp(cs, 0.0, 1.0);
        #include <opaque_fragment>`,
      );
  };
  mat.customProgramCacheKey = () => 'st2g-' + key;
  return mat;
};
