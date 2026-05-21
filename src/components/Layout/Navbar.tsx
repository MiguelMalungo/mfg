'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Button from '@/components/UI/Button';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <nav className="bg-white py-4 px-6 w-full" style={{ position: 'sticky', top: 0, zIndex: 50 }}>
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <Link href="/" className="text-[34px] font-bold text-black">
            MFG
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-4">
          <Button
            href="/store"
            variant="outline"
            className="font-bold"
          >
            WORK
          </Button>
          <Button
            href="/events"
            variant="outline"
            className="font-bold"
          >
            EVENTS
          </Button>
          <Button
            href="/contact"
            variant="outline"
            className="font-bold"
          >
            CONTACT
          </Button>
          <Link
            href="/garden"
            className="inline-block px-6 py-2 uppercase text-sm tracking-wide transition-colors rounded-full font-bold text-center bg-[#C8FF00] text-black border border-black border-[1px] hover:bg-black hover:text-[#C8FF00]"
          >
            Digital Garden
          </Link>
        </div>

        {/* Mobile Navigation Button */}
        <div className="md:hidden">
          <button 
            onClick={toggleMenu}
            className="text-gray-800 focus:outline-none"
          >
            {isOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden mt-4 bg-white py-2">
          <div className="flex flex-col space-y-4 px-6">
            {/* Home link is now the MFG text in the header */}
            <Button
              href="/store"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              WORK
            </Button>
            <Button
              href="/events"
              variant="outline"
              className="w-full"
              onClick={() => setIsOpen(false)}
            >
              EVENTS
            </Button>
            <Button
              href="/contact"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              CONTACT
            </Button>
            <Link
              href="/garden"
              onClick={() => setIsOpen(false)}
              className="inline-block px-6 py-2 uppercase text-sm tracking-wide transition-colors rounded-full font-bold text-center bg-[#C8FF00] text-black border border-black border-[1px] hover:bg-black hover:text-[#C8FF00]"
            >
              Digital Garden
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
