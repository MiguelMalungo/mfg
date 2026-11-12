import * as THREE from 'three';

/*
 * The pillar of light (after refs/lotus-beam.webp): a white-hot core rising to the top of the sky,
 * a warm sheath round it, and a fan of hundreds of fine rays spreading upward from its foot.
 * Everything is additive and unfogged. One number, `power`, drives it all; the owner of the pillar
 * sets it every frame (the lotus trial reports its progress through it).
 *
 * Used inside the lotus (lotus-interior.js) and over the lotus on the plain at the end (finale.js).
 */

const BEAM_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const BEAM_FRAG = /* glsl */ `
  uniform vec3 color; uniform float power; uniform float width; uniform float broken; uniform float time; uniform float topFade;
  varying vec2 vUv;
  float h1(float x) { return fract(sin(x * 91.7) * 43758.5453); }
  float n1(float x) { float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(h1(i), h1(i + 1.0), f); }
  void main() {
    float x = (vUv.x - 0.5) * 2.0;
    float prof = exp(-x * x * width);
    // brightest at the foot, fading toward the top of the sky
    float along = smoothstep(0.0, 0.004, vUv.y) * pow(1.0 - vUv.y, topFade);
    // when the heart falters, the line breaks into pieces
    float brk = mix(1.0, smoothstep(0.35, 0.65, n1(vUv.y * 60.0 + time * 3.0)), broken);
    gl_FragColor = vec4(color * prof * along * brk * power, 1.0);
  }`;

const FAN_VERT = /* glsl */ `
  uniform float height;
  varying float vA; varying float vH; varying float vEdge;
  void main() {
    vA = atan(position.z, position.x) / 6.2831853 + 0.5;
    vH = position.y / height;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * normal);
    // dimmer where the cone is seen edge-on: there the rays crowd together into a smear
    vEdge = pow(abs(dot(n, normalize(-mv.xyz))), 0.6);
    gl_Position = projectionMatrix * mv;
  }`;

const FAN_FRAG = /* glsl */ `
  uniform float power; uniform float drift; uniform float seed; uniform vec3 color;
  varying float vA; varying float vH; varying float vEdge;
  float streak(float a, float f, float s) {
    float i = floor(a * f), fr = fract(a * f);
    float h = fract(sin(i * 91.7 + s) * 43758.5);
    return smoothstep(0.5, 0.0, abs(fr - 0.5)) * step(0.45, h) * h;
  }
  void main() {
    float rays = streak(vA, 220.0, seed) + 0.6 * streak(fract(vA + drift), 517.0, seed + 6.0);
    float fade = pow(1.0 - vH, 1.6) * smoothstep(0.0, 0.03, vH);
    gl_FragColor = vec4(color * rays * fade * vEdge * power, 1.0);
  }`;

export const buildPillar = ({ height = 700, coreWidth = 0.5, sheathWidth = 7, fanAngles = [18, 26] } = {}) => {
  const g = new THREE.Group();
  const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false };

  const beam = (w, color, width, topFade) => {
    const geo = new THREE.PlaneGeometry(w, height);
    geo.translate(0, height / 2, 0);
    const m = new THREE.Mesh(
      geo,
      new THREE.ShaderMaterial({
        ...additive,
        side: THREE.DoubleSide,
        uniforms: { color: { value: color }, power: { value: 0 }, width: { value: width }, broken: { value: 0 }, time: { value: 0 }, topFade: { value: topFade } },
        vertexShader: BEAM_VERT,
        fragmentShader: BEAM_FRAG,
      }),
    );
    m.frustumCulled = false;
    g.add(m);
    return m;
  };
  const core = beam(coreWidth, new THREE.Color(1.0, 0.9, 0.75).multiplyScalar(8), 9, 0.6);
  const sheath = beam(sheathWidth, new THREE.Color(1.0, 0.55, 0.3).multiplyScalar(0.8), 4, 1.4);

  const fans = fanAngles.map((deg, k) => {
    const rTop = height * Math.tan((deg * Math.PI) / 180);
    const geo = new THREE.ConeGeometry(rTop, height, 256, 8, true);
    geo.rotateX(Math.PI); // apex down
    geo.translate(0, height / 2, 0); // apex at the foot
    const m = new THREE.Mesh(
      geo,
      new THREE.ShaderMaterial({
        ...additive,
        side: THREE.DoubleSide,
        uniforms: { power: { value: 0 }, drift: { value: 0 }, seed: { value: 1 + k * 13 }, height: { value: height }, color: { value: new THREE.Color(1.0, 0.72, 0.5).multiplyScalar(k ? 0.55 : 0.8) } },
        vertexShader: FAN_VERT,
        fragmentShader: FAN_FRAG,
      }),
    );
    m.frustumCulled = false;
    g.add(m);
    return m;
  });

  const wp = new THREE.Vector3();
  return {
    group: g,
    core,
    sheath,
    fans,
    power: 0,
    broken: 0,
    /** Turn the beams to face the camera round the vertical axis, and pass on the power. */
    update(t, camPos) {
      g.getWorldPosition(wp);
      const yaw = Math.atan2(camPos.x - wp.x, camPos.z - wp.z);
      core.rotation.y = sheath.rotation.y = yaw;
      for (const b of [core, sheath]) {
        // the sheath saturates early, so the core stays the brightest thing as the power grows
        b.material.uniforms.power.value = b === core ? this.power : Math.min(this.power, 0.6 + 0.3 * this.power);
        b.material.uniforms.time.value = t;
        b.material.uniforms.broken.value = b === core ? this.broken : this.broken * 0.6;
      }
      fans.forEach((f, k) => {
        f.material.uniforms.power.value = this.power * (1 - this.broken * 0.7);
        f.material.uniforms.drift.value = t * 0.002 * (k ? -1 : 1);
      });
    },
  };
};
