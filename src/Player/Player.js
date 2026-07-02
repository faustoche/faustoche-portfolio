import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export default class Player {
	constructor(scene, modelPath, renderer, collidableObjects) {
		this.scene = scene;
		this.renderer = renderer;
		this.collidableObjects = collidableObjects || [];
		this.raycaster = new THREE.Raycaster();
		
		// Size and movement : to adjust
		this.moveSpeed = 0.05;
		this.movementOffset = 0;

		this.keys = { 
			w: false, a: false, s: false, d: false, 
			ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false 
		};

		// Preparing animation
		this.mixer = null;
		this.animations = [];
		this.idleAction = null;
		this.walkAction = null;
		this.currentAction = null;

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
		const maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();
		
		loader.load(path, (gltf) => {
			const model = gltf.scene;
			
			model.scale.set(0.2, 0.2, 0.2); 
			model.position.y = 0.18; 

			model.traverse((child) => {
				if (child.isMesh) {
					child.castShadow = true;
					child.receiveShadow = true;

					if (child.material && child.material.map) {
						child.material.map.anisotropy = maxAnisotropy;
					}
				}
			});
			
			this.mesh.add(model);
			
			if (gltf.animations && gltf.animations.length > 0) {
				this.mixer = new THREE.AnimationMixer(model);
				this.animations = gltf.animations;
				
				const idleClip = THREE.AnimationClip.findByName(this.animations, 'faustine_idle');
				const walkClip = THREE.AnimationClip.findByName(this.animations, 'faustine_walk');

				if (idleClip) this.idleAction = this.mixer.clipAction(idleClip);
				if (walkClip) this.walkAction = this.mixer.clipAction(walkClip);

				if (this.idleAction) {
					this.idleAction.play();
					this.currentAction = this.idleAction;
				}
			}
		}, undefined, (error) => {
			console.error('Error charging player:', error);
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

	fadeToAction(nextAction, duration = 0.2) {
		if (this.currentAction === nextAction || !nextAction) return;

		const previousAction = this.currentAction;
		this.currentAction = nextAction;

		if (previousAction) {
			previousAction.fadeOut(duration);
		}

		this.currentAction
			.reset()
			.setEffectiveTimeScale(1)
			.setEffectiveWeight(1)
			.fadeIn(duration)
			.play();
	}

	// --- NOUVELLE MÉTHODE : Détection de collision robuste ---
	checkCollision(directionVector, distance) {
		if (!this.collidableObjects || this.collidableObjects.length === 0) return false;

		const origin = this.mesh.position.clone();
		// On lève légèrement le rayon pour être au niveau du ventre du personnage
		origin.y += 0.2; 

		// Largeur des épaules (évite de passer entre deux buissons)
		const shoulderWidth = 0.15;
		
		// Vecteur perpendiculaire pour décaler les rayons à gauche et à droite
		const right = new THREE.Vector3(-directionVector.z, 0, directionVector.x).normalize().multiplyScalar(shoulderWidth);

		// On lance 3 rayons : au centre, à gauche et à droite du joueur
		const origins = [
			origin,
			origin.clone().add(right),
			origin.clone().sub(right)
		];

		for (let i = 0; i < origins.length; i++) {
			this.raycaster.set(origins[i], directionVector);
			const intersects = this.raycaster.intersectObjects(this.collidableObjects, true);
			
			// Si un obstacle est détecté dans la distance de mouvement, on bloque
			if (intersects.length > 0 && intersects[0].distance < distance) {
				return true; 
			}
		}
		return false;
	}

	update(deltaTime) {
		let isMoving = false;
		let dx = 0;
		let dz = 0;

		if (this.keys.w || this.keys.ArrowUp)    { dz -= 1; isMoving = true; }
		if (this.keys.s || this.keys.ArrowDown)  { dz += 1; isMoving = true; }
		if (this.keys.a || this.keys.ArrowLeft)  { dx -= 1; isMoving = true; }
		if (this.keys.d || this.keys.ArrowRight) { dx += 1; isMoving = true; }

		if (isMoving) {
			const length = Math.sqrt(dx * dx + dz * dz);
			const normalizedDx = dx / length;
			const normalizedDz = dz / length;

			const finalDx = normalizedDx * Math.cos(this.movementOffset) - normalizedDz * Math.sin(this.movementOffset);
			const finalDz = normalizedDx * Math.sin(this.movementOffset) + normalizedDz * Math.cos(this.movementOffset);

			// Vitesse de déplacement prévue sur cette frame
			const moveX = finalDx * this.moveSpeed;
			const moveZ = finalDz * this.moveSpeed;

			// Rayon corporel du joueur (l'espace qu'il occupe)
			const playerRadius = 0.2; 

			// --- SYSTÈME DE GLISSEMENT (SÉPARATION DES AXES) ---
			// On teste le mouvement X. Math.abs(moveX) est la distance qu'on s'apprête à parcourir.
			if (Math.abs(moveX) > 0) {
				const dirX = new THREE.Vector3(Math.sign(moveX), 0, 0);
				// On anticipe la collision : rayon + distance parcourue
				if (!this.checkCollision(dirX, playerRadius + Math.abs(moveX))) {
					this.mesh.position.x += moveX;
				}
			}

			// On teste le mouvement Z indépendamment.
			if (Math.abs(moveZ) > 0) {
				const dirZ = new THREE.Vector3(0, 0, Math.sign(moveZ));
				if (!this.checkCollision(dirZ, playerRadius + Math.abs(moveZ))) {
					this.mesh.position.z += moveZ;
				}
			}

			// La rotation du modèle reste orientée vers la direction globale souhaitée
			const angle = Math.atan2(finalDx, finalDz);
			this.mesh.rotation.y = angle;
		}

		if (isMoving) {
			this.fadeToAction(this.walkAction, 0.2);
		} else {
			this.fadeToAction(this.idleAction, 0.2);
		}

		if (this.mixer) {
			this.mixer.update(deltaTime);
		}
	}
}