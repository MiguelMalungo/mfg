import * as THREE from 'three';

/*
 * Still water, written for this game (it replaces three's stock Water):
 *
 *  - a true planar mirror, rendered in HDR with mip levels, so the moon, the towers' lights and the
 *    lantern are reflected at their real brightness and soften where the surface is disturbed;
 *  - the reflected ray is bent by the surface normal and looked up again in the mirror (not a fixed
 *    screen-space wobble), so a ripple stretches a reflection the way real water does: the moon
 *    breaks into a long glittering path;
 *  - a ripple simulation (the two-buffer wave equation on a 512² grid that follows the player):
 *    every footstep, the player's and the sleepers', drops into it and sends rings across the water;
 *  - Fresnel: dark and clear looking down, a mirror toward the horizon;
 *  - the lantern's warm light pooled on the water around you.
 *
 * The stock Water clipped the far half of the mirror away (its oblique near plane tilts the far plane),
 * which is why the moon never appeared in the water. Here the mirror camera's far plane is pushed out.
 */

const SIM = 512;

const simMaterial = () =>
  new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    uniforms: {
      prev: { value: null },
      texel: { value: new THREE.Vector2(1 / SIM, 1 / SIM) },
      shift: { value: new THREE.Vector2() },
      drops: { value: Array.from({ length: 16 }, () => new THREE.Vector4()) },
      ring: { value: new THREE.Vector4(0, 0, 1, 0) },
      c2: { value: 0.035 },
      damp: { value: 0.99 },
    },
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D prev; uniform vec2 texel; uniform vec2 shift; uniform vec4 drops[16]; uniform vec4 ring; uniform float c2; uniform float damp;
      varying vec2 vUv;
      vec2 S(vec2 uv) {
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec2(0.0);
        return texture2D(prev, uv).rg;
      }
      void main() {
        // the grid follows the player: read the old field where this point of the world was
        vec2 uv = vUv + shift;
        vec2 s = S(uv);
        float h = s.r, hp = s.g;
        float lap = S(uv + vec2(texel.x, 0.0)).r + S(uv - vec2(texel.x, 0.0)).r + S(uv + vec2(0.0, texel.y)).r + S(uv - vec2(0.0, texel.y)).r - 4.0 * h;
        float hn = h + (h - hp) * damp + c2 * lap;
        // footsteps: each presses the surface down for one step, and the ring spreads from it
        for (int i = 0; i < 16; i++) {
          vec4 d = drops[i];
          if (d.w == 0.0) continue;
          float r = distance(vUv, d.xy) / d.z;
          hn -= d.w * exp(-r * r * 3.0);
        }
        // a whole circle pressed at once (the lotus's heartbeat): one ring that travels outward
        if (ring.w != 0.0) {
          float rr = (distance(vUv, ring.xy) - ring.z) / (2.5 * texel.x);
          hn -= ring.w * exp(-rr * rr);
        }
        // nothing comes back from the edge of the grid
        float edge = smoothstep(0.0, 0.04, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
        gl_FragColor = vec4(hn * edge, h * edge, 0.0, 1.0);
      }`,
  });

const VERT = /* glsl */ `
  uniform mat4 textureMatrix;
  varying vec3 vWorld;
  #include <common>
  #include <fog_pars_vertex>
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    vec4 mvPosition = viewMatrix * w;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;

const FRAG = /* glsl */ `
  uniform sampler2D mirrorSampler; uniform sampler2D normalSampler; uniform sampler2D rippleSampler;
  uniform mat4 textureMatrix;
  uniform float time; uniform float calm; uniform float reflectBase; uniform float reach; uniform float sparkle;
  uniform vec3 deepColor; uniform vec4 rippleRect; uniform float rippleOn;
  uniform vec3 lampPos; uniform vec3 lampColor;
  varying vec3 vWorld;
  #include <common>
  #include <fog_pars_fragment>
  vec2 nrm(vec2 uv) { return texture2D(normalSampler, uv).xy * 2.0 - 1.0; }
  void main() {
    vec3 toEye = cameraPosition - vWorld;
    float dist = length(toEye);
    vec3 V = toEye / dist;
    vec2 p = vWorld.xz;

    // the surface: long slow swells and a fine shiver, both faint (this is still water)
    vec2 swell = nrm(p * 0.021 + vec2(time * 0.006, time * 0.004)) * 0.6 + nrm(p * 0.057 - vec2(time * 0.008, -time * 0.005)) * 0.4;
    vec2 fine = nrm(p * 0.23 + vec2(-time * 0.021, time * 0.016)) * 0.6 + nrm(p * 0.71 + vec2(time * 0.03, time * 0.022)) * 0.4;
    // far away the fine shiver averages out; the swells stay
    vec2 tilt = (swell * 0.7 + fine * (0.3 / (1.0 + dist * 0.03))) * calm;

    // rings from footsteps
    vec2 ruv = (p - rippleRect.xy) / rippleRect.z + 0.5;
    float inside = rippleOn * step(0.0, ruv.x) * step(ruv.x, 1.0) * step(0.0, ruv.y) * step(ruv.y, 1.0);
    vec2 rip = vec2(0.0);
    if (inside > 0.0) {
      float e = 1.0 / ${SIM.toFixed(1)};
      rip.x = texture2D(rippleSampler, ruv + vec2(e, 0.0)).r - texture2D(rippleSampler, ruv - vec2(e, 0.0)).r;
      rip.y = texture2D(rippleSampler, ruv + vec2(0.0, e)).r - texture2D(rippleSampler, ruv - vec2(0.0, e)).r;
      rip *= rippleRect.w;
    }
    vec3 N = normalize(vec3(-(tilt.x + rip.x), 1.0, -(tilt.y + rip.y)));

    float NdotV = max(dot(N, V), 0.0);
    float fres = reflectBase + (1.0 - reflectBase) * pow(1.0 - NdotV, 4.0);

    // the reflected ray, followed out to where the reflected things are, and looked up in the mirror
    vec3 R = reflect(-V, N);
    R.y = max(R.y, 0.02);
    R = normalize(R);
    vec4 mc = textureMatrix * vec4(vWorld + R * reach, 1.0);
    vec2 muv = clamp(mc.xy / mc.w, 0.002, 0.998);
    // a disturbed surface gives a soft reflection
    float rough = length(rip) * 9.0 + length(tilt) * 2.5;
    vec3 refl = textureLod(mirrorSampler, muv, clamp(0.35 + rough, 0.0, 4.5)).rgb;
    // glints: where a facet of the shiver happens to throw a bright thing straight at the eye
    vec2 g2 = nrm(p * 2.7 + vec2(time * 0.11, -time * 0.07)) * calm * (2.2 / (1.0 + dist * 0.012));
    vec3 Rg = normalize(vec3(R.x - g2.x, max(R.y, 0.02), R.z - g2.y));
    vec4 mg = textureMatrix * vec4(vWorld + Rg * reach, 1.0);
    vec3 glint = textureLod(mirrorSampler, clamp(mg.xy / mg.w, 0.002, 0.998), 1.0).rgb;
    float gl = max(glint.r, max(glint.g, glint.b));
    refl += glint * smoothstep(0.55, 1.6, gl) * sparkle;

    // the body of the water: near-black, clearer looking straight down
    vec3 body = deepColor * (0.55 + 0.45 * NdotV);
    // the lantern's light, scattered by the water around you
    vec3 Lp = lampPos - vWorld;
    float ld = length(Lp);
    body += lampColor * (max(dot(N, Lp / ld), 0.0) / (1.0 + ld * ld * 0.22));

    gl_FragColor = vec4(mix(body, refl, fres), 1.0);
    #include <fog_fragment>
  }`;

/**
 * options: size (m), geometry (optional), normalMap, mirrorSize, deepColor, calm (surface movement),
 * reflectBase (reflectance looking straight down), reach (m, how far reflected things typically are),
 * ripples (bool: the footstep simulation), rippleSize (m, the simulated square that follows the player).
 */
export const createWater = (o) => {
  const geometry = o.geometry || new THREE.PlaneGeometry(o.size, o.size);
  const mirrorSize = o.mirrorSize || 1024;
  const renderTarget = new THREE.WebGLRenderTarget(mirrorSize, mirrorSize, {
    type: THREE.HalfFloatType,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
  });
  const textureMatrix = new THREE.Matrix4();
  const rippleSize = o.rippleSize || 64;
  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      mirrorSampler: { value: null },
      normalSampler: { value: null },
      rippleSampler: { value: null },
      textureMatrix: { value: null },
      time: { value: 0 },
      calm: { value: o.calm ?? 0.05 },
      reflectBase: { value: o.reflectBase ?? 0.2 },
      reach: { value: o.reach ?? 150 },
      sparkle: { value: o.sparkle ?? 0.6 },
      deepColor: { value: new THREE.Color(o.deepColor ?? 0x020304) },
      rippleRect: { value: new THREE.Vector4(0, 0, rippleSize, 10) },
      rippleOn: { value: o.ripples ? 1 : 0 },
      lampPos: { value: new THREE.Vector3(0, -1000, 0) },
      lampColor: { value: new THREE.Color(0, 0, 0) },
    },
  ]);
  uniforms.mirrorSampler.value = renderTarget.texture;
  uniforms.normalSampler.value = o.normalMap;
  uniforms.textureMatrix.value = textureMatrix;
  const material = new THREE.ShaderMaterial({ name: 'StillWater', uniforms, vertexShader: VERT, fragmentShader: FRAG, fog: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.isWater = true;

  /* ── the mirror (after three's Water.js, with the far plane pushed out) ── */
  const mirrorPlane = new THREE.Plane();
  const normal = new THREE.Vector3();
  const mirrorWorldPosition = new THREE.Vector3();
  const cameraWorldPosition = new THREE.Vector3();
  const rotationMatrix = new THREE.Matrix4();
  const lookAtPosition = new THREE.Vector3(0, 0, -1);
  const clipPlane = new THREE.Vector4();
  const view = new THREE.Vector3();
  const target = new THREE.Vector3();
  const q = new THREE.Vector4();
  const mirrorCamera = new THREE.PerspectiveCamera();
  mesh.onBeforeRender = (renderer, scene, camera) => {
    mirrorWorldPosition.setFromMatrixPosition(mesh.matrixWorld);
    cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld);
    rotationMatrix.extractRotation(mesh.matrixWorld);
    normal.set(0, 0, 1).applyMatrix4(rotationMatrix);
    view.subVectors(mirrorWorldPosition, cameraWorldPosition);
    if (view.dot(normal) > 0) return; // seen from below: no mirror
    view.reflect(normal).negate().add(mirrorWorldPosition);
    rotationMatrix.extractRotation(camera.matrixWorld);
    lookAtPosition.set(0, 0, -1).applyMatrix4(rotationMatrix).add(cameraWorldPosition);
    target.subVectors(mirrorWorldPosition, lookAtPosition).reflect(normal).negate().add(mirrorWorldPosition);
    mirrorCamera.position.copy(view);
    mirrorCamera.up.set(0, 1, 0).applyMatrix4(rotationMatrix).reflect(normal);
    mirrorCamera.lookAt(target);
    // The oblique near plane below tilts the far plane inward; with the main camera's far distance it
    // cut the sky, the moon and the hills out of the mirror. A far plane this distant keeps them.
    mirrorCamera.fov = camera.fov;
    mirrorCamera.aspect = camera.aspect;
    mirrorCamera.near = camera.near;
    mirrorCamera.far = 2e6;
    mirrorCamera.updateProjectionMatrix();
    mirrorCamera.updateMatrixWorld();
    textureMatrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    textureMatrix.multiply(mirrorCamera.projectionMatrix);
    textureMatrix.multiply(mirrorCamera.matrixWorldInverse);
    // clip everything under the water out of the mirror (Lengyel's oblique near plane)
    mirrorPlane.setFromNormalAndCoplanarPoint(normal, mirrorWorldPosition);
    mirrorPlane.applyMatrix4(mirrorCamera.matrixWorldInverse);
    clipPlane.set(mirrorPlane.normal.x, mirrorPlane.normal.y, mirrorPlane.normal.z, mirrorPlane.constant);
    const pm = mirrorCamera.projectionMatrix;
    q.x = (Math.sign(clipPlane.x) + pm.elements[8]) / pm.elements[0];
    q.y = (Math.sign(clipPlane.y) + pm.elements[9]) / pm.elements[5];
    q.z = -1.0;
    q.w = (1.0 + pm.elements[10]) / pm.elements[14];
    clipPlane.multiplyScalar(2.0 / clipPlane.dot(q));
    pm.elements[2] = clipPlane.x;
    pm.elements[6] = clipPlane.y;
    pm.elements[10] = clipPlane.z + 1.0;
    pm.elements[14] = clipPlane.w;

    const currentRenderTarget = renderer.getRenderTarget();
    const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;
    mesh.visible = false;
    renderer.shadowMap.autoUpdate = false; // the shadows are already drawn for this frame
    renderer.setRenderTarget(renderTarget);
    renderer.state.buffers.depth.setMask(true);
    if (renderer.autoClear === false) renderer.clear();
    renderer.render(scene, mirrorCamera);
    mesh.visible = true;
    renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;
    renderer.setRenderTarget(currentRenderTarget);
    const viewport = camera.viewport;
    if (viewport !== undefined) renderer.state.viewport(viewport);
  };

  /* ── the ripple simulation ── */
  let sim = null;
  if (o.ripples) {
    const mk = () => new THREE.WebGLRenderTarget(SIM, SIM, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
    const mat = simMaterial();
    const scene = new THREE.Scene();
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    quad.frustumCulled = false;
    scene.add(quad);
    sim = { a: mk(), b: mk(), mat, scene, cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), cx: 0, cz: 0, queue: [], acc: 0, started: false, ring: null };
    uniforms.rippleSampler.value = sim.a.texture;
  }
  const texelWorld = rippleSize / SIM;

  return {
    mesh,
    material,
    uniforms,
    renderTarget,
    /** A footstep (or anything else touching the water) at (x, z): radius in metres, strength about 1. */
    drop(x, z, radius = 0.3, strength = 1) {
      if (sim && sim.queue.length < 64) sim.queue.push([x, z, radius, strength]);
    },
    /** A whole circle of the surface pressed at once, centred on (x, z): a single ring spreads from it. */
    ring(x, z, radius, strength = 1) {
      if (sim) sim.ring = [x, z, radius, strength];
    },
    /** Each frame, before the scene is drawn. (cx, cz): where the player is. */
    update(renderer, t, dt, cx, cz) {
      uniforms.time.value = t;
      if (!sim || !mesh.visible) return;
      // a fixed step of 1/60 s, so the rings travel at the same speed whatever the frame rate
      sim.acc = Math.min(sim.acc + dt, 3 / 60);
      const n = Math.floor(sim.acc * 60 + 1e-4);
      if (n < 1) return;
      sim.acc -= n / 60;
      // the grid follows the player in whole cells, so the field doesn't swim
      const nx = Math.round(cx / texelWorld) * texelWorld;
      const nz = Math.round(cz / texelWorld) * texelWorld;
      let sx = (nx - sim.cx) / rippleSize, sz = (nz - sim.cz) / rippleSize;
      if (!sim.started || Math.abs(sx) > 0.5 || Math.abs(sz) > 0.5) {
        // first frame, or the player was moved far away: start from flat water
        sx = sz = 2;
        sim.started = true;
      }
      sim.cx = nx;
      sim.cz = nz;
      const prevTarget = renderer.getRenderTarget();
      const steps = sim.mat.uniforms.drops.value;
      for (let k = 0; k < n; k++) {
        for (let i = 0; i < 16; i++) {
          const d = k === 0 ? sim.queue[i] : null;
          if (d) steps[i].set((d[0] - nx) / rippleSize + 0.5, (d[1] - nz) / rippleSize + 0.5, d[2] / rippleSize, d[3] * 0.02);
          else steps[i].set(0, 0, 1, 0);
        }
        if (k === 0) sim.queue.splice(0, 16);
        const R = k === 0 ? sim.ring : null;
        if (R) sim.mat.uniforms.ring.value.set((R[0] - nx) / rippleSize + 0.5, (R[1] - nz) / rippleSize + 0.5, R[2] / rippleSize, R[3] * 0.02);
        else sim.mat.uniforms.ring.value.w = 0;
        if (k === 0) sim.ring = null;
        sim.mat.uniforms.prev.value = sim.a.texture;
        // only the first step moves the field with the grid
        sim.mat.uniforms.shift.value.set(k === 0 ? sx : 0, k === 0 ? sz : 0);
        renderer.setRenderTarget(sim.b);
        renderer.render(sim.scene, sim.cam);
        const tmp = sim.a;
        sim.a = sim.b;
        sim.b = tmp;
      }
      renderer.setRenderTarget(prevTarget);
      uniforms.rippleSampler.value = sim.a.texture;
      uniforms.rippleRect.value.set(nx, nz, rippleSize, uniforms.rippleRect.value.w);
    },
    /** The lantern's light on the water. */
    setLamp(pos, color) {
      uniforms.lampPos.value.copy(pos);
      uniforms.lampColor.value.copy(color);
    },
  };
};
