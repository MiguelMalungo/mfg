'use client';

import React from 'react';
import HankiesInTheWind from '@/components/UI/HankiesInTheWind';

export default function SP59Page() {
  return (
    <div className="min-h-screen py-16 px-6" style={{ backgroundColor: '#F0EEE6' }}>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-6xl md:text-8xl font-extrabold mb-12 text-left text-black">RUA SERPA PINTO 59</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="prose prose-lg max-w-none">
            <p className="mb-6 text-black">
              Rua Serpa Pinto 59 is our workshop and creative space in Porto, Portugal. 
              This is the center of our creative circle, where we explore ways, forms of perception and expression.
            </p>
            
            <p className="mb-6 text-black">
              The space serves as both a studio and exhibition area, where we host open house events every Friday
              and showcase our latest works and collections.
            </p>
            
            <p className="mb-6 text-black">
              We invite you to visit us during our open hours or scheduled events to experience 
              our creative environment firsthand.
            </p>
          </div>
          
          <div className="relative w-full h-[300px] md:h-full flex justify-center items-center">
            {/* Animation at 50% size (half size) */}
            <div className="w-full md:w-[50%] h-[50%]">
              <HankiesInTheWind initialZoom={3} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
