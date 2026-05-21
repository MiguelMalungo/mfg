import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getAllSlugs, getNote, getBacklinks } from '@/lib/garden';
import { GrowthIcon, type GrowthStage } from '@/components/UI/GrowthIcons';

type Params = Promise<{ slug: string }>;

const STAGE_LABEL: Record<GrowthStage, string> = {
  seedling: 'Seedling',
  budding: 'Budding',
  evergreen: 'Evergreen',
};

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const note = getNote(slug);
  if (!note) return {};
  const title = `${note.title} | Digital Garden | Miguel Ferraz Guedes`;
  const description = note.description ?? note.title;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://miguelfguedes.pt/garden/${note.slug}`,
      type: 'article',
    },
    alternates: {
      canonical: `https://miguelfguedes.pt/garden/${note.slug}`,
    },
  };
}

export default async function NotePage({ params }: { params: Params }) {
  const { slug } = await params;
  const note = getNote(slug);
  if (!note) notFound();

  const backlinks = getBacklinks(note.slug);

  return (
    <div className="min-h-screen py-16 px-6" style={{ backgroundColor: '#F0EEE6' }}>
      <article className="max-w-3xl mx-auto">
        <Link
          href="/garden"
          className="text-xs uppercase tracking-widest font-bold text-black hover:opacity-70"
        >
          ← Back to the Garden
        </Link>

        <header className="mt-6 mb-10">
          <div className="flex items-center gap-3 text-xs uppercase tracking-widest mb-4">
            <GrowthIcon stage={note.stage} size={18} className="text-black" />
            <span className="font-bold">{STAGE_LABEL[note.stage]}</span>
            {note.topics.length > 0 && (
              <span className="text-black/60">· {note.topics.join(' · ')}</span>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-6 text-black bg-[#C8FF00] inline-block px-3 py-1">
            {note.title.toUpperCase()}
          </h1>

          {note.description && (
            <p className="text-2xl md:text-3xl font-bold leading-snug text-black mb-6">
              {note.description}
            </p>
          )}

          {note.href && (
            <a
              href={note.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2 mt-2 rounded-full border border-black text-black font-bold uppercase text-sm tracking-wide hover:bg-black hover:text-white transition-colors"
            >
              Visit site
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <line x1="7" y1="17" x2="17" y2="7" />
                <polyline points="9 7 17 7 17 15" />
              </svg>
            </a>
          )}

          {(note.planted || note.tended) && (
            <p className="mt-4 text-xs uppercase tracking-widest text-black/50">
              {note.planted && <>Planted {note.planted}</>}
              {note.planted && note.tended && note.planted !== note.tended && <> · </>}
              {note.tended && note.tended !== note.planted && <>Tended {note.tended}</>}
            </p>
          )}
        </header>

        <div
          className="prose prose-lg max-w-none text-black garden-prose"
          dangerouslySetInnerHTML={{ __html: note.html }}
        />

        {backlinks.length > 0 && (
          <section className="mt-16 pt-8 border-t border-black/15">
            <div className="text-xs uppercase tracking-widest text-black/60 font-bold mb-4">
              Referenced by
            </div>
            <ul className="space-y-3">
              {backlinks.map((b) => (
                <li key={b.slug}>
                  <Link
                    href={`/garden/${b.slug}`}
                    className="group inline-flex items-baseline gap-2 hover:opacity-70 transition-opacity"
                  >
                    <GrowthIcon
                      stage={b.stage}
                      size={14}
                      className="text-black self-center"
                    />
                    <span className="font-bold text-lg md:text-xl text-black">{b.title}</span>
                    {b.description && (
                      <span className="text-black/60 text-base">— {b.description}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-16 pt-8 border-t border-black/15 flex items-center justify-between text-sm">
          <Link
            href="/garden"
            className="uppercase tracking-widest font-bold hover:opacity-70"
          >
            ← Garden
          </Link>
          <span className="text-black/60 italic">Tended slowly.</span>
        </div>
      </article>
    </div>
  );
}
