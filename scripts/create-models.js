const fs = require('fs');
const path = require('path');

// Create output directory
const outDir = path.join(__dirname, '..', 'public', 'assets', '3d');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Create a simple cylinder for the lens
function createCylinderGLB() {
  const segments = 16;
  const positions = [];
  const normals = [];
  const indices = [];

  // Top and bottom circles
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const x = Math.cos(theta) * 0.5;
    const z = Math.sin(theta) * 0.5;

    // Top
    positions.push(x, 0.1, z);
    normals.push(0, 1, 0);

    // Bottom
    positions.push(x, -0.1, z);
    normals.push(0, -1, 0);
  }

  // Center vertices for caps
  const topCenterIdx = positions.length / 3;
  positions.push(0, 0.1, 0);
  normals.push(0, 1, 0);

  const bottomCenterIdx = positions.length / 3;
  positions.push(0, -0.1, 0);
  normals.push(0, -1, 0);

  // Indices for cylinder sides
  for (let i = 0; i < segments; i++) {
    const topA = i * 2;
    const topB = ((i + 1) % (segments + 1)) * 2;
    const botA = topA + 1;
    const botB = topB + 1;

    indices.push(topA, botA, topB);
    indices.push(botB, topB, botA);
  }

  // Top cap
  for (let i = 0; i < segments; i++) {
    indices.push(topCenterIdx, i * 2, ((i + 1) % (segments + 1)) * 2);
  }

  // Bottom cap
  for (let i = 0; i < segments; i++) {
    indices.push(bottomCenterIdx, ((i + 1) % (segments + 1)) * 2 + 1, i * 2 + 1);
  }

  const posArray = new Float32Array(positions);
  const normArray = new Float32Array(normals);
  const indArray = new Uint16Array(indices);

  // Create binary buffer
  const totalSize = posArray.byteLength + normArray.byteLength + indArray.byteLength;
  const buffer = Buffer.alloc(totalSize);

  buffer.set(new Uint8Array(posArray.buffer), 0);
  buffer.set(new Uint8Array(normArray.buffer), posArray.byteLength);
  buffer.set(new Uint8Array(indArray.buffer), posArray.byteLength + normArray.byteLength);

  // Calculate bounds
  const posCount = posArray.length / 3;
  const indCount = indArray.length;

  const gltf = {
    asset: { version: "2.0" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{
      primitives: [{
        attributes: { POSITION: 0, NORMAL: 1 },
        indices: 2
      }]
    }],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: posCount,
        type: "VEC3",
        max: [0.5, 0.1, 0.5],
        min: [-0.5, -0.1, -0.5]
      },
      {
        bufferView: 1,
        componentType: 5126,
        count: posCount,
        type: "VEC3"
      },
      {
        bufferView: 2,
        componentType: 5123,
        count: indCount,
        type: "SCALAR"
      }
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: posArray.byteLength },
      { buffer: 0, byteOffset: posArray.byteLength, byteLength: normArray.byteLength },
      { buffer: 0, byteOffset: posArray.byteLength + normArray.byteLength, byteLength: indArray.byteLength }
    ],
    buffers: [{ byteLength: totalSize }]
  };

  return { gltf, buffer };
}

// Create a simple cube
function createCubeGLB() {
  const positions = new Float32Array([
    -0.5, -0.5, -0.5,  0.5, -0.5, -0.5,  0.5,  0.5, -0.5, -0.5,  0.5, -0.5,
    -0.5, -0.5,  0.5,  0.5, -0.5,  0.5,  0.5,  0.5,  0.5, -0.5,  0.5,  0.5,
    -0.5, -0.5, -0.5, -0.5,  0.5, -0.5, -0.5,  0.5,  0.5, -0.5, -0.5,  0.5,
     0.5, -0.5, -0.5,  0.5,  0.5, -0.5,  0.5,  0.5,  0.5,  0.5, -0.5,  0.5,
    -0.5, -0.5, -0.5,  0.5, -0.5, -0.5,  0.5, -0.5,  0.5, -0.5, -0.5,  0.5,
    -0.5,  0.5, -0.5,  0.5,  0.5, -0.5,  0.5,  0.5,  0.5, -0.5,  0.5,  0.5
  ]);

  const normals = new Float32Array([
     0,  0, -1,  0,  0, -1,  0,  0, -1,  0,  0, -1,
     0,  0,  1,  0,  0,  1,  0,  0,  1,  0,  0,  1,
    -1,  0,  0, -1,  0,  0, -1,  0,  0, -1,  0,  0,
     1,  0,  0,  1,  0,  0,  1,  0,  0,  1,  0,  0,
     0, -1,  0,  0, -1,  0,  0, -1,  0,  0, -1,  0,
     0,  1,  0,  0,  1,  0,  0,  1,  0,  0,  1,  0
  ]);

  const indices = new Uint16Array([
    0,1,2, 0,2,3,  4,5,6, 4,6,7,  8,9,10, 8,10,11,
    12,13,14, 12,14,15,  16,17,18, 16,18,19,  20,21,22, 20,22,23
  ]);

  const totalSize = positions.byteLength + normals.byteLength + indices.byteLength;
  const buffer = Buffer.alloc(totalSize);

  buffer.set(new Uint8Array(positions.buffer), 0);
  buffer.set(new Uint8Array(normals.buffer), positions.byteLength);
  buffer.set(new Uint8Array(indices.buffer), positions.byteLength + normals.byteLength);

  const gltf = {
    asset: { version: "2.0" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{
      primitives: [{
        attributes: { POSITION: 0, NORMAL: 1 },
        indices: 2
      }]
    }],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 24,
        type: "VEC3",
        max: [0.5, 0.5, 0.5],
        min: [-0.5, -0.5, -0.5]
      },
      {
        bufferView: 1,
        componentType: 5126,
        count: 24,
        type: "VEC3"
      },
      {
        bufferView: 2,
        componentType: 5123,
        count: 36,
        type: "SCALAR"
      }
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: positions.byteLength },
      { buffer: 0, byteOffset: positions.byteLength, byteLength: normals.byteLength },
      { buffer: 0, byteOffset: positions.byteLength + normals.byteLength, byteLength: indices.byteLength }
    ],
    buffers: [{ byteLength: totalSize }]
  };

  return { gltf, buffer };
}

// Create a bar (elongated cube)
function createBarGLB() {
  const positions = new Float32Array([
    -2.0, -0.2, -0.2,  2.0, -0.2, -0.2,  2.0,  0.2, -0.2, -2.0,  0.2, -0.2,
    -2.0, -0.2,  0.2,  2.0, -0.2,  0.2,  2.0,  0.2,  0.2, -2.0,  0.2,  0.2,
    -2.0, -0.2, -0.2, -2.0,  0.2, -0.2, -2.0,  0.2,  0.2, -2.0, -0.2,  0.2,
     2.0, -0.2, -0.2,  2.0,  0.2, -0.2,  2.0,  0.2,  0.2,  2.0, -0.2,  0.2,
    -2.0, -0.2, -0.2,  2.0, -0.2, -0.2,  2.0, -0.2,  0.2, -2.0, -0.2,  0.2,
    -2.0,  0.2, -0.2,  2.0,  0.2, -0.2,  2.0,  0.2,  0.2, -2.0,  0.2,  0.2
  ]);

  const normals = new Float32Array([
     0,  0, -1,  0,  0, -1,  0,  0, -1,  0,  0, -1,
     0,  0,  1,  0,  0,  1,  0,  0,  1,  0,  0,  1,
    -1,  0,  0, -1,  0,  0, -1,  0,  0, -1,  0,  0,
     1,  0,  0,  1,  0,  0,  1,  0,  0,  1,  0,  0,
     0, -1,  0,  0, -1,  0,  0, -1,  0,  0, -1,  0,
     0,  1,  0,  0,  1,  0,  0,  1,  0,  0,  1,  0
  ]);

  const indices = new Uint16Array([
    0,1,2, 0,2,3,  4,5,6, 4,6,7,  8,9,10, 8,10,11,
    12,13,14, 12,14,15,  16,17,18, 16,18,19,  20,21,22, 20,22,23
  ]);

  const totalSize = positions.byteLength + normals.byteLength + indices.byteLength;
  const buffer = Buffer.alloc(totalSize);

  buffer.set(new Uint8Array(positions.buffer), 0);
  buffer.set(new Uint8Array(normals.buffer), positions.byteLength);
  buffer.set(new Uint8Array(indices.buffer), positions.byteLength + normals.byteLength);

  const gltf = {
    asset: { version: "2.0" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{
      primitives: [{
        attributes: { POSITION: 0, NORMAL: 1 },
        indices: 2
      }]
    }],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 24,
        type: "VEC3",
        max: [2.0, 0.2, 0.2],
        min: [-2.0, -0.2, -0.2]
      },
      {
        bufferView: 1,
        componentType: 5126,
        count: 24,
        type: "VEC3"
      },
      {
        bufferView: 2,
        componentType: 5123,
        count: 36,
        type: "SCALAR"
      }
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: positions.byteLength },
      { buffer: 0, byteOffset: positions.byteLength, byteLength: normals.byteLength },
      { buffer: 0, byteOffset: positions.byteLength + normals.byteLength, byteLength: indices.byteLength }
    ],
    buffers: [{ byteLength: totalSize }]
  };

  return { gltf, buffer };
}

// Create GLB file
function writeGLB(gltfData, binaryData, filename) {
  const gltfJSON = JSON.stringify(gltfData);
  const gltfBuffer = Buffer.from(gltfJSON);

  // Ensure 4-byte alignment
  const gltfPadding = (4 - (gltfBuffer.length % 4)) % 4;
  const binaryPadding = (4 - (binaryData.length % 4)) % 4;

  const totalLength =
    12 + // GLB header
    8 + gltfBuffer.length + gltfPadding + // JSON chunk
    8 + binaryData.length + binaryPadding; // BIN chunk

  const glb = Buffer.alloc(totalLength);
  let offset = 0;

  // GLB header
  glb.writeUInt32LE(0x46546C67, offset); offset += 4; // magic 'glTF'
  glb.writeUInt32LE(2, offset); offset += 4; // version
  glb.writeUInt32LE(totalLength, offset); offset += 4; // length

  // JSON chunk
  glb.writeUInt32LE(gltfBuffer.length + gltfPadding, offset); offset += 4;
  glb.writeUInt32LE(0x4E4F534A, offset); offset += 4; // 'JSON'
  gltfBuffer.copy(glb, offset); offset += gltfBuffer.length;
  for (let i = 0; i < gltfPadding; i++) {
    glb.writeUInt8(0x20, offset++); // space padding
  }

  // BIN chunk
  glb.writeUInt32LE(binaryData.length + binaryPadding, offset); offset += 4;
  glb.writeUInt32LE(0x004E4942, offset); offset += 4; // 'BIN\0'
  binaryData.copy(glb, offset); offset += binaryData.length;
  for (let i = 0; i < binaryPadding; i++) {
    glb.writeUInt8(0x00, offset++); // null padding
  }

  fs.writeFileSync(path.join(outDir, filename), glb);
  console.log(`✓ Created ${filename} (${totalLength} bytes)`);
}

// Generate all models
const lens = createCylinderGLB();
writeGLB(lens.gltf, lens.buffer, 'lens.glb');

const cube = createCubeGLB();
writeGLB(cube.gltf, cube.buffer, 'cube.glb');

const bar = createBarGLB();
writeGLB(bar.gltf, bar.buffer, 'bar.glb');

console.log('\n✓ All 3D models created successfully!');
