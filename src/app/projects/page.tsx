'use client';

import React, { useState, useEffect } from 'react';
import MagnifyingGlass from '@/components/UI/MagnifyingGlass';
import ParticleFlower from '@/components/UI/ParticleFlower';

export default function ProjectsPage() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const projects = [
    {
      id: 1,
      title: "NFTs & DIGITAL ART LEVERAGED BY AI",
      subtitle: "Reach out to have your own interactive gamified museum mobile App to display Digital Art and NFTs",
      url: "https://influc.my.canva.site/mfg",
    },
    {
      id: 2,
      title: "BLEND BY KALEIDOKONSCIOUS",
      subtitle: "An interactive book of poems with AI generated Art & Media",
      url: "https://miguelmalungo.github.io/kept/",
    },
    {
      id: 3,
      title: "BLOCKS",
      subtitle: "Interactive poetry book",
      url: "https://lovely-pegasus-e9f6e6.netlify.app/",
    },
  ];

  return (
    <div className="min-h-screen py-16 px-6" style={{ backgroundColor: '#F0EEE6' }}>
      {isMounted && (
        <MagnifyingGlass
          size={200}
          magnification={1.8}
          borderColor="#000000"
          borderWidth={4}
        />
      )}
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-8">PROJECTS</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-8">
            {projects.map((project) => (
              <a
                key={project.id}
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block border-b border-gray-200 pb-8 hover:opacity-70 transition-opacity cursor-pointer"
              >
                <h2 className="text-2xl font-bold mb-2 text-black underline underline-offset-4 inline-flex items-center gap-2">
                  {project.title}
                  <svg
                    className="inline-block"
                    width="20"
                    height="20"
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
                </h2>
                {project.subtitle && (
                  <p className="text-lg text-black">{project.subtitle}</p>
                )}
              </a>
            ))}
          </div>

          <div className="hidden md:flex justify-center items-start mt-[-100px]">
            <ParticleFlower />
          </div>
        </div>

        {/* Animation below text on mobile */}
        <div className="md:hidden mt-8 w-full flex justify-center items-center">
          <div className="w-full h-[500px]">
            <ParticleFlower />
          </div>
        </div>
      </div>
    </div>
  );
}
