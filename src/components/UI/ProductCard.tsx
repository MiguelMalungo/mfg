'use client';

import React from 'react';
import Link from 'next/link';
import { Product } from '@/utils/productData';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  return (
    <div className="group">
      <Link href={`/product/${product.slug}`}>
        <div className="aspect-square mb-3 relative overflow-hidden">
          {product.imageUrl ? (
            <>
              <img 
                src={product.imageUrl} 
                alt={product.name} 
                className="w-full h-full object-cover"
              />
              {product.sold && (
                <div className="absolute top-0 right-0 bg-black text-white px-3 py-1">
                  SOLD
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <span className="text-gray-400">Coming Soon</span>
            </div>
          )}
        </div>
        <h3 className="text-sm mb-1 text-black font-medium">{product.name}</h3>
        <p className="text-sm text-black">{product.price}</p>
      </Link>
    </div>
  );
};

export default ProductCard;
