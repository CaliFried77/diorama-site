/** Pure helpers for a refresh-safe focus timer. All timestamps are Unix milliseconds. */
export const FOCUS_MIN_MINUTES = 1;
export const FOCUS_MAX_MINUTES = 180;
export const DEFAULT_FOCUS_MINUTES = 25;

const clampInteger = (value, min, max, fallback) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
};

export function remainingFocusSeconds(session, now = Date.now()) {
  if (!session || typeof session !== 'object') return 0;
  if (session.status === 'running' && Number.isFinite(session.endsAt)) {
    return Math.max(0, Math.ceil((session.endsAt - now) / 1000));
  }
  return clampInteger(session.remainingSec, 0, FOCUS_MAX_MINUTES * 60, 0);
}

export function normalizeFocusSession(value, now = Date.now()) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const totalSec = clampInteger(source.totalSec, FOCUS_MIN_MINUTES * 60, FOCUS_MAX_MINUTES * 60, DEFAULT_FOCUS_MINUTES * 60);
  let status = ['idle', 'running', 'paused', 'completed'].includes(source.status) ? source.status : 'idle';
  const endsAt = Number.isFinite(source.endsAt) ? source.endsAt : null;
  let remainingSec = clampInteger(source.remainingSec, 0, totalSec, totalSec);
  const habitat = typeof source.habitat === 'string' ? source.habitat.trim().slice(0, 100) : '';
  const task = typeof source.task === 'string' ? source.task.trim().slice(0, 180) : '';

  if (status === 'running' && endsAt !== null) {
    remainingSec = remainingFocusSeconds({ status, endsAt, remainingSec }, now);
    if (remainingSec <= 0) status = 'completed';
  } else if (status === 'running') {
    status = 'paused';
  }
  if (status === 'completed') remainingSec = 0;
  if (status === 'idle') remainingSec = totalSec;

  return {
    totalSec,
    remainingSec,
    status,
    endsAt: status === 'running' ? endsAt : null,
    habitat,
    task,
  };
}

export function startFocusSession(totalSec, { habitat = '', task = '' } = {}, now = Date.now()) {
  const safeTotal = clampInteger(totalSec, FOCUS_MIN_MINUTES * 60, FOCUS_MAX_MINUTES * 60, DEFAULT_FOCUS_MINUTES * 60);
  return {
    totalSec: safeTotal,
    remainingSec: safeTotal,
    status: 'running',
    endsAt: now + safeTotal * 1000,
    habitat: String(habitat).trim().slice(0, 100),
    task: String(task).trim().slice(0, 180),
  };
}

export function pauseFocusSession(session, now = Date.now()) {
  const safe = normalizeFocusSession(session, now);
  const remainingSec = remainingFocusSeconds(safe, now);
  return { ...safe, remainingSec, status: remainingSec > 0 ? 'paused' : 'completed', endsAt: null };
}

export function resumeFocusSession(session, now = Date.now()) {
  const safe = normalizeFocusSession(session, now);
  const remainingSec = safe.remainingSec > 0 ? safe.remainingSec : safe.totalSec;
  return { ...safe, remainingSec, status: 'running', endsAt: now + remainingSec * 1000 };
}

export function resetFocusSession(session) {
  const safe = normalizeFocusSession(session);
  return { ...safe, remainingSec: safe.totalSec, status: 'idle', endsAt: null };
}
