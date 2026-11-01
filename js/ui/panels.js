// Shop, sticker/badge album and the daily bonus popup.
import { save } from '../storage.js';
import { t, pick, lang } from '../i18n.js';
import { play } from '../audio.js';
import { catalog, badgeProgress } from '../rewards.js';
import { overall, bySubject, hardQuestions, lastDays, fmtTime, shortText } from '../progress.js';

const $ = (id) => document.getElementById(id);
let shopTab = 'decor';
let albumTab = 'badges';
let hooks = {};

export function initPanels(h) {
  hooks = h;
  document.querySelectorAll('#shop [data-tab]').forEach((b) => b.addEventListener('click', () => {
    play('click'); shopTab = b.dataset.tab; renderShop();
  }));
  document.querySelectorAll('#album [data-tab]').forEach((b) => b.addEventListener('click', () => {
    play('click'); albumTab = b.dataset.tab; renderAlbum();
  }));
}

function open(id) {
  $(id).classList.remove('hidden');
  hooks.onOpen?.();
}

// ---------- shop ----------
export function openShop() { renderShop(); open('shop'); }

export function renderShop() {
  document.querySelectorAll('#shop [data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === shopTab));
  $('shop-coins').textContent = `🪙 ${save.coins}`;
  const list = $('shop-list');
  list.innerHTML = '';
  for (const item of catalog.items.filter((i) => i.type === shopTab)) {
    const owned = save.owned.includes(item.id);
    const card = document.createElement('div');
    card.className = 'item-card' + (owned ? ' owned' : '');
    card.innerHTML = '<div class="item-emoji"></div><div class="item-name"></div><button class="soft-btn small"></button>';
    card.children[0].textContent = item.emoji;
    card.children[1].textContent = pick(item.name);
    const btn = card.children[2];
    if (!owned) {
      const short = item.price - save.coins;
      btn.textContent = short > 0 ? t('needMore', { n: short }) : `${t('buy')} · ${item.price} 🪙`;
      btn.disabled = short > 0;
      btn.classList.toggle('buy', short <= 0);
      btn.addEventListener('click', () => { hooks.onBuy(item); renderShop(); });
    } else if (item.type === 'costume') {
      const wearing = save.costume[item.slot] === item.id;
      btn.textContent = wearing ? t('wearing') : t('wear');
      btn.addEventListener('click', () => { hooks.onWear(item, !wearing); renderShop(); });
    } else {
      btn.textContent = t('owned');
      btn.disabled = true;
    }
    list.appendChild(card);
  }
}

// ---------- album ----------
export function openAlbum() { renderAlbum(); open('album'); }

function renderAlbum() {
  document.querySelectorAll('#album [data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === albumTab));
  const list = $('album-list');
  list.innerHTML = '';
  $('album-hint').textContent = albumTab === 'stickers' ? t('albumHint') : '';
  const entries = albumTab === 'badges'
    ? catalog.badges.map((b) => {
      const p = badgeProgress(b);
      return { emoji: b.emoji, name: pick(b.name), got: p.earned, sub: p.earned ? '✅' : `${p.have} / ${p.need}` };
    })
    : catalog.stickers.map((s) => ({ emoji: s.emoji, name: pick(s.name), got: save.stickers.includes(s.id), sub: '' }));
  for (const e of entries) {
    const card = document.createElement('div');
    card.className = 'item-card' + (e.got ? '' : ' locked');
    card.innerHTML = '<div class="item-emoji"></div><div class="item-name"></div><div class="item-sub"></div>';
    card.children[0].textContent = e.got ? e.emoji : '❔';
    card.children[1].textContent = e.got || albumTab === 'badges' ? e.name : '???';
    card.children[2].textContent = e.sub;
    list.appendChild(card);
  }
}

// ---------- daily bonus ----------
export function openDaily(info, onCollect) {
  $('daily-streak').textContent = t('dailyStreak', { n: info.count });
  $('daily-days').innerHTML = [1, 2, 3, 4, 5, 6, 7].map((d) =>
    `<span class="day ${d <= Math.min(info.count, 7) ? 'on' : ''}">${d <= Math.min(info.count, 7) ? '🔥' : d}</span>`).join('');
  const btn = $('daily-collect');
  btn.textContent = t('collect', { c: info.coins });
  btn.onclick = () => { $('daily').classList.add('hidden'); onCollect(); };
  open('daily');
}

// ---------- my progress ----------
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function openProgress() { renderProgress(); open('progress'); }

function renderProgress() {
  const body = $('progress-body');
  const all = overall();
  if (!all.n) { body.innerHTML = `<p class="prog-summary">${esc(t('progEmpty'))}</p>`; return; }

  const subjects = bySubject();
  const rows = catalog.rooms.filter((r) => subjects[r.subject]).map((r) => {
    const s = subjects[r.subject];
    return `<tr><td>${esc(r.emoji)} ${esc(pick(r.name))}</td><td>${s.n}</td><td>${pct(s.right, s.n)}%</td><td>${esc(fmtTime(s.time / s.n))}</td></tr>`;
  }).join('');

  const days = lastDays(7);
  const most = Math.max(1, ...days.map((d) => d.n));
  const locale = lang() === 'ml' ? 'ml-IN' : 'en-IN';
  const dayItems = days.map((d) => {
    const name = new Date(`${d.day}T12:00:00`).toLocaleDateString(locale, { weekday: 'short' });
    return `<li><span>${esc(name)}</span><span class="prog-bar" style="width:${(d.n / most) * 100}%" aria-hidden="true"></span><span>${esc(t('qCount', { n: d.n }))}</span></li>`;
  }).join('');

  const hard = hardQuestions(lang());
  const hardItems = hard.map((h) => `<li>${esc(shortText(h.q[lang()].question))}<span class="meta">${esc(t('hardMeta', { w: h.wrong, n: h.s.n, t: fmtTime(h.avg) }))}</span></li>`).join('');

  body.innerHTML = `
    <p class="prog-summary">${esc(t('progAnswered', { n: all.n }))}<br>${esc(t('progRight', { p: pct(all.right, all.n) }))}<br>${esc(t('progAvg', { t: fmtTime(all.time / all.n) }))}</p>
    <h3>${esc(t('progSubjects'))}</h3>
    <table class="prog-table">
      <thead><tr><th>${esc(t('colSubject'))}</th><th>${esc(t('colAnswered'))}</th><th>${esc(t('colRight'))}</th><th>${esc(t('colAvg'))}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <h3>${esc(t('progDays'))}</h3>
    <ul class="prog-days">${dayItems}</ul>
    <h3>${esc(t('progHard'))}</h3>
    ${hard.length ? `<ol class="prog-hard">${hardItems}</ol>` : `<p>${esc(t('progHardNone'))}</p>`}`;
}
