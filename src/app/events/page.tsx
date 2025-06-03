'use client';

import React from 'react';
import Artwork33 from '@/components/UI/Artwork33';

export default function EventsPage() {
  // Sample events data - this would typically come from a CMS or API
  const events = [
    {
      id: 1,
      title: "OPEN HOUSE",
      date: "June 4, 2025",
      time: "18:00 - 21:00",
      location: "Rua Serpa Pinto 59, Porto",
      description: "Join us for our monthly open house event where we showcase our latest works and collections."
    },
    {
      id: 2,
      title: "EXHIBITION OPENING",
      date: "July 27, 2025",
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
        <h1 className="text-4xl md:text-5xl font-bold mb-8">EVENTS</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <div className="space-y-8">
              {events.map((event) => (
                <div key={event.id} className="border-b border-gray-200 pb-8">
                  <h2 className="text-2xl font-bold mb-2">{event.title}</h2>
                  <div className="mb-4">
                    <p className="text-lg">{event.date}</p>
                    <p className="text-lg">{event.time}</p>
                    <p className="text-lg">{event.location}</p>
                  </div>
                  <p className="text-gray-700">{event.description}</p>
                </div>
              ))}
            </div>
          </div>
          
          <div className="relative h-full w-full flex justify-center items-start mt-[-40px]">
            <Artwork33 />
          </div>
        </div>
      </div>
    </div>
  );
}
