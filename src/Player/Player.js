import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Octree } from 'three/examples/jsm/math/Octree.js';
import { Capsule } from 'three/examples/jsm/math/Capsule.js';

export default class Player {
	constructor(scene, modelPath, renderer, collidableObjects) {
		this.scene = scene;
		this.renderer = renderer;
		this.collidableObjects = collidableObjects || [];

		// Size and movement : to adjust
		this.moveSpeed = 0.03; // vitesse de référence à 60 FPS (voir update())
		this.movementOffset = 0;
		this.playerRadius = 0.10; // Rayon physique du joueur (dans le plan XZ)
		this.playerHeight = 0.5;  // Hauteur physique du joueur, depuis mesh.position.y

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

		// --- Collision moderne : Octree + Capsule (three/examples/jsm/math) ---
		// IMPORTANT (source unique de vérité) : `playerCollider` est la SEULE
		// représentation physique du joueur. `mesh.position` n'est jamais lu comme
		// source pour la simulation à l'intérieur d'une même frame après le début
		// du mouvement : il n'est écrit qu'UNE seule fois, à la toute fin de
		// update(), à partir du résultat final du collider. Avant, la lecture de
		// mesh.position servait aussi de point de départ à chaque étape ET de
		// destination d'écriture, ce qui n'est pas un bug en soi, mais rendait le
		// pipeline fragile : toute imprécision de résolution de collision se
		// répercutait immédiatement et intégralement sur le rendu, sans jamais être
		// vérifiée pour sa pertinence visuelle (voir resolvePlayerCollisions).
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

	// --- Reconstruit l'Octree du monde ---
	// Boîtes englobantes en guise de proxies : évite qu'une géométrie "à trous"
	// laisse passer la capsule, et exclut les objets plats/larges assimilables
	// au sol.
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

	// --- Étape 1 : la capsule physique repart de la dernière position rendue ---
	syncColliderToMesh() {
		const { x, y, z } = this.mesh.position;
		this.playerCollider.start.set(x, y + this.playerRadius, z);
		this.playerCollider.end.set(x, y + this.playerHeight - this.playerRadius, z);
	}

	// --- Étape 2 : résolution de collision (Octree + Capsule) ---
	// CAUSE RÉELLE DU TREMBLEMENT DU PERSONNAGE :
	// à chaque itération, l'ancienne version prenait la normale de contact,
	// annulait sa composante Y, la RENORMALISAIT, puis multipliait cette
	// nouvelle direction par la profondeur de pénétration D'ORIGINE (calculée,
	// elle, par rapport à la normale 3D non modifiée). Direction et amplitude ne
	// correspondaient donc plus au même vecteur : la correction appliquée était
	// systématiquement trop grande ou trop petite selon l'angle exact de contact.
	// Résultat : le collider ne convergeait jamais vers un point de repos stable
	// tant qu'une touche de déplacement était maintenue contre un obstacle — il
	// se réinstallait à une position légèrement différente à chaque frame, d'où
	// le tressautement visible du modèle 3D (qui ne fait qu'afficher fidèlement
	// cette position instable).
	//
	// Le correctif consiste à utiliser directement le vecteur de correction réel
	// (normal * depth) rapporté par l'Octree, et à ne supprimer QUE sa composante
	// verticale — sans reconstruire une nouvelle direction ni réutiliser
	// l'ancienne profondeur. Le vecteur appliqué correspond ainsi toujours
	// exactement à la pénétration mesurée, ce qui fait converger le collider vers
	// un point de repos déterministe et stable.
	//
	// Un second garde-fou (REST_EPSILON) arrête la boucle dès que la correction
	// restante est plus petite que ce qu'une frame peut représenter visuellement
	// à l'échelle du joueur (rayon 0.10) : sans ce seuil, la boucle continuerait à
	// appliquer des corrections de l'ordre de l'erreur flottante, dont le résultat
	// dépend de l'ordre d'évaluation et varie donc, lui aussi, d'une frame à
	// l'autre.
	resolvePlayerCollisions() {
		const REST_EPSILON = 1e-5;
		const MAX_ITERATIONS = 8;

		for (let i = 0; i < MAX_ITERATIONS; i++) {
			const collision = this.worldOctree.capsuleIntersect(this.playerCollider);
			if (!collision) break;

			const correction = collision.normal.multiplyScalar(collision.depth);
			correction.y = 0; // pas de gravité : on ne corrige jamais la verticale

			if (correction.lengthSq() < REST_EPSILON * REST_EPSILON) break;

			this.playerCollider.translate(correction);
		}
	}

	// --- Étape 3 : seule et unique écriture de la position du modèle 3D ---
	// mesh.position n'est jamais modifié ailleurs dans la classe : il est
	// entièrement dérivé, une fois par frame, du collider final déjà résolu.
	applyColliderToMesh() {
		this.mesh.position.x = this.playerCollider.start.x;
		this.mesh.position.z = this.playerCollider.start.z;
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

			// moveSpeed est calibré pour 60 FPS ; mise à l'échelle du deltaTime réel
			// pour un pas de déplacement constant quel que soit le framerate (une
			// distance de translation variable produit une pénétration variable,
			// donc une correction variable — une source de gigue supplémentaire).
			const frameScale = deltaTime * 60;
			const moveX = finalDx * this.moveSpeed * frameScale;
			const moveZ = finalDz * this.moveSpeed * frameScale;

			// Pipeline en 3 étapes strictement séquentielles, une seule fois par frame :
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