'use client';

import React, { useEffect, useState } from 'react';
// dynamic import removed as it's not used
// import Button from '@/components/UI/Button'; // Commented out as it's not used
import HankiesInTheWind from '@/components/UI/HankiesInTheWind';
import { getProductsByCollection } from '@/utils/productData';
import ProductCard from '@/components/UI/ProductCard';

// ReactPlayer import removed as it's not used

export default function StorePage() {
  const [isMounted, setIsMounted] = useState(false);

  // Handle client-side mounting for the video player
  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="min-h-screen relative">
      {/* Video Hero Section */}
      <section className="relative h-screen w-full overflow-hidden">
        {/* Video background */}
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          {isMounted && (
            <>
              <video
                autoPlay
                muted
                loop
                className="absolute w-full h-full object-cover"
                style={{ objectFit: 'cover', objectPosition: 'top center' }}
                playsInline
              >
                <source src="/videos/video3.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </>
          )}
          {/* Black overlay with 50% opacity */}
          <div className="absolute inset-0 bg-black opacity-50"></div>
        </div>
        
        {/* Text overlay */}
        <div className="absolute inset-0 flex flex-col justify-center z-10 px-6 md:px-12 lg:px-24">
          <h1 className="text-white text-5xl md:text-7xl font-bold mb-8">WORK/STORE</h1>
          
          <div className="text-white">
            <h3 className="text-2xl font-bold mb-4">OPEN HOUSE</h3>
            <p className="text-xl mb-2">FIRST SATURDAY</p>
            <p className="text-xl mb-6">OF EACH MONTH</p>
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
