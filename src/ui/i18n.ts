import { store } from '../game/storage';

const en = {
  tagline: 'Choose. Connect. Solve!',
  play: 'Play',
  continue: 'Continue',
  daily: 'Daily Puzzle',
  chapters: 'Chapters',
  settings: 'Settings',
  howTo: 'How to play',
  chapter: 'Chapter',
  level: 'Level',
  locked: 'Solve {n} levels in the previous chapter to unlock',
  ch1: 'First Light',
  ch2: 'Neon Streets',
  ch3: 'City Skyline',
  ch4: 'Night Market',
  ch5: 'Starfall',
  reset: 'Reset',
  undo: 'Undo',
  hint: 'Hint',
  help: 'Help',
  flows: 'Flows',
  filled: 'Filled',
  paused: 'Paused',
  resume: 'Resume',
  solved: 'Solved!',
  time: 'Time',
  best: 'Best',
  newBest: 'New best time!',
  next: 'Next level',
  menu: 'Menu',
  replay: 'Replay',
  fillAll: 'All shapes connected — now fill every square!',
  helpTitle: 'How to play',
  help1: 'Drag from a shape to its matching twin to connect them.',
  help2: 'Lines can’t cross. Drawing over a line cuts it.',
  help3: 'Fill every square on the board to solve the puzzle.',
  help4: 'Stuck? Hint draws one correct line (but costs a star).',
  gotIt: 'Got it',
  sound: 'Sound',
  vibration: 'Vibration',
  language: 'Language',
  resetProgress: 'Reset all progress',
  confirmReset: 'Erase all progress? This cannot be undone.',
  privacy: 'Privacy policy',
  close: 'Close',
  dailyDone: 'Come back tomorrow for a new puzzle!',
  allDone: 'You finished every level. Amazing!',
  noAds: 'No ads. No subscription.',
};

type Strings = typeof en;

const ar: Strings = {
  tagline: 'اختر. صِل. احلّ!',
  play: 'العب',
  continue: 'تابع',
  daily: 'لغز اليوم',
  chapters: 'الفصول',
  settings: 'الإعدادات',
  howTo: 'طريقة اللعب',
  chapter: 'الفصل',
  level: 'المرحلة',
  locked: 'احلّ {n} مراحل في الفصل السابق لفتح هذا الفصل',
  ch1: 'أول ضوء',
  ch2: 'شوارع النيون',
  ch3: 'أفق المدينة',
  ch4: 'سوق الليل',
  ch5: 'تساقط النجوم',
  reset: 'إعادة',
  undo: 'تراجع',
  hint: 'تلميح',
  help: 'مساعدة',
  flows: 'الخطوط',
  filled: 'الامتلاء',
  paused: 'إيقاف مؤقت',
  resume: 'استئناف',
  solved: 'أحسنت!',
  time: 'الوقت',
  best: 'الأفضل',
  newBest: 'رقم قياسي جديد!',
  next: 'المرحلة التالية',
  menu: 'القائمة',
  replay: 'إعادة اللعب',
  fillAll: 'كل الأشكال متصلة — الآن املأ كل المربعات!',
  helpTitle: 'طريقة اللعب',
  help1: 'اسحب من الشكل إلى الشكل المطابق له لتوصيلهما.',
  help2: 'الخطوط لا تتقاطع. الرسم فوق خط يقطعه.',
  help3: 'املأ كل مربعات اللوحة لتحلّ اللغز.',
  help4: 'علِقت؟ التلميح يرسم خطًا صحيحًا (لكنه يكلّفك نجمة).',
  gotIt: 'فهمت',
  sound: 'الصوت',
  vibration: 'الاهتزاز',
  language: 'اللغة',
  resetProgress: 'مسح كل التقدّم',
  confirmReset: 'هل تريد مسح كل التقدّم؟ لا يمكن التراجع.',
  privacy: 'سياسة الخصوصية',
  close: 'إغلاق',
  dailyDone: 'عُد غدًا للغز جديد!',
  allDone: 'أنهيت كل المراحل. رائع!',
  noAds: 'بدون إعلانات. بدون اشتراك.',
};

export type Lang = 'en' | 'ar';

export function currentLang(): Lang {
  const pref = store.settings.lang;
  if (pref) return pref;
  return navigator.language?.toLowerCase().startsWith('ar') ? 'ar' : 'en';
}

export function t(key: keyof Strings, vars: Record<string, string | number> = {}): string {
  const s = (currentLang() === 'ar' ? ar : en)[key];
  return s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));
}

export function applyLang(): void {
  const lang = currentLang();
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
}

export function fmtTime(sec: number): string {
  const s = Math.floor(sec);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
