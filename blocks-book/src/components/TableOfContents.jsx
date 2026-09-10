import React from 'react';
import { Link } from 'react-router-dom';

const TableOfContents = ({ poems }) => {
  return (
    <div className="table-of-contents">
      <h1>Table of Contents</h1>
      
      <ul className="poem-list">
        {poems.map((poem) => (
          <li key={poem.id}>
            <Link to={`/poem/${poem.id}`}>
              {poem.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TableOfContents;
