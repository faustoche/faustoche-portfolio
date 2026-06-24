import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export default class Player {
    constructor(scene, modelPath) {
        this.scene = scene;
        
        // Taille et mouvement du perso, à voir selon les navigateurs 
        this.moveSpeed = 0.05;

        // Touches
        this.keys = { 
            w: false, a: false, s: false, d: false, 
            ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false 
        };

        // On prépare l'animation 
        this.mixer = null;
        this.animations = [];
        this.idleAction = null;
        this.walkAction = null;
        this.currentAction = null; // animation en cours de jeu 

        this.init(modelPath);
        this.initEvents();
    }

    init(modelPath) {
        this.mesh = new THREE.Group(); 
        this.mesh.position.set(0, 0, 0); 
        this.scene.add(this.mesh);

        if (modelPath) {
            this.loadModel(modelPath);
        }
    }

    loadModel(path) {
        const loader = new GLTFLoader();
        
        loader.load(path, (gltf) => {
            const model = gltf.scene;
            
            model.scale.set(0.2, 0.2, 0.2); 
            model.position.y = 0.18; 

            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            this.mesh.add(model);
            
            if (gltf.animations && gltf.animations.length > 0) {
                this.mixer = new THREE.AnimationMixer(model);
                this.animations = gltf.animations;
                
                // Récupération des clips d'animation par leur nom Blender
                const idleClip = THREE.AnimationClip.findByName(this.animations, 'faustine_idle');
                const walkClip = THREE.AnimationClip.findByName(this.animations, 'faustine_walk');

                // Création des actions associées
                if (idleClip) this.idleAction = this.mixer.clipAction(idleClip);
                if (walkClip) this.walkAction = this.mixer.clipAction(walkClip);

                // Lancement de l'animation d'attente (idle) par défaut
                if (this.idleAction) {
                    this.idleAction.play();
                    this.currentAction = this.idleAction;
                }
            }
        }, undefined, (error) => {
            console.error('Erreur lors du chargement du joueur:', error);
        });
    }

    initEvents() {
        window.addEventListener('keydown', (e) => {
            if (this.keys.hasOwnProperty(e.key)) this.keys[e.key] = true;
        });
        window.addEventListener('keyup', (e) => {
            if (this.keys.hasOwnProperty(e.key)) this.keys[e.key] = false;
        });
    }

    // Méthode de transition fluide entre deux animations
    fadeToAction(nextAction, duration = 0.2) {
        // Si l'animation demandée est déjà en train de jouer, on ne fait rien
        if (this.currentAction === nextAction || !nextAction) return;

        const previousAction = this.currentAction;
        this.currentAction = nextAction;

        // On estompe l'ancienne animation
        if (previousAction) {
            previousAction.fadeOut(duration);
        }

        // On active et amène progressivement la nouvelle animation
        this.currentAction
            .reset()
            .setEffectiveTimeScale(1)
            .setEffectiveWeight(1)
            .fadeIn(duration)
            .play();
    }

    update(deltaTime) {
        let isMoving = false;
        let dx = 0;
        let dz = 0;

        // 1. Détection des touches
        if (this.keys.w || this.keys.ArrowUp)    { dz -= 1; isMoving = true; }
        if (this.keys.s || this.keys.ArrowDown)  { dz += 1; isMoving = true; }
        if (this.keys.a || this.keys.ArrowLeft)  { dx -= 1; isMoving = true; }
        if (this.keys.d || this.keys.ArrowRight) { dx += 1; isMoving = true; }

        if (isMoving) {
            // 2. Normalisation du vecteur
            const length = Math.sqrt(dx * dx + dz * dz);
            const normalizedDx = dx / length;
            const normalizedDz = dz / length;

            // 3. Application du mouvement
            this.mesh.position.x += normalizedDx * this.moveSpeed;
            this.mesh.position.z += normalizedDz * this.moveSpeed;

            // 4. Application de la rotation
            const angle = Math.atan2(normalizedDx, normalizedDz);
            this.mesh.rotation.y = angle;
        }

        // 5. Gestion des transitions d'animations
        if (isMoving) {
            this.fadeToAction(this.walkAction, 0.2); // Transition vers la marche en 0.2s
        } else {
            this.fadeToAction(this.idleAction, 0.2); // Transition vers l'attente en 0.2s
        }

        // 6. Mise à jour du mixer graphique
        if (this.mixer) {
            this.mixer.update(deltaTime);
        }
    }
}