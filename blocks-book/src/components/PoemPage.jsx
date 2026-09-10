import React from 'react';
import { useParams, Link } from 'react-router-dom';

const PoemPage = ({ poems }) => {
  const { id } = useParams();
  const poemId = parseInt(id);
  
  // Find the current poem
  const poem = poems.find(p => p.id === poemId);
  
  // Calculate previous and next poem IDs
  const prevId = poemId > 1 ? poemId - 1 : null;
  const nextId = poemId < poems.length ? poemId + 1 : null;
  
  if (!poem) {
    return <div className="poem-page">Poem not found</div>;
  }
  
  return (
    <div className="poem-page">
      <h1>{poem.title}</h1>
      
      <div className="poem-content">
        {poem.content}
      </div>
      
      <div className="poem-navigation">
        {prevId ? (
          <Link to={`/poem/${prevId}`}>Previous Poem</Link>
        ) : (
          <span></span>
        )}
        
        <Link to="/contents">Back to Contents</Link>
        
        {nextId ? (
          <Link to={`/poem/${nextId}`}>Next Poem</Link>
        ) : (
          <span></span>
        )}
      </div>
    </div>
  );
};

export default PoemPage;
