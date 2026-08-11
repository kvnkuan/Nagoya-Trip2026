import assert from 'node:assert/strict';
import test from 'node:test';
import * as renderModule from '../src/render.js';

const model = {
  settings: {
    '旅遊日期': '2026-09-11 至 2026-09-17',
    '住宿地點': '皇家公園飯店名古屋標誌',
  },
  days: [
    {
      date: '2026-09-11',
      label: '（週五）',
      stops: [{
        time: '20:45',
        name: '迴轉壽司 銀座 ONODERA 名古屋店',
        id: 'onodera',
        category: '餐廳',
        status: '已安排',
        locked: false,
        fields: {
          '路徑距離（公制）': '約 500 公尺',
          '預估交通時間': '約 7 分鐘',
          '前往方式': '飯店步行',
          '營業狀態': '11:00–22:30',
        },
      }],
    },
    { date: '2026-09-12', label: '（週六）', stops: [] },
  ],
  places: {
    onodera: {
      coordinates: null,
      fields: {
        '簡述': '江戶前迴轉壽司名店',
        'Google Maps 網址': 'https://maps.example/onodera',
        'Google 評價': '4.2',
        'Tabelog 星等': '3.58',
        '營業時間': '11:00–22:30',
      },
    },
  },
};

test('exports a semantic itinerary renderer', () => {
  assert.equal(typeof renderModule.renderApp, 'function');
});

test('renders the focus day open and other days collapsed with route details', () => {
  const html = renderModule.renderApp(model, {
    now: new Date('2026-09-10T12:00:00Z'),
    location: null,
  });

  assert.match(html, /旅遊｜名古屋/);
  assert.match(html, /<details[^>]+open/);
  assert.match(html, /2026-09-12/);
  assert.match(html, /迴轉壽司 銀座 ONODERA/);
  assert.match(html, /約 500 公尺/);
  assert.match(html, /約 7 分鐘/);
  assert.match(html, /Tabelog 3\.58/);
  assert.match(html, /https:\/\/maps\.example\/onodera/);
});

test('keeps map actions contextual without a redundant global navigation bar', () => {
  const html = renderModule.renderApp(model, { now: new Date('2026-09-10T12:00:00Z') });

  assert.doesNotMatch(html, /Markdown ↗/);
  assert.match(html, /class="route-map-link" href="https:\/\/maps\.example\/onodera"/);
  assert.match(html, /整日路線/);
  assert.match(html, /href="https:\/\/maps\.example\/onodera"[^>]*>Google Maps/);
  assert.doesNotMatch(html, /class="bottom-nav"|class="map-nav"/);
});

test('renders only travel controls without annotation, add, or raw-data interfaces', () => {
  const html = renderModule.renderApp(model, { now: new Date('2026-09-10T12:00:00Z') });

  assert.match(html, /class="summary-arrow"[^>]*><svg/);
  assert.doesNotMatch(html, /class="summary-arrow"[^>]*>⌄/);
  assert.doesNotMatch(html, /註記|data-note-|修改註記/);
  assert.doesNotMatch(html, /github\.com\/kvnkuan\/Nagoya-Trip2026\/edit/);
  assert.doesNotMatch(html, /href="\.\/nagoya-trip\.md"/);
  assert.doesNotMatch(html, />加入<|>資料<|主要導覽/);
  assert.doesNotMatch(html, /ITINERARY|已依 Markdown 更新|依照確認時間與順序顯示/);
});

test('escapes Markdown text before inserting it into HTML', () => {
  const unsafe = structuredClone(model);
  unsafe.days[0].stops[0].name = '<script>alert(1)</script>';
  const html = renderModule.renderApp(unsafe, { now: new Date('2026-09-10T12:00:00Z') });

  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;/);
});

test('renders live metric distance when location and place coordinates exist', () => {
  const located = structuredClone(model);
  located.places.onodera.coordinates = { latitude: 35.1750, longitude: 136.8815 };
  const html = renderModule.renderApp(located, {
    now: new Date('2026-09-10T12:00:00Z'),
    location: { latitude: 35.1709, longitude: 136.8815 },
  });

  assert.match(html, /距你約 460 公尺/);
  assert.match(html, /class="chip live-distance motion-distance"/);
});

test('keeps the location control structure stable while its state changes', () => {
  const html = renderModule.renderApp(model, { now: new Date('2026-09-10T12:00:00Z') });

  assert.match(html, /id="locate-button"[^>]*>/);
  assert.match(html, /class="button-icon"/);
  assert.match(html, /class="button-label">使用目前位置<\/span>/);
});

test('shows the latest change badges without exposing Markdown comment syntax', () => {
  const changed = structuredClone(model);
  changed.changes = {
    id: '20260811T171134JST',
    entries: [{ id: '20260811T171134JST', kind: 'updated', target: 'onodera', part: '1' }],
  };
  changed.days[0].stops[0].change = changed.changes.entries[0];
  changed.places.onodera.change = changed.changes.entries[0];
  const html = renderModule.renderApp(changed, { now: new Date('2026-09-10T12:00:00Z') });

  assert.match(html, /本次更新 1 處/);
  assert.match(html, /class="change-badge change-updated">已更新</);
  assert.match(html, /class="stop change-updated"/);
  assert.doesNotMatch(html, /NAGOYA-CHANGE|<!--|20260811T171134JST/);
});

test('keeps Tabelog chips compact when Markdown includes verification details', () => {
  const detailed = structuredClone(model);
  detailed.places.onodera.fields['Tabelog 星等'] = '3.45（70 則評論；分數會浮動，2026-08-11 查證）';
  const html = renderModule.renderApp(detailed, { now: new Date('2026-09-10T12:00:00Z') });

  assert.match(html, /Tabelog 3\.45/);
  assert.doesNotMatch(html, /class="chip rating">Tabelog 3\.45（70 則評論/);
});
