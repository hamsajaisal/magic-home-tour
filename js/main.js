// Starts the game: loads data, builds the 3D house, runs the walking loop and door quizzes.
import * as THREE from 'three';
import { SETTINGS } from '../settings.js';
import { save, persist, resetAll, roomState } from './storage.js';
import { loadLanguages, setLang, lang, t, pick, onLangChange, applyToPage } from './i18n.js';
import { loadQuestions, makeQuiz, available, toQuizItem, sources } from './questions.js';
import { buildWorld, floorHeight, labelTexture, START } from './world/house.js';
import { createPlayer, PLAYER_RADIUS } from './world/player.js';
import { initControls, getMove, takeYaw, setControlsEnabled } from './controls.js';
import { openQuiz, isQuizOpen, retranslateQuiz } from './ui/quiz.js';
import { play, unlockAudio } from './audio.js';
import { confetti } from './fx.js';

const $ = (id) => document.getElementById(id);
let rooms = [];
let W, player, renderer, scene, camera, sun;
const pos = new THREE.Vector3(START.x, 0, START.z);
const vel = new THREE.Vector2();
let facing = Math.PI;      // facing the house
let yaw = 0;               // camera angle around the child
let playing = false;
let promptDoor = null;
let dismissedDoor = null;
let pendingUnlock = null;
let walked = 0;

// ---------- start up ----------
boot().catch((e) => {
  console.error(e);
  $('loading').querySelector('p').textContent = t('loadError') + ' (' + e.message + ')';
});

async function boot() {
  await loadLanguages();
  setLang(save.lang || SETTINGS.DEFAULT_LANGUAGE);
  const [roomData] = await Promise.all([
    fetch('data/rooms.json').then((r) => r.json()),
    loadQuestions(),
    document.fonts.load('700 40px "Baloo Chettan 2"', 'മലയാളം Aa').catch(() => {}),
  ]);
  rooms = roomData.rooms;
  setup3D();
  setupUI();
  refreshAll();
  $('loading').classList.add('hidden');
  $('start').classList.remove('hidden');
  requestAnimationFrame(loop);
}

function isLowGraphics() {
  if (save.settings.lowGraphics !== null) return save.settings.lowGraphics;
  const phone = matchMedia('(pointer: coarse)').matches;
  const weak = (navigator.hardwareConcurrency || 4) <= 4 || (navigator.deviceMemory || 4) <= 3;
  return phone && weak;
}

function setup3D() {
  const low = isLowGraphics();
  renderer = new THREE.WebGLRenderer({ canvas: $('game'), antialias: !low, powerPreference: 'high-performance' });
  const phone = matchMedia('(pointer: coarse)').matches;
  renderer.setPixelRatio(low ? 1 : Math.min(devicePixelRatio, phone ? 1.5 : 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = !low;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.background = new THREE.Color('#8fd3ff');
  scene.fog = new THREE.Fog('#bfe9ff', 40, 90);
  camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 200);

  scene.add(new THREE.HemisphereLight('#dff4ff', '#7cbf5a', 1.1));
  sun = new THREE.DirectionalLight('#fff3dd', 1.6);
  sun.position.set(12, 22, 10);
  if (!low) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 60 });
    sun.shadow.bias = -0.0015;
  }
  scene.add(sun, sun.target);

  W = buildWorld(scene, rooms, { low });
  player = createPlayer();
  scene.add(player.root);

  for (const d of W.doors) {
    if (roomState(d.room.id).unlocked) openDoor(d, true);
  }

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}

// ---------- doors ----------
function openDoor(d, instant = false) {
  d.collider.on = false;
  d.target = d.openAngle;
  d.badge.visible = false;
  d.lock.visible = false;
  d.lid.visible = false;
  W.fadeables = W.fadeables.filter((m) => m !== d.lid);
  if (instant) d.angle = d.openAngle;
}

function quizSize(room) {
  const n = Math.min(SETTINGS.QUESTIONS_PER_QUIZ, available(room.subject, lang()).length);
  const k = n >= SETTINGS.QUESTIONS_PER_QUIZ ? SETTINGS.CORRECT_TO_UNLOCK
    : Math.max(1, Math.ceil((SETTINGS.CORRECT_TO_UNLOCK * n) / SETTINGS.QUESTIONS_PER_QUIZ));
  return { n, k };
}

function startQuiz(door) {
  const room = door.room;
  const items = makeQuiz(room.subject, lang(), SETTINGS.QUESTIONS_PER_QUIZ, save);
  if (!items.length) { toast(t('noQuestions')); return; }
  hidePrompt();
  setTip('');
  setControlsEnabled(false);
  items.forEach((it) => { save.seen[it.id] = (save.seen[it.id] || 0) + 1; });
  persist();
  const needed = quizSize(room).k;
  openQuiz({
    title: () => `${room.emoji} ${pick(room.name)}`,
    items,
    onAnswer(item, firstTry) {
      const levelBefore = level();
      if (firstTry) {
        save.coins += SETTINGS.COINS_PER_CORRECT;
        save.xp += SETTINGS.XP_PER_CORRECT;
        if (save.wrong[item.id]) save.wrong[item.id] = Math.max(0, save.wrong[item.id] - 1);
        if (!save.wrong[item.id]) delete save.wrong[item.id];
        play('coin');
      } else {
        save.wrong[item.id] = (save.wrong[item.id] || 0) + 1;
      }
      persist();
      refreshHUD();
      if (level() > levelBefore) toast(t('levelUp', { l: level() }));
    },
    onFinish(score, total) {
      const passed = score >= needed;
      const stars = score === total ? 3 : passed ? 2 : score >= Math.ceil(total / 2) ? 1 : 0;
      const rs = roomState(room.id);
      if (passed) {
        const firstUnlock = !rs.unlocked;
        rs.unlocked = true;
        rs.stars = Math.max(rs.stars, stars);
        rs.best = Math.max(rs.best, score);
        save.coins += SETTINGS.COINS_FOR_UNLOCK;
        pendingUnlock = { door, firstUnlock };
      }
      persist();
      refreshAll();
      return { passed, stars, needed };
    },
    onRetry() { startQuiz(door); },
    onClose() {
      setControlsEnabled(true);
      dismissedDoor = door;
      if (pendingUnlock) {
        const { door: d } = pendingUnlock;
        pendingUnlock = null;
        openDoor(d);
        confetti(160);
        player.cheer();
        toast(t('coinsEarned', { c: SETTINGS.COINS_FOR_UNLOCK }));
        if (W.doors.every((x) => roomState(x.room.id).unlocked)) setTimeout(() => toast(t('allOpen')), 1600);
      }
    },
  });
}

function showPrompt(door) {
  promptDoor = door;
  const { n, k } = quizSize(door.room);
  $('prompt-emoji').textContent = `${door.room.emoji}🔒`;
  $('prompt-text').textContent = n
    ? t('lockedPrompt', { room: pick(door.room.name), n, k })
    : t('noQuestions');
  $('prompt-go').classList.toggle('hidden', !n);
  $('prompt').classList.remove('hidden');
}

function hidePrompt() {
  promptDoor = null;
  $('prompt').classList.add('hidden');
}

// ---------- HUD and signs ----------
const level = () => Math.floor(save.xp / SETTINGS.XP_PER_LEVEL) + 1;

function refreshHUD() {
  $('hud-coins').textContent = save.coins;
  $('hud-level').textContent = level();
  $('hud-xp').style.width = `${((save.xp % SETTINGS.XP_PER_LEVEL) / SETTINGS.XP_PER_LEVEL) * 100}%`;
  const open = rooms.filter((r) => roomState(r.id).unlocked).length;
  $('hud-rooms').textContent = `${open}/${rooms.length}`;
  $('lang-btn').textContent = t('switchTo');
  $('quiz-lang').textContent = t('switchTo');
  $('sound-btn').textContent = save.settings.sound ? '🔊' : '🔇';
  $('start-stats').textContent = save.xp ? `🪙 ${save.coins} · ⭐ ${t('level')} ${level()} · 🚪 ${open}/${rooms.length}` : '';
  document.querySelectorAll('[data-lang]').forEach((b) => b.classList.toggle('active', b.dataset.lang === lang()));
}

function refreshSigns() {
  for (const d of W.doors) {
    const rs = roomState(d.room.id);
    const second = rs.unlocked ? '⭐'.repeat(rs.stars) + '☆'.repeat(3 - rs.stars) : `🔒 ${quizSize(d.room).n} ❓`;
    d.sign.material.map?.dispose();
    d.sign.material.map = labelTexture([`${d.room.emoji} ${pick(d.room.name)}`, second], d.room.color, '#3a2a1a');
    d.sign.material.needsUpdate = true;
  }
  W.titleSign.material.map?.dispose();
  W.titleSign.material.map = labelTexture(`🏡 ${t('title')}`, '#ff8a3d', '#ffffff');
  W.titleSign.material.needsUpdate = true;
}

function refreshAll() {
  refreshHUD();
  if (W) refreshSigns();
}

function toast(text) {
  const d = document.createElement('div');
  d.className = 'toast';
  d.textContent = text;
  $('toasts').appendChild(d);
  setTimeout(() => d.remove(), 2800);
}

function setTip(text) {
  const tip = $('tip');
  tip.textContent = text || '';
  tip.classList.toggle('hidden', !text);
}

function controlsTip() {
  return document.body.classList.contains('touch') ? t('controlsTouch') : t('controlsDesktop');
}

// ---------- buttons and menus ----------
function changeLang(l) {
  save.lang = l;
  persist();
  setLang(l);
}

function setupUI() {
  initControls({
    onAction() { if (promptDoor && !isQuizOpen()) startQuiz(promptDoor); },
  });
  onLangChange(() => {
    refreshAll();
    retranslateQuiz((it) => toQuizItem(it.raw, lang(), it.order));
    if (promptDoor) showPrompt(promptDoor);
    if (playing && !$('tip').classList.contains('hidden')) setTip(walked < 3 ? controlsTip() : t('goToDoor'));
  });
  document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => { play('click'); changeLang(b.dataset.lang); }));
  $('lang-btn').addEventListener('click', () => { play('click'); changeLang(lang() === 'ml' ? 'en' : 'ml'); });
  $('quiz-lang').addEventListener('click', () => { play('click'); changeLang(lang() === 'ml' ? 'en' : 'ml'); });
  $('play-btn').addEventListener('click', () => {
    unlockAudio();
    play('click');
    if (!save.lang) changeLang(lang());
    $('start').classList.add('hidden');
    $('hud').classList.remove('hidden');
    $('cam-btns').classList.add('playing');
    playing = true;
    setTip(controlsTip());
    setTimeout(() => { if ($('tip').textContent === controlsTip()) setTip(''); }, 12000);
  });
  $('prompt-go').addEventListener('click', () => { unlockAudio(); play('click'); if (promptDoor) startQuiz(promptDoor); });
  $('prompt-no').addEventListener('click', () => { play('click'); dismissedDoor = promptDoor; hidePrompt(); });
  $('sound-btn').addEventListener('click', () => {
    save.settings.sound = !save.settings.sound; persist(); refreshHUD(); unlockAudio(); play('click');
  });
  $('settings-btn').addEventListener('click', () => {
    play('click');
    $('set-low').checked = isLowGraphics();
    $('set-sound').checked = save.settings.sound;
    setControlsEnabled(false);
    $('settings').classList.remove('hidden');
  });
  $('set-low').addEventListener('change', (e) => { save.settings.lowGraphics = e.target.checked; persist(); location.reload(); });
  $('set-sound').addEventListener('change', (e) => { save.settings.sound = e.target.checked; persist(); refreshHUD(); });
  $('reset-btn').addEventListener('click', () => {
    if (confirm(t('resetConfirm'))) { resetAll(); location.reload(); }
  });
  $('credits-btn').addEventListener('click', () => {
    const list = $('credits-list');
    list.innerHTML = '';
    for (const [src, count] of sources()) {
      const li = document.createElement('li');
      li.textContent = `${src} (${count})`;
      list.appendChild(li);
    }
    $('settings').classList.add('hidden');
    $('credits').classList.remove('hidden');
  });
  document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => {
    play('click');
    $(b.dataset.close).classList.add('hidden');
    setControlsEnabled(!isQuizOpen());
  }));
  applyToPage();
}

// ---------- walking ----------
function collide(p) {
  const R = PLAYER_RADIUS;
  for (let pass = 0; pass < 2; pass++) {
    for (const c of W.colliders) {
      if (!c.on) continue;
      const cx = Math.max(c.minX, Math.min(p.x, c.maxX));
      const cz = Math.max(c.minZ, Math.min(p.z, c.maxZ));
      const dx = p.x - cx, dz = p.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= R * R) continue;
      if (d2 > 1e-9) {
        const d = Math.sqrt(d2);
        p.x = cx + (dx / d) * R;
        p.z = cz + (dz / d) * R;
      } else {
        const l = p.x - c.minX, r = c.maxX - p.x, b = p.z - c.minZ, f = c.maxZ - p.z;
        const m = Math.min(l, r, b, f);
        if (m === l) p.x = c.minX - R; else if (m === r) p.x = c.maxX + R;
        else if (m === b) p.z = c.minZ - R; else p.z = c.maxZ + R;
      }
    }
  }
}

function updatePlayer(dt) {
  yaw += takeYaw(dt);
  const mv = playing ? getMove() : { x: 0, y: 0 };
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw);       // forward on the ground
  const rx = Math.cos(yaw), rz = -Math.sin(yaw);        // right on the ground
  const tx = (rx * mv.x + fx * mv.y) * SETTINGS.WALK_SPEED;
  const tz = (rz * mv.x + fz * mv.y) * SETTINGS.WALK_SPEED;
  const k = Math.min(1, dt * 10);
  vel.x += (tx - vel.x) * k;
  vel.y += (tz - vel.y) * k;
  const before = pos.clone();
  pos.x += vel.x * dt;
  pos.z += vel.y * dt;
  collide(pos);
  walked += before.distanceTo(pos);
  const speed = Math.hypot(vel.x, vel.y);
  if (speed > 0.3) {
    const target = Math.atan2(vel.x, vel.y);
    let diff = target - facing;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    facing += diff * Math.min(1, dt * 12);
  }
  pos.y += (floorHeight(pos.x, pos.z) - pos.y) * Math.min(1, dt * 14);
  player.root.position.copy(pos);
  player.root.rotation.y = facing;
  player.animate(dt, Math.min(1, speed / SETTINGS.WALK_SPEED));
  player.updateCheer(dt);
}

function checkDoors() {
  if (!playing || isQuizOpen()) return;
  let near = null, best = 1.5;
  for (const d of W.doors) {
    if (!d.collider.on) continue;
    const dist = Math.hypot(pos.x - d.front[0], pos.z - d.front[1]);
    if (dist < best) { best = dist; near = d; }
  }
  if (dismissedDoor && (!near || near !== dismissedDoor)) {
    const dd = dismissedDoor;
    if (Math.hypot(pos.x - dd.front[0], pos.z - dd.front[1]) > 2.5) dismissedDoor = null;
  }
  if (near && near !== dismissedDoor) {
    if (promptDoor !== near) { showPrompt(near); play('click'); setTip(''); }
  } else if (promptDoor) {
    hidePrompt();
  }
  if (playing && !promptDoor && walked > 3 && walked < 4 && !rooms.some((r) => roomState(r.id).unlocked)) setTip(t('goToDoor'));
}

// ---------- camera ----------
const ray = new THREE.Raycaster();
const camGoal = new THREE.Vector3();
const lookAt = new THREE.Vector3();
let introAngle = 0;
let snapCamera = true;

function updateCamera(dt) {
  if (!playing) {
    // slow turn around the house behind the start screen
    introAngle += dt * 0.12;
    camera.position.set(Math.sin(introAngle) * 30, 14, 6 + Math.cos(introAngle) * 30);
    camera.lookAt(0, 1.5, 2);
    return;
  }
  const narrow = innerWidth < innerHeight;
  const dist = narrow ? 7.5 : 6.5, height = narrow ? 5.2 : 4.4;
  lookAt.set(pos.x, pos.y + 1.1, pos.z);
  camGoal.set(pos.x + Math.sin(yaw) * dist, pos.y + height, pos.z + Math.cos(yaw) * dist);
  if (snapCamera) { camera.position.copy(camGoal); snapCamera = false; }
  else camera.position.lerp(camGoal, Math.min(1, dt * 6));
  camera.lookAt(lookAt);

  // walls between the camera and the child (head or feet) become see-through
  const hits = new Set();
  for (const lift of [1.1, 0.15]) {
    const from = new THREE.Vector3(pos.x, pos.y + lift, pos.z);
    const dir = camera.position.clone().sub(from);
    ray.set(from, dir.clone().normalize());
    ray.far = dir.length();
    for (const h of ray.intersectObjects(W.fadeables, false)) hits.add(h.object);
  }
  for (const m of W.fadeables) {
    const goal = hits.has(m) ? 0.2 : 1;
    const mt = m.material;
    mt.opacity += (goal - mt.opacity) * Math.min(1, dt * 8);
    const see = mt.opacity < 0.98;
    if (mt.transparent !== see) { mt.transparent = see; mt.needsUpdate = true; }
    mt.depthWrite = !see;
  }
  for (const w of W.windows) {
    const from = w.wall.material, to = w.mesh.material;
    to.opacity = from.opacity;
    if (to.transparent !== from.transparent) { to.transparent = from.transparent; to.needsUpdate = true; }
    to.depthWrite = from.depthWrite;
  }
}

// ---------- main loop ----------
const clock = new THREE.Clock();
let slowFrames = 0;

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, clock.getDelta());
  const time = clock.elapsedTime;
  updatePlayer(dt);
  checkDoors();
  W.update(dt, time, pos);
  updateCamera(dt);
  renderer.render(scene, camera);

  // if the phone struggles, quietly lower the quality
  if (dt > 0.045) slowFrames++; else slowFrames = Math.max(0, slowFrames - 1);
  if (slowFrames > 90 && renderer.getPixelRatio() > 1) {
    renderer.setPixelRatio(1);
    sun.castShadow = false;
    slowFrames = 0;
  }
}

// handy for testing in the browser console
window.__game = { save, get doors() { return W.doors; }, pos, startQuiz, snap() { snapCamera = true; } };
