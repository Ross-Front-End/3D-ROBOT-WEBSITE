import * as THREE from 'https://cdn.skypack.dev/three@0.128.0';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/loaders/GLTFLoader.js';

// Attiva il cursore custom solo se lo script sta girando (fallback: cursore normale se JS non parte)
document.body.classList.add('cursor-hide');

// Header: stato on-scroll
const headerEl = document.querySelector('.cyber-header');
const updateHeaderState = () => {
    if (!headerEl) return;
    headerEl.classList.toggle('is-scrolled', window.scrollY > 12);
};
updateHeaderState();
window.addEventListener('scroll', updateHeaderState, { passive: true });

// --- SETUP SCENA ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ 
    canvas: document.querySelector('#cyber-canvas'), 
    antialias: true, 
    alpha: true 
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
}, { passive: true });

// --- LUCI (POTENZIATE) ---
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5); // Molta luce ambientale
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0x00f2ff, 2.5);
mainLight.position.set(5, 10, 7);
scene.add(mainLight);

const fillLight = new THREE.PointLight(0xff00ff, 2);
fillLight.position.set(-5, 0, 5);
scene.add(fillLight);

// Griglia
const grid = new THREE.GridHelper(100, 40, 0x00f2ff, 0x001111);
grid.position.y = -2;
scene.add(grid);

camera.position.z = 5;

// --- LOGICA MODELLO & SALUTO ---
let model, mixer, animations;
let isGreeting = true; 

const loader = new GLTFLoader();
// Carichiamo il modello ufficiale di Three.js per sicurezza
loader.load('https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb', (gltf) => {
    model = gltf.scene;
    animations = gltf.animations;
    model.scale.set(0.8, 0.8, 0.8);
    model.position.y = -2;
    model.position.x = 0; // Inizia al centro per il saluto
    scene.add(model);

    mixer = new THREE.AnimationMixer(model);
    
    // Trova l'animazione "Wave" (Indice 12 di solito)
    const waveAnim = animations.find(a => a.name === 'Wave') || animations[12];
    const action = mixer.clipAction(waveAnim);
    action.setLoop(THREE.LoopOnce);
    action.clampWhenFinished = true;
    action.play();

    // Quando il saluto finisce
    mixer.addEventListener('finished', (e) => {
        if (e.action.getClip().name === 'Wave') {
            isGreeting = false;
            // Passa a Idle
            const idleAnim = animations.find(a => a.name === 'Idle') || animations[2];
            mixer.clipAction(idleAnim).fadeIn(0.5).play();
            
            // Sposta il robot a destra per lo scroll mode
            gsap.to(model.position, { x: 2, duration: 1.5, ease: "power2.inOut" });
        }
    });
}, undefined, (error) => {
    console.error("Errore nel caricamento del robot:", error);
});

// --- SCROLL ANIMATION ---
let scrollPercent = 0;
const backToTop = document.getElementById('backToTop');
if (backToTop) {
    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

window.addEventListener('scroll', () => {
    const denom = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    scrollPercent = Math.min(1, Math.max(0, window.pageYOffset / denom));
    document.querySelector('.scroll-progress').style.width = (scrollPercent * 100) + '%';
    if (backToTop) backToTop.classList.toggle('is-visible', window.pageYOffset > window.innerHeight * 0.6);
    
    if (model && !isGreeting) {
        model.rotation.y = scrollPercent * Math.PI * 2;
        model.position.x = 2 - (scrollPercent * 4.5);
        camera.position.z = 5 - (scrollPercent * 2.5);
    }
});

// --- CURSORE & TRAIL (Restano uguali a prima) ---
const cursor = document.querySelector('.cyber-cursor');
const follower = document.querySelector('.cyber-cursor-follower');
window.addEventListener('mousemove', (e) => {
    if (cursor) {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    }
    if (follower) {
        gsap.to(follower, { x: e.clientX, y: e.clientY, duration: 0.1 });
    }
});

// --- LOOP ANIMAZIONE ---
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);
    grid.position.z = (scrollPercent * 20) % 2; 
    renderer.render(scene, camera);
}
animate();