import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/*
 * The player's arm, modelled in Blender (../blender/02_arm.py, after bible/keyart.png): Nathan's
 * scanned hand closed in a fist over the top of the lantern's carrying ring, thumb through the ring,
 * and a heavy herringbone coat sleeve that runs back to the lower right corner, toward the shoulder.
 *
 * assets/arm/arm.glb holds two meshes, 'hand' and 'sleeve', already in the lantern group's own space:
 * the game only adds them to the lantern. Each has one morph target, 'raised': the same arm with the
 * lantern lifted (the fist stays on the ring, the wrist and the sleeve take the change). lantern.js
 * blends to it as the lantern rises. The skin uses the scan's own maps; the cloth uses
 * assets/arm/tweed.png and tweed_n.png (tileable).
 *
 * The scene's lamps leave an arm this close to the eye nearly black (the lantern's own light is
 * placed low and ahead, for the ground), so both materials add two lights of their own:
 * the flame, a forearm's length below the fist, and the air's light on the side turned to the eye.
 */

export const loadArm = async () => {
  const tl = new THREE.TextureLoader();
  const [gltf, tweed, tweedN, dif, norm, rough] = await Promise.all([
    new GLTFLoader().loadAsync('./assets/arm/arm.glb'),
    tl.loadAsync('./assets/arm/tweed.png'),
    tl.loadAsync('./assets/arm/tweed_n.png'),
    tl.loadAsync('./assets/people/nathan/dif.jpg'),
    tl.loadAsync('./assets/people/nathan/norm.jpg'),
    tl.loadAsync('./assets/people/nathan/rough.jpg'),
  ]);
  for (const t of [tweed, tweedN]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
  }
  tweed.colorSpace = THREE.SRGBColorSpace;
  // the scan's maps on a glTF mesh: its uvs run top-down, so the images are not flipped
  for (const t of [dif, norm, rough]) {
    t.flipY = false;
    t.anisotropy = 8;
  }
  dif.colorSpace = THREE.SRGBColorSpace;

  // shared by both materials; lantern.js and main.js keep them current
  const uniforms = {
    uLampPos: { value: new THREE.Vector3(0.36, -0.34, -0.72) }, // the flame, in view space
    uLampCol: { value: new THREE.Color(0, 0, 0) },
    uFillCol: { value: new THREE.Color(0.2, 0.22, 0.26) }, // the air's light
  };
  /** Adds the two lights to a standard material's shader. lamp, fill: their strength on this material; skin: light creeps further round, red furthest. */
  const light = (sh, { lamp = 1, fill = 1, skin = false } = {}) => {
    Object.assign(sh.uniforms, uniforms);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uLampPos; uniform vec3 uLampCol; uniform vec3 uFillCol;')
      .replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
        {
          vec3 toL = uLampPos - geometryPosition;
          float d2 = dot(toL, toL);
          float nl = dot(geometryNormal, toL * inversesqrt(d2));
          // light creeps round a soft thing; through skin the red goes furthest
          vec3 w = ${skin ? 'vec3(0.55, 0.36, 0.28)' : 'vec3(0.3)'};
          vec3 lit = clamp((nl + w) / (1.0 + w), 0.0, 1.0);
          reflectedLight.directDiffuse += material.diffuseColor * uLampCol * lit * lit * (${lamp.toFixed(2)} / (1.0 + d2 * 5.0));
          // the air's light: from above and from the eye's side, so the arm never falls to a black shape
          float nf = dot(geometryNormal, normalize(vec3(-0.45, 0.75, 0.5)));
          vec3 fl = clamp((nf + w) / (1.0 + w), 0.0, 1.0);
          reflectedLight.directDiffuse += material.diffuseColor * uFillCol * fl * ${fill.toFixed(2)};
        }`,
      )
      .replace(
        '#include <opaque_fragment>',
        `// the flame is a hand's width away: roll off the hot spots instead of clipping
        outgoingLight = outgoingLight / (1.0 + outgoingLight * 0.9);
        #include <opaque_fragment>`,
      );
  };

  const skin = new THREE.MeshStandardMaterial({ map: dif, normalMap: norm, normalScale: new THREE.Vector2(0.9, -0.9), roughnessMap: rough, roughness: 1, metalness: 0 });
  skin.onBeforeCompile = (sh) => {
    light(sh, { lamp: 1, fill: 1.6, skin: true });
    sh.fragmentShader = sh.fragmentShader.replace(
      '#include <map_fragment>',
      `#include <map_fragment>
      // by moon and candle: a little less of the scan's studio pink
      diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11))), diffuseColor.rgb, 0.82) * vec3(0.97, 0.99, 1.0);`,
    );
  };
  skin.customProgramCacheKey = () => 'arm-skin-v4';

  // wool: matt, with the soft pale edge that cloth fibres give against the light
  const cloth = new THREE.MeshPhysicalMaterial({ map: tweed, normalMap: tweedN, normalScale: new THREE.Vector2(0.9, 0.9), color: 0xffffff, roughness: 0.94, metalness: 0, sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color(0.1, 0.11, 0.13), side: THREE.DoubleSide });
  cloth.onBeforeCompile = (sh) => {
    light(sh, { lamp: 1.3, fill: 1.1 });
    sh.fragmentShader = sh.fragmentShader.replace(
      '#include <map_fragment>',
      `#include <map_fragment>
      // inside the cuff: the hem and the lining, in shadow. (The model marks them with v below zero;
      // the glTF file stores v upside down, so here that reads as above one.)
      #ifdef USE_MAP
        if (vMapUv.y > 1.04) diffuseColor.rgb *= 0.28;
      #endif`,
    );
  };
  cloth.customProgramCacheKey = () => 'arm-cloth-v4';

  const root = gltf.scene;
  const meshes = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.material = /sleeve/i.test(o.name) ? cloth : skin;
    o.frustumCulled = false;
    o.castShadow = o.receiveShadow = false;
    if (o.morphTargetInfluences) meshes.push(o);
  });
  return {
    root,
    skin,
    cloth,
    uniforms,
    /** 0: the lantern carried; 1: lifted. */
    setRaise(k) {
      for (const m of meshes) m.morphTargetInfluences[0] = k;
    },
  };
};
