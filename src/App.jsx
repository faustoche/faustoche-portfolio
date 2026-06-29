import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './Home.jsx';
import Projects from './Projects.jsx';

const Map = React.lazy(() => import('./Map.jsx'));

export default function App() {
  return (
    <Router>
      <Suspense fallback={<div style={{ color: 'white', textAlign: 'center', marginTop: '20vh' }}>Chargement...</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/map" element={<Map />} />
        </Routes>
      </Suspense>
    </Router>
  );
}