'use client';

import React, { ReactNode } from 'react';
import Link from 'next/link';

interface ButtonProps {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'outline' | 'text';
}

const Button = ({ 
  href, 
  onClick, 
  children, 
  className = '',
  variant = 'default'
}: ButtonProps) => {
  
  const baseStyles = "inline-block px-6 py-2 uppercase text-sm tracking-wide transition-colors rounded-full font-bold text-center";
  
  const variantStyles = {
    default: "bg-black text-white hover:bg-white hover:text-black border border-black border-[1px]",
    outline: "bg-transparent text-black hover:bg-black hover:text-white border border-black border-[1px]",
    text: "bg-transparent text-black hover:underline"
  };
  
  // Override styles if className contains specific overrides
  const hasWhiteBorder = className.includes('border-white');
  if (hasWhiteBorder && variant === 'outline') {
    variantStyles.outline = "bg-transparent text-white hover:bg-white hover:text-black border border-white border-[1px]";
  }
  
  const buttonStyles = `${baseStyles} ${variantStyles[variant]} ${className}`;
  
  if (href) {
    return (
      <Link href={href} className={buttonStyles}>
        {children}
      </Link>
    );
  }
  
  return (
    <button onClick={onClick} className={buttonStyles}>
      {children}
    </button>
  );
};

export default Button;
