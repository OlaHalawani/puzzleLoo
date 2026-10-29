// Browser smoke test: plays chapter 1 level 1 by dragging its solution, checks the win dialog.
// Usage: npx vite preview --port 4173 &  node scripts/e2e-smoke.mjs [outDir]
import { createRequire } from 'node:module';
import { generatePuzzle } from './puzzle-node.mjs';

// Playwright isn't a project dependency; set PLAYWRIGHT_PATH to a global install if needed.
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH ?? 'playwright');
const out = process.argv[2] ?? '.';
const browser = await chromium.launch();
// STORE=1 renders at iPhone 6.7" store-screenshot size (1290×2796).
const store = process.env.STORE === '1';
const page = await browser.newPage({
  viewport: store ? { width: 430, height: 932 } : { width: 390, height: 844 },
  deviceScaleFactor: store ? 3 : 2,
  hasTouch: true,
});
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

await page.goto('http://localhost:4173/');
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/01-home.png` });
await page.click('[data-act=play]');
await page.waitForSelector('#board');
await page.screenshot({ path: `${out}/02-help.png` });
await page.click('[data-m=close]');

const puzzle = generatePuzzle(5, 'puzzleloo:c0-l0');
const box = await page.locator('#board').boundingBox();
const layout = await page.evaluate(() => {
  const c = document.querySelector('#board');
  return { w: c.clientWidth, h: c.clientHeight };
});
const cell = Math.floor((Math.min(layout.w, layout.h) - 12) / puzzle.size);
const ox = box.x + (layout.w - cell * puzzle.size) / 2;
const oy = box.y + (layout.h - cell * puzzle.size) / 2;
const at = (c) => [ox + (c % puzzle.size) * cell + cell / 2, oy + Math.floor(c / puzzle.size) * cell + cell / 2];

for (const [i, path] of puzzle.solution.entries()) {
  const [sx, sy] = at(path[0]);
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  for (const c of path.slice(1)) {
    const [x, y] = at(c);
    await page.mouse.move(x, y, { steps: 3 });
  }
  await page.mouse.up();
  if (i === 1) await page.screenshot({ path: `${out}/03-playing.png` });
}
await page.waitForSelector('.win', { timeout: 3000 });
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/04-win.png` });
await page.click('[data-m=next]');
await page.waitForTimeout(300);
const title = await page.textContent('.topbar h2');

// Arabic + chapters screen
await page.goto('http://localhost:4173/');
await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('puzzleloo:v1'));
  d.settings.lang = 'ar';
  localStorage.setItem('puzzleloo:v1', JSON.stringify(d));
});
await page.reload();
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/05-home-ar.png` });
await page.click('[data-act=chapters]');
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/06-chapters-ar.png` });

await browser.close();
console.log('next level title:', title);
if (errors.length) {
  console.error('Page errors:', errors);
  process.exit(1);
}
console.log('E2E OK');
