'use client';

import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  z: number;
  initialR: number;
  initialTheta: number;
  initialHeight: number;
}

// themes: feminine creative force, eternal fertility, root energy
// visualization: Particles bloom and flow from a central source, embodying the eternal creative feminine

const ParticleFlower = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const timeRef = useRef<number>(0);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctxRef.current = ctx;
    
    // Make canvas responsive to container size
    const updateCanvasSize = () => {
      const container = canvas.parentElement;
      if (!container) return;
      
      const width = canvas.width = container.clientWidth;
      const height = canvas.height = container.clientHeight;
      const centerX = width / 2;
      const centerY = height / 2;
      
      return { width, height, centerX, centerY };
    };
    
    const { width, height, centerX, centerY } = updateCanvasSize() || { width: 300, height: 300, centerX: 150, centerY: 150 };
    
    const PARTICLE_COUNT = 30000;
    const FORM_SCALE = 2.4; // Increased by 20% from 2.0
    const particles: Particle[] = [];
    particlesRef.current = particles;
    
    // Initialize particles - seeds of the eternal feminine
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Start with a more converged form
      const theta = Math.random() * Math.PI * 2;
      const r = Math.pow(Math.random(), 0.5) * FORM_SCALE * 0.5 * 150; // Tighter radius
      const height = (Math.random() * 2 - 1) * FORM_SCALE * 0.3; // Less vertical spread
      
      // Calculate initial flow influence - root energy spiraling outward
      const angle = theta;
      const dist = r / 150;
      const flow = Math.sin(angle * 2 + height * 2) * 0.03;
      const counterFlow = Math.cos(angle * 2 - height * 2) * 0.03;
      const blend = (Math.sin(height * Math.PI) + 1) * 0.5;
      const combinedFlow = flow * blend + counterFlow * (1 - blend);
      
      // Apply initial flow to starting position
      const dx = r * Math.cos(theta);
      const dy = r * Math.sin(theta);
      const containment = Math.pow(Math.min(1, dist / (FORM_SCALE * 0.8)), 4);
      const pull = containment * 0.1;
      
      particles.push({
        x: centerX + dx + (dx * combinedFlow) - (dx * pull),
        y: centerY + dy + (dy * combinedFlow) - (dy * pull),
        z: height,
        initialR: r,
        initialTheta: theta,
        initialHeight: height
      });
    }
    
    // Animation timing control variables
    let lastFrameTime = 0;
    const targetFPS = 10; // Equivalent to 100ms setInterval
    const frameInterval = 1000 / targetFPS;
    
    // Animation function with time delta control
    function animate(currentTime: number) {
      // Initialize lastFrameTime on first frame
      if (!lastFrameTime) {
        lastFrameTime = currentTime;
      }
      
      const deltaTime = currentTime - lastFrameTime;
      
      // Only update animation when enough time has passed (mimics setInterval at 100ms)
      if (deltaTime >= frameInterval) {
        // Using a fixed time increment for consistent animation
        timeRef.current += 0.0005;
        
        // Clear with slight trails for ghosting effect
        // More transparent for smoother trails at lower frame rates
        if (!ctx) return;
        ctx.fillStyle = 'rgba(240, 238, 230, 0.05)';
        ctx.fillRect(0, 0, width, height);
        
        particles.forEach(particle => {
          // Get relative position to center
          const dx = particle.x - centerX;
          const dy = particle.y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy) / 150; // Normalize distance
          const angle = Math.atan2(dy, dx);
          const height = particle.z / (FORM_SCALE * 0.4);
          
          const flow = Math.sin(angle * 2 - timeRef.current * 0.5 + height * 2) * 0.015;
          const counterFlow = Math.cos(angle * 2 + timeRef.current * 0.5 - height * 2) * 0.015;
          
          // Blend flows based on height
          const blend = (Math.sin(height * Math.PI) + 1) * 0.5;
          const combinedFlow = flow * blend + counterFlow * (1 - blend);
          
          // Strong containment
          const containment = Math.pow(Math.min(1, dist / (FORM_SCALE * 0.8)), 4);
          const pull = containment * 0.1;
          
          // Apply gentle balanced motion
          particle.x = particle.x + (dx * combinedFlow) - (dx * pull);
          particle.y = particle.y + (dy * combinedFlow) - (dy * pull);
          particle.z = particle.z + Math.sin(timeRef.current * 0.15 + dist * 2) * 0.01;
          
          // Draw particle with depth-based opacity
          const depthFactor = 1 + particle.z * 0.5;
          const opacity = 0.35 * depthFactor;
          const size = Math.max(0.001, 0.6 * depthFactor); // Increased particle size by 20% from 0.5
          
          if (ctx) {
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(51, 51, 51, ${opacity})`;
            ctx.fill();
          }
        });
        
        // Update lastFrameTime, accounting for any remainder to prevent drift
        lastFrameTime = currentTime - (deltaTime % frameInterval);
      }
      
      // Continue animation loop
      animationFrameRef.current = requestAnimationFrame(animate);
    }
    
    // Start animation
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      // Cancel animation frame to prevent memory leaks
      if (animationFrameRef.current !== null) {
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
      
      if (particlesRef.current) {
        particlesRef.current.length = 0;
      }
      
      timeRef.current = 0;
      ctxRef.current = null;
    };
  }, []);
  
  return (
    <div className="w-full h-full" style={{
      minHeight: '300px',
      backgroundColor: '#F0EEE6',
      overflow: 'hidden'
    }}>
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
      />
    </div>
  );
};

export default ParticleFlower;
