// Re-exports the TypeScript generator for Node scripts (bundled on the fly by esbuild via vite).
import { build } from 'vite';
import { fileURLToPath } from 'node:url';

const res = await build({
  logLevel: 'silent',
  configFile: false,
  build: {
    write: false,
    lib: { entry: fileURLToPath(new URL('../src/game/generator.ts', import.meta.url)), formats: ['es'], fileName: 'g' },
  },
});
const code = res[0].output[0].code;
const mod = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
export const generatePuzzle = mod.generatePuzzle;
