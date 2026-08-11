function parseBullet(line) {
  const match = line.match(/^\s*-\s+([^：:]+)[：:]\s*(.*)$/);
  return match ? [match[1].trim(), match[2].trim()] : null;
}

function parseCoordinates(value = '') {
  const match = value.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  return { latitude: Number(match[1]), longitude: Number(match[2]) };
}

function parseMarkerAttributes(value = '') {
  const attributes = {};
  for (const match of value.matchAll(/([A-Za-z][\w-]*)="([^"]*)"/g)) {
    attributes[match[1]] = match[2];
  }
  return attributes;
}

function parseChangeMarkers(markdown = '') {
  const found = [];
  const markerPattern = /<!--\s*NAGOYA-CHANGE-(START|END|REMOVED)\b([\s\S]*?)-->/g;

  for (const match of markdown.matchAll(markerPattern)) {
    const type = match[1];
    if (type === 'END') continue;
    const attributes = parseMarkerAttributes(match[2]);
    if (!attributes.id || !attributes.target) continue;
    const kind = type === 'REMOVED' ? 'removed' : attributes.kind;
    if (!['added', 'updated', 'removed'].includes(kind)) continue;
    found.push({
      id: attributes.id,
      kind,
      target: attributes.target,
      part: attributes.part ?? '',
      ...(attributes.note ? { note: attributes.note } : {}),
    });
  }

  const id = found.at(-1)?.id ?? '';
  return { id, entries: id ? found.filter((entry) => entry.id === id) : [] };
}

export function parseTripMarkdown(markdown = '') {
  const changes = parseChangeMarkers(markdown);
  const source = markdown.replace(/<!--[\s\S]*?-->/g, '');
  const settings = {};
  const days = [];
  const placeList = [];
  let section = '';
  let currentDay = null;
  let currentStop = null;
  let currentPlace = null;

  for (const line of source.split(/\r?\n/)) {
    const levelTwo = line.match(/^##\s+(.+)$/);
    if (levelTwo) {
      section = levelTwo[1].trim();
      currentDay = null;
      currentStop = null;
      currentPlace = null;
      continue;
    }

    if (section === '旅程設定') {
      const bullet = parseBullet(line);
      if (bullet) settings[bullet[0]] = bullet[1];
      continue;
    }

    if (section === '每日行程') {
      const dayHeading = line.match(/^###\s+(\d{4}-\d{2}-\d{2})(.*)$/);
      if (dayHeading) {
        currentDay = { date: dayHeading[1], label: dayHeading[2].trim(), stops: [] };
        days.push(currentDay);
        currentStop = null;
        continue;
      }

      const stopHeading = line.match(/^####\s+([^｜|]+)[｜|](.+)$/);
      if (stopHeading && currentDay) {
        currentStop = {
          time: stopHeading[1].trim(),
          name: stopHeading[2].trim(),
          fields: {},
          id: '',
          category: '其他',
          status: '待確認',
          locked: false,
        };
        currentDay.stops.push(currentStop);
        continue;
      }

      const bullet = currentStop ? parseBullet(line) : null;
      if (bullet) {
        currentStop.fields[bullet[0]] = bullet[1];
        if (bullet[0] === '景點 ID') currentStop.id = bullet[1];
        if (bullet[0] === '類別') currentStop.category = bullet[1];
        if (bullet[0] === '狀態') currentStop.status = bullet[1];
        if (bullet[0] === '時間是否鎖定') currentStop.locked = bullet[1].startsWith('是');
      }
      continue;
    }

    if (section === '景點與店舖資料庫') {
      const placeHeading = line.match(/^###\s+(.+)$/);
      if (placeHeading) {
        currentPlace = { heading: placeHeading[1].trim(), fields: {}, coordinates: null };
        placeList.push(currentPlace);
        continue;
      }

      const bullet = currentPlace ? parseBullet(line) : null;
      if (bullet) {
        currentPlace.fields[bullet[0]] = bullet[1];
        if (bullet[0] === '經緯度') currentPlace.coordinates = parseCoordinates(bullet[1]);
      }
    }
  }

  const places = {};
  for (const place of placeList) {
    const id = place.fields.ID;
    if (id && id !== 'example-place') places[id] = place;
  }

  const changesByTarget = new Map(changes.entries.map((entry) => [entry.target, entry]));
  for (const day of days) {
    for (const stop of day.stops) {
      const change = changesByTarget.get(stop.id);
      if (change) stop.change = change;
    }
  }
  for (const [id, place] of Object.entries(places)) {
    const change = changesByTarget.get(id);
    if (change) place.change = change;
  }

  return { settings, days, places, changes };
}

function dateInTimeZone(now, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function chooseFocusDay(days, now = new Date(), timeZone = 'Asia/Tokyo') {
  if (!days.length) return null;
  const today = dateInTimeZone(now, timeZone);
  return days.find((day) => day.date === today)
    ?? days.find((day) => day.date > today)
    ?? days[days.length - 1];
}

function clockMinutes(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function assessOpeningStatus(hours = '', nowMinutes, closingSoonMinutes = 60) {
  const ranges = [...hours.matchAll(/(\d{1,2}:\d{2})\s*[–—-]\s*(\d{1,2}:\d{2})/g)];
  if (!ranges.length || !Number.isFinite(nowMinutes)) {
    return { state: 'unknown', label: '營業時間待確認' };
  }

  for (const range of ranges) {
    const start = clockMinutes(range[1]);
    let end = clockMinutes(range[2]);
    let current = nowMinutes;
    if (end <= start) {
      end += 24 * 60;
      if (current < start) current += 24 * 60;
    }
    if (current >= start && current < end) {
      const remaining = end - current;
      return remaining <= closingSoonMinutes
        ? { state: 'closing-soon', label: `${remaining} 分鐘後關閉` }
        : { state: 'open', label: '營業中' };
    }
  }

  return { state: 'closed', label: '目前已打烊' };
}

export function distanceInMeters(from, to) {
  const radius = 6_371_000;
  const radians = (degrees) => degrees * Math.PI / 180;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const fromLatitude = radians(from.latitude);
  const toLatitude = radians(to.latitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatMetricDistance(meters) {
  if (meters < 1000) return `約 ${Math.round(meters / 10) * 10} 公尺`;
  return `約 ${(Math.round(meters / 100) / 10).toFixed(1)} 公里`;
}
