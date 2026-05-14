import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import Water from './World/Water.js';
import Player from './Player/Player.js';

/**
 * Setup de base
 */
const canvas = document.querySelector('#webgl');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#87CEEB');

const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

/**
 * Lumières
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
directionalLight.position.set(5, 10, 5);
directionalLight.castShadow = true;
scene.add(directionalLight);

/**
 * Initialisation des Modules
 */
const water = new Water();
const player = new Player(scene);
const cameraOffset = new THREE.Vector3(0, 2, 3); //

/**
 * Chargement du Monde
 */
const loader = new GLTFLoader();
loader.load('/models/world_haaa.glb', (gltf) => {
	gltf.scene.scale.set(0.1, 0.1, 0.1);
	scene.add(gltf.scene);

	// Lampadaire
	const lampadaire = gltf.scene.getObjectByName('Street_lamp');
	if (lampadaire) {
		const lampLight = new THREE.PointLight(0xffddaa, 2, 100);
		lampLight.position.set(0, 25, 0); 
		lampadaire.add(lampLight);
	}

	// Eau
	const planDeau = gltf.scene.getObjectByName('Water');
	if (planDeau) {
		planDeau.material = water.material;
	}
});

/**
 * Boucle d'animation
 */
const clock = new THREE.Clock();

function animate() {
	const elapsedTime = clock.getElapsedTime();
	
	// Updates
	water.update(elapsedTime);
	player.update();

	// Caméra
	camera.position.copy(player.mesh.position).add(cameraOffset);
	camera.lookAt(player.mesh.position);

	renderer.render(scene, camera);
	window.requestAnimationFrame(animate);
}

window.addEventListener('resize', () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();