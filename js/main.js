// Starts the game: loads data, builds the 3D house, runs the walking loop, door quizzes and surprises.
import * as THREE from 'three';
import { SETTINGS } from '../settings.js';
import { save, persist, resetAll, roomState, today } from './storage.js';
import { loadLanguages, setLang, lang, t, tIn, pick, onLangChange, applyToPage } from './i18n.js';
import { loadQuestions, makeQuiz, available, toQuizItem, sources, makeRevisionQuiz, wrongQuestions } from './questions.js';
import { buildWorld, floorHeight, labelTexture, setSignFont, START } from './world/house.js';
import { createPlayer, PLAYER_RADIUS } from './world/player.js';
import { collide } from './world/physics.js';
import { createSurprises } from './world/surprises.js';
import { createDecor } from './world/decor.js';
import { createExtras } from './world/extras.js';
import { initControls, getMove, takeYaw, setControlsEnabled } from './controls.js';
import { openQuiz, isQuizOpen, retranslateQuiz } from './ui/quiz.js';
import { initPanels, openShop, openAlbum, openDaily, openProgress } from './ui/panels.js';
import {
  loadCatalog, addCoins, bumpStat, checkBadges, giveSticker, dailyCheck, level,
  freeSurpriseReady, useFreeSurprise, claimDaily,
} from './rewards.js';
import { play, unlockAudio } from './audio.js';
import { loadVoice } from './voice.js';
import { recordAnswer } from './progress.js';
import { confetti } from './fx.js';

const $ = (id) => document.getElementById(id);
let rooms = [];
let W, player, renderer, scene, camera, sun, surprises, decor, extras;
const pos = new THREE.Vector3(START.x, 0, START.z);
const vel = new THREE.Vector2();
let facing = Math.PI;      // facing the house
let yaw = 0;               // camera angle around the child
let playing = false;
let prompt = null;         // { kind: 'door' | 'gift', door?, gift?, pos: [x, z] }
let dismissed = null;
let pendingUnlock = null;
let pendingSurprise = null;
let walked = 0;
const me = { x: 0, y: 0, z: 0, facing: 0, speed: 0 };   // the child, as seen by pets and surprises

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
    loadVoice(),
    document.fonts.load('700 40px "Game Font"', 'മലയാളം Aa').catch(() => {}),
    document.fonts.load('700 40px "Game Font New"', 'മലയാളം Aa').catch(() => {}),
  ]);
  rooms = roomData.rooms;
  applyLipi(save.settings.lipi);
  await loadCatalog(rooms, { showToast: toast, changed: refreshHUD });
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
  player.setCostume(save.costume);
  scene.add(player.root);

  surprises = createSurprises({
    scene, W, rooms, low,
    setBanner,
    stat: bumpStat,
    onEnd(room, coins, message) {
      addCoins(coins);
      toast(message);
      if (coins > 0) { confetti(70); player.cheer(); play('unlock'); }
      if (coins > 0 && room.id === secretRoomId()) {
        addCoins(coins);
        setTimeout(() => { toast(t('secretBonus', { c: coins })); confetti(80, ['🌟', '🪙']); }, 900);
      }
    },
  });
  decor = createDecor({ scene, W, play });
  decor.apply(save.owned);
  extras = createExtras({ scene, W });

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

// One quiz runner for doors (unlock the room) and gift boxes (open a new surprise).
function runQuiz(opts) {
  const { room, count, door, onPassed } = opts;
  let { needed } = opts;
  const items = opts.makeItems ? opts.makeItems() : makeQuiz(room.subject, lang(), count, save);
  if (!items.length) { toast(t('noQuestions')); return; }
  needed = Math.min(needed, items.length);
  const askedAt = prompt;
  hidePrompt();
  setTip('');
  setControlsEnabled(false);
  items.forEach((it) => { save.seen[it.id] = (save.seen[it.id] || 0) + 1; });
  persist();
  let passedNow = false;
  openQuiz({
    title: () => `${room.emoji} ${pick(room.name)}`,
    passTitle: door ? null : opts.passTitle || 'bonusPass',
    passButton: door ? null : opts.passButton || 'bonusGo',
    items,
    onAnswer(item, firstTry, seconds) {
      recordAnswer(item, firstTry, seconds);
      const levelBefore = level();
      if (firstTry) {
        save.xp += SETTINGS.XP_PER_CORRECT;
        if (save.wrong[item.id]) save.wrong[item.id] = Math.max(0, save.wrong[item.id] - 1);
        if (!save.wrong[item.id]) delete save.wrong[item.id];
        addCoins(SETTINGS.COINS_PER_CORRECT);
        play('coin');
        bumpStat('correct');
      } else {
        save.wrong[item.id] = (save.wrong[item.id] || 0) + 1;
        persist();
      }
      refreshHUD();
      if (level() > levelBefore) toast(t('levelUp', { l: level() }));
    },
    onFinish(score, total) {
      passedNow = score >= needed;
      const stars = score === total ? 3 : passedNow ? 2 : score >= Math.ceil(total / 2) ? 1 : 0;
      if (score === total) bumpStat('perfectQuizzes');
      if (door && passedNow) {
        const rs = roomState(room.id);
        rs.unlocked = true;
        rs.stars = Math.max(rs.stars, stars);
        rs.best = Math.max(rs.best, score);
        save.coins += SETTINGS.COINS_FOR_UNLOCK;
        pendingUnlock = door;
      }
      persist();
      refreshAll();
      return { passed: passedNow, stars, needed };
    },
    onRetry() { runQuiz(opts); },
    onClose() {
      setControlsEnabled(true);
      dismissed = askedAt;
      if (pendingUnlock) {
        const d = pendingUnlock;
        pendingUnlock = null;
        openDoor(d);
        confetti(160);
        player.cheer();
        toast(t('coinsEarned', { c: SETTINGS.COINS_FOR_UNLOCK }));
        checkBadges();
        if (W.doors.every((x) => roomState(x.room.id).unlocked)) setTimeout(() => toast(t('allOpen')), 1600);
      }
      if (passedNow && onPassed) onPassed();
    },
  });
}

function startDoorQuiz(door) {
  runQuiz({ room: door.room, count: SETTINGS.QUESTIONS_PER_QUIZ, needed: quizSize(door.room).k, door });
}

// ---------- surprises ----------
function startSurprise(room, forced) {
  hidePrompt();
  setTip('');
  surprises.start(room, me, () => {
    const r = giveSticker();
    return { isNew: r.isNew, sticker: { ...r.sticker, label: pick(r.sticker.name) } };
  }, forced);
}

function openGift(gift) {
  if (freeSurpriseReady(gift.room.id)) {
    useFreeSurprise(gift.room.id);
    startSurprise(gift.room);
  } else {
    pendingSurprise = gift.room;
    runQuiz({
      room: gift.room, count: SETTINGS.BONUS_QUESTIONS, needed: SETTINGS.BONUS_CORRECT,
      onPassed: () => { const r = pendingSurprise; pendingSurprise = null; startSurprise(r); },
    });
  }
}

// One room each day is the "secret room": its surprise gives double coins.
function secretRoomId() {
  let h = 0;
  for (const ch of today()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return rooms[h % rooms.length].id;
}

const nameOf = (key) => ({ en: tIn('en', key), ml: tIn('ml', key) });
const wellRoom = () => ({ id: 'well', subject: 'mix', emoji: '🪣', name: nameOf('wellName') });
const cupboardRoom = () => ({ id: 'cupboard', subject: 'mix', emoji: '📚', name: nameOf('cupboardName') });

function startWellQuiz() {
  runQuiz({
    room: wellRoom(), count: SETTINGS.QUESTIONS_PER_QUIZ, needed: Math.ceil(SETTINGS.QUESTIONS_PER_QUIZ * 0.6),
    passTitle: 'mixPass', passButton: 'continue',
    onPassed: () => {
      addCoins(SETTINGS.COINS_FOR_UNLOCK);
      toast(t('coinsEarned', { c: SETTINGS.COINS_FOR_UNLOCK }));
      confetti(90, ['💧', '🪙', '✨']);
      player.cheer();
      bumpStat('wells');
    },
  });
}

function startRevision() {
  const n = Math.min(SETTINGS.QUESTIONS_PER_QUIZ, wrongQuestions(save, lang()).length);
  runQuiz({
    room: cupboardRoom(), count: n, needed: Math.ceil(n / 2),
    makeItems: () => makeRevisionQuiz(save, lang(), SETTINGS.QUESTIONS_PER_QUIZ),
    passTitle: 'revisionPass', passButton: 'continue',
    onPassed: () => { confetti(70, ['📚', '⭐']); player.cheer(); bumpStat('revisions'); refreshAll(); },
  });
}

function setBanner(text) {
  const b = $('banner');
  b.textContent = text || '';
  b.classList.toggle('hidden', !text);
}

// ---------- prompts at doors and gift boxes ----------
function showPrompt(target) {
  prompt = target;
  if (target.kind === 'door') {
    const room = target.door.room;
    const { n, k } = quizSize(room);
    $('prompt-emoji').textContent = `${room.emoji}🔒`;
    $('prompt-text').textContent = n ? t('lockedPrompt', { room: pick(room.name), n, k }) : t('noQuestions');
    $('prompt-go').textContent = t('startQuiz');
    $('prompt-go').classList.toggle('hidden', !n);
  } else if (target.kind === 'well') {
    $('prompt-emoji').textContent = '🪣✨';
    $('prompt-text').textContent = t('wellPrompt', { n: SETTINGS.QUESTIONS_PER_QUIZ });
    $('prompt-go').textContent = t('wellGo');
    $('prompt-go').classList.remove('hidden');
  } else if (target.kind === 'cupboard') {
    const n = wrongQuestions(save, lang()).length;
    $('prompt-emoji').textContent = n ? '📚🔒' : '📚✨';
    $('prompt-text').textContent = n ? t('cupboardPrompt', { n }) : t('cupboardEmpty');
    $('prompt-go').textContent = t('cupboardGo');
    $('prompt-go').classList.toggle('hidden', !n);
  } else {
    const free = freeSurpriseReady(target.gift.room.id);
    $('prompt-emoji').textContent = free ? '🎁' : '🎁❓';
    $('prompt-text').textContent = free ? t('giftFree') : t('giftQuiz', { n: SETTINGS.BONUS_QUESTIONS, k: SETTINGS.BONUS_CORRECT });
    $('prompt-go').textContent = free ? t('giftOpen') : t('giftStart');
    $('prompt-go').classList.remove('hidden');
  }
  $('prompt').classList.remove('hidden');
}

function hidePrompt() {
  prompt = null;
  $('prompt').classList.add('hidden');
}

function act() {
  if (!prompt || isQuizOpen()) return;
  unlockAudio();
  play('click');
  if (prompt.kind === 'door') startDoorQuiz(prompt.door);
  else if (prompt.kind === 'well') startWellQuiz();
  else if (prompt.kind === 'cupboard') startRevision();
  else openGift(prompt.gift);
}

function checkPrompts() {
  if (!playing || isQuizOpen() || anyPanelOpen()) return;
  const targets = [];
  for (const d of W.doors) if (d.collider.on) targets.push({ kind: 'door', key: `door:${d.room.id}`, door: d, pos: d.front, r: 1.5 });
  if (!surprises.active()) {
    for (const g of surprises.gifts) if (g.group.visible) targets.push({ kind: 'gift', key: `gift:${g.room.id}`, gift: g, pos: g.pos, r: 1.3 });
    targets.push({ kind: 'well', key: 'well', pos: extras.well.pos, r: 2.0 });
    targets.push({ kind: 'cupboard', key: 'cupboard', pos: extras.cupboard.pos, r: 1.3 });
  }
  let near = null, best = Infinity;
  for (const tg of targets) {
    const dist = Math.hypot(pos.x - tg.pos[0], pos.z - tg.pos[1]);
    if (dist < tg.r && dist < best) { best = dist; near = tg; }
  }
  const same = (a, b) => a && b && a.key === b.key;
  if (dismissed && !same(near, dismissed) && Math.hypot(pos.x - dismissed.pos[0], pos.z - dismissed.pos[1]) > 2.5) dismissed = null;
  if (near && !same(near, dismissed)) {
    if (!same(prompt, near)) { showPrompt(near); play('click'); setTip(''); }
  } else if (prompt) {
    hidePrompt();
  }
  if (!prompt && walked > 3 && walked < 4 && !rooms.some((r) => roomState(r.id).unlocked)) setTip(t('goToDoor'));
}

const PANELS = ['shop', 'album', 'daily', 'settings', 'credits', 'progress'];
const anyPanelOpen = () => PANELS.some((id) => !$(id).classList.contains('hidden'));

// ---------- HUD and signs ----------
function refreshHUD() {
  $('joystick').dataset.label = t('joyHint');
  $('hud-coins').textContent = save.coins;
  $('hud-level').textContent = level();
  $('hud-xp').style.width = `${((save.xp % SETTINGS.XP_PER_LEVEL) / SETTINGS.XP_PER_LEVEL) * 100}%`;
  const open = rooms.filter((r) => roomState(r.id).unlocked).length;
  $('hud-rooms').textContent = `${open}/${rooms.length}`;
  $('hud-streak').textContent = t('streakDays', { n: save.streak.count });
  $('hud-streak').classList.toggle('hidden', !save.streak.count);
  $('pill-coins').setAttribute('aria-label', `${t('coins')}: ${save.coins}`);
  $('pill-level').setAttribute('aria-label', `${t('level')} ${level()}`);
  $('pill-rooms').setAttribute('aria-label', `${t('rooms')}: ${open} / ${rooms.length}`);
  $('hud-streak').setAttribute('aria-label', t('dailyStreak', { n: save.streak.count }));
  $('sound-btn').setAttribute('aria-pressed', String(!!save.settings.sound));
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
  extras.refreshSigns({ cupboard: t('cupboardName'), well: t('wellName') }, wrongQuestions(save, lang()).length);
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

// ---------- shop ----------
function buy(item) {
  if (save.coins < item.price || save.owned.includes(item.id)) return;
  save.coins -= item.price;
  save.owned.push(item.id);
  if (item.type === 'costume') save.costume[item.slot] = item.id;
  persist();
  play('chest');
  confetti(60, [item.emoji]);
  toast(t('bought', { item: `${item.emoji} ${pick(item.name)}` }));
  decor.apply([item.id]);
  player.setCostume(save.costume);
  bumpStat('bought');
  refreshHUD();
}

function wear(item, on) {
  if (on) save.costume[item.slot] = item.id;
  else delete save.costume[item.slot];
  persist();
  play('click');
  player.setCostume(save.costume);
}

// ---------- buttons and menus ----------
// old (traditional) or new (reformed) Malayalam script
function applyLipi(choice) {
  const isNew = choice === 'new';
  document.documentElement.classList.toggle('lipi-new', isNew);
  setSignFont(isNew);
  document.querySelectorAll('[data-lipi]').forEach((b) => b.classList.toggle('active', b.dataset.lipi === (isNew ? 'new' : 'old')));
}

function changeLang(l) {
  save.lang = l;
  persist();
  setLang(l);
}

function startPlaying() {
  playing = true;
  setTip(controlsTip());
  setTimeout(() => { if ($('tip').textContent === controlsTip()) setTip(''); }, 12000);
  const daily = dailyCheck();
  refreshHUD();
  const secret = rooms.find((r) => r.id === secretRoomId());
  setTimeout(() => toast(t('secretToday', { room: `${secret.emoji} ${pick(secret.name)}` })), daily ? 4000 : 1500);
  if (daily) {
    openDaily(daily, () => {
      claimDaily();
      play('unlock');
      confetti(100, ['🪙', '🔥', '⭐']);
      setControlsEnabled(true);
    });
  }
}

function setupUI() {
  initControls({ onAction: act });
  initPanels({ onBuy: buy, onWear: wear, onOpen: () => { hidePrompt(); setTip(''); setControlsEnabled(false); } });
  onLangChange(() => {
    refreshAll();
    retranslateQuiz((it) => toQuizItem(it.raw, lang(), it.order));
    if (prompt) showPrompt(prompt);
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
    document.body.classList.add('playing');
    startPlaying();
  });
  $('prompt-go').addEventListener('click', act);
  $('prompt-no').addEventListener('click', () => { play('click'); dismissed = prompt; hidePrompt(); });
  $('shop-btn').addEventListener('click', () => { play('click'); openShop(); });
  $('album-btn').addEventListener('click', () => { play('click'); openAlbum(); });
  $('progress-btn').addEventListener('click', () => { play('click'); openProgress(); });
  $('sound-btn').addEventListener('click', () => {
    save.settings.sound = !save.settings.sound; persist(); refreshHUD(); unlockAudio(); play('click');
  });
  $('settings-btn').addEventListener('click', () => {
    play('click');
    $('set-low').checked = isLowGraphics();
    $('set-sound').checked = save.settings.sound;
    $('set-voice').checked = save.settings.voice !== false;
    hidePrompt();
    setControlsEnabled(false);
    $('settings').classList.remove('hidden');
  });
  $('set-low').addEventListener('change', (e) => { save.settings.lowGraphics = e.target.checked; persist(); location.reload(); });
  $('set-sound').addEventListener('change', (e) => { save.settings.sound = e.target.checked; persist(); refreshHUD(); });
  document.querySelectorAll('[data-lipi]').forEach((b) => b.addEventListener('click', async () => {
    play('click');
    save.settings.lipi = b.dataset.lipi;
    persist();
    applyLipi(save.settings.lipi);
    await document.fonts.ready;
    refreshSigns();
  }));
  $('set-voice').addEventListener('change', (e) => { save.settings.voice = e.target.checked; persist(); });
  $('reset-btn').addEventListener('click', () => {
    if (confirm(t('resetConfirm'))) { resetAll(); location.reload(); }
  });
  $('credits-btn').addEventListener('click', () => {
    const list = $('credits-list');
    list.innerHTML = '';
    for (const [src, count] of sources(lang(), t('creditOwn'))) {
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
    setControlsEnabled(!isQuizOpen() && !anyPanelOpen());
  }));
  applyToPage();
}

// ---------- walking ----------
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
  collide(pos, W.colliders, PLAYER_RADIUS);
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
  Object.assign(me, { x: pos.x, y: pos.y, z: pos.z, facing, speed });
}

function updateGifts() {
  const busyRoom = surprises.activeRoom();
  for (const g of surprises.gifts) {
    g.group.visible = roomState(g.room.id).unlocked && busyRoom !== g.room;
    const free = freeSurpriseReady(g.room.id);
    const secret = g.room.id === secretRoomId();
    g.star.visible = free && secret;
    g.free.visible = free && !secret;
    g.quiz.visible = !free;
  }
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

let simTime = 0;

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, clock.getDelta());
  simTime += dt;
  frame(dt, simTime);

  // if the phone struggles, quietly lower the quality
  if (dt > 0.045) slowFrames++; else slowFrames = Math.max(0, slowFrames - 1);
  if (slowFrames > 90 && renderer.getPixelRatio() > 1) {
    renderer.setPixelRatio(1);
    sun.castShadow = false;
    slowFrames = 0;
  }
}

function frame(dt, time, draw = true) {
  updatePlayer(dt);
  updateGifts();
  checkPrompts();
  W.update(dt, time, pos);
  surprises.update(dt, time, me);
  extras.update(dt, time);
  decor.update(dt, time, me);
  updateCamera(dt);
  if (draw) renderer.render(scene, camera);
}

// handy for testing in the browser console
window.__game = {
  save, pos, me, startDoorQuiz, startSurprise, addCoins,
  get doors() { return W.doors; },
  get surprises() { return surprises; },
  snap() { snapCamera = true; },
  // run the game forward quickly (for tests); onStep(t) can move the child
  fastForward(seconds, onStep) {
    for (let s = 0; s < seconds; s += 1 / 30) { onStep?.(s); simTime += 1 / 30; frame(1 / 30, simTime, false); }
    renderer.render(scene, camera);
  },
};
