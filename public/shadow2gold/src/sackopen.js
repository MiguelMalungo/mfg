import * as THREE from 'three';
import { readMesh } from './cave.js';

/*
 * The sack opened (level III, trailer frame 23): cloth fallen open over a heap of small kept things, made in Blender
 * (../blender/rubedo/scripts/sackopen.py: a cloth simulation; heap.py: the things). It takes the tied sack's place in
 * the burst of light when it is untied, its mouth toward you. The cloth is the sack's own hessian.
 */
const DIR = './assets/rubedo/';
export const buildOpenSack = ({ parent, glowTex, clothMat, lite = false }) => {
  const root = new THREE.Group();
  root.visible = false;
  parent.add(root);
  const u = { k: { value: 0 }, time: { value: 0 } };
  const load = (f) => Promise.all([fetch(DIR + f + '.json').then((r) => r.json()), fetch(DIR + f + '.bin').then((r) => r.arrayBuffer())]).then(([j, b]) => readMesh(b, j));
  const out = { root, ready: false };
  out.load = Promise.all([load('sackopen'), load('heap')]).then(([cloth, heap]) => {
    const c = new THREE.Mesh(cloth, clothMat());
    c.castShadow = c.receiveShadow = true;
    // the things: their own colours, warm light coming up from between them
    const m = new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0.1 });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 alb; varying vec3 vAlb; varying vec3 vP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvAlb = alb * alb; vP = position;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vAlb; varying vec3 vP; uniform float k, time;')
        .replace('#include <color_fragment>', 'diffuseColor.rgb = pow(vAlb, vec3(1.3)) * vec3(0.4, 0.31, 0.2);') // (old things, not new toys: the pale ones held down)
        .replace('#include <emissivemap_fragment>', `
          // light from below, between them: it breathes, and gilds what is not gold
          float deep = smoothstep(0.75, 0.05, vP.y) * 0.6 + 0.4 * smoothstep(0.2, -0.5, normal.y);
          float b = 0.8 + 0.2 * sin(time * 1.3 + vP.x * 4.0) * sin(time * 0.9 + vP.z * 5.0);
          totalEmissiveRadiance += (vec3(0.016, 0.0065, 0.0008) + vAlb * vec3(0.07, 0.034, 0.007)) * k * b * (0.3 + deep);`);
    };
    m.customProgramCacheKey = () => 'st2g-heap';
    const h = new THREE.Mesh(heap, m);
    h.receiveShadow = true;
    h.castShadow = !lite;
    for (const x of [c, h]) x.raycast = () => {};
    root.add(c, h);
    out.ready = true;
    // the wooden horse, on top of them
    load('horse').then((g) => {
      const tl = new THREE.TextureLoader(), map = tl.load(DIR + 'horse_d.jpg');
      map.colorSpace = THREE.SRGBColorSpace;
      const hm = new THREE.MeshStandardMaterial({ map, normalMap: tl.load(DIR + 'horse_n.jpg'), roughness: 0.6, color: new THREE.Color(0.5, 0.34, 0.2) });
      const horse = new THREE.Mesh(g, hm);
      horse.scale.setScalar(1.35);
      horse.position.set(-0.1, 0.5, 0.13);
      horse.rotation.set(0.25, 0.9, -0.2);
      horse.castShadow = horse.receiveShadow = true;
      horse.raycast = () => {};
      root.add(horse);
    });
  });
  // glints: points of gold that come and go on the heap
  const N = lite ? 14 : 34, gp = new Float32Array(N * 3), gs = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const r = (n) => { const v = Math.sin(i * 91.7 + n * 47.3) * 43758.5; return v - Math.floor(v); };
    const a = (r(1) - 0.5) * 2.6, e = 0.15 + 0.95 * r(2);
    gp.set([Math.sin(a) * Math.cos(e) * 0.62, 0.16 + 0.5 * Math.sin(e), -0.2 + Math.cos(a) * Math.cos(e) * 0.5], i * 3);
    gs[i] = r(3) * 6.28;
  }
  const gg = new THREE.BufferGeometry();
  gg.setAttribute('position', new THREE.BufferAttribute(gp, 3));
  gg.setAttribute('seed', new THREE.BufferAttribute(gs, 1));
  const gm = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { ...u, map: { value: glowTex }, px: { value: 1 } },
    vertexShader: 'attribute float seed; uniform float time, px; varying float vB; void main() { vB = pow(max(0.0, sin(time * (0.8 + 0.3 * sin(seed)) + seed)), 10.0); vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = px * (0.05 + 0.04 * vB) / max(0.2, -mv.z); }',
    fragmentShader: 'uniform sampler2D map; uniform float k; varying float vB; void main() { gl_FragColor = vec4(vec3(1.0, 0.72, 0.28) * texture2D(map, gl_PointCoord).r * vB * k * 0.9, 1.0); }',
  });
  const glints = new THREE.Points(gg, gm);
  glints.frustumCulled = false;
  root.add(glints);
  /** k 0..1: how far it has opened. */
  out.update = (t, k) => {
    u.time.value = t;
    u.k.value = k;
    gm.uniforms.px.value = innerHeight * Math.min(devicePixelRatio, 1.5);
  };
  return out;
};
