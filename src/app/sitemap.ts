import { products } from '@/utils/productData'
import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://miguelferrazguedes.com'
  
  // Base routes
  const routes = [
    '',
    '/store',
    '/biography',
    '/contact',
    '/events',
    '/sp59',
  ].map(route => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: route === '' ? 1 : 0.8,
  }))
  
  // Product routes
  const productRoutes = products.map(product => ({
    url: `${baseUrl}/product/${product.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))
  
  return [...routes, ...productRoutes]
}
