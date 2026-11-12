import * as THREE from 'three';

/* The bronze lantern the player carries. Its flame is the player's attention. */

/** Aged bronze: dark metal, verdigris in the hollows, brighter where hands have worn it. */
const patinaTexture = () => {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#5b4427';
  g.fillRect(0, 0, S, S);
  let seed = 9;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const blob = (col, n, rmin, rmax) => {
    for (let i = 0; i < n; i++) {
      const x = r() * S, y = r() * S, rad = rmin + r() * (rmax - rmin);
      const grad = g.createRadialGradient(x, y, 0, x, y, rad);
      grad.addColorStop(0, col(0.25 + r() * 0.5));
      grad.addColorStop(1, col(0));
      g.fillStyle = grad;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  };
  blob((a) => `rgba(20,13,7,${a})`, 120, 6, 40); // soot and age
  blob((a) => `rgba(74,128,108,${a})`, 150, 3, 22); // verdigris
  blob((a) => `rgba(196,152,88,${a * 0.7})`, 90, 2, 12); // worn, bright metal
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

/** Cut-out pattern for the pierced dome (white = metal, black = hole): rows of teardrops and dots. */
const piercedTexture = () => {
  const W = 128, H = 256;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#000';
  const tear = (x, y, w, h) => {
    g.beginPath();
    g.moveTo(x, y - h);
    g.bezierCurveTo(x + w, y - h * 0.2, x + w * 0.8, y + h, x, y + h);
    g.bezierCurveTo(x - w * 0.8, y + h, x - w, y - h * 0.2, x, y - h);
    g.fill();
  };
  // v runs from the eave (bottom of the canvas) to the crown (top)
  tear(64, 196, 17, 26);
  tear(24, 204, 9, 15);
  tear(104, 204, 9, 15);
  tear(64, 128, 12, 20);
  tear(30, 136, 7, 11);
  tear(98, 136, 7, 11);
  tear(64, 76, 8, 13);
  for (const [x, y] of [[40, 168], [88, 168], [44, 102], [84, 102], [64, 46]]) {
    g.beginPath();
    g.arc(x, y, 4.5, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(6, 1);
  return t;
};

/** Filigree for one pane (white = metal): an ogee arch with scrollwork above, a scrolled rail below. */
const filigreeTexture = () => {
  const W = 192, H = 512;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  g.strokeStyle = '#fff';
  g.fillStyle = '#fff';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const scroll = (x, y, rad, dir, turns = 1.6) => {
    g.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2 * turns;
      const rr = rad * (1 - i / 48);
      const px = x + Math.cos(a * dir) * rr;
      const py = y + Math.sin(a * dir) * rr;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.stroke();
  };
  // top: solid spandrels with an ogee arch cut out of them
  g.fillRect(0, 0, W, 150);
  g.globalCompositeOperation = 'destination-out';
  g.beginPath();
  g.moveTo(14, 152);
  g.bezierCurveTo(14, 90, 60, 84, W / 2, 26);
  g.bezierCurveTo(W - 60, 84, W - 14, 90, W - 14, 152);
  g.closePath();
  g.fill();
  // little windows in the spandrels
  for (const x of [26, W - 26]) {
    g.beginPath();
    g.arc(x, 34, 11, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(x + (x < W / 2 ? 26 : -26), 22, 6, 0, Math.PI * 2);
    g.fill();
  }
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = '#000';
  g.fillRect(0, 150, W, H - 150); // restore the black of the opening (destination-out left it clear)
  g.fillStyle = '#fff';
  // scrollwork hanging inside the arch
  g.lineWidth = 7;
  scroll(46, 128, 20, 1);
  scroll(W - 46, 128, 20, -1);
  g.lineWidth = 6;
  scroll(W / 2 - 16, 74, 12, -1, 1.3);
  scroll(W / 2 + 16, 74, 12, 1, 1.3);
  g.beginPath();
  g.arc(W / 2, 44, 6, 0, Math.PI * 2);
  g.fill();
  // bottom rail with scrolls rising at the corners and a small crest
  g.fillRect(0, H - 34, W, 34);
  g.lineWidth = 8;
  scroll(34, H - 64, 26, -1);
  scroll(W - 34, H - 64, 26, 1);
  g.lineWidth = 6;
  scroll(W / 2 - 22, H - 52, 14, 1, 1.3);
  scroll(W / 2 + 22, H - 52, 14, -1, 1.3);
  g.beginPath();
  g.moveTo(W / 2, H - 100);
  g.lineTo(W / 2 + 9, H - 76);
  g.lineTo(W / 2, H - 60);
  g.lineTo(W / 2 - 9, H - 76);
  g.closePath();
  g.fill();
  // the frame's edges
  g.fillRect(0, 0, 7, H);
  g.fillRect(W - 7, 0, 7, H);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  return t;
};

export const buildLantern = (glowTex) => {
  const group = new THREE.Group();
  const patina = patinaTexture();
  const bronze = new THREE.MeshStandardMaterial({ color: 0xe6d2b4, map: patina, roughnessMap: patina, roughness: 1.0, metalness: 0.6, emissive: 0x38260f, envMapIntensity: 1.6 });
  const add = (geo, mat, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    group.add(m);
    return m;
  };
  const hexFlat = (geo) => {
    const g2 = geo.toNonIndexed();
    g2.computeVertexNormals();
    return g2;
  };
  // base: feet, a stepped plinth, a collar under the glass
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    add(new THREE.SphereGeometry(0.011, 10, 8), bronze, Math.cos(a) * 0.082, -0.158, Math.sin(a) * 0.082);
  }
  add(hexFlat(new THREE.CylinderGeometry(0.09, 0.096, 0.016, 6)), bronze, 0, -0.146);
  add(hexFlat(new THREE.CylinderGeometry(0.078, 0.09, 0.02, 6)), bronze, 0, -0.128);
  add(hexFlat(new THREE.CylinderGeometry(0.074, 0.078, 0.012, 6)), bronze, 0, -0.112);
  // eave: a projecting hexagonal roof plate with a rolled edge
  add(hexFlat(new THREE.CylinderGeometry(0.094, 0.076, 0.014, 6)), bronze, 0, 0.098);
  add(hexFlat(new THREE.CylinderGeometry(0.09, 0.094, 0.008, 6)), bronze, 0, 0.109);
  // the pierced dome, with the flame's light showing through its openings
  const domeProfile = [
    [0.088, 0.112], [0.086, 0.122], [0.079, 0.136], [0.067, 0.153], [0.052, 0.17], [0.037, 0.184], [0.024, 0.194], [0.015, 0.203], [0.012, 0.212],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const domeMat = new THREE.MeshStandardMaterial({ color: 0xd8c0a0, map: patina, roughnessMap: patina, roughness: 1, metalness: 0.6, envMapIntensity: 1.6, alphaMap: piercedTexture(), alphaTest: 0.5, side: THREE.DoubleSide, emissive: 0x140d05 });
  const dome = add(hexFlat(new THREE.LatheGeometry(domeProfile, 6)), domeMat);
  dome.rotation.y = Math.PI / 6;
  const innerGlowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.8, 0.28) });
  add(new THREE.SphereGeometry(0.034, 12, 10), innerGlowMat, 0, 0.128);
  // finial and the loop that carries the ring
  add(new THREE.SphereGeometry(0.014, 12, 10), bronze, 0, 0.221);
  add(new THREE.CylinderGeometry(0.006, 0.009, 0.012, 8), bronze, 0, 0.236);
  const loop = add(new THREE.TorusGeometry(0.011, 0.0035, 8, 16), bronze, 0, 0.249);
  loop.rotation.y = Math.PI / 2;
  // the carrying ring, facing the eye, so the fist closes around its top
  add(new THREE.TorusGeometry(0.046, 0.0055, 10, 40), bronze, 0, 0.298);
  const GRIP = new THREE.Vector3(0, 0.298 + 0.046, 0);
  // corner posts and, on each face, a pane of filigree
  const filigree = new THREE.MeshStandardMaterial({ color: 0xd8c0a0, map: patina, roughnessMap: patina, roughness: 1, metalness: 0.6, envMapIntensity: 1.6, alphaMap: filigreeTexture(), alphaTest: 0.5, side: THREE.DoubleSide, emissive: 0x140d05 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    add(new THREE.CylinderGeometry(0.0052, 0.0052, 0.2, 8), bronze, Math.cos(a) * 0.072, -0.006, Math.sin(a) * 0.072);
    add(new THREE.SphereGeometry(0.0075, 8, 6), bronze, Math.cos(a) * 0.072, 0.09, Math.sin(a) * 0.072);
    add(new THREE.SphereGeometry(0.0075, 8, 6), bronze, Math.cos(a) * 0.072, -0.103, Math.sin(a) * 0.072);
    const b = a + Math.PI / 6;
    const pane = add(new THREE.PlaneGeometry(0.07, 0.196), filigree, Math.cos(b) * 0.0635, -0.006, Math.sin(b) * 0.0635);
    pane.rotation.y = -b + Math.PI / 2;
  }
  // old glass: nearly clear, catching the sky at glancing angles
  add(
    new THREE.CylinderGeometry(0.0615, 0.0615, 0.196, 6, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xfff0d8, transparent: true, opacity: 0.1, roughness: 0.08, metalness: 0, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 2.5 }),
    0,
    -0.006,
  );
  // the candle in its brass cup
  const brass = new THREE.MeshStandardMaterial({ color: 0xc9a14a, metalness: 1, roughness: 0.32, emissive: 0x2a1a05 });
  add(new THREE.CylinderGeometry(0.03, 0.022, 0.03, 16, 1, true), brass, 0, -0.091).material.side = THREE.DoubleSide;
  add(new THREE.CylinderGeometry(0.022, 0.022, 0.003, 16), brass, 0, -0.105);
  add(new THREE.TorusGeometry(0.03, 0.0022, 6, 20), brass, 0, -0.076).rotation.x = Math.PI / 2;
  add(new THREE.CylinderGeometry(0.019, 0.02, 0.03, 14), new THREE.MeshStandardMaterial({ color: 0xf0e2c2, roughness: 0.55, emissive: 0x6a4416 }), 0, -0.088);
  add(new THREE.CylinderGeometry(0.0009, 0.0009, 0.012, 4), new THREE.MeshBasicMaterial({ color: 0x1a120a }), 0, -0.068);
  // The flame: a camera-facing teardrop with a white core, orange body and blue base, flickering and leaning.
  const flameMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 }, power: { value: 1 }, lean: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv; uniform float time; uniform float power; uniform float lean;
      float n(float x) { return sin(x) * 0.5 + sin(x * 2.3 + 1.7) * 0.3 + sin(x * 5.1 + 0.4) * 0.2; }
      void main() {
        vec2 p = vUv - vec2(0.5, 0.18);
        float h = clamp(p.y / 0.72, 0.0, 1.0);
        // sway grows toward the tip
        p.x -= (n(time * 6.0) * 0.05 + lean) * h * h;
        float width = mix(0.2, 0.0, pow(h, 1.4)) * (p.y < 0.0 ? 1.0 + p.y * 5.0 : 1.0);
        float d = abs(p.x) / max(width, 1e-3);
        float body = smoothstep(1.0, 0.35, d) * smoothstep(-0.12, 0.02, p.y) * smoothstep(0.74, 0.5, p.y);
        float core = smoothstep(0.55, 0.0, d) * smoothstep(0.42, 0.08, p.y) * smoothstep(-0.06, 0.04, p.y);
        float blue = smoothstep(0.08, -0.04, p.y) * smoothstep(0.9, 0.2, d) * smoothstep(-0.14, -0.04, p.y);
        vec3 col = vec3(1.0, 0.42, 0.08) * body * 1.7 + vec3(1.0, 0.92, 0.7) * core * 2.2 + vec3(0.25, 0.45, 1.0) * blue * 1.0;
        float a = clamp(body + core, 0.0, 1.0);
        gl_FragColor = vec4(col * power, a * power);
      }`,
  });
  const flame = add(new THREE.PlaneGeometry(0.05, 0.085), flameMat, 0, -0.041);
  flame.rotation.y = 0.3; // the lantern is turned -0.3; keep the flame facing the eye
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffb45e, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.position.set(0, -0.045, 0);
  glow.scale.set(0.14, 0.14, 1);
  group.add(glow);
  const light = new THREE.PointLight(0xffc488, 16, 30, 1.7);
  // well below and ahead of the lantern: it lights the ground and the faces you approach
  // without burning hot spots into the lantern's own metal
  light.position.set(-0.05, -0.6, -0.5);
  group.add(light);

  let hand = null;
  // where the elbow lies: low, the arm reaches out; raised, the elbow drops toward you so the arm
  // still runs off the bottom of the screen (never a floating arm)
  const ELBOW_LOW = new THREE.Vector3(0.8, -0.8, 1);
  const ELBOW_HIGH = new THREE.Vector3(1.0, -1.25, 0.8);
  const elbow = new THREE.Vector3();
  let lastRaise = -1;
  // seeds of light gathered from the three centers: small motes that circle the flame
  const seeds = [];
  return {
    group,
    /** A seed from a woken center joins the flame (color: THREE.Color). */
    addSeed(color) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
      sp.scale.setScalar(0.028);
      group.add(sp);
      seeds.push(sp);
    },
    /** The finale: the oldest seed leaves the flame. */
    removeSeed() {
      const sp = seeds.shift();
      if (sp) group.remove(sp);
    },
    /** Puts the player's hand (from people.js) on the ring. */
    attachHand(h) {
      hand = h;
      group.add(h.root);
      h.place(GRIP, ELBOW_LOW); // the arm runs off the lower right of the screen
    },
    /**
     * @param t        time in seconds
     * @param presence 0..1, how awake the player is; dims the flame
     * @param raise    0..1, how far the lantern is lifted
     * @param stride   walking phase, for sway
     * @param moving   0..1
     * @param aspect   viewport width / height
     */
    update(t, presence, raise, stride, moving, aspect) {
      const flick = 0.9 + 0.06 * Math.sin(t * 11.3) + 0.04 * Math.sin(t * 23.7 + 1.3);
      const p = 0.18 + 0.82 * presence;
      // keep the lantern in the lower right whatever the window shape (fov 70 at 0.72 m: half-height ≈ 0.5 m)
      const s = Math.min(1, Math.max(0.74, aspect / 1.6));
      group.scale.setScalar(s);
      const halfW = 0.504 * aspect;
      const x = Math.min(0.36, halfW * 0.62) * (1 - raise * 0.45);
      group.position.set(x + Math.sin(stride) * 0.012 * moving, -0.3 * (0.75 + 0.25 * s) + raise * 0.22 + Math.abs(Math.cos(stride)) * 0.012 * moving, -0.72 + raise * 0.06);
      group.rotation.set(0.06 - raise * 0.12, -0.3, Math.sin(stride) * 0.05 * moving + Math.sin(t * 1.3) * 0.015);
      flame.scale.set(1, 0.85 + 0.25 * flick, 1).multiplyScalar(0.55 + 0.45 * p);
      flameMat.uniforms.time.value = t;
      if (hand && Math.abs(raise - lastRaise) > 0.002) {
        lastRaise = raise;
        hand.place(GRIP, elbow.copy(ELBOW_LOW).lerp(ELBOW_HIGH, raise));
      }
      seeds.forEach((sp, i) => {
        const a = t * 1.3 + (i * Math.PI * 2) / 3;
        sp.position.set(Math.cos(a) * 0.03, -0.035 + Math.sin(t * 2 + i) * 0.006, Math.sin(a) * 0.03);
      });
      flameMat.uniforms.power.value = p * (0.85 + 0.15 * flick);
      // it leans back when you walk and steadies when you stand
      flameMat.uniforms.lean.value += ((moving * 0.12) - flameMat.uniforms.lean.value) * 0.08;
      glow.material.opacity = 0.3 * p * flick;
      innerGlowMat.color.setRGB(1.6 * p * flick, 0.8 * p * flick, 0.28 * p);
      glow.scale.setScalar(0.08 + 0.04 * p + raise * 0.03);
      light.intensity = (1.0 + 2.6 * p + raise * 3.0 * p) * flick;
    },
  };
};
