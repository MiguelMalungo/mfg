import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/*
 * The player's arm, modelled in Blender (../blender/02_arm.py, after bible/keyart.png): Sophia's
 * scanned hand, smoothed and closed over the top of the lantern's carrying ring, palm down, and a
 * heavy herringbone coat sleeve with a turned cuff and folds at the elbow.
 *
 * assets/arm/arm.glb holds two meshes, 'hand' and 'sleeve', already in the lantern group's own space:
 * the game only adds them to the lantern. The skin uses the scan's own maps; the cloth uses
 * assets/arm/tweed.png and tweed_n.png (tileable).
 */

/** The direction the forearm runs back in (lantern space), as the model was built. Keep in step with 02_arm.py. */
export const ARM_REST_DIR = new THREE.Vector3(0.62, -0.5, 0.6).normalize();

export const loadArm = async () => {
  const tl = new THREE.TextureLoader();
  const [gltf, tweed, tweedN, dif, norm, rough] = await Promise.all([
    new GLTFLoader().loadAsync('./assets/arm/arm.glb'),
    tl.loadAsync('./assets/arm/tweed.png'),
    tl.loadAsync('./assets/arm/tweed_n.png'),
    tl.loadAsync('./assets/people/sophia/dif.jpg'),
    tl.loadAsync('./assets/people/sophia/norm.jpg'),
    tl.loadAsync('./assets/people/sophia/rough.jpg'),
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

  const skin = new THREE.MeshStandardMaterial({ map: dif, normalMap: norm, normalScale: new THREE.Vector2(0.8, -0.8), roughnessMap: rough, roughness: 1, metalness: 0 });
  skin.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        // skin by lantern and firelight: keep it flesh, not red (the scan's own colour is strong)
        diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11))), diffuseColor.rgb, 0.66) * vec3(0.95, 1.0, 1.03);`,
      )
      .replace(
        '#include <opaque_fragment>',
        `// the flame is a hand's width away: roll off the hot spots instead of clipping
        outgoingLight = outgoingLight / (1.0 + outgoingLight * 0.9);
        #include <opaque_fragment>`,
      );
  };
  skin.customProgramCacheKey = () => 'arm-skin-v1';

  // wool: matt, with the soft pale edge that cloth fibres give against the light
  const cloth = new THREE.MeshPhysicalMaterial({ map: tweed, normalMap: tweedN, normalScale: new THREE.Vector2(0.9, 0.9), color: 0xdcdcdc, roughness: 0.94, metalness: 0, sheen: 1, sheenRoughness: 0.55, sheenColor: new THREE.Color(0.16, 0.18, 0.22), side: THREE.DoubleSide });
  cloth.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        // inside the cuff: the lining, in shadow
        #ifdef USE_MAP
          if (vMapUv.y < -0.04) diffuseColor.rgb *= 0.3;
        #endif`,
      )
      .replace(
        '#include <opaque_fragment>',
        `outgoingLight = outgoingLight / (1.0 + outgoingLight * 0.9);
        #include <opaque_fragment>`,
      );
  };
  cloth.customProgramCacheKey = () => 'arm-cloth-v1';

  const root = gltf.scene;
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.material = /sleeve/i.test(o.name) ? cloth : skin;
    o.frustumCulled = false;
    o.castShadow = o.receiveShadow = false;
  });
  return { root, skin, cloth };
};
