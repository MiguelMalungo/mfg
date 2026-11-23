import * as THREE from 'three';

/*
 * The black water of the cellar and the hall (iflood, i15, i16): it has to read as liquid, not as a
 * polished floor.
 *
 *  - It moves: a slow swell of a few long waves crossing each other, and the ripple map sampled twice more,
 *    at two scales drifting different ways, on top of the material's own (house.js `rip`). The normals change
 *    every frame, so the mirror (reflect.js, `streak`) and the candles' long columns in it break and shimmer,
 *    and the candles' own highlights glint and crawl.
 *  - It answers what moves in it: rings spread from your steps while you wade, from the horse's legs, from
 *    the candles standing at the waterline and from each letter still afloat (a slow ring now and then).
 *    Up to RINGS at once, the oldest replaced.
 *  - You see into it where it is shallow: by the stair the steps show under it, along the walls the sunken
 *    doors go down into it; in the open it is murky, and toward the horizon it closes into a black mirror
 *    (Fresnel).
 *
 * It works on the phone too (no mirror pass there: the glints, the rings and the candles' glow streaks remain).
 */
const RINGS = 24;
const FLAMES = 10; // the phone's stand-in for the mirror: the nearest candle flames, mirrored analytically

export const makeWater = (mat, { shallowZ = null, lite = false } = {}) => {
  const u = {
    wTime: { value: 0 },
    wRings: { value: Array.from({ length: RINGS }, () => new THREE.Vector4(0, 0, -99, 0)) },
    wShallowZ: { value: shallowZ ?? 1e4 },
    wFlame: { value: Array.from({ length: FLAMES }, () => new THREE.Vector3()) },
    wFlameN: { value: 0 },
    wFlameK: { value: 2.2 },
  };
  const prev = mat.onBeforeCompile;
  const prevKey = mat.customProgramCacheKey;
  mat.onBeforeCompile = (sh, r) => {
    prev?.call(mat, sh, r);
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWaterW;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWaterW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vWaterW;
        uniform float wTime; uniform vec4 wRings[${RINGS}]; uniform float wShallowZ;
        uniform vec3 wFlame[${FLAMES}]; uniform int wFlameN; uniform float wFlameK;
        // slope (dh/dx, dh/dz) of a few long waves crossing: h = sum a sin(k d.p - w t)
        vec2 waterSwell(vec2 p, float t) {
          vec2 g = vec2(0.0);
          vec2 d; float k, a, w;
          d = vec2(0.86, 0.51);  k = 2.3; a = 0.010; w = 1.1; g += a * k * d * cos(k * dot(d, p) - w * t);
          d = vec2(-0.39, 0.92); k = 3.7; a = 0.006; w = 1.6; g += a * k * d * cos(k * dot(d, p) - w * t + 1.3);
          d = vec2(0.97, -0.24); k = 6.1; a = 0.003; w = 2.3; g += a * k * d * cos(k * dot(d, p) - w * t + 4.1);
          d = vec2(-0.71, -0.70); k = 9.3; a = 0.0018; w = 3.1; g += a * k * d * cos(k * dot(d, p) - w * t + 2.2);
          return g;
        }
        // rings: a packet of short waves running out from where something broke the surface, fading as it goes
        vec2 waterRings(vec2 p, float t) {
          vec2 g = vec2(0.0);
          for (int i = 0; i < ${RINGS}; i++) {
            vec4 R = wRings[i];
            float age = t - R.z;
            if (age < 0.0 || age > 4.5 || R.w <= 0.0) continue;
            vec2 q = p - R.xy;
            float r = length(q) + 1e-4;
            float dr = r - (0.08 + 0.42 * age);
            float env = R.w * exp(-age * 0.85) * exp(-dr * dr * 10.0) / sqrt(0.3 + r);
            g += (q / r) * env * 34.0 * cos(dr * 34.0);
          }
          return g;
        }`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        {
          vec2 p = vWaterW.xz;
          vec2 g = waterSwell(p, wTime) + waterRings(p, wTime);
          #ifdef USE_NORMALMAP
            // the ripple map twice more, at two scales drifting different ways
            vec2 n1 = texture2D(normalMap, p * 0.23 + vec2(wTime * 0.011, -wTime * 0.007)).xy * 2.0 - 1.0;
            vec2 n2 = texture2D(normalMap, p * 0.61 + vec2(-wTime * 0.019, wTime * 0.013)).xy * 2.0 - 1.0;
            g -= (n1 * 0.05 + n2 * 0.03) * vec2(1.0, -1.0);
          #endif
          vec3 nW = normalize(vec3(-g.x, 1.0, -g.y));
          vec3 nV = normalize((viewMatrix * vec4(nW, 0.0)).xyz);
          normal = normalize(nV + (normal - nonPerturbedNormal));
        }`,
      )
      .replace(
        '#include <alphamap_fragment>',
        `#include <alphamap_fragment>
        {
          // clear straight down, a black mirror toward the horizon; clearer in the shallows by the stair
          vec3 toEye = cameraPosition - vWaterW;
          float cosT = clamp(toEye.y / length(toEye), 0.0, 1.0);
          float fr = pow(1.0 - cosT, 3.0);
          float shallow = smoothstep(wShallowZ - 3.5, wShallowZ, vWaterW.z);
          // murky in the open; you see down into it in the shallows by the stair and along the walls,
          // where the sunken doors stand in it
          float edge = smoothstep(1.5, 2.4, abs(vWaterW.x));
          float clear = max(0.45 * shallow, 0.2 * edge);
          diffuseColor.a = mix(${lite ? '0.92' : '0.9'} - clear, 0.98, fr);
        }`,
      )
      .replace(
        '#include <opaque_fragment>',
        lite
          ? `{
          // no mirror pass on the phone: each nearby flame's mirror image, found along the reflected ray of the
          // rippled surface, so the candles still stand in the water as broken, shimmering columns
          vec3 Vd = normalize(vWaterW - cameraPosition);
          vec3 nW = normalize((vec4(normal, 0.0) * viewMatrix).xyz);
          vec3 Rd = reflect(Vd, nW);
          float cosT = clamp(-Vd.y, 0.0, 1.0);
          float F = 0.04 + 0.96 * pow(1.0 - cosT, 5.0);
          float fl = 0.0;
          for (int i = 0; i < ${FLAMES}; i++) {
            if (i >= wFlameN) break;
            vec3 q = wFlame[i] - vWaterW;
            float h = dot(q, Rd);
            if (h <= 0.0) continue;
            float d2 = max(dot(q, q) - h * h, 0.0);
            fl += exp(-d2 / (0.0005 * h * h + 0.00004));
          }
          outgoingLight += vec3(1.0, 0.55, 0.2) * fl * wFlameK * F * diffuseColor.a;
        }
        #include <opaque_fragment>`
          : '#include <opaque_fragment>',
      );
  };
  mat.customProgramCacheKey = () => (prevKey ? prevKey.call(mat) : '') + '-water1';
  mat.needsUpdate = true;

  let next = 0;
  /** A ring where something breaks the surface. */
  const ring = (x, z, amp, t) => {
    u.wRings.value[next].set(x, z, t, amp);
    next = (next + 1) % RINGS;
  };

  // things that leave rings as they move: { pos: () => Vector3 | null, amp, last }
  const movers = [];
  // things that sit in the water and send a slow ring now and then: { pos: () => Vector3 | null, amp, every, at }
  const floats = [];
  const track = (pos, amp = 0.0025, step = 0.42) => movers.push({ pos, amp, step, last: null });
  const bob = (pos, amp = 0.0012, every = 3.5) => floats.push({ pos, amp, every, at: Math.random() * every });

  const update = (t, dt, inView = true) => {
    u.wTime.value = t;
    if (!inView) return;
    for (const m of movers) {
      const p = m.pos();
      if (!p) {
        m.last = null;
        continue;
      }
      if (!m.last) m.last = p.clone();
      const d = Math.hypot(p.x - m.last.x, p.z - m.last.z);
      if (d > m.step) {
        ring(p.x, p.z, m.amp * Math.min(1.6, 0.6 + d), t);
        m.last.copy(p);
      }
    }
    for (const f of floats) {
      f.at -= dt;
      if (f.at > 0) continue;
      f.at = f.every * (0.7 + 0.6 * Math.random());
      const p = f.pos();
      if (p) ring(p.x + (Math.random() - 0.5) * 0.05, p.z + (Math.random() - 0.5) * 0.05, f.amp, t);
    }
  };
  /** The phone only: the flames to mirror (world positions, nearest first; at most FLAMES). */
  const setFlames = (list) => {
    const n = Math.min(FLAMES, list.length);
    for (let i = 0; i < n; i++) u.wFlame.value[i].copy(list[i]);
    u.wFlameN.value = n;
  };
  return { u, ring, track, bob, update, setFlames };
};
