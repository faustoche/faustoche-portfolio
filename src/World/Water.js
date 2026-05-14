import * as THREE from 'three';

export default class Water {
	constructor() {
		this.material = new THREE.ShaderMaterial({
			uniforms: {
				u_time: { value: 0.0 },
				u_waterColor: { value: new THREE.Color('#8ab2dd') }, 
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
					vec2 uv = vUv * 12.0; 
					float t = u_time * 0.4;
					
					uv.x += sin(uv.y * 0.8 + t) * 0.8;
					uv.y += cos(uv.x * 0.8 + t * 0.8) * 0.8;
					uv.x += cos(uv.y * 1.5 - t * 0.5) * 0.4;
					uv.y += sin(uv.x * 1.5 - t * 0.5) * 0.4;

					float wave = sin(uv.x) * cos(uv.y);
					float foam = 1.0 - smoothstep(0.0, 0.15, abs(wave));
					vec3 finalColor = mix(u_waterColor, u_foamColor, foam);

					gl_FragColor = vec4(finalColor, 1.0);
				}
			`
		});
	}

	update(time) {
		this.material.uniforms.u_time.value = time;
	}
}