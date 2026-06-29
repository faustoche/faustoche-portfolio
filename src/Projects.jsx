import React from 'react';
import { Link } from 'react-router-dom';

export default function Projects() {
  return (
    <div style={{ padding: '40px', backgroundColor: '#1a1a1a', color: 'white', height: '100vh' }}>
      <h1>Mes Projets</h1>
      <p>Ici, vous mettrez vos projets classiques.</p>
      <Link to="/" style={{ color: '#3b82f6' }}>Retour à l'accueil</Link>
    </div>
  );
}