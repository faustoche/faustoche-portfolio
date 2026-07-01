import React, { useState, useEffect, useRef } from "react";
import { ArrowRight, X, Code2, NotepadText, ChevronLeft, ChevronRight } from "lucide-react";
import "./Projects.css";

/// Prendre les images depuis le nom du dossier directement

const webProjects = [
  {
    title: "ft_transcendance",
    category: "WEB APP",
    description: "Multiplayer Pong game platform.",
    longDescription: "Transcendance is a real-time multiplayer web application built around a Pong game with live gameplay, secure authentication system, matchmaking queue, in-game chat, user profiles with stats tracking, and persistent database integration for players, matches, and social interactions.",
    stack: "Typescript, Tailwind CSS, Node.js, Fastify",
    features: ["Multiplayer game", "Live chat", "Dashboard recap"],
    images: [
      "./transcendance/transcendance_register.png",
      "./transcendance/transcendance_basic_profile.png",
      "./transcendance/transcendance_profile.png",
      "./transcendance/transcendance_homepage.png",
      "./transcendance/transcendance_chat.png",
      "./transcendance/transcendance_friend_profil.png",
      "./transcendance/transcendance_game_invite.png",
      "./transcendance/transcendance_gameroom.png",
      "./transcendance/transcendance_gameplay.png",
      "./transcendance/transcendance_dashboard_graph.png",
      "./transcendance/transcendance_dashboard_recap.png"
    ],
  },
  {
    title: "Camagru",
    category: "WEB APP",
    description: "Application de montage photo (Instagram-like).",
    longDescription: "Camagru is a full-stack PHP web application inspired by Instagram implementing user authentication, email verification, webcam capture, filter with face recognition, social feed, likes/comments system, email notification system, and persistent storage of content.",
    stack: "PHP, Javascript, SQLite",
    features: ["Webcam shots", "Facial recognition and filter", "Likes and comments"],
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
    description: "HTTP server.",
    longDescription: "Webserv is a  custom HTTP server implemented in C++ supporting non-blocking I/O, request parsing (GET/POST/DELETE), configurable routing via config files, CGI execution, chunked transfer encoding, and robust error/status code management.",
    stack: "C++, Sockets, CGI, HTTP/1.1",
    features: ["Sockets non-bloquantes", "Parsing de fichiers de configuration", "Gestion des cookies et sessions", "Téléchargement de fichiers"],
    images: [

    ],
  },
  {
    title: "Inception",
    category: "DEVOPS",
    description: "Infrastructure Docker systématisée.",
    longDescription: "Inception is a Docker-based infrastructure project deploying a multi-container architecture with isolated services including NGINX reverse proxy, WordPress, MariaDB database, custom Docker networks, environment variable management and containerization via Docker Compose.",
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
              <h3><NotepadText size={18} /> About the project</h3>
              <p>{project.longDescription}</p>
            </div>
            
            <div className="modal-section-block">
              <h3><Code2 size={18} /> Key functionalities</h3>
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