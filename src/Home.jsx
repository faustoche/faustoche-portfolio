import React from 'react';
import { Link } from 'react-router-dom';
import { Globe, FolderOpen, MoveRight } from 'lucide-react'
import './Home.css';

export default function Home() {
  return (
    <div className="home">

      <header className="home-header">
        <div className="home-header_name">
          Faustine Crocq
        </div>

        <nav className="home-header_links">
          <Link to="http://linkedin.com/in/faustine-crocq-7a1994150">Linkedin</Link>
          <Link to="https://github.com/faustoche">Github</Link>
        </nav>
      </header>



      <section className="home-hero">
        <div className="home-hero-heading">
          <h1 className="home-hero_title">FAUSTOCHE</h1>
          <h2 className="home-hero_subtitle">FULL-STACK DEVELOPER</h2>
        </div>
      </section>

      {/*  BOUTONS  */}
      <section className="home-buttons">
        <Link to="/map" className="home-button home-button--primary">
          <Globe size={23}/>
          <span>Dive into my 3D world</span>
          <MoveRight size={18}/>
        </Link>
        <Link to="/projects" className="home-button home-button--secondary">
        <FolderOpen size={23}/>
        <span>See previous projects</span>
        <MoveRight size={18}/>
        </Link>
      </section>

      {/*  FOOTER  */}
      <footer className="home-footer">
        <p>© {new Date().getFullYear()} Faustine</p>
      </footer>

    </div>
  );
}