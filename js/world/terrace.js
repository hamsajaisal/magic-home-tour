// The terrace upstairs (outside stairs on the east side of the house): kite flying, star counting
// with a telescope, the rooftop pool where a friend needs help, and the secret attic hut.
import * as THREE from 'three';
import { mat, labelTexture, emojiTexture, mergeStatic, floorHeight, TERRACE as T, TSTAIRS as S } from './house.js';
import { createPlayer } from './player.js';

const TOP = T.top;
const UP = { minY: 1.6 };      // colliders that only matter up on the terrace
const DOWN = { maxY: 1.6 };    // ... or only down in the garden
const HUT = { x1: 11.8, x2: 14.8, z1: -8.7, z2: -5.7, doorX: 13.3, doorW: 1.2, h: 2.2 };
const POOL = { x1: 15.4, x2: 18.2, z1: -8.7, z2: -4.4 };
const WATER_Y = TOP + 0.42;
const DAY = { hemi: 1.1, sun: 1.6, bg: new THREE.Color('#8fd3ff'), fog: new THREE.Color('#bfe9ff') };
const NIGHT = { hemi: 0.3, sun: 0.12, bg: new THREE.Color('#0d1a45'), fog: new THREE.Color('#0d1a45') };
export const STARS_PER_ANSWER = 9;
export const RESCUE_STEPS = 5;

// where the child stands for each activity: [x, z, radius]
export const SPOTS = {
  kite: [17.2, -0.3, 1.4],
  telescope: [12.3, -2.3, 1.5],
  pool: [16.2, -3.4, 1.4],
  attic: [HUT.doorX, -5.0, 1.2],
  chest: [HUT.doorX, -7.1, 1.0],
};

export function isUp(y) { return y > 2; }

export function createTerrace({ scene, W, low, lights, setBanner }) {
  const root = new THREE.Group();
  scene.add(root);
  let statics = new THREE.Group();
  const col = (minX, maxX, minZ, maxZ, y = {}) => {
    const c = { minX, maxX, minZ, maxZ, on: true, ...y };
    W.colliders.push(c);
    return c;
  };
  // y = bottom of the shape
  const box = (w, h, d, color, x, y, z, parent = statics, material = null) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material || mat(color));
    m.position.set(x, y + h / 2, z);
    parent.add(m);
    return m;
  };
  const cyl = (r1, r2, h, color, x, y, z, parent = statics, seg = 8) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat(color));
    m.position.set(x, y + h / 2, z);
    parent.add(m);
    return m;
  };
  const floating = (emoji, x, y, z, size = 0.8) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture(emoji), depthWrite: false }));
    s.scale.set(size, size, 1);
    s.position.set(x, y, z);
    root.add(s);
    return s;
  };
  const signBoard = (x, y, z, w = 2.2, rotY = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({ transparent: true }));
    m.position.set(x, y, z);
    m.rotation.y = rotY;
    root.add(m);
    return m;
  };
  // a wall that turns see-through when it hides the child from the camera
  const fadeWall = (w, h, d, color, x, y, z) => {
    const m = box(w, h, d, color, x, y, z, root, mat(color, true));
    W.fadeables.push(m);
    return m;
  };

  // ---------- the block under the terrace ----------
  const cx = (T.x1 + T.x2) / 2, cz = (T.z1 + T.z2) / 2, wid = T.x2 - T.x1, dep = T.z2 - T.z1;
  const wallC = '#f3e2c3';
  const south = fadeWall(wid, TOP, 0.2, wallC, cx, 0, T.z2 - 0.1);
  fadeWall(wid, TOP, 0.2, wallC, cx, 0, T.z1 + 0.1);
  fadeWall(0.2, TOP, dep, wallC, T.x1 + 0.1, 0, cz);
  fadeWall(0.2, TOP, dep, wallC, T.x2 - 0.1, 0, cz);
  // a painted store-room door and window on the front, fading with the wall
  for (const [w, h, x, y] of [[1.1, 2.0, 16.6, 0], [1.0, 0.9, 12.2, 1.1]]) {
    const m = box(w, h, 0.06, '#6b3518', x, y, T.z2 + 0.03, root, mat('#6b3518', true));
    W.windows.push({ mesh: m, wall: south });
  }
  box(wid + 0.2, 0.18, dep + 0.2, '#b98b5c', cx, TOP - 0.18, cz);      // floor slab edge
  box(wid - 0.1, 0.02, dep - 0.1, '#d9c2a0', cx, TOP - 0.01, cz);      // terrace floor tiles
  col(T.x1, T.x2, T.z1, T.z2, DOWN);

  // low walls (parapet) around the top, open where the stairs arrive
  const para = (x1, x2, z1, z2) => {
    box(x2 - x1, 0.7, z2 - z1, '#fff1d6', (x1 + x2) / 2, TOP, (z1 + z2) / 2);
    box(x2 - x1 + 0.06, 0.08, z2 - z1 + 0.06, '#c8693f', (x1 + x2) / 2, TOP + 0.7, (z1 + z2) / 2);
    col(x1, x2, z1, z2, UP);
  };
  para(T.x1, T.x2, T.z1, T.z1 + 0.2);
  para(T.x1, T.x1 + 0.2, T.z1 + 0.2, T.z2);
  para(T.x2 - 0.2, T.x2, T.z1 + 0.2, T.z2);
  para(T.x1 + 0.2, S.x1, T.z2 - 0.2, T.z2);
  para(S.x2, T.x2 - 0.2, T.z2 - 0.2, T.z2);

  // ---------- outside stairs ----------
  const STEPS = 14, run = (S.z2 - S.z1) / STEPS, sx = (S.x1 + S.x2) / 2;
  for (let i = 0; i < STEPS; i++) {
    const h = (TOP * (i + 1)) / STEPS;
    box(S.x2 - S.x1, h, run, i % 2 ? '#b5532f' : '#a94a2c', sx, 0, S.z2 - (i + 0.5) * run);
  }
  col(S.x1 - 0.15, S.x1, S.z1, S.z2);
  col(S.x2, S.x2 + 0.15, S.z1, S.z2);
  const slope = Math.atan2(TOP, S.z2 - S.z1), len = Math.hypot(TOP, S.z2 - S.z1);
  for (const x of [S.x1 + 0.05, S.x2 - 0.05]) {
    const rail = box(0.08, 0.08, len, '#6b3518', x, 0, (S.z1 + S.z2) / 2);
    rail.position.y = TOP / 2 + 0.95;
    rail.rotation.x = slope;
    for (let i = 0; i <= STEPS; i += 2) {
      const z = S.z2 - i * run;
      cyl(0.03, 0.03, 0.95, '#6b3518', x, (TOP * i) / STEPS, z);
    }
  }
  const stairSign = signBoard(sx, 2.0, S.z2 + 0.45);
  cyl(0.05, 0.05, 1.8, '#6b3518', sx, 0, S.z2 + 0.4);

  // ---------- kite corner ----------
  const [kx, kz] = SPOTS.kite;
  box(0.6, 0.6, 0.6, '#8b4513', 18.0, TOP, kz);
  col(17.7, 18.3, kz - 0.3, kz + 0.3, UP);
  const kite = makeKite();
  kite.group.scale.setScalar(1.8);
  const restKite = makeKite();
  restKite.group.position.set(18.0, TOP + 1.05, kz);
  restKite.group.rotation.set(0, -Math.PI / 2, 0.3);
  restKite.group.scale.setScalar(0.6);
  root.add(restKite.group);
  kite.group.visible = false;
  root.add(kite.group);
  const stringGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3));
  const kiteString = new THREE.Line(stringGeo, new THREE.LineBasicMaterial({ color: '#ffffff' }));
  kiteString.frustumCulled = false;
  kiteString.visible = false;
  root.add(kiteString);
  const kiteIcon = floating('🪁', kx + 0.6, TOP + 2.3, kz);

  // ---------- telescope ----------
  const [tx, tz] = SPOTS.telescope;
  const tele = new THREE.Group();
  tele.position.set(tx, TOP, tz - 0.5);
  root.add(tele);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = cyl(0.025, 0.025, 1.05, '#444444', Math.cos(a) * 0.22, 0, Math.sin(a) * 0.22, tele);
    leg.rotation.set(Math.sin(a) * 0.22, 0, -Math.cos(a) * 0.22);
  }
  const tube = cyl(0.07, 0.11, 0.9, '#3d7bff', 0, 0.95, 0, tele, 10);
  tube.rotation.x = -0.9;
  tube.position.set(0, 1.15, -0.2);
  col(tx - 0.3, tx + 0.3, tz - 0.8, tz - 0.2, UP);
  const teleIcon = floating('🔭', tx, TOP + 2.3, tz - 0.5);

  // ---------- rooftop pool ----------
  const pcx = (POOL.x1 + POOL.x2) / 2, pcz = (POOL.z1 + POOL.z2) / 2;
  const pw = POOL.x2 - POOL.x1, pd = POOL.z2 - POOL.z1;
  box(pw, 0.02, pd, '#4fc3f7', pcx, TOP, pcz);
  for (const [w, d, x, z] of [[pw, 0.2, pcx, POOL.z1 + 0.1], [pw, 0.2, pcx, POOL.z2 - 0.1], [0.2, pd, POOL.x1 + 0.1, pcz], [0.2, pd, POOL.x2 - 0.1, pcz]]) {
    box(w, 0.5, d, '#e8f4f8', x, TOP, z);
  }
  col(POOL.x1, POOL.x2, POOL.z1, POOL.z2, UP);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(pw - 0.4, pd - 0.4, 8, 8),
    new THREE.MeshLambertMaterial({ color: '#29b6f6', transparent: true, opacity: 0.72 }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(pcx, WATER_Y, pcz);
  root.add(water);
  // pool ladder on the near side
  for (const x of [17.05, 17.55]) cyl(0.03, 0.03, 0.95, '#cfd8dc', x, TOP, POOL.z2 - 0.28);
  for (const y of [0.2, 0.45, 0.7]) box(0.5, 0.03, 0.04, '#cfd8dc', 17.3, TOP + y, POOL.z2 - 0.28);
  // the lifeguard, with a whistle and a red cap
  const guard = createPlayer({ shirt: '#e53935', shorts: '#e53935', bag: '#e53935' });
  guard.setCostume({ hat: 'cap' });
  guard.root.position.set(18.0, TOP, -3.5);
  guard.root.rotation.y = -Math.PI / 2;
  root.add(guard.root);
  col(17.8, 18.2, -3.7, -3.3, UP);
  // the friend practising in the pool, holding a float ring
  const friend = createPlayer({ shirt: '#ffd23d', shorts: '#00897b', bag: '#ffd23d' });
  root.add(friend.root);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.1, 6, 14), mat('#ff7043'));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.95;
  friend.root.add(ring);
  // the friend's path: middle of the pool → the ladder → standing on the terrace beside the child
  const PATH = [
    [17.0, -7.4, WATER_Y - 1.15], [17.1, -6.8, WATER_Y - 1.12], [17.2, -6.2, WATER_Y - 1.1],
    [17.3, -5.5, WATER_Y - 1.05], [17.3, -4.75, TOP - 0.15], [15.3, -3.7, TOP],
  ];
  const bubble = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
  bubble.scale.set(2.2, 0.55, 1);
  bubble.visible = false;
  root.add(bubble);
  const poolIcon = floating('🛟', 16.8, TOP + 2.4, -5.8);

  // ---------- the secret attic hut ----------
  const hutC = '#e9c9a0';
  const hx = (HUT.x1 + HUT.x2) / 2, hz = (HUT.z1 + HUT.z2) / 2;
  const hutWalls = [
    fadeWall(HUT.x2 - HUT.x1, HUT.h, 0.15, hutC, hx, TOP, HUT.z1),
    fadeWall(0.15, HUT.h, HUT.z2 - HUT.z1, hutC, HUT.x1, TOP, hz),
    fadeWall(0.15, HUT.h, HUT.z2 - HUT.z1, hutC, HUT.x2, TOP, hz),
  ];
  const dl = HUT.doorX - HUT.doorW / 2, dr = HUT.doorX + HUT.doorW / 2;
  hutWalls.push(
    fadeWall(dl - HUT.x1, HUT.h, 0.15, hutC, (HUT.x1 + dl) / 2, TOP, HUT.z2),
    fadeWall(HUT.x2 - dr, HUT.h, 0.15, hutC, (dr + HUT.x2) / 2, TOP, HUT.z2),
    fadeWall(HUT.doorW, 0.3, 0.15, hutC, HUT.doorX, TOP + 1.9, HUT.z2),
  );
  col(HUT.x1 - 0.08, HUT.x2 + 0.08, HUT.z1 - 0.08, HUT.z1 + 0.08, UP);
  col(HUT.x1 - 0.08, HUT.x1 + 0.08, HUT.z1, HUT.z2, UP);
  col(HUT.x2 - 0.08, HUT.x2 + 0.08, HUT.z1, HUT.z2, UP);
  col(HUT.x1, dl, HUT.z2 - 0.08, HUT.z2 + 0.08, UP);
  col(dr, HUT.x2, HUT.z2 - 0.08, HUT.z2 + 0.08, UP);
  const hutRoof = new THREE.Mesh(new THREE.ConeGeometry(2.45, 1.3, 4), mat('#d2532f', true));
  hutRoof.rotation.y = Math.PI / 4;
  hutRoof.position.set(hx, TOP + HUT.h + 0.65, hz);
  root.add(hutRoof);
  // the attic door
  const door = { pivot: new THREE.Group(), angle: 0, target: 0 };
  door.pivot.position.set(dl, TOP, HUT.z2);
  root.add(door.pivot);
  box(HUT.doorW - 0.04, 1.88, 0.08, '#6b3518', HUT.doorW / 2, 0, 0, door.pivot);
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshBasicMaterial({ map: emojiTexture('🔐'), transparent: true }));
  badge.position.set(HUT.doorW / 2, 1.1, 0.06);
  door.pivot.add(badge);
  door.collider = col(dl, dr, HUT.z2 - 0.08, HUT.z2 + 0.08, UP);
  const atticSign = signBoard(HUT.doorX, TOP + 2.55, HUT.z2 + 0.1, 2.6);
  // old things inside: the treasure chest, a trunk and a lantern
  const [chx] = SPOTS.chest, chz = -8.0;
  box(0.9, 0.45, 0.55, '#8b4513', chx, TOP, chz);
  box(0.94, 0.15, 0.59, '#a0522d', chx, TOP + 0.45, chz);
  for (const s of [-0.3, 0.3]) box(0.06, 0.62, 0.6, '#ffc61a', chx + s, TOP, chz);
  col(chx - 0.5, chx + 0.5, chz - 0.3, chz + 0.3, UP);
  box(0.8, 0.5, 0.5, '#5d4037', 12.35, TOP, -8.2);
  box(0.5, 0.4, 0.5, '#795548', 14.3, TOP, -8.2);
  cyl(0.1, 0.12, 0.3, '#ffb300', 14.3, TOP + 0.4, -8.2);
  col(11.9, 12.8, -8.5, -7.9, UP);
  col(14.0, 14.7, -8.5, -7.9, UP);
  const chestIcon = floating('✨', chx, TOP + 1.3, chz, 0.6);
  const atticIcon = floating('🔐', hx, TOP + HUT.h + 1.8, hz, 1.0);

  // ---------- night sky for star counting ----------
  const skyStars = makeStars(220, () => {
    const a = Math.random() * Math.PI * 2, e = 0.12 + Math.random() * 1.1;
    return [Math.cos(a) * Math.cos(e) * 70, Math.sin(e) * 70, Math.sin(a) * Math.cos(e) * 70];
  }, 2.2, '#ffffff');
  const clusters = [0, 1, 2, 3, 4].map(() => {
    const pts = makeStars(STARS_PER_ANSWER, () => [0, 0, 0], 7, '#fff2a8');
    const line = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', pts.geometry.attributes.position),
      new THREE.LineBasicMaterial({ color: '#9fb8ff', transparent: true, opacity: 0, fog: false }));
    line.frustumCulled = false;
    pts.add(line);
    pts.userData.line = line;
    pts.visible = false;
    return pts;
  });
  const sky = new THREE.Group();
  sky.add(skyStars, ...clusters);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 12), new THREE.MeshBasicMaterial({ color: '#fff7c2', transparent: true, opacity: 0, fog: false }));
  sky.add(moon);
  scene.add(sky);

  // ---------- clues that something is up here ----------
  // a big kite tied to the terrace railing, always flying, seen from the garden and the house
  const flag = makeKite();
  flag.group.scale.setScalar(2.4);
  root.add(flag.group);
  const flagAnchor = new THREE.Vector3(T.x2 - 0.2, TOP + 0.8, T.z2 - 0.2);
  const flagGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3));
  const flagString = new THREE.Line(flagGeo, new THREE.LineBasicMaterial({ color: '#ffffff' }));
  flagString.frustumCulled = false;
  root.add(flagString);

  // glowing footprints from the front steps to the terrace stairs (until the child has been up once)
  const trail = new THREE.Group();
  root.add(trail);
  const route = [[1.2, 12.9], [9.5, 12.6], [sx, S.z2 + 0.6]];
  const printGeo = new THREE.CircleGeometry(0.15, 10);
  let side = 1, n = 0;
  for (let k = 0; k < route.length - 1; k++) {
    const [ax, az] = route[k], [bx, bz] = route[k + 1];
    const len = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / len, dz = (bz - az) / len;
    for (let d = 0; d < len; d += 0.7) {
      const x = ax + dx * d - dz * 0.15 * side, z = az + dz * d + dx * 0.15 * side;
      const m = new THREE.Mesh(printGeo, new THREE.MeshBasicMaterial({ color: '#fff59d', transparent: true, depthWrite: false }));
      m.scale.set(1, 1.6, 1);
      m.rotation.set(-Math.PI / 2, Math.atan2(-dx, -dz), 0, 'YXZ');   // flat, pointing along the path
      m.position.set(x, floorHeight(x, z) + 0.03, z);
      m.userData.i = n++;
      trail.add(m);
      side = -side;
    }
  }

  const merged = mergeStatic(statics);
  root.add(merged);
  statics = merged;
  if (!low) root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  // ---------- shows (they play after the quiz closes, so the child can watch) ----------
  const kiteShow = { on: false, t: 0, h: 0, goal: 0, stay: 0, dir: new THREE.Vector3(1, 0, 0) };
  const night = { v: 0, goal: 0, t: 0, lit: 0, show: 0, hold: 0 };
  const rescue = { shown: 0, goal: 0, thanks: 0 };
  let me = { x: 0, y: 0, z: 0 };
  let thanksText = '';

  function horizontalForward(camera) {
    const d = new THREE.Vector3();
    camera.getWorldDirection(d);
    d.y = 0;
    if (d.lengthSq() < 1e-6) d.set(0, 0, -1);
    return d.normalize();
  }

  function flyKite(rights, camera) {
    Object.assign(kiteShow, { on: true, t: 0, h: 0.2, goal: 2 + rights * 3, stay: 22 });
    kiteShow.dir.copy(horizontalForward(camera));
    kite.group.visible = true;
    kiteString.visible = true;
    restKite.group.visible = false;
  }

  function showStars(rights, camera) {
    const f = horizontalForward(camera);
    const base = Math.atan2(f.z, f.x);
    clusters.forEach((c, k) => {
      const a0 = base + (k - 2) * 0.32, e0 = 0.32 + (k % 2) * 0.16;
      const p = c.geometry.attributes.position;
      let a = a0, e = e0;
      for (let i = 0; i < STARS_PER_ANSWER; i++) {
        a += (Math.random() - 0.5) * 0.12; e += (Math.random() - 0.35) * 0.07;
        p.setXYZ(i, Math.cos(a) * Math.cos(e) * 66, Math.sin(e) * 66, Math.sin(a) * Math.cos(e) * 66);
      }
      p.needsUpdate = true;
      c.geometry.computeBoundingSphere();
      c.visible = false;
      c.userData.fade = 0;
    });
    moon.position.set(Math.cos(base + 0.85) * 74, 26, Math.sin(base + 0.85) * 74);
    Object.assign(night, { goal: 1, t: 0, lit: 0, show: Math.min(rights, clusters.length), hold: 16 });
    sky.position.set(camera.position.x, 0, camera.position.z);
  }

  // onArrive() runs once the friend has climbed out and stands on the terrace
  function setRescue(step, instant = false, onArrive = null) {
    rescue.goal = Math.max(0, Math.min(RESCUE_STEPS, step));
    if (instant) rescue.shown = rescue.goal;
    rescue.onArrive = onArrive;
  }

  function sayThanks(text) {
    thanksText = text;
    rescue.thanks = 9;
    bubble.material.map?.dispose();
    bubble.material.map = labelTexture(text, '#ffffff', '#3a2a1a');
    bubble.material.needsUpdate = true;
  }

  function placeFriend(dt, time) {
    if (rescue.shown < rescue.goal) rescue.shown = Math.min(rescue.goal, rescue.shown + dt * 0.8);
    else rescue.shown = rescue.goal;
    if (rescue.onArrive && rescue.shown >= RESCUE_STEPS) {
      const done = rescue.onArrive;
      rescue.onArrive = null;
      done();
    }
    const s = rescue.shown, i = Math.min(PATH.length - 2, Math.floor(s)), k = s - i;
    const a = PATH[i], b = PATH[i + 1];
    const inWater = s < RESCUE_STEPS - 1.2;
    // PATH points are [x, z, height]
    friend.root.position.set(a[0] + (b[0] - a[0]) * k, a[2] + (b[2] - a[2]) * k + (inWater ? Math.sin(time * 2) * 0.04 : 0), a[1] + (b[1] - a[1]) * k);
    ring.visible = s < RESCUE_STEPS - 0.5;
    const onDeck = s >= RESCUE_STEPS - 0.01;
    friend.root.rotation.y = onDeck ? Math.atan2(me.x - friend.root.position.x, me.z - friend.root.position.z) : 0;
    friend.setPose(onDeck && rescue.thanks > 0 ? 'namaste' : null);
    friend.animate(dt, inWater ? 0.15 : 0);
    if (rescue.thanks > 0) {
      rescue.thanks -= dt;
      bubble.visible = true;
      bubble.position.set(friend.root.position.x, friend.root.position.y + 2.2, friend.root.position.z);
    } else bubble.visible = false;
  }

  function updateKite(dt, time) {
    if (!kiteShow.on) return;
    kiteShow.t += dt;
    if (kiteShow.t > 4 + kiteShow.stay) kiteShow.goal = 0;
    kiteShow.h += (kiteShow.goal - kiteShow.h) * Math.min(1, dt * 0.7);
    const hand = new THREE.Vector3(me.x, me.y + 1.2, me.z);
    const side = new THREE.Vector3(-kiteShow.dir.z, 0, kiteShow.dir.x);
    const h = kiteShow.h;
    const p = hand.clone().addScaledVector(kiteShow.dir, 1 + h * 0.7).addScaledVector(side, Math.sin(time * 0.9) * h * 0.12);
    p.y += h * 0.75 + Math.sin(time * 1.7) * 0.15 * Math.min(1, h);
    kite.group.position.copy(p);
    kite.group.lookAt(hand);
    kite.group.rotateZ(Math.sin(time * 2.3) * 0.25);
    kite.tail.forEach((b, i) => { b.position.x = Math.sin(time * 4 + i) * 0.08 * i; });
    const arr = stringGeo.attributes.position;
    arr.setXYZ(0, hand.x, hand.y, hand.z);
    arr.setXYZ(1, p.x, p.y, p.z);
    arr.needsUpdate = true;
    if (kiteShow.goal === 0 && h < 0.3) {
      kiteShow.on = false;
      kite.group.visible = kiteString.visible = false;
      restKite.group.visible = true;
    }
  }

  function updateNight(dt, time) {
    if (night.goal > 0) {
      night.t += dt;
      const due = Math.min(night.show, Math.floor((night.t - 1.5) / 1.1) + 1);
      if (night.v > 0.6 && due > night.lit) {
        clusters[night.lit].visible = true;
        night.lit++;
        setBanner(`⭐ ${night.lit * STARS_PER_ANSWER}`);
      }
      if (night.lit >= night.show && night.t > 2.5) {
        night.hold -= dt;
        if (night.hold <= 0) { night.goal = 0; setBanner(''); }
      }
    }
    night.v += (night.goal - night.v) * Math.min(1, dt * 1.2);
    if (night.goal === 0 && night.v < 0.005) night.v = 0;
    const v = night.v;
    lights.hemi.intensity = DAY.hemi + (NIGHT.hemi - DAY.hemi) * v;
    lights.sun.intensity = DAY.sun + (NIGHT.sun - DAY.sun) * v;
    scene.background.copy(DAY.bg).lerp(NIGHT.bg, v);
    scene.fog.color.copy(DAY.fog).lerp(NIGHT.fog, v);
    sky.visible = v > 0.01;
    skyStars.material.opacity = v * (0.75 + Math.sin(time * 3) * 0.1);
    moon.material.opacity = v;
    clusters.forEach((c, i) => {
      if (!c.visible) return;
      c.userData.fade = Math.min(1, c.userData.fade + dt * 1.5);
      c.material.opacity = c.userData.fade * v * (0.85 + Math.sin(time * 5 + i) * 0.15);
      c.userData.line.material.opacity = c.material.opacity * 0.6;
      if (v < 0.05) c.visible = false;
    });
  }

  return {
    spots: SPOTS,
    friend: friend.root,
    flyKite,
    showStars,
    setRescue,
    sayThanks,
    setTrail(on) { trail.visible = !!on; },
    get rescueStep() { return rescue.goal; },
    // the show is still playing (prompts wait until it ends)
    busy: () => kiteShow.on && kiteShow.t < 6 || night.goal > 0 || rescue.shown < rescue.goal,
    // how much the camera should look up at the sky (kite or stars)
    camLift: () => Math.max(night.v * 0.6, kiteShow.on ? Math.min(0.5, kiteShow.h / 24) : 0),
    insideHut: (p) => isUp(p.y) && p.x > HUT.x1 && p.x < HUT.x2 && p.z > HUT.z1 && p.z < HUT.z2,
    setAtticOpen(open, instant = false) {
      door.collider.on = !open;
      door.target = open ? 1.75 : 0;
      badge.visible = !open;
      chestIcon.visible = open;
      if (instant) door.angle = door.target;
    },
    refreshSigns(names, keys, atticOpen) {
      const set = (m, text, bg) => {
        m.material.map?.dispose();
        m.material.map = labelTexture(text, bg, '#ffffff');
        m.material.needsUpdate = true;
      };
      set(stairSign, `⬆️ ${names.terrace}`, '#1d6fa3');
      set(atticSign, atticOpen ? `✨ ${names.attic}` : `🔐 ${names.attic}  🗝️ ${keys}/3`, '#7a3e1d');
      atticIcon.material.map?.dispose();
      atticIcon.material.map = emojiTexture(atticOpen ? '💎' : '🔐');
      if (rescue.thanks > 0 && thanksText) sayThanks(thanksText);
    },
    update(dt, time, child, jacketOn) {
      me = child;
      updateKite(dt, time);
      updateNight(dt, time);
      placeFriend(dt, time);
      guard.root.rotation.y = Math.hypot(me.x - 18, me.z + 3.5) < 5 && isUp(me.y)
        ? Math.atan2(me.x - 18.0, me.z + 3.5) : -Math.PI / 2;
      guard.setPose(isUp(me.y) && !jacketOn && Math.hypot(me.x - 18, me.z + 3.5) < 5 ? 'wave' : null);
      guard.animate(dt, 0);
      door.angle += (door.target - door.angle) * Math.min(1, dt * 3);
      door.pivot.rotation.y = door.angle;
      const inHut = isUp(me.y) && me.x > HUT.x1 - 0.3 && me.x < HUT.x2 + 0.3 && me.z > HUT.z1 - 0.3 && me.z < HUT.z2 - 0.1;
      hutRoof.visible = !inHut;
      atticSign.visible = !inHut;
      const bob = (s, y0, ph) => { s.position.y = y0 + Math.sin(time * 2 + ph) * 0.12; };
      bob(kiteIcon, TOP + 2.3, 0); bob(teleIcon, TOP + 2.3, 1); bob(poolIcon, TOP + 2.4, 2);
      bob(atticIcon, TOP + HUT.h + 1.8, 3); bob(chestIcon, TOP + 1.3, 4);
      kiteIcon.visible = !kiteShow.on;
      // the big kite flies whenever the child's own kite is not up
      flag.group.visible = flagString.visible = !kiteShow.on;
      const fp = flagAnchor.clone().add(new THREE.Vector3(2.5 + Math.sin(time * 0.5) * 0.8, 9 + Math.sin(time * 0.8) * 0.5, 3.5));
      flag.group.position.copy(fp);
      flag.group.lookAt(flagAnchor);
      flag.group.rotateZ(Math.sin(time * 1.9) * 0.2);
      flag.tail.forEach((b, i) => { b.position.x = Math.sin(time * 4 + i) * 0.08 * i; });
      const fs = flagGeo.attributes.position;
      fs.setXYZ(0, flagAnchor.x, flagAnchor.y, flagAnchor.z);
      fs.setXYZ(1, fp.x, fp.y, fp.z);
      fs.needsUpdate = true;
      if (trail.visible) {
        for (const m of trail.children) m.material.opacity = 0.4 + 0.6 * Math.max(0, Math.sin(time * 3 - m.userData.i * 0.45));
      }
      const pos = water.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(time * 2 + pos.getX(i) * 2 + pos.getY(i) * 1.5) * 0.025);
      pos.needsUpdate = true;
    },
  };
}

// A diamond kite with a tail of little bows.
function makeKite() {
  const group = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.55); shape.lineTo(0.38, 0.05); shape.lineTo(0, -0.6); shape.lineTo(-0.38, 0.05); shape.closePath();
  const sail = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshLambertMaterial({ color: '#ff3d7f', side: THREE.DoubleSide }));
  group.add(sail);
  const half = new THREE.Shape();
  half.moveTo(0, 0.55); half.lineTo(0.38, 0.05); half.lineTo(0, 0.05); half.closePath();
  const top = new THREE.Mesh(new THREE.ShapeGeometry(half), new THREE.MeshLambertMaterial({ color: '#ffd23d', side: THREE.DoubleSide }));
  top.position.z = 0.005;
  group.add(top);
  const tail = [];
  for (let i = 1; i <= 5; i++) {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.08), new THREE.MeshLambertMaterial({ color: i % 2 ? '#3dd6ff' : '#7dff6b', side: THREE.DoubleSide }));
    b.position.set(0, -0.6 - i * 0.22, 0);
    group.add(b);
    tail.push(b);
  }
  return { group, tail };
}

function makeStars(n, place, size, color) {
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) arr.set(place(i), i * 3);
  const geo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  pts.frustumCulled = false;
  return pts;
}
