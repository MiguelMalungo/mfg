import * as THREE from 'three';
import { burlap, tfbm, rng } from './textures.js';

/*
 * The long bag (refs/v08.jpg, refs/v06.jpg): a huge burlap sack, tied at the neck, lumpy with what
 * was put in it, and breathing. A child drags it down the corridor by a rope (child.js); when the
 * child lets go it stays where it stopped. A red toy drum has fallen out where it first lay.
 * (The bag is Robert Bly's image, not Jung's.)
 *
 * The sack itself moves (`bag`); the drum stays put; the rope is rebuilt each frame between the
 * sack's neck and wherever its end is (a hand, or the floor).
 */

export const buildSack = (scene, at) => {
  const bag = new THREE.Group();
  bag.position.copy(at);
  scene.add(bag);

  const RX = 0.78, RY = 0.7; // half-width and half-height of the body, metres
  // hard things inside push the cloth out in places: corners, a wheel, a head
  const rnd = rng(23);
  const bumps = Array.from({ length: 9 }, () => {
    const a = rnd() * Math.PI * 2, y = -0.55 + rnd() * 0.95;
    const d = new THREE.Vector3(Math.cos(a) * Math.sqrt(1 - y * y), y, Math.sin(a) * Math.sqrt(1 - y * y));
    return { d, w: 0.18 + rnd() * 0.16, h: 0.08 + rnd() * 0.12 };
  });
  // a UV sphere: indexed, so the normals come out smooth; its seam is turned to the back
  const SEG_W = 128, SEG_H = 84;
  const geo = new THREE.SphereGeometry(1, SEG_W, SEG_H);
  const pos = geo.attributes.position;
  const uv0 = geo.attributes.uv;
  const uv = new Float32Array(pos.count * 2);
  const breathe = new Float32Array(pos.count);
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const a01 = uv0.getX(i);
    const ang = Math.PI - a01 * Math.PI * 2;
    const y = v.y;
    const r = Math.hypot(v.x, v.z);
    // soft lumps, and the hard bumps of what is inside
    const lump = tfbm(a01, y * 0.25 + 0.5, 5, 4) - 0.5;
    const small = tfbm(a01 + 0.37, y * 0.25 + 0.5, 14, 3) - 0.5;
    let hard = 0;
    for (const b of bumps) {
      const dd = 1 - v.dot(b.d);
      hard += b.h * Math.exp(-(dd * dd) / (b.w * b.w * 0.25));
    }
    // deep creases run down from the tie, where the cloth is pulled, and fade into the belly
    const crease =
      (Math.sin(ang * 9 + Math.sin(y * 3.0) * 1.4) * 0.07 + Math.sin(ang * 17 + 2.0 + y * 2.0) * 0.03) * Math.max(0, y + 0.25) +
      Math.abs(Math.sin(ang * 5 + y * 4.0)) * -0.035 * Math.max(0, 0.4 - Math.abs(y));
    let rr = r * (1 + lump * 0.5 + small * 0.14 + crease + hard);
    let yy = y;
    // it sags: wider near the floor, and flat where it rests
    rr *= 1 + 0.22 * Math.max(0, -y) * Math.max(0, -y);
    if (yy < -0.82) yy = -0.82 - (-0.82 - yy) * 0.12;
    // the top is gathered into a neck and tied; the cloth above the tie flares in folds
    const t = Math.max(0, (y - 0.5) / 0.5); // 0 at the shoulder, 1 at the very top
    if (t > 0) {
      const neck = 0.16;
      const folds = 1 + 0.26 * Math.sin(ang * 11) * t + 0.12 * Math.sin(ang * 23 + 1.0) * t;
      const pinch = Math.pow(Math.sin(Math.min(1, t * 1.25) * Math.PI * 0.5), 0.7);
      const target = neck * folds * (1 + 1.6 * Math.max(0, t - 0.8) * 5 * 0.25);
      rr = rr * (1 - pinch) + target * pinch;
      yy = 0.5 + t * 0.75; // the neck stands up above the body
    }
    const k = r > 1e-5 ? rr / r : 0;
    pos.setXYZ(i, v.x * k * RX, yy * RY, v.z * k * RX);
    uv[i * 2] = a01 * 10;
    uv[i * 2 + 1] = yy * 2.8;
    breathe[i] = Math.max(0, 1 - t * 1.3) * (0.4 + 0.6 * Math.max(0, Math.cos(ang - 0.6)));
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute('breathe', new THREE.BufferAttribute(breathe, 1));
  geo.computeVertexNormals();
  // the seam's two columns are the same points: share their normals so no line shows
  {
    const nor = geo.attributes.normal;
    for (let iy = 0; iy <= SEG_H; iy++) {
      const a = iy * (SEG_W + 1), b = a + SEG_W;
      const nx = nor.getX(a) + nor.getX(b), ny = nor.getY(a) + nor.getY(b), nz = nor.getZ(a) + nor.getZ(b);
      const l = Math.hypot(nx, ny, nz) || 1;
      nor.setXYZ(a, nx / l, ny / l, nz / l);
      nor.setXYZ(b, nx / l, ny / l, nz / l);
    }
  }

  const maps = burlap(512, 44);
  const u = { breath: { value: 0 }, time: { value: 0 } };
  const mat = new THREE.MeshStandardMaterial({ ...maps, roughness: 1, normalScale: new THREE.Vector2(2.6, 2.6), color: new THREE.Color(0.85, 0.78, 0.68), side: THREE.DoubleSide });
  const patch = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float breathe; uniform float breath; uniform float time;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        // something inside draws breath: the whole side swells, and a slow shift moves under the cloth
        float stir = sin(position.y * 5.0 + time * 0.6) * sin(position.x * 4.0 - time * 0.4);
        transformed += normal * breathe * (breath * 0.045 + stir * 0.006);`,
      );
  };
  mat.onBeforeCompile = patch;
  mat.customProgramCacheKey = () => 'st2g-sack-v2';
  // the cloth darkens where it creases and where it has been dragged along the floor
  mat.onBeforeCompile = (sh) => {
    patch(sh);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vH;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvH = position.y;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vH;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= mix(0.45, 1.0, smoothstep(-0.56, -0.3, vH));');
  };
  const body = new THREE.Mesh(geo, mat);
  body.position.y = 0.82 * RY - 0.01;
  body.castShadow = body.receiveShadow = true;
  // the shadow must breathe with it
  body.customDistanceMaterial = new THREE.MeshDistanceMaterial();
  body.customDistanceMaterial.onBeforeCompile = patch;
  bag.add(body);

  /* the rope: wound round the neck, then to its end */
  const ropeMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.2, 0.15, 0.085), roughness: 0.95, normalMap: maps.normalMap, normalScale: new THREE.Vector2(1.5, 1.5) });
  const neckY = body.position.y + (0.5 + 0.22 * 0.75) * RY;
  for (const dy of [0, 0.028, -0.026]) {
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.15 * RX + 0.012, 0.014, 8, 28), ropeMat);
    coil.rotation.x = Math.PI / 2 + (dy ? 0.08 : -0.05);
    coil.position.y = neckY + dy;
    coil.castShadow = true;
    bag.add(coil);
  }
  const rope = new THREE.Mesh(new THREE.BufferGeometry(), ropeMat);
  rope.castShadow = rope.receiveShadow = true;
  rope.frustumCulled = false;
  scene.add(rope);
  const neckLocal = new THREE.Vector3(0.0, neckY, -0.13);
  const neck = new THREE.Vector3();
  const lastEnd = new THREE.Vector3(Infinity, 0, 0);
  /**
   * Lays the rope from the neck to `end` (world). `held`: true while a hand pulls it taut,
   * false once dropped: it then lies on the floor in loose curves.
   */
  const setRope = (end, held) => {
    bag.updateMatrixWorld(true);
    neck.copy(neckLocal).applyMatrix4(bag.matrixWorld);
    if (end.distanceToSquared(lastEnd) < 1e-6 && !held) return;
    lastEnd.copy(end);
    const pts = [neck.clone()];
    const N = 10;
    const span = neck.distanceTo(end);
    for (let i = 1; i < N; i++) {
      const f = i / N;
      const p = neck.clone().lerp(end, f);
      if (held) {
        // nearly taut: a slight sag, and lying on the floor for the first stretch
        p.y = Math.max(0.016, p.y - Math.sin(f * Math.PI) * 0.06 * span);
      } else {
        // dropped: down to the floor near the sack, then wandering
        p.y = f < 0.12 ? neck.y * (1 - f / 0.12) + 0.016 * (f / 0.12) : 0.016;
        p.x += Math.sin(f * 9.0 + span) * 0.18 * Math.sin(f * Math.PI);
      }
      pts.push(p);
    }
    pts.push(end.clone());
    rope.geometry.dispose();
    rope.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 70, 0.014, 6);
  };

  /* the red toy drum, on its side where it rolled out (it stays when the sack is dragged away) */
  const drum = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.42, 0.02, 0.015), roughness: 0.5 });
  const gold = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.4, 0.27, 0.09), roughness: 0.4, metalness: 1 });
  const skin = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.5, 0.44, 0.33), roughness: 0.7 });
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.15, 28, 1, true), red);
  drum.add(shell);
  for (const s of [-1, 1]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.131, 0.009, 8, 28), gold);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = s * 0.075;
    drum.add(rim);
    const head = new THREE.Mesh(new THREE.CircleGeometry(0.128, 28), skin);
    head.rotation.x = (-s * Math.PI) / 2;
    head.position.y = s * 0.076;
    drum.add(head);
  }
  const zig = [];
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    zig.push(new THREE.Vector3(Math.cos(a) * 0.133, i % 2 ? 0.066 : -0.066, Math.sin(a) * 0.133));
  }
  drum.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(zig, true, 'catmullrom', 0.05), 96, 0.003, 5, true), gold));
  drum.traverse((o) => o.isMesh && (o.castShadow = o.receiveShadow = true));
  drum.position.set(at.x + 0.98, 0.132, at.z + 0.55);
  drum.rotation.set(Math.PI / 2, 0, 0.5);
  scene.add(drum);

  let lurch = 0;
  /**
   * t: time. calm 0..1: it holds its breath (you are beside it). drag: metres per second it is being
   * pulled this frame; it lurches forward in heaves, tipping and settling.
   */
  const update = (t, calm = 0, drag = 0) => {
    u.time.value = t;
    // a slow breath in, a pause, a longer breath out; it holds its breath when you come close
    const ph = (t * 0.22) % 1;
    const b = ph < 0.4 ? Math.sin((ph / 0.4) * Math.PI * 0.5) : Math.cos(((ph - 0.4) / 0.6) * Math.PI * 0.5);
    u.breath.value += (b * (1 - calm) - u.breath.value) * 0.08;
    lurch += (Math.min(1, drag * 3) - lurch) * 0.1;
    // tipped toward the pull, squashed a little as it scrapes
    body.rotation.x = -0.1 * lurch;
    body.scale.set(1 + 0.03 * lurch, 1 - 0.04 * lurch, 1 + 0.02 * lurch);
  };
  return { group: bag, bag, body, drum, update, setRope, u, radius: RX * 1.12, neck };
};
