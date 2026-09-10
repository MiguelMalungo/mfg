import React from 'react';
import './BuyButton.css';

const BuyButton = ({ onClick }) => {
  return (
    <div className="buy-book-container" style={{ position: 'relative', zIndex: 2147483647 }}>
      <button 
        className="buy-book-button"
        onClick={onClick || (() => window.open('https://www.amazon.com/dp/B0DV38S6QB', '_blank'))}
      >
        Buy Book
      </button>
    </div>
  );
};

export default BuyButton;
