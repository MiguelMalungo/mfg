// Define product interface
export interface Product {
  id: string;
  name: string;
  collection: string;
  price: string;
  description: string;
  imageUrl: string;
  slug: string;
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
    imageUrl: '/images/cave0.JPG',
    slug: 'cave-0'
  },
  {
    id: 'cave-1',
    name: 'CAVE ONE',
    collection: 'CAVE',
    price: '450,00 € (unframed)',
    description: 'MIXED TECHNIC',
    // 'CAVE ONE delves deeper into the metaphorical caverns of the mind, revealing hidden structures and patterns.',
    imageUrl: '/images/cave1.JPG',
    slug: 'cave-1'
  },
  {
    id: 'cave-2',
    name: 'CAVE TWO',
    collection: 'CAVE',
    price: '450,00 € (unframed)',
    description: 'MIXED TECHNIC',
    // 'CAVE TWO completes the journey through the subterranean landscape of consciousness, emerging into new understanding.',
    imageUrl: '/images/cave2.JPG',
    slug: 'cave-2'
  },
  {
    id: 'cave-3',
    name: 'CAVE THREE',
    collection: 'CAVE',
    price: '450,00 € (unframed)',
    description: 'MIXED TECHNIC',
    // 'CAVE THREE represents the culmination of the cave exploration series, revealing the deepest insights from within the metaphorical cavern.',
    imageUrl: '/images/cave3.JPG',
    slug: 'cave-3',
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
    imageUrl: '/images/carbon.JPG',
    slug: 'carbon',
    sold: true
  },
  {
    id: 'silicon',
    name: 'SILICON',
    collection: 'DEFFECTS',
    price: '1.400,00 €',
    description: 'MIXED TECHNIC',
    // 'A stunning piece from the DEFFECTS collection that explores the intersection of technology and art.',
    imageUrl: '/images/silicon.JPG',
    slug: 'silicon'
  },
  {
    id: 'substrat',
    name: 'SUBSTRAT',
    collection: 'DEFFECTS',
    price: '1.000,00 €',
    description: 'MIXED TECHNIC',
    // 'SUBSTRAT explores the foundational layers beneath perception, revealing the hidden structures that support our reality.',
    imageUrl: '/images/substract.JPG',
    slug: 'substrat'
  },
  
  // VOID Collection
  {
    id: 'void-0',
    name: 'VOID ZERO',
    collection: 'VOID',
    price: '650,00 €',
    description: 'MIXED TECHNIC',
    // 'The first in the VOID series, exploring the concept of nothingness as a starting point.',
    imageUrl: '/images/void0.jpg',
    slug: 'void-0'
  },
  {
    id: 'void-1',
    name: 'VOID ONE',
    collection: 'VOID',
    price: '650,00 €',
    description: 'MIXED TECHNIC',
    // 'The second piece in the VOID series, examining the emergence of form from emptiness.',
    imageUrl: '/images/void1.jpg',
    slug: 'void-1'
  },
  {
    id: 'void-2',
    name: 'VOID TWO',
    collection: 'VOID',
    price: '650,00 €',
    description: 'MIXED TECHNIC',
    // 'Continuing the VOID series, this piece explores the duality between presence and absence.',
    imageUrl: '/images/void2.jpg',
    slug: 'void-2'
  },
  {
    id: 'void-4',
    name: 'VOID FOUR',
    collection: 'VOID',
    price: '650,00 €',
    description: 'MIXED TECHNIC',
    // 'The fourth installment in the VOID series, delving deeper into the concept of negative space.',
    imageUrl: '/images/void4.jpg',
    slug: 'void-4',
    sold: true
  },
  
  // TRANSMITTERS Collection
  {
    id: 'acetilcolina',
    name: 'ACETILCOLINA',
    collection: 'TRANSMITTERS',
    price: '550,00 €',
    description: 'MIXED TECHNIC',
    imageUrl: '/images/acetilcolina.JPG',
    slug: 'acetilcolina'
  },
  {
    id: 'serotonina',
    name: 'SEROTONINA',
    collection: 'TRANSMITTERS',
    price: '550,00 €',
    description: 'MIXED TECHNIC',
    // 'SEROTONINA visualiza a base neuroquímica do bem-estar e contentamento.',
    imageUrl: '/images/serotonina.jpg',
    slug: 'serotonina'
  },
  {
    id: 'oxitocina',
    name: 'OXITOCINA',
    collection: 'TRANSMITTERS',
    price: '550,00 €',
    description: 'MIXED TECHNIC',
    // 'Nomeada após o hormônio de ligação, OXITOCINA explora a conexão humana e intimidade.',
    imageUrl: '/images/oxitocina.jpg',
    slug: 'oxitocina',
    sold: true
  },
  {
    id: 'dopamina',
    name: 'DOPAMINA',
    collection: 'TRANSMITTERS',
    price: '550,00 €',
    description: 'MIXED TECHNIC',
    // 'DOPAMINA explora as fundações neurológicas do prazer e recompensa.',
    imageUrl: '/images/dopamina.jpg',
    slug: 'dopamina',
    sold: true
  },
  {
    id: 'glutamato',
    name: 'GLUTAMATO',
    collection: 'TRANSMITTERS',
    price: '550,00 €',
    description: 'MIXED TECHNIC',
    // 'Inspirado pelo principal neurotransmissor excitatório do cérebro, GLUTAMATO representa a atividade neural e o pensamento.',
    imageUrl: '/images/gaba.JPG',
    slug: 'glutamato',
    sold: true
  },
  {
    id: 'adrenalina',
    name: 'ADRENALINA',
    collection: 'TRANSMITTERS',
    price: '550,00 €',
    description: 'MIXED TECHNIC',
    // 'Uma peça dinâmica que captura a essência da excitação, medo e resposta rápida.',
    imageUrl: '/images/adrenalina.jpg',
    slug: 'adrenalina',
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
    imageUrl: '/images/based0.JPG',
    slug: 'head'
  },
  {
    id: 'hash',
    name: '#',
    collection: 'BASED',
    price: '200,00 €',
    description: 'MIXED TECHNIC',
    // 'A commentary on digital identity and the symbolic language of the internet age.',
    imageUrl: '/images/based1.JPG',
    slug: 'hash'
  },
  {
    id: 'source',
    name: 'SOURCE',
    collection: 'BASED',
    price: '200,00 €',
    description: 'MIXED TECHNIC',
    // 'SOURCE explores origins, beginnings, and the concept of fundamental truth.',
    imageUrl: '/images/based2.JPG',
    slug: 'source'
  },
  {
    id: 'm',
    name: 'M',
    collection: 'BASED',
    price: '200,00 €',
    description: 'MIXED TECHNIC',
    // 'M investigates language, symbolism, and the abstraction of meaning.',
    imageUrl: '/images/based3.JPG',
    slug: 'm',
    sold: true
  },
  {
    id: 'compress',
    name: 'COMPRESS',
    collection: 'SINGLE WORKS',
    price: '200,00 €',
    description: 'MIXED TECHNIC',
    // 'COMPRESS examines information density and the compression of meaning into minimal form.',
    imageUrl: '/images/source.JPG',
    slug: 'compress',
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
    imageUrl: '/images/point4.JPG',
    slug: 'point-1'
  },
  {
    id: 'point-2',
    name: 'POINT IX',
    collection: 'POINTS',
    price: '600,00 €',
    description: 'MIXED TECHNIC',
    // 'Continuing the exploration of singular focus and clarity.',
    imageUrl: '/images/point9.JPG',
    slug: 'point-2'
  },
  {
    id: 'point-3',
    name: 'POINT III',
    collection: 'POINTS',
    price: '350,00 €',
    description: 'MIXED TECHNIC',
    // 'The third meditation on simplicity and essence.',
    imageUrl: '/images/circle.JPG',
    slug: 'point-3'
  },
  
  // DREAM ENGINE Collection
  {
    id: 'dream-engine-0',
    name: 'DREAM ENGINE ZERO',
    collection: 'DREAM ENGINE',
    price: '350,00 €',
    description: 'MIXED TECHNIC',
    // 'The foundational piece in the DREAM ENGINE series, representing the genesis of dream consciousness.',
    imageUrl: '/images/dreamengine0.JPG',
    slug: 'dream-engine-0'
  },
  {
    id: 'dream-engine-1',
    name: 'DREAM ENGINE I',
    collection: 'DREAM ENGINE',
    price: '350,00 €',
    description: 'MIXED TECHNIC',
    // 'The first piece in the DREAM ENGINE series, exploring the machinery of subconscious thought.',
    imageUrl: '/images/dreamengine1.JPG',
    slug: 'dream-engine-1'
  },
  {
    id: 'dream-engine-2',
    name: 'DREAM ENGINE II',
    collection: 'DREAM ENGINE',
    price: '350,00 €',
    description: 'MIXED TECHNIC',
    // 'Continuing the exploration of dream states and mental processes.',
    imageUrl: '/images/dreamengine2.JPG',
    slug: 'dream-engine-2',
    sold: true
  },
  {
    id: 'dream-engine-3',
    name: 'DREAM ENGINE III',
    collection: 'DREAM ENGINE',
    price: '350,00 €',
    description: 'MIXED TECHNIC',
    // 'The fourth installment in the DREAM ENGINE series, delving deeper into the architecture of dreams.',
    imageUrl: '/images/dreamengine3.JPG',
    slug: 'dream-engine-3'
  },

  // SINGLE WORKS Collection
  {
    id: 'aliados',
    name: 'ALIADOS',
    collection: 'SINGLE WORKS',
    price: '750,00 €',
    description: 'MIXED TECHNIC',
    imageUrl: '/images/aliados.JPG',
    slug: 'aliados'
  },
  {
    id: 'colordiptic',
    name: 'COLOR DIPTIC',
    collection: 'SINGLE WORKS',
    price: '750,00 €',
    description: 'MIXED TECHNIC',
    imageUrl: '/images/colordiptic.JPG',
    slug: 'colordiptic'
  },
  {
    id: 'dual',
    name: 'DUAL',
    collection: 'SINGLE WORKS',
    price: '750,00 €',
    description: 'MIXED TECHNIC',
    imageUrl: '/images/dual.jpg',
    slug: 'dual'
  },
  {
    id: 'part3',
    name: 'PART 3',
    collection: 'SINGLE WORKS',
    price: '750,00 €',
    description: 'MIXED TECHNIC',
    imageUrl: '/images/part3.JPG',
    slug: 'part3'
  },
  {
    id: 'source2',
    name: 'SOURCE II',
    collection: 'SINGLE WORKS',
    price: '750,00 €',
    description: 'MIXED TECHNIC',
    imageUrl: '/images/source2.JPG',
    slug: 'source2'
  },
  {
    id: 'tablehead',
    name: 'TABLE HEAD',
    collection: 'SINGLE WORKS',
    price: '900,00 €',
    description: 'MIXED TECHNIC',
    imageUrl: '/images/tablehead.JPG',
    slug: 'tablehead'
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
