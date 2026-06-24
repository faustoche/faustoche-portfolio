import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';

import Water from './World/Water.js';
import Player from './Player/Player.js';

// --- Variables d'état pour la gestion des scènes ---
let activeScene = 'world'; // 'world', 'transition', ou 'shop'
let isNearShop = false;
const recordShopPosition = new THREE.Vector3();

// --- Éléments du DOM ---
const uiPrompt = document.getElementById('ui-prompt');
const fadeOverlay = document.getElementById('fade-overlay');

const canvas = document.querySelector('#webgl');
const scene = new THREE.Scene();

const skyColor = '#87CEEB';
scene.background = new THREE.Color(skyColor);
scene.fog = new THREE.Fog(skyColor, 10, 60);

const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const ambientLight = new THREE.AmbientLight(0xffffff, 2);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
directionalLight.position.set(-15, 25, 15);
directionalLight.castShadow = true;

directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 100;
directionalLight.shadow.camera.left = -40;
directionalLight.shadow.camera.right = 40;
directionalLight.shadow.camera.top = 40;
directionalLight.shadow.camera.bottom = -40;
directionalLight.shadow.mapSize.set(2048, 2048);
directionalLight.shadow.bias = -0.0005;
directionalLight.shadow.normalBias = 0.02;
scene.add(directionalLight);

const water = new Water();
const player = new Player(scene, '/models/faustine.glb');
const cameraOffset = new THREE.Vector3(0, 2.2, 4.4);

const loader = new GLTFLoader();

// 1. Chargement des arbres
loader.load('/models/trees.glb', (treesGltf) => {
	const variationsArbres = [];
	treesGltf.scene.children.forEach((enfant) => {
		if (enfant.isGroup || enfant.isMesh) variationsArbres.push(enfant);
	});

	// 2. Chargement de l'herbe
	loader.load('/models/grass_patch.glb', (grassGltf) => {
		let grassPatchMesh = null;
		let singleGrassMesh = null;

		grassGltf.scene.traverse((child) => {
			if (child.isMesh) {
				const name = child.name.toLowerCase();
				const parentName = child.parent ? child.parent.name.toLowerCase() : '';
				if (name.includes('grasspatch') || parentName.includes('grasspatch')) {
					grassPatchMesh = child;
				} else if (name.includes('single_grass') || parentName.includes('single_grass')) {
					singleGrassMesh = child;
				}
			}
		});

		// 3. Chargement du premier fichier de fleurs
		loader.load('/models/flowers.glb', (flowerGltf1) => {
			const yellowFlowerMeshes = [];
			const redFlowerMeshes = [];
			const whiteFlowerMeshes = [];

			// 4. Chargement du second fichier de fleurs
			loader.load('/models/plant_flowers.glb', (flowerGltf2) => {
				const jasmineMeshes = [];
				const violetMeshes = [];
				const cosmosMeshes = [];

				// 4.5 Chargement du troisième fichier
				loader.load('/models/foliage_plants.glb', (foliageGltf) => {
					const blueEyedGrassMeshes = [];
					const nootkaRoseMeshes = [];

					foliageGltf.scene.traverse((child) => {
						if (child.isMesh) {
							const name = child.name.toLowerCase();
							const parentName = child.parent ? child.parent.name.toLowerCase() : '';
							
							if (name.includes('nootka_rose') || parentName.includes('nootka_rose') || name.includes('nootkarose') || parentName.includes('nootkarose')) {
								nootkaRoseMeshes.push(child);
							}
						}
					});

					// 5. Chargement du monde
					loader.load('/models/world_small.glb', (gltf) => {
						gltf.scene.scale.set(0.1, 0.1, 0.1);
						gltf.scene.updateMatrixWorld(true);
						scene.add(gltf.scene);

						gltf.scene.traverse((child) => {
							if (child.isMesh) {
								child.castShadow = true;
								child.receiveShadow = true;
							}
						});

						// --- Récupération de la position de la boutique ---
						// Note : Assurez-vous que l'objet s'appelle bien 'record_shop' dans Blender
						// Sinon, modifiez le nom ci-dessous.
						const shopObject = gltf.scene.getObjectByName('Outside recordshop');
						if (shopObject) {
							shopObject.getWorldPosition(recordShopPosition);
						} else {
							// Coordonnées par défaut si l'objet n'est pas trouvé (à modifier)
							recordShopPosition.set(5, 0, -5);
						}

						const lampadaire = gltf.scene.getObjectByName('Street_lamp');
						if (lampadaire) {
							const lampLight = new THREE.PointLight(0xffddaa, 2, 100);
							lampLight.position.set(0, 25, 0);
							lampadaire.add(lampLight);
						}
						
						const planDeau = gltf.scene.getObjectByName('Water');
						if (planDeau) planDeau.material = water.material;

						const boutiquesARemplacer = [];
						boutiquesARemplacer.forEach(boutique => {
							const placeholder = gltf.scene.getObjectByName(boutique.nom);
							if (placeholder) {
								placeholder.visible = false;
								loader.load(boutique.fichier, (modeleGltf) => {
									const nouveauModele = modeleGltf.scene;
									nouveauModele.traverse((enfant) => {
										if (enfant.isMesh) {
											enfant.castShadow = true;
											enfant.receiveShadow = true;
										}
									});
									nouveauModele.position.copy(placeholder.position);
									nouveauModele.rotation.copy(placeholder.rotation);
									if (boutique.rotYOffset !== 0) nouveauModele.rotateY(boutique.rotYOffset);
									const s = boutique.scaleOffset;
									nouveauModele.scale.set(placeholder.scale.x * s, placeholder.scale.y * s, placeholder.scale.z * s);
									if (placeholder.parent) placeholder.parent.add(nouveauModele);
									else scene.add(nouveauModele);
								});
							}
						});

						const landGrass = gltf.scene.getObjectByName('Land_grass');
						if (landGrass) {
							landGrass.visible = false;
							const sampler = new MeshSurfaceSampler(landGrass).build();
							const position = new THREE.Vector3();

							if (grassPatchMesh && singleGrassMesh) {
								const dummyGrass = new THREE.Object3D();
								const patchCount = 1250;
								const singleCount = 1250;
								const instancedPatch = new THREE.InstancedMesh(grassPatchMesh.geometry, grassPatchMesh.material, patchCount);
								const instancedSingle = new THREE.InstancedMesh(singleGrassMesh.geometry, singleGrassMesh.material, singleCount);
								instancedPatch.castShadow = true;
								instancedSingle.castShadow = true;
								instancedPatch.frustumCulled = false;
								instancedSingle.frustumCulled = false;
								
								const placerHerbe = (instancedMesh, count) => {
									for (let i = 0; i < count; i++) {
										sampler.sample(position);
										landGrass.localToWorld(position);
										dummyGrass.position.copy(position);
										dummyGrass.rotation.set(0, Math.random() * Math.PI * 2, 0);
										const randomScale = 0.6 + Math.random() * 0.6;
										const finalScale = randomScale * 0.1;
										dummyGrass.scale.set(finalScale, finalScale, finalScale);
										dummyGrass.updateMatrix();
										instancedMesh.setMatrixAt(i, dummyGrass.matrix);
									}
									instancedMesh.instanceMatrix.needsUpdate = true;
								};
								placerHerbe(instancedPatch, patchCount);
								placerHerbe(instancedSingle, singleCount);
								scene.add(instancedPatch);
								scene.add(instancedSingle);
							}

							const dummyFlower = new THREE.Object3D();
							const flowerCount = 50; 

							const placerFleurs = (meshesArray, count) => {
								if (!meshesArray || meshesArray.length === 0) return;
								
								const matrices = [];
								for (let i = 0; i < count; i++) {
									sampler.sample(position);
									landGrass.localToWorld(position);
									dummyFlower.position.copy(position);
									dummyFlower.rotation.set(0, Math.random() * Math.PI * 2, 0);
									
									const baseScale = 0.1; 
									const randomScale = baseScale * (0.8 + Math.random() * 0.4);
									
									dummyFlower.scale.set(randomScale, randomScale, randomScale);
									dummyFlower.updateMatrix();
									matrices.push(dummyFlower.matrix.clone());
								}

								meshesArray.forEach((meshPart) => {
									const instancedMesh = new THREE.InstancedMesh(meshPart.geometry, meshPart.material, count);
									instancedMesh.castShadow = true;
									instancedMesh.frustumCulled = false;

									matrices.forEach((matrice, index) => {
										instancedMesh.setMatrixAt(index, matrice);
									});

									instancedMesh.instanceMatrix.needsUpdate = true;
									scene.add(instancedMesh);
								});
							};

							placerFleurs(whiteFlowerMeshes, flowerCount);
							placerFleurs(redFlowerMeshes, flowerCount);
							placerFleurs(yellowFlowerMeshes, flowerCount);
							placerFleurs(jasmineMeshes, flowerCount);
							placerFleurs(violetMeshes, flowerCount);
							placerFleurs(cosmosMeshes, flowerCount);
							placerFleurs(blueEyedGrassMeshes, flowerCount);
							placerFleurs(nootkaRoseMeshes, flowerCount);
						}

						const positionsArbres = [];
						const dummyTree = new THREE.Object3D();
						gltf.scene.traverse((objet) => {
							if (objet.name.toLowerCase().startsWith('tree')) {
								const positionMondiale = new THREE.Vector3();
								objet.getWorldPosition(positionMondiale);
								positionsArbres.push(positionMondiale.clone());
								objet.visible = false;
							}
						});

						if (variationsArbres.length > 0 && positionsArbres.length > 0) {
							const matricesParVariation = variationsArbres.map(() => []);
							positionsArbres.forEach((pos, i) => {
								const idxVariation = i % variationsArbres.length;
								dummyTree.position.copy(pos);
								dummyTree.position.y += 0.05;
								dummyTree.rotation.set(0, (i * 2.399) % (Math.PI * 2), 0);
								const scale = 0.05 + (i % 5) * 0.006;
								dummyTree.scale.set(scale, scale, scale);
								dummyTree.updateMatrix();
								matricesParVariation[idxVariation].push(dummyTree.matrix.clone());
							});
							variationsArbres.forEach((arbreModele, idxVariation) => {
								const matrices = matricesParVariation[idxVariation];
								if (matrices.length === 0) return;
								arbreModele.traverse((piece) => {
									if (!piece.isMesh) return;
									const instancedMesh = new THREE.InstancedMesh(piece.geometry, piece.material, matrices.length);
									instancedMesh.castShadow = true;
									instancedMesh.frustumCulled = false;
									matrices.forEach((matrice, index) => instancedMesh.setMatrixAt(index, matrice));
									instancedMesh.instanceMatrix.needsUpdate = true;
									scene.add(instancedMesh);
								});
							});
						}
					}); 
				}); 
			}); 
		}); 
	}); 
}); 

// --- Logique d'interaction et de transition ---

window.addEventListener('keydown', (e) => {
	// Si on appuie sur 'e', qu'on est proche et qu'on est dans le monde
	if (e.key.toLowerCase() === 'e' && isNearShop && activeScene === 'world') {
		transitionToShop();
	}
});

function transitionToShop() {
	activeScene = 'transition';
	
	if (uiPrompt) uiPrompt.style.display = 'none';
	if (fadeOverlay) fadeOverlay.style.opacity = '1';

	// Après 1 seconde (fin du fondu au noir)
	setTimeout(() => {
		loadShopScene();

		// Après 1 seconde de pause sur l'écran noir, on retire le fondu
		setTimeout(() => {
			if (fadeOverlay) fadeOverlay.style.opacity = '0';
		}, 1000);

	}, 1000);
}

function loadShopScene() {
	activeScene = 'shop';
	
	// Masquer tous les éléments de la scène principale (sauf la lumière)
	scene.children.forEach(child => {
		if (child.type !== 'AmbientLight' && child.type !== 'DirectionalLight' && child !== player.mesh) {
			child.visible = false;
		}
	});

	// Optionnel : adapter la couleur du fond
	scene.background = new THREE.Color('#1a1a1a');
	scene.fog = null; // Enlever le brouillard à l'intérieur

	// Charger le nouveau modèle
	loader.load('/models/record_shop.glb', (gltf) => {
		const shopScene = gltf.scene;
		scene.add(shopScene);

		// CORRECTION 2 : On agrandit le personnage pour cette scène
		if (player.mesh) {
			player.mesh.position.set(0, 0, 4); // On le place un peu plus près de l'entrée
			
			// On multiplie sa taille (à ajuster selon le rendu : 3, 4, 5, etc.)
			player.mesh.scale.set(4, 4, 4); 
			player.movementOffset = -Math.PI / 2;
			
			player.mesh.visible = true; 
		}

		// Position fixe de la caméra pour l'intérieur (Valeurs à ajuster selon votre modèle)
		camera.position.set(15, 6.5, 0); 
		camera.lookAt(0, 2.8, 0);
	});
}

const clock = new THREE.Clock();

function animate() {
	const deltaTime = clock.getDelta();
	const elapsedTime = clock.getElapsedTime();
	
	water.update(elapsedTime);

	if (activeScene === 'world') {
		player.update(deltaTime);

		// Détection de proximité avec la boutique
		if (player.mesh && recordShopPosition.length() > 0) {
			const distance = player.mesh.position.distanceTo(recordShopPosition);
			if (distance < 2.5) {
				if (uiPrompt) uiPrompt.style.display = 'block';
				isNearShop = true;
			} else {
				if (uiPrompt) uiPrompt.style.display = 'none';
				isNearShop = false;
			}
		}

		// La caméra suit le joueur dans le monde ouvert
		if (player.mesh) {
			camera.position.copy(player.mesh.position).add(cameraOffset);
			camera.lookAt(player.mesh.position);
		}
	} 
	// ÉTAPE AJOUTÉE : Déplacement du joueur dans la boutique avec caméra fixe
	else if (activeScene === 'shop') {
		player.update(deltaTime);
		// On ne touche pas à la caméra ici, elle reste sur la position fixe définie au chargement
	}

	renderer.render(scene, camera);
	window.requestAnimationFrame(animate);
}

window.addEventListener('resize', () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();