'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import ParticleFlower from '@/components/UI/ParticleFlower';
import { GrowthIcon, type GrowthStage } from '@/components/UI/GrowthIcons';

type Plot = {
  slug: string;
  title: string;
  blurb: string;
  stage: GrowthStage;
  topics: string[];
  href?: string;
  external?: boolean;
  planted?: string;
  tended?: string;
};

const STAGE_META: Record<GrowthStage, { label: string; note: string }> = {
  seedling: { label: 'Seedling', note: 'just sprouting — rough, in-progress, half an idea' },
  budding: { label: 'Budding', note: 'taking shape — actively tended, growing' },
  evergreen: { label: 'Evergreen', note: 'matured — shipped, alive on its own' },
};

const PLOTS: Plot[] = [
  {
    slug: 'nfts-ai',
    title: 'NFTs & Digital Art Leveraged by AI',
    blurb:
      'An interactive, gamified museum app to display digital art and NFTs. Reach out to have your own.',
    stage: 'evergreen',
    topics: ['Art', 'AI'],
    href: 'https://influc.my.canva.site/mfg',
    external: true,
    tended: '2024',
  },
  {
    slug: 'blend',
    title: 'BLEND by KaleidoKonscious',
    blurb:
      'An interactive book of poems with AI-generated art and media. A book that listens back.',
    stage: 'evergreen',
    topics: ['Words', 'AI'],
    href: 'https://miguelmalungo.github.io/kept/',
    external: true,
    tended: '2024',
  },
  {
    slug: 'blocks',
    title: 'BLOCKS',
    blurb: 'An interactive poetry book — small typographic worlds you can move through.',
    stage: 'evergreen',
    topics: ['Words', 'Code'],
    href: 'https://6945a2ad1ceae80c24d7e1cf--lovely-pegasus-e9f6e6.netlify.app/',
    external: true,
    tended: '2024',
  },
  {
    slug: 'life-on-the-road',
    title: 'Life on the Road',
    blurb:
      'Converting a truck into a home on wheels — the next chapter. The bus that came before is a chapter inside.',
    stage: 'budding',
    topics: ['Travel', 'Life'],
    href: '/garden/life-on-the-road',
    planted: '2026',
    tended: '2026',
  },
  {
    slug: 'films',
    title: "Plato's Cat & other films",
    blurb:
      'An AI-assisted film in the making, plus films I have already put out. A small theatre.',
    stage: 'seedling',
    topics: ['Film', 'AI'],
    href: '/garden/films',
    planted: '2026',
  },
  {
    slug: 'photography',
    title: 'Photography',
    blurb:
      'Frames I have not yet sorted. A gallery is being tended — for now, this plot is the placeholder.',
    stage: 'budding',
    topics: ['Photography'],
    tended: '2026',
  },
  {
    slug: 'capoeira',
    title: 'Capoeira',
    blurb:
      'Used to be the job. Now it is the practice — ginga, rhythm, the long memory of the body.',
    stage: 'seedling',
    topics: ['Movement', 'Practice'],
    tended: '2026',
  },
  {
    slug: 'surfing',
    title: 'Surfing',
    blurb: 'Listening to the ocean and being humbled, often. A practice in patience.',
    stage: 'seedling',
    topics: ['Movement', 'Practice'],
    tended: '2026',
  },
];

const TOPICS = Array.from(new Set(PLOTS.flatMap((p) => p.topics))).sort();
const STAGES: Array<GrowthStage | 'all'> = ['all', 'seedling', 'budding', 'evergreen'];

export default function GardenPage() {
  const [topic, setTopic] = useState<string>('all');
  const [stage, setStage] = useState<GrowthStage | 'all'>('all');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const filtered = useMemo(
    () =>
      PLOTS.filter((p) => (topic === 'all' ? true : p.topics.includes(topic))).filter((p) =>
        stage === 'all' ? true : p.stage === stage,
      ),
    [topic, stage],
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F0EEE6' }}>
      {/* Hero: left column = description + 3 stage rows. Right column = animation. */}
      <section className="px-6 pt-16 pb-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 items-start">
          <div className="space-y-8">
            <p className="text-2xl font-bold uppercase leading-snug text-black text-justify md:text-left">
              A PLACE FOR THINGS I AM TENDING. SOME ARE MATURE, SOME ARE SPROUTING, SOME ARE
              JUST SEEDS. NOT EVERYTHING HERE IS FINISHED — A GARDEN GETS WATERED, NOT SHIPPED.
            </p>

            <div className="space-y-6 border-t border-black/15 pt-8">
              {(['seedling', 'budding', 'evergreen'] as GrowthStage[]).map((s) => (
                <div key={s} className="flex items-start gap-4">
                  <GrowthIcon stage={s} size={32} className="shrink-0 mt-1 text-black" />
                  <div>
                    <div className="font-bold uppercase tracking-wide text-xl md:text-2xl">
                      {STAGE_META[s].label}
                    </div>
                    <div className="text-black/70 leading-snug text-lg md:text-xl">
                      {STAGE_META[s].note}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {isMounted && (
            <div className="hidden md:block w-full aspect-square max-h-[520px] mx-auto md:sticky md:top-24">
              <ParticleFlower />
            </div>
          )}
        </div>
      </section>

      {/* Filters */}
      <section className="px-6 pt-10">
        <div className="max-w-5xl mx-auto space-y-4">
          <FilterRow
            label="Stage"
            value={stage}
            options={STAGES.map((s) => ({
              value: s,
              label: s === 'all' ? 'All' : STAGE_META[s].label,
            }))}
            onChange={(v) => setStage(v as GrowthStage | 'all')}
          />
          <FilterRow
            label="Topic"
            value={topic}
            options={[
              { value: 'all', label: 'All' },
              ...TOPICS.map((t) => ({ value: t, label: t })),
            ]}
            onChange={setTopic}
          />
        </div>
      </section>

      {/* Plots */}
      <section className="px-6 pt-8 pb-12">
        <div className="max-w-5xl mx-auto divide-y divide-black/15">
          {filtered.map((p) => (
            <PlotRow key={p.slug} plot={p} />
          ))}
          {filtered.length === 0 && (
            <p className="py-12 text-center text-black/60 italic">
              Nothing growing here yet — try another filter.
            </p>
          )}
        </div>
      </section>

      {/* Mobile-only animation, sits before the footer */}
      {isMounted && (
        <section className="md:hidden px-6 pb-16">
          <div className="max-w-5xl mx-auto">
            <div className="w-full aspect-square max-h-[520px] mx-auto">
              <ParticleFlower />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function FilterRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="text-xs uppercase tracking-widest text-black/60 font-bold w-16">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              onClick={() => onChange(o.value)}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                active
                  ? 'bg-black text-white border-black'
                  : 'bg-transparent text-black border-black/30 hover:border-black'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PlotRow({ plot }: { plot: Plot }) {
  const meta = STAGE_META[plot.stage];

  const TitleEl = () => (
    <h2 className="text-2xl md:text-3xl font-bold mb-3 text-black inline-flex items-baseline gap-2">
      <span>{plot.title}</span>
      {plot.href &&
        (plot.external ? (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="translate-y-0.5"
            aria-hidden
          >
            <line x1="7" y1="17" x2="17" y2="7" />
            <polyline points="9 7 17 7 17 15" />
          </svg>
        ) : (
          <span className="text-xl translate-y-0.5">→</span>
        ))}
    </h2>
  );

  const inner = (
    <div className="py-8 group">
      <div className="flex items-center justify-between mb-3 text-xs uppercase tracking-widest">
        <span className="flex items-center gap-2">
          <GrowthIcon stage={plot.stage} size={18} className="text-black" />
          <span className="font-bold">{meta.label}</span>
        </span>
        <span className="flex flex-wrap gap-2 justify-end">
          {plot.topics.map((t) => (
            <span key={t} className="text-black/60">
              {t}
            </span>
          ))}
        </span>
      </div>

      {plot.href ? (
        <span className="group-hover:opacity-70 transition-opacity">
          <TitleEl />
        </span>
      ) : (
        <TitleEl />
      )}

      <p className="text-lg md:text-xl text-black/85 leading-relaxed max-w-2xl">{plot.blurb}</p>

      {(plot.planted || plot.tended) && (
        <p className="mt-4 text-xs uppercase tracking-widest text-black/50">
          {plot.planted && <>Planted {plot.planted}</>}
          {plot.planted && plot.tended && plot.planted !== plot.tended && <> · </>}
          {plot.tended && plot.tended !== plot.planted && <>Tended {plot.tended}</>}
          {plot.external && <> · External</>}
        </p>
      )}
    </div>
  );

  if (!plot.href) return inner;
  if (plot.external) {
    return (
      <a
        href={plot.href}
        target="_blank"
        rel="noopener noreferrer"
        className="block cursor-pointer"
      >
        {inner}
      </a>
    );
  }
  return (
    <Link href={plot.href} className="block cursor-pointer">
      {inner}
    </Link>
  );
}
