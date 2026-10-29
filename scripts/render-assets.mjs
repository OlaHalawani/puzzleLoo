// Renders store/native assets from public/icon.svg with the pre-installed Playwright Chromium:
//   resources/icon.png (1024²), resources/splash.png + splash-dark.png (2732²)
// Then run `npm run cap:assets` to generate every iOS/Android size from them.
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH ?? 'playwright');
const icon = readFileSync(new URL('../public/icon.svg', import.meta.url), 'utf8');
mkdirSync(new URL('../resources/', import.meta.url), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();

await page.setViewportSize({ width: 1024, height: 1024 });
await page.setContent(`<style>body{margin:0}</style>${icon.replace('<svg ', '<svg width="1024" height="1024" ')}`);
await page.screenshot({ path: 'resources/icon.png', omitBackground: false });

const splash = `<style>body{margin:0;width:2732px;height:2732px;display:grid;place-items:center;
  background:linear-gradient(170deg,#1a0b3d,#3a1470 48%,#8a2a7c);font-family:system-ui,sans-serif}
  .w{display:flex;flex-direction:column;align-items:center;gap:60px}
  .i{width:520px;height:520px;border-radius:116px;overflow:hidden;box-shadow:0 0 120px rgba(182,92,255,.6)}
  .t{display:flex;gap:14px}.t span{display:grid;place-items:center;width:110px;height:136px;background:#fff;color:#140a2e;
  border-radius:18px;font-size:90px;font-weight:900;box-shadow:0 12px 0 rgba(0,0,0,.35)}
  .t span:nth-child(odd){transform:rotate(-3deg)}.t span:nth-child(even){transform:rotate(3deg)}</style>
  <div class="w"><div class="i">${icon.replace('<svg ', '<svg width="520" height="520" ')}</div>
  <div class="t">${'PUZZLELOO'.split('').map((c) => `<span>${c}</span>`).join('')}</div></div>`;
await page.setViewportSize({ width: 2732, height: 2732 });
await page.setContent(splash);
await page.screenshot({ path: 'resources/splash.png' });
await page.screenshot({ path: 'resources/splash-dark.png' });

await browser.close();
console.log('Wrote resources/icon.png, resources/splash.png, resources/splash-dark.png');
