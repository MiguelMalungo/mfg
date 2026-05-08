'use client';

import React, { useState, useEffect } from 'react';
import MagnifyingGlass from '@/components/UI/MagnifyingGlass';

export default function ProjectsPage() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const projects = [
    {
      id: 1,
      title: "NFTs",
      url: "https://influc.my.canva.site/mfg",
    },
    {
      id: 2,
      title: "DIGITAL ART LEVERAGED BY AI",
      url: "https://influc.my.canva.site/mfg",
    },
    {
      id: 3,
      title: "BLEND BY KALEIDOKONSCIOUS",
      subtitle: "An interactive book of poems",
      url: "https://miguelmalungo.github.io/kept/",
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

        <div className="space-y-8 max-w-2xl">
          {projects.map((project) => (
            <a
              key={project.id}
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block border-b border-gray-200 pb-8 hover:opacity-70 transition-opacity"
            >
              <h2 className="text-2xl font-bold mb-2 text-black">{project.title}</h2>
              {project.subtitle && (
                <p className="text-lg text-black">{project.subtitle}</p>
              )}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
