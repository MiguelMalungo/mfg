'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
            className="italic text-6xl md:text-8xl mb-2 text-white md:text-black"
            encryptedClassName="italic text-6xl md:text-8xl mb-2 text-white md:text-black"
            speed={120}
            maxIterations={40}
          />
          <h1 className="text-6xl md:text-8xl font-bold mb-2 text-white md:text-black">FERRAZ</h1>
          <h1 className="text-6xl md:text-8xl font-bold mb-6 text-white md:text-black">GUEDES</h1>
          <div className="flex flex-col items-start gap-3">
            <a
              href="/store"
              className="inline-block px-12 py-4 uppercase text-lg tracking-wide transition-colors rounded-full font-bold text-center bg-transparent border border-[1px] text-white border-white hover:bg-white hover:text-black md:text-black md:border-black md:hover:bg-black md:hover:text-white"
            >
              WORK
            </a>
            <a
              href="/events"
              className="inline-block px-12 py-4 uppercase text-lg tracking-wide transition-colors rounded-full font-bold text-center bg-transparent border border-[1px] text-white border-white hover:bg-white hover:text-black md:text-black md:border-black md:hover:bg-black md:hover:text-white"
            >
              EVENTS
            </a>
            <a
              href="/contact"
              className="inline-block px-12 py-4 uppercase text-lg tracking-wide transition-colors rounded-full font-bold text-center bg-transparent border border-[1px] text-white border-white hover:bg-white hover:text-black md:text-black md:border-black md:hover:bg-black md:hover:text-white"
            >
              CONTACT
            </a>
            <Link
              href="/garden"
              className="inline-block px-12 py-4 uppercase text-lg tracking-wide transition-colors rounded-full font-bold text-center bg-transparent border border-[1px] text-white border-white hover:bg-white hover:text-black md:text-black md:border-black md:hover:bg-black md:hover:text-white"
            >
              DIGITAL GARDEN
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
