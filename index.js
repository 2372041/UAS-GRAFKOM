import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/* SCENE */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

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
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(20, 30, 10);
scene.add(dirLight);

/* GROUND */
// const ground = new THREE.Mesh(
//   new THREE.PlaneGeometry(200, 200),
//   new THREE.MeshStandardMaterial({ color: 0x555555 })
// );
// ground.rotation.x = -Math.PI / 2;
// scene.add(ground);

// /* CITY */
// for (let x = -40; x <= 40; x += 6) {
//   for (let z = -40; z <= 40; z += 6) {
//     if (Math.random() > 0.7) {
//       const h = Math.random() * 10 + 5;
//       const building = new THREE.Mesh(
//         new THREE.BoxGeometry(4, h, 4),
//         new THREE.MeshStandardMaterial({ color: 0x888888 })
//       );
//       building.position.set(x, h / 2, z);
//       scene.add(building);
//     }
//   }
// }

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

    /* ===== LOAD GUNDAM SETELAH CITY ADA ===== */
    loader.load(
      "/models/gundam.glb",
      (gltf) => {
        const gundam = gltf.scene;
        gundam.scale.set(0.1, 0.1, 0.1);
        gundam.position.set(-0.5, 0.1, 0);

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
        monster.scale.set(0.5, 0.5, 0.5);
        monster.position.set(0.5, 0, 0);

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
