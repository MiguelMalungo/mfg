import * as THREE from 'three';
import { W, H, Z_BACK, Z_END } from './house.js';

/*
 * Baked candle light for the corridor (PLAN.md 10.7 step 3).
 *
 * blender/bake/corridor.blend holds the corridor's shell, its furniture as blocks, and a warm point light
 * at every chandelier, sconce and console candle. Cycles baked the light falling on the floor, the
 * ceiling and both walls (direct and bounced, with soft shadows) into assets/house/bake/*.png.
 * Each map is irradiance, encoded v = sqrt(I / ref) (bake.json holds ref):
 *   floor, ceil   u = (x + W/2) / W,  v = (z - Z_END) / L
 *   wallL, wallR  u = (z - Z_END) / L, v = y / H
 *
 * In the game the corridor's own materials (floor, wallpaper, panelling, woodwork, ceiling) look the
 * light up by their world position, inside the corridor only. There the candles' real-time point lights
 * are turned down (they have no shadows, so they light every corner the same) and the baked light is
 * added in their place: pools under the lamps, dark stretches between, dark corners. The flask's light
 * is the one point light with a shadow (three puts shadow-casting lights first in its loop), and it is
 * left alone. No light is added or removed, so no other shader changes.
 */
const DIR = './assets/house/bake/';

// strength and direct were tuned against the trailer frames: the corridor's mean luma about 0.12 (__g.luma())
export const applyBake = (mats, { strength = 0.3, direct = 0.05 } = {}) => {
  const loader = new THREE.TextureLoader();
  const tex = (name) => {
    const t = loader.load(DIR + name + '.png');
    t.colorSpace = THREE.NoColorSpace;
    t.minFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  };
  const u = {
    bakeFloor: { value: tex('floor') },
    bakeCeil: { value: tex('ceil') },
    bakeWallL: { value: tex('wallL') },
    bakeWallR: { value: tex('wallR') },
    // x: how much baked light; y: what is left of the candles' real-time light; z: ref of the encoding
    bakeK: { value: new THREE.Vector3(strength, direct, 1.635) },
  };
  fetch(DIR + 'bake.json')
    .then((r) => r.json())
    .then((j) => (u.bakeK.value.z = j.ref))
    .catch(() => {});

  const L = Z_BACK - Z_END;
  const f = (v) => v.toFixed(3);
  const pars = `
    uniform sampler2D bakeFloor, bakeCeil, bakeWallL, bakeWallR;
    uniform vec3 bakeK;
    varying vec3 vBakeW;
    float bakeInside() {
      vec3 p = vBakeW;
      return step(${f(-W / 2 - 0.35)}, p.x) * step(p.x, ${f(W / 2 + 0.35)}) * step(-0.05, p.y) * step(p.y, ${f(H + 0.05)})
        * step(${f(Z_END - 0.05)}, p.z) * step(p.z, ${f(Z_BACK + 0.05)});
    }
    vec3 bakeLight() {
      vec3 p = vBakeW;
      float vz = clamp((p.z - ${f(Z_END)}) / ${f(L)}, 0.0, 1.0);
      vec3 e;
      if (p.y < 0.03) e = texture2D(bakeFloor, vec2(clamp((p.x + ${f(W / 2)}) / ${f(W)}, 0.0, 1.0), vz)).rgb;
      else if (p.y > ${f(H - 0.03)}) e = texture2D(bakeCeil, vec2(clamp((p.x + ${f(W / 2)}) / ${f(W)}, 0.0, 1.0), vz)).rgb;
      else {
        vec2 wv = vec2(vz, clamp(p.y / ${f(H)}, 0.0, 1.0));
        e = p.x < 0.0 ? texture2D(bakeWallL, wv).rgb : texture2D(bakeWallR, wv).rgb;
      }
      return e * e * bakeK.z;
    }
  `;
  const loopHook = 'getPointLightInfo( pointLight, geometryPosition, directLight );';
  const begin = THREE.ShaderChunk.lights_fragment_begin.replace(
    loopHook,
    `${loopHook}
    #if ( UNROLLED_LOOP_INDEX >= NUM_POINT_LIGHT_SHADOWS )
      directLight.color *= bakeDirect;
    #endif`,
  );
  if (begin === THREE.ShaderChunk.lights_fragment_begin) console.warn('bake: three changed its point-light loop; the bake is off');

  for (const mat of mats) {
    const prev = mat.onBeforeCompile;
    const prevKey = mat.customProgramCacheKey;
    mat.onBeforeCompile = (sh, r) => {
      prev?.call(mat, sh, r);
      if (begin === THREE.ShaderChunk.lights_fragment_begin) return;
      Object.assign(sh.uniforms, u);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vBakeW;').replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vec4 bakeP = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          bakeP = instanceMatrix * bakeP;
        #endif
        vBakeW = (modelMatrix * bakeP).xyz;`,
      );
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\n' + pars)
        .replace('#include <lights_fragment_begin>', `float bakeIn = bakeInside();\nfloat bakeDirect = mix(1.0, bakeK.y, bakeIn);\n${begin}`)
        .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>\nif (bakeIn > 0.5) reflectedLight.indirectDiffuse += material.diffuseColor * bakeLight() * bakeK.x;`);
    };
    mat.customProgramCacheKey = () => (prevKey ? prevKey.call(mat) : '') + '-bake1';
    mat.needsUpdate = true;
  }
  return u.bakeK.value;
};
