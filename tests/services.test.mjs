import test from 'node:test';
import assert from 'node:assert/strict';
import {
  registerWeatherPreviewRenderer, refreshWeatherPreviewButtons,
  registerDataManagerStatsUpdater, refreshDataManagerStats,
  registerHabitatInitializer, requestHabitatInit
} from '../js/services.js';
import { sceneCache, invalidateBackgroundCache } from '../js/scene-state.js';

test('registered feature callbacks are invoked through the service boundary', () => {
  let weatherCalls = 0;
  let dataCalls = 0;
  let habitatIndex = null;
  refreshWeatherPreviewButtons();
  refreshDataManagerStats();
  requestHabitatInit(2);
  registerWeatherPreviewRenderer(() => weatherCalls++);
  registerDataManagerStatsUpdater(() => dataCalls++);
  registerHabitatInitializer((index) => { habitatIndex = index; });
  refreshWeatherPreviewButtons();
  refreshDataManagerStats();
  requestHabitatInit(4);
  assert.equal(weatherCalls, 1);
  assert.equal(dataCalls, 1);
  assert.equal(habitatIndex, 4);
});

test('scene cache invalidation resets the shared background reference', () => {
  sceneCache.bgCache = { fake: true };
  invalidateBackgroundCache();
  assert.equal(sceneCache.bgCache, null);
});
