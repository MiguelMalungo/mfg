import * as THREE from 'three';

/*
 * Atmosphere: replaces three's fog with
 *  - the same exponential distance fog as before,
 *  - a low mist that hugs the water (height fog, thickest at the surface),
 *    broken into drifting banks by world-space noise,
 *  - light scattered in the air around the three monuments: red near the lotus,
 *    blue near the spire, green near the tree (computed along the whole view ray,
 *    so you see the glow hanging in the air between you and them).
 * Patched into ShaderChunk, so every material with fog enabled gets it. Import before anything compiles.
 */

// monument positions (keep in sync with world.js) and their colours
const LIGHTS = /* glsl */ `
  const vec3 L_POS[3] = vec3[3](vec3(0.0, 14.0, -175.0), vec3(-78.0, 20.0, -150.0), vec3(82.0, 10.0, -150.0));
  const vec3 L_COL[3] = vec3[3](vec3(1.0, 0.28, 0.18), vec3(0.22, 0.45, 1.0), vec3(0.2, 0.85, 0.72));
  const float L_RAD[3] = float[3](55.0, 45.0, 62.0);
`;

THREE.ShaderChunk.fog_pars_vertex = /* glsl */ `
#ifdef USE_FOG
  varying vec3 vFogWorld;
#endif`;

THREE.ShaderChunk.fog_vertex = /* glsl */ `
#ifdef USE_FOG
  // world position from the view-space position (works for instanced and skinned meshes too)
  vFogWorld = cameraPosition + transpose(mat3(viewMatrix)) * mvPosition.xyz;
#endif`;

THREE.ShaderChunk.fog_pars_fragment = /* glsl */ `
#ifdef USE_FOG
  uniform vec3 fogColor;
  varying vec3 vFogWorld;
  #ifdef FOG_EXP2
    uniform float fogDensity;
  #else
    uniform float fogNear;
    uniform float fogFar;
  #endif
  ${LIGHTS}
  float fogHash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 15731.743); }
  float fogNoise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(fogHash(i), fogHash(i + vec2(1, 0)), f.x), mix(fogHash(i + vec2(0, 1)), fogHash(i + vec2(1, 1)), f.x), f.y);
  }
#endif`;

THREE.ShaderChunk.fog_fragment = /* glsl */ `
#ifdef USE_FOG
  {
    vec3 ray = vFogWorld - cameraPosition;
    float dist = length(ray);
    vec3 dir = ray / max(dist, 1e-4);
    #ifdef FOG_EXP2
      float tau = fogDensity * fogDensity * dist * dist;
    #else
      float tau = smoothstep(fogNear, fogFar, dist) * 4.0;
    #endif
    // low mist: density k·exp(-y/H), integrated exactly along the ray
    const float H = 2.2;
    float y0 = max(cameraPosition.y, 0.0), y1 = max(vFogWorld.y, 0.0);
    float dy = y1 - y0;
    float e0 = exp(-y0 / H), e1 = exp(-y1 / H);
    float avg = abs(dy) > 1e-3 ? (e0 - e1) * H / dy : e0;
    // banks of mist: patchy, thicker away from the paths
    vec2 q = vFogWorld.xz * 0.035;
    float bank = 0.45 + 0.9 * (fogNoise(q) * 0.65 + fogNoise(q * 2.7 + 3.1) * 0.35);
    float mist = 0.008 * bank * dist * avg;
    float fogF = 1.0 - exp(-(tau + mist));
    vec3 fcol = mix(fogColor, fogColor * 1.25, clamp(mist / (tau + mist + 1e-4), 0.0, 1.0));
    // the mist under the moon is brighter
    fcol *= 1.0 + 0.25 * pow(max(dot(dir, normalize(vec3(0.0, 400.0, -900.0))), 0.0), 8.0);
    // light scattered in the air near the monuments, gathered at the ray's closest approach
    vec3 glow = vec3(0.0);
    for (int i = 0; i < 3; i++) {
      vec3 toL = L_POS[i] - cameraPosition;
      float t = clamp(dot(toL, dir), 0.0, dist);
      float d = length(toL - dir * t);
      float k = exp(-(d * d) / (L_RAD[i] * L_RAD[i]));
      // more air in front of the light → more glow; none if the surface hides the light
      glow += L_COL[i] * k * clamp(t / 60.0, 0.0, 1.0);
    }
    gl_FragColor.rgb = mix(gl_FragColor.rgb, fcol, fogF) + glow * 0.05 * (0.3 + fogF);
  }
#endif`;
