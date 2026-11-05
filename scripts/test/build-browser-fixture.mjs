import { spawnSync } from 'node:child_process';
const clock = new URL('./build-clock.mjs', import.meta.url).href;
// Never replace dist: that remains the current-time build and deployment artifact.
const result = spawnSync(process.execPath, ['node_modules/astro/bin/astro.mjs', 'build', '--outDir', '.browser-fixture'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --import=${clock}` },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
