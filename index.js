import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/* SCENE SETUP */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1026); 
scene.fog = new THREE.Fog(0x0b1026, 10, 130); 

const clock = new THREE.Clock();

/* CAMERA */
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(-6, 10, 10);
camera.lookAt(0, 2, 0);

/* RENDERER */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

/* CONTROLS */
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 10, 0);

/* LIGHTING */
scene.add(new THREE.AmbientLight(0x404060, 0.5));

const moonLight = new THREE.DirectionalLight(0xb0c4ff, 1.5);
moonLight.position.set(20, 40, 10);
moonLight.castShadow = true;
moonLight.shadow.normalBias = 0.02; 
moonLight.shadow.mapSize.width = 2048;
moonLight.shadow.mapSize.height = 2048;
moonLight.shadow.camera.near = 0.1;
moonLight.shadow.camera.far = 100;
moonLight.shadow.camera.left = -50;
moonLight.shadow.camera.right = 50;
moonLight.shadow.camera.top = 50;
moonLight.shadow.camera.bottom = -50;
scene.add(moonLight);

// SLASH
const slashGeo = new THREE.PlaneGeometry(10, 0.5); 
const slashMat = new THREE.MeshBasicMaterial({ 
    color: 0xff0055, 
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0 
});
const slashMesh = new THREE.Mesh(slashGeo, slashMat);
slashMesh.visible = false; 
scene.add(slashMesh);

// LOADERS
const loader = new GLTFLoader();
let city, monster, gundamContainer, mixer;

let gundamAction;   
let monsterState = 'IDLE'; 
let hasBeenHit = false; 

const HIT_TIMING_RATIO = 0.35; 
const RESET_TIMING_RATIO = 0.90; 

// 1. LOAD CITY
loader.load("/models/city.glb", (gltf) => {
  city = gltf.scene;
  city.scale.set(15, 15, 15);
  scene.add(city);
  city.traverse((o) => { if(o.isMesh) o.receiveShadow = true; });
});

// 2. LOAD MONSTER
loader.load("/models/tung_tung_tung_sahur.glb", (gltf) => {
  monster = gltf.scene;
  monster.scale.set(13, 13, 13);
  monster.position.set(12, 0, 0); 
  monster.rotation.y = -Math.PI / -1; 
  scene.add(monster);
  monster.traverse((o) => {
      if(o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
          if(o.material) o.userData.originalColor = o.material.color.clone();
      }
  });
});

// 3. LOAD GUNDAM
loader.load("/models/undam.glb", (gltf) => {
    const model = gltf.scene;
    gundamContainer = new THREE.Group();
    gundamContainer.add(model);
    gundamContainer.scale.set(5.5, 5.5, 5.5);
    gundamContainer.position.set(-2, 0, 0); 
    gundamContainer.rotation.y = Math.PI / 2; 
    
    model.traverse((o) => {
      if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
    });
    scene.add(gundamContainer);
  
    // SETUP ANIMASI GUNDAM
    mixer = new THREE.AnimationMixer(model);
    const clips = gltf.animations;
    const specificClip = THREE.AnimationClip.findByName(clips, 'Javelin');

    if(specificClip) {
        gundamAction = mixer.clipAction(specificClip);
        gundamAction.play();
    }
});

// FUNGSI SLASH
function triggerSlashEffect() {
    if (!monster) return;

    // Reset Visual Slash
    slashMesh.position.copy(monster.position);
    slashMesh.position.y += 5; 
    slashMesh.position.x -= 2; 
    slashMesh.rotation.z = Math.PI / 4; 
    
    slashMesh.visible = true;
    slashMesh.material.opacity = 1;
    slashMesh.scale.set(1, 1, 1);

    // Flash Merah
    monster.traverse((o) => {
        if(o.isMesh && o.material) o.material.color.setHex(0xff0000); 
    });

    setTimeout(() => {
        monster.traverse((o) => {
            if(o.isMesh && o.material && o.userData.originalColor) {
                o.material.color.copy(o.userData.originalColor);
            }
        });
    }, 150);
}

// Fungsi Animasi
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (mixer) mixer.update(delta);

  // 1. LOGIKA SINKRONISASI ANIMASI
  if (gundamAction && monster) {
      const duration = gundamAction.getClip().duration;
      const time = gundamAction.time % duration;
      const progress = time / duration;

      if (progress > HIT_TIMING_RATIO && !hasBeenHit) {
          triggerSlashEffect();
          monsterState = 'FALLING';
          hasBeenHit = true; 
      }

      if (progress > RESET_TIMING_RATIO && hasBeenHit) {
          monsterState = 'RISING';
      }

      if (progress < 0.1 && hasBeenHit) {
          hasBeenHit = false;
      }
  }

  // 2. VISUAL SLASH
  if (slashMesh.visible) {
      slashMesh.scale.x += 15 * delta; 
      slashMesh.scale.y += 2 * delta;
      slashMesh.material.opacity -= 3.0 * delta; 
      if (slashMesh.material.opacity <= 0) slashMesh.visible = false;
  }

  // 3. LOGIKA GERAK JATUH/BANGUN MONSTER
  if (monster) {
      const fallRotation = -Math.PI / 2;
      const standRotation = 0;           
      
      const fallSpeed = 6.0; 
      const riseSpeed = 3.0; 

      if (monsterState === 'FALLING' || monsterState === 'DEAD') {

          if (monster.rotation.x > fallRotation) {
              monster.rotation.x -= fallSpeed * delta;
              monster.position.x += 3 * delta;
          } else {
              monster.rotation.x = fallRotation;
              monsterState = 'DEAD'; 
          }
      } 
      else if (monsterState === 'RISING') {
        
          if (monster.rotation.x < standRotation) {
              monster.rotation.x += riseSpeed * delta;
              monster.position.x -= 1.5 * delta;
          } else {
              monster.rotation.x = standRotation;
              monsterState = 'IDLE'; 
          }
      }
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();

// RESIZE
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});