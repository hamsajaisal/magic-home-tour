// The child's cartoon character, with a simple walking animation.
import * as THREE from 'three';
import { mat } from './house.js';

export const PLAYER_RADIUS = 0.32;

export function createPlayer(look = {}) {
  const c = {
    skin: '#c68642', hair: '#2b1a10', shirt: look.shirt || '#3d7bff',
    shorts: look.shorts || '#1f3a7a', shoes: '#ff5d8f', bag: look.bag || '#ffb000',
  };
  const root = new THREE.Group();
  const body = new THREE.Group();          // everything that bobs while walking
  root.add(body);

  const part = (geo, color, x, y, z, parent = body) => {
    const m = new THREE.Mesh(geo, mat(color));
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  const limb = (x, y, len, w, color, endColor) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    body.add(pivot);
    part(new THREE.BoxGeometry(w, len, w), color, 0, -len / 2, 0, pivot);
    if (endColor) part(new THREE.BoxGeometry(w + 0.04, 0.1, w + 0.12), endColor, 0, -len + 0.03, 0.04, pivot);
    return pivot;
  };

  const legL = limb(-0.11, 0.62, 0.6, 0.15, c.skin, c.shoes);
  const legR = limb(0.11, 0.62, 0.6, 0.15, c.skin, c.shoes);
  part(new THREE.BoxGeometry(0.42, 0.22, 0.26), c.shorts, 0, 0.66, 0);
  part(new THREE.BoxGeometry(0.46, 0.48, 0.28), c.shirt, 0, 0.98, 0);
  part(new THREE.BoxGeometry(0.34, 0.4, 0.14), c.bag, 0, 1.0, -0.2);              // school bag
  const armL = limb(-0.3, 1.18, 0.5, 0.12, c.shirt);
  const armR = limb(0.3, 1.18, 0.5, 0.12, c.shirt);
  part(new THREE.SphereGeometry(0.07, 6, 4), c.skin, 0, -0.52, 0, armL);
  part(new THREE.SphereGeometry(0.07, 6, 4), c.skin, 0, -0.52, 0, armR);

  const head = new THREE.Group();
  head.position.set(0, 1.42, 0);
  body.add(head);
  part(new THREE.SphereGeometry(0.27, 12, 10), c.skin, 0, 0, 0, head);
  const hair = part(new THREE.SphereGeometry(0.29, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), c.hair, 0, 0.03, -0.02, head);
  hair.rotation.x = -0.25;
  part(new THREE.SphereGeometry(0.045, 6, 4), '#111111', -0.1, 0.03, 0.24, head);
  part(new THREE.SphereGeometry(0.045, 6, 4), '#111111', 0.1, 0.03, 0.24, head);
  part(new THREE.BoxGeometry(0.12, 0.03, 0.03), '#a0362a', 0, -0.1, 0.25, head);   // smile
  part(new THREE.SphereGeometry(0.04, 6, 4), '#ff8a8a', -0.17, -0.06, 0.2, head);  // cheeks
  part(new THREE.SphereGeometry(0.04, 6, 4), '#ff8a8a', 0.17, -0.06, 0.2, head);

  // soft round shadow under the feet (cheap, works in low graphics too)
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.35, 16),
    new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.22, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  root.add(shadow);

  root.traverse((o) => { if (o.isMesh && o !== shadow) o.castShadow = true; });

  let phase = 0;
  let idle = 0;
  function animate(dt, speed01) {
    phase += dt * 11 * speed01;
    idle += dt;
    const swing = Math.sin(phase) * 0.75 * speed01;
    legL.rotation.x = swing;
    legR.rotation.x = -swing;
    armL.rotation.x = -swing * 0.9;
    armR.rotation.x = swing * 0.9;
    body.position.y = Math.abs(Math.sin(phase)) * 0.06 * speed01 + Math.sin(idle * 2) * 0.01;
    head.rotation.z = Math.sin(phase * 0.5) * 0.05 * speed01;
  }

  // a happy jump, e.g. when a door opens
  let jumpT = -1;
  function cheer() { jumpT = 0; }
  function updateCheer(dt) {
    if (jumpT < 0) return;
    jumpT += dt;
    const k = jumpT / 0.6;
    body.position.y += Math.sin(Math.min(1, k) * Math.PI) * 0.45;
    armL.rotation.x = armR.rotation.x = -2.6 * Math.sin(Math.min(1, k) * Math.PI);
    if (k >= 1) jumpT = -1;
  }

  return { root, animate, cheer, updateCheer };
}
