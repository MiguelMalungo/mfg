import * as THREE from 'three';

/*
 * The gallery (episodes 2 and 3: projection, anima and animus; refs/i13a.jpeg).
 *
 * Two statues face each other across the first stretch of the corridor: a goddess holding up a
 * torch (the anima) and a god on a tall spear (the animus). They were made in Blender from the
 * scanned people (blender/statues.py): posed in three.js, smoothed to marble, robes from a cloth
 * simulation, a laurel crown each.
 *
 * From a distance both shine gold: the gold of what you have put on them, the inner opposite seen
 * in someone else, "the one". Stand before one and hold your light on its face, and the gold flows
 * back into your flask in sparks: plain marble is left, a figure, not a god.
 * Nothing here is required. Each one taken back stays taken back.
 */

const LOOK = 0.955; // how squarely you must look (cosine)
const NEAR = 2.9; // and from how close (metres, eye to face)
const HOLD = 1.8; // seconds of holding to take one back

// the two figures: which side of the corridor, and how far along it
const PLACES = [
  { side: -1, z: -5.6, who: 'goddess' },
  { side: 1, z: -8.9, who: 'god' },
];

/*
 * The statues are museum scans from Sketchfab (CC BY, credited in assets/statues/CREDITS.md):
 * goddess = Venus de Milo, god = Apollo Belvedere. Prepared in Blender (blender/scans/statues.blend).
 * File: uint32 vertex count, uint32 index count, uint32 has-uv, float32 positions (three.js axes, feet at 0,
 * facing +Z), float32 normals, [float32 uvs], uint32 indices.
 */
const NORMAL_MAPS = { god: './assets/statues/god-normal.jpg' };
const loadStatue = async (who) => {
  const buf = await (await fetch(`./assets/statues/${who}.bin`)).arrayBuffer();
  const [nv, ni, hasUV] = new Uint32Array(buf, 0, 3);
  const g = new THREE.BufferGeometry();
  let o = 12;
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(buf, o, nv * 3), 3));
  o += nv * 12;
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(buf, o, nv * 3), 3));
  o += nv * 12;
  if (hasUV) {
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(buf, o, nv * 2), 2));
    o += nv * 8;
  }
  g.setIndex(new THREE.BufferAttribute(new Uint32Array(buf, o, ni), 1));
  g.computeBoundingSphere();
  return g;
};

/** A warm, candlelit surround for the gold to reflect: dark panelling, pale ceiling, a few flames. */
const goldEnvironment = (renderer) => {
  const w = 256, h = 128, c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#5a4630');
  g.addColorStop(0.45, '#2a1d12');
  g.addColorStop(0.55, '#140d07');
  g.addColorStop(1, '#3a2614');
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
  for (let i = 0; i < 9; i++) {
    const r = x.createRadialGradient((i / 9) * w + 10, h * 0.32, 0, (i / 9) * w + 10, h * 0.32, 14);
    r.addColorStop(0, 'rgba(255,220,150,1)');
    r.addColorStop(1, 'rgba(255,160,60,0)');
    x.fillStyle = r;
    x.fillRect(0, 0, w, h);
  }
  const t = new THREE.CanvasTexture(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromEquirectangular(t).texture;
  pm.dispose();
  return env;
};

/**
 * places: where the statues stand (default: the two in the first stretch of the corridor, as before 2026-11-17).
 * A place may give x, y (the pedestal's foot), face (a direction) and column: { from } (a column up from that height).
 */
export const buildGallery = (scene, people, house, glowTex, W, renderer, places = PLACES) => {
  const env = renderer ? goldEnvironment(renderer) : null;
  const group = new THREE.Group();
  scene.add(group);
  const plinthMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.05, 0.045, 0.04), roughness: 0.7 });
  const capMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.13, 0.12, 0.11), roughness: 0.5 });
  const items = [];
  const marble = new THREE.Color(0.5, 0.48, 0.43), goldC = new THREE.Color(0.86, 0.54, 0.15);

  for (const pl of places) {
    const x = pl.x ?? pl.side * (W / 2 - 0.5);
    const face = pl.face ?? new THREE.Vector3(-pl.side, 0, 0.5).normalize(); // into the corridor, turned toward the start
    const holder = new THREE.Group();
    holder.position.set(x, pl.y ?? 0, pl.z);
    if (pl.column) {
      // a tall column up out of the water, fluted by its segments
      const h = (pl.y ?? 0) - pl.column.from;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, h, 24), capMat);
      col.position.y = -h / 2;
      col.castShadow = col.receiveShadow = true;
      holder.add(col);
    }
    holder.rotation.y = Math.atan2(face.x, face.z);
    group.add(holder);
    // a stepped pedestal
    const P = 0.5;
    for (const [w, h, y] of [[0.86, 0.08, 0.04], [0.74, P - 0.14, 0.08 + (P - 0.14) / 2], [0.84, 0.06, P - 0.03]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), h > 0.1 ? plinthMat : capMat);
      m.position.y = y;
      m.castShadow = m.receiveShadow = true;
      holder.add(m);
    }
    const mat = new THREE.MeshPhysicalMaterial({ color: goldC.clone(), roughness: 0.24, metalness: 1, emissive: new THREE.Color(0.5, 0.3, 0.08), emissiveIntensity: 0.012, envMap: env, envMapIntensity: 0.22 });
    const statue = new THREE.Mesh(new THREE.BufferGeometry(), mat);
    statue.position.y = P;
    statue.castShadow = statue.receiveShadow = true;
    holder.add(statue);
    loadStatue(pl.who).then((g) => (statue.geometry = g));
    if (NORMAL_MAPS[pl.who]) {
      // the scan's own fine detail (curls, folds, the laurel), baked to a normal map
      new THREE.TextureLoader().load(NORMAL_MAPS[pl.who], (t) => {
        t.flipY = false; // glTF UVs
        t.anisotropy = 8;
        mat.normalMap = t;
        mat.normalScale.set(0.5, -0.5); // y flipped as GLTFLoader does without tangents; halved, or the curls glitter under your light
        mat.needsUpdate = true;
      });
    }
    // it lights the wall and the floor round it, softly, as if it were the source of the light
    const glow = new THREE.PointLight(new THREE.Color(1.0, 0.72, 0.36), 0.7, 6, 2);
    // behind and above the head, so it washes the wall like a nimbus and only rims the metal (in front it blew the chest out)
    glow.position.set(0, P + 2.25, -0.3);
    glow.userData.base = 0.7;
    glow.userData.seed = pl.z;
    holder.add(glow);
    house.lights.push(glow); // so the haze and the floor's mirror see it too
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(1.0, 0.7, 0.3), transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    halo.scale.set(1.5, 2.8, 1);
    halo.position.set(0, P + 1.35, -0.42); // on the wall behind, not over the body
    holder.add(halo);
    // where you look to hold your light on it: the face
    const head = new THREE.Object3D();
    head.position.set(0, P + 1.72, 0.06);
    holder.add(head);
    items.push({ kind: 'statue', who: pl.who, mat, statue, glow, halo, head, w: 0, done: false, proj: 1 });
  }

  /* what flows out of them into your flask: gold sparks (the dark stream is kept for later figures) */
  const NP = 360;
  const makeStream = (color, blending, size) => {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(NP * 3), a = new Float32Array(NP);
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('alpha', new THREE.BufferAttribute(a, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: { tex: { value: glowTex }, col: { value: color }, px: { value: innerHeight }, size: { value: size } },
      transparent: true,
      depthWrite: false,
      blending,
      vertexShader: /* glsl */ `attribute float alpha; uniform float px; uniform float size; varying float vA;
        void main() { vA = alpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = px * size / max(-mv.z, 0.05); }`,
      fragmentShader: /* glsl */ `uniform sampler2D tex; uniform vec3 col; varying float vA;
        void main() { if (vA <= 0.0) discard; gl_FragColor = vec4(col, texture2D(tex, gl_PointCoord).a * vA); }`,
    });
    const pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    pts.renderOrder = 6;
    scene.add(pts);
    const st = { from: [], t: new Float32Array(NP).fill(1), life: new Float32Array(NP), off: new Float32Array(NP * 3), next: 0 };
    return { pts, g, p, a, st, m };
  };
  const dark = makeStream(new THREE.Color(0.0, 0.0, 0.0), THREE.NormalBlending, 0.07);
  const gold = makeStream(new THREE.Color(1.6, 1.0, 0.35), THREE.AdditiveBlending, 0.035);
  const spawn = (s, from) => {
    const i = s.st.next;
    s.st.next = (i + 1) % NP;
    s.st.from[i] = from.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.14, (Math.random() - 0.5) * 0.12));
    s.st.t[i] = 0;
    s.st.life[i] = 0.9 + Math.random() * 0.6;
    s.st.off[i * 3] = (Math.random() - 0.5) * 0.5;
    s.st.off[i * 3 + 1] = 0.15 + Math.random() * 0.35;
    s.st.off[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
  };
  const _to = new THREE.Vector3(), _c = new THREE.Vector3(), _h = new THREE.Vector3(), _dir = new THREE.Vector3();
  const flowStream = (s, target, dt) => {
    for (let i = 0; i < NP; i++) {
      if (s.st.t[i] >= 1) {
        s.a[i] = 0;
        continue;
      }
      s.st.t[i] = Math.min(1, s.st.t[i] + dt / s.st.life[i]);
      const k = s.st.t[i], e = k * k * (3 - 2 * k);
      const f = s.st.from[i];
      // an arc from the face into the flask
      _c.copy(f).lerp(target, 0.5).add(_h.set(s.st.off[i * 3], s.st.off[i * 3 + 1], s.st.off[i * 3 + 2]));
      const a1 = (1 - e) * (1 - e), b1 = 2 * (1 - e) * e, c1 = e * e;
      s.p[i * 3] = f.x * a1 + _c.x * b1 + target.x * c1;
      s.p[i * 3 + 1] = f.y * a1 + _c.y * b1 + target.y * c1;
      s.p[i * 3 + 2] = f.z * a1 + _c.z * b1 + target.z * c1;
      s.a[i] = Math.sin(k * Math.PI) * 0.8;
    }
    s.g.attributes.position.needsUpdate = true;
    s.g.attributes.alpha.needsUpdate = true;
  };

  // what the flask has just taken in, for main.js to show (decays on its own)
  const took = { dark: 0, gold: 0, count: 0, statue: false };
  const acc = { dark: 0, gold: 0 };

  /**
   * camera: the eye. flaskPos: the flask's world position. sound: for the tone when one is taken back.
   */
  const update = (dt, t, camera, flaskPos, sound) => {
    camera.getWorldDirection(_dir);
    for (const it of items) {
      it.head.getWorldPosition(_to);
      const fromEye = _to.clone().sub(camera.position);
      const d = fromEye.length();
      const looking = !it.done && d < NEAR && _dir.dot(fromEye.divideScalar(d)) > LOOK;
      if (looking) it.w = Math.min(1, it.w + dt / HOLD);
      else if (!it.done) it.w = Math.max(0, it.w - dt / 3);
      if (!it.done && it.w >= 1) {
        it.done = true;
        took.count++;
        took.gold = 1;
        sound?.glass(it.who === 'god' ? 293.7 : 349.2, 0.1, 6);
      }
      // what is left on it: all of it, until you hold your light there; then it drains as you hold
      const target = it.done ? 0 : 1 - 0.55 * it.w;
      it.proj += (target - it.proj) * (1 - Math.exp(-dt * (it.done ? 0.8 : 3)));
      // the stream: while you hold, and for a moment after
      if ((looking && it.w > 0.05) || (it.done && it.proj > 0.05)) {
        const s = it.kind === 'statue' ? gold : dark;
        const k = it.kind === 'statue' ? 'gold' : 'dark';
        acc[k] += dt * 70 * Math.max(it.proj, 0.3);
        while (acc[k] >= 1) {
          acc[k] -= 1;
          spawn(s, _to);
        }
      }
      // the gold shimmers a little, like something not quite there
      const g = it.proj * (1 + 0.04 * Math.sin(t * 1.7 + it.head.position.y));
      it.mat.color.copy(marble).lerp(goldC, Math.min(1, g));
      it.mat.metalness = Math.min(1, g);
      it.mat.roughness = 0.44 - 0.16 * g;
      it.mat.emissiveIntensity = 0.012 * g;
      it.mat.envMapIntensity = 0.22 * g + 0.004;
      it.glow.userData.base = 0.7 * g;
      it.halo.material.opacity = 0.09 * g;
    }
    flowStream(dark, flaskPos, dt);
    flowStream(gold, flaskPos, dt);
    took.dark = Math.max(0, took.dark - dt / 3);
    took.gold = Math.max(0, took.gold - dt / 5);
  };
  const resize = () => {
    dark.m.uniforms.px.value = innerHeight * Math.min(devicePixelRatio, 1.5);
    gold.m.uniforms.px.value = innerHeight * Math.min(devicePixelRatio, 1.5);
  };
  resize();
  // the plinths and the pedestal, for walking round
  const colliders = places.map((pl) => ({ x: pl.x ?? pl.side * (W / 2 - 0.5), z: pl.z, r: 0.55 }));
  return { group, items, update, took, resize, colliders };
};
