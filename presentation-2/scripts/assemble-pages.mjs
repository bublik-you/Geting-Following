import { access, cp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const first = new URL('../../dist/', import.meta.url);
const second = new URL('../dist/', import.meta.url);
const output = new URL('../pages-dist/', import.meta.url);
const subdirectory = 'presentation-2/';

await Promise.all([first, second].flatMap((directory) =>
  ['index.html', 'sw.js'].map((file) => access(new URL(file, directory))),
));

try {
  await access(new URL(subdirectory, first));
  throw new Error('The first build already uses the reserved presentation-2 path.');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

await rm(output, { recursive: true, force: true });
await cp(fileURLToPath(first), fileURLToPath(output), { recursive: true });
await cp(fileURLToPath(second), fileURLToPath(new URL(subdirectory, output)), { recursive: true });
console.log('Combined Pages artifact: presentation-2/pages-dist/');
