import test from 'node:test';
import assert from 'node:assert/strict';

class ClassList {
  values = new Set();
  add(...names) { names.forEach((name) => this.values.add(name)); }
  remove(...names) { names.forEach((name) => this.values.delete(name)); }
  contains(name) { return this.values.has(name); }
  toggle(name, force) { const shouldAdd = force === undefined ? !this.values.has(name) : Boolean(force); shouldAdd ? this.values.add(name) : this.values.delete(name); return shouldAdd; }
}

class FakeElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase(); this.children = []; this.dataset = {}; this.style = new Proxy({}, { get: (o, k) => o[k] ?? '', set: (o, k, v) => (o[k] = v, true) });
    this.classList = new ClassList(); this.attributes = {}; this.value = ''; this.textContent = ''; this.innerHTML = '';
    this.width = 1; this.height = 1; this.files = []; this.parentElement = null; this.isConnected = true;
  }
  addEventListener() {} removeEventListener() {} appendChild(child) { this.children.push(child); child.parentElement = this; return child; }
  append(...children) { children.forEach((child) => this.appendChild(child)); }
  replaceChildren(...children) { this.children = []; this.append(...children); }
  remove() {} click() {} focus() {} blur() {} reset() {} setAttribute(k,v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k] ?? null; } removeAttribute(k) { delete this.attributes[k]; }
  setCustomValidity() {} reportValidity() { return true; } contains() { return false; } closest() { return null; }
  querySelector() { return new FakeElement(); } querySelectorAll() { return []; }
  getBoundingClientRect() { return { left:0, top:0, right:100, bottom:40, width:100, height:40 }; }
  getClientRects() { return [{ width: 1, height: 1 }]; }
  getContext() { return context2d; }
  get className() { return [...this.classList.values].join(' '); }
  set className(value) { this.classList.values = new Set(String(value).split(/\s+/).filter(Boolean)); }
}

const context2d = new Proxy({
  imageSmoothingEnabled: false, globalAlpha: 1, globalCompositeOperation: 'source-over',
  measureText: () => ({ width: 10 }), createLinearGradient: () => ({ addColorStop() {} }),
  createRadialGradient: () => ({ addColorStop() {} }),
}, { get: (o,k) => k in o ? o[k] : (() => {}), set: (o,k,v) => (o[k]=v,true) });
const elements = new Map();
const getElement = (id) => { if (!elements.has(id)) elements.set(id, new FakeElement(id === 'habitatCanvas' ? 'canvas' : 'div')); return elements.get(id); };
const body = getElement('body');
const documentMock = {
  body, hidden: false,
  getElementById: getElement,
  querySelectorAll: () => [], querySelector: () => new FakeElement(),
  createElement: (tag) => new FakeElement(tag),
  createDocumentFragment: () => new FakeElement('fragment'),
  addEventListener() {}, removeEventListener() {},
  documentElement: new FakeElement('html'),
};
const storage = new Map();
const localStorageMock = {
  getItem: (k) => storage.has(k) ? storage.get(k) : null,
  setItem: (k,v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  key: (i) => [...storage.keys()][i] ?? null,
  get length() { return storage.size; },
};
const media = { matches: false, addEventListener() {}, addListener() {} };
const windowMock = {
  innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1,
  addEventListener() {}, removeEventListener() {}, matchMedia: () => media,
  location: { reload() {} }, confirm: () => true,
};
Object.assign(globalThis, {
  document: documentMock, window: windowMock, localStorage: localStorageMock,
  requestAnimationFrame: () => 1, cancelAnimationFrame() {},
  matchMedia: () => media, fetch: () => new Promise(() => {}),
  setInterval: () => 1, clearInterval() {}, setTimeout: () => 1, clearTimeout() {},
  URL: globalThis.URL, Blob: globalThis.Blob,
});

 test('native ES module entrypoint evaluates without a browser-global shared lexical runtime', async () => {
   await assert.doesNotReject(() => import('../js/main.js'));
   assert.equal(typeof globalThis.initHabitat, 'undefined');
   assert.equal(typeof globalThis.lsGet, 'undefined');
   assert.ok(getElement('heroClock'));
   assert.ok(getElement('habitatCanvas').width > 0);
 });
