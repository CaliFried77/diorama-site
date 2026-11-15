import test from 'node:test';
import assert from 'node:assert/strict';
import {
  registerWeatherPreviewRenderer, refreshWeatherPreviewButtons,
  registerDataManagerStatsUpdater, refreshDataManagerStats
} from '../js/services.js';
import { sceneCache, invalidateBackgroundCache } from '../js/scene-state.js';

test('registered feature callbacks are invoked through the service boundary', () => {
  let weatherCalls = 0;
  let dataCalls = 0;
  refreshWeatherPreviewButtons();
  refreshDataManagerStats();
  registerWeatherPreviewRenderer(() => weatherCalls++);
  registerDataManagerStatsUpdater(() => dataCalls++);
  refreshWeatherPreviewButtons();
  refreshDataManagerStats();
  assert.equal(weatherCalls, 1);
  assert.equal(dataCalls, 1);
});

test('scene cache invalidation resets the shared background reference', () => {
  sceneCache.bgCache = { fake: true };
  invalidateBackgroundCache();
  assert.equal(sceneCache.bgCache, null);
});
