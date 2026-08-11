import { parseTripMarkdown } from './trip-data.js';
import { renderApp } from './render.js';

const app = document.querySelector('#app');
let model = null;
let currentLocation = null;

function render() {
  app.innerHTML = renderApp(model, { now: new Date(), location: currentLocation });
  bindLocationButton();
  bindNoteEditors();
}

function noteStorageKey(noteId) {
  return `nagoya-trip-note:${noteId}`;
}

function readNote(noteId) {
  try {
    return localStorage.getItem(noteStorageKey(noteId)) || '';
  } catch {
    return '';
  }
}

function writeNote(noteId, value) {
  try {
    if (value) localStorage.setItem(noteStorageKey(noteId), value);
    else localStorage.removeItem(noteStorageKey(noteId));
  } catch {
    // Private browsing or storage policies can disable localStorage.
  }
}

function bindNoteEditors() {
  document.querySelectorAll('[data-note-toggle]').forEach((toggle) => {
    const noteId = toggle.dataset.noteToggle;
    const editor = document.querySelector(`[data-note-editor="${CSS.escape(noteId)}"]`);
    const input = document.querySelector(`[data-note-input="${CSS.escape(noteId)}"]`);
    const save = document.querySelector(`[data-note-save="${CSS.escape(noteId)}"]`);
    const clear = document.querySelector(`[data-note-clear="${CSS.escape(noteId)}"]`);
    const label = toggle.querySelector('[data-note-label]');
    if (!editor || !input || !save || !clear || !label) return;

    const storedNote = readNote(noteId);
    input.value = storedNote;
    label.textContent = storedNote ? '已註記' : '註記';
    toggle.classList.toggle('has-note', Boolean(storedNote));

    toggle.addEventListener('click', () => {
      const shouldOpen = editor.hidden;
      editor.hidden = !shouldOpen;
      toggle.setAttribute('aria-expanded', String(shouldOpen));
      if (shouldOpen) input.focus();
    });

    save.addEventListener('click', () => {
      const value = input.value.trim();
      writeNote(noteId, value);
      label.textContent = value ? '已註記' : '註記';
      toggle.classList.toggle('has-note', Boolean(value));
      editor.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    });

    clear.addEventListener('click', () => {
      input.value = '';
      writeNote(noteId, '');
      label.textContent = '註記';
      toggle.classList.remove('has-note');
      editor.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    });
  });
}

function bindLocationButton() {
  const button = document.querySelector('#locate-button');
  if (!button) return;

  if (!('geolocation' in navigator)) {
    button.textContent = '此裝置不支援定位';
    button.disabled = true;
    return;
  }

  button.addEventListener('click', () => {
    button.setAttribute('aria-busy', 'true');
    button.textContent = '正在取得位置…';
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        currentLocation = { latitude: coords.latitude, longitude: coords.longitude };
        render();
      },
      (error) => {
        button.removeAttribute('aria-busy');
        button.textContent = error.code === error.PERMISSION_DENIED ? '定位權限未開啟' : '暫時無法定位';
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }, { once: true });
}

async function start() {
  try {
    const response = await fetch('./nagoya-trip.md', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    model = parseTripMarkdown(await response.text());
    render();
  } catch (error) {
    app.innerHTML = `<main class="error-shell"><h1>行程暫時讀取失敗</h1><p>請確認 nagoya-trip.md 已建置，然後重新整理。<br>${String(error.message)}</p></main>`;
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
}

start();
