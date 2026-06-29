import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#1a1a1a', color: 'white' }}>
      <h1>Faustoche</h1>
      <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
        <Link to="/map" style={{ padding: '15px 30px', background: '#3b82f6', color: 'white', textDecoration: 'none', borderRadius: '5px' }}>
          WIP WORLD
        </Link>
        <Link to="/projects" style={{ padding: '15px 30px', background: '#10b981', color: 'white', textDecoration: 'none', borderRadius: '5px' }}>
          PROJECT
        </Link>
      </div>
    </div>
  );
}