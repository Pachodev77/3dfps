// Carga y control del avatar y sus animaciones
let FBXLoaderClass, THREERef;
let animations = {};
let currentAction = null;

export function setFBXLoader(FBXLoader, THREE) {
  FBXLoaderClass = FBXLoader;
  THREERef = THREE;
}

export async function createAvatar(scene) {
  return new Promise((resolve, reject) => {
    const loader = new FBXLoaderClass();
    loader.load('assets/soldier/Ch15_nonPBR.fbx', (model) => {
      model.scale.set(0.01, 0.01, 0.01);
      model.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      const mixer = new THREERef.AnimationMixer(model);
      // Cargar animaciones
      const animFiles = [
        { name: 'idle', file: 'Ch15_nonPBR@Rifle Aiming Idle.fbx' },
        { name: 'run', file: 'Ch15_nonPBR@Run Forward.fbx' },
        { name: 'strafeL', file: 'Ch15_nonPBR@StrafeL.fbx' },
        { name: 'strafeR', file: 'Ch15_nonPBR@StrafeR.fbx' },
        { name: 'back', file: 'Ch15_nonPBR@Backwards Rifle Run.fbx' }
      ];
      let loaded = 0;
      animFiles.forEach(anim => {
        loader.load('assets/soldier/' + anim.file, (animFBX) => {
          const clip = animFBX.animations[0];
          animations[anim.name] = mixer.clipAction(clip);
          loaded++;
          if (loaded === animFiles.length) {
            // Animación por defecto
            playAnimation('idle');
            scene.add(model);
            resolve({ model, mixer });
          }
        });
      });
    }, undefined, reject);
  });
}

export function updateAvatar(avatar, input, delta) {
  // Movimiento simple en el plano XZ
  const speed = 3;
  let moving = false;
  let direction = 0;
  if (input.forward) {
    avatar.position.z += Math.cos(avatar.rotation.y) * speed * delta;
    avatar.position.x += Math.sin(avatar.rotation.y) * speed * delta;
    moving = true;
    direction = 0;
  }
  if (input.backward) {
    avatar.position.z -= Math.cos(avatar.rotation.y) * speed * delta;
    avatar.position.x -= Math.sin(avatar.rotation.y) * speed * delta;
    moving = true;
    direction = Math.PI;
  }
  if (input.left) {
    avatar.rotation.y += 2 * delta;
    moving = true;
    direction = -Math.PI / 2;
  }
  if (input.right) {
    avatar.rotation.y -= 2 * delta;
    moving = true;
    direction = Math.PI / 2;
  }
  // Animaciones
  if (input.forward && !input.left && !input.right) {
    playAnimation('run');
  } else if (input.backward) {
    playAnimation('back');
  } else if (input.left) {
    playAnimation('strafeL');
  } else if (input.right) {
    playAnimation('strafeR');
  } else {
    playAnimation('idle');
  }
}

function playAnimation(name) {
  if (!animations[name]) return;
  if (currentAction === animations[name]) return;
  if (currentAction) {
    currentAction.fadeOut(0.15);
  }
  currentAction = animations[name];
  currentAction.reset().fadeIn(0.15).play();
}

export function getCurrentAnimation() {
  for (const name in animations) {
    if (animations[name] === currentAction) return name;
  }
  return 'idle';
}

export function playRemoteAnimation(avatar, name) {
  if (!animations[name]) return;
  if (avatar._currentRemoteAction === animations[name]) return;
  if (avatar._currentRemoteAction) {
    avatar._currentRemoteAction.fadeOut(0.15);
  }
  avatar._currentRemoteAction = animations[name];
  avatar._currentRemoteAction.reset().fadeIn(0.15).play();
} 