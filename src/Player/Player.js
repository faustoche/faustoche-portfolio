import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export default class Player {
	constructor(scene, modelPath, renderer) {
		this.scene = scene;
		this.renderer = renderer;
		
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
		this.currentAction = null; // animation in progress

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

					// TO CHECK
					// If object has an image texture, adding clearness
					if (child.material && child.material.map) {
						child.material.map.anisotropy = maxAnisotropy;
					}
				}
			});
			
			this.mesh.add(model);
			
			if (gltf.animations && gltf.animations.length > 0) {
				this.mixer = new THREE.AnimationMixer(model);
				this.animations = gltf.animations;
				
				// Getting animation by their name
				const idleClip = THREE.AnimationClip.findByName(this.animations, 'faustine_idle');
				const walkClip = THREE.AnimationClip.findByName(this.animations, 'faustine_walk');

				// Creation associated action
				if (idleClip) this.idleAction = this.mixer.clipAction(idleClip);
				if (walkClip) this.walkAction = this.mixer.clipAction(walkClip);

				// Idle by default
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

	// Transition between animation
	fadeToAction(nextAction, duration = 0.2) {
		// If animation is playing, nothing happen
		if (this.currentAction === nextAction || !nextAction) return;

		const previousAction = this.currentAction;
		this.currentAction = nextAction;

		// Fading old one
		if (previousAction) {
			previousAction.fadeOut(duration);
		}

		// New animation
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

		if (this.keys.w || this.keys.ArrowUp)    { dz -= 1; isMoving = true; }
		if (this.keys.s || this.keys.ArrowDown)  { dz += 1; isMoving = true; }
		if (this.keys.a || this.keys.ArrowLeft)  { dx -= 1; isMoving = true; }
		if (this.keys.d || this.keys.ArrowRight) { dx += 1; isMoving = true; }

		if (isMoving) {
			// Vector normalize
			const length = Math.sqrt(dx * dx + dz * dz);
			const normalizedDx = dx / length;
			const normalizedDz = dz / length;

			// angles on controls
			const finalDx = normalizedDx * Math.cos(this.movementOffset) - normalizedDz * Math.sin(this.movementOffset);
			const finalDz = normalizedDx * Math.sin(this.movementOffset) + normalizedDz * Math.cos(this.movementOffset);

			// better movement
			this.mesh.position.x += finalDx * this.moveSpeed;
			this.mesh.position.z += finalDz * this.moveSpeed;

			// rotation
			const angle = Math.atan2(finalDx, finalDz);
			this.mesh.rotation.y = angle;
		}

		// Transitions
		if (isMoving) {
			this.fadeToAction(this.walkAction, 0.2);
		} else {
			this.fadeToAction(this.idleAction, 0.2);
		}

		// Updating graphic mixer : to check
		if (this.mixer) {
			this.mixer.update(deltaTime);
		}
	}
}