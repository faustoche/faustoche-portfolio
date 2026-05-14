import * as THREE from 'three';

export default class Player {
	constructor(scene) {
		this.scene = scene;
		
		// Paramètres de taille
		this.width = 0.4;
		this.height = 0.8;
		this.depth = 0.4;
		this.moveSpeed = 0.05;

		// État des touches
		this.keys = { 
			w: false, a: false, s: false, d: false, 
			ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false 
		};

		this.init();
		this.initEvents();
	}

	init() {
		const geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
		const material = new THREE.MeshStandardMaterial({ color: 0x88ccff });
		this.mesh = new THREE.Mesh(geometry, material);
		
		// Pieds sur le sol
		this.mesh.position.set(0, this.height / 2, 0); 
		this.scene.add(this.mesh);
	}

	initEvents() {
		window.addEventListener('keydown', (e) => {
			if (this.keys.hasOwnProperty(e.key)) this.keys[e.key] = true;
		});
		window.addEventListener('keyup', (e) => {
			if (this.keys.hasOwnProperty(e.key)) this.keys[e.key] = false;
		});
	}

	update() {
		if (this.keys.w || this.keys.ArrowUp)    this.mesh.position.z -= this.moveSpeed;
		if (this.keys.s || this.keys.ArrowDown)  this.mesh.position.z += this.moveSpeed;
		if (this.keys.a || this.keys.ArrowLeft)  this.mesh.position.x -= this.moveSpeed;
		if (this.keys.d || this.keys.ArrowRight) this.mesh.position.x += this.moveSpeed;
	}
}