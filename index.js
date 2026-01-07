import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/* SCENE */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1026);

/* CAMERA */
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 6, 15);
camera.lookAt(0, 3, 0);


/* RENDERER */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

/* CONTROLS */
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

/* LIGHTING */
const moonLight = new THREE.DirectionalLight(0xb0c4ff, 0.8);
moonLight.position.set(20, 40, 10);
moonLight.castShadow = true;
scene.add(moonLight);

function addCityLights(city) {
  for (let i = 0; i < 30; i++) {
    const light = new THREE.PointLight(0xffcc88, 1, 20);
    light.position.set(
      (Math.random() - 0.5) * 30,
      Math.random() * 10 + 2,
      (Math.random() - 0.5) * 30
    );
    city.add(light);
  }
}

const gundamLight = new THREE.SpotLight(0xffffff, 2, 30, Math.PI / 6, 0.5);
gundamLight.position.set(-5, 15, 10);
gundamLight.target.position.set(-5, 0, 0);
scene.add(gundamLight);
scene.add(gundamLight.target);

const monsterLight = new THREE.SpotLight(0xff4444, 2, 30, Math.PI / 6, 0.5);
monsterLight.position.set(5, 15, 10);
monsterLight.target.position.set(5, 0, 0);
scene.add(monsterLight);
scene.add(monsterLight.target);


const loader = new GLTFLoader();
let city;
let monster;


/* ================= LOAD CITY ================= */
loader.load(
  "/models/city.glb",
  
  (gltf) => {
    city = gltf.scene;
    city.scale.set(15, 15, 15);
    city.position.set(0, 0, 0);

    city.traverse(obj => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });

    scene.add(city);
    addCityLights(city);


    /* ===== LOAD GUNDAM SETELAH CITY ADA ===== */
    loader.load(
      "/models/gundam.glb",
      (gltf) => {
        const gundam = gltf.scene;
        gundam.scale.set(0.5, 0.5, 0.5);
        gundam.position.set(-0.5, 1.5, 0);
        gundam.rotation.y = -Math.PI / 2;



        gundam.traverse(obj => {
          if (obj.isMesh) obj.castShadow = true;
        });

        city.add(gundam);
      }
    );

    /* ===== LOAD MONSTER SETELAH CITY ADA ===== */
    loader.load(
      "/models/tung_tung_tung_sahur.glb",
      (gltf) => {
        monster = gltf.scene;
        monster.scale.set(3, 3, 3);
        monster.position.set(5, 0, 0);
        monster.rotation.y = Math.PI / 1;



        monster.traverse(obj => {
          if (obj.isMesh) obj.castShadow = true;
        });

        city.add(monster);
      }
    );
  },
  undefined,
  (err) => console.error("Gagal load city:", err)
);





/* ANIMATE */
function animate() {
    if (monster) {
        monster.rotation.y += 0.002;
    }

    

    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

/* RESIZE */
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
