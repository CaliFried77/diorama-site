import { readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceFiles = [resolve(root, 'index.html'), ...((await readdir(resolve(root, 'js'))).filter((f) => f.endsWith('.js')).map((f) => resolve(root, 'js', f)))];
const text = (await Promise.all(sourceFiles.map((p) => readFile(p, 'utf8')))).join('\n');

// Tailwind-compatible, project-scoped utility compiler. It emits only utilities
// actually present in the app's HTML and JavaScript templates; no CDN/runtime needed.
const classBodies = [];
for (const match of text.matchAll(/\bclass(?:Name)?\s*=\s*([`"'])([\s\S]*?)\1/g)) classBodies.push(match[2]);
for (const match of text.matchAll(/classList\.(?:add|remove|toggle)\(([^)]*)\)/g)) classBodies.push(match[1].replace(/[,'"`]/g, ' '));
const candidates = new Set();
for (const body of classBodies) {
  const cleaned = body.replace(/\$\{[^}]*\}/g, ' ');
  for (const token of cleaned.split(/\s+/)) if (token) candidates.add(token);
}

const spacing = {
  '0': '0', '0.2': '.05rem', '0.5': '.125rem', '1': '.25rem', '1.5': '.375rem', '2': '.5rem',
  '2.5': '.625rem', '3': '.75rem', '3.5': '.875rem', '4': '1rem', '5': '1.25rem',
  '6': '1.5rem', '7': '1.75rem', '8': '2rem', '9': '2.25rem', '10': '2.5rem',
  '11': '2.75rem', '12': '3rem', '14': '3.5rem', '16': '4rem', '20': '5rem',
  '24': '6rem', '28': '7rem', '32': '8rem', '36': '9rem', '40': '10rem',
  '48': '12rem', '56': '14rem', '60': '15rem', '64': '16rem', '72': '18rem', '80': '20rem',
};
const colors = {
  transparent: 'transparent', current: 'currentColor', white: '#fff', black: '#000',
  'amber-200': '#fde68a', 'amber-300': '#fcd34d', 'amber-400': '#fbbf24',
  'emerald-200': '#a7f3d0', 'emerald-300': '#6ee7b7', 'emerald-400': '#34d399',
  'rose-100': '#ffe4e6', 'rose-200': '#fecdd3', 'rose-300': '#fda4af', 'rose-400': '#fb7185', 'rose-500': '#f43f5e',
  'sky-200': '#bae6fd', 'sky-300': '#7dd3fc', 'sky-400': '#38bdf8', 'slate-900': '#0f172a', 'slate-950': '#020617',
};
const fontSizes = {
  xs: ['.75rem', '1rem'], sm: ['.875rem', '1.25rem'], base: ['1rem', '1.5rem'],
  lg: ['1.125rem', '1.75rem'], xl: ['1.25rem', '1.75rem'],
  '2xl': ['1.5rem', '2rem'], '3xl': ['1.875rem', '2.25rem'],
  '4xl': ['2.25rem', '2.5rem'], '5xl': ['3rem', '1'], '6xl': ['3.75rem', '1'],
  '7xl': ['4.5rem', '1'],
};
const radii = { none: '0', sm: '.125rem', DEFAULT: '.25rem', md: '.375rem', lg: '.5rem', xl: '.75rem', '2xl': '1rem', '3xl': '1.5rem', full: '9999px' };
const blur = { none: '0', sm: '4px', DEFAULT: '8px', md: '12px', lg: '16px', xl: '24px', '2xl': '40px', '3xl': '64px' };
const cssEscape = (value) => value.replace(/([^a-zA-Z0-9_-])/g, '\\$1');
const arbitrary = (value) => value.startsWith('[') && value.endsWith(']') ? value.slice(1, -1).replaceAll('_', ' ') : null;
const readableFontSize = (value) => {
  const match = /^(\d+(?:\.\d+)?)px$/.exec(value.trim());
  if (!match) return value;
  return `${Math.max(13, Math.round(Number(match[1]) * 1.125))}px`;
};
const colorValue = (token) => {
  const slash = token.indexOf('/');
  const name = slash >= 0 ? token.slice(0, slash) : token;
  const base = colors[name];
  if (!base) return null;
  if (slash < 0) return base;
  const alphaToken = token.slice(slash + 1);
  const alpha = alphaToken.startsWith('[') ? Number(alphaToken.slice(1, -1)) : Number(alphaToken) / 100;
  if (!Number.isFinite(alpha)) return base;
  if (base.startsWith('#')) {
    const hex = base.slice(1);
    const full = hex.length === 3 ? hex.split('').map((v) => v + v).join('') : hex;
    const n = parseInt(full, 16);
    return `rgb(${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255} / ${alpha})`;
  }
  return base;
};
const spaced = (v) => spacing[v] ?? (arbitrary(v) ?? null);

function declaration(token) {
  if (token === 'sr-only') return 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border-width:0';
  if (token === 'absolute' || token === 'relative' || token === 'fixed' || token === 'sticky' || token === 'static') return `position:${token}`;
  if (token === 'block' || token === 'inline' || token === 'inline-block' || token === 'flex' || token === 'inline-flex' || token === 'grid' || token === 'hidden') return `display:${token === 'hidden' ? 'none' : token}`;
  if (token === 'flex-1') return 'flex:1 1 0%';
  if (token === 'flex-auto') return 'flex:1 1 auto';
  if (token === 'flex-none') return 'flex:none';
  if (token === 'flex-col') return 'flex-direction:column';
  if (token === 'flex-row') return 'flex-direction:row';
  if (token === 'flex-wrap') return 'flex-wrap:wrap';
  if (token === 'flex-nowrap') return 'flex-wrap:nowrap';
  if (token === 'grid') return 'display:grid';
  if (token.startsWith('grid-cols-')) { const n = Number(token.slice(10)); if (n) return `grid-template-columns:repeat(${n},minmax(0,1fr))`; }
  if (token.startsWith('items-')) { const v = token.slice(6); const map = { start: 'flex-start', end: 'flex-end', center: 'center', baseline: 'baseline', stretch: 'stretch' }; if (map[v]) return `align-items:${map[v]}`; }
  if (token.startsWith('justify-')) { const v = token.slice(8); const map = { start: 'flex-start', end: 'flex-end', center: 'center', between: 'space-between', around: 'space-around', evenly: 'space-evenly' }; if (map[v]) return `justify-content:${map[v]}`; }
  if (token === 'shrink-0') return 'flex-shrink:0';
  if (token === 'grow') return 'flex-grow:1';
  if (token === 'min-w-0') return 'min-width:0';
  if (token === 'min-h-0') return 'min-height:0';
  if (token === 'w-full') return 'width:100%';
  if (token === 'w-screen') return 'width:100vw';
  if (token === 'h-full') return 'height:100%';
  if (token === 'h-screen') return 'height:100vh';
  if (token === 'w-auto') return 'width:auto';
  if (token === 'h-auto') return 'height:auto';
  let m;
  if ((m = token.match(/^(w|h|min-w|min-h|max-w|max-h)-(.+)$/))) {
    const key = m[1], raw = m[2];
    const val = ({
      'w': { '1/2': '50%', '1/3': '33.333333%', '2/3': '66.666667%', '1/4': '25%', '3/4': '75%', 'full': '100%', 'screen': '100vw' },
      'h': { 'full': '100%', 'screen': '100vh' },
      'max-w': { xs: '20rem', sm: '24rem', md: '28rem', lg: '32rem', xl: '36rem', '2xl': '42rem', '3xl': '48rem', none: 'none', full: '100%' },
    }[key]?.[raw]) ?? spaced(raw) ?? arbitrary(raw);
    if (val) return `${({w:'width',h:'height','min-w':'min-width','min-h':'min-height','max-w':'max-width','max-h':'max-height'})[key]}:${val}`;
  }
  if ((m = token.match(/^(-?)(inset|inset-x|inset-y|top|right|bottom|left)-(.+)$/))) {
    const sign = m[1] ? '-' : '';
    const val = m[3] === '0' ? '0' : spaced(m[3]) ?? arbitrary(m[3]);
    if (val) {
      const prop = { inset: 'inset', 'inset-x': 'inset-inline', 'inset-y': 'inset-block', top: 'top', right: 'right', bottom: 'bottom', left: 'left' }[m[2]];
      return `${prop}:${sign}${val}`;
    }
  }
  if ((m = token.match(/^z-(-?\d+)$/))) return `z-index:${m[1]}`;
  if ((m = token.match(/^(gap-x|gap-y)-(.+)$/))) {
    const val = spaced(m[2]);
    if (val) return `${m[1] === 'gap-x' ? 'column-gap' : 'row-gap'}:${val}`;
  }
  if ((m = token.match(/^(-?)(m|mx|my|mt|mr|mb|ml|p|px|py|pt|pr|pb|pl|gap)-(.+)$/))) {
    const sign = m[1] ? '-' : ''; const key = m[2]; const val = (m[3] === 'auto' ? 'auto' : spaced(m[3])); if (!val) return null;
    const props = { m:['margin'], mx:['margin-left','margin-right'], my:['margin-top','margin-bottom'], mt:['margin-top'], mr:['margin-right'], mb:['margin-bottom'], ml:['margin-left'], p:['padding'], px:['padding-left','padding-right'], py:['padding-top','padding-bottom'], pt:['padding-top'], pr:['padding-right'], pb:['padding-bottom'], pl:['padding-left'], gap:['gap'] }[key];
    return props.map((p) => `${p}:${sign}${val}`).join(';');
  }
  if ((m = token.match(/^space-y-(.+)$/))) { const val = spaced(m[1]); if (val) return ''; }
  if ((m = token.match(/^rounded(?:-(.+))?$/))) return `border-radius:${radii[m[1] ?? 'DEFAULT'] ?? arbitrary(m[1] ?? '') ?? null}`;
  if (token === 'border') return 'border-width:1px';
  if ((m = token.match(/^border-(\d+)$/))) return `border-width:${m[1]}px`;
  if ((m = token.match(/^border-(t|b|l|r)$/))) return `border-${({t:'top',b:'bottom',l:'left',r:'right'}[m[1]])}-width:1px`;
  if (token === 'border-dashed') return 'border-style:dashed';
  if (token === 'border-solid') return 'border-style:solid';
  if ((m = token.match(/^border-(.+)$/))) { const c = colorValue(m[1]); if (c) return `border-color:${c}`; }
  if ((m = token.match(/^bg-(.+)$/))) {
    if (m[1] === 'gradient-to-r') return 'background-image:linear-gradient(to right,var(--tw-gradient-stops))';
    const c = colorValue(m[1]); if (c) return `background-color:${c}`;
  }
  if ((m = token.match(/^(from|via|to)-(.+)$/))) { const c = colorValue(m[2]); if (c) return `--tw-${m[1]}:${c};--tw-gradient-stops:var(--tw-gradient-from),var(--tw-gradient-to,${c})`; }
  if ((m = token.match(/^text-(.+)$/))) {
    const size = fontSizes[m[1]];
    if (size) return `font-size:${size[0]};line-height:${size[1]}`;
    const raw = arbitrary(m[1]); if (raw) return `font-size:${readableFontSize(raw)}`;
    const c = colorValue(m[1]); if (c) return `color:${c}`;
    const align = { center:'center',left:'left',right:'right',justify:'justify' }[m[1]]; if (align) return `text-align:${align}`;
  }
  if ((m = token.match(/^font-(.+)$/))) { const weight = { thin:100,extralight:200,light:300,normal:400,medium:500,semibold:600,bold:700,extrabold:800,black:900 }[m[1]]; if (weight) return `font-weight:${weight}`; if (m[1] === 'mono') return 'font-family:var(--font-mono)'; if (m[1] === 'pixel') return 'font-family:var(--font-pixel)'; if (m[1] === 'pixelnum') return 'font-family:var(--font-pixelnum)'; }
  if ((m = token.match(/^leading-(.+)$/))) { const v = { none:'1',tight:'1.25',snug:'1.375',normal:'1.5',relaxed:'1.625',loose:'2' }[m[1]] ?? arbitrary(m[1]); if (v) return `line-height:${v}`; }
  if ((m = token.match(/^tracking-(.+)$/))) { const v = { tighter:'-.05em',tight:'-.025em',normal:'0em',wide:'.025em',wider:'.05em',widest:'.1em' }[m[1]]; if (v) return `letter-spacing:${v}`; }
  if ((m = token.match(/^opacity-(\d+)$/))) return `opacity:${Number(m[1])/100}`;
  if ((m = token.match(/^overflow-(hidden|visible|auto|scroll|clip)$/))) return `overflow:${m[1]}`;
  if ((m = token.match(/^overflow-([xy])-(hidden|visible|auto|scroll|clip)$/))) return `overflow-${m[1]}:${m[2]}`;
  if (token === 'pointer-events-none' || token === 'pointer-events-auto') return `pointer-events:${token.endsWith('none') ? 'none' : 'auto'}`;
  if (token === 'cursor-crosshair' || token === 'cursor-text' || token === 'cursor-pointer' || token === 'cursor-default') return `cursor:${token.slice(7)}`;
  if (token === 'group') return 'position:relative';
  if (token === 'select-none' || token === 'select-text' || token === 'select-all') return `user-select:${token.slice(7)}`;
  if (token === 'resize-none') return 'resize:none';
  if (token === 'truncate') return 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
  if (token === 'break-words') return 'overflow-wrap:break-word';
  if (token === 'uppercase') return 'text-transform:uppercase';
  if (token === 'lowercase') return 'text-transform:lowercase';
  if (token === 'capitalize') return 'text-transform:capitalize';
  if (token === 'underline') return 'text-decoration-line:underline';
  if ((m = token.match(/^underline-offset-(.+)$/))) { const v = spaced(m[1]) ?? `${m[1]}px`; return `text-underline-offset:${v}`; }
  if (token === 'tabular-nums') return 'font-variant-numeric:tabular-nums';
  if (token === 'outline-none') return 'outline:2px solid transparent;outline-offset:2px';
  if (token === 'transition') return 'transition-property:color,background-color,border-color,text-decoration-color,fill,stroke,opacity,box-shadow,transform,filter,backdrop-filter;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:150ms';
  if (token === 'transition-all') return 'transition-property:all;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:150ms';
  if (token === 'transition-colors') return 'transition-property:color,background-color,border-color,text-decoration-color,fill,stroke;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:150ms';
  if (token === 'transition-transform') return 'transition-property:transform;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:150ms';
  if ((m = token.match(/^duration-(\d+)$/))) return `transition-duration:${m[1]}ms`;
  if ((m = token.match(/^-translate-y-(.+)$/))) { const v = spaced(m[1]); if (v) return `transform:translateY(-${v})`; }
  if ((m = token.match(/^translate-y-(.+)$/))) { const v = spaced(m[1]); if (v) return `transform:translateY(${v})`; }
  if ((m = token.match(/^-?rotate-(\d+)$/))) return `--tw-rotate:${token.startsWith('-') ? '-' : ''}${m[1]}deg;transform:rotate(var(--tw-rotate))`;
  if ((m = token.match(/^backdrop-blur(?:-(.+))?$/))) { const v = blur[m[1] ?? 'DEFAULT'] ?? arbitrary(m[1] ?? '') ?? null; if (v) return `--tw-backdrop-blur:blur(${v});backdrop-filter:var(--tw-backdrop-blur) var(--tw-backdrop-saturate,);-webkit-backdrop-filter:var(--tw-backdrop-blur) var(--tw-backdrop-saturate,)`; }
  if (token === 'animate-pulse') return 'animation:tw-pulse 2s cubic-bezier(.4,0,.6,1) infinite';
  if (token === 'accent-sky-300') return 'accent-color:#7dd3fc';
  if (token.startsWith('placeholder-')) { const c = colorValue(token.slice(12)); if (c) return `color:${c}`; }
  if (token === 'font-sans') return 'font-family:ui-sans-serif,system-ui,sans-serif';
  if (token === 'shadow') return 'box-shadow:0 1px 3px 0 rgb(0 0 0 / .1),0 1px 2px -1px rgb(0 0 0 / .1)';
  if (token === 'shadow-lg') return 'box-shadow:0 10px 15px -3px rgb(0 0 0 / .1),0 4px 6px -4px rgb(0 0 0 / .1)';
  return null;
}

const output = [];
const unsupported = [];
const emitted = new Set();
for (const token of [...candidates].sort()) {
  let variants = [];
  let base = token;
  // Keep arbitrary media variants intact (e.g. [@media(hover:none)]:opacity-100).
  if (base.startsWith('[@media(hover:none)]:')) { variants.push('touch-hover'); base = base.slice('[@media(hover:none)]:'.length); }
  else {
    while (/^(sm|lg|hover|focus|group-hover|file):/.test(base)) {
      const i = base.indexOf(':'); variants.push(base.slice(0, i)); base = base.slice(i + 1);
    }
  }
  if (base.startsWith('-')) {
    // Negative inset/translate/rotate utilities are valid utility classes.
    if (!base.startsWith('-rotate-') && !base.startsWith('-translate-') && !base.startsWith('-right-') && !base.startsWith('-top-')) { unsupported.push(token); continue; }
  }
  let rule = declaration(base);
  if (rule === null) { unsupported.push(token); continue; }
  let selector = `.${cssEscape(token)}`;
  if (base.startsWith('placeholder-')) selector += '::placeholder';
  if (variants.includes('hover')) selector += ':hover';
  if (variants.includes('focus')) selector += ':focus';
  if (variants.includes('group-hover')) selector = `.group:hover ${selector}`;
  if (variants.includes('file')) selector = `input[type="file"]::file-selector-button${variants.includes('hover') ? ':hover' : ''}`;
  if (base.startsWith('space-y-')) {
    const val = spaced(base.slice(8));
    rule = null;
    if (val) output.push(`${selector} > :not([hidden]) ~ :not([hidden]){--tw-space-y-reverse:0;margin-top:calc(${val} * (1 - var(--tw-space-y-reverse)));margin-bottom:calc(${val} * var(--tw-space-y-reverse));}`);
  } else if (base.startsWith('-right-') || base.startsWith('-top-')) {
    const match = base.match(/^-(right|top)-(.+)$/);
    const val = match ? spaced(match[2]) : null;
    if (match && val) rule = `${match[1]}:-${val}`;
  }
  if (base === 'bg-gradient-to-r') {
    rule = 'background-image:linear-gradient(to right,var(--tw-gradient-stops))';
  } else if (base.startsWith('from-') || base.startsWith('to-')) {
    const c = colorValue(base.slice(base.indexOf('-') + 1));
    if (c) rule = base.startsWith('from-') ? `--tw-gradient-from:${c};--tw-gradient-stops:var(--tw-gradient-from),var(--tw-gradient-to,transparent)` : `--tw-gradient-to:${c}`;
  }
  if (rule !== null && rule !== '') {
    let wrapped = `${selector}{${rule}}`;
    if (variants.includes('sm')) wrapped = `@media(min-width:640px){${wrapped}}`;
    if (variants.includes('lg')) wrapped = `@media(min-width:1024px){${wrapped}}`;
    if (variants.includes('touch-hover')) wrapped = `@media(hover:none){${wrapped}}`;
    output.push(wrapped);
  }
  emitted.add(token);
}

// Add generated declarations that need their own pseudo selectors or composed transform behavior.
output.push('@keyframes tw-pulse{50%{opacity:.5}}');
output.push('.group:hover .group-hover\\:rotate-180{transform:rotate(180deg)}');
output.push('.group:hover .group-hover\\:opacity-100{opacity:1}');
output.push('.group:hover .group-hover\\:text-amber-200{color:#fde68a}');
output.push('.hover\\:-translate-y-0\\.5:hover{transform:translateY(-2px)}');
output.push('.-rotate-90{transform:rotate(-90deg)}');
output.push('input::placeholder,textarea::placeholder{opacity:1}');
output.push('input[type="file"]::file-selector-button{cursor:pointer}');

const header = `/* Generated by scripts/build-css.mjs. Do not edit by hand. */\n:root{--font-mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Consolas,monospace;--font-pixel:"Pixelify Sans","Courier New",monospace;--font-pixelnum:"Silkscreen","Courier New",monospace;--tw-gradient-to:transparent}\n`;
const generated = header + output.join('\n') + '\n';
await writeFile(resolve(root, 'css/utilities.css'), generated);
console.log(`Generated ${emitted.size} project utility classes (${generated.length} bytes). Custom component classes remain in base.css.`);
