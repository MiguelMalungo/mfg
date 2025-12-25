'use client';

import React from 'react';
import Image from 'next/image';

export default function TestImage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Testing Image Display</h1>
      
      <div className="mb-6">
        <h2 className="text-xl mb-2">Using standard img tag:</h2>
        <img
          src="/images/blocks.webp"
          alt="Blocks"
          className="w-full max-w-md"
        />
      </div>

      <div className="mb-6">
        <h2 className="text-xl mb-2">Using Next.js Image component:</h2>
        <div style={{ position: 'relative', width: '100%', maxWidth: '500px', height: '300px' }}>
          <Image
            src="/images/blocks.webp"
            alt="Blocks"
            fill
            style={{ objectFit: 'contain' }}
          />
        </div>
      </div>
    </div>
  );
}
