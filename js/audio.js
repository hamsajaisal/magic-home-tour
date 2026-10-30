// Tiny sound effects made in code (no sound files to download).
import { save } from './storage.js';

let ctx = null;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, start, dur, type = 'sine', vol = 0.18) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + start;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

const SOUNDS = {
  click: () => tone(660, 0, 0.08, 'triangle', 0.12),
  correct: () => { tone(660, 0, 0.12, 'triangle'); tone(880, 0.1, 0.12, 'triangle'); tone(1320, 0.2, 0.25, 'triangle'); },
  wrong: () => { tone(330, 0, 0.18, 'sine', 0.14); tone(262, 0.15, 0.25, 'sine', 0.12); },
  coin: () => { tone(988, 0, 0.08, 'square', 0.06); tone(1319, 0.07, 0.18, 'square', 0.06); },
  unlock: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.09, 0.3, 'triangle', 0.15)),
  fail: () => { tone(440, 0, 0.2, 'sine', 0.12); tone(392, 0.18, 0.2, 'sine', 0.12); tone(440, 0.36, 0.3, 'sine', 0.12); },
};

export function play(name) {
  if (!save.settings.sound) return;
  try { SOUNDS[name]?.(); } catch (e) { /* sound is optional */ }
}

// Browsers only allow sound after the first tap/click.
export function unlockAudio() { if (save.settings.sound) ac(); }
