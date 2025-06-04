'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getProductBySlug } from '@/utils/productData';
import Button from '@/components/UI/Button';
import HankiesInTheWind from '@/components/UI/HankiesInTheWind';

export default function ProductPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const product = getProductBySlug(slug);

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
            {/* Product Image */}
            <div className="relative">
              <img 
                src={product.imageUrl} 
                alt={product.name} 
                className="w-full h-auto object-contain"
              />
            </div>
            
            {/* Product Info */}
            <div className="bg-white/80 p-6 rounded-lg shadow-sm">
              <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2 text-black">{product.name}</h1>
                <p className="text-lg font-medium mb-4 text-black">{product.collection}</p>
                <p className="text-2xl font-bold mb-6 text-black">{product.price}</p>
                <div className="mb-8">
                  <p className="text-lg text-black">{product.description}</p>
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
