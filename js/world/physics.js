// Keeps a round thing (the child, a pet, a ball) from walking through walls and furniture.
// Returns true if it bumped into something.
// A collider with minY / maxY only counts at those heights (e.g. the terrace railing only up on the terrace).
const atHeight = (c, y = 0) => !(c.minY !== undefined && y < c.minY) && !(c.maxY !== undefined && y > c.maxY);

export function collide(p, colliders, R) {
  let bumped = false;
  for (let pass = 0; pass < 2; pass++) {
    for (const c of colliders) {
      if (!c.on || !atHeight(c, p.y)) continue;
      const cx = Math.max(c.minX, Math.min(p.x, c.maxX));
      const cz = Math.max(c.minZ, Math.min(p.z, c.maxZ));
      const dx = p.x - cx, dz = p.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= R * R) continue;
      bumped = true;
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
  return bumped;
}

export function pointBlocked(x, z, colliders, R = 0.4) {
  return colliders.some((c) => c.on && atHeight(c, 0) && x > c.minX - R && x < c.maxX + R && z > c.minZ - R && z < c.maxZ + R);
}
