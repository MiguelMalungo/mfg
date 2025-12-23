'use client';

import React from 'react';
import HankiesInTheWind from '@/components/UI/HankiesInTheWind';

export default function SP59Page() {
  return (
    <div className="min-h-screen py-16 px-6" style={{ backgroundColor: '#F0EEE6' }}>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl md:text-[42px] font-bold mb-12 text-left text-black">RUA SERPA PINTO 59</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="prose prose-lg max-w-none">
            <p className="mb-6 text-black">
              This is our workshop — the heart of our creative circle. Here we explore different ways of seeing and expressing, guided by intuition and what moves us. We try to go deeper, to feel more, and to discover how many forms our experiences can take.
            </p>

            <p className="mb-6 text-black">
              The creative spark doesn't go out. Every moment offers a chance to witness the quiet beauty around us.
            </p>

            <p className="mb-6 text-black">
              We want to stay curious — to keep testing boundaries, trying new approaches, seeing the world as it is and imagining what it could become. Each moment holds possibilities, a chance to share something of the depth and breadth of being human.
            </p>

            <p className="mb-6 text-black">
              We invite you into this space — a home for ideas, where imagination can wander freely. The door is open to anyone curious and willing to look.
            </p>

            <p className="mb-6 text-black">
              Your support helps us keep exploring.
            </p>

            <p className="mb-6 text-black">
              We hope you might find something here that resonates — a shared feeling, a familiar truth, something that speaks to you as it does to us.
            </p>
          </div>
          
          <div className="relative w-full h-[300px] md:h-full flex justify-center items-center">
            {/* Animation at 50% size (half size) */}
            <div className="w-[50%] h-[50%]">
              <HankiesInTheWind initialZoom={3} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
