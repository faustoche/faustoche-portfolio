import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

import Player from './Player/Player.js';

export default function Map() {
  const canvasRef = useRef(null);
  const mountRef = useRef(false);

  useEffect(() => {
    if (mountRef.current) return;
    mountRef.current = true;

    let activeScene = 'world';
    let isNearShop = false;
    const recordShopPosition = new THREE.Vector3();
    let alanMixer = null;

    const uiPrompt = document.getElementById('ui-prompt');
    const fadeOverlay = document.getElementById('fade-overlay');

    const canvas = canvasRef.current;
    const scene = new THREE.Scene();

    const skyColor = '#87CEEB';
    scene.background = new THREE.Color(skyColor);
    scene.fog = new THREE.Fog(skyColor, 10, 60);

    const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

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

    // --- TABLEAU DES COLLISIONS ---
    const collidableObjects = [];

    const player = new Player(scene, '/models/faustine.glb', renderer, collidableObjects);
    const cameraOffset = new THREE.Vector3(0, 2.2, 4.4);

    // --- Caméra de suivi façon Animal Crossing (dead zone + damping) ---
    // Inchangée : cameraTarget est indépendant de player.mesh.position et ne
    // suit que lorsque le joueur sort de la zone morte, avec un rattrapage
    // amorti indépendant du framerate.
    const cameraTarget = new THREE.Vector3(0, 0, 0);
    const cameraDeadZoneRadius = 0.6;
    const cameraFollowSpeed = 4;
    let cameraTargetInitialized = false;

    function snapCameraTarget(position) {
      cameraTarget.copy(position);
      cameraTargetInitialized = true;
    }

    const loader = new GLTFLoader();
    const worldLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    worldLoader.setDRACOLoader(dracoLoader);

    loader.load('/models/trees.glb', (treesGltf) => {
      const treeVariations = [];
      treesGltf.scene.children.forEach((child) => {
        if (child.isGroup || child.isMesh) treeVariations.push(child);
      });

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

        worldLoader.load('/models/world_small.glb', (gltf) => {
          gltf.scene.scale.set(0.1, 0.1, 0.1);
          gltf.scene.updateMatrixWorld(true);
          scene.add(gltf.scene);

          gltf.scene.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;

              if (child.name !== 'Land_grass') {
                collidableObjects.push(child);
              }
            }
          });

          const shopObject = gltf.scene.getObjectByName('Outside recordshop');
          if (shopObject) {
            shopObject.getWorldPosition(recordShopPosition);
          } else {
            recordShopPosition.set(3, 0, -5);
          }

          const streetLamp = gltf.scene.getObjectByName('Street_lamp');
          if (streetLamp) {
            const lampLight = new THREE.PointLight(0xffddaa, 2, 100);
            lampLight.position.set(0, 25, 0);
            streetLamp.add(lampLight);
          }

          const shopsToReplace = [];
          shopsToReplace.forEach(shop => {
            const placeholder = gltf.scene.getObjectByName(shop.name);
            if (placeholder) {
              placeholder.visible = false;
              loader.load(shop.file, (gltfModel) => {
                const newModel = gltfModel.scene;
                newModel.traverse((child) => {
                  if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    collidableObjects.push(child);
                  }
                });
                newModel.position.copy(placeholder.position);
                newModel.rotation.copy(placeholder.rotation);
                if (shop.rotYOffset !== 0) newModel.rotateY(shop.rotYOffset);
                const s = shop.scaleOffset;
                newModel.scale.set(placeholder.scale.x * s, placeholder.scale.y * s, placeholder.scale.z * s);

                if (placeholder.parent) {
                  placeholder.parent.add(newModel);
                } else {
                  scene.add(newModel);
                }

                player.updateCollisionBoxes();
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

              instancedPatch.castShadow = false;
              instancedSingle.castShadow = false;
              instancedPatch.receiveShadow = true;
              instancedSingle.receiveShadow = true;

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
                  collidableObjects.push(instancedMesh);
                });
              });
            }
          }

          player.updateCollisionBoxes();
        });
      });
    });

    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === 'e' && isNearShop && activeScene === 'world') {
        transitionToShop();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    function transitionToShop() {
      activeScene = 'transition';

      if (uiPrompt) uiPrompt.style.display = 'none';
      if (fadeOverlay) fadeOverlay.style.opacity = '1';

      setTimeout(() => {
        loadShopScene();
        setTimeout(() => {
          if (fadeOverlay) fadeOverlay.style.opacity = '0';
        }, 1000);
      }, 1000);
    }

    function loadShopScene() {
      activeScene = 'shop';

      collidableObjects.length = 0;

      scene.children.forEach(child => {
        if (child.type !== 'AmbientLight' && child.type !== 'DirectionalLight' && child !== player.mesh) {
          child.visible = false;
        }
      });

      scene.background = new THREE.Color('#1a1a1a');
      scene.fog = null;

      loader.load('/models/record_shop.glb', (gltf) => {
        const shopScene = gltf.scene;
        scene.add(shopScene);

        shopScene.traverse((child) => {
          if (child.isMesh) {
            collidableObjects.push(child);
          }
        });

        player.updateCollisionBoxes();

        if (player.mesh) {
          player.mesh.position.set(0, 0, 4);
          player.mesh.scale.set(4, 4, 4);
          player.movementOffset = -Math.PI / 2;
          player.mesh.visible = true;

          snapCameraTarget(player.mesh.position);
        }

        loader.load('/models/alan.glb', (alanGltf) => {
          const alanModel = alanGltf.scene;
          alanModel.scale.set(0.9, 0.9, 0.9);

          const chairObject = shopScene.getObjectByName('Chair');
          if (chairObject) {
            const chairPosition = new THREE.Vector3();
            chairObject.getWorldPosition(chairPosition);
            alanModel.position.set(chairPosition.x + 1.5, chairPosition.y, chairPosition.z);
          } else {
            alanModel.position.set(2, 2, 0);
            alanModel.rotation.y = Math.PI / 2;
          }

          scene.add(alanModel);

          if (alanGltf.animations && alanGltf.animations.length > 0) {
            alanMixer = new THREE.AnimationMixer(alanModel);
            const idleClip = THREE.AnimationClip.findByName(alanGltf.animations, 'alan_idle');

            if (idleClip) {
              const action = alanMixer.clipAction(idleClip);
              action.play();
            } else {
              console.warn("The 'alan_idle' animation cannot be found.");
              alanMixer.clipAction(alanGltf.animations[0]).play();
            }
          }
        });

        camera.position.set(15, 6.5, 0);
        camera.lookAt(0, 2.8, 0);
      });
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
      dracoLoader.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Link to="/" style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 30, color: 'white', background: 'rgba(0,0,0,0.5)', padding: '10px 20px', textDecoration: 'none', borderRadius: '5px', fontFamily: 'sans-serif' }}>
        Back to home page
      </Link>
      <div id="fade-overlay" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'black', opacity: 0, pointerEvents: 'none', transition: 'opacity 1s ease-in-out', zIndex: 20 }}></div>
      <div id="ui-prompt" style={{ display: 'none', position: 'absolute', top: '75%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white', background: 'rgba(0,0,0,0.7)', padding: '15px 30px', borderRadius: '8px', fontFamily: 'sans-serif', pointerEvents: 'none', zIndex: 10 }}>
        Press 'E' to enter
      </div>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }}></canvas>
    </div>
  );
}