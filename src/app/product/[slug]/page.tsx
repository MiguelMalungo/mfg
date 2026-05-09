'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getProductBySlug } from '@/utils/productData';
import Button from '@/components/UI/Button';
import HankiesInTheWind from '@/components/UI/HankiesInTheWind';

export default function ProductPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const product = getProductBySlug(slug);
  const [currentImage, setCurrentImage] = useState(0);

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Product Not Found</h1>
          <p className="mb-6">The product you&apos;re looking for doesn&apos;t exist or has been removed.</p>
          <Link href="/store" className="underline">Return to Store</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Animation background */}
      <div className="fixed inset-0 z-0">
        <HankiesInTheWind initialZoom={6} />
      </div>
      
      <div className="relative z-10 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Product Image(s) */}
            {(() => {
              const images = [product.imageUrl, ...(product.secondaryImageUrl ? [product.secondaryImageUrl] : [])];
              const hasMultiple = images.length > 1;
              const safeIndex = ((currentImage % images.length) + images.length) % images.length;
              const prev = () => setCurrentImage((i) => i - 1);
              const next = () => setCurrentImage((i) => i + 1);
              return (
                <div className="relative">
                  <img
                    src={images[safeIndex]}
                    alt={product.name}
                    className="max-h-[80vh] w-auto mx-auto block object-contain"
                    style={{ maxHeight: '80vh' }}
                  />
                  {hasMultiple && (
                    <>
                      <button
                        onClick={prev}
                        aria-label="Previous image"
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-black rounded-full w-10 h-10 flex items-center justify-center shadow-md transition-colors"
                        style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)' }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="15 18 9 12 15 6" />
                        </svg>
                      </button>
                      <button
                        onClick={next}
                        aria-label="Next image"
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-black rounded-full w-10 h-10 flex items-center justify-center shadow-md transition-colors"
                        style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)' }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                      <div className="flex justify-center gap-2 mt-4">
                        {images.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentImage(i)}
                            aria-label={`Go to image ${i + 1}`}
                            className="rounded-full transition-colors"
                            style={{
                              width: '10px',
                              height: '10px',
                              backgroundColor: i === safeIndex ? 'black' : 'rgba(0,0,0,0.3)',
                            }}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
            
            {/* Product Info */}
            <div className="bg-white/80 p-6 rounded-lg shadow-sm">
              <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2 text-black">{product.name}</h1>
                <p className="text-lg font-medium mb-4 text-black">{product.collection}</p>
                <p className="text-2xl font-bold mb-6 text-black">{product.price}</p>
                <div className="mb-8">
                  <p className="text-lg text-black">{product.description}</p>
                  {product.dimensions && (
                    <p className="text-lg text-black mt-1">{product.dimensions}</p>
                  )}
                </div>
                
                <div className="space-y-4">
                  <Button 
                    href="/contact" 
                    variant="default"
                    className="w-full"
                  >
                    CONTACT
                  </Button>
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-8">
                <h2 className="text-xl font-bold mb-4 text-black">Product Details</h2>
                <ul className="list-disc pl-5 space-y-2 text-black">
                  <li>Original artwork by Miguel Ferraz Guedes</li>
                  <li>Part of the {product.collection} collection</li>
                  <li>Includes certificate of authenticity</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="mt-16">
            <Link href="/store" className="inline-block">
              <Button variant="outline">BACK TO STORE</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
