// Define product interface
export interface Product {
  id: string;
  name: string;
  collection: string;
  price: string;
  description: string;
  imageUrl: string;
  slug: string;
  measurements?: string;
  sold?: boolean;
}

// Define collections
export const collections = [
  'CAVE',
  'DEFFECTS',
  'VOID',
  'TRANSMITTERS',
  'BASED',
  'POINTS',
  'DREAM ENGINE'
];

// Create product data
export const products: Product[] = [
  // CAVE Collection
  {
    id: 'cave-0',
    name: 'CAVE ZERO',
    collection: 'CAVE',
    price: '450,00 € (unframed)',
    description: 'MIXED TECHNIC',
    // 'CAVE ZERO explores the depths of perception and the origins of consciousness through cavernous forms and textures.',
    imageUrl: '/images/store/copy/cave0.webp',
    slug: 'cave-0',
    measurements: '100 x 200 cm'
  },
  {
    id: 'cave-1',
    name: 'CAVE ONE',
    collection: 'CAVE',
    price: '450,00 € (unframed)',
    description: 'MIXED TECHNIC',
    // 'CAVE ONE delves deeper into the metaphorical caverns of the mind, revealing hidden structures and patterns.',
    imageUrl: '/images/store/copy/cave1.webp',
    slug: 'cave-1',
    measurements: '100 x 200 cm'
  },
  {
    id: 'cave-2',
    name: 'CAVE TWO',
    collection: 'CAVE',
    price: '450,00 € (unframed)',
    description: 'MIXED TECHNIC',
    // 'CAVE TWO completes the journey through the subterranean landscape of consciousness, emerging into new understanding.',
    imageUrl: '/images/store/copy/cave2.webp',
    slug: 'cave-2',
    measurements: '100 x 200 cm'
  },
  {
    id: 'cave-3',
    name: 'CAVE THREE',
    collection: 'CAVE',
    price: '450,00 € (unframed)',
    description: 'MIXED TECHNIC',
    // 'CAVE THREE represents the culmination of the cave exploration series, revealing the deepest insights from within the metaphorical cavern.',
    imageUrl: '/images/store/copy/cave3.webp',
    slug: 'cave-3',
    measurements: '100 x 200 cm',
    sold: true
  },
  
  // DEFFECTS Collection
  {
    id: 'carbon',
    name: 'CARBON',
    collection: 'DEFFECTS',
    price: '1.000,00 €',
    description: 'MIXED TECHNIC',
    // 'An exploration of material and form, CARBON represents the fundamental building blocks of life.',
    imageUrl: '/images/store/copy/carbon.webp',
    slug: 'carbon',
    measurements: '100 x 150 cm',
    sold: true
  },
  {
    id: 'silicon',
    name: 'SILICON',
    collection: 'DEFFECTS',
    price: '1.400,00 €',
    description: 'MIXED TECHNIC',
    // 'A stunning piece from the DEFFECTS collection that explores the intersection of technology and art.',
    imageUrl: '/images/store/copy/silicon.webp',
    slug: 'silicon',
    measurements: '150 x 200 cm'
  },
  {
    id: 'substrat',
    name: 'SUBSTRAT',
    collection: 'DEFFECTS',
    price: '1.000,00 €',
    description: 'MIXED TECHNIC',
    // 'SUBSTRAT explores the foundational layers beneath perception, revealing the hidden structures that support our reality.',
    imageUrl: '/images/store/copy/substrat.webp',
    slug: 'substrat',
    measurements: '100 x 150 cm'
  },
  
  // VOID Collection
  {
    id: 'void-0',
    name: 'VOID ZERO',
    collection: 'VOID',
    price: '650,00 €',
    description: 'MIXED TECHNIC',
    // 'The first in the VOID series, exploring the concept of nothingness as a starting point.',
    imageUrl: '/images/store/copy/void0.webp',
    slug: 'void-0',
    measurements: '80 x 120 cm'
  },
  {
    id: 'void-1',
    name: 'VOID ONE',
    collection: 'VOID',
    price: '650,00 €',
    description: 'MIXED TECHNIC',
    // 'The second piece in the VOID series, examining the emergence of form from emptiness.',
    imageUrl: '/images/store/copy/void1.webp',
    slug: 'void-1',
    measurements: '80 x 120 cm'
  },
  {
    id: 'void-2',
    name: 'VOID TWO',
    collection: 'VOID',
    price: '650,00 €',
    description: 'MIXED TECHNIC',
    // 'Continuing the VOID series, this piece explores the duality between presence and absence.',
    imageUrl: '/images/store/copy/void2.webp',
    slug: 'void-2',
    measurements: '80 x 120 cm'
  },
  {
    id: 'void-4',
    name: 'VOID FOUR',
    collection: 'VOID',
    price: '650,00 €',
    description: 'MIXED TECHNIC',
    // 'The fourth installment in the VOID series, delving deeper into the concept of negative space.',
    imageUrl: '/images/store/copy/void4.webp',
    slug: 'void-4',
    measurements: '80 x 120 cm',
    sold: true
  },
  
  // TRANSMITTERS Collection
  {
    id: 'acetilcolina',
    name: 'ACETILCOLINA',
    collection: 'TRANSMITTERS',
    price: '550,00 €',
    description: 'MIXED TECHNIC',
    imageUrl: '/images/store/copy/acetilcolina.webp',
    slug: 'acetilcolina',
    measurements: '50 x 70 cm',
    sold: true
  },
  {
    id: 'serotonina',
    name: 'SEROTONINA',
    collection: 'TRANSMITTERS',
    price: '550,00 €',
    description: 'MIXED TECHNIC',
    // 'SEROTONINA visualiza a base neuroquímica do bem-estar e contentamento.',
    imageUrl: '/images/store/copy/serotonina.webp',
    slug: 'serotonina',
    measurements: '50 x 70 cm'
  },
  {
    id: 'oxitocina',
    name: 'OXITOCINA',
    collection: 'TRANSMITTERS',
    price: '550,00 €',
    description: 'MIXED TECHNIC',
    // 'Nomeada após o hormônio de ligação, OXITOCINA explora a conexão humana e intimidade.',
    imageUrl: '/images/store/copy/oxitocina.webp',
    slug: 'oxitocina',
    measurements: '50 x 70 cm',
    sold: true
  },
  {
    id: 'dopamina',
    name: 'DOPAMINA',
    collection: 'TRANSMITTERS',
    price: '550,00 €',
    description: 'MIXED TECHNIC',
    // 'DOPAMINA explora as fundações neurológicas do prazer e recompensa.',
    imageUrl: '/images/store/copy/dopamina.webp',
    slug: 'dopamina',
    measurements: '50 x 70 cm',
    sold: true
  },
  {
    id: 'glutamato',
    name: 'GLUTAMATO',
    collection: 'TRANSMITTERS',
    price: '550,00 €',
    description: 'MIXED TECHNIC',
    // 'Inspirado pelo principal neurotransmissor excitatório do cérebro, GLUTAMATO representa a atividade neural e o pensamento.',
    imageUrl: '/images/store/copy/glutamato.webp',
    slug: 'glutamato',
    measurements: '50 x 70 cm'
  },
  {
    id: 'adrenalina',
    name: 'ADRENALINA',
    collection: 'TRANSMITTERS',
    price: '550,00 €',
    description: 'MIXED TECHNIC',
    // 'Uma peça dinâmica que captura a essência da excitação, medo e resposta rápida.',
    imageUrl: '/images/store/copy/adrenalina.webp',
    slug: 'adrenalina',
    measurements: '50 x 70 cm',
    sold: true
  },
  {
    id: 'noradrenalina',
    name: 'NORADRENALINA',
    collection: 'TRANSMITTERS',
    price: '550,00 €',
    description: 'MIXED TECHNIC',
    imageUrl: '/images/store/copy/noradrenalina.webp',
    slug: 'noradrenalina',
    measurements: '50 x 70 cm'
  },
  {
    id: 'gaba',
    name: 'GABA',
    collection: 'TRANSMITTERS',
    price: '550,00 €',
    description: 'MIXED TECHNIC',
    imageUrl: '/images/store/copy/gaba.webp',
    slug: 'gaba',
    measurements: '50 x 70 cm',
    sold: true
  },
  
  // BASED Collection
  {
    id: 'head',
    name: 'HEAD',
    collection: 'BASED',
    price: '200,00 €',
    description: 'MIXED TECHNIC',
    // 'HEAD examines the relationship between consciousness and physical form.',
    imageUrl: '/images/store/copy/head.webp',
    slug: 'head',
    measurements: '30 x 50 cm'
  },
  {
    id: 'hash',
    name: '#',
    collection: 'BASED',
    price: '200,00 €',
    description: 'MIXED TECHNIC',
    // 'A commentary on digital identity and the symbolic language of the internet age.',
    imageUrl: '/images/store/copy/hash.webp',
    slug: 'hash',
    measurements: '30 x 50 cm'
  },
  {
    id: 'source',
    name: 'SOURCE',
    collection: 'BASED',
    price: '200,00 €',
    description: 'MIXED TECHNIC',
    // 'SOURCE explores origins, beginnings, and the concept of fundamental truth.',
    imageUrl: '/images/store/copy/source.webp',
    slug: 'source',
    measurements: '30 x 50 cm'
  },
  {
    id: 'm',
    name: 'M',
    collection: 'BASED',
    price: '200,00 €',
    description: 'MIXED TECHNIC',
    // 'M investigates language, symbolism, and the abstraction of meaning.',
    imageUrl: '/images/store/copy/m.webp',
    slug: 'm',
    measurements: '30 x 50 cm',
    sold: true
  },
  {
    id: 'compress',
    name: 'COMPRESS',
    collection: 'SINGLE WORKS',
    price: '200,00 €',
    description: 'MIXED TECHNIC',
    // 'COMPRESS examines information density and the compression of meaning into minimal form.',
    imageUrl: '/images/store/copy/compress.webp',
    slug: 'compress',
    measurements: '100 x 150 cm',
    sold: true
  },
  
  // POINTS Collection
  {
    id: 'point-1',
    name: 'POINT III',
    collection: 'POINTS',
    price: '200,00 €',
    description: 'MIXED TECHNIC',
    // 'The first in the POINTS series, exploring minimalism and focused attention.',
    imageUrl: '/images/store/copy/point1.webp',
    slug: 'point-1',
    measurements: '30 x 30 cm'
  },
  {
    id: 'point-2',
    name: 'POINT IX',
    collection: 'POINTS',
    price: '600,00 €',
    description: 'MIXED TECHNIC',
    // 'Continuing the exploration of singular focus and clarity.',
    imageUrl: '/images/store/copy/point2.webp',
    slug: 'point-2',
    measurements: '30 x 30 cm'
  },
  {
    id: 'point-3',
    name: 'POINT III',
    collection: 'POINTS',
    price: '350,00 €',
    description: 'MIXED TECHNIC',
    // 'The third meditation on simplicity and essence.',
    imageUrl: '/images/store/copy/point3.webp',
    slug: 'point-3',
    measurements: '70 x 70 cm'
  },
  
  // DREAM ENGINE Collection
  {
    id: 'dream-engine-0',
    name: 'DREAM ENGINE ZERO',
    collection: 'DREAM ENGINE',
    price: '350,00 €',
    description: 'MIXED TECHNIC',
    // 'The foundational piece in the DREAM ENGINE series, representing the genesis of dream consciousness.',
    imageUrl: '/images/store/copy/dream-engine-0.webp',
    slug: 'dream-engine-0',
    measurements: '70 x 90 cm'
  },
  {
    id: 'dream-engine-1',
    name: 'DREAM ENGINE I',
    collection: 'DREAM ENGINE',
    price: '350,00 €',
    description: 'MIXED TECHNIC',
    // 'The first piece in the DREAM ENGINE series, exploring the machinery of subconscious thought.',
    imageUrl: '/images/store/copy/dream-engine-1.webp',
    slug: 'dream-engine-1',
    measurements: '70 x 90 cm'
  },
  {
    id: 'dream-engine-2',
    name: 'DREAM ENGINE II',
    collection: 'DREAM ENGINE',
    price: '350,00 €',
    description: 'MIXED TECHNIC',
    // 'Continuing the exploration of dream states and mental processes.',
    imageUrl: '/images/store/copy/dream-engine-2.webp',
    slug: 'dream-engine-2',
    measurements: '70 x 90 cm',
    sold: true
  },
  {
    id: 'dream-engine-3',
    name: 'DREAM ENGINE III',
    collection: 'DREAM ENGINE',
    price: '350,00 €',
    description: 'MIXED TECHNIC',
    // 'The fourth installment in the DREAM ENGINE series, delving deeper into the architecture of dreams.',
    imageUrl: '/images/store/copy/dream-engine-3.webp',
    slug: 'dream-engine-3',
    measurements: '70 x 90 cm'
  },

  // SINGLE WORKS Collection
  {
    id: 'aliados',
    name: 'ALIADOS',
    collection: 'SINGLE WORKS',
    price: '750,00 €',
    description: 'MIXED TECHNIC',
    imageUrl: '/images/store/copy/aliados.webp',
    slug: 'aliados',
    measurements: '80 x 120 cm'
  },
  {
    id: 'colordiptic',
    name: 'COLOR DIPTIC',
    collection: 'SINGLE WORKS',
    price: '750,00 €',
    description: 'MIXED TECHNIC',
    imageUrl: '/images/store/copy/colordiptic.webp',
    slug: 'colordiptic',
    measurements: '30 x 90 cm'
  },
  {
    id: 'dual',
    name: 'DUAL',
    collection: 'SINGLE WORKS',
    price: '750,00 €',
    description: 'MIXED TECHNIC',
    imageUrl: '/images/store/copy/dual.webp',
    slug: 'dual',
    measurements: '130 x 150 cm'
  },
  {
    id: 'part3',
    name: 'PART 3',
    collection: 'SINGLE WORKS',
    price: '750,00 €',
    description: 'MIXED TECHNIC',
    imageUrl: '/images/store/copy/part3.webp',
    slug: 'part3',
    measurements: '90 x 90 cm'
  },
  {
    id: 'source2',
    name: 'SOURCE II',
    collection: 'SINGLE WORKS',
    price: '750,00 €',
    description: 'MIXED TECHNIC',
    imageUrl: '/images/store/copy/source2.webp',
    slug: 'source2',
    measurements: '100 x 150 cm'
  },
  {
    id: 'tablehead',
    name: 'TABLE HEAD',
    collection: 'SINGLE WORKS',
    price: '900,00 €',
    description: 'MIXED TECHNIC',
    imageUrl: '/images/store/copy/tablehead.webp',
    slug: 'tablehead',
    measurements: '150 x 180 cm'
  },
  {
    id: 'fam',
    name: 'FAM',
    collection: 'SINGLE WORKS',
    price: '750,00 €',
    description: 'MIXED TECHNIC',
    imageUrl: '/images/store/copy/fam.webp',
    slug: 'fam',
    measurements: '80 x 155 cm',
    sold: true
  },
  // End of DREAM ENGINE Collection
];

// Helper function to get products by collection
export const getProductsByCollection = (collectionName: string): Product[] => {
  return products.filter(product => product.collection === collectionName);
};

// Helper function to get a product by slug
export const getProductBySlug = (slug: string): Product | undefined => {
  return products.find(product => product.slug === slug);
};

// Helper function to get a product by ID
export const getProductById = (id: string): Product | undefined => {
  return products.find(product => product.id === id);
};
