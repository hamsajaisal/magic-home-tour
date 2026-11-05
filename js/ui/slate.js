// A school slate for working out sums during a question. The child writes with a finger or the mouse.
// It only draws: it never reads or works out anything, and nothing written here is saved.
import { play } from '../audio.js';

const $ = (id) => document.getElementById(id);
const canvas = $('slate-canvas');
const g = canvas.getContext('2d');
const card = document.querySelector('.quiz-card');
const CHALK = 3.5;
const DUSTER = 26;

let strokes = [];      // each: { color, width, erase, points: [[x, y], ...] } in page pixels of the slate
let color = '#ffffff';
let erasing = false;
let current = null;    // the stroke being drawn now
let pointer = null;    // the finger drawing it; a palm or second finger is ignored

function drawStroke(s) {
  g.globalCompositeOperation = s.erase ? 'destination-out' : 'source-over';
  g.strokeStyle = g.fillStyle = s.color;
  g.lineWidth = s.width;
  g.lineCap = g.lineJoin = 'round';
  const p = s.points;
  if (p.length < 2) {
    g.beginPath();
    g.arc(p[0][0], p[0][1], s.width / 2, 0, Math.PI * 2);
    g.fill();
    return;
  }
  g.beginPath();
  g.moveTo(p[0][0], p[0][1]);
  // curves through the middle of each step, so handwriting comes out smooth
  for (let i = 1; i < p.length - 1; i++) {
    g.quadraticCurveTo(p[i][0], p[i][1], (p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2);
  }
  g.lineTo(p[p.length - 1][0], p[p.length - 1][1]);
  g.stroke();
}

function redraw() {
  g.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  strokes.forEach(drawStroke);
}

function fit() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  const scale = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  g.setTransform(scale, 0, 0, scale, 0, 0);
  redraw();
}

function at(e) {
  const r = canvas.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
}

canvas.addEventListener('pointerdown', (e) => {
  if (pointer !== null) return;
  e.preventDefault();
  pointer = e.pointerId;
  canvas.setPointerCapture(pointer);
  current = { color, width: erasing ? DUSTER : CHALK, erase: erasing, points: [at(e)] };
  strokes.push(current);
  drawStroke(current);
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId !== pointer) return;
  e.preventDefault();
  const moves = e.getCoalescedEvents?.() ?? [];     // the fine steps of a fast finger, where the browser gives them
  for (const ev of moves.length ? moves : [e]) current.points.push(at(ev));
  redraw();
});
const lift = (e) => {
  if (e.pointerId !== pointer) return;
  pointer = null;
  current = null;
};
canvas.addEventListener('pointerup', lift);
canvas.addEventListener('pointercancel', lift);
new ResizeObserver(fit).observe(canvas);

function choose(button) {
  document.querySelectorAll('#slate .chalk').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
}

document.querySelectorAll('#slate .chalk').forEach((b) => b.addEventListener('click', () => {
  play('click');
  erasing = b.id === 'slate-duster';
  if (!erasing) color = b.dataset.color;
  choose(b);
}));
$('slate-undo').addEventListener('click', () => { play('click'); strokes.pop(); redraw(); });
$('slate-clear').addEventListener('click', () => { play('click'); strokes = []; redraw(); });
$('slate-lines').addEventListener('click', (e) => {
  play('click');
  e.currentTarget.setAttribute('aria-pressed', String(canvas.classList.toggle('lined')));
});
$('slate-big').addEventListener('click', (e) => {
  play('click');
  e.currentTarget.setAttribute('aria-pressed', String(card.classList.toggle('slate-full')));
});
$('slate-close').addEventListener('click', () => { play('click'); closeSlate(); });
$('slate-btn').addEventListener('click', () => { play('click'); openSlate(); });
// tapping the small question makes it big again; the writing stays for when the slate is opened again
$('q-text').addEventListener('click', () => { if (isSlateOpen()) closeSlate(); });

export function isSlateOpen() { return card.classList.contains('slate-on'); }

export function openSlate() {
  $('slate').classList.remove('hidden');
  card.classList.add('slate-on');
  $('slate-btn').setAttribute('aria-expanded', 'true');
  fit();
}

export function closeSlate() {
  card.classList.remove('slate-on', 'slate-full');
  $('slate').classList.add('hidden');
  $('slate-big').setAttribute('aria-pressed', 'false');
  $('slate-btn').setAttribute('aria-expanded', 'false');
}

// A new question: a clean slate, and the button only where sums are likely.
export function newSlate(available) {
  closeSlate();
  strokes = [];
  redraw();
  $('slate-btn').classList.toggle('hidden', !available);
}
