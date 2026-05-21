import { getAllNotes, getAllTopics } from '@/lib/garden';
import GardenIndex, { type IndexPlot } from './_GardenIndex';

export default function GardenPage() {
  const notes = getAllNotes();

  const plots: IndexPlot[] = notes.map((n) => ({
    slug: n.slug,
    title: n.title,
    description: n.description ?? '',
    stage: n.stage,
    topics: n.topics,
    planted: n.planted,
    tended: n.tended,
    href: n.href,
    external: n.external,
    order: n.order,
  }));

  return <GardenIndex plots={plots} topics={getAllTopics()} />;
}
