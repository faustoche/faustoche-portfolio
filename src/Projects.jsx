import React from 'react';
import { Link } from 'react-router-dom';

export default function Projects() {
  return (
    <div style={{ padding: '40px', backgroundColor: '#ffffff', color: 'white', height: '100vh' }}>
      <h1>PREVIOUS PROJECTS</h1>
      <p>ici cadre + projets</p>
      <Link to="/" style={{ color: '#3b82f6' }}>Retour à l'accueil</Link>
    </div>
  );
}