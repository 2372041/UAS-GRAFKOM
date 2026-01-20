import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/* ================= UI ELEMENTS & LOADING MANAGER ================= */
const loadingScreen = document.getElementById('loading-screen');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const hud = document.getElementById('hud');
const resultTitle = document.getElementById('result-title');
const resultDesc = document.getElementById('result-desc');
const btnPlay = document.getElementById('btn-play');
const btnRestart = document.getElementById('btn-restart');

// UI In-Game References
const php = document.getElementById("php");           // Bar Merah/Cyan
const mhp = document.getElementById("mhp");
const phpText = document.getElementById("php-text");  // Text Angka Player
const mhpText = document.getElementById("mhp-text");  // Text Angka Monster
const turnText = document.getElementById("turn");
const atkBtn = document.getElementById("atk");
const ultBtn = document.getElementById("ult");
const defBtn = document.getElementById("def");

// MANAGER LOADING
const manager = new THREE.LoadingManager();
manager.onLoad = function () {
    console.log('All assets loaded');
    loadingScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
};

/* ================= KONFIGURASI TIMING & DAMAGE ================= */
const CONFIG = {
    GUNDAM_LASER_DELAY: 4000, 
    GUNDAM_LASER_DURATION: 5000, 
    GODZILLA_LASER_DELAY: 5000, 
    GODZILLA_LASER_DURATION: 3000 
};

const DAMAGE = {
    ATK_BASE: 20,    
    ATK_RANDOM: 15,  
    ULT_BASE: 200,   
    ULT_RANDOM: 40,  
    ENEMY_DMG: 100,       
    ENEMY_DMG_DEFEND: 10 
};

/* ================= CORE ================= */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1026);
scene.fog = new THREE.FogExp2(0x0b1026, 0.015);
const clock = new THREE.Clock();
let timeScale = 1;

/* ================= CAMERA ================= */
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
const defaultCamPos = new THREE.Vector3(-20, 15, 20);
camera.position.copy(defaultCamPos);

/* ================= RENDERER ================= */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
document.body.appendChild(renderer.domElement);

/* ================= CONTROLS ================= */
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(7, 3, 0);
controls.enabled = false;

/* ================= LIGHT ================= */
scene.add(new THREE.AmbientLight(0x404060, 0.5));
const moon = new THREE.DirectionalLight(0xb0c4ff, 2);
moon.position.set(20, 40, 10);
moon.castShadow = true;
scene.add(moon);
const pointLight = new THREE.PointLight(0x4444ff, 1, 50);
pointLight.position.set(7, 10, 0);
scene.add(pointLight);

/* ================= AUDIO ================= */
const listener = new THREE.AudioListener();
camera.add(listener);

const audioLoader = new THREE.AudioLoader(manager);
const sfxSlash = new THREE.Audio(listener); 
const sfxBeam = new THREE.Audio(listener);  
const sfxScream = new THREE.Audio(listener);
const sfxRoar = new THREE.Audio(listener);   
const sfxBreath = new THREE.Audio(listener);
const sfxWin = new THREE.Audio(listener);    
const sfxWinRoar = new THREE.Audio(listener);   
const bgm = new THREE.Audio(listener);       

audioLoader.load("./sounds/slash.mp3", b => sfxSlash.setBuffer(b));
audioLoader.load("./sounds/beam.mp3", b => sfxBeam.setBuffer(b));
audioLoader.load("./sounds/scream.mp3", b => sfxScream.setBuffer(b));
audioLoader.load("./sounds/roar.mp3", b => sfxRoar.setBuffer(b));
audioLoader.load("./sounds/breath.mp3", b => sfxBreath.setBuffer(b));
audioLoader.load("./sounds/victoryroar.mp3", b => sfxWinRoar.setBuffer(b));
audioLoader.load("./sounds/gwin.mp3", b => sfxWin.setBuffer(b)); 
audioLoader.load("./sounds/bgm.mp3", b => {
    bgm.setBuffer(b);
    bgm.setLoop(true);   
    bgm.setVolume(0.2);  
});

function playSafe(a) { if (a.buffer && !a.isPlaying) a.play(); }
function startBGM() {
    if (bgm.buffer && !bgm.isPlaying && gameState !== GAME.WIN && gameState !== GAME.LOSE) {
        bgm.play();
    }
}

/* ================= GAME STATE & UI LOGIC ================= */
const GAME = {
  MENU: "MENU",
  PLAYER: "PLAYER TURN",
  PLAYER_ANIM: "GUNDAM ACTION",
  ENEMY: "ENEMY TURN",
  ENEMY_ANIM: "GODZILLA ACTION",
  WIN: "VICTORY",
  LOSE: "DEFEAT"
};

let gameState = GAME.MENU;
let isAction = false;
let gundamHP = 100;
let monsterHP = 300;
let defenseMode = false;
let godMode = false;
let atkMul = 1;

// --- FUNGSI UPDATE UI (BAR & TEXT) ---
function updateUI() {
    // Hitung Persentase
    const pPercent = Math.max(0, (gundamHP / 100) * 100);
    const mPercent = Math.max(0, (monsterHP / 300) * 100);

    // Update Lebar Bar
    php.style.width = pPercent + "%";
    mhp.style.width = mPercent + "%";

    // Update Angka Text
    phpText.innerText = `${Math.max(0, gundamHP)} / 100`;
    mhpText.innerText = `${Math.max(0, monsterHP)} / 300`;

    // Update Status Turn & Button
    turnText.innerText = gameState === GAME.MENU ? "" : gameState;
    const can = gameState === GAME.PLAYER && !isAction;
    atkBtn.disabled = ultBtn.disabled = defBtn.disabled = !can;
}

// --- FUNGSI FLOATING DAMAGE ---
function showFloatingDamage(position, damage) {
    // 1. Buat elemen
    const el = document.createElement("div");
    el.classList.add("damage-popup"); // Class ini ada di CSS index.html
    el.innerText = damage;
    document.body.appendChild(el);

    // 2. Kalkulasi posisi 3D ke 2D Screen
    const vec = position.clone();
    vec.y += 8; // Muncul agak di atas kepala model
    vec.project(camera);

    const x = (vec.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-(vec.y * 0.5) + 0.5) * window.innerHeight;

    // 3. Set posisi CSS
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    // 4. Hapus setelah animasi selesai
    setTimeout(() => {
        el.remove();
    }, 1500);
}

/* ================= LASER & EFFECTS ================= */
const effectGroup = new THREE.Group();
scene.add(effectGroup);
let atomicBeamMesh; let rifleBeamMesh; 

function createBeams() {
    const gGeo = new THREE.CylinderGeometry(1.2, 4, 70, 16, 1, true);
    gGeo.translate(0, 35, 0); gGeo.rotateX(Math.PI / 2); 
    const gMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    atomicBeamMesh = new THREE.Mesh(gGeo, gMat);
    atomicBeamMesh.visible = false;
    scene.add(atomicBeamMesh);

    const rGeo = new THREE.CylinderGeometry(0.5, 0.5, 70, 8, 1, true);
    rGeo.translate(0, 35, 0); rGeo.rotateX(Math.PI / 2);
    const rMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    rifleBeamMesh = new THREE.Mesh(rGeo, rMat);
    rifleBeamMesh.visible = false;
    scene.add(rifleBeamMesh);
}
createBeams();

function explode(pos, color, count) {
  const g = new THREE.BufferGeometry();
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i++) arr[i] = (Math.random() - .5) * 7;
  g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  const m = new THREE.PointsMaterial({ color, size: 0.6, transparent:true, opacity:0.8, blending: THREE.AdditiveBlending });
  const p = new THREE.Points(g, m);
  p.position.copy(pos);
  effectGroup.add(p);
  setTimeout(() => effectGroup.remove(p), 1500);
}

function camShake(intensity = 0.5, duration = 500) {
    const originalPos = camera.position.clone();
    const startTime = Date.now();
    const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const damp = 1 - (elapsed / duration);
        if (damp <= 0) {
            clearInterval(interval);
            return;
        }
        camera.position.x = originalPos.x + (Math.random() - 0.5) * intensity * damp;
        camera.position.y = originalPos.y + (Math.random() - 0.5) * intensity * damp;
    }, 30);
}

function setCinematic(px, py, pz, tx, ty, tz) {
    controls.enabled = false;
    camera.position.set(px, py, pz);
    controls.target.set(tx, ty, tz);
    controls.update(); 
}

function resetCam() {
    camera.position.copy(defaultCamPos);
    controls.target.set(7, 3, 0);
    controls.enabled = true;
    controls.update();
}

/* ================= MODELS ================= */
const loader = new GLTFLoader(manager);
let gundam, godzilla, gMix, zMix;
let gAct = {}, zAct = {};

loader.load("./models/city.glb", g => {
  g.scene.scale.set(15,15,15);
  scene.add(g.scene);
});

loader.load("./models/undam.glb", g => {
  gundam = g.scene;
  gundam.scale.set(5,5,5);
  gundam.position.set(-2,0,0);
  gundam.rotation.y = Math.PI / 2;
  scene.add(gundam);
  gMix = new THREE.AnimationMixer(gundam);
  g.animations.forEach(a => gAct[a.name] = gMix.clipAction(a));
  if(gAct.Idle) gAct.Idle.play();
});

loader.load("./models/godzilla_atomic_breath.glb", g => {
  godzilla = g.scene;
  godzilla.scale.set(0.1,0.1,0.1);
  godzilla.position.set(16,0,0);
  godzilla.rotation.y = Math.PI / -2;
  scene.add(godzilla);
  zMix = new THREE.AnimationMixer(godzilla);
  g.animations.forEach(a => {
    if (a.name === "Animation") zAct.action = zMix.clipAction(a);
    if (a.name.toLowerCase().includes("static")) zAct.idle = zMix.clipAction(a);
  });
  if(zAct.idle) zAct.idle.play();
});

/* ================= GAME FLOW ================= */
btnPlay.onclick = () => {
    startScreen.classList.add('hidden');
    hud.style.display = 'block';
    gameState = GAME.PLAYER;
    controls.enabled = true;
    startBGM();
    updateUI(); // Ensure UI is init
};

btnRestart.onclick = () => {
    gameOverScreen.classList.add('hidden');
    hud.style.display = 'block';
    resetGame();
};

function resetGame() {
    gundamHP = 100;
    monsterHP = 300;
    gameState = GAME.PLAYER;
    isAction = false;
    defenseMode = false;
    
    if(bgm.buffer && !bgm.isPlaying) bgm.play();
    resetCam();

    if(gundam) {
        gundam.position.set(-2,0,0);
        gundam.rotation.set(0, Math.PI / 2, 0); 
        resetGundamToIdle();
    }
    if(godzilla) {
        godzilla.position.set(16,0,0);
        godzilla.rotation.set(0, Math.PI / -2, 0); 
        resetGodzillaToIdle();
    }
    updateUI();
}

function showGameOver(win) {
    hud.style.display = 'none'; 
    gameOverScreen.classList.remove('hidden');
    
    if (win) {
        resultTitle.innerText = "VICTORY";
        resultTitle.style.color = "cyan";
        resultDesc.innerText = "TARGET NEUTRALIZED";
    } else {
        resultTitle.innerText = "DEFEAT";
        resultTitle.style.color = "red";
        resultDesc.innerText = "MOBILE SUIT DESTROYED";
    }
}

/* ================= BATTLE LOGIC ================= */
function checkDeath() {
    if (monsterHP <= 0) {
        monsterHP = 0;
        updateUI(); // Final update
        gameState = GAME.WIN;
        
        if(bgm.isPlaying) bgm.stop(); 
        playSafe(sfxWin); 
        
        setCinematic(5, 5, 8, -2, 5, 0);
        godzilla.rotation.x = -Math.PI / 2.2; 
        godzilla.position.y = -1.5;
        
        zMix.stopAllAction();
        if(zAct.idle) zAct.idle.reset().play(); 
        gMix.stopAllAction(); 
        if(gAct.Idle) gAct.Idle.play();

        setTimeout(() => showGameOver(true), 4000); 
        return true;
    }

    if (gundamHP <= 0) {
        gundamHP = 0;
        updateUI(); // Final update
        gameState = GAME.LOSE;
        
        if(bgm.isPlaying) bgm.stop(); 
        playSafe(sfxWinRoar);          

        setCinematic(6, 8, 8, 16, 20, 0);
        gundam.rotation.z = Math.PI / 2.2;
        gundam.position.y = 0.5;

        gMix.stopAllAction(); 
        if(gAct.Idle) gAct.Idle.reset().play(); 
        zMix.stopAllAction(); 
        if(zAct.idle) zAct.idle.play();

        setTimeout(() => showGameOver(false), 4000);
        return true;
    }
    return false;
}

function resetGundamToIdle() {
    if(gAct.Idle) {
        gAct.Javelin?.stop();
        gAct.Rifle?.stop();
        gAct.Idle.reset().play();
    }
}

function resetGodzillaToIdle() {
    if(zAct.idle) {
        zAct.action?.stop();
        zAct.idle.reset().play();
        if(zAct.action) zAct.action.setEffectiveTimeScale(1);
    }
}

// --- ACTIONS WITH DAMAGE TEXT ---

function attack() {
  startBGM(); 
  isAction = true;
  gameState = GAME.PLAYER_ANIM;
  setCinematic(5, 5, 8, -2, 5, 0);

  setTimeout(() => {
    gAct.Idle?.stop();
    gAct.Javelin?.reset().setLoop(THREE.LoopOnce).play();
    playSafe(sfxSlash);

    setTimeout(() => {
      setCinematic(7, 40, 1, 7, 0, 0);
      camShake(0.8, 500);

      // Hitung Damage
      const dmg = Math.floor((DAMAGE.ATK_BASE + Math.random()*DAMAGE.ATK_RANDOM) * atkMul);
      monsterHP -= dmg;
      
      // TAMPILKAN TEXT & UPDATE UI
      showFloatingDamage(godzilla.position, dmg);
      updateUI();
      
      explode(godzilla.position, 0xff0000, 70);
      
      if(zAct.action) zAct.action.reset().setLoop(THREE.LoopOnce).setEffectiveTimeScale(1).play();

      setTimeout(() => {
        resetCam();
        resetGundamToIdle();
        if(!checkDeath()) {
            gameState = GAME.ENEMY;
            setTimeout(enemyTurn, 1000);
        }
        isAction = false;
      }, 1200); 
    }, 900);
  }, 600);
}

function ultimate() {
  startBGM(); 
  isAction = true;
  gameState = GAME.PLAYER_ANIM;
  setCinematic(-5, 2, 6, -2, 7, 0);

  setTimeout(() => {
    gAct.Idle?.stop();
    gAct.Rifle?.reset().setLoop(THREE.LoopOnce).play();
    playSafe(sfxBeam); 

    setTimeout(() => {
        rifleBeamMesh.position.copy(gundam.position);
        rifleBeamMesh.position.y += 10; 
        rifleBeamMesh.position.z += 4; 
        rifleBeamMesh.position.x += 8; 
        rifleBeamMesh.lookAt(godzilla.position.x, godzilla.position.y + 7, godzilla.position.z);
        rifleBeamMesh.visible = true;

        setCinematic(-20, 15, 5, -2, 7, 0);
        camShake(1.5, 4000); 

        // Hitung Damage
        const dmg = Math.floor((DAMAGE.ULT_BASE + Math.random()*DAMAGE.ULT_RANDOM) * atkMul);
        monsterHP -= dmg;
        
        // TAMPILKAN TEXT & UPDATE UI
        showFloatingDamage(godzilla.position, dmg);
        updateUI();

        explode(godzilla.position, 0x00ffff, 250);

        if(zAct.action) zAct.action.reset().setLoop(THREE.LoopOnce).setEffectiveTimeScale(1).play();

        setTimeout(() => {
            rifleBeamMesh.visible = false;
            resetCam();
            resetGundamToIdle();
            if(!checkDeath()) {
                gameState = GAME.ENEMY;
                setTimeout(enemyTurn, 1000);
            }
            isAction = false;
        }, CONFIG.GUNDAM_LASER_DURATION); 
    }, CONFIG.GUNDAM_LASER_DELAY); 
  }, 1000);
}

function enemyTurn() {
  if (gameState === GAME.WIN || gameState === GAME.LOSE) return;
  isAction = true;
  gameState = GAME.ENEMY_ANIM;
  
  const isUlt = Math.random() > 0.6;
  const currentSfx = isUlt ? sfxBreath : sfxRoar;
  const waitTime = isUlt ? 9000 : 7000;
  const animSpeed = isUlt ? 0.15 : 0.2; 

  setCinematic(7, 40, 1, 7, 0, 0);

  setTimeout(() => {
    playSafe(currentSfx);
    if(zAct.idle) zAct.idle.stop();
    if(zAct.action) {
        zAct.action.reset().setLoop(THREE.LoopOnce);
        zAct.action.setEffectiveTimeScale(animSpeed); 
        zAct.action.play();
    }

    if(isUlt) {
        setTimeout(() => {
            atomicBeamMesh.position.copy(godzilla.position);
            atomicBeamMesh.position.y += 20; 
            atomicBeamMesh.position.x -= 1.5; 
            atomicBeamMesh.lookAt(gundam.position.x, gundam.position.y + 4, gundam.position.z); 
            atomicBeamMesh.visible = true;
            camShake(0.3, CONFIG.GODZILLA_LASER_DURATION); 
        }, CONFIG.GODZILLA_LASER_DELAY); 
    } else {
        camShake(0.5, 2000);
    }

    setTimeout(() => {
        setCinematic(-7, 4, 8, -2, 4, 0);
        camShake(1.5, 1000); 
        
        let dmg = defenseMode ? DAMAGE.ENEMY_DMG_DEFEND : DAMAGE.ENEMY_DMG;
        gundamHP -= dmg;
        
        // TAMPILKAN TEXT & UPDATE UI
        showFloatingDamage(gundam.position, dmg);
        updateUI();

        explode(gundam.position, isUlt ? 0x00ffff : 0xffee00, 100);
        defenseMode = false;

        setTimeout(() => {
            if(isUlt) atomicBeamMesh.visible = false;
            resetCam();
            resetGodzillaToIdle();

            if(!checkDeath()) {
                gameState = GAME.PLAYER;
                gAct.Idle?.play();
                updateUI();
            }
            isAction = false;
        }, 3000); 
    }, waitTime - 3000); 

  }, 1500); 
}

function defend() {
  startBGM(); 
  defenseMode = true;
  gameState = GAME.ENEMY;
  setTimeout(enemyTurn, 500);
}

/* ================= INPUT & LOOP ================= */
atkBtn.onclick = () => !isAction && gameState===GAME.PLAYER && attack();
ultBtn.onclick = () => !isAction && gameState===GAME.PLAYER && ultimate();
defBtn.onclick = () => !isAction && gameState===GAME.PLAYER && defend();
addEventListener("keydown", e => {
  if (e.key.toLowerCase() === "g") {
    godMode = !godMode;
    atkMul = godMode ? 5 : 1;
    console.log("God Mode:", godMode);
  }
});

function animate() {
  requestAnimationFrame(animate);
  const d = clock.getDelta() * timeScale;
  if(gMix) gMix.update(d);
  if(zMix) zMix.update(d);
  updateUI(); // Tidak perlu di loop agar hemat performance, dipanggil saat event saja
  controls.update();
  renderer.render(scene, camera);
}
animate();

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});