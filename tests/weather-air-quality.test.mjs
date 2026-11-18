import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const weather = await readFile(new URL('../js/03-weather.js', import.meta.url), 'utf8');
const headers = await readFile(new URL('../_headers', import.meta.url), 'utf8');
const docs = await readFile(new URL('../docs/SECURITY.md', import.meta.url), 'utf8');

test('air quality uses the documented Open-Meteo current variables', () => {
  assert.match(weather, /air-quality-api\.open-meteo\.com\/v1\/air-quality/);
  assert.match(weather, /current: 'european_aqi,pm2_5,pm10'/);
  assert.match(weather, /Number\.isFinite\(current\.european_aqi\)/);
  assert.match(headers, /https:\/\/air-quality-api\.open-meteo\.com/);
});

test('weather HTML templates escape formatted times and normalize precipitation percentages', () => {
  assert.ok(weather.includes("const hhmm = (str) => esc(String(str ?? '').slice(11, 16));"));
  assert.ok(weather.includes("const clampPercent = (value) => Math.max(0, Math.min(100, Number(value) || 0));"));
  assert.ok(weather.includes("clampPercent(dy.precipitation_probability_max[0])"));
  assert.ok(weather.includes("clampPercent(hr.precipitation_probability[i])"));
  assert.ok(weather.includes("clampPercent(dy.precipitation_probability_max[index])"));
  assert.ok(weather.includes("Number(dy.uv_index_max[0])"));
});
test('air quality is optional and cannot block a successful weather forecast', () => {
  assert.match(weather, /void fetchAirQuality\(latitude, longitude, requestId\)/);
  assert.match(weather, /async function fetchAirQuality/);
  assert.match(weather, /catch \{\s*if \(requestId === weatherRequestSeq\)/);
  assert.match(weather, /wx-air-unavailable/);
});

test('air quality panel discloses model forecast instead of implying a local sensor reading', () => {
  assert.match(weather, /CAMS model tahmini/);
  assert.match(weather, /yaklaşık 11–45 km çözünürlük/);
  assert.match(docs, /not a measurement from a nearby physical sensor/);
});
