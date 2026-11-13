import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import { fbm, noise2, smoothstep, rng, tileNormalMap, moonTexture, glowTexture, textTexture, rockTexture, attentionDiagram, stoneSymbol } from './textures.js';
import { buildSpire, buildLotus, buildTree, buildLotusAvenue } from './monuments.js';
import { buildInterior, buildCutscene } from './tower-interior.js';
import { buildLotusInterior } from './lotus-interior.js';

/*
 * The plain of sleepers: sky, moon, terrain, reflecting water, and the three monuments
 * (the spire of rings, the lotus, the root tree). Everything is generated in code.
 */

export const MOON_POS = new THREE.Vector3(0, 400, -900);
export const START = new THREE.Vector3(0, 0, 34);
export const SPIRE = new THREE.Vector3(-78, 0, -150);
export const LOTUS = new THREE.Vector3(0, 0, -175);
export const TREE = new THREE.Vector3(82, 0, -150);
// The key art's palette: an overcast, moonlit, silver-grey night. Mist is lighter than the stone,
// so distant things read as dark silhouettes fading into it.
const FOG = new THREE.Color(0.036, 0.05, 0.058);
// inside the forest the air and the sky turn teal
const FOREST_FOG = new THREE.Color(0.018, 0.06, 0.056);
// near the tower: a deep blue-teal night, as in the owner's reference
const SPIRE_FOG = new THREE.Color(0.016, 0.034, 0.042);
const INSIDE_FOG = new THREE.Color(0.03, 0.027, 0.024);
// the way to the lotus: warm amber air, as in the owner's reference
const LOTUS_HEMI = new THREE.Color(0xc08a5a);
const MIST_FILL = new THREE.Color(0xaeb8ca);
const LOTUS_FOG = new THREE.Color(0.13, 0.075, 0.04);
// inside the lotus: a dark night over the lake, warm only low on the horizon (refs/lotus-beam.webp)
const LOTUS_IN_FOG = new THREE.Color(0.035, 0.022, 0.016);
// the finale's dawn: warm air, the gate and the crowd clear at 90 m
const DAWN_FOG = new THREE.Color(0.13, 0.065, 0.06);

/** Ground height at a point. The middle is a shallow flooded basin; mountains ring the horizon. */
export const heightAt = (x, z) => {
  const r = Math.hypot(x, z);
  let h = -0.34 + (fbm(x * 0.06 + 10, z * 0.06 + 5, 4) - 0.5) * 0.5;
  // (no islands and no slab: the owner wants the whole plain to be still grey water)
  // low, distant hills: in the mist they are only a faint line under the moon
  const m = smoothstep(190, 360, r);
  h += m * m * (5 + fbm(x * 0.011 + 3, z * 0.011 + 9, 5) * 70);
  return h;
};

const SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

const SKY_FRAG = /* glsl */ `
  uniform float time;
  uniform vec3 moonDir;
  uniform vec3 horizon;
  uniform float teal;
  uniform float dusk;
  uniform float warm;
  uniform float stars;
  uniform float lake;
  uniform float dawn;
  varying vec3 vDir;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float hash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 7.1; a *= 0.5; }
    return v;
  }
  void main() {
    vec3 d = normalize(vDir);
    float up = max(d.y, 0.0);
    float md = max(dot(d, moonDir), 0.0);
    // an overcast night: slate overhead, pale mist at the horizon
    vec3 zenith = vec3(0.008, 0.011, 0.016);
    vec3 col = mix(horizon, zenith, pow(up, 0.5));

    // a high, thin deck of cloud covering the whole sky, in two layers that drift apart
    vec2 uv = d.xz / (d.y + 0.22);
    float c1 = fbm(uv * 0.9 + vec2(time * 0.004, time * 0.002));
    float c2 = fbm(uv * 2.3 - vec2(time * 0.006, 0.0) + c1 * 1.5);
    float c = smoothstep(0.25, 0.85, c1 * 0.65 + c2 * 0.45);
    float fade = smoothstep(-0.02, 0.3, d.y);
    // the cloud is dark where it is thick, silver where the moon shines through it
    vec3 lit = vec3(0.26, 0.3, 0.34) * (pow(md, 5.0) * 0.6 + 0.04);
    vec3 shade = vec3(0.014, 0.017, 0.023);
    vec3 cloud = mix(lit, shade, smoothstep(0.35, 0.95, c) * (1.0 - pow(md, 6.0) * 0.6));
    col = mix(col, cloud, (0.55 + 0.45 * c) * fade);

    // a few stars in the thinnest gaps
    vec3 cell = floor(d * 260.0);
    float s = hash3(cell);
    float star = smoothstep(0.9975, 1.0, s) * (0.6 + 0.4 * sin(time * 2.0 + s * 90.0));
    col += vec3(0.8, 0.85, 1.0) * star * smoothstep(0.1, 0.4, d.y) * mix(1.0 - smoothstep(0.2, 0.5, c), 1.0, clamp(stars - 1.0, 0.0, 1.0) * 0.7) * 0.5 * stars;

    // the moon's corona in the haze: tight and bright, then a wide soft veil
    col += vec3(0.62, 0.68, 0.78) * (pow(md, 90.0) * 0.45 + pow(md, 14.0) * 0.12 + pow(md, 3.0) * 0.025);
    // under the forest canopy the night sky is teal
    float lum = dot(col, vec3(0.3, 0.59, 0.11));
    col = mix(col, vec3(0.012, 0.05, 0.047) + lum * vec3(0.22, 0.62, 0.56), teal * 0.9);
    // near the tower: dark teal-blue, the clouds only faintly silvered
    col = mix(col, vec3(0.012, 0.03, 0.038) + pow(lum, 1.4) * vec3(0.3, 0.5, 0.56), dusk * 0.88);
    // on the way to the lotus: a warm, amber night
    col = mix(col, vec3(0.07, 0.042, 0.022) + lum * vec3(1.25, 0.78, 0.42), warm * 0.95);
    // over the lotus's lake: a clear, near-black teal night full of stars, warm only at the horizon
    vec3 lakeSky = vec3(0.003, 0.007, 0.009) + vec3(0.8, 0.85, 1.0) * star * 0.45 + vec3(0.09, 0.035, 0.012) * pow(1.0 - up, 12.0) + vec3(0.03, 0.014, 0.008) * pow(1.0 - up, 4.0);
    col = mix(col, lakeSky, lake);
    // the finale's dawn (refs/finale-gate.webp): indigo overhead, violet, and an orange-red horizon,
    // strongest toward the gate (-z); the clouds lit orange from below; stars stay
    if (dawn > 0.0) {
      vec3 hz = normalize(vec3(d.x, 0.0, d.z) + 1e-4);
      float toward = pow(max(dot(hz, vec3(0.0, 0.0, -1.0)), 0.0), 2.0);
      vec3 dsky = mix(vec3(0.16, 0.08, 0.2), vec3(0.012, 0.018, 0.075), smoothstep(0.03, 0.45, d.y));
      dsky = mix(dsky, vec3(1.0, 0.34, 0.1) * (0.3 + 0.9 * toward), pow(1.0 - up, 9.0) * (0.6 + 0.4 * toward));
      vec3 dcloud = mix(vec3(0.95, 0.4, 0.18) * (0.3 + 0.7 * toward), vec3(0.06, 0.045, 0.09), smoothstep(0.3, 0.95, c));
      dsky = mix(dsky, dcloud, smoothstep(0.35, 0.8, c) * fade * 0.7);
      dsky += vec3(0.8, 0.85, 1.0) * star * 0.6 * smoothstep(0.15, 0.5, d.y);
      // a milky band rising from behind the gate
      float band = exp(-pow(d.x * 5.0, 2.0)) * smoothstep(0.0, 0.4, -d.z) * smoothstep(0.0, 0.3, d.y);
      dsky += vec3(0.3, 0.26, 0.36) * band * (0.6 + 0.4 * fbm(d.xy * 18.0)) * 0.35;
      col = mix(col, dsky, dawn);
    }
    gl_FragColor = vec4(col, 1.0);
  }`;

const stoneMaterial = (normalMap, color = 0x3b4049, repeat = 1) => {
  const n = normalMap.clone();
  n.repeat.set(repeat, repeat);
  n.needsUpdate = true;
  return new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0.05, normalMap: n, normalScale: new THREE.Vector2(0.35, 0.35) });
};

const hdr = (r, g, b, k) => new THREE.Color(r * k, g * k, b * k);

export const buildWorld = (scene, renderer) => {
  // phones and tablets get smaller shadow and reflection maps
  const LOW = matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches;
  scene.fog = new THREE.FogExp2(FOG, 0.0046);
  scene.background = FOG.clone();
  const normalMap = tileNormalMap(256, 20, 2.4, 7);
  const glowTex = glowTexture();
  const updaters = [];
  const colliders = [];
  const moonDir = MOON_POS.clone().normalize();

  /* ── sky and moon ── */
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { time: { value: 0 }, moonDir: { value: moonDir }, horizon: { value: new THREE.Vector3(FOG.r, FOG.g, FOG.b) }, teal: { value: 0 }, dusk: { value: 0 }, warm: { value: 0 }, stars: { value: 1 }, lake: { value: 0 }, dawn: { value: 0 } },
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2400, 48, 24), skyMat);
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  scene.add(sky);

  // The moon fills a third of the sky, as in the key art. Its disc darkens toward the limb,
  // and the haze in front of it lifts its shadows.
  const moonMat = new THREE.ShaderMaterial({
    fog: false,
    uniforms: { map: { value: null }, tint: { value: 0 }, fade: { value: 0 }, gain: { value: 1.3 }, haze: { value: new THREE.Vector3(FOG.r, FOG.g, FOG.b) } },
    vertexShader: /* glsl */ `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main() { vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `uniform sampler2D map; uniform float tint; uniform float fade; uniform float gain; uniform vec3 haze; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main() {
        vec3 albedo = texture2D(map, vUv).rgb;
        float mu = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
        float limb = 0.78 + 0.22 * pow(mu, 0.5); // a full moon is nearly flat-lit
        // stretch the photo's contrast a little: highlands bright, the seas a clear grey
        float l = dot(albedo, vec3(0.3, 0.59, 0.11));
        vec3 col = vec3(pow(l, 1.05) * 1.5) * limb * vec3(0.96, 0.99, 1.06) * gain;
        // thin cloud passing in front
        col = mix(col, haze * 4.0, 0.1 + 0.1 * (1.0 - mu));
        // the amber moon of the lotus avenue: dimmer, so the tone curve doesn't bleach its colour
        col *= mix(vec3(1.0), vec3(0.8, 0.44, 0.2), tint);
        gl_FragColor = vec4(col, 1.0 - fade);
      }`,
  });
  moonMat.transparent = true; // it fades out at dawn
  const moon = new THREE.Mesh(new THREE.SphereGeometry(250, 96, 64), moonMat);
  moon.position.copy(MOON_POS);
  moon.rotation.y = -Math.PI / 2; // the map's centre (the familiar near side) faces the plain
  // NASA's LRO colour mosaic (public domain, assets/moon/SOURCE.txt); the procedural moon is the fallback
  new THREE.TextureLoader().load(
    './assets/moon/moon.jpg',
    (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      moonMat.uniforms.map.value = t;
    },
    undefined,
    () => (moonMat.uniforms.map.value = moonTexture()),
  );
  // pale placeholder until the photo arrives (the procedural map is only built if it fails)
  moonMat.uniforms.map.value = Object.assign(new THREE.DataTexture(new Uint8Array([214, 216, 222, 255]), 1, 1), { needsUpdate: true });
  scene.add(moon);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xc4cfe6, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  halo.position.copy(MOON_POS);
  halo.scale.set(1500, 1500, 1);
  scene.add(halo);

  // The sky also lights the metal of the lantern through an environment map.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(sky.clone(), moon.clone());
  scene.environment = pmrem.fromScene(envScene, 0, 1, 4000).texture;
  scene.environmentIntensity = 0.7;

  /* ── light ── */
  const hemi = new THREE.HemisphereLight(0x7d8798, 0x2b313a, 1.5);
  scene.add(hemi);
  const HEMI = hemi.color.clone();
  const HEMI_FOREST = new THREE.Color(0x3f8f86);
  const moonLight = new THREE.DirectionalLight(0xd3dcf0, 2.5);
  moonLight.position.copy(moonDir).multiplyScalar(100);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.set(LOW ? 1024 : 2048, LOW ? 1024 : 2048);
  moonLight.shadow.bias = -0.0004;
  moonLight.shadow.normalBias = 0.03;
  const sc = moonLight.shadow.camera;
  sc.left = sc.bottom = -32;
  sc.right = sc.top = 32;
  sc.near = 1;
  sc.far = 260;
  scene.add(moonLight);
  scene.add(moonLight.target);
  // The moon is behind everything you walk toward, so on its own it leaves only silhouettes.
  // The mist scatters its light back: a soft, shadowless fill from behind the walker, as in the key art.
  const mistFill = new THREE.DirectionalLight(0xaeb8ca, 0.8);
  mistFill.position.set(20, 22, 100);
  scene.add(mistFill);

  /* ── terrain ── */
  const terrainGeo = new THREE.PlaneGeometry(760, 760, 240, 240);
  terrainGeo.rotateX(-Math.PI / 2);
  const pos = terrainGeo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, heightAt(x, z));
    const tone = 0.75 + fbm(x * 0.08, z * 0.08, 3) * 0.5;
    colors[i * 3] = tone * 0.95;
    colors[i * 3 + 1] = tone;
    colors[i * 3 + 2] = tone * 1.08;
  }
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();
  const terrainMat = stoneMaterial(normalMap, 0x4a505a, 110);
  terrainMat.vertexColors = true;
  // The flooded temple floor: large paving stones in staggered rows, dark joints, per-stone tone.
  // It blends into natural rock toward the mountains.
  terrainMat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\n vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vWPos;
        float ph(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float paveJoint;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        {
          vec2 p = vWPos.xz;
          float rowH = 1.7;
          float row = floor(p.y / rowH);
          float off = ph(vec2(row, 3.1)) * 4.0;
          float w = 1.5 + ph(vec2(row, 7.7)) * 1.9;
          float col = floor((p.x + off) / w);
          float fx = fract((p.x + off) / w);
          float fy = fract(p.y / rowH);
          float edge = min(min(fx, 1.0 - fx) * w, min(fy, 1.0 - fy) * rowH);
          paveJoint = 1.0 - smoothstep(0.012, 0.055, edge);
          vec2 cell = vec2(col, row);
          float tone = 0.78 + 0.38 * ph(cell);
          // chipped corners and worn patches inside each stone
          float wear = smoothstep(0.55, 0.95, ph(floor(p * 3.0) + cell));
          float inBasin = 0.0; // no paving: the plain is water (owner, 2026-11-12)
          diffuseColor.rgb *= mix(1.0, tone * (1.0 - paveJoint * 0.82) * (1.0 - wear * 0.12), inBasin);
          paveJoint *= inBasin;
          // stone under the water is darker and slightly tinted by it
          float under = 1.0 - smoothstep(-0.12, 0.04, vWPos.y);
          diffuseColor.rgb *= mix(vec3(1.0), vec3(0.42, 0.5, 0.56), under);
        }
        {
        }`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        // wet stone at and below the waterline is glossier; joints stay rough
        float wetBand = smoothstep(-0.12, 0.0, vWPos.y) * (1.0 - smoothstep(0.0, 0.25, vWPos.y));
        roughnessFactor = mix(roughnessFactor, 0.55, wetBand * (1.0 - paveJoint));`,
      );
  };
  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.receiveShadow = true;
  scene.add(terrain);

  /* ── water ── */
  const water = new Water(new THREE.PlaneGeometry(760, 760), {
    textureWidth: LOW ? 512 : 1024,
    textureHeight: LOW ? 512 : 1024,
    waterNormals: normalMap,
    sunDirection: moonDir.clone(),
    sunColor: 0xc6d0e4,
    waterColor: 0x1a1e22,
    distortionScale: 0.09,
    fog: true,
  });
  water.rotation.x = -Math.PI / 2;
  water.material.uniforms.size.value = 0.55; // long, slow swells: still water
  water.material.transparent = true;
  water.material.fragmentShader = water.material.fragmentShader.replace(
    'gl_FragColor = vec4( outgoingLight, alpha );',
    `// shallow, clear water: transparent where you look down, a mirror at grazing angles and far away
    // still grey water: a mirror almost everywhere, only faintly clear right at your feet
    float clarity = clamp(0.72 + reflectance * 1.5 + smoothstep(4.0, 16.0, distance), 0.0, 1.0);
    gl_FragColor = vec4( outgoingLight + waterColor * 0.35 * (1.0 - clarity), clarity * alpha );`,
  );
  water.material.needsUpdate = true;
  scene.add(water);

  /* ── the three monuments (see monuments.js) ── */
  const ctx = { scene, glowTex, stoneMaterial, normalMap, updaters, colliders };
  const spire = buildSpire({ ...ctx, pos: SPIRE });
  const lotus = buildLotus({ ...ctx, pos: LOTUS });
  const forest = buildTree({ ...ctx, pos: TREE });
  const avenue = buildLotusAvenue({ ...ctx, lotusPos: LOTUS });
  const interior = buildInterior({ scene, glowTex });
  const cutscene = buildCutscene({ scene, glowTex, normalMap });
  const lotusIn = buildLotusInterior({ scene, glowTex, normalMap });

  /* ── inscriptions: carved stones whose words appear in the lantern's light ── */
  const steles = [];
  // one weathered-granite surface for all the standing stones (colour and bump)
  const rockCanvas = rockTexture();
  const rockMap = new THREE.CanvasTexture(rockCanvas);
  rockMap.colorSpace = THREE.SRGBColorSpace;
  rockMap.wrapS = rockMap.wrapT = THREE.RepeatWrapping;
  rockMap.repeat.set(1.2, 2.4);
  rockMap.anisotropy = 8;
  const rockBump = new THREE.CanvasTexture(rockCanvas);
  rockBump.wrapS = rockBump.wrapT = THREE.RepeatWrapping;
  rockBump.repeat.copy(rockMap.repeat);
  const symbols = {};
  const symbolFor = (k) => (symbols[k] ??= stoneSymbol(k));
  const addStele = (x, z, faceYaw, lines, opts = {}) => {
    const g = new THREE.Group();
    const y = Math.max(heightAt(x, z), -0.1);
    g.position.set(x, y, z);
    g.rotation.y = faceYaw;
    const steleStone = new THREE.MeshStandardMaterial({ color: 0xb4b2ac, map: rockMap, bumpMap: rockBump, bumpScale: 3, roughness: 0.92, metalness: 0 });
    steleStone.emissive = new THREE.Color(0x14171d); // faint moonlit fill so it never reads as a black hole
    // A menhir: a tall rough standing stone sunk into the ground, tapering upward to an uneven,
    // slanted crown. Its front face stays nearly flat where the words are carved.
    const H = 4.2;
    const geo = new THREE.BoxGeometry(1, 1, 1, 8, 24, 5);
    const pp = geo.attributes.position;
    const seed = x * 0.37 + z * 0.11;
    for (let i = 0; i < pp.count; i++) {
      let px = pp.getX(i);
      let py = pp.getY(i);
      let pz = pp.getZ(i);
      const h = py + 0.5; // 0 at the foot, 1 at the crown
      const w = 1.75 - 0.6 * Math.pow(h, 1.2);
      const dpt = 0.82 - 0.22 * h;
      // round the shoulders of the crown
      const crown = h > 0.78 ? Math.sqrt(Math.max(0.05, 1 - Math.pow((h - 0.78) / 0.24, 2))) : 1;
      px *= w * (0.55 + 0.45 * crown);
      pz *= dpt * (0.6 + 0.4 * crown);
      py = h * H + px * 0.22 * h * h; // the crown slants
      // weathering: deep on the sides and back, shallow on the carved face
      const front = pz > dpt * 0.45 && Math.abs(px) < w * 0.47 && h > 0.15 && h < 0.75;
      const amp = front ? 0.012 : 0.06 + 0.04 * h;
      const n = fbm(px * 1.7 + seed, py * 1.3 + pz * 2.1, 4) - 0.5;
      const len = Math.hypot(px, pz) || 1;
      px += (px / len) * n * amp * 2;
      pz += (pz / len) * n * amp * 2;
      pp.setXYZ(i, px, py - 0.35, pz);
    }
    geo.computeVertexNormals();
    const slab = new THREE.Mesh(geo, steleStone);
    slab.rotation.x = -0.04; // leaning back a little, as old stones do
    slab.rotation.z = (seed % 1) * 0.06 - 0.03;
    g.add(slab);
    // a few fallen pieces at its foot
    for (let k = 0; k < 3; k++) {
      const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22 + k * 0.07, 0), steleStone);
      r.position.set(-0.9 + k * 0.85, 0.02, 0.35 + (k % 2) * 0.25);
      r.rotation.set(k, k * 2.1, k * 0.7);
      r.scale.set(1, 0.6, 1.2);
      g.add(r);
    }
    // three-line teachings get a taller panel
    // a carved symbol above the words, when the stone has one
    const sym = opts.symbol || (opts.diagram ? 'attention' : null);
    const symImg = sym ? symbolFor(sym) : null;
    const tall = lines.length > 2 || !!symImg;
    const texOpts = symImg ? { size: 70, height: 900, image: symImg, imageH: 380 } : tall ? { size: 84, height: 680 } : { size: 84 };
    const mat = new THREE.MeshBasicMaterial({ map: textTexture(lines, texOpts), color: hdr(1, 0.78, 0.4, 2.2), transparent: true, opacity: 0, depthWrite: false, fog: false });
    const text = new THREE.Mesh(new THREE.PlaneGeometry(symImg ? 1.0 : 1.22, symImg ? 0.95 : tall ? 0.81 : 0.61), mat);
    text.position.set(0, symImg ? 1.85 : 1.75, 0.4); // just proud of the front face, in the stone's own frame
    slab.add(text);
    scene.add(g);
    colliders.push({ x, z, r: 1.1 });
    steles.push({ pos: new THREE.Vector3(x, y + 1.6, z), mat, reveal: 0, seen: false, required: !!opts.required, read: false, lines });
  };
  addStele(START.x + 3.4, START.z - 7.5, -0.35, ['Here nothing is lost.', 'Only time, and distance.'], { symbol: 'hourglass', required: true });
  // Teaching stones: the ideas of the Fourth Way, in a few carved words each (original lines,
  // after Gurdjieff and Ouspensky). Each faces the way you come from.
  // the plain's teaching stones are the level's first task: read each one with the raised lantern
  const teach = (x, z, lines, opts) => addStele(x, z, Math.atan2(START.x - x, START.z - z), lines, { ...opts, required: true });
  teach(-6, 22, ['Self-observation:', 'see yourself as you are,', 'without judging or changing.'], { symbol: 'observe' });
  // the stones are read in this order, beginning with the one where you wake
  addStele(-9, 6, 0.6, ['What sleeps cannot be carried.', 'Only lit.'], { symbol: 'sleep', required: true });
  teach(10, 4, ['Self-remembering:', 'attention two ways at once,', 'out to what I see, and back to me.'], { diagram: true });
  teach(-12, -22, ['Three brains: each works', 'at its own speed, and each', 'wants to rule alone.'], { symbol: 'brains' });
  teach(14, -48, ['Seven centres: thinking, feeling,', 'moving, instinctive, sexual,', 'and two higher ones, always awake.'], { symbol: 'seven' });

  // everything solid casts moon shadows; the sky, moon, glows and water do not
  scene.traverse((o) => {
    if (o.isMesh && o !== terrain && o !== water && o !== sky && o !== moon && o.material.blending === THREE.NormalBlending && !o.material.transparent && !o.material.isShaderMaterial && !o.material.isMeshBasicMaterial) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  const shadowTexel = 64 / 2048;

  let forestAmt = 0;
  let spireAmt = 0;
  let lotusAmt = 0;
  let lotusInAmt = 0;
  let dawn = 0;
  return {
    water,
    /** Keeps the moon's shadow box centred on the player, snapped to texels so it doesn't shimmer. */
    followShadow(p) {
      const x = Math.round(p.x / shadowTexel) * shadowTexel;
      const z = Math.round(p.z / shadowTexel) * shadowTexel;
      moonLight.target.position.set(x, 0, z);
      moonLight.position.set(x + moonDir.x * 150, moonDir.y * 150, z + moonDir.z * 150);
      moonLight.target.updateMatrixWorld();
    },
    lotus,
    spire,
    forest,
    interior,
    cutscene,
    lotusIn,
    addStele,
    /** The three places wake when the companion does. */
    openDoors() {
      spire.open();
      lotus.doOpen();
      forest.open();
    },
    steles,
    colliders,
    get lotusInAmt() {
      return lotusInAmt;
    },
    /** The finale's dawn, 0 (night) to 1. */
    get dawn() {
      return dawn;
    },
    set dawn(v) {
      dawn = v;
    },
    /** Re-render the environment map from the sky as it is now (a brief hitch: call it rarely). */
    refreshEnv() {
      const old = scene.environment;
      scene.environment = pmrem.fromScene(envScene, 0, 1, 4000).texture;
      old?.dispose();
    },
    update(t, dt, camera) {
      skyMat.uniforms.time.value = t;
      // how far inside the forest the camera is: near the root tree, or along the path out of it
      {
        const tx = TREE.x, tz = TREE.z;
        const ox = 0 - tx, oz = 34 - tz;
        const ol = Math.hypot(ox, oz);
        const ux = ox / ol, uz = oz / ol;
        const px = camera.position.x - tx, pz = camera.position.z - tz;
        const along = Math.max(0, Math.min(95, px * ux + pz * uz));
        const d = Math.hypot(px - ux * along, pz - uz * along);
        const inRing = Math.hypot(px, pz);
        const f = Math.max(1 - smoothstep(14, 34, d), 1 - smoothstep(50, 70, inRing));
        forestAmt += (f - forestAmt) * (1 - Math.exp(-dt * 1.5));
        // the tower's zone: its dais and the stepping stones toward the plain
        const sx = 0 - SPIRE.x, sz = 34 - SPIRE.z;
        const sl = Math.hypot(sx, sz);
        const qx = camera.position.x - SPIRE.x, qz = camera.position.z - SPIRE.z;
        const sAlong = Math.max(0, Math.min(75, (qx * sx + qz * sz) / sl));
        const sd = Math.hypot(qx - (sx / sl) * sAlong, qz - (sz / sl) * sAlong);
        const sf = 1 - smoothstep(25, 55, sd);
        spireAmt += (sf - spireAmt) * (1 - Math.exp(-dt * 1.5));
        // the lotus avenue's zone: the band of water between the towers, up to the lotus
        const lz = camera.position.z, lx = camera.position.x;
        const inLotus = lotusIn.contains(camera.position);
        const inAve = inLotus ? 1 : (1 - smoothstep(30, 60, Math.abs(lx))) * smoothstep(-70, -100, lz) * (1 - smoothstep(-200, -215, lz));
        lotusAmt += (inAve - lotusAmt) * (1 - Math.exp(-dt * 1.5));
        lotusInAmt += ((inLotus ? 1 : 0) - lotusInAmt) * (1 - Math.exp(-dt * 2));
        // each place's own water and sets are only drawn when you are there (each mirror costs a render)
        lotusIn.group.visible = inLotus;
        water.visible = !inLotus;
        scene.fog.color.copy(FOG).lerp(SPIRE_FOG, spireAmt).lerp(FOREST_FOG, forestAmt).lerp(LOTUS_FOG, lotusAmt);
        scene.fog.color.lerp(LOTUS_IN_FOG, lotusInAmt);
        skyMat.uniforms.warm.value = lotusAmt * (1 - 0.75 * lotusInAmt);
        skyMat.uniforms.stars.value = 1 + 3 * lotusInAmt;
        skyMat.uniforms.lake.value = lotusInAmt;
        moonMat.uniforms.tint.value = lotusAmt;
        // over the lake the pillar is the only great light: no moon
        moon.visible = halo.visible = !inLotus;
        hemi.color.lerp(LOTUS_HEMI, lotusAmt * 0.8);
        mistFill.color.copy(MIST_FILL).lerp(LOTUS_HEMI, lotusAmt);
        skyMat.uniforms.dusk.value = spireAmt;
        halo.material.opacity = 0.07 * (1 - spireAmt * 0.8);
        scene.background.copy(scene.fog.color);
        skyMat.uniforms.horizon.value.set(scene.fog.color.r, scene.fog.color.g, scene.fog.color.b);
        skyMat.uniforms.teal.value = forestAmt;
        hemi.color.copy(HEMI).lerp(HEMI_FOREST, forestAmt * 0.8);
        // inside the tower: a warm, dusty dark; no open sky
        const inside = interior.contains(camera.position) ? 1 : 0;
        scene.fog.color.lerp(INSIDE_FOG, inside);
        scene.fog.density = inside ? 0.011 : 0.0046 - 0.0024 * lotusInAmt;
        hemi.intensity = inside ? 0.28 : 1.5;
        mistFill.intensity = inside ? 0 : 0.8;
        if (inside) interior.update(t, dt, camera.position);
        if (inLotus) lotusIn.update(t, dt, camera.position);
        // the finale's dawn over the plain
        if (dawn > 0) {
          scene.fog.color.lerp(DAWN_FOG, dawn);
          scene.fog.density += (0.003 - scene.fog.density) * dawn;
          scene.background.copy(scene.fog.color);
          skyMat.uniforms.horizon.value.set(scene.fog.color.r, scene.fog.color.g, scene.fog.color.b);
          hemi.color.lerp(new THREE.Color(0xb08a90), dawn * 0.6);
        }
        skyMat.uniforms.dawn.value = dawn;
        moonMat.uniforms.fade.value = Math.min(1, dawn / 0.6);
        halo.material.opacity *= 1 - Math.min(1, dawn / 0.6);
        // the thread scene: only its own lights; no sky, moon or mist reach it
        const cin = cutscene.active;
        hemi.intensity = cin ? 0.03 : hemi.intensity;
        mistFill.intensity = cin ? 0 : mistFill.intensity;
        moonLight.intensity = cin ? 0 : 2.5;
        scene.environmentIntensity = cin ? 0.04 : 0.7;
        if (cin) scene.fog.density = 0.0005;
      }
      sky.position.copy(camera.position);
      water.material.uniforms.time.value = t * 0.18; // slow: still water
      for (const u of updaters) u(t, dt);
    },
  };
};
