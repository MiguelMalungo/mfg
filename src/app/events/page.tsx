'use client';

import React, { useState, useEffect } from 'react';
import Artwork33 from '@/components/UI/Artwork33';
import MagnifyingGlass from '@/components/UI/MagnifyingGlass';

type OnViewItem = {
  id: number;
  title: string;
  modalTitle: string;
  since: string;
  location: string;
  url: string;
  instagram: string;
  images: string[];
};

export default function ExhibitionsPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [activeModal, setActiveModal] = useState<OnViewItem | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!activeModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveModal(null);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [activeModal]);

  const onView: OnViewItem[] = [
    {
      id: 1,
      title: "ALICE IN BREWLAND CAFÉ",
      modalTitle: "ON VIEW IN ALICE IN BREWLAND CAFÉ",
      since: "Since May 10, 2026",
      location: "Rua do Almada 334, Porto",
      url: "https://www.google.com/maps/search/?api=1&query=Rua+do+Almada+334+Porto",
      instagram: "https://www.instagram.com/alice_brewland/",
      images: [
        "/images/alice1.jpg",
        "/images/alice2.jpg",
        "/images/alice3.jpg",
        "/images/alice4.jpg",
        "/images/alice5.JPG",
        "/images/alice%206.jpg",
      ],
    },
    {
      id: 2,
      title: "PATIO DA ALMADA",
      modalTitle: "ON VIEW IN PATIO DA ALMADA",
      since: "Since May 10, 2026",
      location: "Rua do Almada 580, Porto",
      url: "https://www.google.com/maps/search/?api=1&query=Rua+do+Almada+580+Porto",
      instagram: "https://www.instagram.com/patiodoalmada.porto/",
      images: [
        "/images/patio1.jpg",
        "/images/patio2.jpg",
        "/images/patio3.jpg",
        "/images/patio4.jpg",
      ],
    },
  ];

  const auctions = [
    {
      id: 1,
      title: "BID BY BYD",
      subtitle: "Contemporary Art Auction",
      date: "May 2026",
      location: "Rua Engenheiro Ezequiel de Campos 186, Porto",
      url: "https://www.bidbybid.pt/home-english/",
    },
  ];

  const eventsJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      ...onView.map((item) => ({
        "@type": "ExhibitionEvent",
        name: `${item.title} — Miguel Ferraz Guedes on view`,
        startDate: "2026-05-10",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        eventStatus: "https://schema.org/EventScheduled",
        location: {
          "@type": "Place",
          name: item.title,
          address: {
            "@type": "PostalAddress",
            streetAddress: item.location.split(',')[0].trim(),
            addressLocality: "Porto",
            addressCountry: "PT",
          },
        },
        organizer: {
          "@type": "Person",
          name: "Miguel Ferraz Guedes",
          url: "https://miguelfguedes.pt",
        },
        url: item.url,
      })),
      ...auctions.map((auction) => ({
        "@type": "Event",
        name: `${auction.title} — ${auction.subtitle}`,
        startDate: "2026-05-01",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        eventStatus: "https://schema.org/EventScheduled",
        location: {
          "@type": "Place",
          name: auction.title,
          address: {
            "@type": "PostalAddress",
            streetAddress: auction.location.split(',')[0].trim(),
            addressLocality: "Porto",
            addressCountry: "PT",
          },
        },
        url: auction.url,
      })),
    ],
  };

  return (
    <div className="min-h-screen py-16 px-6" style={{ backgroundColor: '#F0EEE6' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventsJsonLd) }}
      />
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
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveModal(item)}
                  className="block w-full text-left border-b border-gray-200 pb-8 hover:opacity-70 transition-opacity cursor-pointer"
                >
                  <h3 className="text-xl font-bold mb-2 text-black underline underline-offset-4 inline-flex items-center gap-2">
                    {item.title}
                    <svg
                      className="inline-block"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="7" y1="17" x2="17" y2="7" />
                      <polyline points="9 7 17 7 17 15" />
                    </svg>
                  </h3>
                  <p className="text-lg text-black">{item.since}</p>
                  <p className="text-lg text-black">{item.location}</p>
                </button>
              ))}
            </div>

            <h2 className="text-2xl font-bold mb-6 text-black">CONTEMPORARY ART AUCTION</h2>
            <div className="space-y-8">
              {auctions.map((auction) => (
                <a
                  key={auction.id}
                  href={auction.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block border-b border-gray-200 pb-8 hover:opacity-70 transition-opacity cursor-pointer"
                >
                  <h3 className="text-xl font-bold mb-2 text-black underline underline-offset-4 inline-flex items-center gap-2">
                    {auction.title}
                    <svg
                      className="inline-block"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="7" y1="17" x2="17" y2="7" />
                      <polyline points="9 7 17 7 17 15" />
                    </svg>
                  </h3>
                  <p className="text-lg text-black">{auction.date}</p>
                  <p className="text-lg text-black">{auction.location}</p>
                </a>
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

      {activeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg p-6 md:p-10"
            style={{ backgroundColor: '#F0EEE6' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={() => setActiveModal(null)}
              className="absolute right-4 top-4 text-black hover:opacity-60 transition-opacity"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <h2 className="pr-10 text-2xl md:text-3xl font-bold text-black mb-3">
              {activeModal.modalTitle}
            </h2>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-6">
              <a
                href={activeModal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg text-black underline underline-offset-4 hover:opacity-70 transition-opacity"
              >
                {activeModal.location}
              </a>
              <a
                href={activeModal.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="text-black hover:opacity-70 transition-opacity"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeModal.images.map((src) => (
                <img
                  key={src}
                  src={src}
                  alt={activeModal.title}
                  className="w-full h-auto object-cover rounded"
                  loading="lazy"
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
