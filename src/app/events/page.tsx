'use client';

import React, { useState, useEffect } from 'react';
import Artwork33 from '@/components/UI/Artwork33';
import MagnifyingGlass from '@/components/UI/MagnifyingGlass';

export default function ExhibitionsPage() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const onView = [
    {
      id: 1,
      title: "ALICE IN BREWLAND CAFÉ",
      since: "Since May 3, 2026",
      location: "Rua do Almada 334, Porto",
    },
    {
      id: 2,
      title: "PATIO DA ALMADA",
      since: "Since May 10, 2026",
      location: "Rua do Almada 580, Porto",
    },
  ];

  const auctions = [
    {
      id: 1,
      title: "BID BY BYD",
      subtitle: "Contemporary Art Auction",
      date: "May 2026",
      location: "Rua Engenheiro Ezequiel de Campos 186, Porto",
    },
  ];

  return (
    <div className="min-h-screen py-16 px-6" style={{ backgroundColor: '#F0EEE6' }}>
      {/* Magnifying Glass Effect */}
      {isMounted && (
        <MagnifyingGlass
          size={200}
          magnification={1.8}
          borderColor="#000000"
          borderWidth={4}
        />
      )}
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-8">EXHIBITIONS</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <h2 className="text-2xl font-bold mb-6 text-black">ON VIEW</h2>
            <div className="space-y-8 mb-12">
              {onView.map((item) => (
                <div key={item.id} className="border-b border-gray-200 pb-8">
                  <h3 className="text-xl font-bold mb-2 text-black">{item.title}</h3>
                  <p className="text-lg text-black">{item.since}</p>
                  <p className="text-lg text-black">{item.location}</p>
                </div>
              ))}
            </div>

            <h2 className="text-2xl font-bold mb-6 text-black">CONTEMPORARY ART AUCTION</h2>
            <div className="space-y-8">
              {auctions.map((auction) => (
                <div key={auction.id} className="border-b border-gray-200 pb-8">
                  <h3 className="text-xl font-bold mb-2 text-black">{auction.title}</h3>
                  <p className="text-lg text-black">{auction.date}</p>
                  <p className="text-lg text-black">{auction.location}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden md:block relative w-full h-full flex justify-center items-start mt-[-100px]">
            <Artwork33 />
          </div>
        </div>

        {/* Animation below text on mobile */}
        <div className="md:hidden mt-8 w-full flex justify-center items-center">
          <div className="w-full h-[500px]">
            <Artwork33 />
          </div>
        </div>
      </div>
    </div>
  );
}
