import React, { useRef, useEffect } from 'react';
import './Particles.css';

const Particles = ({
  particleCount = 100,
  particleSize = 3,
  speed = 1,
  moveParticlesOnHover = true,
  className,
}) => {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const particles = [];

    // Set canvas size to match container
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      
      // Re-initialize particles after resize
      initParticles();
    };

    // Initialize particles
    const initParticles = () => {
      particles.length = 0;
      
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * particleSize + 1,
          speedX: (Math.random() - 0.5) * speed,
          speedY: (Math.random() - 0.5) * speed,
        });
      }
      
      particlesRef.current = particles;
    };

    // Handle mouse movement
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    // Draw particles
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw each particle
      particlesRef.current.forEach(particle => {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.fill();
        
        // Update position
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        
        // Mouse interaction
        if (moveParticlesOnHover && mouseRef.current.x > 0) {
          const dx = mouseRef.current.x - particle.x;
          const dy = mouseRef.current.y - particle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 100) {
            const angle = Math.atan2(dy, dx);
            particle.x -= Math.cos(angle) * 1;
            particle.y -= Math.sin(angle) * 1;
          }
        }
        
        // Bounce off edges
        if (particle.x < 0 || particle.x > canvas.width) {
          particle.speedX = -particle.speedX;
        }
        
        if (particle.y < 0 || particle.y > canvas.height) {
          particle.speedY = -particle.speedY;
        }
      });
      
      animationFrameRef.current = requestAnimationFrame(draw);
    };

    // Setup
    window.addEventListener('resize', resize);
    if (moveParticlesOnHover) {
      canvas.addEventListener('mousemove', handleMouseMove);
    }
    
    resize();
    draw();

    // Cleanup
    return () => {
      window.removeEventListener('resize', resize);
      if (moveParticlesOnHover) {
        canvas.removeEventListener('mousemove', handleMouseMove);
      }
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [particleCount, particleSize, speed, moveParticlesOnHover]);

  return (
    <canvas
      ref={canvasRef}
      className={`particles-container ${className || ''}`}
    />
  );
};

export default Particles;
