import * as THREE from './three-build/three.module.js';
import { FBXLoader } from './three-examples/FBXLoader.js';
import { createAvatar, updateAvatar, setFBXLoader, getCurrentAnimation, playRemoteAnimation } from './avatar.js';
import { setupControls, getMovementInput } from './controls.js';

let scene, camera, renderer, clock;
let avatar, mixer;
let socket;
let remotePlayers = {};
let remoteAvatars = {};
let remoteMixers = {};
let remoteAnimNames = {};
let avatarModelCache = null;

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222233);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 2, 5);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Luz
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
  hemiLight.position.set(0, 20, 0);
  scene.add(hemiLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 10, 7.5);
  scene.add(dirLight);

  // Plano suelo
  const planeGeo = new THREE.PlaneGeometry(20, 20);
  const planeMat = new THREE.MeshStandardMaterial({ color: 0x556677 });
  const plane = new THREE.Mesh(planeGeo, planeMat);
  plane.rotation.x = -Math.PI / 2;
  plane.receiveShadow = true;
  scene.add(plane);

  // Reloj para animaciones
  clock = new THREE.Clock();

  // Avatar y animaciones
  setFBXLoader(FBXLoader, THREE); // Paso la referencia de FBXLoader y THREE al avatar
  createAvatar(scene).then(({ model, mixer: m }) => {
    avatar = model;
    mixer = m;
    avatarModelCache = model.clone(); // cache para remotos
    connectSocket();
  });

  // Controles
  setupControls();

  window.addEventListener('resize', onWindowResize);
}

function connectSocket() {
  socket = io();
  // Enviar info inicial
  socket.emit('new-player', {
    position: { x: avatar.position.x, y: avatar.position.y, z: avatar.position.z },
    rotation: { y: avatar.rotation.y },
    anim: getCurrentAnimation()
  });

  // Recibir todos los jugadores actuales
  socket.on('all-players', (players) => {
    for (const id in players) {
      if (id !== socket.id && !remotePlayers[id]) {
        addRemotePlayer(id, players[id]);
      }
    }
  });

  // Nuevo jugador
  socket.on('player-joined', (data) => {
    if (!remotePlayers[data.id]) {
      addRemotePlayer(data.id, data);
    }
  });

  // Actualización de otro jugador
  socket.on('update-player', (data) => {
    if (remotePlayers[data.id]) {
      remotePlayers[data.id] = { ...remotePlayers[data.id], ...data };
      remoteAnimNames[data.id] = data.anim;
    }
  });

  // Jugador se va
  socket.on('player-left', (id) => {
    if (remoteAvatars[id]) {
      scene.remove(remoteAvatars[id]);
      delete remoteAvatars[id];
      delete remotePlayers[id];
      delete remoteMixers[id];
      delete remoteAnimNames[id];
    }
  });
}

function addRemotePlayer(id, data) {
  remotePlayers[id] = data;
  // Usar el modelo cacheado para optimizar
  if (avatarModelCache) {
    const model = avatarModelCache.clone();
    model.position.set(data.position.x, data.position.y, data.position.z);
    model.rotation.y = data.rotation.y;
    scene.add(model);
    remoteAvatars[id] = model;
  } else {
    // fallback: cargar de nuevo si no hay cache
    createAvatar(scene).then(({ model }) => {
      model.position.set(data.position.x, data.position.y, data.position.z);
      model.rotation.y = data.rotation.y;
      remoteAvatars[id] = model;
    });
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);
  if (avatar) {
    const input = getMovementInput();
    updateAvatar(avatar, input, delta);
    updateCamera();
    // Enviar estado al servidor
    if (socket && socket.connected) {
      socket.emit('update-player', {
        position: { x: avatar.position.x, y: avatar.position.y, z: avatar.position.z },
        rotation: { y: avatar.rotation.y },
        anim: getCurrentAnimation()
      });
    }
  }
  // Actualizar avatares remotos y animaciones
  for (const id in remoteAvatars) {
    const remote = remotePlayers[id];
    if (remote) {
      remoteAvatars[id].position.set(remote.position.x, remote.position.y, remote.position.z);
      remoteAvatars[id].rotation.y = remote.rotation.y;
      playRemoteAnimation(remoteAvatars[id], remoteAnimNames[id] || 'idle');
    }
  }
  renderer.render(scene, camera);
}

function updateCamera() {
  // Cámara en tercera persona detrás del avatar
  const offset = new THREE.Vector3(0, 2, -5);
  if (avatar) {
    const avatarPos = avatar.position.clone();
    const avatarDir = new THREE.Vector3(0, 0, 1).applyQuaternion(avatar.quaternion);
    const camPos = avatarPos.clone().add(offset.applyQuaternion(avatar.quaternion));
    camera.position.lerp(camPos, 0.15);
    camera.lookAt(avatarPos.x, avatarPos.y + 1.5, avatarPos.z);
  }
} 