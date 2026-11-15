// Application entrypoint. Feature modules declare their dependencies with import/export.
import './01-core-ui.js';
import './02-news.js';
import './03-weather.js';
import './04-focus-audio.js';
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


// Optional font enhancement is injected from script so the page has no inline event handlers.
// If offline or data-saving is enabled, system fallbacks keep the UI fully usable.
function loadOptionalFonts() {
  if (typeof document === 'undefined' || typeof navigator === 'undefined') return;
  if (navigator.onLine === false || navigator.connection?.saveData) return;
  const fonts = document.createElement('link');
  fonts.rel = 'preload';
  fonts.as = 'style';
  fonts.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&family=Pixelify+Sans:wght@400;500;600;700&family=Silkscreen:wght@400;700&display=swap';
  fonts.addEventListener('load', () => { fonts.rel = 'stylesheet'; }, { once: true });
  document.head.appendChild(fonts);
}
if ('requestIdleCallback' in window) window.requestIdleCallback(loadOptionalFonts, { timeout: 2500 });
else setTimeout(loadOptionalFonts, 800);
