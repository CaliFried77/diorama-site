import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const main = await readFile(new URL('../js/main.js', import.meta.url), 'utf8');
const ui = await readFile(new URL('../js/01-core-ui.js', import.meta.url), 'utf8');
const calendar = await readFile(new URL('../js/11-calendar.js', import.meta.url), 'utf8');
const backup = await readFile(new URL('../js/06-data-manager.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../css/widgets.css', import.meta.url), 'utf8');

test('calendar is registered as a shared accessible app popover', () => {
  assert.match(html, /id="calendarBtn"/);
  assert.match(html, /id="calendarPopover"/);
  assert.match(html, /id="calendarGrid"[^>]*role="grid"/);
  assert.match(html, /id="calendarEventForm"/);
  assert.match(main, /import '\.\/11-calendar\.js'/);
  assert.match(ui, /btn: document\.getElementById\('calendarBtn'\), panel: document\.getElementById\('calendarPopover'\)/);
});

test('calendar events are validated, bounded and stored locally', () => {
  assert.match(calendar, /STORAGE_KEY = 'diorama_calendar_events_v1'/);
  assert.match(calendar, /MAX_EVENTS = 500/);
  assert.match(calendar, /function isValidDateKey/);
  assert.match(calendar, /function normalizeEvents/);
  assert.match(calendar, /lsSet\(STORAGE_KEY, events\)/);
  assert.match(calendar, /events\.push\(/);
  assert.match(calendar, /events = events\.filter\(\(item\) => item\.id !== event\.id\)/);
  assert.doesNotMatch(calendar, /fetch\s*\(|https?:\/\//);
});

test('calendar events travel with full backups and are validated on restore', () => {
  assert.match(backup, /'diorama_calendar_events_v1'/);
  assert.match(backup, /prefs\.diorama_calendar_events_v1 = JSON\.stringify\(cleanEvents\)/);
  assert.match(backup, /Takvim etkinlik listesi geçersiz/);
  assert.match(backup, /dateKey !== item\.date/);
  assert.match(backup, /Takvim etkinlikleri okunamadı/);
});

test('calendar panel has responsive month, day and event layouts', () => {
  assert.match(css, /\.calendar-popover/);
  assert.match(css, /\.calendar-grid/);
  assert.match(css, /\.calendar-day\.is-selected/);
  assert.match(css, /\.calendar-event-form/);
  assert.match(css, /@media \(max-width: 639px\)/);
});
