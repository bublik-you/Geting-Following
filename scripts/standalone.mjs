import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const mime = {
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif', '.md': 'text/markdown;charset=utf-8',
  '.txt': 'text/plain;charset=utf-8', '.csv': 'text/csv;charset=utf-8', '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4',
};
const dataUrl = (content, type) => `data:${type};base64,${content.toString('base64')}`;

async function readMedia(directory, prefix = '') {
  const items = await readdir(directory, { withFileTypes: true });
  const output = {};
  for (const item of items) {
    if (item.name.startsWith('.')) continue;
    const path = join(directory, item.name);
    const key = prefix + encodeURIComponent(item.name);
    if (item.isDirectory()) Object.assign(output, await readMedia(path, key + '/'));
    else {
      const extension = item.name.slice(item.name.lastIndexOf('.')).toLowerCase();
      output[key] = dataUrl(await readFile(path), mime[extension] ?? 'application/octet-stream');
    }
  }
  return output;
}

const source = await readFile('dist/index.html', 'utf8');
const script = source.match(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/);
const style = source.match(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/);
if (!script || !style) throw new Error('Expected Vite to emit one script and one stylesheet.');
const builtFile = (url) => join('dist', 'assets', url.split('/').at(-1));
const js = await readFile(builtFile(script[1]), 'utf8');
const css = await readFile(builtFile(style[1]), 'utf8');
const media = await readMedia('dist/media');
const icon = dataUrl(await readFile('dist/icon-192.png'), 'image/png');
const result = source
  .replace(script[0], () => `<script>window.presentationMedia=${JSON.stringify(media)};</script>\n<script type="module">\n${js.replaceAll(/<\/script/gi, '<\\/script')}\n</script>`)
  .replace(style[0], () => `<style>\n${css}\n</style>`)
  .replace(/<link\b[^>]*rel="manifest"[^>]*>\s*/, '')
  .replace(/(<link\b[^>]*rel="icon"[^>]*href=")[^"]+/, (_, prefix) => prefix + icon);

await mkdir('offline', { recursive: true });
await writeFile('offline/presentation.html', result);
