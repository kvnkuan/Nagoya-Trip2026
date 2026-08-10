import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(projectRoot, 'dist');

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(resolve(projectRoot, 'public'), output, { recursive: true });
await cp(resolve(projectRoot, 'src'), resolve(output, 'src'), { recursive: true });
await cp(resolve(projectRoot, 'nagoya-trip.md'), resolve(output, 'nagoya-trip.md'));

console.log(`Built Nagoya Trip PWA at ${output}`);
