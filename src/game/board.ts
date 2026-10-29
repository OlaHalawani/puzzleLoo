import { areAdjacent } from './generator';
import type { Puzzle } from './types';

export type Paths = number[][];

/**
 * Game state for one puzzle. Paths are indexed by pair index and always start at one of
 * the pair's endpoints. Drawing over another flow temporarily cuts it; backing off restores it.
 */
export class Board {
  readonly size: number;
  readonly cells: number;
  /** pair index sitting on each cell, or -1. */
  readonly endpointAt: Int16Array;
  paths: Paths;
  active = -1;
  private snapshot: Paths | null = null;
  private history: Paths[] = [];
  hintsUsed = 0;
  moves = 0;

  constructor(readonly puzzle: Puzzle, saved?: Paths) {
    this.size = puzzle.size;
    this.cells = this.size * this.size;
    this.endpointAt = new Int16Array(this.cells).fill(-1);
    puzzle.pairs.forEach((p, i) => {
      this.endpointAt[p.a] = i;
      this.endpointAt[p.b] = i;
    });
    this.paths = puzzle.pairs.map(() => []);
    if (saved && this.isValidSaved(saved)) this.paths = saved.map((p) => [...p]);
  }

  private isValidSaved(saved: Paths): boolean {
    if (saved.length !== this.puzzle.pairs.length) return false;
    const seen = new Set<number>();
    return saved.every((path, i) => {
      if (path.length === 0) return true;
      const pair = this.puzzle.pairs[i];
      if (path[0] !== pair.a && path[0] !== pair.b) return false;
      for (let k = 0; k < path.length; k++) {
        const c = path[k];
        if (!Number.isInteger(c) || c < 0 || c >= this.cells || seen.has(c)) return false;
        if (this.endpointAt[c] !== -1 && this.endpointAt[c] !== i) return false;
        if (k > 0 && !areAdjacent(path[k - 1], c, this.size)) return false;
        seen.add(c);
      }
      return true;
    });
  }

  ownerOf(cell: number): number {
    for (let i = 0; i < this.paths.length; i++) if (this.paths[i].includes(cell)) return i;
    return -1;
  }

  isComplete(i: number): boolean {
    const p = this.paths[i];
    if (p.length < 2) return false;
    const { a, b } = this.puzzle.pairs[i];
    const s = p[0];
    const e = p[p.length - 1];
    return (s === a && e === b) || (s === b && e === a);
  }

  completedCount(): number {
    let n = 0;
    for (let i = 0; i < this.paths.length; i++) if (this.isComplete(i)) n++;
    return n;
  }

  /** Cells covered by a path, plus endpoints (which are always "filled"). */
  filledCount(): number {
    const filled = new Uint8Array(this.cells);
    for (const p of this.paths) for (const c of p) filled[c] = 1;
    for (let c = 0; c < this.cells; c++) if (this.endpointAt[c] !== -1) filled[c] = 1;
    return filled.reduce((s, v) => s + v, 0);
  }

  isSolved(): boolean {
    return this.completedCount() === this.paths.length && this.filledCount() === this.cells;
  }

  /** Begin a drag on `cell`. Returns false if there is nothing to drag there. */
  begin(cell: number): boolean {
    let idx = this.endpointAt[cell];
    if (idx !== -1) {
      this.snapshot = clone(this.paths);
      this.paths[idx] = [cell];
    } else {
      idx = this.ownerOf(cell);
      if (idx === -1) return false;
      this.snapshot = clone(this.paths);
      const p = this.paths[idx];
      p.length = p.indexOf(cell) + 1;
    }
    this.active = idx;
    return true;
  }

  /** Drag to `target`, walking cell by cell so fast swipes still draw continuous lines. */
  dragTo(target: number): boolean {
    if (this.active === -1) return false;
    const path = this.paths[this.active];
    let moved = false;
    for (let guard = 0; guard < this.cells * 2; guard++) {
      const last = path[path.length - 1];
      if (last === target) break;
      if (!this.step(this.nextToward(last, target))) break;
      moved = true;
    }
    return moved;
  }

  private nextToward(from: number, to: number): number {
    const fr = Math.floor(from / this.size);
    const fc = from % this.size;
    const dr = Math.floor(to / this.size) - fr;
    const dc = (to % this.size) - fc;
    if (Math.abs(dr) >= Math.abs(dc)) return from + Math.sign(dr) * this.size;
    return from + Math.sign(dc);
  }

  private step(cell: number): boolean {
    const i = this.active;
    const path = this.paths[i];
    const last = path[path.length - 1];
    if (!areAdjacent(last, cell, this.size)) return false;

    const back = path.indexOf(cell);
    if (back !== -1) {
      path.length = back + 1;
      this.restoreOthers();
      return true;
    }
    // A finished flow stops at its partner endpoint.
    if (path.length > 1 && this.endpointAt[last] === i) return false;
    const ep = this.endpointAt[cell];
    if (ep !== -1 && ep !== i) return false;

    path.push(cell);
    this.restoreOthers();
    return true;
  }

  /** Other flows = their pre-drag shape, cut where the active flow now crosses them. */
  private restoreOthers(): void {
    if (!this.snapshot) return;
    const mine = new Set(this.paths[this.active]);
    this.snapshot.forEach((orig, j) => {
      if (j === this.active) return;
      const cut = orig.findIndex((c) => mine.has(c));
      this.paths[j] = cut === -1 ? [...orig] : orig.slice(0, cut);
    });
  }

  /** Finish the drag. Returns true if the board changed. */
  end(): boolean {
    if (this.active === -1 || !this.snapshot) return false;
    // A lone endpoint tap doesn't count as a path.
    const p = this.paths[this.active];
    if (p.length === 1) p.length = 0;
    const changed = !samePaths(this.snapshot, this.paths);
    if (changed) {
      this.history.push(this.snapshot);
      if (this.history.length > 200) this.history.shift();
      this.moves++;
    }
    this.snapshot = null;
    this.active = -1;
    return changed;
  }

  canUndo(): boolean {
    return this.history.length > 0;
  }

  undo(): boolean {
    const prev = this.history.pop();
    if (!prev) return false;
    this.paths = prev;
    return true;
  }

  reset(): boolean {
    if (this.paths.every((p) => p.length === 0)) return false;
    this.history.push(clone(this.paths));
    this.paths = this.puzzle.pairs.map(() => []);
    return true;
  }

  /** Lay down the stored solution for the first flow that isn't already correct. */
  hint(): number {
    const sol = this.puzzle.solution;
    const i = sol.findIndex((s, k) => !matches(this.paths[k], s));
    if (i === -1) return -1;
    this.history.push(clone(this.paths));
    const cells = new Set(sol[i]);
    this.paths = this.paths.map((p, j) => {
      if (j === i) return [...sol[i]];
      const cut = p.findIndex((c) => cells.has(c));
      return cut === -1 ? p : p.slice(0, cut);
    });
    this.hintsUsed++;
    return i;
  }
}

function clone(p: Paths): Paths {
  return p.map((x) => [...x]);
}

function samePaths(a: Paths, b: Paths): boolean {
  return a.length === b.length && a.every((p, i) => p.length === b[i].length && p.every((c, k) => c === b[i][k]));
}

function matches(path: number[], sol: number[]): boolean {
  if (path.length !== sol.length) return false;
  const fwd = path.every((c, k) => c === sol[k]);
  return fwd || path.every((c, k) => c === sol[sol.length - 1 - k]);
}
