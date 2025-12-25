'use client';

import React, { useEffect, useRef } from 'react';

type Particle = {
  x: number;
  y: number;
  z: number;
  initialR: number;
  initialTheta: number;
  initialHeight: number;
  systemIndex: number;
  phaseOffset: number;
};

type ParticleSystem = {
  particles: Particle[];
  centerX: number;
  centerY: number;
  color: string;
  phaseOffset: number;
};

const QuadParticleFlower = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const particleSystemsRef = useRef<ParticleSystem[]>([]);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctxRef.current = ctx;
    
    const width = canvas.width = 800;
    const height = canvas.height = 800;
    
    // Four centers arranged in corners
    const centers = [
      { x: width * 0.25, y: height * 0.25 },   // Top left
      { x: width * 0.75, y: height * 0.25 },   // Top right
      { x: width * 0.25, y: height * 0.75 },   // Bottom left
      { x: width * 0.75, y: height * 0.75 }    // Bottom right
    ];
    
    const PARTICLE_COUNT_PER_SYSTEM = 9000;
    const FORM_SCALE = 1.5;
    const colors = [
      'rgba(80, 50, 50, ',     // Deep red
      'rgba(50, 80, 50, ',     // Deep green
      'rgba(50, 50, 80, ',     // Deep blue
      'rgba(100, 85, 30, '     // Golden yellow
    ];
    
    const particleSystems: ParticleSystem[] = [];
    particleSystemsRef.current = particleSystems;
    
    // Create four particle systems
    for (let systemIndex = 0; systemIndex < 4; systemIndex++) {
      const centerX = centers[systemIndex].x;
      const centerY = centers[systemIndex].y;
      const particles: Particle[] = [];
      
      for (let i = 0; i < PARTICLE_COUNT_PER_SYSTEM; i++) {
        const theta = Math.random() * Math.PI * 2;
        const r = Math.pow(Math.random(), 0.5) * FORM_SCALE * 0.45 * 120;
        const height = (Math.random() * 2 - 1) * FORM_SCALE * 0.3;
        const angle = theta;
        const dist = r / 120;
        
        // Add phase offset for each system to create harmonic motion
        const phaseOffset = systemIndex * (Math.PI * 2 / 4);
        
        const flow = Math.sin(angle * 2 + height * 2 + phaseOffset) * 0.025;
        const counterFlow = Math.cos(angle * 2 - height * 2 + phaseOffset) * 0.025;
        const blend = (Math.sin(height * Math.PI) + 1) * 0.5;
        const combinedFlow = flow * blend + counterFlow * (1 - blend);
        
        const dx = r * Math.cos(theta);
        const dy = r * Math.sin(theta);
        
        const containment = Math.pow(Math.min(1, dist / (FORM_SCALE * 0.7)), 4);
        const pull = containment * 0.08;
        
        particles.push({
          x: centerX + dx + (dx * combinedFlow) - (dx * pull),
          y: centerY + dy + (dy * combinedFlow) - (dy * pull),
          z: height,
          initialR: r,
          initialTheta: theta,
          initialHeight: height,
          systemIndex: systemIndex,
          phaseOffset: phaseOffset
        });
      }
      
      particleSystems.push({
        particles: particles,
        centerX: centerX,
        centerY: centerY,
        color: colors[systemIndex],
        phaseOffset: systemIndex * (Math.PI * 2 / 4)
      });
    }
    
    let lastFrameTime = 0;
    const targetFPS = 12;
    const frameInterval = 1000 / targetFPS;
    
    function animate(currentTime: number) {
      if (!lastFrameTime) {
        lastFrameTime = currentTime;
      }
      
      const deltaTime = currentTime - lastFrameTime;
      
      if (deltaTime >= frameInterval) {
        timeRef.current += 0.0004;
        
        // Subtle fade effect
        if (ctx) {
          ctx.fillStyle = 'rgba(240, 238, 230, 0.03)';
          ctx.fillRect(0, 0, width, height);
        
        // Animate each particle system
        particleSystems.forEach((system) => {
          const centerX = system.centerX;
          const centerY = system.centerY;
          const systemPhase = system.phaseOffset;
          
          // Add inter-system harmonic influence
          const harmonicInfluence = Math.sin(timeRef.current * 0.3 + systemPhase) * 0.5;
          
          system.particles.forEach(particle => {
            const dx = particle.x - centerX;
            const dy = particle.y - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy) / 120;
            const angle = Math.atan2(dy, dx);
            const height = particle.z / (FORM_SCALE * 0.4);
            
            // Enhanced flow with harmonic resonance between systems
            const flow = Math.sin(angle * 2 - timeRef.current * 0.4 + height * 2 + systemPhase) * 0.012;
            const counterFlow = Math.cos(angle * 2 + timeRef.current * 0.4 - height * 2 + systemPhase) * 0.012;
            const harmonicFlow = Math.sin(timeRef.current * 0.2 + systemPhase + dist * 3) * 0.008 * harmonicInfluence;
            
            const blend = (Math.sin(height * Math.PI) + 1) * 0.5;
            const combinedFlow = (flow * blend + counterFlow * (1 - blend)) + harmonicFlow;
            
            const containment = Math.pow(Math.min(1, dist / (FORM_SCALE * 0.7)), 4);
            const pull = containment * 0.08;
            
            particle.x = particle.x + (dx * combinedFlow) - (dx * pull);
            particle.y = particle.y + (dy * combinedFlow) - (dy * pull);
            particle.z = particle.z + Math.sin(timeRef.current * 0.12 + dist * 2 + systemPhase) * 0.008;
            
            const depthFactor = 1 + particle.z * 0.4;
            const opacity = 0.25 * depthFactor;
            const size = Math.max(0.001, 0.5 * depthFactor);
            
            // Add subtle glow effect based on system interaction
            const glowFactor = 1 + Math.sin(timeRef.current * 0.5 + systemPhase) * 0.2;
            
            if (ctx) {
              ctx.beginPath();
              ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
              ctx.fillStyle = system.color + (opacity * glowFactor) + ')';
              ctx.fill();
            }
          });
        });
        
        lastFrameTime = currentTime - (deltaTime % frameInterval);
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
        }
    }
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      const canvas = canvasRef.current;
      if (ctxRef.current && canvas) {
        ctxRef.current.clearRect(0, 0, canvas.width, canvas.height);
      }
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
      }
      if (particleSystemsRef.current) {
        particleSystemsRef.current = [];
      }
      timeRef.current = 0;
      ctxRef.current = null;
    };
  }, []);

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      margin: 'auto', 
      backgroundColor: '#F0EEE6', 
      overflow: 'hidden'
    }}>
      <canvas 
        ref={canvasRef} 
        style={{ 
          display: 'block', 
          width: '100%', 
          height: '100%',
          objectFit: 'cover'
        }} 
      />
    </div>
  );
};

export default QuadParticleFlower;
