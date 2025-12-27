'use client';

import { useState, useEffect } from 'react';
import Button from "@/components/UI/Button";
import HankiesInTheWind from '@/components/UI/HankiesInTheWind';
import DecryptedText from '@/components/UI/DecryptedText';
import MagnifyingGlass from '@/components/UI/MagnifyingGlass';

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="min-h-screen relative">
      {/* Magnifying Glass Effect */}
      {isMounted && (
        <MagnifyingGlass
          size={200}
          magnification={1.8}
          borderColor="#ffffff"
          borderWidth={4}
        />
      )}

      {/* Three.js Animation Background */}
      <HankiesInTheWind initialZoom={6} />
      {/* Hero Section */}
      <section className="relative h-screen z-10">
        {/* Image visible only on mobile, hidden on md (medium) screens and up */}
        <div className="absolute inset-0 md:hidden overflow-hidden">
          <style jsx>{`
            @keyframes panAnimation {
              0% {
                transform: scale(1.3) translateX(0);
              }
              100% {
                transform: scale(1.3) translateX(-10%);
              }
            }
            .pan-image {
              animation: panAnimation 25s ease-out forwards;
              transform-origin: center center;
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
          `}</style>
          <img
            src="/images/imageA.webp"
            alt="Miguel Ferraz Guedes - Porto Based Artist"
            className="w-full h-full object-cover z-10 pan-image"
          />
        </div>
        <div className="absolute top-0 left-0 p-8 md:p-12 lg:p-16 z-20">
          <DecryptedText
            text="MIGUEL"
            animateOn="view"
            revealDirection="center"
            className="italic text-6xl md:text-8xl mb-2 text-white"
            encryptedClassName="italic text-6xl md:text-8xl mb-2 text-white"
            speed={120}
            maxIterations={40}
          />
          <h1 className="text-6xl md:text-8xl font-bold mb-2 text-white">FERRAZ</h1>
          <h1 className="text-6xl md:text-8xl font-bold mb-6 text-white">GUEDES</h1>
          <div className="flex space-x-4">
            <Button 
              href="/store" 
              variant="outline" 
              className="text-white border-white hover:bg-white hover:text-black"
            >
              STORE
            </Button>
            <Button 
              href="/biography" 
              variant="outline" 
              className="text-white border-white hover:bg-white hover:text-black"
            >
              SP59
            </Button>
          </div>
        </div>
      </section>

      {/* Latest Collections Section */}
      <section className="py-16 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold mb-2">LATEST</h2>
          <h3 className="text-3xl font-bold mb-12">COLLECTIONS</h3>
          
          <div className="flex flex-col space-y-8">
            {/* CAVE Collection */}
            <div className="group relative overflow-hidden w-full md:w-1/3 self-start">
              <div className="aspect-square mb-4 relative w-full md:max-w-[300px]">
                <img
                  src="/images/cave2.webp"
                  alt="CAVE Collection artwork by Miguel Ferraz Guedes"
                  className="w-full h-full object-cover"
                  style={{ maxWidth: '100%', maxHeight: '300px' }}
                />
              </div>
              <h3 className="text-xl font-semibold mb-2">CAVE</h3>
              <Button 
                href="/store" 
                variant="outline"
              >
                VIEW
              </Button>
            </div>
            
            {/* DEFFECTS Collection */}
            <div className="group relative overflow-hidden w-full md:w-1/3 self-start">
              <div className="aspect-square mb-4 relative w-full md:max-w-[300px]">
                <img
                  src="/images/carbon.webp"
                  alt="DEFFECTS Collection artwork by Miguel Ferraz Guedes"
                  className="w-full h-full object-cover"
                  style={{ maxWidth: '100%', maxHeight: '300px' }}
                />
              </div>
              <h3 className="text-xl font-semibold mb-2">DEFFECTS</h3>
              <Button 
                href="/store" 
                variant="outline"
              >
                VIEW
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Open House information removed as requested */}
    </div>
  );
}
