import { lsGet, lsSet } from './storage.js';

/* CALENDAR — local monthly planner with validated, portable events. */
const STORAGE_KEY = 'diorama_calendar_events_v1';
const MAX_EVENTS = 500;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const today = new Date();
let visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
let selectedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
let events = normalizeEvents(lsGet(STORAGE_KEY, []));

const monthLabel = document.getElementById('calendarMonthLabel');
const grid = document.getElementById('calendarGrid');
const selectedDateLabel = document.getElementById('calendarSelectedDate');
const eventCountLabel = document.getElementById('calendarEventCount');
const eventList = document.getElementById('calendarEventList');
const eventForm = document.getElementById('calendarEventForm');
const eventTitleInput = document.getElementById('calendarEventTitle');
const eventTimeInput = document.getElementById('calendarEventTime');

// ============================================================================
// BÖLÜM BAŞI: TAKVİM VERİSİ, TARİH DOĞRULAMA VE YEREL KAYIT
// ============================================================================

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isValidDateKey(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) && dateKey(date) === value;
}

function normalizeEvents(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.slice(-MAX_EVENTS).flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const title = typeof item.title === 'string' ? item.title.trim().slice(0, 100) : '';
    const date = item.date;
    const time = typeof item.time === 'string' && TIME_PATTERN.test(item.time) ? item.time : '';
    const id = typeof item.id === 'string' && /^[a-z0-9-]{6,80}$/i.test(item.id)
      ? item.id : '';
    if (!title || !isValidDateKey(date) || !id || seen.has(id)) return [];
    seen.add(id);
    return [{ id, title, date, time }];
  });
}

function persistEvents() {
  events = normalizeEvents(events);
  lsSet(STORAGE_KEY, events);
}

function formatDate(date, options = {}) {
  return new Intl.DateTimeFormat('tr-TR', options).format(date);
}

function eventsFor(date) {
  return events.filter((event) => event.date === dateKey(date))
    .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99') || a.title.localeCompare(b.title, 'tr'));
}

// ============================================================================
// BÖLÜM SONU: TAKVİM VERİSİ VE KAYIT
// BÖLÜM BAŞI: AY GÖRÜNÜMÜ VE SEÇİLİ GÜNÜN ETKİNLİKLERİ
// ============================================================================

function renderCalendar() {
  monthLabel.textContent = formatDate(visibleMonth, { month: 'long', year: 'numeric' });
  grid.replaceChildren();

  const firstOfMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth(), 1 - mondayOffset);
  const todayKey = dateKey(new Date());
  const selectedKey = dateKey(selectedDate);

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
    const key = dateKey(date);
    const inMonth = date.getMonth() === visibleMonth.getMonth();
    const dayEvents = eventsFor(date);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'calendar-day';
    button.classList.toggle('is-outside', !inMonth);
    button.classList.toggle('is-today', key === todayKey);
    button.classList.toggle('is-selected', key === selectedKey);
    button.setAttribute('role', 'gridcell');
    button.setAttribute('aria-pressed', key === selectedKey ? 'true' : 'false');
    button.setAttribute('aria-label', `${formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}, ${dayEvents.length} etkinlik`);

    const number = document.createElement('span');
    number.className = 'calendar-day-number';
    number.textContent = String(date.getDate());
    button.appendChild(number);

    if (dayEvents.length) {
      const dots = document.createElement('span');
      dots.className = 'calendar-day-dots';
      dots.setAttribute('aria-hidden', 'true');
      for (let dot = 0; dot < Math.min(3, dayEvents.length); dot += 1) {
        const marker = document.createElement('i');
        dots.appendChild(marker);
      }
      button.appendChild(dots);
    }

    button.addEventListener('click', () => {
      selectedDate = date;
      renderCalendar();
      renderSelectedDay();
    });
    grid.appendChild(button);
  }
}

function renderSelectedDay() {
  const key = dateKey(selectedDate);
  const dayEvents = eventsFor(selectedDate);
  selectedDateLabel.textContent = formatDate(selectedDate, {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  eventCountLabel.textContent = `${dayEvents.length} etkinlik`;
  eventList.replaceChildren();

  if (!dayEvents.length) {
    const empty = document.createElement('p');
    empty.className = 'calendar-empty';
    empty.textContent = 'Bu gün için henüz bir plan yok.';
    eventList.appendChild(empty);
    return;
  }

  dayEvents.forEach((event) => {
    const row = document.createElement('article');
    row.className = 'calendar-event-row';

    const time = document.createElement('span');
    time.className = 'calendar-event-time';
    time.textContent = event.time || 'Gün boyu';

    const title = document.createElement('span');
    title.className = 'calendar-event-name';
    title.textContent = event.title;

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'calendar-event-remove';
    remove.textContent = '×';
    remove.title = 'Etkinliği sil';
    remove.setAttribute('aria-label', `Etkinliği sil: ${event.title}`);
    remove.addEventListener('click', () => {
      events = events.filter((item) => item.id !== event.id);
      persistEvents();
      renderCalendar();
      renderSelectedDay();
    });

    row.append(time, title, remove);
    eventList.appendChild(row);
  });
}

// ============================================================================
// BÖLÜM SONU: TAKVİM GÖRÜNÜMÜ
// BÖLÜM BAŞI: AY GEZİNTİSİ VE ETKİNLİK FORMU
// ============================================================================

function shiftMonth(amount) {
  const desiredDay = selectedDate.getDate();
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + amount, 1);
  const lastDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  selectedDate = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), Math.min(desiredDay, lastDay));
  renderCalendar();
  renderSelectedDay();
}

document.getElementById('calendarPrevBtn').addEventListener('click', () => shiftMonth(-1));
document.getElementById('calendarNextBtn').addEventListener('click', () => shiftMonth(1));
document.getElementById('calendarTodayBtn').addEventListener('click', () => {
  const now = new Date();
  selectedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  visibleMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  renderCalendar();
  renderSelectedDay();
});

eventForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const title = eventTitleInput.value.trim().slice(0, 100);
  const time = eventTimeInput.value;
  if (!title || (time && !TIME_PATTERN.test(time)) || events.length >= MAX_EVENTS) return;

  events.push({
    id: `cal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    date: dateKey(selectedDate),
    time,
  });
  persistEvents();
  eventTitleInput.value = '';
  eventTimeInput.value = '';
  renderCalendar();
  renderSelectedDay();
});

renderCalendar();
renderSelectedDay();

// ============================================================================
// BÖLÜM SONU: AY GEZİNTİSİ VE ETKİNLİK FORMU
// ============================================================================
