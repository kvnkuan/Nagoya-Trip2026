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
});
