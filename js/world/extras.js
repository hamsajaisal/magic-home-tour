// The revision cupboard (questions the child got wrong) and the wishing well (mixed-subject quiz).
import * as THREE from 'three';
import { PLINTH, mat, labelTexture, emojiTexture } from './house.js';

const CUPBOARD = { x: 0, z: -7.35 };
const WELL = { x: -12, z: 16 };

function sign(root, x, y, z, rotY = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.5), new THREE.MeshBasicMaterial({ transparent: true }));
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  root.add(m);
  return m;
}

function floating(root, emoji, x, y, z) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture(emoji), depthWrite: false }));
  s.scale.set(0.8, 0.8, 1);
  s.position.set(x, y, z);
  root.add(s);
  return s;
}

export function createExtras({ scene, W }) {
  const root = new THREE.Group();
  scene.add(root);
  const add = (geo, color, x, y, z) => {
    const m = new THREE.Mesh(geo, mat(color));
    m.position.set(x, y, z);
    root.add(m);
    return m;
  };

  // ---- the old wooden almirah against the back wall ----
  const { x, z } = CUPBOARD;
  add(new THREE.BoxGeometry(1.7, 2.2, 0.6), '#7a3e1d', x, PLINTH + 1.1, z);
  add(new THREE.BoxGeometry(0.78, 1.9, 0.04), '#9c5a2e', x - 0.41, PLINTH + 1.15, z + 0.31);
  add(new THREE.BoxGeometry(0.78, 1.9, 0.04), '#9c5a2e', x + 0.41, PLINTH + 1.15, z + 0.31);
  add(new THREE.BoxGeometry(1.8, 0.12, 0.66), '#5a2c12', x, PLINTH + 2.25, z);
  for (const s of [-0.06, 0.06]) add(new THREE.SphereGeometry(0.04, 6, 4), '#ffc61a', x + s, PLINTH + 1.1, z + 0.35);
  W.colliders.push({ minX: x - 0.9, maxX: x + 0.9, minZ: z - 0.35, maxZ: z + 0.35, on: true });
  const cupboardSign = sign(root, x, PLINTH + 2.65, z + 0.2);
  const cupboardIcon = floating(root, '📚', x, PLINTH + 3.3, z);

  // ---- a sign and sparkle at the well in the garden ----
  const wellSign = sign(root, WELL.x, 3.0, WELL.z, Math.PI / 4);
  const wellIcon = floating(root, '✨', WELL.x, 3.7, WELL.z);

  return {
    cupboard: { pos: [x, z + 1.0] },
    well: { pos: [WELL.x, WELL.z] },
    refreshSigns(names, wrongCount) {
      for (const [m, text, bg] of [[cupboardSign, `📚 ${names.cupboard}${wrongCount ? ` (${wrongCount})` : ''}`, '#7a3e1d'], [wellSign, `🪣 ${names.well}`, '#1d6fa3']]) {
        m.material.map?.dispose();
        m.material.map = labelTexture(text, bg, '#ffffff');
        m.material.needsUpdate = true;
      }
    },
    update(dt, time) {
      cupboardIcon.position.y = PLINTH + 3.3 + Math.sin(time * 2) * 0.12;
      wellIcon.position.y = 3.7 + Math.sin(time * 2 + 1) * 0.12;
      wellIcon.material.rotation = Math.sin(time) * 0.3;
    },
  };
}
