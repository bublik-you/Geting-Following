import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const directory = process.argv[2] ?? 'dist';
const entries = await readdir(directory, { recursive: true, withFileTypes: true });
const files = entries
  .filter((entry) => entry.isFile())
  .map((entry) => relative(directory, join(entry.parentPath, entry.name)))
  .filter((path) => path !== 'sw.js' && !path.split(sep).some((part) => part.startsWith('.')))
  .sort();

const worker = await readFile(new URL('./worker.js', import.meta.url), 'utf8');
const hash = createHash('sha256').update(worker);
for (const path of files)
  hash.update(path).update(await readFile(join(directory, path)));

const version = hash.digest('hex').slice(0, 16);
const urls = files.map((path) => path.split(sep).map(encodeURIComponent).join('/'));
await writeFile(join(directory, 'sw.js'), `const VERSION = ${JSON.stringify(version)};\nconst FILES = ${JSON.stringify(urls)};\n${worker}`);
