'use client';

import React from 'react';
import ParticleFlower from '@/components/UI/ParticleFlower';

export default function BiographyPage() {
  return (
    <div className="min-h-screen py-16 px-6" style={{ backgroundColor: '#F0EEE6' }}>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-8">Welcome</h1>
        <h2 className="text-3xl md:text-4xl font-bold mb-12">SP59</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="prose prose-lg max-w-none">
            <p className="mb-6">
              This is our workshop, the center of our creative circle, where we explore ways, forms of perception and expression, 
              driven by the intensity of our emotions and intuition. We strive to delve deeper, to feel more intensely, and to 
              explore the myriad ways of expressing the vibrant kaleidoscope of possibilities through our existence.
            </p>
            
            <p className="mb-6">
              The creativity source light never gets extinguished and every moment is an opportunity for a new testament 
              of the immense beauty the universe has at our disposal.
            </p>
            
            <p className="mb-6">
              We aim to embark in a journey into the realm of the limitless with relentless curiosity, constantly testing 
              boundaries and new ways of doing things, of seeing the world as it is in all its beauty and diversity, but 
              also the world as it could be, being expressed in the present tense. At every moment a playground of potentialities, 
              a chance for sharing the depth and a breath of human experiences.
            </p>
            
            <p className="mb-6">
              We invite you to our creative and explorative place, a home for ideas, a sanctuary for our imaginations to 
              roam free where the doors are always open to the curious and appreciative and take part in this exchange of views.
            </p>
            
            <p className="mb-6">
              Your support allows us to continue our artistic exploration, fueling the ever-burning lantern of creativity we all share.
            </p>
            
            <p className="mb-6">
              We hope you can discover something here through personal insight or interpretation and/or recognize some shared 
              essence or inner truth, that may resonate with you as deeply as it does with us.
            </p>
          </div>
          
          <div className="relative h-full w-full flex justify-center items-start mt-[-100px]">
            <ParticleFlower />
          </div>
        </div>
      </div>
    </div>
  );
}
