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
  H.W.boards.push(m);   // fades together with its wall
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

  // ---------------- Malayalam Reading Room ----------------
  reading(r, H) {
    const P = H.PLINTH;
    bookshelf(r, H, 0.25, 0.75);
    const [tx, tz] = at(r, 0.55, 0.3);
    const top = table(H, tx, tz, 1.6, 0.9, '#a0522d');
    H.box(0.5, 0.06, 0.35, '#fff8e1', tx - 0.3, top, tz);                        // open book
    H.box(0.02, 0.07, 0.35, '#c62828', tx - 0.3, top, tz);
    H.cyl(0.12, 0.1, 0.25, '#ffd23d', tx + 0.5, top, tz, { seg: 8 });            // pen stand
    for (const s of [-0.45, 0.45]) H.cyl(0.22, 0.22, 0.45, '#8b4513', tx + s, P, tz + 0.75, { seg: 8 });
    const [cx] = at(r, 0.5, 0);
    wallBoard(H, H.labelTexture(['അ ആ ഇ ഈ ഉ', 'ക ഖ ഗ ഘ ങ'], '#7b1f2a', '#ffffff', 512, 256), 2.6, 1.3, cx, P + 1.6, r.z1 + H.WALL_T / 2 + 0.02, 0);
  },

  // ---------------- English Corner ----------------
  english(r, H) {
    const P = H.PLINTH;
    bookshelf(r, H, 0.25, 0.75);
    const [tx, tz] = at(r, 0.5, 0.3);
    const top = table(H, tx, tz, 1.6, 0.9, '#5d8aa8');
    const colors = ['#ff5d8f', '#3dd6ff', '#7dff6b', '#ffd23d'];
    ['A', 'B', 'C', 'D'].forEach((L, i) => {
      const tex = H.labelTexture(L, colors[i], '#ffffff', 128, 128);
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), new THREE.MeshLambertMaterial({ map: tex }));
      m.position.set(tx - 0.55 + i * 0.37, top + 0.125, tz);
      m.rotation.y = (i - 1.5) * 0.25;
      H.root.add(m);
    });
    const [cx] = at(r, 0.5, 0);
    wallBoard(H, H.labelTexture(['A b c  Hello! 👋', 'read · write · speak'], '#1f3a7a', '#ffffff', 512, 256), 2.6, 1.3, cx, P + 1.6, r.z1 + H.WALL_T / 2 + 0.02, 0);
  },

  // ---------------- Social Science Room ----------------
  history(r, H) {
    const P = H.PLINTH;
    // a little Taj Mahal model on a stand
    const [mx, mz] = at(r, backU(r), 0.5);
    H.box(1.2, 0.7, 1.2, '#8b5a2b', mx, P, mz, { collide: true });
    const y = P + 0.7, white = '#f5f5f5';
    H.box(0.9, 0.08, 0.9, white, mx, y, mz);
    H.box(0.5, 0.35, 0.5, white, mx, y + 0.08, mz);
    H.ball(0.22, white, mx, y + 0.55, mz, { seg: 10 });
    H.cyl(0, 0.04, 0.12, '#ffd23d', mx, y + 0.74, mz, { seg: 6 });
    for (const [dx, dz] of [[-0.38, -0.38], [0.38, -0.38], [-0.38, 0.38], [0.38, 0.38]]) {
      H.cyl(0.035, 0.04, 0.5, white, mx + dx, y + 0.08, mz + dz, { seg: 6 });
    }
    // an old cannon
    const [kx, kz] = at(r, 0.5, 0.82);
    const barrel = H.cyl(0.11, 0.15, 1.0, '#444444', kx, P + 0.3, kz, { seg: 8 });
    barrel.rotation.z = Math.PI / 2 - 0.25;
    for (const s of [-0.22, 0.22]) {
      const wheel = H.cyl(0.25, 0.25, 0.06, '#6b3518', kx + 0.1, P + 0.25, kz + s, { seg: 10 });
      wheel.rotation.x = Math.PI / 2;
    }
    H.addCol(kx - 0.5, kx + 0.5, kz - 0.3, kz + 0.3);
    const [cx] = at(r, 0.5, 0);
    wallBoard(H, H.labelTexture(['🏰  📜  🗺️', 'Then · Now · Our Earth'], '#5b2c6f', '#ffffff', 512, 256), 2.6, 1.3, cx, P + 1.6, r.z1 + H.WALL_T / 2 + 0.02, 0);
  },

  // ---------------- Knowledge Room ----------------
  globe(r, H) {
    const P = H.PLINTH;
    const [gx, gz] = at(r, backU(r), 0.5);
    H.cyl(0.3, 0.4, 0.15, '#6b3518', gx, P, gz, { collide: true, seg: 10 });
    H.cyl(0.05, 0.05, 0.9, '#6b3518', gx, P + 0.15, gz);
    const globe = new THREE.Group();
    globe.position.set(gx, P + 1.5, gz);
    globe.rotation.z = 0.4;
    H.root.add(globe);
    H.ball(0.5, '#2e86de', 0, 0, 0, { parent: globe, seg: 16 });
    for (const [a, b, s] of [[0.3, 0.2, 0.22], [2.2, -0.3, 0.28], [4.0, 0.5, 0.2], [5.2, -0.1, 0.16]]) {
      H.ball(s, '#27ae60', Math.cos(a) * 0.4 * Math.cos(b), Math.sin(b) * 0.45, Math.sin(a) * 0.4 * Math.cos(b), { parent: globe, seg: 6 });
    }
    H.W.updaters.push((dt) => { globe.rotation.y += dt * 0.5; });
    // trophy shelf
    const [sx, sz] = at(r, 0.5, 0.85);
    H.box(2.2, 0.08, 0.5, '#a0522d', sx, P + 0.9, sz, { collide: true });
    H.box(0.08, 0.9, 0.5, '#a0522d', sx - 1.05, P, sz);
    H.box(0.08, 0.9, 0.5, '#a0522d', sx + 1.05, P, sz);
    [-0.7, 0, 0.7].forEach((dx, i) => {
      const gold = ['#ffc61a', '#c0c0c0', '#cd7f32'][i];
      H.cyl(0.08, 0.12, 0.08, gold, sx + dx, P + 0.98, sz, { seg: 8 });
      H.cyl(0.05, 0.03, 0.18, gold, sx + dx, P + 1.06, sz, { seg: 8 });
      H.cyl(0.16, 0.06, 0.2, gold, sx + dx, P + 1.24, sz, { seg: 10 });
    });
    const [cx] = at(r, 0.5, 0);
    wallBoard(H, H.labelTexture(['🌍  ❓  💡', 'Kerala · India · World'], '#7d6608', '#ffffff', 512, 256), 2.6, 1.3, cx, P + 1.6, r.z1 + H.WALL_T / 2 + 0.02, 0);
  },
};

// the wall opposite the door (where shelves and big models go)
const backU = (r) => (r.door === 'east' ? 0.13 : 0.87);

function bookshelf(r, H, v1, v2) {
  const P = H.PLINTH;
  const u = backU(r);
  const [x, z1] = at(r, u, v1);
  const [, z2] = at(r, u, v2);
  const len = z2 - z1, mid = (z1 + z2) / 2;
  H.box(0.45, 2.0, len, '#8b4513', x, P, mid, { collide: true });
  const colors = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#fb8c00'];
  const face = r.door === 'east' ? 0.2 : -0.2;
  for (let shelf = 0; shelf < 4; shelf++) {
    let zz = z1 + 0.12;
    let i = shelf;
    while (zz < z2 - 0.2) {
      const w = 0.12 + ((i * 7) % 5) * 0.025;
      const h = 0.3 + ((i * 3) % 4) * 0.04;
      H.box(0.3, h, w, colors[i % colors.length], x + face, P + 0.15 + shelf * 0.47, zz + w / 2);
      zz += w + 0.02;
      i++;
    }
  }
}
