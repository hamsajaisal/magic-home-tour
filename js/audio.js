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

// a little "meow": pitch goes up then down
function meow(vol) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(500, t0);
  osc.frequency.linearRampToValueAtTime(900, t0 + 0.15);
  osc.frequency.linearRampToValueAtTime(450, t0 + 0.45);
  const filter = a.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1400;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
  osc.connect(filter).connect(gain).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + 0.55);
}

const SOUNDS = {
  meow: (vol = 0.12) => meow(vol),
  pop: () => { tone(900, 0, 0.05, 'square', 0.1); tone(300, 0.03, 0.08, 'triangle', 0.1); },
  catch: () => tone(1200 + Math.random() * 400, 0, 0.09, 'triangle', 0.1),
  chest: () => [392, 523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, i * 0.06, 0.25, 'triangle', 0.12)),
  click: () => tone(660, 0, 0.08, 'triangle', 0.12),
  correct: () => { tone(660, 0, 0.12, 'triangle'); tone(880, 0.1, 0.12, 'triangle'); tone(1320, 0.2, 0.25, 'triangle'); },
  wrong: () => { tone(330, 0, 0.18, 'sine', 0.14); tone(262, 0.15, 0.25, 'sine', 0.12); },
  coin: () => { tone(988, 0, 0.08, 'square', 0.06); tone(1319, 0.07, 0.18, 'square', 0.06); },
  unlock: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.09, 0.3, 'triangle', 0.15)),
  fail: () => { tone(440, 0, 0.2, 'sine', 0.12); tone(392, 0.18, 0.2, 'sine', 0.12); tone(440, 0.36, 0.3, 'sine', 0.12); },
};

export function play(name, arg) {
  if (!save.settings.sound) return;
  try { SOUNDS[name]?.(arg); } catch (e) { /* sound is optional */ }
}

// Browsers only allow sound after the first tap/click.
export function unlockAudio() { if (save.settings.sound) ac(); }
