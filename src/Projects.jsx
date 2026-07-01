import React, { useState, useEffect, useRef } from "react";
import { ArrowRight, X, Code2, Layout, ChevronLeft, ChevronRight } from "lucide-react";
import "./Projects.css";

/// Prendre les images depuis le nom du dossier directement

const webProjects = [
  {
    title: "ft_transcendance",
    category: "WEB APP",
    description: "Plateforme Pong multijoueur temps réel.",
    longDescription: "adasdsad",
    stack: "a, b, c, d, e",
    features: ["a a", "a", "a", "a"],
    images: [
      "./transcendance/transcendance_basic_profile.png",
      "./transcendance/transcendance_profile.png",
      "./transcendance/transcendance_homepage.png",
      "./transcendance/transcendance_chat.png",
      "./transcendance/transcendance_friend_profil.png",
      "./transcendance/transcendance_game_invite.png",
      "./transcendance/transcendance_gameroom.png",
      "./transcendance/transcendance_dashboard_graph.png",
      "./transcendance/transcendance_dashboard_recap.png"
    ],
  },
  {
    title: "Camagru",
    category: "WEB APP",
    description: "Application de montage photo (Instagram-like).",
    longDescription: "Un projet full-stack réalisé sans frameworks (PHP pur) pour assimiler les fondamentaux du web : gestion de base de données, upload de fichiers, filtres photo en JavaScript et sécurité applicative.",
    stack: "PHP, JavaScript, MySQL, CSS",
    features: ["Prise de photo via webcam", "Filtres superposables", "Système de likes et commentaires", "Validation par email"],
    images: [
      "./camagru/camagru_register.png",
      "./camagru/camagru_mail_check.png",
      "./camagru/camagru_profile.png",
      "./camagru/camagru_filter.png",
      "./camagru/camagru_stickers.png",
      "./camagru/camagru_filter_stickers.png",
      "./camagru/camagru_gallery.png",
      "./camagru/camagru_publish.png",
      "./camagru/camagru_share.png",
      "./camagru/camagru_main_gallery.png",
      "./camagru/camagru_comments.png"
    ],
  },
];

const devopsProjects = [
  {
    title: "Webserv",
    category: "DEVOPS",
    description: "Serveur HTTP écrit en C++98.",
    longDescription: "Développement d'un serveur HTTP capable de gérer des requêtes GET/POST/DELETE, de supporter les scripts CGI et de multiplexer les connexions entrantes avec select ou poll.",
    stack: "C++98, Sockets, CGI, HTTP/1.1",
    features: ["Sockets non-bloquantes", "Parsing de fichiers de configuration", "Gestion des cookies et sessions", "Téléchargement de fichiers"],
    images: [

    ],
  },
  {
    title: "Inception",
    category: "DEVOPS",
    description: "Infrastructure Docker systématisée.",
    longDescription: "Mise en place d'une architecture multi-conteneurs sécurisée avec Docker Compose. Chaque infrastructure applicative tourne au sein d'un conteneur dédié basé sur Alpine Linux.",
    stack: "Docker, Nginx, MariaDB, WordPress, Redis",
    features: ["Volumes persistants", "Réseaux Docker isolés", "Configuration TLS/SSL auto-signée", "Politiques de redémarrage"],
    images: [

    ],
  },
];

function ProjectCard({ project, onOpen }) {
  return (
    <div className="project-card">
      <span className="project-type">{project.category}</span>
      <h2 className="project-name">{project.title}</h2>
      <p className="project-description">{project.description}</p>
      <p className="project-stack">{project.stack}</p>
      <button className="open-btn" onClick={() => onOpen(project)}>
        OPEN PROJECT
        <ArrowRight size={16} />
      </button>
    </div>
  );
}

function ProjectModal({ project, onClose }) {
  const galleryRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const handleScroll = (direction) => {
    if (galleryRef.current) {
      const scrollAmount = 320; 
      galleryRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="modal-header">
          <h2 className="modal-title">{project.title}</h2>
          <div className="modal-stack-tags">
            {project.stack.split(',').map(tech => (
              <span key={tech} className="tech-tag">{tech.trim()}</span>
            ))}
          </div>
        </div>

        <div className="modal-body">
          {/* Galerie Photo Défilante */}
          <div className="modal-gallery-container">
            <button className="gallery-arrow left" onClick={() => handleScroll('left')}>
              <ChevronLeft size={20} />
            </button>
            <div className="modal-gallery" ref={galleryRef}>
              {project.images.map((img, idx) => (
                <img key={idx} src={img} alt={`${project.title} aperçu ${idx + 1}`} />
              ))}
            </div>
            <button className="gallery-arrow right" onClick={() => handleScroll('right')}>
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="modal-content-details">
            <div className="modal-section-block">
              <h3><Layout size={18} /> Explication du projet</h3>
              <p>{project.longDescription}</p>
            </div>
            
            <div className="modal-section-block">
              <h3><Code2 size={18} /> Fonctionnalités clés</h3>
              <ul className="features-list">
                {project.features.map((feat, idx) => (
                  <li key={idx}>{feat}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Projects() {
  const [selectedProject, setSelectedProject] = useState(null);

  return (
    <div className="projects">
      <section className="project-hero">
        <h1 className="project-hero_title">PROJECTS</h1>
      </section>

      <section className="project-frame">
        <div className="project-section">
          <div className="project-columns">
            {webProjects.map((project) => (
              <ProjectCard
                key={project.title}
                project={project}
                onOpen={setSelectedProject}
              />
            ))}
          </div>
        </div>

        <div className="project-section">
          <div className="project-columns">
            {devopsProjects.map((project) => (
              <ProjectCard
                key={project.title}
                project={project}
                onOpen={setSelectedProject}
              />
            ))}
          </div>
        </div>
      </section>

      {selectedProject && (
        <ProjectModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </div>
  );
}