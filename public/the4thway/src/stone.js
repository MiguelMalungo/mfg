import * as THREE from 'three';
import { fbm, noise2, rng } from './textures.js';

/*
 * Weathered stone, for everything carved or built in this world (the lotus and its steps, the needle
 * towers, the tower's flagstones). Made in code: one tileable map (rgb = tone, a = height) laid on
 * by world position from three sides (so it needs no uv, never stretches, and has the same grain on
 * a 1 m slab and a 60 m tower), at two scales so no repeat shows. It gives the surface its mottling,
 * stains, pits and hairline cracks, and bends the light with them.
 *
 * Use: applyStone(shader, material) inside a MeshStandardMaterial's onBeforeCompile
 * (stoneMaterial in world.js does it for plain stone). Options live in uniforms, not in the shader
 * text, so every stone material shares one compiled program per variant.
 */

let map = null;
export const stoneMap = () => {
  if (map) return map;
  const S = 1024;
  const data = new Uint8Array(S * S * 4);
  const r = rng(977);
  // cracks and pits, drawn on a canvas first (tileable: drawn nine times, wrapped)
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, S, S);
  g.lineCap = 'round';
  const wrap = (draw) => {
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
      g.save();
      g.translate(ox, oy);
      draw();
      g.restore();
    }
  };
  for (let k = 0; k < 46; k++) {
    let x = r() * S, y = r() * S;
    let a = r() * Math.PI * 2;
    const pts = [[x, y]];
    const n = 8 + Math.floor(r() * 16);
    for (let s = 0; s < n; s++) {
      a += (r() - 0.5) * 1.1;
      x += Math.cos(a) * (10 + r() * 26);
      y += Math.sin(a) * (10 + r() * 26);
      pts.push([x, y]);
    }
    const w = 0.7 + r() * r() * 2.6;
    wrap(() => {
      g.strokeStyle = `rgba(255,255,255,${0.45 + r() * 0.5})`;
      g.lineWidth = w;
      g.beginPath();
      pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
      g.stroke();
    });
  }
  for (let k = 0; k < 900; k++) {
    const x = r() * S, y = r() * S, rad = 0.8 + r() * r() * 5;
    wrap(() => {
      g.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.5})`;
      g.beginPath();
      g.arc(x, y, rad, 0, Math.PI * 2);
      g.fill();
    });
  }
  const marks = g.getImageData(0, 0, S, S).data;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const u = x / S, v = y / S;
      // tileable noise: sampled on a torus
      const a = u * Math.PI * 2, b = v * Math.PI * 2;
      const tx = Math.cos(a), ty = Math.sin(a), tz = Math.cos(b), tw = Math.sin(b);
      const broad = fbm(tx * 1.3 + tz * 0.9 + 10, ty * 1.3 + tw * 0.9 + 4, 5); // mottling, stains
      const mid = fbm(tx * 5.1 + tw * 4.3 + 31, ty * 5.1 + tz * 4.3 + 17, 5);
      const fine = noise2(x * 0.71, y * 0.71) * 0.6 + noise2(x * 1.9 + 40, y * 1.9) * 0.4;
      const mark = marks[(y * S + x) * 4] / 255;
      let tone = 0.5 + (broad - 0.5) * 0.7 + (mid - 0.5) * 0.42 + (fine - 0.5) * 0.2;
      // pale mineral bloom in the hollows of the broad pattern
      const bloom = Math.max(0, (broad - 0.58) * 3.2) * (0.5 + mid);
      tone = tone * (1 - 0.6 * mark) + bloom * 0.1;
      const height = 0.5 + (mid - 0.5) * 0.9 + (fine - 0.5) * 0.3 + (broad - 0.5) * 0.25 - mark * 0.55;
      const i = (y * S + x) * 4;
      const k = Math.max(0, Math.min(1, tone));
      // a hint of warmth in the pale parts, cool in the dark
      data[i] = Math.min(255, k * 255 * (0.98 + 0.05 * k));
      data[i + 1] = k * 255;
      data[i + 2] = Math.min(255, k * 255 * (1.03 - 0.06 * k));
      data[i + 3] = Math.max(0, Math.min(1, height)) * 255;
    }
  map = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.magFilter = THREE.LinearFilter;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.generateMipmaps = true;
  map.anisotropy = 8;
  map.needsUpdate = true;
  return map;
};

/**
 * Patches a MeshStandardMaterial's shaders with the stone surface.
 * opts: scale (texture repeats per metre, default 0.3), bump (relief in metres, default 0.035),
 * contrast (0 = leave the colour alone, 1 = full mottling).
 */
export const applyStone = (sh, { scale = 0.3, bump = 0.035, contrast = 1 } = {}) => {
  sh.uniforms.stoneMap = { value: stoneMap() };
  sh.uniforms.stoneK = { value: new THREE.Vector3(scale, bump, contrast) };
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vStoneP; varying vec3 vStoneN;')
    .replace(
      '#include <project_vertex>',
      `#include <project_vertex>
      vStoneP = cameraPosition + transpose(mat3(viewMatrix)) * mvPosition.xyz;
      vStoneN = normalize(transpose(mat3(viewMatrix)) * transformedNormal);`,
    );
  sh.fragmentShader = sh.fragmentShader
    .replace(
      '#include <common>',
      `#include <common>
      varying vec3 vStoneP; varying vec3 vStoneN; uniform sampler2D stoneMap; uniform vec3 stoneK;
      vec4 stoneTri(vec3 p, vec3 n) {
        vec3 w = pow(abs(n), vec3(4.0));
        w /= (w.x + w.y + w.z);
        return texture2D(stoneMap, p.zy) * w.x + texture2D(stoneMap, p.xz) * w.y + texture2D(stoneMap, p.xy) * w.z;
      }
      vec4 stoneS;`,
    )
    .replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      // grain at two scales (so no repeat shows): fine close up, broad stains and weathering from afar
      stoneS = stoneTri(vStoneP * stoneK.x, vStoneN) * 0.6 + stoneTri(vStoneP * stoneK.x * 0.19 + 7.3, vStoneN) * 0.4;
      diffuseColor.rgb *= mix(vec3(1.0), stoneS.rgb * 2.0, stoneK.z);`,
    )
    .replace(
      '#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>
      {
        // relief from the same map: pits and cracks catch the light
        vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition);
        vec3 r1 = cross(sy, normal), r2 = cross(normal, sx);
        float det = dot(sx, r1);
        vec3 grad = sign(det) * (dFdx(stoneS.a) * r1 + dFdy(stoneS.a) * r2) * stoneK.y;
        normal = normalize(abs(det) * normal - grad);
      }`,
    )
    .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = clamp(roughnessFactor * (0.78 + 0.5 * stoneS.g), 0.08, 1.0);');
};
