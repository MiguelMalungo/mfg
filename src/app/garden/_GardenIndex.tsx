'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import ParticleFlower from '@/components/UI/ParticleFlower';
import { GrowthIcon, type GrowthStage } from '@/components/UI/GrowthIcons';

export type IndexPlot = {
  slug: string;
  title: string;
  description: string;
  stage: GrowthStage;
  topics: string[];
  planted?: string;
  tended?: string;
  href?: string;
  external?: boolean;
};

const STAGE_META: Record<GrowthStage, { label: string; note: string }> = {
  seedling: { label: 'Seedling', note: 'just sprouting — rough, in-progress, half an idea' },
  budding: { label: 'Budding', note: 'taking shape — actively tended, growing' },
  evergreen: { label: 'Evergreen', note: 'matured — shipped, alive on its own' },
};

const STAGES: Array<GrowthStage | 'all'> = ['all', 'seedling', 'budding', 'evergreen'];

const STAGE_ORDER: Record<GrowthStage, number> = {
  evergreen: 0,
  budding: 1,
  seedling: 2,
};

export default function GardenIndex({
  plots,
  topics,
}: {
  plots: IndexPlot[];
  topics: string[];
}) {
  const [topic, setTopic] = useState<string>('all');
  const [stage, setStage] = useState<GrowthStage | 'all'>('all');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const filtered = useMemo(() => {
    const list = plots
      .filter((p) => (topic === 'all' ? true : p.topics.includes(topic)))
      .filter((p) => (stage === 'all' ? true : p.stage === stage));
    return list.sort((a, b) => STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage]);
  }, [plots, topic, stage]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F0EEE6' }}>
      {/* Hero */}
      <section className="px-6 pt-16 pb-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 items-start">
          <div className="space-y-8">
            <p className="text-2xl font-bold uppercase leading-snug text-black text-left">
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
      <section className="px-6 pt-4">
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
              ...topics.map((t) => ({ value: t, label: t })),
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

      {/* Mobile-only animation */}
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

function PlotRow({ plot }: { plot: IndexPlot }) {
  const meta = STAGE_META[plot.stage];

  return (
    <Link href={`/garden/${plot.slug}`} className="block cursor-pointer">
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

        <h2 className="text-2xl md:text-3xl font-bold mb-3 text-black inline-flex items-baseline gap-2 group-hover:opacity-70 transition-opacity">
          <span>{plot.title}</span>
          <span className="text-xl translate-y-0.5">→</span>
        </h2>

        <p className="text-lg md:text-xl text-black/85 leading-relaxed max-w-2xl">
          {plot.description}
        </p>

        {(plot.planted || plot.tended) && (
          <p className="mt-4 text-xs uppercase tracking-widest text-black/50">
            {plot.planted && <>Planted {plot.planted}</>}
            {plot.planted && plot.tended && plot.planted !== plot.tended && <> · </>}
            {plot.tended && plot.tended !== plot.planted && <>Tended {plot.tended}</>}
            {plot.external && <> · External</>}
          </p>
        )}
      </div>
    </Link>
  );
}
