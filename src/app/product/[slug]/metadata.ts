import { Metadata } from 'next'
import { getProductBySlug } from '@/utils/productData'

type Props = {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = getProductBySlug(params.slug)
  
  if (!product) {
    return {
      title: 'Product Not Found | Miguel Ferraz Guedes',
      description: 'The requested product could not be found.',
    }
  }

  const title = `${product.name} | ${product.collection} Collection | Miguel Ferraz Guedes`
  const description = `${product.name} - Original artwork from the ${product.collection} collection by Miguel Ferraz Guedes. ${product.description}${product.measurements ? ` Dimensions: ${product.measurements}.` : ''}`

  return {
    title,
    description,
    keywords: [
      'Miguel Ferraz Guedes', 
      'contemporary art', 
      'original artwork', 
      product.name, 
      product.collection, 
      'Porto artist', 
      'Portuguese artist'
    ],
    openGraph: {
      title,
      description,
      url: `https://miguelferrazguedes.com/product/${product.slug}`,
      siteName: 'Miguel Ferraz Guedes',
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      creator: '@miguelferrazguedes',
    },
  }
}
