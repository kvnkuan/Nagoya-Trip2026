import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import * as tripData from '../src/trip-data.js';

test('trip data module exists', async () => {
  await assert.doesNotReject(() => access(new URL('../src/trip-data.js', import.meta.url)));
});

test('exports a Markdown parser', () => {
  assert.equal(typeof tripData.parseTripMarkdown, 'function');
});

const fixture = `# 旅遊｜名古屋
## 旅程設定
- 旅遊日期：2026-09-11 至 2026-09-17
- 時區：Asia/Tokyo
## 每日行程
### 2026-09-11（週五）
#### 10:00｜吉卜力公園
- 時間：10:00–17:00
- 景點 ID：ghibli-park
- 類別：景點
- 狀態：已預約
- 時間是否鎖定：是
- 路徑距離（公制）：約 24 公里
- 預估交通時間：約 55 分鐘
<!--
### YYYY-MM-DD（週X）
#### HH:MM｜樣板
- 景點 ID：example-place
-->
## 景點與店舖資料庫
### 吉卜力公園
- ID：ghibli-park
- 正式名稱：吉卜力公園
- 類別：景點
- 經緯度：35.1750366, 137.0887701（Google Maps）
- Google Maps 網址：https://maps.example/ghibli
- 營業時間：平日 10:00–17:00
- 簡述：走進吉卜力五大園區
- 指標性特色：Premium 票可進指定建築
`;

test('parses settings, dated itinerary, locked stops and place records', () => {
  const model = tripData.parseTripMarkdown(fixture);

  assert.equal(model.settings['旅遊日期'], '2026-09-11 至 2026-09-17');
  assert.equal(model.days.length, 1);
  assert.equal(model.days[0].date, '2026-09-11');
  assert.equal(model.days[0].stops[0].name, '吉卜力公園');
  assert.equal(model.days[0].stops[0].locked, true);
  assert.equal(model.days[0].stops[0].fields['預估交通時間'], '約 55 分鐘');
  assert.equal(model.places['ghibli-park'].coordinates.latitude, 35.1750366);
  assert.equal(model.places['ghibli-park'].coordinates.longitude, 137.0887701);
  assert.equal(model.places['ghibli-park'].fields['簡述'], '走進吉卜力五大園區');
});

test('ignores commented itinerary templates', () => {
  const model = tripData.parseTripMarkdown(fixture);
  assert.equal(model.days.some((day) => day.date === 'YYYY-MM-DD'), false);
});

test('parses only the latest raw Markdown change markers and links them to stable targets', () => {
  const marked = `${fixture}
<!-- NAGOYA-CHANGE-START id="20260810T100000JST" kind="updated" target="ghibli-park" part="1" -->
舊的更新
<!-- NAGOYA-CHANGE-END id="20260810T100000JST" part="1" -->
<!-- NAGOYA-CHANGE-START id="20260811T171134JST" kind="updated" target="ghibli-park" part="1" -->
本次更新
<!-- NAGOYA-CHANGE-END id="20260811T171134JST" part="1" -->
<!-- NAGOYA-CHANGE-START id="20260811T171134JST" kind="added" target="trip-settings.hotel" part="2" -->
本次新增
<!-- NAGOYA-CHANGE-END id="20260811T171134JST" part="2" -->
<!-- NAGOYA-CHANGE-REMOVED id="20260811T171134JST" target="place.example-id" note="本次已移除" -->`;
  const parsed = tripData.parseTripMarkdown(marked);

  assert.equal(parsed.changes.id, '20260811T171134JST');
  assert.equal(parsed.changes.entries.length, 3);
  assert.deepEqual(parsed.changes.entries.map(({ kind, target, part }) => ({ kind, target, part })), [
    { kind: 'updated', target: 'ghibli-park', part: '1' },
    { kind: 'added', target: 'trip-settings.hotel', part: '2' },
    { kind: 'removed', target: 'place.example-id', part: '' },
  ]);
  assert.equal(parsed.days[0].stops[0].change.kind, 'updated');
  assert.equal(parsed.places['ghibli-park'].change.kind, 'updated');
  assert.equal(parsed.changes.entries[2].note, '本次已移除');
});

test('keeps unmarked Markdown parsing normally and returns an empty change set', () => {
  const parsed = tripData.parseTripMarkdown(fixture);
  assert.deepEqual(parsed.changes, { id: '', entries: [] });
  assert.equal(parsed.days[0].stops[0].name, '吉卜力公園');
});

test('chooses today, the first future day, or the final past day', () => {
  assert.equal(typeof tripData.chooseFocusDay, 'function');
  const days = [
    { date: '2026-09-11' },
    { date: '2026-09-12' },
    { date: '2026-09-13' },
  ];

  assert.equal(tripData.chooseFocusDay(days, new Date('2026-09-10T12:00:00Z')).date, '2026-09-11');
  assert.equal(tripData.chooseFocusDay(days, new Date('2026-09-12T01:00:00Z')).date, '2026-09-12');
  assert.equal(tripData.chooseFocusDay(days, new Date('2026-09-14T12:00:00Z')).date, '2026-09-13');
});

test('assesses open, closing soon, closed, overnight and unknown hours', () => {
  assert.equal(typeof tripData.assessOpeningStatus, 'function');
  assert.equal(tripData.assessOpeningStatus('10:00–17:00', 12 * 60).state, 'open');
  assert.equal(tripData.assessOpeningStatus('10:00–17:00', 16 * 60 + 20).state, 'closing-soon');
  assert.equal(tripData.assessOpeningStatus('10:00–17:00', 17 * 60 + 1).state, 'closed');
  assert.equal(tripData.assessOpeningStatus('17:00–00:30', 23 * 60 + 45).state, 'closing-soon');
  assert.equal(tripData.assessOpeningStatus('待確認', 12 * 60).state, 'unknown');
});

test('parses the published trip file as five real travel days', async () => {
  const markdown = await readFile(new URL('../../nagoya-trip.md', import.meta.url), 'utf8');
  const model = tripData.parseTripMarkdown(markdown);

  assert.equal(model.days.length, 5);
  assert.equal(model.days[0].date, '2026-09-12');
  assert.equal(model.days.at(-1).date, '2026-09-16');
  assert.equal(model.days[0].stops[0].locked, true);
  assert.ok(Object.keys(model.places).length >= 40);
  assert.equal(model.places['ghibli-park'].coordinates.latitude, 35.1750366);
  assert.equal(model.places['hida-takayama-old-town'].fields['正式名稱'], '飛驒高山老街');
  assert.equal(model.places['shirakawago-ogimachi'].fields['正式名稱'], '白川鄉荻町合掌造聚落');
  const scheduledStopIds = model.days.flatMap((day) => day.stops.map((stop) => stop.id));
  assert.ok(scheduledStopIds.includes('hida-takayama-old-town'));
  assert.ok(scheduledStopIds.includes('shirakawago-ogimachi'));
  assert.equal(scheduledStopIds.includes('atsuta-jingu'), false);
  assert.equal(scheduledStopIds.includes('osu-kannon'), false);
  assert.equal(scheduledStopIds.includes('nagoya-castle'), false);
  assert.equal(scheduledStopIds.includes('unagi-kiya'), false);
  assert.equal(scheduledStopIds.includes('tokugawa-garden'), false);
  assert.equal(markdown.includes('<!--\n<!-- NAGOYA-CHANGE-START'), false);
});

test('calculates and formats metric distance from live coordinates', () => {
  assert.equal(typeof tripData.distanceInMeters, 'function');
  assert.equal(typeof tripData.formatMetricDistance, 'function');
  const meters = tripData.distanceInMeters(
    { latitude: 35.1709, longitude: 136.8815 },
    { latitude: 35.1750, longitude: 136.8815 },
  );

  assert.ok(meters > 450 && meters < 470);
  assert.equal(tripData.formatMetricDistance(meters), '約 460 公尺');
  assert.equal(tripData.formatMetricDistance(2150), '約 2.2 公里');
});
