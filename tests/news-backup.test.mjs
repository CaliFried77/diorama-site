import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../js/06-data-manager.js', import.meta.url), 'utf8');

test('full backups preserve news source preferences, custom feeds and read/save state', () => {
  for (const key of [
    'diorama_news_source_preferences_v1',
    'diorama_news_custom_sources_v1',
    'diorama_news_read_ids_v1',
    'diorama_news_saved_ids_v1',
  ]) assert.ok(source.includes(key), `missing backup key: ${key}`);
  assert.match(source, /function makeBackup\(scope = 'all'\)/);
  assert.match(source, /DATA_PREF_KEYS\.forEach/);
  assert.match(source, /function validateBackupObject/);
  assert.match(source, /normalizeCustomSources/);
  assert.match(source, /normalizeNewsPreferences/);
});
