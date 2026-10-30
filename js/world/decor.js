// Things bought in the shop: decorations around the house and pets that follow the child.
import * as THREE from 'three';
import { PLINTH, mat, floorHeight } from './house.js';
import { collide } from './physics.js';
import { makeKitten } from './surprises.js';

function addMesh(parent, geo, material, x, y, z) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
const boxG = (w, h, d) => new THREE.BoxGeometry(w, h, d);

// ---------------- decorations ----------------
const BUILD = {
  flowerpots(g, H) {
    const colors = ['#ff2d55', '#ffcc00', '#ff8a3d', '#b26bff', '#ff5d8f', '#ffffff'];
    let i = 0;
    for (const z of [13.5, 17, 20.5]) for (const x of [-1.9, 1.9]) {
      addMesh(g, new THREE.CylinderGeometry(0.28, 0.2, 0.45, 8), mat('#c8693f'), x, 0.22, z);
      addMesh(g, new THREE.SphereGeometry(0.28, 8, 6), mat('#3c9a3c'), x, 0.6, z);
      for (let k = 0; k < 4; k++) addMesh(g, new THREE.SphereGeometry(0.09, 6, 4), mat(colors[(i + k) % colors.length]), x + Math.cos(k * 1.6) * 0.22, 0.72 + (k % 2) * 0.08, z + Math.sin(k * 1.6) * 0.22);
      H.addCol(x - 0.3, x + 0.3, z - 0.3, z + 0.3);
      i++;
    }
  },
  starLantern(g, H) {
    const shape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.16 : 0.38, a = (i / 10) * Math.PI * 2 + Math.PI / 2;
      i ? shape.lineTo(Math.cos(a) * r, Math.sin(a) * r) : shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false });
    geo.center();
    ['#ff3d3d', '#ffd23d'].forEach((c, i) => {
      const x = i ? 3.6 : -3.6;
      const star = addMesh(g, geo, new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.5 }), x, PLINTH + 1.9, 10.95);
      addMesh(g, new THREE.CylinderGeometry(0.01, 0.01, 0.5, 3), mat('#444444'), x, PLINTH + 2.35, 10.95);
      H.updaters.push((dt, time) => { star.rotation.y = Math.sin(time + i) * 0.6; });
    });
  },
  fairyLights(g, H) {
    const colors = ['#ff3d3d', '#ffd23d', '#3dd6ff', '#7dff6b', '#ff5dd6'];
    for (let i = 0; i <= 26; i++) {
      const k = i / 26;
      const x = -6.5 + k * 13;
      const y = PLINTH + 2.38 - Math.abs(Math.sin(k * Math.PI * 4)) * 0.18;
      const bulb = addMesh(g, new THREE.SphereGeometry(0.06, 6, 4), new THREE.MeshBasicMaterial({ color: colors[i % colors.length] }), x, y, 11.75);
      H.updaters.push((dt, time) => { bulb.scale.setScalar(0.7 + Math.max(0, Math.sin(time * 3 + i * 1.3)) * 0.6); });
    }
  },
  pookalam(g) {
    const rings = [[1.3, '#e53935'], [1.1, '#ff8a3d'], [0.9, '#ffd23d'], [0.7, '#ffffff'], [0.5, '#8e24aa'], [0.3, '#43a047'], [0.12, '#ffd23d']];
    rings.forEach(([r, c], i) => addMesh(g, new THREE.CylinderGeometry(r, r, 0.02, 24), mat(c), -5.5, 0.01 + i * 0.006, 15.5));
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      addMesh(g, new THREE.SphereGeometry(0.1, 6, 4), mat(i % 2 ? '#ff2d55' : '#ffcc00'), -5.5 + Math.cos(a) * 1.0, 0.07, 15.5 + Math.sin(a) * 1.0);
    }
  },
  aquarium(g, H) {
    const x = 2.7, z = 7.3;
    addMesh(g, boxG(1.3, 0.7, 0.55), mat('#8b4513'), x, PLINTH + 0.35, z);
    addMesh(g, boxG(1.2, 0.08, 0.5), mat('#f2d49b'), x, PLINTH + 0.74, z);
    addMesh(g, boxG(1.24, 0.7, 0.54), new THREE.MeshLambertMaterial({ color: '#4fc3f7', transparent: true, opacity: 0.35 }), x, PLINTH + 1.05, z);
    for (let i = 0; i < 3; i++) addMesh(g, new THREE.ConeGeometry(0.05, 0.4, 5), mat('#2e9b45'), x - 0.4 + i * 0.4, PLINTH + 0.95, z - 0.1);
    ['#ff8a3d', '#ffd23d', '#ff5d8f'].forEach((c, i) => {
      const fish = new THREE.Group();
      addMesh(fish, new THREE.SphereGeometry(0.07, 6, 4), mat(c), 0, 0, 0).scale.set(1.5, 1, 0.7);
      addMesh(fish, new THREE.ConeGeometry(0.05, 0.1, 4), mat(c), -0.13, 0, 0).rotation.z = Math.PI / 2;
      g.add(fish);
      H.updaters.push((dt, time) => {
        const s = Math.sin(time * (0.6 + i * 0.2) + i * 2);
        fish.position.set(x + s * 0.45, PLINTH + 0.95 + i * 0.12, z + Math.cos(time + i) * 0.1);
        fish.rotation.y = Math.cos(time * (0.6 + i * 0.2) + i * 2) > 0 ? 0 : Math.PI;
      });
    });
    H.addCol(x - 0.65, x + 0.65, z - 0.3, z + 0.3);
  },
  swing(g, H) {
    const x = -3.8, z = 9.4, top = PLINTH + 2.55;
    addMesh(g, boxG(1.8, 0.1, 0.1), mat('#6b3518'), x, top, z);
    const pivot = new THREE.Group();
    pivot.position.set(x, top, z);
    g.add(pivot);
    for (const s of [-0.65, 0.65]) addMesh(pivot, new THREE.CylinderGeometry(0.015, 0.015, 1.95, 4), mat('#999999'), s, -0.98, 0);
    addMesh(pivot, boxG(1.5, 0.08, 0.5), mat('#a0522d'), 0, -1.95, 0);
    H.updaters.push((dt, time) => { pivot.rotation.x = Math.sin(time * 1.6) * 0.25; });
    H.addCol(x - 0.8, x + 0.8, z - 0.3, z + 0.3);
  },
  slide(g, H) {
    const x = 9, z = 16;
    for (const s of [-0.35, 0.35]) addMesh(g, boxG(0.08, 1.7, 0.08), mat('#3d7bff'), x + s, 0.85, z - 1);
    for (let i = 1; i <= 4; i++) addMesh(g, boxG(0.7, 0.05, 0.05), mat('#ffd23d'), x, i * 0.35, z - 1);
    addMesh(g, boxG(0.8, 0.08, 0.6), mat('#ff3d3d'), x, 1.6, z - 0.75);
    const slope = addMesh(g, boxG(0.7, 0.06, 2.4), mat('#ff3d3d'), x, 0.85, z + 0.4);
    slope.rotation.x = 0.62;
    H.addCol(x - 0.45, x + 0.45, z - 1.1, z + 1.4);
  },
  football(g, H) {
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true }));
    for (let i = 0; i < 6; i++) {
      const p = new THREE.Vector3().setFromSphericalCoords(0.2, Math.acos(1 - (2 * (i + 0.5)) / 6), i * 2.4);
      addMesh(ball, new THREE.SphereGeometry(0.07, 5, 4), mat('#222222'), p.x, p.y, p.z);
    }
    ball.position.set(-6, 0.22, 19);
    g.add(ball);
    const vel = new THREE.Vector2();
    H.updaters.push((dt, time, player) => {
      const dx = ball.position.x - player.x, dz = ball.position.z - player.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.6 && player.speed > 0.5) {
        vel.set(dx / d, dz / d).multiplyScalar(Math.max(4, player.speed * 1.8));
        H.play?.('pop');
      }
      const before = ball.position.clone();
      ball.position.x += vel.x * dt;
      ball.position.z += vel.y * dt;
      if (collide(ball.position, H.colliders, 0.22)) {
        if (Math.abs(ball.position.x - before.x - vel.x * dt) > 1e-4) vel.x *= -0.7;
        if (Math.abs(ball.position.z - before.z - vel.y * dt) > 1e-4) vel.y *= -0.7;
      }
      vel.multiplyScalar(Math.max(0, 1 - dt * 1.1));
      ball.position.y = floorHeight(ball.position.x, ball.position.z) + 0.22;
      ball.rotation.x += vel.y * dt / 0.22;
      ball.rotation.z -= vel.x * dt / 0.22;
    });
  },
};

// ---------------- pets ----------------
function makePuppy() {
  const g = new THREE.Group();
  const fur = mat('#c68642'), dark = mat('#5d3317'), black = mat('#111111');
  addMesh(g, boxG(0.3, 0.26, 0.5), fur, 0, 0.32, 0);
  for (const [x, z] of [[-0.1, 0.17], [0.1, 0.17], [-0.1, -0.17], [0.1, -0.17]]) addMesh(g, boxG(0.08, 0.2, 0.08), fur, x, 0.1, z);
  const head = new THREE.Group();
  head.position.set(0, 0.5, 0.28);
  g.add(head);
  addMesh(head, boxG(0.26, 0.24, 0.24), fur, 0, 0, 0);
  addMesh(head, boxG(0.14, 0.1, 0.12), mat('#e0b07a'), 0, -0.05, 0.15);
  addMesh(head, new THREE.SphereGeometry(0.035, 6, 4), black, 0, -0.01, 0.22);
  for (const s of [-1, 1]) {
    addMesh(head, boxG(0.06, 0.18, 0.1), dark, s * 0.15, -0.02, 0);
    addMesh(head, new THREE.SphereGeometry(0.025, 6, 4), black, s * 0.06, 0.05, 0.12);
  }
  const tail = addMesh(g, new THREE.CylinderGeometry(0.025, 0.03, 0.25, 5), fur, 0, 0.45, -0.28);
  tail.rotation.x = -0.8;
  g.userData = { head, tail };
  return g;
}

function makeParrot() {
  const g = new THREE.Group();
  const green = mat('#2bb673');
  addMesh(g, new THREE.SphereGeometry(0.12, 8, 6), green, 0, 0, 0).scale.set(1, 1.2, 1.1);
  addMesh(g, new THREE.SphereGeometry(0.09, 8, 6), green, 0, 0.14, 0.06);
  addMesh(g, new THREE.ConeGeometry(0.035, 0.08, 5), mat('#ff3d3d'), 0, 0.12, 0.16).rotation.x = Math.PI / 2;
  addMesh(g, boxG(0.05, 0.03, 0.25), mat('#1e88e5'), 0, -0.05, -0.18).rotation.x = 0.4;
  const wings = [-1, 1].map((s) => {
    const w = new THREE.Group();
    w.position.set(s * 0.1, 0.02, 0);
    addMesh(w, boxG(0.2, 0.03, 0.14), mat('#1b9b5a'), s * 0.1, 0, 0);
    g.add(w);
    return w;
  });
  g.userData = { wings };
  return g;
}

function makeHen() {
  const g = new THREE.Group();
  addMesh(g, new THREE.SphereGeometry(0.2, 8, 6), mat('#ffffff'), 0, 0.25, 0).scale.set(1, 0.9, 1.2);
  addMesh(g, new THREE.SphereGeometry(0.11, 8, 6), mat('#ffffff'), 0, 0.45, 0.17);
  addMesh(g, boxG(0.03, 0.08, 0.1), mat('#e53935'), 0, 0.57, 0.17);
  addMesh(g, new THREE.ConeGeometry(0.03, 0.07, 4), mat('#ffb000'), 0, 0.44, 0.3).rotation.x = Math.PI / 2;
  for (const s of [-0.06, 0.06]) addMesh(g, new THREE.CylinderGeometry(0.015, 0.015, 0.12, 4), mat('#ffb000'), s, 0.06, 0);
  g.userData = { head: g.children[1] };
  return g;
}

const PET_BUILD = {
  cat: () => { const k = makeKitten('#9e9e9e'); k.scale.setScalar(1.15); return k; },
  puppy: makePuppy,
  parrot: makeParrot,
  hen: makeHen,
};

export function createDecor({ scene, W, play }) {
  const root = new THREE.Group();
  scene.add(root);
  const built = new Set();
  const updaters = [];
  const pets = [];
  const H = {
    addCol: (minX, maxX, minZ, maxZ) => W.colliders.push({ minX, maxX, minZ, maxZ, on: true }),
    colliders: W.colliders, updaters, play,
  };

  function apply(ids) {
    for (const id of ids) {
      if (built.has(id)) continue;
      if (BUILD[id]) {
        const g = new THREE.Group();
        BUILD[id](g, H);
        root.add(g);
        built.add(id);
      } else if (PET_BUILD[id]) {
        const mesh = PET_BUILD[id]();
        mesh.position.set(0, 0, 20);
        root.add(mesh);
        const pet = { id, mesh, pos: new THREE.Vector3(0, 0, 20), heading: 0, hop: Math.random() * 6 };
        if (id === 'hen') {
          pet.chicks = [0, 1, 2].map(() => {
            const c = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), mat('#ffe14d'));
            root.add(c);
            return { mesh: c, pos: new THREE.Vector3(0, 0, 20) };
          });
          pet.target = new THREE.Vector3(-8, 0, 20);
        }
        pets.push(pet);
        built.add(id);
      }
    }
  }

  // pets: cat and puppy follow the child, the parrot flies near the shoulder, the hen wanders in the garden
  function updatePets(dt, time, player) {
    const followers = pets.filter((p) => p.id === 'cat' || p.id === 'puppy');
    for (const p of pets) {
      if (p.id === 'parrot') {
        const goal = new THREE.Vector3(player.x + Math.cos(player.facing) * 0.55, player.y + 1.75 + Math.sin(time * 2) * 0.1, player.z - Math.sin(player.facing) * 0.55);
        p.mesh.position.lerp(goal, Math.min(1, dt * 4));
        p.mesh.rotation.y = player.facing;
        p.mesh.userData.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * Math.sin(time * 18) * 0.7; });
        continue;
      }
      let goal;
      if (p.id === 'hen') {
        if (p.pos.distanceTo(p.target) < 0.4 || Math.random() < dt * 0.1) {
          p.target.set(-17 + Math.random() * 34, 0, 13 + Math.random() * 13);
        }
        goal = p.target;
      } else {
        const slot = followers.indexOf(p);
        const side = slot === 0 ? 0.7 : -0.7;
        goal = new THREE.Vector3(
          player.x - Math.sin(player.facing) * 1.2 + Math.cos(player.facing) * side, 0,
          player.z - Math.cos(player.facing) * 1.2 - Math.sin(player.facing) * side);
        if (p.pos.distanceTo(new THREE.Vector3(player.x, 0, player.z)) > 12) p.pos.set(goal.x, 0, goal.z);
      }
      const dx = goal.x - p.pos.x, dz = goal.z - p.pos.z;
      const d = Math.hypot(dx, dz);
      const speed = p.id === 'hen' ? 0.8 : Math.min(5, d * 2.5);
      const moving = d > 0.25;
      if (moving) {
        p.pos.x += (dx / d) * speed * dt;
        p.pos.z += (dz / d) * speed * dt;
        collide(p.pos, W.colliders, 0.22);
        p.heading = Math.atan2(dx, dz);
      }
      p.hop += dt * (moving ? 12 : 2);
      p.pos.y = floorHeight(p.pos.x, p.pos.z);
      p.mesh.position.set(p.pos.x, p.pos.y + (moving ? Math.abs(Math.sin(p.hop)) * 0.08 : 0), p.pos.z);
      let diff = p.heading - p.mesh.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      p.mesh.rotation.y += diff * Math.min(1, dt * 8);
      if (p.mesh.userData.tail) p.mesh.userData.tail.rotation.z = Math.sin(time * (moving ? 12 : 4)) * 0.5;
      if (p.id === 'hen') {
        p.mesh.userData.head.position.y = 0.45 - (moving ? 0 : Math.max(0, Math.sin(time * 3)) * 0.15);
        p.chicks.forEach((c, i) => {
          const lead = i === 0 ? p.pos : p.chicks[i - 1].pos;
          if (c.pos.distanceTo(lead) > 0.45) c.pos.lerp(lead, Math.min(1, dt * 2));
          c.pos.y = floorHeight(c.pos.x, c.pos.z);
          c.mesh.position.set(c.pos.x, c.pos.y + 0.08 + Math.abs(Math.sin(time * 10 + i)) * 0.04, c.pos.z);
        });
      }
    }
  }

  return {
    apply,
    update(dt, time, player) {
      for (const fn of updaters) fn(dt, time, player);
      updatePets(dt, time, player);
    },
  };
}
