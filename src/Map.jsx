import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import './Map.css';
import Player from './Player/Player.js';

// Map Composant:
// - Initialize Three.JS scene
// - Load 3D models asynchronously
// - Player controls (keyboard + joystick)
// - Transition between scenes
// - Animation loop

export default function Map() {

	// Where ThreeJS is drawing
	const canvasRef = useRef(null);

	// Single execution - avoid double-initialization
	const mountRef = useRef(false);
	
	// React states for UI -> loading screen, joysticks, etc
	const [isLoading, setIsLoading] = useState(true);
	const [progress, setProgress] = useState(0);
	const [isTouchDevice, setIsTouchDevice] = useState(false);

	useEffect(() => {

		// Détection du tactile ou non pour l'affichage du joystick
		setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);

		// Has the model been charged already?
		if (mountRef.current)
			return;
		mountRef.current = true;

		// Scene state 
		let activeScene = 'world';
		let isNearShop = false;
		const recordShopPosition = new THREE.Vector3();
		
		// VARIABLES GLOBALES POUR LA GESTION DE LA MEMOIRE (Pour vider la scène à la sortie)
		let alanMixer = null;
		let currentShopScene = null;
		let currentAlanModel = null;

		// DOM element
		const uiPrompt = document.getElementById('ui-prompt');
		const fadeOverlay = document.getElementById('fade-overlay');
		const joystickZone = document.getElementById('virtual-joystick');
		const joystickKnob = document.getElementById('joystick-knob');
		const exitShopBtn = document.getElementById('exit-shop-btn');

		const canvas = canvasRef.current;

		// Scene initialization
		const scene = new THREE.Scene();

		// TO CHANGE: (see UNITY engine for sky)
		const skyColor = '#87CEEB';
		scene.background = new THREE.Color(skyColor);
		scene.fog = new THREE.Fog(skyColor, 10, 60);

		// Camera angle
		const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 100);

		// Draw the scene in canvas
		const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		renderer.toneMapping = THREE.NoToneMapping;
		renderer.toneMappingExposure = 1.0;
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFShadowMap;

		// TO CHANGE: 
		const ambientLight = new THREE.AmbientLight(0xffffff, 2);
		scene.add(ambientLight);

		const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
		directionalLight.position.set(-15, 25, 15);
		directionalLight.castShadow = true;
		directionalLight.shadow.camera.near = 0.5;
		directionalLight.shadow.camera.far = 60;
		directionalLight.shadow.camera.left = -20;
		directionalLight.shadow.camera.right = 20;
		directionalLight.shadow.camera.top = 20;
		directionalLight.shadow.camera.bottom = -20;
		directionalLight.shadow.mapSize.set(1024, 1024);
		directionalLight.shadow.bias = -0.0005;
		directionalLight.shadow.normalBias = 0.02;
		scene.add(directionalLight);

		// SEPARATION DES COLLISIONS MONDE/SHOP
		// Filled when models are loaded
		// TO CHECK: la fontaine n'est pas dans les objets
		const worldColliders = [];
		const shopColliders = [];

		// Player and camera settings
		const player = new Player(scene, '/models/faustine.glb', renderer, worldColliders);
		const cameraOffset = new THREE.Vector3(0, 2.2, 4.4);

		const cameraTarget = new THREE.Vector3(0, 0, 0);
		const cameraDeadZoneRadius = 0.6; // à réadapter selon la vitesse du joueur
		const cameraFollowSpeed = 4;
		let cameraTargetInitialized = false;

		// Reset camera target for a smooth change
		function snapCameraTarget(position) {
			cameraTarget.copy(position);
			cameraTargetInitialized = true;
		}

		// Loading manager to update ALL the loads
		// 1 progression bar instead of one per file
		const manager = new THREE.LoadingManager();
		
		// Artificial delay
		manager.onLoad = () => {
			setTimeout(() => {
				setIsLoading(false);
			}, 1500); 
		};

		manager.onProgress = (url, itemsLoaded, itemsTotal) => {
			const percentage = (itemsLoaded / itemsTotal) * 100;
			setProgress(percentage);
		};

		// TO CHANGE: exporter tous les fichiers GLB avec Draco pour n'avoir qu'1 seul loader
		const loader = new GLTFLoader(manager);
		const worldLoader = new GLTFLoader(manager);
		const dracoLoader = new DRACOLoader();
		dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
		worldLoader.setDRACOLoader(dracoLoader);

		// Chargement en cascade des objets

		loader.load('/models/trees.glb', (treesGltf) => {
			const treeVariations = [];
			treesGltf.scene.children.forEach((child) => {
				if (child.isGroup || child.isMesh) treeVariations.push(child);
			});

			// Différent type d'herbe
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

				// On réduit l'échelle de la map sinon elle est 10 fois trop frande
				// Le sol n'est pas une collision
				worldLoader.load('/models/world_small.glb', (gltf) => {
					gltf.scene.scale.set(0.1, 0.1, 0.1);
					gltf.scene.updateMatrixWorld(true);
					scene.add(gltf.scene);

					gltf.scene.traverse((child) => {
						if (child.isMesh) {
							child.castShadow = true;
							child.receiveShadow = true;

							if (child.name !== 'Land_grass') {
								worldColliders.push(child);
							}
						}
					});

					// Récupération de la position du record shop pour placer l'entrée
					const shopObject = gltf.scene.getObjectByName('Outside recordshop');
					if (shopObject) {
						shopObject.getWorldPosition(recordShopPosition);
					} else {
						recordShopPosition.set(3, 0, -5);
					}

					// Instanciation de l'herbe et des arbres 
					// Meilleure performance avec l'instanciation
					// Points aléatoire mais répartis correctement 
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

							instancedPatch.castShadow = false;
							instancedSingle.castShadow = false;
							instancedPatch.receiveShadow = true; // à changer?
							instancedSingle.receiveShadow = true; // à changer?

							scene.add(instancedPatch);
							scene.add(instancedSingle);

							const placeGrass = (instancedMesh, count) => {
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
								instancedMesh.computeBoundingSphere();
							};
							placeGrass(instancedPatch, patchCount);
							placeGrass(instancedSingle, singleCount);
						}

						// Placement des arbres
						// À REFAIRE!!1! Les arbres doivent toucher le sol 🤡
						// Variation rotation
						const treePositions = [];
						const dummyTree = new THREE.Object3D();
						gltf.scene.traverse((object) => {
							if (object.name.toLowerCase().startsWith('tree')) {
								const worldPosition = new THREE.Vector3();
								object.getWorldPosition(worldPosition);
								treePositions.push(worldPosition.clone());
								object.visible = false;
							}
						});

						if (treeVariations.length > 0 && treePositions.length > 0) {
							const matricesPerVariation = treeVariations.map(() => []);
							treePositions.forEach((pos, i) => {
								const variationIdx = i % treeVariations.length;
								dummyTree.position.copy(pos);
								dummyTree.position.y += 0.05;
								dummyTree.rotation.set(0, (i * 2.399) % (Math.PI * 2), 0);
								const scale = 0.05 + (i % 5) * 0.006;
								dummyTree.scale.set(scale, scale, scale);
								dummyTree.updateMatrix();
								matricesPerVariation[variationIdx].push(dummyTree.matrix.clone());
							});
							treeVariations.forEach((treeModel, variationIdx) => {
								const matrices = matricesPerVariation[variationIdx];
								if (matrices.length === 0) return;
								treeModel.traverse((part) => {
									if (!part.isMesh) return;
									const instancedMesh = new THREE.InstancedMesh(part.geometry, part.material, matrices.length);

									instancedMesh.castShadow = false;
									instancedMesh.receiveShadow = true;

									matrices.forEach((matrix, index) => instancedMesh.setMatrixAt(index, matrix));
									instancedMesh.instanceMatrix.needsUpdate = true;
									instancedMesh.computeBoundingSphere();

									scene.add(instancedMesh);
									worldColliders.push(instancedMesh);
								});
							});
						}
					}

					player.setCollidableObjects(worldColliders);
				});
			});
		});

		// Touche E pour ouvrir le record shop
		const handleKeyDown = (e) => {
			if (e.key.toLowerCase() === 'e' && isNearShop && activeScene === 'world') {
				transitionToShop();
			}
		};
		window.addEventListener('keydown', handleKeyDown);

		// Sur mobile on clique 
		const handleTouchPrompt = (e) => {
			e.preventDefault();
			if (isNearShop && activeScene === 'world') {
				transitionToShop();
			}
		};

		const handleExit = (e) => {
			e.preventDefault();
			if (activeScene === 'shop') {
				transitionToWorld();
			}
		};

		if (uiPrompt) {
			uiPrompt.addEventListener('click', handleTouchPrompt);
			uiPrompt.addEventListener('touchstart', handleTouchPrompt, { passive: false });
		}

		if (exitShopBtn) {
			exitShopBtn.addEventListener('click', handleExit);
			exitShopBtn.addEventListener('touchstart', handleExit, { passive: false })
		}

		// Affichage du joystick
		// Calcul de la distance entre point de contact et centre.
		// Normalisation de la distance
		const handleTouchMove = (e) => {
			e.preventDefault();
			if (!joystickZone || !joystickKnob || !player) return;
			
			const touch = e.targetTouches[0];
			const rect = joystickZone.getBoundingClientRect();
			const centerX = rect.left + rect.width / 2;
			const centerY = rect.top + rect.height / 2;
			
			let dx = touch.clientX - centerX;
			let dy = touch.clientY - centerY;
			
			// Le joystick ne déborde pas
			const maxDist = rect.width / 2;
			const dist = Math.sqrt(dx * dx + dy * dy);
			
			if (dist > maxDist) {
				dx = (dx / dist) * maxDist;
				dy = (dy / dist) * maxDist;
			}
			
			joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
			player.setJoystick(dx / maxDist, dy / maxDist);
		};

		// Retour au centre quand on retire le doigt
		const handleTouchEnd = (e) => {
			e.preventDefault();
			if (!joystickKnob || !player) return;
			
			joystickKnob.style.transform = `translate(0px, 0px)`;
			player.setJoystick(0, 0);
		};

		if (joystickZone) {
			joystickZone.addEventListener('touchmove', handleTouchMove, { passive: false });
			joystickZone.addEventListener('touchstart', handleTouchMove, { passive: false });
			joystickZone.addEventListener('touchend', handleTouchEnd, { passive: false });
		}

		// Transition pour les magasins avec un fondu au noir 
		function transitionToShop() {
			activeScene = 'transition';

			if (uiPrompt) 
				uiPrompt.style.display = 'none';
			if (fadeOverlay) 
				fadeOverlay.style.opacity = '1';

			setTimeout(() => {
				loadShopScene();
			}, 1000);
		}

		// Chargement de l'intérieur du magasin
		function loadShopScene() {
			activeScene = 'shop';
			shopColliders.length = 0;

			// On les cache juste, pas besoin de les recharger 
			scene.children.forEach(child => {
				if (child.type !== 'AmbientLight' && child.type !== 'DirectionalLight' && child !== player.mesh) {
					child.userData.isWorldObject = true;
					child.visible = false;
				}
			});

			scene.background = new THREE.Color('#1a1a1a');
			scene.fog = null;

			// Barre de chargement
			const shopLoaderOverlay = document.getElementById('shop-loader-overlay');
			const shopProgressBar = document.getElementById('shop-progress-inner');
			const shopProgressText = document.getElementById('shop-progress-text');
			
			if (shopLoaderOverlay) {
				shopLoaderOverlay.style.display = 'flex';
				shopLoaderOverlay.style.opacity = '1';
			}
			
			let targetProgress = 0;
			let currentDisplay = 0;
			let modelsReady = false;
			let shopLoaded = 0, shopTotal = 1;
			let alanLoaded = 0, alanTotal = 1;

			const calcProgress = () => {
				const totalL = shopLoaded + alanLoaded;
				const totalT = shopTotal + alanTotal;
				if (totalT > 0) {
					targetProgress = (totalL / totalT) * 90; 
				}
			};

			const updateLoader = () => {
				if (modelsReady) targetProgress = 100;
				
				currentDisplay += (targetProgress - currentDisplay) * 0.1;
				const rounded = Math.round(currentDisplay);
				
				if (shopProgressBar) shopProgressBar.style.width = `${rounded}%`;
				if (shopProgressText) shopProgressText.innerText = `${rounded}%`;

				if (modelsReady && currentDisplay >= 99) {
					if (shopProgressBar) shopProgressBar.style.width = '100%';
					if (shopProgressText) shopProgressText.innerText = '100%';
					
					setTimeout(() => {
						if (shopLoaderOverlay) shopLoaderOverlay.style.opacity = '0';
						if (fadeOverlay) fadeOverlay.style.opacity = '0';
						if (exitShopBtn) exitShopBtn.style.display = 'block';
						
						setTimeout(() => {
							if (shopLoaderOverlay) shopLoaderOverlay.style.display = 'none';
						}, 1000); 
					}, 200);
				} else {
					requestAnimationFrame(updateLoader);
				}
			};
			
			requestAnimationFrame(updateLoader);

			// Chargement du modèle
			Promise.all([
				new Promise((resolve, reject) => {
					loader.load('/models/record_shop.glb', resolve, (xhr) => {
						if (xhr.lengthComputable) {
							shopLoaded = xhr.loaded;
							shopTotal = xhr.total;
							calcProgress();
						}
					}, reject);
				}),
				new Promise((resolve, reject) => {
					loader.load('/models/alan.glb', resolve, (xhr) => {
						if (xhr.lengthComputable) {
							alanLoaded = xhr.loaded;
							alanTotal = xhr.total;
							calcProgress();
						}
					}, reject);
				})
			]).then(([shopGltf, alanGltf]) => {
				currentShopScene = shopGltf.scene;
				scene.add(currentShopScene);
				
				// CORRECTION: Actualisation de la matrice avant l'extraction des collisions
				currentShopScene.updateMatrixWorld(true);

				currentShopScene.traverse((child) => {
					if (child.isMesh) {
						shopColliders.push(child);
					}
				});

				player.setCollidableObjects(shopColliders);

				// À CHANGER!!! 
				if (player.mesh) {
					// Position abaissée sur Y et échelle augmentée pour le personnage
					player.mesh.position.set(0, -0.9, 4); 
					player.mesh.scale.set(6.5, 6.5, 6.5);
					player.movementOffset = -Math.PI / 2;
					player.mesh.visible = true;
					
					// CORRECTION: Agrandissement de la capsule physique proportionnellement à l'échelle visuelle
					player.playerRadius = 0.10 * 6.5;
					player.playerHeight = 0.5 * 6.5;
					player.playerCollider.radius = player.playerRadius;

					snapCameraTarget(player.mesh.position);
				}

				// À CHANGER!!	
				currentAlanModel = alanGltf.scene;
				currentAlanModel.scale.set(1.5, 1.5, 1.5);

				const chairObject = currentShopScene.getObjectByName('Chair');
				if (chairObject) {
					const chairPosition = new THREE.Vector3();
					chairObject.getWorldPosition(chairPosition);
					// Décalage corrigé pour qu'Alan sorte du meuble
					currentAlanModel.position.set(chairPosition.x - 0.8, chairPosition.y, chairPosition.z + 0.8);
				} else {
					// Position au sol sécurisée si la chaise n'est pas trouvée
					currentAlanModel.position.set(2, 0.1, 0);
					currentAlanModel.rotation.y = Math.PI / 2;
				}

				scene.add(currentAlanModel);

				if (alanGltf.animations && alanGltf.animations.length > 0) {
					alanMixer = new THREE.AnimationMixer(currentAlanModel);
					const idleClip = THREE.AnimationClip.findByName(alanGltf.animations, 'alan_idle');

					if (idleClip) {
						alanMixer.clipAction(idleClip).play();
					} else {
						alanMixer.clipAction(alanGltf.animations[0]).play();
					}
				}

				camera.position.set(15, 6.5, 0);
				camera.lookAt(0, 2.8, 0);

				modelsReady = true;
			}).catch(err => {
				console.error("Erreur lors du chargement de la scène shop :", err);
				modelsReady = true; 
			});
		}

		function transitionToWorld() {
			activeScene = 'transition';

			if (exitShopBtn)
				exitShopBtn.style.display = 'none';
			if (fadeOverlay)
				fadeOverlay.style.opacity = '1';

			setTimeout(() => {
				loadWorldScene();
				setTimeout(() => {
					if (fadeOverlay)
						fadeOverlay.style.opacity = '0';
				}, 500);
			}, 1000);
		}

		function loadWorldScene() {
			activeScene = 'world';

			if (currentShopScene) {
				scene.remove(currentShopScene);
				currentShopScene = null;
			}
			if (currentAlanModel) {
				scene.remove(currentAlanModel);
				currentAlanModel = null;
			}
			alanMixer = null;

			scene.background = new THREE.Color(skyColor);
			scene.fog = new THREE.Fog(skyColor, 10, 60);

			scene.children.forEach(child => {
				if (child.userData.isWorldObject)
					child.visible = true;
			});

			player.setCollidableObjects(worldColliders);

			if (player.mesh) {
				player.mesh.position.copy(recordShopPosition);
				player.mesh.position.z += 2;
				player.mesh.scale.set(1, 1, 1);
				player.movementOffset = 0;
				
				// CORRECTION: Réinitialisation de la capsule de collision à sa taille par défaut
				player.playerRadius = 0.10;
				player.playerHeight = 0.5;
				player.playerCollider.radius = player.playerRadius;
				
				snapCameraTarget(player.mesh.position);
			}
		}

		const clock = new THREE.Clock();
		let animationFrameId;

		function updateWorldCamera(deltaTime) {
			if (!player.mesh) return;

			if (!cameraTargetInitialized) {
				snapCameraTarget(player.mesh.position);
			}

			const offsetX = player.mesh.position.x - cameraTarget.x;
			const offsetZ = player.mesh.position.z - cameraTarget.z;
			const planarDistance = Math.sqrt(offsetX * offsetX + offsetZ * offsetZ);

			if (planarDistance > cameraDeadZoneRadius) {
				const excess = planarDistance - cameraDeadZoneRadius;
				const dirX = offsetX / planarDistance;
				const dirZ = offsetZ / planarDistance;

				const desiredX = cameraTarget.x + dirX * excess;
				const desiredZ = cameraTarget.z + dirZ * excess;

				const followT = 1 - Math.exp(-cameraFollowSpeed * deltaTime);
				cameraTarget.x += (desiredX - cameraTarget.x) * followT;
				cameraTarget.z += (desiredZ - cameraTarget.z) * followT;
			}

			cameraTarget.y = player.mesh.position.y;

			camera.position.copy(cameraTarget).add(cameraOffset);
			camera.lookAt(cameraTarget);
		}

		function animate() {
			const deltaTime = clock.getDelta();

			if (activeScene === 'world') {
				player.update(deltaTime);

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

				updateWorldCamera(deltaTime);
			}
			else if (activeScene === 'shop') {
				player.update(deltaTime);
				if (alanMixer) {
					alanMixer.update(deltaTime);
				}
			}

			renderer.render(scene, camera);
			animationFrameId = window.requestAnimationFrame(animate);
		}

		const handleResize = () => {
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(window.innerWidth, window.innerHeight);
		};

		window.addEventListener('resize', handleResize);

		animate();

		return () => {
			window.cancelAnimationFrame(animationFrameId);
			window.removeEventListener('resize', handleResize);
			window.removeEventListener('keydown', handleKeyDown);
			
			if (uiPrompt) {
				uiPrompt.removeEventListener('click', handleTouchPrompt);
				uiPrompt.removeEventListener('touchstart', handleTouchPrompt);
			}

			if (joystickZone) {
				joystickZone.removeEventListener('touchmove', handleTouchMove);
				joystickZone.removeEventListener('touchstart', handleTouchMove);
				joystickZone.removeEventListener('touchend', handleTouchEnd);
			}
			
			if (exitShopBtn) {
				exitShopBtn.removeEventListener('click', handleExit);
				exitShopBtn.removeEventListener('touchstart', handleExit);
			}

			dracoLoader.dispose();
			renderer.dispose();
		};
	}, []);

	return (
		<div className="map-container">
			
			{/* ECRAN DE CHARGEMENT PRINCIPAL */}
			<div 
				className="loading-screen"
				style={{
					opacity: isLoading ? 1 : 0,
					pointerEvents: isLoading ? 'all' : 'none'
				}}
			>
				<div className="loading-content">
					<h1 className="loading-title">
						Map in progress
					</h1>
					
					<p className="loading-subtitle">
						This project is still in progress.<br/>
						Come back later to see its full potential.
					</p>

					<div className="progress-container">
						<div className="progress-track">
							<div 
								className="progress-bar"
								style={{ width: `${progress}%` }} 
							/>
						</div>
						
						<div className="progress-text">
							{Math.round(progress)}%
						</div>
					</div>
				</div>
			</div>

			{/* BOUTON RETOUR A L'ACCUEIL */}
			<Link to="/" className="back-home-link">
				Back to home page
			</Link>

			{ /* LEAVE THE SHOP */}
			<button id="exit-shop-btn" className="exit-shop-btn">
				Exit Shop
			</button>

			{/* JOYSTICK */}
			<div 
				id="virtual-joystick" 
				className="virtual-joystick"
				style={{ display: isTouchDevice ? 'block' : 'none' }}
			>
				<div id="joystick-knob" className="joystick-knob" />
			</div>

			{/* OVERLAY DE FONDU NOIR */}
			<div id="fade-overlay" className="fade-overlay"></div>
			
			{/* ECRAN DE CHARGEMENT DU SHOP */}
			<div id="shop-loader-overlay" className="shop-loader-overlay">
				<div className="shop-progress-track">
					<div id="shop-progress-inner" className="shop-progress-inner" />
				</div>
				<div id="shop-progress-text" className="shop-progress-text">
					0%
				</div>
			</div>

			{/* */}
			<div id="ui-prompt" className="ui-prompt">
				{isTouchDevice ? "Tap here to enter" : "Press 'E' to enter"}
			</div>
			
			<canvas ref={canvasRef} className="map-canvas"></canvas>
		</div>
	);
}