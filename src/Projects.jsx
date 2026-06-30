import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkle, Workflow, MoveRight, ArrowRight } from 'lucide-react'
import './Projects.css';

export default function Projects() {
  return (
    <div className="projects">
      <section className="project-hero">
        <h1 className="project-hero_title">PROJECTS</h1>
      </section>

      <section className="project-frame">

        {/* WEB PROJECTS */}
        <div className="project-section">
          <div className="project-section_header">
            <div className="project-section_label">
						<Sparkle size={20}/>
              WEB PROJECTS
            </div>
          </div>

          <div className="project-columns">
            <div className="project-card">
              <div className="card-preview">
                <img
                  src="transcendance.png"
                  alt="ft_transcendance"
                  className="card-preview_img"
                />
              </div>
              <div className="card-info">
                <h3>ft_transcendance</h3>
                <p>Développement d'un site web full-stack de jeu Pong multijoueurs</p>
                <button className="open-btn">OPEN <ArrowRight size={14} /></button>
              </div>
            </div>

            <div className="project-card">
              <div className="card-preview">
                <img
                  src="transcendance1.png"
                  alt="ft_transcendance"
                  className="card-preview_img"
                />
              </div>
              <div className="card-info">
                <h3>Camagru</h3>
                <p>description</p>
                <button className="open-btn">OPEN <ArrowRight size={14} /></button>
              </div>
            </div>
          </div>
        </div>

        {/* DEVOPS PROJECTS */}
        <div className="project-section">
          <div className="project-section_header">
            <div className="project-section_label">
              <Workflow size={20}/>
              DEVOPS PROJECTS
            </div>
          </div>

          <div className="project-columns">
            <div className="project-card">
              <div className="card-preview">
                <img
                  src="transcendance1.png"
                  alt="ft_transcendance"
                  className="card-preview_img"
                />
              </div>
              <div className="card-info">
                <h3>Webserv</h3>
                <p>dfsdfsdf</p>
                <button className="open-btn">OPEN <ArrowRight size={14} /></button>
              </div>
            </div>

            <div className="project-card">
              <div className="card-preview">
                <img
                  src="transcendance1.png"
                  alt="ft_transcendance"
                  className="card-preview_img"
                />
              </div>
              <div className="card-info">
                <h3>Inception</h3>
                <p>sdfsdfsdfsdf</p>
                <button className="open-btn">OPEN <ArrowRight size={14} /></button>
              </div>
            </div>
          </div>
        </div>

      </section>
    </div>
  );
}