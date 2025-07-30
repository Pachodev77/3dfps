// Módulo para controles de movimiento tipo WASD
const movement = {
  forward: false,
  backward: false,
  left: false,
  right: false
};

export function setupControls() {
  window.addEventListener('keydown', (e) => {
    switch (e.code) {
      case 'KeyW': movement.forward = true; break;
      case 'KeyS': movement.backward = true; break;
      case 'KeyA': movement.left = true; break;
      case 'KeyD': movement.right = true; break;
    }
  });
  window.addEventListener('keyup', (e) => {
    switch (e.code) {
      case 'KeyW': movement.forward = false; break;
      case 'KeyS': movement.backward = false; break;
      case 'KeyA': movement.left = false; break;
      case 'KeyD': movement.right = false; break;
    }
  });
}

export function getMovementInput() {
  return { ...movement };
} 