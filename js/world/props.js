// Furniture and fun objects inside each room. The room's "props" value in rooms.json picks the set.
import * as THREE from 'three';

export function buildProps(r, H) {
  const fn = SETS[r.props];
  if (fn) fn(r, H);
}

// u, v go from 0 to 1 across the room (0 = x1/z1 side, 1 = x2/z2 side)
const at = (r, u, v) => [r.x1 + (r.x2 - r.x1) * u, r.z1 + (r.z2 - r.z1) * v];

function table(H, x, z, w, d, color, y = H.PLINTH) {
  H.box(w, 0.1, d, color, x, y + 0.75, z, { collide: true });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) H.box(0.1, 0.75, 0.1, '#6b3518', x + sx * (w / 2 - 0.1), y, z + sz * (d / 2 - 0.1));
  return y + 0.85;
}

function texturedBox(H, size, tex, x, y, z, rotY = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), new THREE.MeshLambertMaterial({ map: tex }));
  m.position.set(x, y + size / 2, z);
  m.rotation.y = rotY;
  H.root.add(m);
  H.addCol(x - size / 2, x + size / 2, z - size / 2, z + size / 2);
  return m;
}

function wallBoard(H, tex, w, h, x, y, z, rotY) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  H.root.add(m);
}

const SETS = {
  // ---------------- Maths Workshop ----------------
  workshop(r, H) {
    const P = H.PLINTH;
    // workbench with shapes
    const [bx, bz] = at(r, 0.15, 0.5);
    const top = table(H, bx, bz, 1.0, 2.6, '#c98b4f');
    H.cyl(0, 0.3, 0.45, '#ff5d8f', bx, top, bz - 0.8, { seg: 4 });                       // pyramid
    H.ball(0.22, '#3d7bff', bx, top + 0.22, bz - 0.2, { seg: 12 });                     // sphere
    H.cyl(0.18, 0.18, 0.4, '#2bb673', bx, top, bz + 0.4, { seg: 12 });                  // cylinder
    H.box(0.35, 0.35, 0.35, '#ffd23d', bx, top, bz + 0.95);                              // cube
    // blackboard on the back wall
    const [cx] = at(r, 0.5, 0);
    const board = H.labelTexture(['1 + 2 = 3   ½   ¾', '× ÷ %   △ □ ○'], '#2f5d3a', '#ffffff', 512, 256);
    wallBoard(H, board, 3, 1.5, cx, P + 1.5, r.z1 + H.WALL_T / 2 + 0.02, 0);
    // big number blocks
    const colors = ['#ff8a3d', '#3dd6ff', '#7dff6b', '#ff5d8f', '#b26bff', '#ffd23d'];
    const blocks = [['1', 0.62, 0.82], ['2', 0.77, 0.82], ['3', 0.7, 0.82, 0.62], ['+', 0.45, 0.88], ['÷', 0.88, 0.93], ['%', 0.62, 0.62]];
    blocks.forEach(([label, u, v, stackY], i) => {
      const [x, z] = at(r, u, v);
      const tex = H.labelTexture(label, colors[i], '#ffffff', 128, 128);
      texturedBox(H, 0.6, tex, x, P + (stackY ? 0.6 : 0), z, i * 0.3);
    });
    // abacus
    const [ax, az] = at(r, 0.5, 0.12);
    H.box(1.6, 0.08, 0.3, '#8b4513', ax, P, az, { collide: true });
    H.box(0.08, 1.2, 0.08, '#8b4513', ax - 0.76, P, az);
    H.box(0.08, 1.2, 0.08, '#8b4513', ax + 0.76, P, az);
    for (let row = 0; row < 4; row++) {
      const y = P + 0.3 + row * 0.25;
      H.box(1.5, 0.03, 0.03, '#999999', ax, y - 0.015, az);
      for (let b = 0; b < 5; b++) H.ball(0.07, colors[row], ax - 0.55 + b * 0.16 + (row % 2) * 0.2, y, az, { seg: 6 });
    }
  },

  // ---------------- Science Lab ----------------
  lab(r, H) {
    const P = H.PLINTH;
    const [tx, tz] = at(r, 0.6, 0.5);
    const top = table(H, tx, tz, 1.2, 2.6, '#e8e8e8');
    const liquids = ['#ff3d7f', '#3dd6ff', '#7dff6b'];
    liquids.forEach((c, i) => {
      const z = tz - 0.8 + i * 0.8;
      const liquid = new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.35 });
      H.cyl(0.07, 0.24, 0.32, c, tx, top, z, { seg: 10, material: liquid });
      H.cyl(0.06, 0.06, 0.2, '#dfeff7', tx, top + 0.32, z, { seg: 8 });
      // rising bubbles
      for (let b = 0; b < 3; b++) {
        const bub = H.ball(0.035, '#ffffff', tx, top + 0.4, z, { dynamic: true, seg: 5 });
        const offset = b / 3;
        H.W.updaters.push((dt, time) => {
          const k = (time * 0.6 + offset + i * 0.2) % 1;
          bub.position.y = top + 0.5 + k * 0.6;
          bub.position.x = tx + Math.sin(time * 3 + b) * 0.04;
          bub.scale.setScalar(1 - k * 0.6);
        });
      }
    });
    // toy rocket
    const [rx, rz] = at(r, 0.85, 0.85);
    H.cyl(0.32, 0.32, 1.5, '#ffffff', rx, P, rz, { seg: 10, collide: true });
    H.cyl(0, 0.32, 0.6, '#ff3d3d', rx, P + 1.5, rz, { seg: 10 });
    H.ball(0.12, '#3d7bff', rx, P + 1.05, rz + 0.3, { seg: 8 });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      H.box(0.06, 0.5, 0.35, '#ff3d3d', rx + Math.cos(a) * 0.36, P, rz + Math.sin(a) * 0.36, { rotY: -a });
    }
    // spinning Saturn
    const [sx, sz] = at(r, 0.2, 0.15);
    H.cyl(0.05, 0.25, 1.0, '#555555', sx, P, sz, { collide: true });
    const planet = new THREE.Group();
    planet.position.set(sx, P + 1.5, sz);
    H.root.add(planet);
    H.ball(0.4, '#f5b041', 0, 0, 0, { parent: planet, seg: 14 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.06, 4, 24), H.mat('#e59866'));
    ring.rotation.x = 1.2;
    planet.add(ring);
    H.W.updaters.push((dt) => { planet.rotation.y += dt * 0.8; });
    // potted plant
    const [px, pz] = at(r, 0.85, 0.15);
    H.cyl(0.3, 0.22, 0.45, '#c8693f', px, P, pz, { collide: true, seg: 8 });
    for (let i = 0; i < 6; i++) H.ball(0.2, '#2e9b45', px + Math.cos(i) * 0.15, P + 0.65 + (i % 3) * 0.15, pz + Math.sin(i) * 0.15, { seg: 6 });
    // poster
    const [cx] = at(r, 0.5, 0);
    const poster = H.labelTexture(['🧪 🔭 🧲 🌱', 'H₂O  ☀️  🌍'], '#1f4e79', '#ffffff', 512, 256);
    wallBoard(H, poster, 2.6, 1.3, cx, P + 1.6, r.z1 + H.WALL_T / 2 + 0.02, 0);
  },
};
