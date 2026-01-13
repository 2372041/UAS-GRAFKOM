import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
// Hapus import GUI karena tidak dipakai lagi

/* ================= SCENE SETUP ================= */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1026); 
scene.fog = new THREE.Fog(0x0b1026, 10, 130); 

const clock = new THREE.Clock();

/* ================= CAMERA ================= */
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(-6, 2, 10);
camera.lookAt(0, 2, 0);

/* ================= RENDERER ================= */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

/* ================= CONTROLS ================= */
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2 - 0.05;
controls.target.set(0, 1, 0);

/* ================= LIGHTING ================= */
scene.add(new THREE.AmbientLight(0x404060, 0.5));

 const moonLight = new THREE.DirectionalLight(0xb0c4ff, 1.5);
// moonLight.position.set(20, 40, 10);
// //  moonLight.castShadow = true;
// moonLight.shadow.camera.left = -50;
// moonLight.shadow.camera.right = 50;
// moonLight.shadow.camera.top = 50;
 moonLight.shadow.camera.bottom = -50;
 scene.add(moonLight);


/* ================= LOADERS ================= */
const loader = new GLTFLoader();
let city, monster;
let mixer; // Mixer animasi Gundam
let gundamContainer;

// 1. LOAD CITY
loader.load("/models/city.glb", (gltf) => {
  city = gltf.scene;
  city.scale.set(15, 15, 15);
  scene.add(city);
  
  city.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  
  addCityLights(city);
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
      }
  });
});

// 3. LOAD GUNDAM
loader.load("/models/undam.glb", (gltf) => {
    const model = gltf.scene;
  
    // --- WRAPPER AGAR GUNDAM TIDAK PECAH ---
    gundamContainer = new THREE.Group();
    gundamContainer.add(model);
    gundamContainer.scale.set(5.5, 5.5, 5.5);
    gundamContainer.position.set(-2, 0, 0); 
    gundamContainer.rotation.y = Math.PI / 2; 
    
    model.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
  
    scene.add(gundamContainer);
  
    // --- SETUP ANIMASI  ---
    mixer = new THREE.AnimationMixer(model);
    const clips = gltf.animations;

    // Cari animasi bernama "Draw_Javelin"
    const specificClip = THREE.AnimationClip.findByName(clips, 'Rilfe_and_Javelin');

    if (specificClip) {
        // Kalau ketemu, langsung play!
        const action = mixer.clipAction(specificClip);
        action.play();
    } else {
        // FALLBACK: Kalau nama "Draw_Javelin" salah/tidak ada, play animasi pertama yg ditemukan
        console.warn("Animasi 'Draw_Javelin' tidak ditemukan! Memainkan animasi pertama.");
        if (clips.length > 0) {
            mixer.clipAction(clips[0]).play();
        }
    }
});

/* ================= LOOP ================= */
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (mixer) mixer.update(delta);

  controls.update();
  renderer.render(scene, camera);
}
animate();

/* ================= RESIZE ================= */
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});