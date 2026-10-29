import { describe, expect, it } from 'vitest';
import { Board } from '../src/game/board';
import type { Puzzle } from '../src/game/types';

// 3x3 hand-made puzzle:
//  A . B
//  . . .
//  A . B      cells: 0 1 2 / 3 4 5 / 6 7 8
const puzzle: Puzzle = {
  id: 't',
  size: 3,
  pairs: [
    { color: 0, a: 0, b: 6 },
    { color: 1, a: 2, b: 8 },
  ],
  solution: [
    [0, 1, 4, 3, 6],
    [2, 5, 8],
  ],
};
// This board can never be fully filled (parity), which makes it handy for "connected but not filled".

function draw(b: Board, cells: number[]): boolean {
  if (!b.begin(cells[0])) return false;
  for (const c of cells.slice(1)) b.dragTo(c);
  return b.end();
}

describe('Board', () => {
  it('connects a pair and detects completion', () => {
    const b = new Board(puzzle);
    draw(b, [0, 3, 6]);
    expect(b.isComplete(0)).toBe(true);
    expect(b.completedCount()).toBe(1);
  });

  it('cannot start on an empty cell', () => {
    expect(new Board(puzzle).begin(4)).toBe(false);
  });

  it('cannot enter another colour endpoint', () => {
    const b = new Board(puzzle);
    b.begin(0);
    b.dragTo(1);
    b.dragTo(2);
    expect(b.paths[0]).toEqual([0, 1]);
  });

  it('stops at the partner endpoint', () => {
    const b = new Board(puzzle);
    b.begin(0);
    b.dragTo(3);
    b.dragTo(6);
    b.dragTo(7);
    expect(b.paths[0]).toEqual([0, 3, 6]);
  });

  it('walks cell by cell on fast drags', () => {
    const b = new Board(puzzle);
    b.begin(2);
    b.dragTo(8);
    expect(b.paths[1]).toEqual([2, 5, 8]);
  });

  it('backtracking shortens the path', () => {
    const b = new Board(puzzle);
    b.begin(0);
    b.dragTo(1);
    b.dragTo(4);
    b.dragTo(1);
    expect(b.paths[0]).toEqual([0, 1]);
  });

  it('cuts another flow while crossing it and restores it on backtrack', () => {
    const b = new Board(puzzle);
    draw(b, [2, 1, 4, 7, 8]);
    expect(b.isComplete(1)).toBe(true);
    b.begin(0);
    b.dragTo(3);
    b.dragTo(4); // crosses colour 1 at cell 4
    expect(b.paths[1]).toEqual([2, 1]);
    b.dragTo(3); // back off
    expect(b.paths[1]).toEqual([2, 1, 4, 7, 8]);
    b.end();
  });

  it('a lone endpoint tap leaves no path and is not an undo step', () => {
    const b = new Board(puzzle);
    b.begin(0);
    expect(b.end()).toBe(false);
    expect(b.paths[0]).toEqual([]);
    expect(b.canUndo()).toBe(false);
  });

  it('dragging from the middle of a path truncates it', () => {
    const b = new Board(puzzle);
    draw(b, [0, 1, 4, 3, 6]);
    b.begin(1);
    expect(b.paths[0]).toEqual([0, 1]);
    b.end();
  });

  it('undo and reset restore earlier states', () => {
    const b = new Board(puzzle);
    draw(b, [0, 3, 6]);
    draw(b, [2, 5, 8]);
    b.undo();
    expect(b.paths[1]).toEqual([]);
    expect(b.paths[0]).toEqual([0, 3, 6]);
    b.reset();
    expect(b.paths.every((p) => p.length === 0)).toBe(true);
    b.undo();
    expect(b.paths[0]).toEqual([0, 3, 6]);
  });

  it('solved requires every cell filled', () => {
    const b = new Board(puzzle);
    draw(b, [0, 3, 6]);
    draw(b, [2, 5, 8]);
    expect(b.completedCount()).toBe(2);
    expect(b.isSolved()).toBe(false);
    draw(b, [0, 1, 4, 3, 6]);
    draw(b, [2, 5, 8]);
    expect(b.isSolved()).toBe(false); // cell 7 still empty
    expect(b.filledCount()).toBe(8);
  });

  it('hint lays a correct flow and cuts conflicts', () => {
    const b = new Board(puzzle);
    draw(b, [2, 1, 4, 5, 8]);
    expect(b.hint()).toBe(0);
    expect(b.paths[0]).toEqual([0, 1, 4, 3, 6]);
    expect(b.paths[1]).toEqual([2]);
    expect(b.hintsUsed).toBe(1);
  });

  it('rejects corrupted saved state', () => {
    expect(new Board(puzzle, [[0, 4], []]).paths).toEqual([[], []]);
    expect(new Board(puzzle, [[0, 3], [2, 5]]).paths).toEqual([[0, 3], [2, 5]]);
    expect(new Board(puzzle, [[0, 3]]).paths).toEqual([[], []]);
    expect(new Board(puzzle, [[0, 3], [3, 4]]).paths).toEqual([[], []]);
  });
});
