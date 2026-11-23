import * as THREE from 'three';

/*
 * Floor reflections (refs/v08.jpg: the candles and the sack doubled in a worn, waxed floor).
 *
 * Each frame the scene is drawn a second time, at half resolution, from the camera mirrored in the
 * floor (y = 0). The mirrored camera is built like three's Reflector: reflect the eye, the point it
 * looks at and its up vector, then lookAt. That keeps the winding order right, and projecting a
 * point of the floor with this camera lands on its reflection. Geometry below the floor (the stair
 * behind the door) is cut by a clipping plane while it draws.
 *
 * The floor's material then samples that image where each pixel of the floor projects to, with:
 *  - Fresnel: little straight down, strong at grazing angles
 *  - the wood: polished planks reflect, the dull gaps and worn patches barely do (roughness map)
 *  - the grain and the boards' unevenness ripple it (normal map)
 *  - a blur stretched toward the eye, so bright things smear into streaks, as on a real waxed floor
 */


/*
 * streak (the water): lights do not mirror as points on moving water but as long broken columns down
 * toward you (iflood, i16). The blur is stretched far along the screen's vertical and kept narrow across,
 * and the ripples bend it in bands, so each column breaks into pieces.
 */
export const makeFloorReflection = (renderer, scene, camera, floorMat, { hide = [], planeY = 0, key = 'floor', streak = 0 } = {}) => {
  // only what is above the mirror is drawn into it
  const MIRROR = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(planeY + 0.002));
  const rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, depthBuffer: true });
  rt.texture.generateMipmaps = false;
  const vcam = new THREE.PerspectiveCamera();
  const texMatrix = new THREE.Matrix4();
  const u = {
    tRefl: { value: rt.texture },
    reflMatrix: { value: texMatrix },
    reflStrength: { value: 4.0 },
    reflTexel: { value: new THREE.Vector2(1, 1) },
    glowPos: { value: Array.from({ length: 8 }, () => new THREE.Vector3()) },
    glowCol: { value: Array.from({ length: 8 }, () => new THREE.Vector3()) },
    glowN: { value: 0 },
    glowStrength: { value: 0.008 },
  };

  /* the floor material: sample the reflection where this point of the floor projects */
  const prev = floorMat.onBeforeCompile;
  floorMat.onBeforeCompile = (sh, r) => {
    prev?.(sh, r);
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vReflW;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvReflW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform sampler2D tRefl; uniform mat4 reflMatrix; uniform float reflStrength; uniform vec2 reflTexel;
        uniform vec3 glowPos[8]; uniform vec3 glowCol[8]; uniform int glowN; uniform float glowStrength;
        varying vec3 vReflW;`,
      )
      .replace(
        '#include <opaque_fragment>',
        `{
          // where this point of the floor lands in the mirrored image, rippled by the boards
          vec4 rc = reflMatrix * vec4(vReflW, 1.0);
          vec2 ruv = rc.xy / rc.w;
          ruv += (normal - nonPerturbedNormal).xy * ${(0.06 + 0.5 * streak).toFixed(3)};
          ${streak ? 'ruv.x += sin(vReflW.z * 9.0 + vReflW.x * 2.0) * 0.004 * ' + streak.toFixed(2) + ';' : ''}
          // how far this point is from the eye: far floor reflects more, and blurs more along the view
          vec3 toEye = cameraPosition - vReflW;
          float dist = length(toEye);
          float cosT = clamp(toEye.y / dist, 0.0, 1.0);
          float F = 0.04 + 0.96 * pow(1.0 - cosT, 5.0);
          // polish: smooth planks mirror, rough patches and the gaps barely do
          float polish = pow(clamp(1.0 - roughnessFactor, 0.0, 1.0), 2.4);
          // a blur stretched along the screen's vertical, wider for rougher wood
          float spread = (2.0 + 26.0 * roughnessFactor) + ${(90 * streak).toFixed(1)};
          vec3 refl = vec3(0.0);
          float wsum = 0.0;
          for (int i = 0; i < 12; i++) {
            float fi = float(i);
            float a = fi * 2.39996;
            float r = sqrt((fi + 0.5) / 12.0);
            vec2 o = vec2(cos(a) * ${streak ? '0.05' : '0.35'}, sin(a) * 1.0) * r * spread * reflTexel;
            float w = 1.0 - r * 0.6;
            refl += texture2D(tRefl, ruv + o).rgb * w;
            wsum += w;
          }
          refl /= wsum;
          // fade out at the edges of the mirrored image, where there is nothing to sample
          float edge = smoothstep(0.0, 0.04, ruv.x) * smoothstep(1.0, 0.96, ruv.x) * smoothstep(0.0, 0.04, ruv.y) * smoothstep(1.0, 0.96, ruv.y);
          // The candles' glow in the air is added after the scene is drawn (the haze pass), so the
          // mirror never sees it. Add it here instead: the light scattered along the reflected ray,
          // in the same closed form as the haze, widened by the wood's roughness into streaks.
          vec3 nW = normalize((vec4(normal, 0.0) * viewMatrix).xyz);
          vec3 Rd = reflect(-normalize(toEye), nW);
          vec3 glow = vec3(0.0);
          float wide = 0.003 + 0.09 * roughnessFactor * roughnessFactor + ${(0.02 * streak).toFixed(3)};
          for (int i = 0; i < 8; i++) {
            if (i >= glowN) break;
            vec3 q = glowPos[i] - vReflW;
            float h = dot(Rd, q);
            float c = sqrt(max(dot(q, q) - h * h, 0.0) + wide);
            glow += glowCol[i] * (atan((30.0 - h) / c) - atan(-h / c)) / c;
          }
          outgoingLight += (refl * reflStrength * edge + glow * glowStrength) * F * polish * diffuseColor.a;
        }
        #include <opaque_fragment>`,
      );
  };
  floorMat.customProgramCacheKey = () => 'st2g-refl-v3-' + key + streak;
  floorMat.needsUpdate = true;

  const _p = new THREE.Vector3(), _t = new THREE.Vector3(), _up = new THREE.Vector3(), _d = new THREE.Vector3();
  const bias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
  const reflectPoint = (v) => v.set(v.x, 2 * planeY - v.y, v.z);
  let scale = 0.5;

  const resize = () => {
    const s = renderer.getDrawingBufferSize(new THREE.Vector2());
    rt.setSize(Math.max(2, Math.round(s.x * scale)), Math.max(2, Math.round(s.y * scale)));
    u.reflTexel.value.set(1 / rt.width, 1 / rt.height);
  };
  resize();

  /** Draws the mirrored scene. Call once per frame, before the main render. */
  const update = (skip) => {
    if (skip) return;
    camera.updateMatrixWorld();
    // the mirrored eye, look target and up
    _p.setFromMatrixPosition(camera.matrixWorld);
    _d.set(0, 0, -1).transformDirection(camera.matrixWorld);
    _t.copy(_p).add(_d);
    _up.set(0, 1, 0).transformDirection(camera.matrixWorld);
    reflectPoint(_p);
    reflectPoint(_t);
    _up.y = -_up.y;
    vcam.position.copy(_p);
    vcam.up.copy(_up);
    vcam.lookAt(_t);
    vcam.fov = camera.fov;
    vcam.aspect = camera.aspect;
    vcam.near = camera.near;
    vcam.far = camera.far;
    vcam.updateProjectionMatrix();
    vcam.updateMatrixWorld();
    texMatrix.copy(bias).multiply(vcam.projectionMatrix).multiply(vcam.matrixWorldInverse);

    // draw: without the floor itself, without whatever the caller hides, above the floor only
    const was = hide.map((o) => o.visible);
    hide.forEach((o) => (o.visible = false));
    const floorVis = [];
    scene.traverse((o) => o.material === floorMat && (floorVis.push(o), (o.visible = false)));
    const prevClip = renderer.clippingPlanes;
    const prevAuto = renderer.shadowMap.autoUpdate;
    const prevTarget = renderer.getRenderTarget();
    renderer.clippingPlanes = [MIRROR];
    renderer.shadowMap.autoUpdate = false; // the shadow maps from the main render are still good
    renderer.setRenderTarget(rt);
    renderer.clear();
    renderer.render(scene, vcam);
    renderer.setRenderTarget(prevTarget);
    renderer.shadowMap.autoUpdate = prevAuto;
    renderer.clippingPlanes = prevClip;
    floorVis.forEach((o) => (o.visible = true));
    hide.forEach((o, i) => (o.visible = was[i]));
  };

  const _w = new THREE.Vector3();
  /** The lights whose glow the floor should mirror: [{ light, weight }] (same list as the haze). */
  const setGlow = (list) => {
    const n = Math.min(8, list.length);
    for (let i = 0; i < n; i++) {
      const { light, weight } = list[i];
      u.glowPos.value[i].copy(light.getWorldPosition(_w));
      u.glowCol.value[i].set(light.color.r, light.color.g, light.color.b).multiplyScalar(light.intensity * weight);
    }
    u.glowN.value = n;
  };
  return { setGlow, update, resize, u, rt, vcam, setScale: (s) => ((scale = s), resize()), hideAlso: (list) => hide.push(...list) };
};
