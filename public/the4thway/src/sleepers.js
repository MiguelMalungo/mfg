import * as THREE from 'three';
import { rng } from './textures.js';
import { heightAt, MOON_POS, START } from './world.js';

/*
 * The sleepers: ordinary people walking in slow circles with bowed heads,
 * each on a thread of light that rises to the moon. Sleeper 0 is the companion,
 * the one the player can wake.
 */

const N = 240;
const dummy = new THREE.Object3D();
const color = new THREE.Color();

export const createSleepers = (scene, glowTex) => {
  const r = rng(5);
  const data = [];
  for (let i = 0; i < N; i++) {
    if (i === 0) {
      // The companion circles close to where the player wakes.
      const rad = 17;
      data.push({ rad, a: Math.atan2(START.z - 14, 9), dir: 1, speed: 0.45, phase: 0, cx: 0, cz: 0, tone: 1 });
      continue;
    }
    // denser near the middle of the plain, thinning toward the monuments
    const rad = 8 + Math.pow(r(), 0.8) * 78;
    data.push({ rad, a: r() * Math.PI * 2, dir: Math.floor(rad / 6) % 2 ? 1 : -1, speed: 0.42 + r() * 0.22, phase: r() * 6.28, cx: 0, cz: 0, tone: 0.78 + r() * 0.3 });
  }

  // A robed figure turned on a lathe, flattened front to back.
  const profile = [[0.24, 0], [0.25, 0.04], [0.23, 0.2], [0.2, 0.55], [0.185, 0.85], [0.165, 1.02], [0.18, 1.15], [0.215, 1.32], [0.22, 1.4], [0.19, 1.47], [0.1, 1.52], [0.055, 1.57]];
  const bodyGeo = new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 18);
  bodyGeo.scale(1, 1, 0.68);
  bodyGeo.computeVertexNormals();
  const headGeo = new THREE.SphereGeometry(0.112, 16, 12);
  headGeo.scale(1, 1.2, 1.05);
  const hairGeo = new THREE.SphereGeometry(0.119, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55);
  hairGeo.scale(1, 1.2, 1.08);
  hairGeo.translate(0, 0.005, -0.012);
  const armGeo = new THREE.CapsuleGeometry(0.042, 0.56, 3, 8);
  armGeo.translate(0, -0.3, 0);

  // pale linen that holds a little of the mist's light, so the far crowd reads as pale figures, as in the key art
  const cloth = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0, emissive: 0x2a2d33 });
  // vertical folds in the robe
  cloth.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float fold = sin(atan(position.z, position.x) * 11.0) * 0.012 * smoothstep(1.3, 0.2, position.y);
      transformed.xz += normalize(position.xz + 1e-4) * fold;`);
  };
  const skin = new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0 });
  const hair = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 });
  const mk = (geo, mat, count) => {
    const m = new THREE.InstancedMesh(geo, mat, count);
    m.frustumCulled = false;
    scene.add(m);
    return m;
  };
  const bodies = mk(bodyGeo, cloth, N);
  bodies.castShadow = true;
  const heads = mk(headGeo, skin, N);
  const hairs = mk(hairGeo, hair, N);
  const arms = mk(armGeo, cloth, N * 2);
  const skinTones = [0xc49a7c, 0x9c7354, 0xe0b99b, 0x7a573e, 0xb98a68];
  const hairTones = [0x1c1a19, 0x3a2c22, 0x8b8f96, 0x121212, 0x5a4634];
  for (let i = 0; i < N; i++) {
    const t = data[i].tone;
    color.setRGB(0.66 * t, 0.65 * t, 0.62 * t);
    bodies.setColorAt(i, color);
    arms.setColorAt(i * 2, color);
    arms.setColorAt(i * 2 + 1, color);
    heads.setColorAt(i, color.setHex(skinTones[i % skinTones.length]));
    hairs.setColorAt(i, color.setHex(hairTones[(i * 7) % hairTones.length]));
  }

  // Threads, as in the key art: from the crown of each head a fine thread rises toward the moon in a
  // gentle arc, fading as it climbs, with beads of light (like dew) creeping up along it.
  // The curve is computed on the GPU; the CPU only moves each thread's root with its sleeper.
  const SEG = 28; // segments per thread
  const BEADS = 9; // beads per thread
  const head = new Float32Array(N * 3);
  const talpha = new Float32Array(N).fill(1);
  const tgt = new Float32Array(N * 3);
  const tseed = new Float32Array(N * 3);
  // the time each thread was cut (the finale); far in the future until then
  const cutAt = new Float32Array(N).fill(1e9);
  for (let i = 0; i < N; i++) {
    const ang = r() * Math.PI * 2;
    const rr = Math.sqrt(r()) * 120;
    tgt.set([MOON_POS.x + Math.cos(ang) * rr, MOON_POS.y - 40 + Math.sin(ang) * rr * 0.6, MOON_POS.z + 250], i * 3);
    // phase, bow (signed: which way the arc leans), length
    tseed.set([r() * 6.28, (r() * 2 - 1), 90 + r() * 60], i * 3);
  }
  const CURVE = /* glsl */ `
    attribute vec3 head; attribute vec3 tgt; attribute vec3 tseed; attribute float talpha; attribute float cut;
    uniform float time;
    // a point at u (0 at the head, 1 at the far end) on this sleeper's thread
    vec3 threadAt(float u) {
      vec3 d = tgt - head;
      vec3 dir = normalize(d);
      float L = min(length(d), tseed.z);
      vec3 side = normalize(cross(dir, vec3(0.0, 1.0, 0.0)));
      vec3 lift = cross(side, dir);
      // A quadratic curve: it leaves the crown straight up, then bends over toward the moon,
      // leaning a little to one side, and sways slowly.
      vec3 p0 = head;
      vec3 p2 = head + dir * L;
      vec3 p1 = head + vec3(0.0, L * 0.55, 0.0) + side * tseed.y * L * 0.12;
      float w = 1.0 - u;
      vec3 p = w * w * p0 + 2.0 * u * w * p1 + u * u * p2;
      p += side * sin(time * 0.35 + tseed.x + u * 2.5) * 0.5 * u;
      // cut: the thread is released from the crown and falls, slack, to the water
      float age = time - cut;
      if (age > 0.0) {
        p.y = max(p.y - 4.9 * age * age * (0.4 + 0.6 * u), 0.03);
        p += side * age * (u - 0.3) * 2.0;
      }
      return p;
    }
    // how much of a cut thread is left (it fades over 1.5 s), and its brief flare of gold
    float cutFade() { float age = time - cut; return age > 0.0 ? 1.0 - smoothstep(0.0, 1.5, age) : 1.0; }
    float cutGold() { float age = time - cut; return age > 0.0 ? exp(-age * 2.0) : 0.0; }`;
  // the thread itself
  const lineU = [];
  for (let k = 0; k < SEG; k++) lineU.push(k / SEG, (k + 1) / SEG);
  const threadGeo = new THREE.InstancedBufferGeometry();
  threadGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lineU.length * 3), 3));
  threadGeo.setAttribute('u', new THREE.BufferAttribute(new Float32Array(lineU), 1));
  const headAttr = new THREE.InstancedBufferAttribute(head, 3);
  const alphaAttr = new THREE.InstancedBufferAttribute(talpha, 1);
  headAttr.setUsage(THREE.DynamicDrawUsage);
  alphaAttr.setUsage(THREE.DynamicDrawUsage);
  const tgtAttr = new THREE.InstancedBufferAttribute(tgt, 3);
  const seedAttr = new THREE.InstancedBufferAttribute(tseed, 3);
  const cutAttr = new THREE.InstancedBufferAttribute(cutAt, 1);
  for (const g of [threadGeo]) {
    g.setAttribute('head', headAttr);
    g.setAttribute('talpha', alphaAttr);
    g.setAttribute('tgt', tgtAttr);
    g.setAttribute('tseed', seedAttr);
    g.setAttribute('cut', cutAttr);
    g.instanceCount = N;
  }
  const threadMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: true, // keeps their own depth for the depth of field
    blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute float u; varying float vA; varying float vGold;
      ${CURVE}
      void main() {
        vGold = cutGold();
        float shimmer = 0.6 + 0.4 * sin(time * 1.3 + tseed.x + u * 9.0 - time * 2.0);
        vec4 mv = viewMatrix * vec4(threadAt(u), 1.0);
        // far threads fade into the mist, so only the near ones draw clear lines
        float far = 1.0 - smoothstep(25.0, 110.0, length(head - cameraPosition));
        vA = talpha * cutFade() * pow(1.0 - u, 2.2) * smoothstep(0.0, 0.01, u) * shimmer * (0.25 + 0.75 * far) * (1.0 + vGold * 2.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying float vA; varying float vGold;
      void main() { gl_FragColor = vec4(mix(vec3(0.7, 0.8, 1.0), vec3(1.0, 0.8, 0.4), vGold), vA * 0.5); }`,
  });
  const threads = new THREE.LineSegments(threadGeo, threadMat);
  threads.frustumCulled = false;
  scene.add(threads);
  // the beads: points that creep up the thread, swelling and glinting
  const beadU = new Float32Array(BEADS);
  for (let k = 0; k < BEADS; k++) beadU[k] = (k + r() * 0.6) / BEADS;
  const beadGeo = new THREE.InstancedBufferGeometry();
  beadGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(BEADS * 3), 3));
  beadGeo.setAttribute('u', new THREE.BufferAttribute(beadU, 1));
  beadGeo.setAttribute('head', headAttr);
  beadGeo.setAttribute('talpha', alphaAttr);
  beadGeo.setAttribute('tgt', tgtAttr);
  beadGeo.setAttribute('tseed', seedAttr);
  beadGeo.setAttribute('cut', cutAttr);
  beadGeo.instanceCount = N;
  const beadMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: true, // keeps their own depth for the depth of field
    blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 }, scale: { value: 600 } },
    vertexShader: /* glsl */ `
      attribute float u; uniform float scale; varying float vA; varying float vGold;
      ${CURVE}
      void main() {
        vGold = cutGold();
        // beads drift upward, the near ones faster, and wrap back to the head
        float uu = fract(u * u + time * (0.004 + 0.003 * fract(tseed.x * 3.7)) + fract(tseed.x * 0.37));
        uu = uu * uu; // more of them low on the thread, where it is brightest
        vec4 mv = viewMatrix * vec4(threadAt(uu), 1.0);
        float glint = pow(0.5 + 0.5 * sin(time * 2.6 + u * 40.0 + tseed.x * 5.0), 6.0);
        float far = 1.0 - smoothstep(25.0, 110.0, length(head - cameraPosition));
        vA = talpha * cutFade() * pow(1.0 - uu, 1.6) * smoothstep(0.0, 0.02, uu) * (0.6 + 1.6 * glint + vGold * 3.0) * (0.2 + 0.8 * far);
        gl_PointSize = clamp(scale * (0.09 + 0.06 * glint) / -mv.z, 1.5, 11.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying float vA; varying float vGold;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float core = smoothstep(1.0, 0.0, d);
        gl_FragColor = vec4(mix(vec3(0.82, 0.9, 1.0), vec3(1.0, 0.78, 0.35), vGold) * (core * core * 1.4 + 0.3 * core), vA * core);
      }`,
  });
  const beads = new THREE.Points(beadGeo, beadMat);
  beads.frustumCulled = false;
  scene.add(beads);
  const resizeBeads = () => (beadMat.uniforms.scale.value = innerHeight * (window.devicePixelRatio > 1 ? 1.2 : 1) * 0.75);
  resizeBeads();
  addEventListener('resize', resizeBeads);

  // A faint seed of gold in the companion's chest, so the player can find them.
  const seed = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffc56a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  seed.scale.set(0.5, 0.5, 1);
  scene.add(seed);

  const positions = new Float32Array(N * 2);
  const hidden = new Uint8Array(N);
  /** Per-sleeper pose for the scanned people that stand in for the nearest ones. */
  const state = Array.from({ length: N }, () => ({ x: 0, y: 0, z: 0, face: 0, speed: 0, awake: 0 }));

  // A ring of light where each sleeper's feet meet the water, pulsing with their steps.
  const ringTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 20, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.55, 'rgba(255,255,255,0.75)');
    grad.addColorStop(0.7, 'rgba(255,255,255,0.25)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const ringGeo = new THREE.PlaneGeometry(1, 1);
  ringGeo.rotateX(-Math.PI / 2);
  const rings = new THREE.InstancedMesh(
    ringGeo,
    new THREE.MeshBasicMaterial({ map: ringTex, color: new THREE.Color(0.55, 0.62, 0.78), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }),
    N,
  );
  rings.frustumCulled = false;
  scene.add(rings);
  // once awake, the companion can be given somewhere to walk (goal) and leaves her circle
  const companion = { pos: new THREE.Vector3(), awake: 0, waking: 0, facing: 0, goal: null, walking: 0, free: null, pace: 1.45 };
  // the finale: every sleeper can wake, lose their thread, and walk to a place
  const wakeAt = new Float32Array(N).fill(1e9);
  const goalX = new Float32Array(N).fill(NaN);
  const goalZ = new Float32Array(N).fill(NaN);
  const freeX = new Float32Array(N).fill(NaN);
  const freeZ = new Float32Array(N).fill(NaN);
  const walkAmt = new Float32Array(N);
  const walkFace = new Float32Array(N);
  /** Where the awake look (faceTo, a Vector3 or null) and how far their heads lift (lookUp 0..1). */
  const crowd = { faceTo: null, lookUp: 0, pace: 1.2 };

  return {
    count: N,
    positions,
    companion,
    state,
    crowd,
    /** The finale: sleeper i wakes from time t (over 2.5 s). */
    wakeAt(i, t) {
      wakeAt[i] = t;
    },
    /** Cut sleeper i's thread at time t. */
    cut(i, t) {
      cutAt[i] = t;
      cutAttr.needsUpdate = true;
    },
    /** Once awake, sleeper i walks to (x, z) and stays there. */
    sendTo(i, x, z) {
      goalX[i] = x;
      goalZ[i] = z;
    },
    setHidden(i, h) {
      hidden[i] = h ? 1 : 0;
    },
    update(t, dt, playerPos) {
      threadMat.uniforms.time.value = t;
      beadMat.uniforms.time.value = t;
      let hy_override = 0;
      for (let i = 0; i < N; i++) {
        const d = data[i];
        const wk = Math.min(1, Math.max(0, (t - wakeAt[i]) / 2.5));
        const awake = i === 0 ? companion.awake : wk * wk * (3 - 2 * wk);
        d.a += (d.dir * d.speed * (1 - awake) * dt) / d.rad;
        let x = Math.cos(d.a) * d.rad;
        let z = Math.sin(d.a) * d.rad;
        let face = Math.atan2(-Math.sin(d.a) * d.dir, Math.cos(d.a) * d.dir);
        let walkingNow = 0;
        if (i > 0 && awake > 0) {
          // awake: they stop circling; given a place, they walk to it
          if (Number.isNaN(freeX[i])) {
            freeX[i] = x;
            freeZ[i] = z;
          }
          if (!Number.isNaN(goalX[i]) && awake > 0.95) {
            const dx = goalX[i] - freeX[i], dz = goalZ[i] - freeZ[i];
            const dist = Math.hypot(dx, dz);
            if (dist > 0.3) {
              const step = Math.min(dist, crowd.pace * (0.85 + 0.3 * ((i * 0.618) % 1)) * dt);
              freeX[i] += (dx / dist) * step;
              freeZ[i] += (dz / dist) * step;
              walkingNow = 1;
              walkFace[i] = Math.atan2(dx, dz);
            }
          }
          x = freeX[i];
          z = freeZ[i];
          walkAmt[i] += (walkingNow - walkAmt[i]) * (1 - Math.exp(-dt * 3));
          const want = walkAmt[i] > 0.5 ? walkFace[i] : crowd.faceTo ? Math.atan2(crowd.faceTo.x - x, crowd.faceTo.z - z) : face;
          let diff = want - face;
          diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          face += diff * awake;
        }
        if (i === 0) {
          if (companion.goal && awake > 0.95) {
            // walking, awake, toward a place
            if (!companion.free) companion.free = new THREE.Vector3(x, 0, z);
            const f = companion.free;
            const dx = companion.goal.x - f.x, dz = companion.goal.z - f.z;
            const dist = Math.hypot(dx, dz);
            if (dist > 0.4) {
              const step = Math.min(dist, companion.pace * dt);
              f.x += (dx / dist) * step;
              f.z += (dz / dist) * step;
              walkingNow = 1;
              companion.facingWalk = Math.atan2(dx, dz);
            }
          }
          if (companion.free) {
            x = companion.free.x;
            z = companion.free.z;
          }
          companion.walking += (walkingNow - companion.walking) * (1 - Math.exp(-dt * 3));
          // awake and still, she turns to face the player; walking, she faces where she goes
          const toPlayer = Math.atan2(playerPos.x - x, playerPos.z - z);
          const want = companion.walking > 0.5 ? companion.facingWalk : toPlayer;
          let diff = want - face;
          diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          face += diff * awake;
        }
        const y = Math.max(heightAt(x, z), 0.0); // they walk on the water's surface
        if (i === 0) {
          companion.pos.set(x, y, z);
          companion.facing = face;
        }
        positions[i * 2] = x;
        positions[i * 2 + 1] = z;
        const st = state[i];
        st.x = x;
        st.y = y;
        st.z = z;
        st.face = face;
        st.speed = i === 0 && companion.walking > 0.01 ? companion.pace : i > 0 && walkAmt[i] > 0.01 ? crowd.pace : d.speed * (1 - awake);
        st.awake = awake;
        st.walking = i === 0 ? companion.walking : walkAmt[i];
        st.lookUp = crowd.lookUp * awake * (1 - st.walking);
        const hide = hidden[i] ? 0 : 1;
        const stride = t * d.speed * 3.4 + d.phase;
        const strideOn = Math.max(1 - awake, st.walking);
        const bob = Math.sin(stride * 2) * 0.012 * strideOn;
        const fx = Math.sin(face);
        const fz = Math.cos(face);
        const lean = 0.07 * (1 - awake);

        dummy.rotation.order = 'YXZ';
        dummy.scale.set(hide, hide, hide);
        dummy.position.set(x, y + bob, z);
        dummy.rotation.set(lean, face, 0);
        dummy.updateMatrix();
        bodies.setMatrixAt(i, dummy.matrix);

        const bow = 0.55 * (1 - awake) - 0.12 * awake - 0.35 * st.lookUp;
        const hx = x + fx * (0.07 + 0.09 * (1 - awake));
        const hz = z + fz * (0.07 + 0.09 * (1 - awake));
        const hy = y + bob + 1.665 - 0.03 * (1 - awake);
        dummy.position.set(hx, hy, hz);
        dummy.scale.set(hide, hide, hide);
        dummy.rotation.set(bow, face, 0);
        dummy.updateMatrix();
        heads.setMatrixAt(i, dummy.matrix);
        hairs.setMatrixAt(i, dummy.matrix);

        for (let s = 0; s < 2; s++) {
          const side = s ? 1 : -1;
          dummy.position.set(x + fz * side * 0.235 + fx * 0.04, y + bob + 1.37, z - fx * side * 0.235 + fz * 0.04);
          dummy.rotation.set(Math.sin(stride + (s ? Math.PI : 0)) * 0.16 * strideOn - 0.05, face, side * 0.07);
          dummy.scale.set(hide, hide, hide);
          dummy.updateMatrix();
          arms.setMatrixAt(i * 2 + s, dummy.matrix);
        }

        const pulse = 0.5 + 0.5 * Math.sin(stride * 2);
        dummy.position.set(x, 0.02, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(0.7 + pulse * 0.35);
        dummy.updateMatrix();
        rings.setMatrixAt(i, dummy.matrix);
        // the scanned head sits a little higher than the simple figure's
        if (hidden[i]) hy_override = y + 1.74;
        head[i * 3] = hx;
        head[i * 3 + 1] = (hidden[i] ? hy_override : hy) + 0.13;
        head[i * 3 + 2] = hz;
        if (i === 0) {
          talpha[0] = 1 - awake;
          seed.position.set(x + fx * 0.17, y + 1.25, z + fz * 0.17);
          seed.material.opacity = 0.5 + companion.waking * 0.5 + awake * 0.4 + Math.sin(t * 2) * 0.1;
          seed.scale.setScalar(0.45 + companion.waking * 0.9 + awake * 0.6);
        }
      }
      bodies.instanceMatrix.needsUpdate = true;
      heads.instanceMatrix.needsUpdate = true;
      hairs.instanceMatrix.needsUpdate = true;
      arms.instanceMatrix.needsUpdate = true;
      rings.instanceMatrix.needsUpdate = true;
      headAttr.needsUpdate = true;
      alphaAttr.needsUpdate = true;
    },
  };
};
