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

const ICONS = {
  chevronDown: '<svg viewBox="0 0 24 24" focusable="false"><path d="m6 9 6 6 6-6"/></svg>',
  crosshair: '<svg viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>',
  externalLink: '<svg viewBox="0 0 24 24" focusable="false"><path d="M15 3h6v6m-11 5L21 3m-3 10v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>',
  home: '<svg viewBox="0 0 24 24" focusable="false"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  list: '<svg viewBox="0 0 24 24" focusable="false"><path d="M3 5h.01M3 12h.01M3 19h.01M8 5h13M8 12h13M8 19h13"/></svg>',
  map: '<svg viewBox="0 0 24 24" focusable="false"><path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0zM15 5.764v15M9 3.236v15"/></svg>',
  note: '<svg viewBox="0 0 24 24" focusable="false"><path d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4M2 6h4m-4 4h4m-4 4h4m-4 4h4"/><path d="M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87.62.62 2.87-.837a2 2 0 0 0 .854-.506z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" focusable="false"><path d="M5 12h14M12 5v14"/></svg>',
};

function icon(name) {
  return ICONS[name] ?? '';
}

function routeMapUrl(day, places) {
  const mappedStops = day.stops.filter((stop) => safeUrl(places[stop.id]?.fields?.['Google Maps 網址']));
  if (mappedStops.length === 1) return safeUrl(places[mappedStops[0].id].fields['Google Maps 網址']);

  const names = day.stops.map((stop) => stop.name).filter(Boolean);
  if (names.length > 1) {
    const params = new URLSearchParams({
      api: '1',
      origin: names[0],
      destination: names.at(-1),
      travelmode: 'transit',
    });
    if (names.length > 2) params.set('waypoints', names.slice(1, -1).join('|'));
    return escapeHtml(`https://www.google.com/maps/dir/?${params}`);
  }

  if (mappedStops.length) return safeUrl(places[mappedStops[0].id].fields['Google Maps 網址']);
  return 'https://www.google.com/maps/search/?api=1&amp;query=%E5%90%8D%E5%8F%A4%E5%B1%8B';
}

function renderStop(stop, place, isToday, clock, location, dayDate) {
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
  const noteId = escapeHtml(`${dayDate}-${stop.id || stop.time}`);

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
        ${mapsUrl ? `<a href="${mapsUrl}" target="_blank" rel="noreferrer">Google Maps <span class="inline-icon" aria-hidden="true">${icon('externalLink')}</span></a>` : '<span class="map-pending">地圖連結待確認</span>'}
        <button class="note-toggle" type="button" data-note-toggle="${noteId}" aria-expanded="false"><span class="inline-icon" aria-hidden="true">${icon('note')}</span><span data-note-label>註記</span></button>
      </div>
      <div class="note-editor" data-note-editor="${noteId}" hidden>
        <label for="note-${noteId}">修改註記</label>
        <textarea id="note-${noteId}" data-note-input="${noteId}" rows="3" placeholder="例如：時間要改、字太小…"></textarea>
        <div class="note-editor-actions"><button type="button" data-note-save="${noteId}">儲存</button><button type="button" data-note-clear="${noteId}">清除</button><small>僅儲存在這台裝置</small></div>
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
  const stops = day.stops.map((stop) => renderStop(stop, places[stop.id], isToday, clock, location, day.date)).join('');
  const dayLabel = isToday ? '今天' : isFocus ? '下一站' : `DAY ${index + 1}`;
  const mapUrl = routeMapUrl(day, places);

  return `<details class="day" data-date="${day.date}" ${isFocus ? 'open' : ''}>
    <summary>
      <span class="date-block"><b>${escapeHtml(monthDay)}</b><small>${escapeHtml(weekday)}</small></span>
      <span class="day-title"><em>${dayLabel}</em><strong>${escapeHtml(day.stops[0]?.name || '自由安排')}</strong><small>${day.stops.length} 個行程</small></span>
      <span class="summary-arrow" aria-hidden="true">${icon('chevronDown')}</span>
    </summary>
    <div class="route-note"><span><b>已依 Markdown 更新</b><small>${day.stops.length ? '依照確認時間與順序顯示' : '這一天仍可加入景點'}</small></span><a class="route-map-link" href="${mapUrl}" target="_blank" rel="noreferrer">查看路線</a></div>
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
  const focusMapUrl = routeMapUrl(focusDay || model.days[0] || { stops: [] }, model.places);

  return `<header class="hero">
    <p class="local-time"><span aria-hidden="true"></span>NAGOYA · 當地時間 ${escapeHtml(clock.time)}</p>
    <h1>旅遊｜名古屋</h1>
    <p class="trip-range">${escapeHtml(range)}</p>
    <div class="hero-status"><span>行程資料已同步</span><button id="locate-button" type="button"><span class="button-icon" aria-hidden="true">${icon('crosshair')}</span>使用目前位置</button></div>
  </header>
  <main id="itinerary">
    <div class="section-heading"><div><p>ITINERARY</p><h2>每日行程</h2></div></div>
    ${orderedDays.map((day) => renderDay(day, focusDate, model.days.indexOf(day), clock, model.places, options.location)).join('')}
  </main>
  <nav class="bottom-nav" aria-label="主要導覽">
    <a class="active" href="#itinerary"><span class="nav-icon" aria-hidden="true">${icon('home')}</span><span class="nav-label">行程</span></a>
    <a class="map-nav" href="${focusMapUrl}" target="_blank" rel="noreferrer"><span class="nav-icon" aria-hidden="true">${icon('map')}</span><span class="nav-label">地圖</span></a>
    <a class="add" href="https://github.com/kvnkuan/Nagoya-Trip2026/edit/main/nagoya-trip.md"><span class="nav-icon add-icon" aria-hidden="true">${icon('plus')}</span><span class="nav-label">加入</span></a>
    <a href="./nagoya-trip.md"><span class="nav-icon" aria-hidden="true">${icon('list')}</span><span class="nav-label">資料</span></a>
  </nav>`;
}
