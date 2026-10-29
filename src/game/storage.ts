import type { Paths } from './board';

export interface LevelResult {
  bestTime: number;
  stars: number;
}

export interface Settings {
  sound: boolean;
  haptics: boolean;
  lang: 'en' | 'ar' | null;
}

export interface InProgress {
  key: string;
  paths: Paths;
  elapsed: number;
  hints: number;
}

interface SaveData {
  version: 1;
  results: Record<string, LevelResult>;
  settings: Settings;
  inProgress: InProgress | null;
  seenHelp: boolean;
}

const KEY = 'puzzleloo:v1';

function defaults(): SaveData {
  return {
    version: 1,
    results: {},
    settings: { sound: true, haptics: true, lang: null },
    inProgress: null,
    seenHelp: false,
  };
}

function load(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const data = JSON.parse(raw) as Partial<SaveData>;
    const d = defaults();
    return {
      ...d,
      ...data,
      results: data.results && typeof data.results === 'object' ? data.results : {},
      settings: { ...d.settings, ...(data.settings ?? {}) },
    };
  } catch {
    return defaults();
  }
}

const data = load();

function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Storage full or blocked: progress just won't survive a restart.
  }
}

export const store = {
  get settings(): Settings {
    return data.settings;
  },
  setSetting<K extends keyof Settings>(k: K, v: Settings[K]): void {
    data.settings[k] = v;
    persist();
  },
  result(key: string): LevelResult | undefined {
    return data.results[key];
  },
  /** Records a win, keeping the best time and best star count. Returns true for a new best time. */
  recordWin(key: string, time: number, stars: number): boolean {
    const prev = data.results[key];
    const newBest = !prev || time < prev.bestTime;
    data.results[key] = {
      bestTime: prev ? Math.min(prev.bestTime, time) : time,
      stars: prev ? Math.max(prev.stars, stars) : stars,
    };
    if (data.inProgress?.key === key) data.inProgress = null;
    persist();
    return newBest;
  },
  get inProgress(): InProgress | null {
    return data.inProgress;
  },
  saveProgress(p: InProgress | null): void {
    data.inProgress = p;
    persist();
  },
  get seenHelp(): boolean {
    return data.seenHelp;
  },
  markHelpSeen(): void {
    data.seenHelp = true;
    persist();
  },
  resetAll(): void {
    const s = data.settings;
    Object.assign(data, defaults(), { settings: s });
    persist();
  },
};
