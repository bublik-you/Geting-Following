import { copyFile, readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

async function list(directory, prefix = '') {
  const results = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (item.name.startsWith('.') || item.name === 'sw.js') continue;
    const path = prefix + item.name;
    if (item.isDirectory())
      results.push(...(await list(directory + '/' + item.name, path + '/')));
    else if (item.isFile()) results.push(path);
  }
  return results;
}

await copyFile('SOURCES.md', 'dist/media/extra/SOURCES.md');
const files = (await list('dist')).sort();
const template = await readFile('scripts/worker.js', 'utf8');
const digest = createHash('sha256').update(template);
for (const file of files)
  digest.update(file).update(await readFile('dist/' + file));
const version = digest.digest('hex').slice(0, 16);
const urls = files.map((file) =>
  file.split('/').map(encodeURIComponent).join('/'),
);
await writeFile(
  'dist/sw.js',
  `const VERSION = ${JSON.stringify(version)};\nconst FILES = ${JSON.stringify(urls)};\n${template}`,
);
