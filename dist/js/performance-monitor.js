const params = new URLSearchParams(globalThis.location?.search || '');
const enabled = params.get('debug') === 'perf';
let hud = null;
let sampleStart = 0;
let frameCount = 0;
let renderTotal = 0;
let glassTotal = 0;
let slowFrames = 0;

function ensureHud() {
  if (!enabled || hud || typeof document === 'undefined') return;
  hud = document.createElement('output');
  hud.id = 'dioramaPerfHud';
  hud.setAttribute('aria-live', 'off');
  hud.style.cssText = 'position:fixed;z-index:9999;left:8px;bottom:8px;padding:7px 9px;border:1px solid rgba(255,255,255,.2);border-radius:9px;background:rgba(0,0,0,.72);color:#fff;font:11px/1.45 ui-monospace,monospace;pointer-events:none;white-space:pre;backdrop-filter:blur(8px)';
  document.body.appendChild(hud);
}

export function recordRenderFrame(now, renderMs, glassMs = 0) {
  if (!enabled) return;
  ensureHud();
  frameCount++;
  renderTotal += Math.max(0, renderMs);
  glassTotal += Math.max(0, glassMs);
  if (renderMs > 20) slowFrames++;
  if (!sampleStart) sampleStart = now;
  if (now - sampleStart < 1000) return;
  const seconds = (now - sampleStart) / 1000;
  const fps = frameCount / seconds;
  const averageRender = renderTotal / frameCount;
  const averageGlass = glassTotal / frameCount;
  const memory = performance.memory?.usedJSHeapSize;
  const memoryText = Number.isFinite(memory) ? `\nHeap ${(memory / 1048576).toFixed(1)} MB` : '';
  hud.textContent = `Diorama PERF\nFPS ${fps.toFixed(1)}\nRender ${averageRender.toFixed(1)} ms\nGlass avg ${averageGlass.toFixed(1)} ms\nSlow frames ${slowFrames}${memoryText}`;
  sampleStart = now;
  frameCount = 0;
  renderTotal = 0;
  glassTotal = 0;
  slowFrames = 0;
}
