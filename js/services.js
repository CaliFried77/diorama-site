// Small inversion-of-control layer keeps feature modules acyclic.
let weatherPreviewRenderer = null;
let dataManagerStatsUpdater = null;

export function registerWeatherPreviewRenderer(callback) { weatherPreviewRenderer = callback; }
export function refreshWeatherPreviewButtons() { weatherPreviewRenderer?.(); }
export function registerDataManagerStatsUpdater(callback) { dataManagerStatsUpdater = callback; }
export function refreshDataManagerStats() { dataManagerStatsUpdater?.(); }
