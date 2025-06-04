'use client';

import React from 'react';
import WaterAscii from '@/components/UI/WaterAscii';
import { FaWhatsapp } from 'react-icons/fa';

export default function ContactPage() {
  return (
    <div className="min-h-screen py-16 px-6" style={{ backgroundColor: '#F0EEE6' }}>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl md:text-[42px] font-bold mb-6 text-left text-black">GET IN TOUCH</h1>
        
        {/* Desktop layout - 2 columns */}
        <div className="hidden md:grid md:grid-cols-2 md:gap-12">
          <div>
            <h2 className="text-2xl font-bold mb-4 text-black">EMAIL</h2>
            <p className="mb-8 text-black">
              <a href="mailto:info@swedencapoeira.se" className="hover:underline text-black">
                info@swedencapoeira.se
              </a>
            </p>
            
            <h2 className="text-2xl font-bold mb-4 text-black">STUDIO LOCATION</h2>
            <p className="mb-8 text-black">Porto, Rua Serpa Pinto 59</p>
            
            <h2 className="text-2xl font-bold mb-4 text-black">PHONE</h2>
            <div className="flex items-center mb-2">
              <a 
                href="https://wa.me/46762044037" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:opacity-80 flex items-center text-black"
                aria-label="Contact on WhatsApp"
              >
                <FaWhatsapp className="w-5 h-5 mr-2" />
                +46 76 2044037
              </a>
            </div>
            <p className="mb-8 text-black">+351 961 084 022</p>
            
            <h2 className="text-2xl font-bold mb-4 text-black">FOLLOW US</h2>
            <div className="flex items-center">
              <a 
                href="https://www.instagram.com/umgatosemnome" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:opacity-80 text-black"
              >
                <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                </svg>
              </a>
              <span className="text-black">@umgatosemnome</span>
            </div>
          </div>
          
          {/* Animation on desktop - beside text */}
          <div className="w-full h-full flex justify-center items-center">
            <div className="w-full h-[500px]">
              <WaterAscii />
            </div>
          </div>
        </div>
        
        {/* Mobile layout - single column */}
        <div className="md:hidden">
          {/* Contact information */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-black">EMAIL</h2>
            <p className="mb-8 text-black">
              <a href="mailto:info@swedencapoeira.se" className="hover:underline text-black">
                info@swedencapoeira.se
              </a>
            </p>
            
            <h2 className="text-2xl font-bold mb-4 text-black">STUDIO LOCATION</h2>
            <p className="mb-8 text-black">Porto, Rua Serpa Pinto 59</p>
            
            <h2 className="text-2xl font-bold mb-4 text-black">PHONE</h2>
            <div className="flex items-center mb-2">
              <a 
                href="https://wa.me/46762044037" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:opacity-80 flex items-center text-black"
                aria-label="Contact on WhatsApp"
              >
                <FaWhatsapp className="w-5 h-5 mr-2" />
                +46 76 2044037
              </a>
            </div>
            <p className="mb-8 text-black">+351 961 084 022</p>
            
            <h2 className="text-2xl font-bold mb-4 text-black">FOLLOW US</h2>
            <div className="flex items-center mb-8">
              <a 
                href="https://www.instagram.com/umgatosemnome" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:opacity-80 text-black"
              >
                <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                </svg>
              </a>
              <span className="text-black">@umgatosemnome</span>
            </div>
          </div>
          
          {/* Animation on mobile - below text */}
          <div className="w-full flex justify-center items-center">
            <div className="w-[70%] h-[400px]">
              <WaterAscii />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
