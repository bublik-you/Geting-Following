import { execFileSync } from 'node:child_process';
import { copyFile, cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { standalone } from './standalone.mjs';

const staging = 'offline/presentation';
const archive = resolve('offline/infographics-offline.zip');
await rm(staging, { recursive: true, force: true });
await mkdir(staging, { recursive: true });
await cp('portable', staging, { recursive: true });
const html = await standalone();
await Promise.all([writeFile('offline/infographics.html', html), writeFile(staging + '/infographics.html', html)]);
for (const doc of ['PLAY_OFFLINE.md', 'MONOLOG.md', 'SOURCES.md'])
  await copyFile(doc, staging + '/' + doc);
await rm(archive, { force: true });
execFileSync('zip', ['-qr', archive, '.'], { cwd: staging });
console.log(archive);
