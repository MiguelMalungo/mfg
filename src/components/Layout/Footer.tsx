'use client';

import React from 'react';
import Link from 'next/link';
import { FaWhatsapp, FaTiktok } from 'react-icons/fa';

const Footer = () => {
  return (
    <footer className="relative py-8 px-6 bg-white text-black">
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: '64px' }}>
          <div>
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center">
                  <h3 className="text-lg font-semibold uppercase mr-3">POETRY BOOK</h3>
                  <a
                    href="https://lovely-pegasus-e9f6e6.netlify.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-transparent text-black px-4 py-1 text-sm border border-black hover:bg-black hover:text-white transition-colors duration-200 inline-block"
                  >
                    VIEW
                  </a>
                </div>
                <div className="hidden md:flex items-center">
                  <h3 className="text-lg font-semibold uppercase mr-3">DIGITAL ART</h3>
                  <a
                    href="https://influc.my.canva.site/mfg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-transparent text-black px-4 py-1 text-sm border border-black hover:bg-black hover:text-white transition-colors duration-200 inline-block"
                  >
                    VIEW
                  </a>
                </div>
              </div>
              <div>
                <img
                  src="/images/blocks.webp"
                  alt="Blocks"
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold uppercase mb-4">FOLLOW TO KNOW WHAT&apos;S NEW</h3>
            <div className="flex items-center mb-3">
              <a
                href="https://www.instagram.com/1gato100futuro/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80 flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                </svg>
                @1gato100futuro
              </a>
            </div>
            <div className="flex items-center mb-3">
              <a
                href="https://www.tiktok.com/@miguelfguedes"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80 flex items-center"
              >
                <FaTiktok className="w-5 h-5 mr-2" />
                @miguelfguedes
              </a>
            </div>
            <div className="flex items-center mb-6">
              <a
                href="https://linktr.ee/miguelfguedes"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80 flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7.953 15.066c-.08.163-.08.324-.08.486.08.517.528.897 1.052.897h.243l4.255-4.26 4.254 4.26h.244c.527 0 .976-.38 1.053-.897 0-.162 0-.323-.082-.486l-4.903-4.907 4.665-4.665c.16-.163.24-.325.24-.569 0-.487-.404-.893-.892-.893-.244 0-.406.082-.568.244l-4.01 4.01-4.01-4.01c-.163-.162-.325-.244-.57-.244-.487 0-.89.406-.89.893 0 .244.08.406.24.57l4.664 4.664-4.905 4.907zm4.09 5.122h1.914v-4.064h-1.913v4.064zm-.975-18.188h3.864v2.11h-3.864V2z"/>
                </svg>
                linktr.ee/miguelfguedes
              </a>
            </div>

            <h3 className="text-lg font-semibold uppercase mb-4">PHONE</h3>
            <div className="flex items-center mb-2">
              <a
                href="https://wa.me/46762044037"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80 flex items-center"
                aria-label="Contact on WhatsApp"
              >
                <FaWhatsapp className="w-5 h-5 mr-2" />
                +46 76 2044037
              </a>
            </div>
            <p className="mb-6">+351 961 084 022</p>
          </div>
        </div>

        <div className="md:hidden mt-8 flex items-center">
          <h3 className="text-lg font-semibold uppercase mr-3">DIGITAL ART</h3>
          <a
            href="https://influc.my.canva.site/mfg"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-transparent text-black px-4 py-1 text-sm border border-black hover:bg-black hover:text-white transition-colors duration-200 inline-block"
          >
            VIEW
          </a>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-sm">
            &copy; {new Date().getFullYear()} Miguel Ferraz Guedes. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
