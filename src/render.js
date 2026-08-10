import {
  assessOpeningStatus,
  chooseFocusDay,
  distanceInMeters,
  formatMetricDistance,
} from './trip-data.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function safeUrl(value = '') {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? escapeHtml(url.href) : '';
  } catch {
    return '';
  }
}

function japanClock(now) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
    minutes: Number(values.hour) * 60 + Number(values.minute),
  };
}

function renderChip(text, tone = '') {
  if (!text || text === '待確認' || text === '不適用') return '';
  return `<span class="chip ${tone}">${escapeHtml(text)}</span>`;
}

function renderStop(stop, place, isToday, clock, location) {
  const fields = stop.fields;
  const placeFields = place?.fields ?? {};
  const mapsUrl = safeUrl(placeFields['Google Maps 網址']);
  const hours = placeFields['營業時間'] || fields['營業狀態'] || '';
  const opening = isToday
    ? assessOpeningStatus(hours, clock.minutes)
    : { state: 'scheduled', label: hours || '營業時間待確認' };
  const description = placeFields['簡述'] || fields['備註'] || stop.status;
  const tabelog = placeFields['Tabelog 星等'];
  const google = placeFields['Google 評價'];
  const liveDistance = location && place?.coordinates
    ? `距你${formatMetricDistance(distanceInMeters(location, place.coordinates))}`
    : '';

  return `<li class="stop">
    <time class="stop-time" datetime="${escapeHtml(stop.time)}">${escapeHtml(stop.time)}</time>
    <span class="timeline-mark" aria-hidden="true"></span>
    <article class="stop-content">
      <div class="stop-state">
        <span class="category category-${escapeHtml(stop.category)}">${escapeHtml(stop.category)}</span>
        <span class="opening opening-${opening.state}">${escapeHtml(opening.label)}</span>
        ${stop.locked ? '<span class="locked">已鎖定</span>' : ''}
      </div>
      <h3>${escapeHtml(stop.name)}</h3>
      <p>${escapeHtml(description)}</p>
      <div class="chips">
        ${renderChip(liveDistance, 'live-distance')}
        ${renderChip(fields['路徑距離（公制）'])}
        ${renderChip(fields['預估交通時間'])}
        ${google && google !== '待確認' ? renderChip(`Google ${google}`, 'rating') : ''}
        ${tabelog && tabelog !== '待確認' && tabelog !== '不適用' ? renderChip(`Tabelog ${tabelog}`, 'rating') : ''}
      </div>
      <div class="stop-actions">
        ${mapsUrl ? `<a href="${mapsUrl}" target="_blank" rel="noreferrer">Google Maps <span aria-hidden="true">↗</span></a>` : '<span>地圖連結待確認</span>'}
      </div>
      ${fields['前往方式'] ? `<p class="transport"><span aria-hidden="true">→</span> ${escapeHtml(fields['前往方式'])}</p>` : ''}
    </article>
  </li>`;
}

function renderDay(day, focusDate, index, clock, places, location) {
  const isFocus = day.date === focusDate;
  const isToday = day.date === clock.date;
  const date = new Date(`${day.date}T00:00:00+09:00`);
  const monthDay = new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric' }).format(date);
  const weekday = new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Tokyo', weekday: 'short' }).format(date);
  const stops = day.stops.map((stop) => renderStop(stop, places[stop.id], isToday, clock, location)).join('');
  const dayLabel = isToday ? '今天' : isFocus ? '下一站' : `DAY ${index + 1}`;

  return `<details class="day" data-date="${day.date}" ${isFocus ? 'open' : ''}>
    <summary>
      <span class="date-block"><b>${escapeHtml(monthDay)}</b><small>${escapeHtml(weekday)}</small></span>
      <span class="day-title"><em>${dayLabel}</em><strong>${escapeHtml(day.stops[0]?.name || '自由安排')}</strong><small>${day.stops.length} 個行程</small></span>
      <span class="summary-arrow" aria-hidden="true">⌄</span>
    </summary>
    <div class="route-note"><span><b>已依 Markdown 更新</b><small>${day.stops.length ? '依照確認時間與順序顯示' : '這一天仍可加入景點'}</small></span><a href="./nagoya-trip.md">查看資料</a></div>
    ${stops ? `<ol class="timeline">${stops}</ol>` : '<p class="empty-day">目前沒有已安排的行程。</p>'}
  </details>`;
}

export function renderApp(model, options = {}) {
  const now = options.now ?? new Date();
  const clock = japanClock(now);
  const focusDay = chooseFocusDay(model.days, now, 'Asia/Tokyo');
  const focusDate = focusDay?.date ?? '';
  const orderedDays = focusDay
    ? [focusDay, ...model.days.filter((day) => day !== focusDay)]
    : model.days;
  const range = model.settings['旅遊日期'] || '日期待確認';

  return `<header class="hero">
    <p class="local-time"><span aria-hidden="true"></span>NAGOYA · 當地時間 ${escapeHtml(clock.time)}</p>
    <h1>旅遊｜名古屋</h1>
    <p class="trip-range">${escapeHtml(range)}</p>
    <div class="hero-status"><span>行程資料已同步</span><button id="locate-button" type="button">⌖ 使用目前位置</button></div>
  </header>
  <main id="itinerary">
    <div class="section-heading"><div><p>ITINERARY</p><h2>每日行程</h2></div><a href="./nagoya-trip.md">Markdown ↗</a></div>
    ${orderedDays.map((day) => renderDay(day, focusDate, model.days.indexOf(day), clock, model.places, options.location)).join('')}
  </main>
  <nav class="bottom-nav" aria-label="主要導覽">
    <a class="active" href="#itinerary"><span aria-hidden="true">⌂</span>行程</a>
    <a href="#itinerary"><span aria-hidden="true">⌖</span>地圖</a>
    <a class="add" href="https://github.com/kvnkuan/Nagoya-Trip2026/edit/main/nagoya-trip.md"><span aria-hidden="true">＋</span>加入</a>
    <a href="./nagoya-trip.md"><span aria-hidden="true">▤</span>資料</a>
  </nav>`;
}
