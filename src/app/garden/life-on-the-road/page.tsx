'use client';

import React from 'react';
import Link from 'next/link';
import { GrowthIcon } from '@/components/UI/GrowthIcons';

export default function LifeOnTheRoadPage() {
  return (
    <div className="min-h-screen py-16 px-6" style={{ backgroundColor: '#F0EEE6' }}>
      <div className="max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <Link
          href="/garden"
          className="text-xs uppercase tracking-widest text-black/60 hover:text-black"
        >
          ← Back to the Garden
        </Link>

        {/* Header */}
        <header className="mt-6 mb-12">
          <div className="flex items-center gap-3 text-xs uppercase tracking-widest mb-4">
            <GrowthIcon stage="budding" size={18} className="text-black" />
            <span className="font-bold">Budding</span>
            <span className="text-black/60">· Travel · Life</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-6 text-black bg-white/70 inline-block px-3 py-1">
            LIFE ON THE ROAD
          </h1>
          <p className="text-2xl md:text-3xl font-bold leading-snug text-black">
            A long project told in two chapters. The truck is the home I am building now. The
            bus is the home I built before, and lived in. Same instinct, different vehicle.
          </p>
        </header>

        {/* Chapter index */}
        <nav className="mb-12 text-sm">
          <p className="uppercase tracking-widest text-black/60 mb-3 text-xs font-bold">
            Chapters
          </p>
          <ol className="space-y-1 list-decimal list-inside">
            <li>
              <a href="#truck" className="underline underline-offset-4 hover:opacity-70">
                The Truck — now
              </a>
            </li>
            <li>
              <a href="#bus" className="underline underline-offset-4 hover:opacity-70">
                The Bus — before
              </a>
            </li>
          </ol>
        </nav>

        {/* Chapter 1: The Truck */}
        <section id="truck" className="mb-20 scroll-mt-24">
          <div className="text-xs uppercase tracking-widest text-black/60 mb-2">Chapter 1</div>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">The Truck — now</h2>

          <ImagePlaceholder label="Truck — exterior" />

          <div className="prose prose-lg max-w-none space-y-5 mt-8">
            <p className="text-black leading-relaxed">
              The new vehicle. A truck I am converting into a small house — bed, kitchen, a
              place to work from, water and electricity that behave. The plan is to live in it
              for a while, move slowly, and let the road decide the rest.
            </p>
            <p className="text-black leading-relaxed">
              I will fill this chapter as the build progresses. Sketches, decisions, the bits
              that broke, the bits that worked. For now: framing and insulation.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <ImagePlaceholder label="Interior — work in progress" small />
            <ImagePlaceholder label="A detail" small />
          </div>
        </section>

        {/* Chapter 2: The Bus */}
        <section id="bus" className="mb-20 scroll-mt-24">
          <div className="text-xs uppercase tracking-widest text-black/60 mb-2">Chapter 2</div>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">The Bus — before</h2>

          <ImagePlaceholder label="Bus — the first home on wheels" />

          <div className="prose prose-lg max-w-none space-y-5 mt-8">
            <p className="text-black leading-relaxed">
              Before the truck there was a bus. I converted it and lived in it. It is where the
              taste for this came from — the discovery that a small, well-made space is more
              than enough, and that the view changing is a kind of furniture.
            </p>
            <p className="text-black leading-relaxed">
              This chapter is the archive: the build, the routes, what I learned, what I would
              do differently. (Coming, slowly — I am writing it the way I built it.)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <ImagePlaceholder label="Bus — interior" small />
            <ImagePlaceholder label="Bus — somewhere" small />
          </div>
        </section>

        {/* Footer nav */}
        <div className="pt-8 border-t border-black/15 flex items-center justify-between text-sm">
          <Link
            href="/garden"
            className="uppercase tracking-widest font-bold hover:opacity-70"
          >
            ← Garden
          </Link>
          <span className="text-black/60 italic">Tended slowly.</span>
        </div>
      </div>
    </div>
  );
}

function ImagePlaceholder({ label, small = false }: { label: string; small?: boolean }) {
  return (
    <div
      className={`w-full ${
        small ? 'aspect-[4/3]' : 'aspect-[16/10]'
      } bg-black/5 border border-black/15 rounded-sm flex items-center justify-center text-xs uppercase tracking-widest text-black/40`}
    >
      {label}
    </div>
  );
}
