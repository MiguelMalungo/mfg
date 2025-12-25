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
    outline: "bg-white text-black border border-black border-[1px] hover:bg-black hover:text-white hover:border-black transition-all duration-200",
    text: "bg-transparent text-black hover:underline"
  };

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
