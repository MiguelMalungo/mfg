import { getProductBySlug } from '@/utils/productData'

export default function generateProductStructuredData(slug: string) {
  const product = getProductBySlug(slug)
  
  if (!product) {
    return null
  }

  // Extract numeric price if possible
  const priceMatch = product.price.match(/(\d+),(\d+)/)
  const price = priceMatch ? `${priceMatch[1]}.${priceMatch[2]}` : null

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: `${product.name} - Original artwork from the ${product.collection} collection by Miguel Ferraz Guedes. ${product.description}`,
    image: `https://miguelferrazguedes.com${product.imageUrl}`,
    sku: product.id,
    mpn: product.id,
    brand: {
      '@type': 'Brand',
      name: 'Miguel Ferraz Guedes',
    },
    offers: {
      '@type': 'Offer',
      url: `https://miguelferrazguedes.com/product/${product.slug}`,
      priceCurrency: 'EUR',
      price: price,
      priceValidUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      availability: product.sold ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
    ...(product.measurements && {
      width: {
        '@type': 'QuantitativeValue',
        unitCode: 'CMT',
        value: product.measurements.split('x')[0].trim(),
      },
      height: {
        '@type': 'QuantitativeValue',
        unitCode: 'CMT',
        value: product.measurements.split('x')[1].trim().split(' ')[0],
      }
    }),
    category: `Art > Original Artwork > ${product.collection}`,
    material: 'Mixed Media',
    creator: {
      '@type': 'Person',
      name: 'Miguel Ferraz Guedes',
    },
  }
}
