import * as THREE from 'three';

/*
 * The cave of level III as it was built and baked in Blender (../blender/rubedo, scripts/cave.py and export.py):
 * the shell, the furnace, the stones, the roots, the two stairs. rubedo.js decides what happens in it.
 *
 * Its light is baked in three parts and coloured here, so that it can change with the work: the day in the opening
 * (black, white, red, gold with the sun), the fire, and the gold of the sack. The flask's light is real and casts
 * shadows. The rock is two photographs (Poly Haven, CC0) laid on from three sides by position, as in Blender, over
 * the sculpted relief kept in a normal map. Files: assets/rubedo/ (CREDITS.md there).
 */
const DIR = './assets/rubedo/';
// what has no photograph on it: its own colour (with the rock's grain)
const PLAIN = { roots: [0.042, 0.029, 0.018], gravel: [0.075, 0.058, 0.042], pottery: [0.24, 0.108, 0.055], bones: [0.2, 0.16, 0.11] };

const COMMON = /* glsl */ `
  uniform vec3 uDay, uFire, uGold, uAt; uniform sampler2D rockD, rockN, groundD;
  varying vec3 vCv; varying vec3 vCn;
  uniform sampler2D noiseT;
  // (r: soft fractal noise, g: finer; a few looks at a tiling picture, instead of sums of hashes)
  float cfbm(vec3 p) { return 0.5 * (texture2D(noiseT, p.xy * 0.061 + p.z * 0.019).r + texture2D(noiseT, p.yz * 0.053 + 0.37 + p.x * 0.023).r); }
  float cnoise(vec3 p) { return texture2D(noiseT, p.xy * 0.047 + p.z * vec2(0.031, 0.057)).g; }
  // Blender's box mapping, in its own axes (x, forward, up), so the photographs lie where they lay when the relief was made
  vec2 bx(vec3 q, vec3 n) { return vec2(n.x < 0.0 ? 1.0 - q.y : q.y, q.z); }
  vec2 by(vec3 q, vec3 n) { return vec2(n.y > 0.0 ? 1.0 - q.x : q.x, q.z); }
  vec2 bz(vec3 q, vec3 n) { return vec2(n.z > 0.0 ? 1.0 - q.y : q.y, q.x); }
  vec3 chsv(vec3 c, float s, float v) { float l = dot(c, vec3(0.3, 0.59, 0.11)); return max(vec3(0.0), mix(vec3(l), c, s)) * v; }
`;

/** A mesh as export.py packs it (positions 16 bit, normals 8, uv 16, colour and light 8) into a BufferGeometry. */
export const readMesh = (b, m) => {
  const g = new THREE.BufferGeometry();
  const p16 = new Uint16Array(b, m.pos, m.n * 4), p = new Float32Array(m.n * 3);
  for (let i = 0; i < m.n; i++) for (let k = 0; k < 3; k++) p[i * 3 + k] = m.lo[k] + (p16[i * 4 + k] / 65535) * m.sc[k];
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  g.setAttribute('normal', new THREE.InterleavedBufferAttribute(new THREE.InterleavedBuffer(new Int8Array(b, m.nrm, m.n * 4), 4), 3, 0, true));
  if (m.uv != null) {
    let a = new THREE.BufferAttribute(new Uint16Array(b, m.uv, m.n * 2), 2, true);
    if (m.usc) {
      // (in metres: spread back out)
      const f = new Float32Array(m.n * 2);
      for (let i = 0; i < m.n; i++) for (let k = 0; k < 2; k++) f[i * 2 + k] = m.ulo[k] + a.array[i * 2 + k] / 65535 * m.usc[k];
      a = new THREE.BufferAttribute(f, 2);
    }
    g.setAttribute('uv', a);
    g.setAttribute('uv1x', a);
  }
  if (m.alb != null) g.setAttribute('alb', new THREE.InterleavedBufferAttribute(new THREE.InterleavedBuffer(new Uint8Array(b, m.alb, m.n * 4), 4), 3, 0, true));
  if (m.col != null) g.setAttribute('lit', new THREE.InterleavedBufferAttribute(new THREE.InterleavedBuffer(new Uint8Array(b, m.col, m.n * 4), 4), 3, 0, true));
  g.setIndex(new THREE.BufferAttribute(m.i32 ? new Uint32Array(b, m.idx, m.tris * 3) : new Uint16Array(b, m.idx, m.tris * 3), 1));
  g.computeBoundingSphere();
  return g;
};

export const buildCave = ({ group, at, glowTex, lite = false, renderer }) => {
  const root = new THREE.Group();
  root.position.copy(at);
  root.visible = false;
  group.add(root);
  const tl = new THREE.TextureLoader();
  const aniso = Math.min(lite ? 2 : 8, renderer?.capabilities?.getMaxAnisotropy?.() ?? 4);
  const tex = (f, { srgb = false, tile = false } = {}) => {
    const t = tl.load(DIR + f);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    if (tile) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = aniso;
    if (!tile) t.flipY = true;
    return t;
  };
  // a tiling fractal noise, drawn once
  const noiseT = (() => {
    const N = 256, d = new Uint8Array(N * N * 4);
    const lat = (n, seed) => Float32Array.from({ length: n * n }, (_, i) => { const v = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453; return v - Math.floor(v); });
    const oct = (f0, count, seed) => {
      const out = new Float32Array(N * N);
      let amp = 0.5, f = f0;
      for (let o = 0; o < count; o++, amp *= 0.5, f *= 2) {
        const g = lat(f, seed + o);
        for (let y = 0; y < N; y++)
          for (let x = 0; x < N; x++) {
            const u0 = (x / N) * f, v0 = (y / N) * f, i = Math.floor(u0), j = Math.floor(v0), a = u0 - i, b = v0 - j, su = a * a * (3 - 2 * a), sv = b * b * (3 - 2 * b);
            const G = (p, q) => g[(q % f) * f + (p % f)];
            out[y * N + x] += amp * ((G(i, j) * (1 - su) + G(i + 1, j) * su) * (1 - sv) + (G(i, j + 1) * (1 - su) + G(i + 1, j + 1) * su) * sv);
          }
      }
      return out;
    };
    const A = oct(8, 5, 1), B = oct(16, 2, 9);
    // (averaging two looks flattens it: spread it back round its middle)
    for (let i = 0; i < N * N; i++) (d[i * 4] = 255 * Math.min(1, Math.max(0, 0.5 + (A[i] - 0.485) * 1.45)), (d[i * 4 + 1] = 255 * Math.min(1, Math.max(0, 0.5 + (B[i] - 0.375) * 1.5))), (d[i * 4 + 3] = 255));
    const t = new THREE.DataTexture(d, N, N);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.needsUpdate = true;
    return t;
  })();
  const u = {
    noiseT: { value: noiseT },
    uDay: { value: new THREE.Color(0, 0, 0) }, uFire: { value: new THREE.Color(0, 0, 0) }, uGold: { value: new THREE.Color(0, 0, 0) }, uAt: { value: at.clone() },
    rockD: { value: tex('rock_d.jpg', { srgb: true, tile: true }) }, rockN: { value: tex('rock_n.jpg', { tile: true }) }, groundD: { value: tex('ground_d.jpg', { srgb: true, tile: true }) },
    time: { value: 0 }, burn: { value: 0 },
  };

  /** kind: 'shell' (light and relief from maps) or 'small' (light in the vertices). rough: how the stone takes a glint. */
  const rockMat = (kind, { map = null, lm = [1, 1, 1], plain = null, brick = false, full = false } = {}) => {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.93, metalness: 0 });
    const shell = kind === 'shell';
    m.defines = { ...m.defines };
    if (shell) m.defines.CAVE_SHELL = '';
    const liteHere = lite && !full;
    if (liteHere) m.defines.CAVE_LITE = '';
    if (plain) m.defines.CAVE_PLAIN = '';
    if (brick) m.defines.CAVE_BRICK = '';
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, u, { uLm: { value: new THREE.Vector3(...lm) }, uPlain: { value: plain ?? new THREE.Color() }, litMap: { value: map?.lit ?? null }, nrmMap: { value: map?.nrm ?? null } });
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>\nvarying vec3 vCv; varying vec3 vCn;\n#ifdef CAVE_SHELL\nvarying vec2 vLuv; attribute vec2 uv1x;\n#else\nvarying vec3 vLit; attribute vec3 lit;\n#endif\n#ifdef CAVE_BRICK\nvarying vec3 vAlb; attribute vec3 alb;\n#endif`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>\n#ifdef CAVE_BRICK\nvAlb = alb;\n#endif\nvCv = (modelMatrix * vec4(position, 1.0)).xyz; vCn = normalize(mat3(modelMatrix) * normal);\n#ifdef CAVE_SHELL\nvLuv = uv1x;\n#else\nvLit = lit;\n#endif`);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>\n${COMMON}\nuniform vec3 uLm, uPlain;\n#ifdef CAVE_SHELL\nvarying vec2 vLuv; uniform sampler2D litMap, nrmMap;\n#else\nvarying vec3 vLit;\n#endif\n#ifdef CAVE_BRICK\nvarying vec3 vAlb;\n#endif\nvec3 gN;`)
        .replace('#include <map_fragment>', /* glsl */ `
          vec3 lp = vCv - uAt; vec3 q = vec3(lp.x, -lp.z, lp.y);
          #ifdef CAVE_SHELL
            vec3 nb = normalize(texture2D(nrmMap, vLuv).xyz * 2.0 - 1.0);
          #else
            vec3 gn = normalize(vCn); vec3 nb = vec3(gn.x, -gn.z, gn.y);
          #endif
          vec3 tw = pow(abs(nb), vec3(5.0)); tw /= tw.x + tw.y + tw.z;
          #ifdef CAVE_BRICK
          vec3 rq = q * 3.1;
          #else
          vec3 rq = q * 0.45;
          #endif
          vec3 rd = texture2D(rockD, bx(rq, nb)).rgb * tw.x + texture2D(rockD, by(rq, nb)).rgb * tw.y + texture2D(rockD, bz(rq, nb)).rgb * tw.z;
          #ifndef CAVE_LITE
            // the photograph's own relief, added to the sculpted one
            vec3 dx = texture2D(rockN, bx(rq, nb)).xyz * 2.0 - 1.0, dy = texture2D(rockN, by(rq, nb)).xyz * 2.0 - 1.0, dz = texture2D(rockN, bz(rq, nb)).xyz * 2.0 - 1.0;
            vec3 det = tw.x * vec3(0.0, (nb.x < 0.0 ? -1.0 : 1.0) * dx.x, dx.y) + tw.y * vec3((nb.y > 0.0 ? -1.0 : 1.0) * dy.x, 0.0, dy.y) + tw.z * vec3(dz.y, (nb.z > 0.0 ? -1.0 : 1.0) * dz.x, 0.0);
            nb = normalize(nb + det * 0.9);
          #endif
          gN = normalize(vec3(nb.x, nb.z, -nb.y));
          float big = cfbm(q * 0.55 + 3.0);
          #ifdef CAVE_BRICK
            // its own colour (brick by brick, soot and ash), with the stone's grain in it
            float gl = dot(rd, vec3(0.3, 0.59, 0.11));
            diffuseColor.rgb = vAlb * vAlb * 0.4 * (0.45 + 2.6 * gl) * (0.8 + 0.4 * cfbm(q * 40.0));
          #elif defined(CAVE_PLAIN)
            diffuseColor.rgb = uPlain * (0.45 + 1.3 * rd.r * 2.2) * (0.6 + 0.8 * cfbm(q * 9.0));
          #else
            vec3 rc = chsv(rd, 0.82, 0.8);
            rc = mix(rc, rc * vec3(0.34, 0.27, 0.19), smoothstep(0.42, 0.66, big));
            // the floor: earth and ash, burnt here and there
            float flo = smoothstep(0.45, 0.8, nb.z) * (1.0 - smoothstep(0.55, 1.25, q.z + big * 0.5));
            vec3 gc = chsv(rd, 0.4, 0.42);
            gc = mix(gc, chsv(texture2D(groundD, q.xy * 0.5).rgb, 0.4, 0.6), smoothstep(0.5, 0.62, cfbm(q * 1.1 + 9.0)) * 0.55);
            float ash = (1.0 - smoothstep(0.5, 2.6, length(q.xy))) * smoothstep(0.42, 0.62, cfbm(q * 2.6 + 1.7));
            gc = mix(gc, vec3(0.30, 0.28, 0.25), ash * 0.6);
            rc = mix(rc, gc, flo);
            // dust on every ledge
            rc = mix(rc, vec3(0.16, 0.14, 0.115), smoothstep(0.62, 0.92, nb.z) * smoothstep(0.35, 0.65, cfbm(q * 7.0)) * 0.4);
            diffuseColor.rgb = rc;
          #endif
        `)
        .replace('#include <normal_fragment_maps>', 'normal = normalize((viewMatrix * vec4(gN, 0.0)).xyz);')
        .replace('#include <lights_fragment_end>', /* glsl */ `#include <lights_fragment_end>
          #ifdef CAVE_SHELL
            vec3 L3 = texture2D(litMap, vLuv).rgb; L3 = L3 * L3 * uLm;
          #else
            vec3 L3 = vLit * vLit * uLm;
          #endif
          reflectedLight.indirectDiffuse += diffuseColor.rgb * (L3.r * uDay + L3.g * uFire + L3.b * uGold);`);
    };
    m.customProgramCacheKey = () => `st2g-cave-${kind}-${liteHere}-${!!plain}-${brick}`;
    m.userData.args = [kind, { map, lm, plain, brick }];
    return m;
  };

  /** Coals: charred, the fire showing in thin cracks, ash on them. */
  const coalMat = (lm) => {
    const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.012, 0.011, 0.01), roughness: 0.95 });
    m.defines = { ...m.defines };
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, u, { uLm: { value: new THREE.Vector3(...lm) } });
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCv; varying vec3 vCn; varying vec3 vLit; attribute vec3 lit;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvCv = (modelMatrix * vec4(position, 1.0)).xyz; vCn = normalize(mat3(modelMatrix) * normal); vLit = lit;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>\n${COMMON}\nuniform vec3 uLm; uniform float time, burn; varying vec3 vLit;`)
        .replace('#include <map_fragment>', 'float cn = cfbm(vCv * 17.0); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.10, 0.09, 0.08), smoothstep(0.5, 0.66, cn) * 0.5 * smoothstep(0.1, 0.8, vCn.y));')
        .replace('#include <emissivemap_fragment>', /* glsl */ `
          { vec3 p = vCv * 46.0 + 0.9 * cnoise(vCv * 90.0);
            float cr = (1.0 - smoothstep(0.0, 0.055, abs(cnoise(p) - 0.5))) * (0.35 + 0.65 * smoothstep(0.38, 0.62, cnoise(vCv * 150.0)));
            float heart = smoothstep(0.42, 0.7, cnoise(vCv * 9.0 + vec3(0.0, time * 0.15, 0.0)));
            float hot = (cr * 0.8 + 0.2 * smoothstep(0.55, 0.85, cnoise(p * 0.5)) * (0.3 + 0.7 * smoothstep(0.35, 0.65, cnoise(vCv * 120.0)))) * heart * (0.75 + 0.25 * sin(time * 1.7 + vCv.x * 30.0));
            totalEmissiveRadiance += vec3(1.0, 0.16, 0.025) * hot * burn * 0.35; }`)
        .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\nvec3 L3 = vLit * vLit * uLm;\nreflectedLight.indirectDiffuse += diffuseColor.rgb * (L3.r * uDay + L3.g * uFire + L3.b * uGold);');
    };
    m.customProgramCacheKey = () => 'st2g-cave-coal';
    return m;
  };

  const _sm = new THREE.Color();
  const out = { root, u, ready: false, top: 0.948, loose: [], meshes: {} };
  const lean = [], twinOf = new Map();
  let wantRich = false;
  const richNow = () => {
    for (const mesh of lean) mesh.material = twinOf.get(mesh.material) ?? mesh.material;
    lean.length = 0;
    if (out.meshes.gravel) out.meshes.gravel.visible = true;
    for (const m of mist ?? []) m.visible = true;
  };
  /** A phone that has shown it is fast enough: the cave as on a computer (the rock's relief, the gravel, all the smoke). */
  out.rich = () => {
    if (!lite || wantRich) return;
    wantRich = true;
    if (out.ready) richNow();
  };
  out.load = Promise.all([fetch(DIR + 'mesh.json').then((r) => r.json()), fetch(DIR + 'mesh.bin').then((r) => r.arrayBuffer())]).then(([j, b]) => {
    out.top = j.top;
    const maps = { lit: tex('cave_l.jpg'), nrm: tex('cave_n.jpg') };
    root.userData.pics = [noiseT, u.rockD.value, u.rockN.value, u.groundD.value, maps.lit, maps.nrm]; // (main.js, warmUp)
    const shellM = rockMat('shell', { map: maps, lm: j.lm.shell });
    for (const m of j.meshes) {
      let mat;
      if (m.name.startsWith('shell')) mat = shellM;
      else if (m.name === 'furnace') {
        mat = rockMat('small', { lm: m.lm, brick: true });
        mat.side = mat.shadowSide = THREE.DoubleSide; // its chamber is single sheets: no light through them
      }
      else if (m.name === 'coals') mat = coalMat(m.lm);
      else if (m.name === 'loose') {
        out.looseGeo = readMesh(b, m);
        out.looseMat = rockMat('small', { lm: [0.05, 0.02, 0.02] });
        continue;
      } else mat = rockMat('small', { lm: m.lm, plain: PLAIN[m.name] ? new THREE.Color(...PLAIN[m.name]) : null });
      if (m.name === 'stairs') mat.side = THREE.DoubleSide;
      const mesh = new THREE.Mesh(readMesh(b, m), mat);
      // a lighter cave on a phone: no gravel, and the rock without its photograph's fine relief, until the phone has
      // shown it is fast enough (out.rich, from main.js)
      if (lite && m.name === 'gravel') mesh.visible = false;
      if (lite && mat.userData.args) lean.push(mesh);
      mesh.name = m.name;
      mesh.receiveShadow = true;
      mesh.raycast = () => {}; // too many triangles for the eye's rays: they meet rubedo.js's plain shapes
      mesh.castShadow = m.name === 'furnace'; // (the stones' own shadows are in the baked light)
      root.add(mesh);
      out.meshes[m.name] = mesh;
    }
    if (lite) {
      // the full rock for each, made now and kept unseen so that it is made ready with the rest (main.js, warmUp)
      for (const mesh of lean) {
        const m = mesh.material;
        if (!twinOf.has(m)) {
          const [kind, args] = m.userData.args, t = rockMat(kind, { ...args, full: true });
          t.side = m.side;
          t.shadowSide = m.shadowSide;
          twinOf.set(m, t);
          const keep = new THREE.Mesh(new THREE.PlaneGeometry(0.001, 0.001), t);
          keep.visible = false;
          keep.raycast = () => {};
          root.add(keep);
        }
      }
    }
    out.ready = true;
    if (wantRich) richNow();
    root.visible = true;
    return out;
  });

  /* the flames: three sheets in the furnace's mouth, turned to you, each its own noise */
  const flameU = { time: u.time, k: { value: 0 } };
  const flameMat = (seed) =>
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, uniforms: { ...flameU, seed: { value: seed } },
      vertexShader: /* glsl */ `varying vec2 vU; void main() { vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float time, k, seed; varying vec2 vU;
        float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
        float fb(vec2 p) { return 0.5 * n(p) + 0.27 * n(p * 2.1 + 3.1) + 0.14 * n(p * 4.3 + 7.7) + 0.07 * n(p * 8.9); }
        void main() {
          vec2 p = vec2(vU.x * 2.0 - 1.0, vU.y);
          float t = time * 1.15 + seed * 9.0;
          p.x += (fb(vec2(p.x * 1.5 + seed, p.y * 2.0 - t * 0.9)) - 0.5) * 0.55 * p.y;
          float a = fb(vec2(p.x * 2.6 + seed * 5.0, p.y * 1.5 - t)) ;
          float b = fb(vec2(p.x * 6.0 - seed * 3.0, p.y * 2.6 - t * 1.9));
          // tongues: broad at the foot, thin and broken at the tip
          float body = a * 1.55 + b * 0.42 - abs(p.x) * 1.05 - p.y * mix(1.1, 0.8, k) - 0.24;
          float f = smoothstep(0.0, 0.24, body) * smoothstep(0.0, 0.22, vU.y) * (1.0 - smoothstep(0.75, 1.0, vU.y)) * (1.0 - smoothstep(0.72, 1.0, abs(p.x)));
          vec3 c = mix(vec3(0.8, 0.055, 0.004), vec3(1.0, 0.27, 0.035), smoothstep(0.02, 0.34, body));
          c = mix(c, vec3(1.0, 0.5, 0.14), smoothstep(0.4, 0.85, body));
          gl_FragColor = vec4(c * pow(f, 1.5) * k * 0.10, 1.0);
        }`,
    });
  const flames = [[0, 0.36, 0.56, 0.6, 0.11], [-0.07, 0.24, 0.46, 0.54, 0.63], [0.08, 0.1, 0.42, 0.46, 0.37]].map(([x, z, w, h, seed], i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h).translate(0, h / 2, 0), flameMat(seed));
    m.position.set(x, 0.0, z);
    m.renderOrder = 4 + i;
    root.add(m);
    m.raycast = () => {};
    return m;
  });
  // sparks that leave the mouth now and then
  const SP = lite ? 10 : 26;
  const sg = new THREE.BufferGeometry(), sp = new Float32Array(SP * 3);
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const sm = new THREE.PointsMaterial({ map: glowTex, color: new THREE.Color(0.9, 0.26, 0.05), size: 0.016, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const sparks = new THREE.Points(sg, sm);
  sparks.frustumCulled = false;
  root.add(sparks);

  /* smoke that climbs from behind the furnace and drifts up past the opening, lit by the day and the fire */
  const smokeU = { time: u.time, k: { value: 0 }, col: { value: new THREE.Color() }, noiseT: u.noiseT };
  const smoke = (lite ? [[0, -0.75, 2.6, 3.6]] : [[0.1, -0.7, 2.4, 3.4], [-0.2, -1.5, 3.6, 4.4]]).map(([x, z, w, h], i) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h).translate(0, h / 2, 0),
      new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, uniforms: { ...smokeU, seed: { value: i * 0.37 } },
        vertexShader: 'varying vec2 vU; void main() { vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: /* glsl */ `uniform float time, k, seed; uniform vec3 col; uniform sampler2D noiseT; varying vec2 vU;
          void main() {
            vec2 p = vec2(vU.x - 0.5, vU.y);
            p.x += (texture2D(noiseT, vec2(p.y * 0.35 - time * 0.011 + seed, seed)).r - 0.5) * 0.5 * p.y;
            float n = texture2D(noiseT, vec2(p.x * 0.55 + seed, p.y * 0.42 - time * 0.022)).r;
            float m = texture2D(noiseT, vec2(p.x * 1.3 - seed, p.y * 0.95 - time * 0.041)).r;
            float body = smoothstep(0.42, 0.78, n * 0.65 + m * 0.4) * (1.0 - smoothstep(0.08 + 0.22 * p.y, 0.22 + 0.28 * p.y, abs(p.x)));
            gl_FragColor = vec4(col * body * k * smoothstep(0.0, 0.18, vU.y) * (1.0 - smoothstep(0.45, 1.0, vU.y)), 1.0);
          }`,
      }),
    );
    m.position.set(x, 0.5, z);
    m.raycast = () => {};
    root.add(m);
    return m;
  });

  /*
   * The cave's own smoke (the owner, 2026-11-26, after 06-furnace-1..4): soft banks of it hang through the chamber, roll
   * up past the furnace and drift across the opening. Each is a sheet turned to the eye about its upright; its light is
   * the fire below it, the day, and the burning ring behind it where it lies between you and the ring.
   */
  const mistU = {
    time: u.time, noiseT: u.noiseT, day: { value: new THREE.Color() }, fire: { value: new THREE.Color() }, ring: { value: new THREE.Color() },
    firePos: { value: new THREE.Vector3() }, sunPos: { value: new THREE.Vector3() },
  };
  // [x, y, z, width, height, density, seed, kind] in the furnace's own space; kind 0 a bank, 1 rising, 2 low on the ground
  const MIST = [
    [0.15, 0.55, -1.0, 3.4, 5.2, 0.62, 0.11, 1],
    [-1.3, 1.5, -4.0, 6.5, 4.2, 0.5, 0.37, 0],
    [1.5, 2.2, -5.3, 6.5, 4.6, 0.46, 0.61, 0],
    [0.25, 3.0, -6.4, 5.5, 3.6, 0.24, 0.83, 0], // (thin: the ring shows through it)
    [-3.3, 0.0, -2.1, 4.2, 3.6, 0.5, 0.29, 0],
    [3.4, 0.0, -2.7, 4.2, 3.6, 0.5, 0.53, 0],
    [-2.0, 0.0, 1.0, 5.0, 1.7, 0.42, 0.71, 2],
    [2.2, 0.0, 0.4, 5.0, 1.7, 0.42, 0.19, 2],
    [-0.6, 0.0, -2.6, 6.0, 1.5, 0.4, 0.47, 2],
  ];
  const mist = MIST.map(([x, y, z, w, h, dens, seed, kind], i) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h).translate(0, h / 2, 0),
      new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, fog: false,
        blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
        uniforms: { ...mistU, size: { value: new THREE.Vector2(w, h) }, dens: { value: dens }, seed: { value: seed }, kind: { value: kind } },
        vertexShader: /* glsl */ `varying vec2 vU; varying vec3 vW;
          void main() { vU = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: /* glsl */ `
          uniform float time, dens, seed, kind; uniform vec2 size; uniform sampler2D noiseT;
          uniform vec3 day, fire, ring, firePos, sunPos; varying vec2 vU; varying vec3 vW;
          float N(vec2 p) { return texture2D(noiseT, p).r; }
          void main() {
            // metres across the sheet, so every sheet has the same grain; it drifts sideways and climbs
            vec2 p = vU * size;
            float climb = kind > 0.5 && kind < 1.5 ? 0.09 : 0.025;
            vec2 q = p * 0.11 + vec2(seed * 3.7 - time * 0.008, seed - time * climb);
            vec2 warp = vec2(N(q * 0.8 + vec2(0.0, time * 0.006)), N(q * 0.8 + vec2(0.37, -time * 0.005))) - 0.5;
            q += warp * 0.55;
            float n = N(q) * 0.55 + N(q * 2.3 + 0.5) * 0.3 + texture2D(noiseT, q * 4.7).g * 0.15;
            // a bank: thick in its middle, eaten away at the edges; on the ground it lies low
            vec2 c = (vU - vec2(0.5, kind > 1.5 ? 0.0 : 0.5)) * vec2(2.0, kind > 1.5 ? 1.0 : 2.0);
            float shape = 1.0 - smoothstep(0.35, 1.0, length(c) + (n - 0.5) * 0.7);
            float d = smoothstep(0.5, 0.86, n) * shape * dens;
            d *= smoothstep(0.0, kind > 1.5 ? 0.05 : 0.14, vU.y); // never a line on the floor
            if (d < 0.003) discard;
            // its light: the fire under it, the day, and the ring when it lies between you and the ring
            vec3 V = normalize(vW - cameraPosition);
            float df = distance(vW, firePos);
            float back = pow(max(0.0, dot(V, normalize(sunPos - vW))), 22.0);
            float nearRing = 1.0 / (1.0 + 0.12 * dot(vW - sunPos, vW - sunPos));
            vec3 L = day * 0.018 + vec3(0.0035, 0.003, 0.0025) + fire / (1.0 + 0.45 * df * df) + ring * (1.1 * back + 0.09 * nearRing);
            // thin smoke lets the light through and shines at its edges; thick smoke is darker in its heart
            L *= 0.55 + 0.9 * (1.0 - smoothstep(0.0, 0.6, d));
            float a = clamp(d, 0.0, 0.7);
            gl_FragColor = vec4(L * a, a);
          }`,
      }),
    );
    m.position.set(x, y, z);
    m.raycast = () => {};
    m.renderOrder = 2;
    m.visible = !lite || [0, 1, 2, 6].includes(i); // (a phone: four, until it has shown it can take nine)
    root.add(m);
    return m;
  });

  /* the sky beyond the opening, and the haze that hangs in it */
  const sky = new THREE.Mesh(new THREE.CircleGeometry(1.72, 48), new THREE.MeshBasicMaterial({ color: 0x000000, fog: false }));
  sky.position.set(0.25, 4.1, -9.8);
  const haze = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x000000, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  haze.position.set(0.25, 4.1, -6.4);
  haze.scale.set(8.5, 8.5, 1);
  root.add(sky, haze);

  /** day, fire, gold: 0..1 and their colours; heat: how hard the fire burns. */
  out.update = (dt, t, { day, dayColor, fire, heat, gold, camera, ring = 0, ringColor = null }) => {
    u.time.value = t;
    // the smoke: lit, and turned to the eye
    mistU.day.value.copy(dayColor).multiplyScalar(day);
    mistU.fire.value.setRGB(1.0, 0.36, 0.1).multiplyScalar(fire * (0.06 + 0.1 * heat));
    mistU.ring.value.copy(ringColor ?? _sm.setRGB(1.0, 0.4, 0.1)).multiplyScalar(ring * 0.1);
    mistU.firePos.value.set(at.x, at.y + 0.35, at.z + 0.3);
    mistU.sunPos.value.set(at.x + 0.25, at.y + 4.15, at.z - 9.4);
    for (const m of mist) m.rotation.y = Math.atan2(camera.position.x - (at.x + m.position.x), camera.position.z - (at.z + m.position.z));
    const fl = 1 + 0.10 * Math.sin(t * 9.1) * Math.sin(t * 4.7) + 0.05 * Math.sin(t * 2.3);
    u.uDay.value.copy(dayColor).multiplyScalar(day);
    u.uFire.value.setRGB(1.0, 0.36, 0.10).multiplyScalar(fire * (0.12 + 0.2 * heat) * fl);
    u.uGold.value.setRGB(1.0, 0.52, 0.12).multiplyScalar(gold * 0.3);
    u.burn.value = Math.min(1.4, fire * (0.6 + 0.6 * heat));
    flameU.k.value = fire * (0.55 + 0.55 * heat);
    smokeU.k.value = fire * (0.5 + 0.5 * heat);
    smokeU.col.value.copy(dayColor).multiplyScalar(0.02).add(_sm.setRGB(0.006, 0.0025, 0.0008).multiplyScalar(fire));
    for (const m of smoke) m.visible = fire > 0.02;
    sky.material.color.copy(dayColor).multiplyScalar(0.022 * day);
    haze.material.color.copy(dayColor).multiplyScalar(0.016 * day).add(_sm.copy(mistU.ring.value).multiplyScalar(0.05 * Math.max(0, ring - 0.8))); // (the opening glows as the ring burns)
    const yaw = Math.atan2(camera.position.x - at.x, camera.position.z - at.z);
    for (const f of flames) {
      f.visible = fire > 0.02;
      f.rotation.y = Math.max(-0.7, Math.min(0.7, yaw));
    }
    sparks.visible = fire > 0.1;
    sm.opacity = Math.min(1, fire);
    for (let i = 0; i < SP; i++) {
      const s = (i * 0.618) % 1, f = (t * (0.16 + 0.2 * s) + s * 7) % 1;
      sp[i * 3] = (s - 0.5) * 0.3 + 0.16 * Math.sin(t * 1.3 + i * 2.4) * f;
      sp[i * 3 + 1] = 0.12 + f * (0.5 + 0.9 * ((i * 0.37) % 1));
      sp[i * 3 + 2] = 0.34 + 0.35 * f + 0.1 * Math.sin(i * 5.1 + t);
      if (f > 0.5 + 0.5 * ((i * 0.71) % 1)) sp[i * 3 + 1] = -9;
    }
    sg.attributes.position.needsUpdate = true;
  };
  return out;
};
