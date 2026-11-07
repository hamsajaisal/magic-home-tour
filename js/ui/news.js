// What's New: a short history of the game, newest first. The list lives in data/whatsnew.json.
// A small mark shows on the button until the child has opened the list since the last new line.
import { save, persist } from '../storage.js';
import { lang, pick, onLangChange } from '../i18n.js';
import { play } from '../audio.js';

const $ = (id) => document.getElementById(id);
const MONTHS = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  ml: ['ജനുവരി', 'ഫെബ്രുവരി', 'മാർച്ച്', 'ഏപ്രിൽ', 'മെയ്', 'ജൂൺ', 'ജൂലൈ', 'ഓഗസ്റ്റ്', 'സെപ്റ്റംബർ', 'ഒക്ടോബർ', 'നവംബർ', 'ഡിസംബർ'],
};
let items = [];

function dateText(date) {
  const [y, m, d] = date.split('-').map(Number);
  return `${d} ${MONTHS[lang()][m - 1]} ${y}`;
}

function render() {
  const list = $('news-list');
  list.textContent = '';
  let day = null, ul = null;
  for (const item of items) {
    if (item.date !== day) {
      day = item.date;
      const h = document.createElement('h3');
      h.textContent = dateText(day);
      ul = document.createElement('ul');
      list.append(h, ul);
    }
    const li = document.createElement('li');
    li.textContent = pick(item);
    ul.append(li);
  }
}

function refreshMark() {
  const fresh = items.length > 0 && items[0].date > (save.stats.newsSeen || '');
  $('news-mark').classList.toggle('hidden', !fresh);
}

export async function initNews({ beforeOpen }) {
  try {
    items = (await (await fetch('data/whatsnew.json')).json()).items;
  } catch (err) { items = []; }   // the game must start even if this list cannot load
  const open = () => {
    play('click');
    beforeOpen();
    render();
    $('news').classList.remove('hidden');
    if (items.length && save.stats.newsSeen !== items[0].date) {
      save.stats.newsSeen = items[0].date;
      persist();
    }
    refreshMark();
  };
  $('news-btn').addEventListener('click', open);
  $('settings-news').addEventListener('click', open);
  onLangChange(() => { if (!$('news').classList.contains('hidden')) render(); });
  refreshMark();
}
