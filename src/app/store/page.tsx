'use client';

import React, { useEffect, useState } from 'react';
// dynamic import removed as it's not used
// import Button from '@/components/UI/Button'; // Commented out as it's not used
import HankiesInTheWind from '@/components/UI/HankiesInTheWind';
import TrueFocus from './TrueFocus';
import { getProductsByCollection } from '@/utils/productData';
import ProductCard from '@/components/UI/ProductCard';

export default function StorePage() {
  const [isMounted, setIsMounted] = useState(false);
  const [muted, setMuted] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  // Handle client-side mounting for the video player
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleMuteToggle = () => {
    setMuted((prev) => !prev);
    if (videoRef.current) {
      videoRef.current.muted = !muted;
      if (!videoRef.current.paused && !videoRef.current.muted) {
        videoRef.current.volume = 1;
      }
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Video Hero Section */}
      <section className="relative h-screen w-full overflow-hidden">
        {/* Video background */}
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          {isMounted && (
            <>
              <video 
                ref={videoRef}
                autoPlay
                loop
                className="absolute w-full h-full object-cover"
                style={{ objectFit: 'cover', objectPosition: 'top center' }}
                playsInline
                muted={muted}
                onError={() => setVideoError(true)}
              >
                <source src="/videos/MyMovie.MP4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              
              {/* Mute/Unmute Button */}
              <button
                onClick={handleMuteToggle}
                className="absolute bottom-4 right-4 z-20 bg-black/70 text-white rounded-full p-3 focus:outline-none focus:ring"
                aria-label={muted ? 'Unmute video' : 'Mute video'}
                style={{ backdropFilter: 'blur(4px)' }}
              >
                {muted ? (
                  // Muted icon
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9v6h4l5 5V4l-5 5H9z" />
                    <line x1="19" y1="5" x2="5" y2="19" stroke="currentColor" strokeWidth="2" />
                  </svg>
                ) : (
                  // Volume icon
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9v6h4l5 5V4l-5 5H9z" />
                  </svg>
                )}
              </button>
              {/* Error message if video fails to load */}
              {videoError && (
                <div className="absolute inset-0 flex items-center justify-center z-30">
                  <span className="bg-red-600 text-white px-4 py-2 rounded">Video failed to load</span>
                </div>
              )}
            </>
          )}
          {/* Black overlay with 50% opacity */}
          <div className="absolute inset-0 bg-black opacity-50"></div>
        </div>
        
        {/* Text overlay */}
        <div className="absolute inset-0 flex flex-col justify-center z-10 px-6 md:px-12 lg:px-24">
          <TrueFocus 
  sentence="WORK STORE"
  manualMode={false}
  blurAmount={5}
  borderColor="white"
  animationDuration={2}
  pauseBetweenAnimations={1}
/>
          
          <div className="text-white">
            <h3 className="text-2xl font-bold mb-4">OPEN HOUSE</h3>
            <p className="text-xl mb-2">EVERY FRIDAY</p>
            <p className="text-xl mb-6">14:00 - 19:00</p>
            <p className="text-lg font-semibold">RUA SERPA PINTO 59</p>
          </div>
        </div>
      </section>

      {/* Animation background for sections below hero */}
      <div className="absolute top-[100vh] left-0 right-0 bottom-0 z-0">
        <HankiesInTheWind initialZoom={6} />
      </div>

      {/* CAVE Collection Section */}
      <section className="py-16 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="mb-20">
            <h2 className="text-3xl font-bold mb-8 text-black bg-white/70 inline-block px-3 py-1">CAVE</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {getProductsByCollection('CAVE').map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
          
          {/* Dream Engine Section */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold mb-8 text-black bg-white/70 inline-block px-3 py-1">DREAM ENGINE</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {getProductsByCollection('DREAM ENGINE').map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Collections Section */}
      <section className="py-16 px-6 relative z-10 bg-transparent">
        <div className="max-w-7xl mx-auto">
          {/* DEFFECTS Collection */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold mb-8 text-black bg-white/70 inline-block px-3 py-1">DEFFECTS</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {getProductsByCollection('DEFFECTS').map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>

          {/* VOID Collection */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold mb-8 text-black bg-white/70 inline-block px-3 py-1">VOID</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {getProductsByCollection('VOID').map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>

          {/* TRANSMITTERS Collection */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold mb-8 text-black bg-white/70 inline-block px-3 py-1">TRANSMITTERS</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {getProductsByCollection('TRANSMITTERS').map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>

          {/* BASED Collection */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold mb-8 text-black bg-white/70 inline-block px-3 py-1">BASED</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {getProductsByCollection('BASED').map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* POINTS Section */}
      <section className="py-16 px-6 relative z-10 bg-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="mb-20">
            <h2 className="text-3xl font-bold mb-8 text-black bg-white/70 inline-block px-3 py-1">POINTS</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {getProductsByCollection('POINTS').map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>

          {/* SINGLE WORKS Collection */}
          <div>
            <h2 className="text-3xl font-bold mb-8 text-black bg-white/70 inline-block px-3 py-1">SINGLE WORKS</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {getProductsByCollection('SINGLE WORKS').map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
