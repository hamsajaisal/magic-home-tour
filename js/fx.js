// Confetti that falls over the screen (a light 2D effect, cheap even on old phones).
const canvas = document.getElementById('fx');
const g = canvas.getContext('2d');
const COLORS = ['#ff5d8f', '#ffd23d', '#3dd6ff', '#7dff6b', '#ff8a3d', '#b26bff'];
let pieces = [];
let running = false;

function resize() {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}
addEventListener('resize', resize);
resize();

export function confetti(amount = 140, emojis = null) {
  for (let i = 0; i < amount; i++) {
    pieces.push({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.6,
      vx: (Math.random() - 0.5) * 120,
      vy: 120 + Math.random() * 220,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 8,
      s: 6 + Math.random() * 8,
      c: COLORS[i % COLORS.length],
      e: emojis ? emojis[i % emojis.length] : null,
    });
  }
  if (!running) { running = true; last = performance.now(); requestAnimationFrame(step); }
}

let last = 0;
function step(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  g.clearRect(0, 0, canvas.width, canvas.height);
  for (const p of pieces) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.r += p.vr * dt;
    p.vx *= 0.99;
    g.save();
    g.translate(p.x, p.y);
    g.rotate(p.r);
    if (p.e) {
      g.font = `${p.s * 3}px sans-serif`;
      g.fillText(p.e, -p.s, p.s);
    } else {
      g.fillStyle = p.c;
      g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
    }
    g.restore();
  }
  pieces = pieces.filter((p) => p.y < canvas.height + 40);
  if (pieces.length) requestAnimationFrame(step);
  else { running = false; g.clearRect(0, 0, canvas.width, canvas.height); }
}
