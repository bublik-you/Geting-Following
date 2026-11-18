import { readFile } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const distribution = resolve('portable');
const entry = pathToFileURL(resolve(distribution, 'index.html'));
const mime = { '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

async function readAsset(reference, base) {
  const url = new URL(reference, base);
  if (url.protocol !== 'file:') throw new Error('Standalone build requires local assets.');
  const path = fileURLToPath(url);
  if (relative(distribution, path).startsWith('..')) throw new Error('Asset is outside the build.');
  return readFile(path);
}

async function inlineAsset(reference, base) {
  const type = mime[extname(new URL(reference, base).pathname)];
  if (!type) throw new Error('Missing media type for ' + reference);
  const asset = await readAsset(reference, base);
  return 'data:' + type + ';base64,' + asset.toString('base64');
}

export async function standalone() {
  const html = await readFile(entry, 'utf8');
  const scriptTag = html.match(/<script\b[^>]*type="module"[^>]*src="([^"]+)"[^>]*><\/script>/);
  const styleTag = html.match(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/);
  const iconTag = html.match(/<link\b[^>]*rel="icon"[^>]*href="([^"]+)"[^>]*>/);
  if (!scriptTag || !styleTag || !iconTag || /rel="modulepreload"/.test(html))
    throw new Error('Expected one bundled script and stylesheet.');

  const [source, stylesheet, icon] = await Promise.all([
    readAsset(scriptTag[1], entry),
    readAsset(styleTag[1], entry),
    inlineAsset(iconTag[1], entry),
  ]);
  const css = stylesheet.toString();
  const cssFile = new URL(styleTag[1], entry);
  const urls = new Map();
  for (const match of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
    if (!urls.has(match[1])) urls.set(match[1], await inlineAsset(match[1], cssFile));
  }

  return html
    .replace('<html lang="ru">', '<html lang="ru" data-standalone>')
    .replace(/<link\b[^>]*rel="manifest"[^>]*>\s*/, '')
    .replace(iconTag[0], () => '<link rel="icon" href="' + icon + '">')
    .replace(styleTag[0], () => '<style>' + css.replace(/url\(["']?([^"')]+)["']?\)/g, (_, url) => 'url("' + urls.get(url) + '")') + '</style>')
    .replace(scriptTag[0], () => '<script type="module">' + source.toString().replaceAll(/<\/script/gi, '<\\/script') + '</script>');
}
