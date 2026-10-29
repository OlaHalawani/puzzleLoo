import { generatePuzzle } from './generator';
import type { Puzzle } from './types';

export interface Chapter {
  id: number;
  key: string;
  size: number;
  levels: number;
}

export const LEVELS_PER_CHAPTER = 24;
/** Solved levels needed in a chapter to unlock the next one. */
export const UNLOCK_THRESHOLD = 12;

export const CHAPTERS: Chapter[] = [
  { id: 0, key: 'ch1', size: 5, levels: LEVELS_PER_CHAPTER },
  { id: 1, key: 'ch2', size: 6, levels: LEVELS_PER_CHAPTER },
  { id: 2, key: 'ch3', size: 7, levels: LEVELS_PER_CHAPTER },
  { id: 3, key: 'ch4', size: 8, levels: LEVELS_PER_CHAPTER },
  { id: 4, key: 'ch5', size: 9, levels: LEVELS_PER_CHAPTER },
];

export const DAILY_SIZE = 7;

export function levelKey(chapter: number, level: number): string {
  return `c${chapter}-l${level}`;
}

export function dailyKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `daily-${y}-${m}-${d}`;
}

const cache = new Map<string, Puzzle>();

export function getLevel(chapter: number, level: number): Puzzle {
  const key = levelKey(chapter, level);
  let p = cache.get(key);
  if (!p) {
    p = generatePuzzle(CHAPTERS[chapter].size, `puzzleloo:${key}`);
    cache.set(key, p);
  }
  return p;
}

export function getDaily(key = dailyKey()): Puzzle {
  let p = cache.get(key);
  if (!p) {
    p = generatePuzzle(DAILY_SIZE, `puzzleloo:${key}`);
    cache.set(key, p);
  }
  return p;
}
