// Application entrypoint. Feature modules declare their dependencies with import/export.
import './01-core-ui.js';
import './02-news.js';
import './03-weather.js';
import './04-focus-audio.js';
import './11-calendar.js';
import './05-workspace.js';
import './06-data-manager.js';
import './07-habitat-state.js';
import './08-creatures.js';
import './09-scenery.js';
import './10-glass-renderer.js';
import './performance-monitor.js';


// Register the offline app shell. Failure is non-fatal: the online app keeps working.
const serviceWorkerHost = typeof window !== 'undefined' ? window.location?.hostname : '';
const serviceWorkerProtocol = typeof window !== 'undefined' ? window.location?.protocol : '';
const serviceWorkerSecureOrigin = serviceWorkerProtocol === 'https:'
  || ['localhost', '127.0.0.1', '[::1]'].includes(serviceWorkerHost);
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && serviceWorkerSecureOrigin) {
  const serviceWorkerUrl = new URL('../sw.js', import.meta.url);
  navigator.serviceWorker.register(serviceWorkerUrl, { scope: new URL('../', import.meta.url).pathname })
    .catch(() => { /* Offline caching is an enhancement, not a startup requirement. */ });
}
