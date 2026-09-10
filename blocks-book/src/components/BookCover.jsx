import React from 'react';
import { Link } from 'react-router-dom';

const BookCover = () => {
  return (
    <div className="book-cover">
      <h1>Poetry Collection</h1>
      <h2>A collection of 66 poems</h2>
      
      {/* Placeholder for cover image */}
      <div className="cover-image-container">
        <img 
          src={`${process.env.PUBLIC_URL}/media/cover.jpg`} 
          alt="Book Cover" 
          className="cover-image"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://via.placeholder.com/400x600?text=Poetry+Book+Cover';
          }}
        />
      </div>
      
      <Link to="/contents" className="enter-button">
        Enter
      </Link>
    </div>
  );
};

export default BookCover;
