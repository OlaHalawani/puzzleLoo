export interface Pair {
  /** Index into the palette (colour + shape). */
  color: number;
  a: number;
  b: number;
}

export interface Puzzle {
  id: string;
  size: number;
  pairs: Pair[];
  /** One known solution per pair, ordered from `a` to `b`. Used for hints. */
  solution: number[][];
}
