// Cross-platform wrapper around dsa/Makefile: uses mingw32-make on Windows, make elsewhere.
//   node scripts/build-dsa.js        build dsa/build/navic-engine
//   node scripts/build-dsa.js test   build and run the C++ tests
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dsa = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dsa');
const candidates = process.platform === 'win32' ? ['mingw32-make', 'make'] : ['make'];
const target = process.argv[2] || 'all';

for (const make of candidates) {
  const result = spawnSync(make, [target], { cwd: dsa, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error?.code === 'ENOENT' || result.status === 9009) continue; // command not found, try the next one
  process.exit(result.status ?? 1);
}
console.error(`No make tool found (tried ${candidates.join(', ')}). Install MinGW-w64 / build-essential.`);
process.exit(1);
