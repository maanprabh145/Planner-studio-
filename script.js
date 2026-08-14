const paletteRow = document.getElementById('paletteRow');
const previewImage = document.getElementById('previewImage');
const imageInput = document.getElementById('imageInput');
const extractPaletteBtn = document.getElementById('extractPaletteBtn');
const remixBtn = document.getElementById('remixBtn');
const styleSelect = document.getElementById('styleSelect');
const plannerPage = document.getElementById('plannerPage');
const plannerDecorLeft = document.getElementById('plannerDecorLeft');
const plannerDecorRight = document.getElementById('plannerDecorRight');
const printBtn = document.getElementById('printBtn');
const downloadPngBtn = document.getElementById('downloadPngBtn');
const scheduleRows = document.getElementById('scheduleRows');
const todoList = document.getElementById('todoList');

let currentPalette = ['#fbf7ef', '#8f8d63', '#df9167', '#dfb061', '#b8b49d'];
let decorSeed = Math.random();

const times = ['6 AM','7 AM','8 AM','9 AM','10 AM','11 AM','12 PM','1 PM','2 PM','3 PM','4 PM','5 PM','6 PM','7 PM','8 PM','9 PM'];
const todoRows = 10;

function createSchedule() {
  scheduleRows.innerHTML = times.map(t => `
    <div class="schedule-row">
      <div class="time">${t}</div>
      <div class="slot"></div>
    </div>
  `).join('');
}

function createTodoRows() {
  todoList.innerHTML = Array.from({ length: todoRows }, () => `
    <div class="todo-row">
      <span class="todo-circle"></span>
      <div class="write-line"></div>
    </div>
  `).join('');
}

function hexToRgb(hex) {
  const clean = hex.replace('#','');
  const value = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  return {
    r: parseInt(value.substring(0,2),16),
    g: parseInt(value.substring(2,4),16),
    b: parseInt(value.substring(4,6),16)
  };
}

function rgbToHex(r,g,b) {
  return '#' + [r,g,b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2,'0')).join('');
}

function mix(hex1, hex2, ratio = 0.5) {
  const a = hexToRgb(hex1);
  const b = hexToRgb(hex2);
  return rgbToHex(
    a.r + (b.r - a.r) * ratio,
    a.g + (b.g - a.g) * ratio,
    a.b + (b.b - a.b) * ratio
  );
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h, s;
  const l = (max + min) / 2;
  if(max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch(max){
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if(s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if(t < 0) t += 1;
      if(t > 1) t -= 1;
      if(t < 1/6) return p + (q - p) * 6 * t;
      if(t < 1/2) return q;
      if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

function refinePalette(raw) {
  const sorted = raw
    .map(hex => ({ hex, hsl: rgbToHsl(...Object.values(hexToRgb(hex))) }))
    .sort((a,b) => a.hsl.l - b.hsl.l);

  const darkest = sorted[0]?.hex || '#4d3b34';
  const lightest = sorted[sorted.length - 1]?.hex || '#f8f3ea';
  const mids = sorted.slice(1, -1);
  const warm = mids.find(c => c.hsl.h > 12 && c.hsl.h < 55) || { hex: '#df9167' };
  const olive = mids.find(c => c.hsl.h > 55 && c.hsl.h < 120) || { hex: '#8f8d63' };
  const gold = mids.find(c => c.hsl.h >= 35 && c.hsl.h <= 70 && c.hsl.s > 25) || { hex: '#dfb061' };

  return [mix(lightest, '#ffffff', 0.35), olive.hex, warm.hex, gold.hex, mix(olive.hex, lightest, 0.55)];
}

function extractPaletteFromImage(img) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const w = 72, h = 72;
  canvas.width = w; canvas.height = h;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const buckets = new Map();

  for(let i = 0; i < data.length; i += 16) {
    const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
    if(a < 200) continue;
    const { s, l } = rgbToHsl(r,g,b);
    if(l > 96) continue;
    const qr = Math.round(r / 24) * 24;
    const qg = Math.round(g / 24) * 24;
    const qb = Math.round(b / 24) * 24;
    const key = `${qr},${qg},${qb}`;
    buckets.set(key, (buckets.get(key) || 0) + (s > 18 ? 2 : 1));
  }

  const colors = [...buckets.entries()]
    .sort((a,b) => b[1] - a[1])
    .map(([key]) => {
      const [r,g,b] = key.split(',').map(Number);
      return rgbToHex(r,g,b);
    });

  const unique = [];
  for(const hex of colors) {
    const hsl = rgbToHsl(...Object.values(hexToRgb(hex)));
    const tooClose = unique.some(existing => {
      const e = rgbToHsl(...Object.values(hexToRgb(existing)));
      return Math.abs(hsl.h - e.h) < 14 && Math.abs(hsl.l - e.l) < 14;
    });
    if(!tooClose) unique.push(hex);
    if(unique.length >= 8) break;
  }

  currentPalette = refinePalette(unique.length ? unique : currentPalette);
  renderPalette();
  applyPalette();
  renderDecor();
}

function renderPalette() {
  paletteRow.innerHTML = currentPalette.map(hex => `<div class="swatch" style="background:${hex}"></div>`).join('');
}

function applyPalette() {
  const [bg, olive, terra, gold, sage] = currentPalette;
  document.documentElement.style.setProperty('--bg', mix(bg, '#fffaf2', 0.18));
  document.documentElement.style.setProperty('--paper', mix(bg, '#ffffff', 0.3));
  document.documentElement.style.setProperty('--olive', mix(olive, '#6f6b4c', 0.18));
  document.documentElement.style.setProperty('--terra', mix(terra, '#d57d59', 0.15));
  document.documentElement.style.setProperty('--gold', mix(gold, '#d9a04f', 0.18));
  document.documentElement.style.setProperty('--sage', mix(sage, olive, 0.18));
  document.documentElement.style.setProperty('--line', mix(bg, '#a79a8d', 0.46));
}

function stripeMarkup(side = 'left') {
  const [bg, olive, terra, gold, sage] = currentPalette;
  const tones = side === 'left'
    ? [mix(bg, '#d8d2c5', 0.25), olive, mix(bg, '#ffffff', 0.45), terra, gold]
    : [mix(bg, '#ffffff', 0.45), terra, mix(bg, '#efe8dc', 0.25), olive, gold];
  const cls = side === 'left' ? 'left-stripes' : 'right-stripes';
  return `<div class="${cls}">${tones.map(color => `<div class="stripe" style="background:${mix(color, '#ffffff', 0.18)}"></div>`).join('')}</div>`;
}

function leafPath(x, y, w, h, rotate = 0, fill = 'var(--olive)', opacity = 0.95) {
  return `<g transform="translate(${x} ${y}) rotate(${rotate})">
    <path d="M 0 0 C ${w*0.12} ${-h*0.22}, ${w*0.75} ${-h*0.14}, ${w} ${h*0.5} C ${w*0.72} ${h*1.02}, ${w*0.2} ${h*1.04}, 0 0 Z" fill="${fill}" opacity="${opacity}"/>
    <path d="M ${w*0.12} ${h*0.06} C ${w*0.28} ${h*0.28}, ${w*0.44} ${h*0.48}, ${w*0.84} ${h*0.78}" stroke="rgba(255,255,255,0.42)" stroke-width="1.1" fill="none"/>
  </g>`;
}

function sprigSvg(side = 'left', variant = 0) {
  const [bg, olive, terra, gold, sage] = currentPalette;
  const seedShift = Math.floor(decorSeed * 1000) % 17;
  const leaves = [];
  const stems = [];
  const berries = [];

  if(side === 'left') {
    stems.push(`<path d="M 70 620 C 82 552, 66 490, 95 425 C 118 368, 108 300, 134 240 C 154 194, 150 130, 178 56" stroke="${mix(olive, '#706d57', 0.25)}" stroke-width="3" fill="none" stroke-linecap="round"/>`);
    const leftLeafColors = [olive, gold, mix(sage, olive, 0.35), mix(gold, terra, 0.3), mix(olive, bg, 0.2)];
    const yVals = [490, 430, 378, 320, 262, 210, 154, 110, 60].map(v => v - (seedShift % 9));
    yVals.forEach((y, i) => {
      const color = leftLeafColors[i % leftLeafColors.length];
      leaves.push(leafPath(40 + (i%3)*4, y, 54 - (i%2)*6, 90 - (i%3)*7, -22 - (i%2)*8, color, 0.9));
      if(i < 7) leaves.push(leafPath(118 + (i%2)*7, y + 16, 42 - (i%3)*4, 74 - (i%2)*6, 22 + (i%3)*8, mix(color, '#ffffff', 0.08), 0.9));
    });
    for(let i=0;i<7;i++) {
      const bx = 154 + (i%2)*10;
      const by = 168 + i*34;
      berries.push(`<circle cx="${bx}" cy="${by}" r="6" fill="${mix(terra, gold, i/8)}" opacity="0.85"/>`);
    }
    berries.push(`<path d="M 145 144 C 152 170, 154 198, 156 226" stroke="${mix(terra, olive, 0.25)}" stroke-width="2" fill="none" stroke-linecap="round"/>`);
  } else {
    stems.push(`<path d="M 124 398 C 116 346, 122 304, 106 254 C 94 216, 102 158, 84 120 C 70 90, 70 58, 56 24" stroke="${mix(olive, '#706d57', 0.25)}" stroke-width="3" fill="none" stroke-linecap="round"/>`);
    const rightLeafColors = [olive, mix(gold, '#e9ba6a', 0.15), sage, mix(terra, gold, 0.32)];
    const yVals = [320, 280, 238, 196, 150, 112, 78, 42].map(v => v + (seedShift % 7));
    yVals.forEach((y, i) => {
      const color = rightLeafColors[i % rightLeafColors.length];
      leaves.push(leafPath(96 - (i%2)*10, y, 42 - (i%3)*3, 74 - (i%2)*5, 162 - (i%3)*14, color, 0.9));
      if(i < 7) leaves.push(leafPath(122 + (i%2)*6, y + 14, 34 - (i%3)*2, 58 - (i%2)*3, 14 + (i%3)*10, mix(color, '#ffffff', 0.1), 0.9));
    });
    for(let i=0;i<4;i++) {
      const bx = 92 + i*8;
      const by = 214 + i*20;
      berries.push(`<circle cx="${bx}" cy="${by}" r="5.5" fill="${mix(terra, gold, i/5)}" opacity="0.82"/>`);
    }
    berries.push(`<path d="M 104 200 C 100 214, 96 228, 92 242" stroke="${mix(terra, olive, 0.2)}" stroke-width="2" fill="none" stroke-linecap="round"/>`);
  }

  return `
    <svg viewBox="0 0 220 640" aria-hidden="true">
      ${stems.join('')}
      ${leaves.join('')}
      ${berries.join('')}
    </svg>
  `;
}

function renderDecor() {
  const leftTop = sprigSvg('left', 0);
  const leftBottom = sprigSvg('left', 1);
  const rightBottom = sprigSvg('right', 0);
  plannerDecorLeft.innerHTML = `
    ${stripeMarkup('left')}
    <div class="botanical left-top">${leftTop}</div>
    <div class="botanical left-bottom" style="transform:scaleY(-1) translateY(-22px); opacity:0.95;">${leftBottom}</div>
  `;
  plannerDecorRight.innerHTML = `
    ${stripeMarkup('right')}
    <div class="botanical right-bottom">${rightBottom}</div>
  `;
}

imageInput.addEventListener('change', e => {
  const file = e.target.files?.[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    previewImage.src = reader.result;
    previewImage.classList.remove('hidden');
    previewImage.onload = () => extractPaletteFromImage(previewImage);
  };
  reader.readAsDataURL(file);
});

extractPaletteBtn.addEventListener('click', () => {
  if(previewImage.src) extractPaletteFromImage(previewImage);
});

remixBtn.addEventListener('click', () => {
  decorSeed = Math.random();
  renderDecor();
});

styleSelect.addEventListener('change', () => {
  const mode = styleSelect.value;
  if(mode === 'softStripe') {
    currentPalette = [currentPalette[0], mix(currentPalette[1], '#909787', 0.34), mix(currentPalette[2], '#d9a28c', 0.35), mix(currentPalette[3], '#dcb772', 0.3), mix(currentPalette[4], '#c8c1b4', 0.45)];
  } else if(mode === 'autumn') {
    currentPalette = [mix(currentPalette[0], '#fff8f0', 0.2), mix(currentPalette[1], '#7b7a4d', 0.18), mix(currentPalette[2], '#ca7951', 0.14), mix(currentPalette[3], '#d39b45', 0.14), mix(currentPalette[4], '#a3a078', 0.18)];
  }
  applyPalette();
  renderPalette();
  renderDecor();
});

printBtn.addEventListener('click', () => window.print());

downloadPngBtn.addEventListener('click', async () => {
  const canvas = await html2canvas(plannerPage, { scale: 2, backgroundColor: '#ffffff' });
  const link = document.createElement('a');
  link.download = 'premium-daily-planner.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});

createSchedule();
createTodoRows();
renderPalette();
applyPalette();
renderDecor();
