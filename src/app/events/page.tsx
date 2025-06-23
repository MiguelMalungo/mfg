'use client';

import React from 'react';
import Artwork33 from '@/components/UI/Artwork33';
import DecryptedText from './DecryptedText';

export default function EventsPage() {
  // Sample events data - this would typically come from a CMS or API
  const events = [
    {
      id: 1,
      title: "OPEN HOUSE",
      date: "June 6, 2025", // Updated to Friday
      time: "14:00 - 19:00",
      location: "Rua Serpa Pinto 59, Porto",
      description: "Join us for our Friday open house event where we showcase our latest works and collections."
    },
    {
      id: 2,
      title: "EXHIBITION OPENING",
      date: "July 25, 2025", // Updated to Friday
      time: "19:00 - 22:00",
      location: "Rua Serpa Pinto 59, Porto",
      description: "Opening for our new exhibition featuring the latest collections."
    },
    {
      id: 3,
      title: "ARTIST TALK",
      date: "August 10, 2025",
      time: "17:00 - 19:00",
      location: "Rua Serpa Pinto 59, Porto",
      description: "Join us for an intimate conversation about art, creativity, and the process behind our work."
    }
  ];

  return (
    <div className="min-h-screen py-16 px-6" style={{ backgroundColor: '#F0EEE6' }}>
      <div className="max-w-7xl mx-auto">
        <span className="mb-8 inline-block uppercase">
  <span className="italic text-5xl md:text-7xl">WELL</span>
  <DecryptedText
    text="COME"
    animateOn="view"
    revealDirection="center"
    className="text-5xl md:text-7xl font-bold"
    encryptedClassName="text-5xl md:text-7xl font-bold"
    speed={120}
    maxIterations={40}
  />
</span>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <div className="space-y-8">
              {events.map((event) => (
                <div key={event.id} className="border-b border-gray-200 pb-8">
                  <h2 className="text-2xl font-bold mb-2 text-black">{event.title}</h2>
                  <div className="mb-4">
                    <p className="text-lg text-black">{event.date}</p>
                    <p className="text-lg text-black">{event.time}</p>
                    <p className="text-lg text-black">{event.location}</p>
                  </div>
                  <p className="text-black">{event.description}</p>
                </div>
              ))}
            </div>
          </div>
          
          <div className="hidden md:block relative w-full h-full flex justify-center items-start mt-[-100px]">
            <Artwork33 />
          </div>
        </div>
        
        {/* Animation below text on mobile, full height */}
        <div className="md:hidden mt-8 w-full flex justify-center items-center">
          <div className="w-full h-[500px]">
            <Artwork33 />
          </div>
        </div>
      </div>
    </div>
  );
}
