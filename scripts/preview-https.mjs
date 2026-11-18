import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { preview } from 'vite';

const directory = mkdtempSync(join(tmpdir(), 'four-cats-tls-'));
const key = join(directory, 'key.pem');
const cert = join(directory, 'cert.pem');
try {
  execFileSync('openssl', [
    'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
    '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1',
    '-keyout', key, '-out', cert,
  ], { stdio: 'ignore' });
  await preview({ preview: {
    host: '127.0.0.1', port: 4173, strictPort: true,
    https: { key: readFileSync(key), cert: readFileSync(cert) },
  } });
} finally {
  rmSync(directory, { recursive: true, force: true });
}
