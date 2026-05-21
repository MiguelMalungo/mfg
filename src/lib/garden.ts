import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { unified, type Plugin } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { visit } from 'unist-util-visit';
import type { Root, Text } from 'mdast';
import type { Root as HastRoot, Element as HastElement, Text as HastText } from 'hast';

export type GrowthStage = 'seedling' | 'budding' | 'evergreen';

export type NoteFrontmatter = {
  title: string;
  stage: GrowthStage;
  topics: string[];
  description?: string;
  planted?: string;
  tended?: string;
  href?: string;
  external?: boolean;
  order?: number; // lower = appears first; overrides stage sort
};

export type Note = NoteFrontmatter & {
  slug: string;
  body: string; // raw markdown
};

export type NoteWithHtml = Note & {
  html: string;
  outgoing: string[]; // slugs this note links to
};

const CONTENT_DIR = path.join(process.cwd(), 'content', 'garden');

const WIKI_LINK_RE = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g;

// Custom remark plugin: turn [[slug]] and [[slug|Custom text]] text nodes into <a> links.
const remarkWikiLinks: Plugin<[], Root> = () => (tree) => {
  visit(tree, 'text', (node: Text, index, parent) => {
    if (!parent || typeof index !== 'number') return;
    const value = node.value;
    if (!value.includes('[[')) return;

    const newChildren: Root['children'] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    WIKI_LINK_RE.lastIndex = 0;

    while ((match = WIKI_LINK_RE.exec(value)) !== null) {
      const [full, slug, label] = match;
      if (match.index > lastIndex) {
        newChildren.push({ type: 'text', value: value.slice(lastIndex, match.index) } as Text);
      }
      newChildren.push({
        type: 'link',
        url: `/garden/${slug.trim()}`,
        children: [{ type: 'text', value: (label ?? slug).trim() }],
        data: { hProperties: { className: 'wiki-link' } },
      } as never);
      lastIndex = match.index + full.length;
    }

    if (lastIndex === 0) return;
    if (lastIndex < value.length) {
      newChildren.push({ type: 'text', value: value.slice(lastIndex) } as Text);
    }
    parent.children.splice(index, 1, ...newChildren);
    return index + newChildren.length;
  });
};

// Promote a paragraph containing only an image into a <figure>.
// If the image has a title (markdown: ![alt](src "Caption")), use it as <figcaption>.
const rehypeImageFigures: Plugin<[], HastRoot> = () => (tree) => {
  visit(tree, 'element', (node: HastElement, index, parent) => {
    if (!parent || typeof index !== 'number') return;
    if (node.tagName !== 'p') return;

    const meaningful = node.children.filter(
      (c) => !(c.type === 'text' && /^\s*$/.test((c as HastText).value)),
    );
    if (meaningful.length !== 1) return;
    const img = meaningful[0];
    if (img.type !== 'element' || (img as HastElement).tagName !== 'img') return;

    const imgEl = img as HastElement;
    const title = (imgEl.properties?.title as string | undefined) ?? undefined;

    const figureChildren: HastElement[] = [imgEl];
    if (title) {
      figureChildren.push({
        type: 'element',
        tagName: 'figcaption',
        properties: {},
        children: [{ type: 'text', value: title } as HastText],
      });
    }

    const figure: HastElement = {
      type: 'element',
      tagName: 'figure',
      properties: {},
      children: figureChildren,
    };

    parent.children[index] = figure;
  });
};

// Extract outgoing wiki-link slugs from raw markdown — used to build the backlink graph.
function extractWikiLinkSlugs(body: string): string[] {
  const slugs = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(WIKI_LINK_RE.source, 'g');
  while ((m = re.exec(body)) !== null) {
    slugs.add(m[1].trim());
  }
  return Array.from(slugs);
}

let _cache: NoteWithHtml[] | null = null;

export function getAllNotes(): NoteWithHtml[] {
  if (_cache) return _cache;

  if (!fs.existsSync(CONTENT_DIR)) {
    _cache = [];
    return _cache;
  }

  const filenames = fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith('.md') && !f.startsWith('.'));
  const notes: NoteWithHtml[] = filenames.map((filename) => {
    const slug = filename.replace(/\.md$/, '');
    const raw = fs.readFileSync(path.join(CONTENT_DIR, filename), 'utf8');
    const parsed = matter(raw);
    const fm = parsed.data as Partial<NoteFrontmatter>;

    const note: Note = {
      slug,
      title: fm.title ?? slug,
      stage: (fm.stage as GrowthStage) ?? 'seedling',
      topics: fm.topics ?? [],
      description: fm.description,
      planted: fm.planted ? String(fm.planted) : undefined,
      tended: fm.tended ? String(fm.tended) : undefined,
      href: fm.href,
      external: fm.external,
      order: typeof fm.order === 'number' ? fm.order : undefined,
      body: parsed.content,
    };

    const html = renderMarkdownSync(note.body);
    const outgoing = extractWikiLinkSlugs(note.body);

    return { ...note, html, outgoing };
  });

  _cache = notes;
  return notes;
}

export function getNote(slug: string): NoteWithHtml | null {
  return getAllNotes().find((n) => n.slug === slug) ?? null;
}

export function getBacklinks(slug: string): NoteWithHtml[] {
  return getAllNotes().filter((n) => n.outgoing.includes(slug));
}

export function getAllSlugs(): string[] {
  return getAllNotes().map((n) => n.slug);
}

export function getAllTopics(): string[] {
  const set = new Set<string>();
  for (const n of getAllNotes()) for (const t of n.topics) set.add(t);
  return Array.from(set).sort();
}

function renderMarkdownSync(body: string): string {
  const file = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkWikiLinks)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, { behavior: 'wrap' })
    .use(rehypeImageFigures)
    .use(rehypeStringify)
    .processSync(body);
  return String(file);
}
