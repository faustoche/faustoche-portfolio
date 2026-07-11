import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Octree } from 'three/examples/jsm/math/Octree.js';
import { Capsule } from 'three/examples/jsm/math/Capsule.js';

export default class Player {
	constructor(scene, modelPath, renderer, collidableObjects) {
		this.scene = scene;
		this.renderer = renderer;
		this.collidableObjects = collidableObjects || [];
		this.moveSpeed = 0.03;
		this.movementOffset = 0;
		this.playerRadius = 0.10;
		this.playerHeight = 0.5;

		this.keys = {
			w: false, a: false, s: false, d: false,
			ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false
		};

		// Ajout du support joystick
		this.joystick = { x: 0, y: 0 };

		this.mixer = null;
		this.animations = [];
		this.idleAction = null;
		this.walkAction = null;
		this.currentAction = null;

		this.worldOctree = new Octree();
		this.playerCollider = new Capsule(
			new THREE.Vector3(0, this.playerRadius, 0),
			new THREE.Vector3(0, this.playerHeight - this.playerRadius, 0),
			this.playerRadius
		);

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

	// Nouvelle méthode pour mettre à jour le joystick
	setJoystick(x, y) {
		this.joystick.x = x;
		this.joystick.y = y;
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

	updateCollisionBoxes() {
		const proxyGroup = new THREE.Group();
		const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
		const tempMatrix = new THREE.Matrix4();
		const size = new THREE.Vector3();
		const center = new THREE.Vector3();

		const addBoxProxy = (box) => {
			box.getSize(size);
			box.getCenter(center);

			const proxyMesh = new THREE.Mesh(boxGeometry);
			proxyMesh.scale.copy(size);
			proxyMesh.position.copy(center);
			proxyGroup.add(proxyMesh);
		};

		for (const obj of this.collidableObjects) {
			obj.updateWorldMatrix(true, false);

			if (obj.isInstancedMesh) {
				if (!obj.geometry.boundingBox) {
					obj.geometry.computeBoundingBox();
				}

				for (let i = 0; i < obj.count; i++) {
					obj.getMatrixAt(i, tempMatrix);

					const instanceBox = obj.geometry.boundingBox.clone();
					instanceBox.applyMatrix4(tempMatrix);
					instanceBox.applyMatrix4(obj.matrixWorld);

					if (instanceBox.isEmpty()) continue;

					instanceBox.getSize(size);
					if (size.y < 0.05) continue;

					addBoxProxy(instanceBox);
				}
			} else {
				const box = new THREE.Box3().setFromObject(obj);
				if (box.isEmpty()) continue;

				box.getSize(size);

				const isFlatFloor = size.y < 0.15 && (size.x > 3 || size.z > 3);
				if (isFlatFloor) continue;

				addBoxProxy(box);
			}
		}

		proxyGroup.updateMatrixWorld(true);

		this.worldOctree = new Octree();
		this.worldOctree.fromGraphNode(proxyGroup);
	}

	setCollidableObjects(collidableObjects) {
		this.collidableObjects = collidableObjects || [];
		this.updateCollisionBoxes();
	}

	syncColliderToMesh() {
		const { x, y, z } = this.mesh.position;
		this.playerCollider.start.set(x, y + this.playerRadius, z);
		this.playerCollider.end.set(x, y + this.playerHeight - this.playerRadius, z);
	}

	resolvePlayerCollisions() {
		const REST_EPSILON = 1e-5;
		const MAX_ITERATIONS = 8;

		for (let i = 0; i < MAX_ITERATIONS; i++) {
			const collision = this.worldOctree.capsuleIntersect(this.playerCollider);
			if (!collision) break;

			const correction = collision.normal.multiplyScalar(collision.depth);
			correction.y = 0;

			if (correction.lengthSq() < REST_EPSILON * REST_EPSILON) break;

			this.playerCollider.translate(correction);
		}
	}
	applyColliderToMesh() {
		this.mesh.position.x = this.playerCollider.start.x;
		this.mesh.position.z = this.playerCollider.start.z;
	}

	update(deltaTime) {
		let isMoving = false;
		
		// Intégration du joystick avec le clavier
		let dx = this.joystick.x;
		let dz = this.joystick.y;

		if (this.keys.w || this.keys.ArrowUp)    { dz -= 1; }
		if (this.keys.s || this.keys.ArrowDown)  { dz += 1; }
		if (this.keys.a || this.keys.ArrowLeft)  { dx -= 1; }
		if (this.keys.d || this.keys.ArrowRight) { dx += 1; }

		if (dx !== 0 || dz !== 0) {
			isMoving = true;
			const length = Math.sqrt(dx * dx + dz * dz);
			// Utilisation de Math.max pour préserver la progressivité du joystick analogique
			const factor = Math.max(length, 1);
			const normalizedDx = dx / factor;
			const normalizedDz = dz / factor;
			
			const finalDx = normalizedDx * Math.cos(this.movementOffset) - normalizedDz * Math.sin(this.movementOffset);
			const finalDz = normalizedDx * Math.sin(this.movementOffset) + normalizedDz * Math.cos(this.movementOffset);
			const frameScale = deltaTime * 60;
			const moveX = finalDx * this.moveSpeed * frameScale;
			const moveZ = finalDz * this.moveSpeed * frameScale;

			this.syncColliderToMesh();
			this.playerCollider.translate(new THREE.Vector3(moveX, 0, moveZ));
			this.resolvePlayerCollisions();
			this.applyColliderToMesh();

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