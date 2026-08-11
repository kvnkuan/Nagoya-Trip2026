import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import test from 'node:test';

const projectFile = (path) => new URL(`../${path}`, import.meta.url);
const execFileAsync = promisify(execFile);

test('PWA source files exist', async () => {
  const files = [
    'public/index.html',
    'public/styles.css',
    'public/manifest.webmanifest',
    'public/sw.js',
    'public/icon.svg',
    'src/app.js',
    'scripts/build.mjs',
  ];
  await assert.doesNotReject(() => Promise.all(files.map((file) => readFile(projectFile(file), 'utf8'))));
});

test('build publishes the workspace-root Markdown source of truth', async () => {
  await execFileAsync(process.execPath, ['scripts/build.mjs'], {
    cwd: new URL('..', import.meta.url),
  });
  const [source, published] = await Promise.all([
    readFile(new URL('../../nagoya-trip.md', import.meta.url), 'utf8'),
    readFile(projectFile('dist/nagoya-trip.md'), 'utf8'),
  ]);

  assert.equal(published, source);
});

test('project does not keep a second hand-maintained Markdown copy', async () => {
  await assert.rejects(() => access(projectFile('nagoya-trip.md')));
});

test('manifest and HTML are configured for an iPhone standalone PWA', async () => {
  const manifest = JSON.parse(await readFile(projectFile('public/manifest.webmanifest'), 'utf8'));
  const html = await readFile(projectFile('public/index.html'), 'utf8');

  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.lang, 'zh-Hant');
  assert.ok(manifest.icons.some((icon) => icon.purpose.includes('maskable')));
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /apple-mobile-web-app-capable/);
  assert.match(html, /manifest\.webmanifest/);
});

test('service worker caches the app shell and refreshes Markdown data', async () => {
  const serviceWorker = await readFile(projectFile('public/sw.js'), 'utf8');
  assert.match(serviceWorker, /nagoya-trip\.md/);
  assert.match(serviceWorker, /cache\.put/);
  assert.match(serviceWorker, /APP_SHELL/);
});

test('hero has no decorative pseudo-element character', async () => {
  const css = await readFile(projectFile('public/styles.css'), 'utf8');
  assert.doesNotMatch(css, /\.hero::after/);
});

test('app runtime has no local annotation storage or editor binding', async () => {
  const app = await readFile(projectFile('src/app.js'), 'utf8');
  assert.doesNotMatch(app, /localStorage|noteStorageKey|bindNoteEditors|data-note-/);
});

test('app shell does not impose a 320px body minimum', async () => {
  const css = await readFile(projectFile('public/styles.css'), 'utf8');
  assert.doesNotMatch(css, /min-width:\s*320px/);
  assert.doesNotMatch(css, /width:\s*min\(100%,\s*430px\)/);
  assert.match(css, /max-width:\s*430px/);
});

test('runtime binds motion only to user interactions and preserves the location icon', async () => {
  const app = await readFile(projectFile('src/app.js'), 'utf8');

  assert.match(app, /function bindInteractionMotion/);
  assert.match(app, /addEventListener\('toggle'/);
  assert.match(app, /is-opening/);
  assert.match(app, /\.button-label/);
  assert.doesNotMatch(app, /button\.textContent\s*=/);
});

test('styles define a coherent accessible interaction motion system', async () => {
  const css = await readFile(projectFile('public/styles.css'), 'utf8');

  assert.match(css, /--motion-fast:\s*120ms/);
  assert.match(css, /--motion-standard:\s*220ms/);
  assert.match(css, /--ease-out-expo:/);
  assert.match(css, /@keyframes itinerary-reveal/);
  assert.match(css, /\.day\.is-opening/);
  assert.match(css, /:active[^}]*scale\(\.96\)/s);
  assert.match(css, /button\[aria-busy="true"\][^{]*\{[^}]*animation:/s);
  assert.match(css, /@keyframes update-emphasis/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});
