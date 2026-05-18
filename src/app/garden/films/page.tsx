'use client';

import React from 'react';
import Link from 'next/link';
import { GrowthIcon, type GrowthStage } from '@/components/UI/GrowthIcons';

type Film = {
  title: string;
  stage: GrowthStage;
  blurb: string;
  youtubeId?: string;
  year?: string;
};

const STAGE_LABEL: Record<GrowthStage, string> = {
  seedling: 'Seedling',
  budding: 'Budding',
  evergreen: 'Evergreen',
};

const FILMS: Film[] = [
  {
    title: "Plato's Cat",
    stage: 'seedling',
    year: '2026',
    blurb:
      "An AI-assisted film, in the making. I am building it the way you build a cave painting — slowly, with what is at hand. Updates will appear here as the cuts come together.",
  },
];

export default function FilmsPage() {
  return (
    <div className="min-h-screen py-16 px-6" style={{ backgroundColor: '#F0EEE6' }}>
      <div className="max-w-3xl mx-auto">
        <Link
          href="/garden"
          className="text-xs uppercase tracking-widest text-black/60 hover:text-black"
        >
          ← Back to the Garden
        </Link>

        <header className="mt-6 mb-12">
          <div className="flex items-center gap-3 text-xs uppercase tracking-widest mb-4">
            <GrowthIcon stage="seedling" size={18} className="text-black" />
            <span className="font-bold">Seedling</span>
            <span className="text-black/60">· Film · AI</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-6 text-black bg-white/70 inline-block px-3 py-1">
            FILMS
          </h1>
          <p className="text-2xl md:text-3xl font-bold leading-snug text-black">
            A small theatre. Films I have put out, and a film in the making. This page will
            grow as the reels do.
          </p>
        </header>

        <div className="space-y-16">
          {FILMS.map((f) => (
            <FilmEntry key={f.title} film={f} />
          ))}

          {/* Placeholder for future YouTube films */}
          <section>
            <div className="text-xs uppercase tracking-widest text-black/60 mb-2">
              From the channel
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-4">YouTube</h2>
            <p className="text-black/80 leading-relaxed mb-6">
              Older films and experiments live on my channel. Drop the embeds in here when
              ready — each as its own block.
            </p>
            <div className="grid grid-cols-1 gap-4">
              <YouTubePlaceholder label="YouTube film — drop ID here" />
              <YouTubePlaceholder label="YouTube film — drop ID here" />
            </div>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-black/15 flex items-center justify-between text-sm">
          <Link
            href="/garden"
            className="uppercase tracking-widest font-bold hover:opacity-70"
          >
            ← Garden
          </Link>
          <span className="text-black/60 italic">Reels in progress.</span>
        </div>
      </div>
    </div>
  );
}

function FilmEntry({ film }: { film: Film }) {
  return (
    <section>
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-black/60 mb-2">
        <GrowthIcon stage={film.stage} size={16} className="text-black" />
        <span>{STAGE_LABEL[film.stage]}</span>
        {film.year && <span>· {film.year}</span>}
      </div>
      <h2 className="text-2xl md:text-3xl font-bold mb-4">{film.title}</h2>

      {film.youtubeId ? (
        <div className="aspect-video w-full mb-5">
          <iframe
            src={`https://www.youtube.com/embed/${film.youtubeId}`}
            title={film.title}
            className="w-full h-full border border-black/15 rounded-sm"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <YouTubePlaceholder label={`${film.title} — coming`} />
      )}

      <p className="text-black/85 leading-relaxed mt-5">{film.blurb}</p>
    </section>
  );
}

function YouTubePlaceholder({ label }: { label: string }) {
  return (
    <div className="aspect-video w-full bg-black/5 border border-black/15 rounded-sm flex items-center justify-center text-xs uppercase tracking-widest text-black/40">
      {label}
    </div>
  );
}
