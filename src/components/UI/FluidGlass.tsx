'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MeshTransmissionMaterial, useGLTF, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { easing } from 'maath';

// Props interfaces
interface LensProps {
  scale?: number;
  ior?: number;
  thickness?: number;
  chromaticAberration?: number;
  anisotropy?: number;
}

interface BarProps {
  scale?: number;
  ior?: number;
  thickness?: number;
}

interface CubeProps {
  scale?: number;
  ior?: number;
  thickness?: number;
}

interface FluidGlassProps {
  mode?: 'lens' | 'bar' | 'cube';
  lensProps?: LensProps;
  barProps?: BarProps;
  cubeProps?: CubeProps;
}

// Lens component
function Lens({ scale = 0.25, ior = 1.15, thickness = 5, chromaticAberration = 0.1, anisotropy = 0.01 }: LensProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { pointer, viewport } = useThree();

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Smooth mouse following
      easing.damp3(
        meshRef.current.position,
        [(pointer.x * viewport.width) / 2, (pointer.y * viewport.height) / 2, 0],
        0.2,
        delta
      );
    }
  });

  return (
    <mesh ref={meshRef} scale={scale}>
      <torusGeometry args={[1, 0.4, 64, 64]} />
      <MeshTransmissionMaterial
        samples={16}
        resolution={512}
        transmission={1}
        roughness={0}
        thickness={thickness}
        ior={ior}
        chromaticAberration={chromaticAberration}
        anisotropy={anisotropy}
        distortion={0.2}
        distortionScale={0.5}
        temporalDistortion={0.1}
      />
    </mesh>
  );
}

// Bar component
function Bar({ scale = 0.3, ior = 1.2, thickness = 3 }: BarProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { pointer, viewport } = useThree();

  useFrame((state, delta) => {
    if (meshRef.current) {
      easing.damp3(
        meshRef.current.position,
        [(pointer.x * viewport.width) / 2, (pointer.y * viewport.height) / 2, 0],
        0.15,
        delta
      );
      meshRef.current.rotation.z = Math.atan2(pointer.y, pointer.x);
    }
  });

  return (
    <mesh ref={meshRef} scale={[scale * 2, scale * 0.5, scale]}>
      <boxGeometry args={[1, 1, 1]} />
      <MeshTransmissionMaterial
        samples={16}
        resolution={512}
        transmission={1}
        roughness={0.1}
        thickness={thickness}
        ior={ior}
        chromaticAberration={0.05}
        anisotropy={0.3}
        distortion={0.1}
        distortionScale={0.3}
        temporalDistortion={0.05}
      />
    </mesh>
  );
}

// Cube component
function Cube({ scale = 0.3, ior = 1.25, thickness = 4 }: CubeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { pointer, viewport } = useThree();

  useFrame((state, delta) => {
    if (meshRef.current) {
      easing.damp3(
        meshRef.current.position,
        [(pointer.x * viewport.width) / 2, (pointer.y * viewport.height) / 2, 0],
        0.25,
        delta
      );
      meshRef.current.rotation.x += delta * 0.5;
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <mesh ref={meshRef} scale={scale}>
      <boxGeometry args={[1, 1, 1]} />
      <MeshTransmissionMaterial
        samples={16}
        resolution={512}
        transmission={1}
        roughness={0}
        thickness={thickness}
        ior={ior}
        chromaticAberration={0.08}
        anisotropy={0.05}
        distortion={0.15}
        distortionScale={0.4}
        temporalDistortion={0.08}
      />
    </mesh>
  );
}

// Background gradient component
function Background() {
  return (
    <mesh position={[0, 0, -5]} scale={[100, 100, 1]}>
      <planeGeometry />
      <meshBasicMaterial color="#F0EEE6" />
    </mesh>
  );
}

// Main FluidGlass component
export default function FluidGlass({
  mode = 'lens',
  lensProps = {},
  barProps = {},
  cubeProps = {}
}: FluidGlassProps) {
  const [pointerEvents, setPointerEvents] = useState<'auto' | 'none'>('none');

  useEffect(() => {
    // Enable pointer events after component mounts
    setPointerEvents('auto');
  }, []);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: pointerEvents,
        zIndex: 1
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        dpr={[1, 2]}
        gl={{ alpha: true }}
      >
        <color attach="background" args={['#F0EEE6']} />

        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />

        {/* Environment for reflections */}
        <Environment preset="city" />

        {/* Background */}
        <Background />

        {/* Render selected mode */}
        {mode === 'lens' && <Lens {...lensProps} />}
        {mode === 'bar' && <Bar {...barProps} />}
        {mode === 'cube' && <Cube {...cubeProps} />}
      </Canvas>
    </div>
  );
}
