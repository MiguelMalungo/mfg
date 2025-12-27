'use client';

import { useEffect, useState, useRef } from 'react';

interface MagnifyingGlassProps {
  size?: number;
  magnification?: number;
  borderColor?: string;
  borderWidth?: number;
}

export default function MagnifyingGlass({
  size = 200,
  magnification = 2,
  borderColor = '#ffffff',
  borderWidth = 4
}: MagnifyingGlassProps) {
  const [position, setPosition] = useState({ x: -1000, y: -1000 });
  const [isVisible, setIsVisible] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      setIsVisible(true);

      // Clear canvas
      ctx.clearRect(0, 0, size, size);

      // Create circular clip
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - borderWidth, 0, Math.PI * 2);
      ctx.clip();

      // Calculate source rectangle
      const sourceSize = size / magnification;
      const sourceX = e.pageX - sourceSize / 2;
      const sourceY = e.pageY - sourceSize / 2;

      // Draw magnified content (simulated with gradient for now)
      // In a real implementation, you'd use html2canvas or similar to capture actual content
      const gradient = ctx.createRadialGradient(
        size / 2, size / 2, 0,
        size / 2, size / 2, size / 2
      );
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.05)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);

      ctx.restore();

      // Draw glass reflection
      ctx.save();
      ctx.beginPath();
      ctx.arc(size * 0.3, size * 0.3, size * 0.15, 0, Math.PI * 2);
      const reflectionGradient = ctx.createRadialGradient(
        size * 0.3, size * 0.3, 0,
        size * 0.3, size * 0.3, size * 0.15
      );
      reflectionGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
      reflectionGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = reflectionGradient;
      ctx.fill();
      ctx.restore();
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [size, magnification, borderWidth]);

  const radius = size / 2;

  return (
    <div
      style={{
        position: 'fixed',
        left: position.x - radius,
        top: position.y - radius,
        width: size,
        height: size,
        pointerEvents: 'none',
        zIndex: 9999,
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.2s ease',
      }}
    >
      {/* Lens effect using backdrop-filter */}
      <div
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: '50%',
          boxShadow: `
            0 0 30px rgba(255, 255, 255, 0.3),
            0 10px 30px rgba(0, 0, 0, 0.2)
          `,
          backdropFilter: `brightness(1.3) contrast(1.1) saturate(1.2)`,
          WebkitBackdropFilter: `brightness(1.3) contrast(1.1) saturate(1.2)`,
          overflow: 'hidden',
        }}
      >
        {/* Inner magnification effect */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '200%',
            height: '200%',
            transform: `translate(-50%, -50%) scale(${magnification})`,
            transformOrigin: 'center',
            backdropFilter: 'blur(0px)',
            mixBlendMode: 'normal',
          }}
        />

        {/* Edge shadow */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.3)',
          }}
        />
      </div>

      {/* Canvas for additional effects */}
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          opacity: 0.3,
        }}
      />
    </div>
  );
}
