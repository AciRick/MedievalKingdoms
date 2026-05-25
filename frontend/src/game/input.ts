// Input gestito direttamente nella scena Phaser via cursors e WASD.
// Questo file è un placeholder per eventuali future estensioni di input.

export const MOVEMENT_SPEED = 160; // px/s

export function getDirection(keys: {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}): { dx: number; dy: number } {
  let dx = 0;
  let dy = 0;
  if (keys.left) dx -= 1;
  if (keys.right) dx += 1;
  if (keys.up) dy -= 1;
  if (keys.down) dy += 1;

  // Normalizza
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len > 0) {
    dx /= len;
    dy /= len;
  }
  return { dx, dy };
}
