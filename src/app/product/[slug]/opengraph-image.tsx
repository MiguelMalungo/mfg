import { ImageResponse } from 'next/og'
import { getProductBySlug } from '@/utils/productData'
 
export const size = {
  width: 1200,
  height: 630,
}
 
export const contentType = 'image/png'
 
export default async function Image({ params }: { params: { slug: string } }) {
  const product = getProductBySlug(params.slug)
  
  if (!product) {
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            fontSize: 60,
            color: 'black',
            background: 'white',
            width: '100%',
            height: '100%',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: 60, fontWeight: 'bold' }}>Miguel Ferraz Guedes</div>
          <div style={{ fontSize: 40, marginTop: 20 }}>Contemporary Artist</div>
        </div>
      ),
      size
    )
  }
  
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          fontSize: 60,
          color: 'black',
          background: 'white',
          width: '100%',
          height: '100%',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        <div style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          opacity: 0.2,
          fontSize: 200,
          fontWeight: 'bold',
          color: '#333',
          transform: 'rotate(-30deg)',
        }}>
          MFG
        </div>
        <div style={{ fontSize: 60, fontWeight: 'bold' }}>{product.name}</div>
        <div style={{ fontSize: 40, marginTop: 10 }}>{product.collection} Collection</div>
        <div style={{ fontSize: 30, marginTop: 20 }}>Miguel Ferraz Guedes</div>
      </div>
    ),
    size
  )
}
