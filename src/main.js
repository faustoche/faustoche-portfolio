import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const canvas = document.querySelector('#webgl');

/**
 * Initialisation de la scène et de la caméra
 */
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 5;

/**
 * Initialisation du renderer
 */
const renderer = new THREE.WebGLRenderer({ canvas: canvas });
renderer.setSize(window.innerWidth, window.innerHeight);


/////////////////////////////////////////// 

// Lumière globale
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Soleil
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

const loader = new GLTFLoader();

// Création d'une horloge pour l'animation
const clock = new THREE.Clock();

// Création du ShaderMaterial pour l'eau
const waterMaterial = new THREE.ShaderMaterial({
    uniforms: {
        u_time: { value: 0.0 },
        // Un bleu-gris nettement plus clair
        u_waterColor: { value: new THREE.Color('#4A627A') }, 
        // Un rose très pâle, proche du blanc pour l'écume
        u_foamColor: { value: new THREE.Color('#F9E5E5') }  
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float u_time;
        uniform vec3 u_waterColor;
        uniform vec3 u_foamColor;
        varying vec2 vUv;

        void main() {
            // 1. ÉCHELLE : Réduite pour avoir beaucoup moins de lignes
            vec2 uv = vUv * 12.0; 
            
            // 2. DISTORSION ORGANIQUE : On tord les coordonnées avec le temps
            float t = u_time * 0.4;
            
            // Première couche de distorsion pour casser la grille
            uv.x += sin(uv.y * 0.8 + t) * 0.8;
            uv.y += cos(uv.x * 0.8 + t * 0.8) * 0.8;
            
            // Deuxième couche pour un effet encore plus aléatoire (style reflets d'eau)
            uv.x += cos(uv.y * 1.5 - t * 0.5) * 0.4;
            uv.y += sin(uv.x * 1.5 - t * 0.5) * 0.4;

            // 3. CRÉATION DES LIGNES
            // Sur cet espace désormais tordu, on trace notre onde
            float wave = sin(uv.x) * cos(uv.y);
            
            // On garde le principe de la ligne fine
            float foam = 1.0 - smoothstep(0.0, 0.15, abs(wave));

            // On mélange la couleur de fond et l'écume
            vec3 finalColor = mix(u_waterColor, u_foamColor, foam);

            gl_FragColor = vec4(finalColor, 1.0);
        }
    `
});

loader.load(
    '/models/world.glb',
    (gltf) => {
        gltf.scene.scale.set(0.1, 0.1, 0.1);
        scene.add(gltf.scene);

        // 1. CHERCHER L'OBJET PAR SON NOM
        const lampadaire = gltf.scene.getObjectByName('Street_lamp');

        if (lampadaire) {
            // 2. CRÉER LA LUMIÈRE DU LAMPADAIRE (Intensité de départ à 2 au lieu de 0)
            const lampLight = new THREE.PointLight(0xffddaa, 2, 100);
            
            // Ajustement de la hauteur par rapport à l'origine du modèle "Street_lamp"
            // Il faudra peut-être modifier le '5' selon la hauteur réelle de votre modèle
            lampLight.position.set(0, 25, 0); 

            // On ajoute la lumière en tant qu'enfant du lampadaire
            lampadaire.add(lampLight);
			const lightHelper = new THREE.PointLightHelper(lampLight, 2);
			scene.add(lightHelper);
        } else {
            console.warn("Le lampadaire n'a pas été trouvé dans le modèle.");
        }

		const planDeau = gltf.scene.getObjectByName('Water');

        if (planDeau) {
            // On remplace le matériau importé par notre shader
            planDeau.material = waterMaterial;
        } else {
            console.warn("Le plan d'eau n'a pas été trouvé. Vérifiez son nom.");
        }
    }
);

// Gérer le redimensionnement de la fenêtre
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});


// --- JOUEUR TEMPORAIRE ---
// --- JOUEUR TEMPORAIRE (Taille Humaine) ---
// --- JOUEUR TEMPORAIRE ---
// Modifiez ces trois valeurs jusqu'à ce que la taille vous convienne visuellement
const playerWidth = 0.4;
const playerHeight = 0.8; 
const playerDepth = 0.4;

const playerGeometry = new THREE.BoxGeometry(playerWidth, playerHeight, playerDepth); 
const playerMaterial = new THREE.MeshStandardMaterial({ color: 0x88ccff });
const player = new THREE.Mesh(playerGeometry, playerMaterial);

// Les pieds toucheront toujours le sol exactement à la moitié de la hauteur
player.position.set(0, playerHeight / 2, 0); 
scene.add(player);

// --- CONTRÔLES CLAVIER (WASD + Flèches) ---
const keys = { 
    w: false, a: false, s: false, d: false, 
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false 
};

window.addEventListener('keydown', (event) => {
    if (keys.hasOwnProperty(event.key)) keys[event.key] = true;
});

window.addEventListener('keyup', (event) => {
    if (keys.hasOwnProperty(event.key)) keys[event.key] = false;
});

// --- PARAMÈTRES DE LA CAMÉRA (Style Animal Crossing) ---
// L'offset représente la distance de la caméra par rapport au joueur.
// X = 0 (centré), Y = 8 (en hauteur), Z = 10 (reculé)
const cameraOffset = new THREE.Vector3(0, 4, 5);

/////////////////////////////////////////// 
// Variables pour le mouvement
const moveSpeed = 0.05;

function animate() {
    window.requestAnimationFrame(animate);
    
    // 1. Animation de l'eau (Votre code existant)
    const elapsedTime = clock.getElapsedTime();
    if (waterMaterial) {
        waterMaterial.uniforms.u_time.value = elapsedTime;
    }

    // 2. Déplacement du joueur
    if (keys.w || keys.ArrowUp)    player.position.z -= moveSpeed;
    if (keys.s || keys.ArrowDown)  player.position.z += moveSpeed;
    if (keys.a || keys.ArrowLeft)  player.position.x -= moveSpeed;
    if (keys.d || keys.ArrowRight) player.position.x += moveSpeed;

    // 3. Mise à jour de la caméra
    // La caméra se place à la position du joueur + l'offset défini plus haut
    camera.position.copy(player.position).add(cameraOffset);
    
    // La caméra regarde toujours exactement le joueur
    camera.lookAt(player.position);

    renderer.render(scene, camera);
}

animate();