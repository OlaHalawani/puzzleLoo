import './styles.css';
import { Board } from './game/board';
import {
  CHAPTERS,
  UNLOCK_THRESHOLD,
  dailyKey,
  getDaily,
  getLevel,
  levelKey,
} from './game/levels';
import { Renderer } from './game/renderer';
import { store } from './game/storage';
import type { Puzzle } from './game/types';
import { fx } from './ui/feedback';
import { icons } from './ui/icons';
import { applyLang, currentLang, fmtTime, t } from './ui/i18n';

type Target = { kind: 'level'; chapter: number; level: number } | { kind: 'daily'; key: string };
type Route =
  | { screen: 'home' }
  | { screen: 'chapters' }
  | { screen: 'levels'; chapter: number }
  | { screen: 'game'; target: Target };

const app = document.getElementById('app')!;
let cleanup: (() => void) | null = null;

// ---------- progress helpers ----------

function keyOf(target: Target): string {
  return target.kind === 'daily' ? target.key : levelKey(target.chapter, target.level);
}

function puzzleOf(target: Target): Puzzle {
  return target.kind === 'daily' ? getDaily(target.key) : getLevel(target.chapter, target.level);
}

function solvedIn(chapter: number): number {
  let n = 0;
  for (let l = 0; l < CHAPTERS[chapter].levels; l++) if (store.result(levelKey(chapter, l))) n++;
  return n;
}

function chapterUnlocked(chapter: number): boolean {
  return chapter === 0 || solvedIn(chapter - 1) >= UNLOCK_THRESHOLD;
}

function levelUnlocked(chapter: number, level: number): boolean {
  if (!chapterUnlocked(chapter)) return false;
  return level === 0 || !!store.result(levelKey(chapter, level - 1)) || !!store.result(levelKey(chapter, level));
}

function nextTarget(target: Target): Target | null {
  if (target.kind === 'daily') return null;
  const { chapter, level } = target;
  if (level + 1 < CHAPTERS[chapter].levels) return { kind: 'level', chapter, level: level + 1 };
  if (chapter + 1 < CHAPTERS.length && chapterUnlocked(chapter + 1)) return { kind: 'level', chapter: chapter + 1, level: 0 };
  return null;
}

function targetFromKey(key: string): Target | null {
  const m = /^c(\d+)-l(\d+)$/.exec(key);
  if (m) {
    const chapter = Number(m[1]);
    const level = Number(m[2]);
    if (CHAPTERS[chapter] && level < CHAPTERS[chapter].levels) return { kind: 'level', chapter, level };
    return null;
  }
  return key === dailyKey() ? { kind: 'daily', key } : null;
}

/** Where "Play" takes you: the saved game, else the first unsolved unlocked level. */
function playTarget(): Target | null {
  const saved = store.inProgress && targetFromKey(store.inProgress.key);
  if (saved && saved.kind === 'level') return saved;
  for (let c = 0; c < CHAPTERS.length; c++) {
    if (!chapterUnlocked(c)) break;
    for (let l = 0; l < CHAPTERS[c].levels; l++) if (!store.result(levelKey(c, l))) return { kind: 'level', chapter: c, level: l };
  }
  return null;
}

function starsFor(hints: number): number {
  return hints === 0 ? 3 : hints === 1 ? 2 : 1;
}

function starRow(n: number, cls = ''): string {
  return `<span class="stars ${cls}">${[0, 1, 2].map((i) => `<span class="${i < n ? 'on' : ''}">${icons.star}</span>`).join('')}</span>`;
}

function chapterName(c: number): string {
  return t(CHAPTERS[c].key as 'ch1');
}

// ---------- routing (uses history so the Android back button works) ----------

function go(route: Route, replace = false): void {
  if (replace) history.replaceState(route, '');
  else history.pushState(route, '');
  render(route);
}

window.addEventListener('popstate', (e) => render((e.state as Route | null) ?? { screen: 'home' }));

function render(route: Route): void {
  cleanup?.();
  cleanup = null;
  closeModal();
  applyLang();
  switch (route.screen) {
    case 'home':
      return renderHome();
    case 'chapters':
      return renderChapters();
    case 'levels':
      return renderLevels(route.chapter);
    case 'game':
      cleanup = renderGame(route.target);
  }
}

function back(): void {
  if (history.state && (history.state as Route).screen !== 'home') history.back();
  else go({ screen: 'home' }, true);
}

// ---------- screens ----------

function renderHome(): void {
  const play = playTarget();
  const hasSave = !!store.inProgress && !!play && store.inProgress.key === keyOf(play);
  const daily = dailyKey();
  const dailyDone = !!store.result(daily);
  app.innerHTML = `
    <section class="screen home">
      <button class="icon-btn corner" data-act="settings" aria-label="${t('settings')}">${icons.gear}</button>
      <div class="logo">
        <div class="logo-shapes"><i class="s1"></i><i class="s2"></i><i class="s3"></i></div>
        <h1 class="logo-word">${'PUZZLELOO'.split('').map((ch) => `<span>${ch}</span>`).join('')}</h1>
        <p class="tagline">${t('tagline')}</p>
      </div>
      <div class="menu">
        <button class="btn primary" data-act="play" ${play ? '' : 'disabled'}>${icons.play}<span>${play ? (hasSave ? t('continue') : t('play')) : t('allDone')}</span></button>
        <button class="btn" data-act="daily">${icons.calendar}<span>${t('daily')}</span>${dailyDone ? `<em class="badge">${icons.check}</em>` : ''}</button>
        <button class="btn" data-act="chapters">${icons.grid}<span>${t('chapters')}</span></button>
        <button class="btn ghost" data-act="help">${icons.help}<span>${t('howTo')}</span></button>
      </div>
      <p class="footnote">${t('noAds')}</p>
    </section>`;
  bind({
    play: () => play && go({ screen: 'game', target: play }),
    daily: () => go({ screen: 'game', target: { kind: 'daily', key: daily } }),
    chapters: () => go({ screen: 'chapters' }),
    help: () => showHelp(),
    settings: () => showSettings(() => renderHome()),
  });
}

function renderChapters(): void {
  app.innerHTML = `
    <section class="screen list">
      <header class="topbar">
        <button class="icon-btn" data-act="back" aria-label="back">${icons.back}</button>
        <h2>${t('chapters')}</h2>
        <span class="icon-btn spacer"></span>
      </header>
      <div class="chapters">
        ${CHAPTERS.map((ch, i) => {
          const open = chapterUnlocked(i);
          const solved = solvedIn(i);
          return `
          <button class="chapter-card c${i}" data-chapter="${i}" ${open ? '' : 'disabled'}>
            <div class="chapter-meta">
              <small>${t('chapter')} ${i + 1}/${CHAPTERS.length} · ${ch.size}×${ch.size}</small>
              <strong>${chapterName(i)}</strong>
              ${open ? `<div class="progress"><i style="width:${(solved / ch.levels) * 100}%"></i></div><small>${solved}/${ch.levels}</small>` : `<small class="lock-note">${icons.lock} ${t('locked', { n: UNLOCK_THRESHOLD })}</small>`}
            </div>
          </button>`;
        }).join('')}
      </div>
    </section>`;
  bind({ back });
  app.querySelectorAll<HTMLButtonElement>('[data-chapter]').forEach((b) =>
    b.addEventListener('click', () => go({ screen: 'levels', chapter: Number(b.dataset.chapter) })),
  );
}

function renderLevels(chapter: number): void {
  const ch = CHAPTERS[chapter];
  app.innerHTML = `
    <section class="screen list">
      <header class="topbar">
        <button class="icon-btn" data-act="back" aria-label="back">${icons.back}</button>
        <h2><small>${t('chapter')} ${chapter + 1}</small>${chapterName(chapter)}</h2>
        <span class="icon-btn spacer"></span>
      </header>
      <div class="level-grid">
        ${Array.from({ length: ch.levels }, (_, l) => {
          const res = store.result(levelKey(chapter, l));
          const open = levelUnlocked(chapter, l);
          return `<button class="level-tile ${res ? 'done' : ''}" data-level="${l}" ${open ? '' : 'disabled'}>
            <span>${open ? l + 1 : icons.lock}</span>${res ? starRow(res.stars, 'small') : ''}
          </button>`;
        }).join('')}
      </div>
    </section>`;
  bind({ back });
  app.querySelectorAll<HTMLButtonElement>('[data-level]').forEach((b) =>
    b.addEventListener('click', () => go({ screen: 'game', target: { kind: 'level', chapter, level: Number(b.dataset.level) } })),
  );
}

function renderGame(target: Target): () => void {
  const key = keyOf(target);
  const puzzle = puzzleOf(target);
  const saved = store.inProgress?.key === key ? store.inProgress : null;
  const board = new Board(puzzle, saved?.paths);
  board.hintsUsed = saved?.hints ?? 0;
  let elapsed = saved?.elapsed ?? 0;
  let paused = false;
  let solved = false;
  let warnedFill = false;

  const title =
    target.kind === 'daily'
      ? `<small>${t('daily')}</small>${target.key.slice(6)}`
      : `<small>${chapterName(target.chapter)} · ${puzzle.size}×${puzzle.size}</small>${t('level')} ${target.level + 1}`;

  app.innerHTML = `
    <section class="screen game">
      <header class="topbar">
        <button class="icon-btn" data-act="back" aria-label="back">${icons.back}</button>
        <h2>${title}</h2>
        <button class="icon-btn" data-act="settings" aria-label="${t('settings')}">${icons.gear}</button>
      </header>
      <button class="timer" data-act="pause">${icons.clock}<span id="time">${fmtTime(elapsed)}</span><span id="pp">${icons.pause}</span></button>
      <div class="board-wrap">
        <canvas id="board" aria-label="puzzle board"></canvas>
        <div class="pause-cover hidden" id="cover"><button class="btn primary" data-act="resume">${icons.play}<span>${t('resume')}</span></button></div>
        <div class="toast hidden" id="toast"></div>
      </div>
      <div class="stats"><span>${t('flows')}: <b id="flows"></b></span><span>${t('filled')}: <b id="fill"></b></span></div>
      <nav class="tools">
        <button data-act="reset">${icons.reset}<span>${t('reset')}</span></button>
        <button data-act="undo" id="undo">${icons.undo}<span>${t('undo')}</span></button>
        <button data-act="hint">${icons.hint}<span>${t('hint')}</span></button>
        <button data-act="help">${icons.help}<span>${t('help')}</span></button>
      </nav>
    </section>`;

  const canvas = app.querySelector<HTMLCanvasElement>('#board')!;
  const renderer = new Renderer(canvas);
  const $ = (id: string) => app.querySelector<HTMLElement>(`#${id}`)!;
  let dirty = true;
  let raf = 0;

  const loop = (now: number) => {
    if (dirty || renderer.animating) {
      renderer.draw(board, now);
      dirty = false;
    }
    raf = requestAnimationFrame(loop);
  };

  const resize = () => {
    renderer.resize(board);
    dirty = true;
  };

  const save = () => {
    if (solved) return;
    store.saveProgress({ key, paths: board.paths, elapsed, hints: board.hintsUsed });
  };

  const hud = () => {
    $('flows').textContent = `${board.completedCount()}/${puzzle.pairs.length}`;
    $('fill').textContent = `${Math.floor((board.filledCount() / board.cells) * 100)}%`;
    $('undo').toggleAttribute('disabled', !board.canUndo());
  };

  let toastTimer = 0;
  const toast = (msg: string) => {
    const el = $('toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => el.classList.add('hidden'), 2600);
  };

  const setPaused = (p: boolean) => {
    if (solved) return;
    paused = p;
    $('cover').classList.toggle('hidden', !p);
    $('pp').innerHTML = p ? icons.play : icons.pause;
    if (p) save();
  };

  const afterChange = () => {
    dirty = true;
    hud();
    if (board.isSolved()) return win();
    if (board.completedCount() === puzzle.pairs.length) {
      if (!warnedFill) toast(t('fillAll'));
      warnedFill = true;
    } else warnedFill = false;
    save();
  };

  const win = () => {
    solved = true;
    const stars = starsFor(board.hintsUsed);
    const prevBest = store.result(key)?.bestTime;
    const isNewBest = store.recordWin(key, elapsed, stars) && prevBest !== undefined;
    const now = performance.now();
    puzzle.pairs.forEach((_, i) => renderer.pulse.set(i, now + i * 60));
    fx.win();
    const next = nextTarget(target);
    setTimeout(() => {
      openModal(`
        <div class="win">
          <h3>${t('solved')}</h3>
          ${starRow(stars, 'big')}
          <p class="win-time">${t('time')} <b>${fmtTime(elapsed)}</b> · ${t('best')} <b>${fmtTime(store.result(key)!.bestTime)}</b></p>
          ${isNewBest ? `<p class="new-best">${t('newBest')}</p>` : ''}
          ${target.kind === 'daily' ? `<p>${t('dailyDone')}</p>` : ''}
          <div class="modal-actions">
            ${next ? `<button class="btn primary" data-m="next">${t('next')}</button>` : ''}
            <button class="btn" data-m="replay">${t('replay')}</button>
            <button class="btn ghost" data-m="menu">${t('menu')}</button>
          </div>
        </div>`, {
        next: () => next && go({ screen: 'game', target: next }, true),
        replay: () => go({ screen: 'game', target }, true),
        menu: () => back(),
      }, false);
    }, 700);
  };

  // --- input ---
  let pointerId = -1;
  let lastCell = -1;
  let activeWasComplete = false;

  const onDown = (e: PointerEvent) => {
    if (paused || solved || pointerId !== -1) return;
    fx.unlock();
    const cell = renderer.cellAt(e.clientX, e.clientY, board.size);
    if (cell === -1 || !board.begin(cell)) return;
    pointerId = e.pointerId;
    canvas.setPointerCapture(e.pointerId);
    lastCell = cell;
    activeWasComplete = board.isComplete(board.active);
    renderer.pointerCell = cell;
    fx.tap();
    dirty = true;
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerId !== pointerId || board.active === -1) return;
    const cell = renderer.clampedCellAt(e.clientX, e.clientY, board.size);
    if (cell === lastCell) return;
    lastCell = cell;
    renderer.pointerCell = cell;
    if (board.dragTo(cell)) {
      const done = board.isComplete(board.active);
      if (done && !activeWasComplete) fx.connect(puzzle.pairs[board.active].color);
      else fx.tick();
      activeWasComplete = done;
      hud();
    }
    dirty = true;
  };

  const onUp = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    pointerId = -1;
    renderer.pointerCell = -1;
    const active = board.active;
    if (board.end()) {
      if (board.isComplete(active)) renderer.pulse.set(active, performance.now());
      afterChange();
    }
    dirty = true;
  };

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  bind({
    back,
    pause: () => setPaused(!paused),
    resume: () => setPaused(false),
    settings: () => {
      const was = paused;
      setPaused(true);
      showSettings(() => setPaused(was));
    },
    reset: () => {
      if (!paused && !solved && board.reset()) {
        fx.tap();
        afterChange();
      }
    },
    undo: () => {
      if (!paused && !solved && board.undo()) {
        fx.tap();
        afterChange();
      }
    },
    hint: () => {
      if (paused || solved) return;
      const i = board.hint();
      if (i === -1) return;
      fx.hint();
      renderer.pulse.set(i, performance.now());
      afterChange();
    },
    help: () => {
      const was = paused;
      setPaused(true);
      showHelp(() => setPaused(was));
    },
  });

  const tick = window.setInterval(() => {
    if (paused || solved || document.hidden) return;
    elapsed++;
    $('time').textContent = fmtTime(elapsed);
  }, 1000);

  const onVisibility = () => {
    if (document.hidden) setPaused(true);
  };
  const onResize = () => resize();
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('resize', onResize);

  resize();
  hud();
  raf = requestAnimationFrame(loop);
  if (!store.seenHelp) showHelp();

  return () => {
    save();
    cancelAnimationFrame(raf);
    clearInterval(tick);
    clearTimeout(toastTimer);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('resize', onResize);
  };
}

// ---------- modals ----------

let modalEl: HTMLElement | null = null;

function openModal(html: string, actions: Record<string, () => void>, dismissable = true, onClose?: () => void): void {
  closeModal();
  const el = document.createElement('div');
  el.className = 'modal-backdrop';
  el.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  const close = () => {
    closeModal();
    onClose?.();
  };
  el.addEventListener('click', (e) => {
    if (dismissable && e.target === el) close();
  });
  el.querySelectorAll<HTMLElement>('[data-m]').forEach((b) =>
    b.addEventListener('click', () => {
      const act = b.dataset.m!;
      if (act === 'close') return close();
      actions[act]?.();
    }),
  );
  document.body.appendChild(el);
  modalEl = el;
}

function closeModal(): void {
  modalEl?.remove();
  modalEl = null;
}

function showHelp(onClose?: () => void): void {
  openModal(
    `<h3>${t('helpTitle')}</h3>
     <div class="help-demo" aria-hidden="true"><i class="d1"></i><i class="line"></i><i class="d2"></i></div>
     <ol class="help-list"><li>${t('help1')}</li><li>${t('help2')}</li><li>${t('help3')}</li><li>${t('help4')}</li></ol>
     <div class="modal-actions"><button class="btn primary" data-m="close">${t('gotIt')}</button></div>`,
    {},
    true,
    () => {
      store.markHelpSeen();
      onClose?.();
    },
  );
}

function showSettings(onClose: () => void): void {
  const s = store.settings;
  const lang = currentLang();
  openModal(
    `<h3>${t('settings')}</h3>
     <label class="row"><span>${t('sound')}</span><input type="checkbox" id="opt-sound" ${s.sound ? 'checked' : ''}></label>
     <label class="row"><span>${t('vibration')}</span><input type="checkbox" id="opt-haptics" ${s.haptics ? 'checked' : ''}></label>
     <div class="row"><span>${t('language')}</span>
       <div class="seg"><button data-m="en" class="${lang === 'en' ? 'on' : ''}">English</button><button data-m="ar" class="${lang === 'ar' ? 'on' : ''}">عربي</button></div>
     </div>
     <button class="link danger" data-m="wipe">${t('resetProgress')}</button>
     <a class="link" href="./privacy.html" target="_blank" rel="noopener">${t('privacy')}</a>
     <p class="version">PuzzleLoo v${__APP_VERSION__}</p>
     <div class="modal-actions"><button class="btn primary" data-m="close">${t('close')}</button></div>`,
    {
      en: () => switchLang('en'),
      ar: () => switchLang('ar'),
      wipe: () => {
        if (confirm(t('confirmReset'))) {
          store.resetAll();
          closeModal();
          go({ screen: 'home' }, true);
        }
      },
    },
    true,
    onClose,
  );
  modalEl!.querySelector<HTMLInputElement>('#opt-sound')!.addEventListener('change', (e) =>
    store.setSetting('sound', (e.target as HTMLInputElement).checked),
  );
  modalEl!.querySelector<HTMLInputElement>('#opt-haptics')!.addEventListener('change', (e) =>
    store.setSetting('haptics', (e.target as HTMLInputElement).checked),
  );
}

function switchLang(lang: 'en' | 'ar'): void {
  store.setSetting('lang', lang);
  closeModal();
  render((history.state as Route | null) ?? { screen: 'home' });
}

function bind(actions: Record<string, () => void>): void {
  app.querySelectorAll<HTMLElement>('[data-act]').forEach((el) => {
    const fn = actions[el.dataset.act!];
    if (fn) el.addEventListener('click', fn);
  });
}

// ---------- boot ----------

go({ screen: 'home' }, true);
