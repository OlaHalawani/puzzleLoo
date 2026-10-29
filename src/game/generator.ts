import { hashString, mulberry32, randInt } from './rng';
import type { Pair, Puzzle } from './types';

export const MAX_COLORS = 12;

function neighbors(cell: number, size: number): number[] {
  const r = Math.floor(cell / size);
  const c = cell % size;
  const out: number[] = [];
  if (r > 0) out.push(cell - size);
  if (r < size - 1) out.push(cell + size);
  if (c > 0) out.push(cell - 1);
  if (c < size - 1) out.push(cell + 1);
  return out;
}

export function areAdjacent(a: number, b: number, size: number): boolean {
  const dr = Math.abs(Math.floor(a / size) - Math.floor(b / size));
  const dc = Math.abs((a % size) - (b % size));
  return dr + dc === 1;
}

/**
 * Random Hamiltonian path over the grid using "backbite" moves, starting from a serpentine.
 * Every cell is visited exactly once, so cutting it into segments always yields a solvable,
 * fully-filled puzzle.
 */
function randomHamiltonianPath(size: number, rand: () => number): number[] {
  let path: number[] = [];
  for (let r = 0; r < size; r++) {
    for (let i = 0; i < size; i++) path.push(r * size + (r % 2 === 0 ? i : size - 1 - i));
  }
  const iterations = size * size * 40;
  for (let it = 0; it < iterations; it++) {
    if (rand() < 0.5) path.reverse();
    const end = path[0];
    const opts = neighbors(end, size).filter((n) => n !== path[1]);
    const nb = opts[Math.floor(rand() * opts.length)];
    const idx = path.indexOf(nb);
    // Link the end to `nb` and reverse the prefix so path stays Hamiltonian.
    path = path.slice(0, idx).reverse().concat(path.slice(idx));
  }
  return path;
}

function colorCount(size: number, rand: () => number): number {
  const base = size; // roughly one flow per row, like most games of this genre
  return Math.min(MAX_COLORS, Math.max(3, base + randInt(rand, -1, 1)));
}

function cutPath(path: number[], k: number, rand: () => number, size: number): number[][] | null {
  const n = path.length;
  const minLen = 3;
  // Random cut points with every segment >= minLen.
  const slack = n - k * minLen;
  if (slack < 0) return null;
  const extras = new Array<number>(k).fill(0);
  for (let i = 0; i < slack; i++) extras[Math.floor(rand() * k)]++;
  const segs: number[][] = [];
  let pos = 0;
  for (let i = 0; i < k; i++) {
    const len = minLen + extras[i];
    segs.push(path.slice(pos, pos + len));
    pos += len;
  }
  // Endpoints that touch make trivial flows – reject those cuts.
  for (const s of segs) if (areAdjacent(s[0], s[s.length - 1], size)) return null;
  return segs;
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generatePuzzle(size: number, seedKey: string): Puzzle {
  const rand = mulberry32(hashString(seedKey));
  for (let attempt = 0; attempt < 500; attempt++) {
    const path = randomHamiltonianPath(size, rand);
    const segs = cutPath(path, colorCount(size, rand), rand, size);
    if (!segs) continue;
    const colors = shuffle([...Array(MAX_COLORS).keys()], rand).slice(0, segs.length).sort((a, b) => a - b);
    const pairs: Pair[] = segs.map((s, i) => ({ color: colors[i], a: s[0], b: s[s.length - 1] }));
    return { id: seedKey, size, pairs, solution: segs };
  }
  throw new Error(`Could not generate puzzle for ${seedKey}`);
}
