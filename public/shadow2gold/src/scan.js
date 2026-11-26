import * as THREE from 'three';

/*
 * The two scanned people in a small form of their own (2026-11-26): the FBX files were 35 of the 53 MB the game
 * downloads. tools/scanpack.js loads each FBX exactly as the game used to, and writes the same objects out:
 * every node with its name and transform, the skinned mesh (indexed, its normals, UVs and weights packed small,
 * its positions exact, in the scan's own centimetres), the skeleton with its bind matrices, and the animation.
 * readScan builds the same three.js objects again, so nothing that used the FBX has to change.
 *
 *   <who>/scan.json   the nodes, the skeleton, the clips, where each part lies in the .bin
 *   <who>/scan.bin    the numbers
 */

const view = (buf, { at, n, type }) => {
  const T = { f32: Float32Array, i8: Int8Array, u8: Uint8Array, i16: Int16Array, u16: Uint16Array, u32: Uint32Array }[type];
  return new T(buf, at, n);
};

/** j: the .json, buf: the .bin (ArrayBuffer). Returns a Group like the one FBXLoader gave, with .animations. */
export const readScan = (j, buf) => {
  const nodes = j.nodes.map((d) => {
    const o = d.t === 'Bone' ? new THREE.Bone() : d.t === 'Group' ? new THREE.Group() : d.t === 'SkinnedMesh' ? null : new THREE.Object3D();
    if (o) {
      o.name = d.n;
      o.position.fromArray(d.p);
      o.quaternion.fromArray(d.q);
      o.scale.fromArray(d.s);
    }
    return o;
  });

  /* the mesh */
  const m = j.mesh, g = new THREE.BufferGeometry();
  const count = m.count;
  g.setAttribute('position', new THREE.BufferAttribute(view(buf, m.position).slice(), 3));
  {
    const q = view(buf, m.normal), n = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const x = q[i * 3] / 127, y = q[i * 3 + 1] / 127, z = q[i * 3 + 2] / 127, l = Math.hypot(x, y, z) || 1;
      n[i * 3] = x / l;
      n[i * 3 + 1] = y / l;
      n[i * 3 + 2] = z / l;
    }
    g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  }
  {
    const q = view(buf, m.uv), uv = new Float32Array(count * 2), [u0, v0, u1, v1] = m.uvRange;
    for (let i = 0; i < count; i++) {
      uv[i * 2] = u0 + (q[i * 2] / 65535) * (u1 - u0);
      uv[i * 2 + 1] = v0 + (q[i * 2 + 1] / 65535) * (v1 - v0);
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  }
  {
    const si = view(buf, m.skinIndex), sw = view(buf, m.skinWeight);
    const idx = new Uint16Array(count * 4), w = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) ((idx[i * 4 + k] = si[i * 4 + k]), (sum += w[i * 4 + k] = sw[i * 4 + k] / 255));
      if (sum > 0) for (let k = 0; k < 4; k++) w[i * 4 + k] /= sum;
    }
    g.setAttribute('skinIndex', new THREE.BufferAttribute(idx, 4));
    g.setAttribute('skinWeight', new THREE.BufferAttribute(w, 4));
  }
  if (m.index) g.setIndex(new THREE.BufferAttribute(view(buf, m.index).slice(), 1));
  const mesh = new THREE.SkinnedMesh(g, new THREE.MeshBasicMaterial());
  const md = j.nodes[m.node];
  mesh.name = md.n;
  mesh.position.fromArray(md.p);
  mesh.quaternion.fromArray(md.q);
  mesh.scale.fromArray(md.s);
  nodes[m.node] = mesh;

  /* the tree */
  j.nodes.forEach((d, i) => d.parent >= 0 && nodes[d.parent].add(nodes[i]));
  const root = nodes[0];
  root.updateMatrixWorld(true);

  /* the skeleton, bound as it was */
  const inv = view(buf, m.inverses);
  const bones = m.bones.map((i) => nodes[i]);
  const inverses = bones.map((_, k) => new THREE.Matrix4().fromArray(inv, k * 16));
  mesh.bind(new THREE.Skeleton(bones, inverses), new THREE.Matrix4().fromArray(m.bindMatrix));

  /* the clips */
  const times = j.times.map((s) => view(buf, s));
  root.animations = j.clips.map((c) => {
    const tracks = c.tracks.map((t) => {
      const T = times[t.times].slice();
      let v;
      if (t.q) {
        const q = view(buf, t.values);
        v = new Float32Array(q.length);
        for (let i = 0; i < q.length; i++) v[i] = q[i] / 32767;
        // (each key back to unit length)
        for (let i = 0; i < v.length; i += 4) {
          const l = Math.hypot(v[i], v[i + 1], v[i + 2], v[i + 3]) || 1;
          for (let k = 0; k < 4; k++) v[i + k] /= l;
        }
        return new THREE.QuaternionKeyframeTrack(t.name, T, v);
      }
      v = view(buf, t.values).slice();
      return new THREE.VectorKeyframeTrack(t.name, T, v);
    });
    return new THREE.AnimationClip(c.name, c.duration, tracks);
  });
  return root;
};

export const loadScan = async (dir, onProgress) => {
  const [j, buf] = await Promise.all([
    fetch(dir + 'scan.json').then((r) => r.json()),
    (async () => {
      const r = await fetch(dir + 'scan.bin');
      const total = +r.headers.get('content-length') || 0;
      if (!r.body || !onProgress) return r.arrayBuffer();
      // (counted as it comes, for the loading line)
      const reader = r.body.getReader(), parts = [];
      let got = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(value);
        got += value.length;
        onProgress({ loaded: got, total });
      }
      const out = new Uint8Array(got);
      let o = 0;
      for (const p of parts) (out.set(p, o), (o += p.length));
      return out.buffer;
    })(),
  ]);
  return readScan(j, buf);
};
