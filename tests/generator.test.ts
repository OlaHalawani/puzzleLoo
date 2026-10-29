import { describe, expect, it } from 'vitest';
import { Board } from '../src/game/board';
import { areAdjacent, generatePuzzle, MAX_COLORS } from '../src/game/generator';
import { CHAPTERS, getDaily, getLevel } from '../src/game/levels';
import type { Puzzle } from '../src/game/types';

function checkPuzzle(p: Puzzle): void {
  const n = p.size * p.size;
  expect(p.pairs.length).toBe(p.solution.length);
  expect(p.pairs.length).toBeLessThanOrEqual(MAX_COLORS);
  expect(new Set(p.pairs.map((x) => x.color)).size).toBe(p.pairs.length);
  const seen = new Set<number>();
  p.solution.forEach((path, i) => {
    expect(path[0]).toBe(p.pairs[i].a);
    expect(path[path.length - 1]).toBe(p.pairs[i].b);
    expect(path.length).toBeGreaterThanOrEqual(3);
    expect(areAdjacent(p.pairs[i].a, p.pairs[i].b, p.size)).toBe(false);
    path.forEach((c, k) => {
      expect(seen.has(c)).toBe(false);
      seen.add(c);
      if (k > 0) expect(areAdjacent(path[k - 1], c, p.size)).toBe(true);
    });
  });
  expect(seen.size).toBe(n);
}

describe('generator', () => {
  it('is deterministic for the same seed', () => {
    expect(generatePuzzle(7, 'x')).toEqual(generatePuzzle(7, 'x'));
    expect(generatePuzzle(7, 'x')).not.toEqual(generatePuzzle(7, 'y'));
  });

  it('produces valid, fully-filling solutions for every shipped level', () => {
    const ids = new Set<string>();
    CHAPTERS.forEach((ch) => {
      for (let l = 0; l < ch.levels; l++) {
        const p = getLevel(ch.id, l);
        expect(p.size).toBe(ch.size);
        checkPuzzle(p);
        ids.add(JSON.stringify(p.pairs));
      }
    });
    // No two levels are identical.
    expect(ids.size).toBe(CHAPTERS.reduce((s, c) => s + c.levels, 0));
  });

  it('produces valid daily puzzles for a whole year', () => {
    const d = new Date(2026, 0, 1);
    for (let i = 0; i < 365; i++) {
      checkPuzzle(getDaily(`daily-${d.toISOString().slice(0, 10)}`));
      d.setDate(d.getDate() + 1);
    }
  });

  it('every shipped level is solvable by drawing its solution', () => {
    CHAPTERS.forEach((ch) => {
      for (let l = 0; l < ch.levels; l++) {
        const p = getLevel(ch.id, l);
        const b = new Board(p);
        p.solution.forEach((path) => {
          expect(b.begin(path[0])).toBe(true);
          for (const c of path.slice(1)) b.dragTo(c);
          b.end();
        });
        expect(b.isSolved()).toBe(true);
      }
    });
  });
});
