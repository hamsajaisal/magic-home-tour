// Surprises inside open rooms: treat rain, hidden kitten, balloon popping and a treasure chest.
// Each open room has a gift box. One surprise per room per day is free; after that a quick quiz opens a new one.
import * as THREE from 'three';
import { SETTINGS } from '../../settings.js';
import { PLINTH, mat, emojiTexture } from './house.js';
import { pointBlocked } from './physics.js';
import { play } from '../audio.js';
import { t } from '../i18n.js';

const KINDS = [
  { kind: 'rain', variant: 'choc', weight: 3 },
  { kind: 'rain', variant: 'kerala', weight: 2 },
  { kind: 'rain', variant: 'coins', weight: 1 },
  { kind: 'kitten', weight: 2 },
  { kind: 'balloons', weight: 2 },
  { kind: 'chest', weight: 2 },
];

// ---------- the little 3D treats ----------
const G = {
  bar: new THREE.BoxGeometry(0.34, 0.08, 0.16),
  end: new THREE.ConeGeometry(0.08, 0.12, 5),
  ball: new THREE.SphereGeometry(0.13, 8, 6),
  cup: new THREE.CylinderGeometry(0.13, 0.1, 0.14, 10),
  chip: new THREE.CylinderGeometry(0.12, 0.12, 0.03, 10),
  coin: new THREE.CylinderGeometry(0.15, 0.15, 0.04, 14),
};
const WRAPPERS = ['#e53935', '#8e24aa', '#1e88e5', '#43a047', '#fdd835'];

function makeTreat(variant, i) {
  const g = new THREE.Group();
  if (variant === 'choc') {
    g.add(new THREE.Mesh(G.bar, mat('#5d3317')));
    const w = mat(WRAPPERS[i % WRAPPERS.length]);
    for (const s of [-1, 1]) {
      const e = new THREE.Mesh(G.end, w);
      e.rotation.z = s * Math.PI / 2;
      e.position.x = s * 0.22;
      g.add(e);
    }
  } else if (variant === 'coins') {
    const c = new THREE.Mesh(G.coin, new THREE.MeshLambertMaterial({ color: '#ffc61a', emissive: '#8a5a00', emissiveIntensity: 0.4 }));
    c.rotation.x = Math.PI / 2;
    g.add(c);
  } else {
    const pickOne = i % 3;
    if (pickOne === 0) g.add(new THREE.Mesh(G.ball, mat('#ffa726')));            // laddu
    else if (pickOne === 1) {                                                   // payasam cup
      g.add(new THREE.Mesh(G.cup, mat('#b0bec5')));
      const top = new THREE.Mesh(G.chip, mat('#fff3d6'));
      top.position.y = 0.07;
      g.add(top);
    } else g.add(new THREE.Mesh(G.chip, mat('#ffd54f')));                      // banana chip
  }
  return g;
}

export function makeKitten(color = '#ff9f43') {
  const g = new THREE.Group();
  const fur = mat(color), white = mat('#ffffff'), dark = mat('#222222');
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), fur);
  body.scale.set(1, 0.8, 1.4);
  body.position.y = 0.2;
  g.add(body);
  const head = new THREE.Group();
  head.position.set(0, 0.42, 0.25);
  g.add(head);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), fur));
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 4), fur);
    ear.position.set(s * 0.09, 0.15, 0);
    head.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), dark);
    eye.position.set(s * 0.06, 0.03, 0.15);
    head.add(eye);
  }
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), white);
  muzzle.position.set(0, -0.04, 0.14);
  head.add(muzzle);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.4, 5), fur);
  tail.position.set(0, 0.35, -0.32);
  tail.rotation.x = -0.6;
  g.add(tail);
  g.userData = { head, tail };
  return g;
}

function makeGiftBox(color) {
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.7), mat(color));
  box.position.y = 0.3;
  g.add(box);
  const ribbon = mat('#ffd23d');
  const r1 = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.62, 0.14), ribbon); r1.position.y = 0.3; g.add(r1);
  const r2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.62, 0.72), ribbon); r2.position.y = 0.3; g.add(r2);
  for (const s of [-1, 1]) {
    const bow = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), ribbon);
    bow.scale.set(1.3, 0.7, 0.7);
    bow.position.set(s * 0.12, 0.66, 0);
    g.add(bow);
  }
  return g;
}

function makeChest() {
  const g = new THREE.Group();
  const wood = mat('#8d5524'), gold = mat('#ffc61a');
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.6), wood);
  base.position.y = 0.25;
  g.add(base);
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.08, 0.64), gold);
  band.position.y = 0.45;
  g.add(band);
  const lid = new THREE.Group();
  lid.position.set(0, 0.5, -0.3);
  g.add(lid);
  const lidMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 10, 1, false, 0, Math.PI), wood);
  lidMesh.rotation.z = Math.PI / 2;
  lidMesh.position.z = 0.3;
  lid.add(lidMesh);
  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.05), gold);
  lock.position.set(0, 0.45, 0.31);
  g.add(lock);
  g.userData = { lid };
  return g;
}

function sprite(emoji, size = 0.9) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture(emoji), depthWrite: false }));
  s.scale.set(size, size, 1);
  return s;
}

// ---------- the surprise manager ----------
export function createSurprises({ scene, W, rooms, low, setBanner, onEnd, stat }) {
  const at = (r, u, v) => [r.x1 + (r.x2 - r.x1) * u, r.z1 + (r.z2 - r.z1) * v];
  const gifts = rooms.map((room) => {
    const [x, z] = at(room, ...(room.gift || [0.5, 0.5]));
    const group = makeGiftBox(room.color);
    group.position.set(x, PLINTH, z);
    group.visible = false;
    scene.add(group);
    const free = sprite('🎁', 0.8), quiz = sprite('❓', 0.8);
    for (const s of [free, quiz]) { s.position.set(0, 1.4, 0); group.add(s); }
    return { room, pos: [x, z], group, free, quiz };
  });

  let S = null;        // the surprise happening now
  let lastKind = null;

  function freeSpot(room, avoid, minDist = 0) {
    for (let i = 0; i < 40; i++) {
      const x = room.x1 + 0.7 + Math.random() * (room.x2 - room.x1 - 1.4);
      const z = room.z1 + 0.7 + Math.random() * (room.z2 - room.z1 - 1.4);
      if (pointBlocked(x, z, W.colliders, 0.45)) continue;
      if (avoid && Math.hypot(x - avoid.x, z - avoid.z) < minDist) continue;
      return [x, z];
    }
    return [(room.x1 + room.x2) / 2, (room.z1 + room.z2) / 2];
  }

  function pickKind() {
    const options = KINDS.filter((k) => `${k.kind}${k.variant || ''}` !== lastKind);
    let r = Math.random() * options.reduce((n, k) => n + k.weight, 0);
    for (const k of options) { r -= k.weight; if (r <= 0) return k; }
    return options[0];
  }

  function start(room, player, forced) {
    const k = forced || pickKind();
    lastKind = `${k.kind}${k.variant || ''}`;
    S = { ...k, room, time: 0, coins: 0, objects: [], done: false };
    const gift = gifts.find((g) => g.room === room);
    gift.group.visible = false;
    play('chest');
    if (k.kind === 'rain') {
      S.left = SETTINGS.SURPRISE_SECONDS;
      S.caught = 0;
      S.spawn = 0;
      S.title = t(k.variant === 'choc' ? 'rainChoc' : k.variant === 'coins' ? 'rainCoins' : 'rainKerala');
    } else if (k.kind === 'balloons') {
      S.left = SETTINGS.SURPRISE_SECONDS + 5;
      S.popped = 0;
      const colors = ['#ff5d8f', '#ffd23d', '#3dd6ff', '#7dff6b', '#b26bff', '#ff8a3d'];
      for (let i = 0; i < 10; i++) {
        const [x, z] = freeSpot(room);
        const b = new THREE.Group();
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), mat(colors[i % colors.length]));
        ball.scale.y = 1.2;
        ball.position.y = 0.6;
        b.add(ball);
        const str = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.6, 3), mat('#ffffff'));
        str.position.y = 0.05;
        b.add(str);
        b.position.set(x, PLINTH + 0.3, z);
        b.userData.phase = Math.random() * 6;
        scene.add(b);
        S.objects.push(b);
      }
      S.title = t('balloonStart');
    } else if (k.kind === 'kitten') {
      S.left = SETTINGS.KITTEN_SECONDS;
      const [x, z] = freeSpot(room, player, 3);
      const kit = makeKitten();
      kit.position.set(x, PLINTH, z);
      kit.rotation.y = Math.random() * 6;
      scene.add(kit);
      S.objects.push(kit);
      S.kitten = kit;
      S.meowIn = 0.8;
      S.title = t('kittenStart');
    } else if (k.kind === 'chest') {
      S.left = 30;
      const [x, z] = freeSpot(room, player, 2.2);
      const chest = makeChest();
      chest.position.set(x, PLINTH, z);
      chest.lookAt(player.x, PLINTH, player.z);
      scene.add(chest);
      S.objects.push(chest);
      S.chest = chest;
      S.title = '🧰 ✨';
    }
    setBanner(S.title);
  }

  function finish(message, coins) {
    for (const o of S.objects) scene.remove(o);
    const room = S.room;
    S = null;
    setBanner(null);
    onEnd(room, coins, message);
  }

  function update(dt, time, player) {
    // gift boxes bob and spin a little
    for (const g of gifts) {
      if (!g.group.visible) continue;
      g.group.rotation.y += dt * 0.8;
      g.group.position.y = PLINTH + Math.abs(Math.sin(time * 3)) * 0.08;
      g.free.position.y = g.quiz.position.y = 1.4 + Math.sin(time * 2.5) * 0.12;
    }
    if (!S) return;
    S.time += dt;
    S.left -= dt;
    const near = (x, z, r) => Math.hypot(player.x - x, player.z - z) < r;

    if (S.kind === 'rain') {
      if (S.left > 0) {
        S.spawn -= dt;
        if (S.spawn <= 0) {
          S.spawn = low ? 0.32 : 0.2;
          const tr = makeTreat(S.variant, S.objects.length);
          const x = S.room.x1 + 0.5 + Math.random() * (S.room.x2 - S.room.x1 - 1);
          const z = S.room.z1 + 0.5 + Math.random() * (S.room.z2 - S.room.z1 - 1);
          tr.position.set(x, PLINTH + 3.6, z);
          tr.userData = { vy: 0, life: 4, spin: (Math.random() - 0.5) * 8 };
          scene.add(tr);
          S.objects.push(tr);
        }
      }
      for (const o of S.objects) {
        const u = o.userData;
        if (u.gone) continue;
        if (o.position.y > PLINTH + 0.12) {
          u.vy -= 5 * dt;
          o.position.y = Math.max(PLINTH + 0.12, o.position.y + u.vy * dt);
          o.rotation.y += u.spin * dt;
          o.rotation.x += u.spin * 0.5 * dt;
        } else {
          u.life -= dt;
          if (u.life < 0.5) o.scale.setScalar(Math.max(0.01, u.life * 2));
          if (u.life <= 0) { u.gone = true; scene.remove(o); }
        }
        if (!u.gone && o.position.y < player.y + 1.9 && near(o.position.x, o.position.z, 0.8)) {
          u.gone = true;
          scene.remove(o);
          S.caught++;
          play('catch');
        }
      }
      S.objects = S.objects.filter((o) => !o.userData.gone);
      setBanner(`${S.title}  ${t('caught', { n: S.caught, s: Math.max(0, Math.ceil(S.left)) })}`);
      if (S.left <= 0 && !S.objects.length) {
        const coins = S.caught * (S.variant === 'coins' ? 2 : 1);
        stat('treats', S.caught);
        finish(t('surpriseEnd', { c: coins }), coins);
      }
    } else if (S.kind === 'balloons') {
      for (const b of S.objects) {
        if (b.userData.gone) continue;
        b.position.y = PLINTH + 0.3 + Math.min(1, S.time * 0.6) * 0.6 + Math.sin(time * 2 + b.userData.phase) * 0.12;
        if (near(b.position.x, b.position.z, 0.75)) {
          b.userData.gone = true;
          scene.remove(b);
          S.popped++;
          play('pop');
        }
      }
      S.objects = S.objects.filter((o) => !o.userData.gone);
      setBanner(`${S.title}  ${t('popped', { n: S.popped, s: Math.max(0, Math.ceil(S.left)) })}`);
      if (!S.objects.length || S.left <= 0) {
        const coins = S.popped * 2 + (S.objects.length ? 0 : 10);
        stat('balloons', S.popped);
        finish(t('surpriseEnd', { c: coins }), coins);
      }
    } else if (S.kind === 'kitten') {
      const k = S.kitten;
      const d = Math.hypot(player.x - k.position.x, player.z - k.position.z);
      k.userData.tail.rotation.z = Math.sin(time * 6) * 0.5;
      if (S.found) {
        k.position.y = PLINTH + Math.abs(Math.sin(S.found * 8)) * 0.4;
        S.found += dt;
        if (S.found > 1.5) finish(`${t('kittenFound')} +25 🪙`, 25);
        return;
      }
      k.userData.head.rotation.y = Math.sin(time * 1.5) * 0.4;
      S.meowIn -= dt;
      if (S.meowIn <= 0) {
        S.meowIn = 2.4;
        play('meow', 0.03 + 0.17 * (1 - Math.min(d, 9) / 9));
      }
      setBanner(d < 2.5 ? t('kittenClose') : `${S.title}  ⏱ ${Math.max(0, Math.ceil(S.left))}`);
      if (d < 1.1) {
        S.found = 0.001;
        k.lookAt(player.x, PLINTH, player.z);
        play('meow', 0.2);
        stat('kittens', 1);
      } else if (S.left <= 0) {
        finish(t('kittenMissed'), 0);
      }
    } else if (S.kind === 'chest') {
      const c = S.chest;
      if (S.opened !== undefined) {
        S.opened += dt;
        c.userData.lid.rotation.x = -Math.min(1.9, S.opened * 4);
        if (S.reveal) S.reveal.position.y = PLINTH + 0.6 + Math.min(1.2, S.opened * 1.2);
        if (S.opened > 2.6) finish(S.message, 15);
        return;
      }
      c.position.y = PLINTH + Math.abs(Math.sin(time * 4)) * 0.05;
      if (near(c.position.x, c.position.z, 1.1)) {
        S.opened = 0;
        const { sticker, isNew } = S.giveSticker();
        S.reveal = sprite(sticker.emoji, 1.1);
        S.reveal.position.set(c.position.x, PLINTH + 0.6, c.position.z);
        scene.add(S.reveal);
        S.objects.push(S.reveal);
        S.message = `${t(isNew ? 'chestGot' : 'chestDup', { s: `${sticker.emoji} ${sticker.label}` })} +15 🪙`;
        stat('chests', 1);
        play('chest');
      } else if (S.left <= 0) {
        finish(t('surpriseEnd', { c: 0 }), 0);
      }
    }
  }

  return {
    gifts,
    start(room, player, giveSticker, forced) { start(room, player, forced); if (S) S.giveSticker = giveSticker; },
    active: () => !!S,
    activeRoom: () => S?.room,
    update,
  };
}
