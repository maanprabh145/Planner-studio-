
const sections = [
  { id: "top3", label: "Today's Top 3", type: "check", tall: false },
  { id: "schedule", label: "Schedule", type: "lines", tall: true },
  { id: "todo", label: "To-Do List", type: "check", tall: true },
  { id: "notes", label: "Notes", type: "lines", tall: true },
  { id: "meals", label: "Meals", type: "lines", tall: false },
  { id: "water", label: "Water Tracker", type: "check", tall: false },
  { id: "gratitude", label: "Gratitude", type: "lines", tall: false },
  { id: "tomorrow", label: "Tomorrow", type: "lines", tall: false }
];
const pageTypes = ["daily","weekly","monthly","todo","notes","habit"];
const dailyLayouts = [
  { id: "balanced", label: "Balanced" },
  { id: "focus", label: "Focus" },
  { id: "sidebar", label: "Sidebar" },
  { id: "stacked", label: "Stacked" }
];

let currentPage = "daily";
let activeSections = ["top3","schedule","todo","notes","meals","gratitude"];
let extractedPalette = ["#fbf7f0", "#d79c66", "#58463e", "#e4cdbd", "#fffaf5"];
let rawDetectedPack = "botanical";
let dailyLayoutIndex = 0;

const el = id => document.getElementById(id);
const planner = el("plannerPage");
const plannerContent = el("plannerContent");
const plannerDecor = el("plannerDecor");

function showToast(msg) {
  const t = el("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  setTimeout(() => t.classList.add("hidden"), 2600);
}
function clamp(v,min,max){ return Math.min(max, Math.max(min, v)); }
function shuffleArray(arr){
  const copy = [...arr];
  for(let i=copy.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [copy[i],copy[j]] = [copy[j],copy[i]];
  }
  return copy;
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map(c => c + c).join("") : clean;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}
function rgbToHex(r,g,b) { return "#" + [r,g,b].map(v => Math.round(v).toString(16).padStart(2, "0")).join(""); }
function rgbToHsl(r,g,b){
  r/=255; g/=255; b/=255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b);
  let h=0, s=0, l=(max+min)/2;
  if(max!==min){
    const d=max-min;
    s=l>0.5 ? d/(2-max-min) : d/(max+min);
    switch(max){
      case r: h=(g-b)/d + (g<b ? 6 : 0); break;
      case g: h=(b-r)/d + 2; break;
      case b: h=(r-g)/d + 4; break;
    }
    h/=6;
  }
  return { h:h*360, s:s*100, l:l*100 };
}
function hslToRgb(h,s,l){
  h=((h%360)+360)%360; s/=100; l/=100;
  if(s===0){ const v=l*255; return {r:v,g:v,b:v}; }
  const hue2rgb=(p,q,t)=>{
    if(t<0) t+=1;
    if(t>1) t-=1;
    if(t<1/6) return p + (q-p)*6*t;
    if(t<1/2) return q;
    if(t<2/3) return p + (q-p)*(2/3-t)*6;
    return p;
  };
  const q=l<0.5 ? l*(1+s) : l+s-l*s;
  const p=2*l-q;
  const r=hue2rgb(p,q,h/360+1/3)*255;
  const g=hue2rgb(p,q,h/360)*255;
  const b=hue2rgb(p,q,h/360-1/3)*255;
  return {r,g,b};
}
function hexToHsl(hex){ const {r,g,b}=hexToRgb(hex); return rgbToHsl(r,g,b); }
function hslToHex(h,s,l){ const {r,g,b}=hslToRgb(h,s,l); return rgbToHex(r,g,b); }
function blendHex(a,b,amount){
  const ca=hexToRgb(a), cb=hexToRgb(b);
  return rgbToHex(ca.r*(1-amount)+cb.r*amount, ca.g*(1-amount)+cb.g*amount, ca.b*(1-amount)+cb.b*amount);
}
function luminance(hex){
  const {r,g,b}=hexToRgb(hex);
  return 0.2126*(r/255)+0.7152*(g/255)+0.0722*(b/255);
}
function softenHex(hex,{maxSat=56,minLight=34,maxLight=84,targetLight=null,targetSat=null,creamBlend=0.1}={}){
  const hsl=hexToHsl(hex);
  const s = targetSat === null ? Math.min(hsl.s, maxSat) : targetSat;
  const l = targetLight === null ? clamp(hsl.l, minLight, maxLight) : targetLight;
  const out = hslToHex(hsl.h, s, l);
  return creamBlend ? blendHex(out, '#fbf7f0', creamBlend) : out;
}
function averagePaletteFromImage(img, count=12) {
  const canvas=document.createElement('canvas');
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  canvas.width=220; canvas.height=220;
  ctx.drawImage(img,0,0,220,220);
  const data=ctx.getImageData(0,0,220,220).data;
  const buckets=new Map();
  for(let i=0;i<data.length;i+=8){
    if(data[i+3] < 180) continue;
    const r=data[i], g=data[i+1], b=data[i+2];
    const hsl=rgbToHsl(r,g,b);
    const rq=Math.round(r/24)*24, gq=Math.round(g/24)*24, bq=Math.round(b/24)*24;
    const key=[Math.min(rq,255),Math.min(gq,255),Math.min(bq,255)].join(',');
    const weight = 1 + (hsl.s/100)*0.9 + (Math.abs(hsl.l-70)<18 ? 0.6 : 0) + (((hsl.h>=10 && hsl.h<=70)||hsl.h>=320) ? 0.9 : 0);
    buckets.set(key, (buckets.get(key) || 0) + weight);
  }
  return [...buckets.entries()]
    .sort((a,b)=>b[1]-a[1])
    .slice(0,count)
    .map(([k])=>{
      const [r,g,b]=k.split(',').map(Number);
      return rgbToHex(r,g,b);
    });
}
function pickBest(list, scorer){
  if(!list.length) return null;
  return [...list].sort((a,b)=>scorer(b)-scorer(a))[0];
}
function detectPackName(raw){
  const hsls=raw.map(hexToHsl);
  const warm=hsls.filter(x=>(((x.h>=10&&x.h<=70)||x.h>=330) && x.s>14)).length;
  const pink=hsls.filter(x=>((x.h>=315||x.h<=15)&&x.s>15)).length;
  const green=hsls.filter(x=>(x.h>=80&&x.h<=165&&x.s>12)).length;
  const blue=hsls.filter(x=>(x.h>165&&x.h<=245&&x.s>12)).length;
  if(blue >= 2) return 'coastal';
  if(pink >= 2) return 'romantic';
  if(green >= 2) return 'botanical';
  if(warm >= 2) return 'playful';
  return 'botanical';
}
function buildSoftPalette(raw){
  const colors = raw.length ? raw : ['#f6e8d8','#f0c88e','#e9a06a','#7e7166','#f8f1e5'];
  const hsls = colors.map(c => ({hex:c, ...hexToHsl(c)}));

  const brightLights = hsls.filter(c => c.l > 70);
  const warmLights = hsls.filter(c => c.l > 55 && c.s > 12 && (((c.h>=8 && c.h<=70) || c.h>=330)));
  const yellowPeach = hsls.filter(c => c.s > 18 && c.l > 45 && c.l < 82 && ((c.h>=18 && c.h<=62) || c.h>=330 || c.h<=18));
  const greenish = hsls.filter(c => c.s > 10 && c.h >= 80 && c.h <= 165);
  const bluish = hsls.filter(c => c.s > 10 && c.h > 165 && c.h <= 245);
  const darkest = [...hsls].sort((a,b)=>a.l-b.l)[0] || {hex:'#58463e', h:20, s:12, l:28};
  const lightest = [...hsls].sort((a,b)=>b.l-a.l)[0] || {hex:'#fbf7f0', h:32, s:20, l:92};

  const hero = pickBest(yellowPeach, c => c.s + c.l/10) || pickBest(warmLights, c => c.s + c.l/10) || pickBest(greenish, c => c.s) || pickBest(bluish, c => c.s) || lightest;
  const supporting = pickBest(yellowPeach.filter(c => c.hex !== hero.hex), c => c.s + c.l/10) || pickBest(greenish, c => c.s + c.l/15) || pickBest(bluish, c => c.s + c.l/15) || lightest;
  const bgHue = hero ? hero.h : lightest.h;
  const background = blendHex(hslToHex(bgHue, clamp((hero?.s || 20) * 0.28, 8, 24), 95), '#fffaf5', 0.35);
  const accent = softenHex(hero.hex, {targetLight: clamp(hero.l, 58, 68), targetSat: clamp(hero.s, 26, 62), creamBlend:0.06});
  const text = hslToHex(darkest.h, Math.min(darkest.s, 22), clamp(darkest.l, 24, 30));
  const border = blendHex(accent, background, 0.55);
  const fillBase = supporting ? softenHex(supporting.hex, {targetLight:88, targetSat:Math.min(supporting.s, 28), creamBlend:0.5}) : '#fffaf5';
  const softFill = blendHex(fillBase, background, 0.35);
  return [background, accent, text, border, softFill];
}

function packFromMode(mode){
  if(mode==='romantic') return ['bows','petals','stars'];
  if(mode==='botanical') return ['leaves','petals','scallops'];
  if(mode==='coastal') return ['waves','stars','scallops'];
  if(mode==='playful') return ['petals','scallops','stars'];
  return ['leaves','petals','scallops'];
}
function currentPackName(){ return el('motifMode').value === 'auto' ? rawDetectedPack : el('motifMode').value; }
function currentPack(){ return packFromMode(currentPackName()); }
function motifSvg(type){
  if(type==='petals') return `<svg viewBox="0 0 52 28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="26" cy="14" r="1.8" fill="currentColor" opacity=".55"/><path d="M26 6c2 1 3.8 3 4.2 6-3.5-.2-5.7-1.8-7.1-4.6C23.9 6.6 24.8 6.1 26 6Z"/><path d="M26 22c-2-1-3.8-3-4.2-6 3.5.2 5.7 1.8 7.1 4.6-.8.8-1.7 1.3-2.9 1.4Z"/><path d="M17 14c1-2.1 3-3.8 6-4.3-.1 3.6-1.7 5.8-4.4 7.1-.9-.7-1.4-1.7-1.6-2.8Z"/><path d="M35 14c-1 2.1-3 3.8-6 4.3.1-3.6 1.7-5.8 4.4-7.1.9.7 1.4 1.7 1.6 2.8Z"/></svg>`;
  if(type==='leaves') return `<svg viewBox="0 0 54 28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 19c5-8 11-10 18-8-3 7-8 11-18 8Z"/><path d="M19 11c2 4 4.2 7 8.8 9.5"/><path d="M29 18c3.4-6 8.8-8.2 15-6.3-2 5.9-5.9 9.2-13 9.1"/></svg>`;
  if(type==='bows') return `<svg viewBox="0 0 54 28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M27 14c-3.4-2.5-7.1-5-10.7-5-3.1 0-4.8 2.8-3.6 5.2 1.3 2.7 4.6 3.5 8.5 2.8"/><path d="M27 14c3.4-2.5 7.1-5 10.7-5 3.1 0 4.8 2.8 3.6 5.2-1.3 2.7-4.6 3.5-8.5 2.8"/><circle cx="27" cy="14" r="2.2"/><path d="M25.7 16l-4.8 6.6M28.3 16l4.8 6.6"/></svg>`;
  if(type==='stars') return `<svg viewBox="0 0 52 28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M13 6v12M7 12h12M8.7 7.7l8.6 8.6M17.3 7.7l-8.6 8.6"/><path d="M37 9v10M32 14h10M33.6 10.6l6.8 6.8M40.4 10.6l-6.8 6.8"/></svg>`;
  if(type==='waves') return `<svg viewBox="0 0 56 28" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 10c4.2 0 4.2 4 8.4 4s4.2-4 8.4-4 4.2 4 8.4 4 4.2-4 8.4-4 4.2 4 8.4 4"/><path d="M4 17c4.2 0 4.2 4 8.4 4s4.2-4 8.4-4 4.2 4 8.4 4 4.2-4 8.4-4 4.2 4 8.4 4" opacity=".78"/></svg>`;
  if(type==='scallops') return `<svg viewBox="0 0 56 28" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 18c3 0 3-4.8 6-4.8s3 4.8 6 4.8 3-4.8 6-4.8 3 4.8 6 4.8 3-4.8 6-4.8 3 4.8 6 4.8 3-4.8 6-4.8"/><path d="M4 11c3 0 3-4.8 6-4.8s3 4.8 6 4.8 3-4.8 6-4.8 3 4.8 6 4.8 3-4.8 6-4.8 3 4.8 6 4.8 3-4.8 6-4.8" opacity=".76"/></svg>`;
  return motifSvg('petals');
}
function titleIconHtml(type){ return `<span class="title-icon">${motifSvg(type)}</span>`; }
function stripIconHtml(type){ return `<span class="strip-icon">${motifSvg(type)}</span>`; }
function titledBlockHeading(label, motifType){
  return `<div class="title-with-icon">${titleIconHtml(motifType)}<h3 class="card-title">${label}</h3></div>`;
}
function ornamentStripHtml(){
  const pack = currentPack();
  return `<div class="ornament-strip">${stripIconHtml(pack[0])}${stripIconHtml(pack[1])}${stripIconHtml(pack[2])}</div>`;
}
function headerHtml(eyebrow, title, rightLabel){
  return `<div class="planner-header"><div><p class="eyebrow">${eyebrow}</p><h2>${title}</h2></div><div class="date-box"><span>${rightLabel}</span><div class="date-line"></div></div></div>${ornamentStripHtml()}`;
}
function cardEl(section, motifType, classes=''){
  const card=document.createElement('section');
  card.className='planner-card ' + classes;
  if(section.tall && !classes.includes('short')) card.classList.add('tall');
  card.innerHTML=titledBlockHeading(section.label, motifType);
  card.appendChild(section.type==='check' ? makeChecks(section.tall ? 8 : 5) : makeLines(section.tall ? 9 : 5));
  return card;
}
function makeLines(count=5, className='lines') {
  const d=document.createElement('div');
  d.className=className;
  for(let i=0;i<count;i++){
    const line=document.createElement('div');
    line.className='line';
    d.appendChild(line);
  }
  return d;
}
function makeChecks(count=5) {
  const d=document.createElement('div');
  d.className='check-lines';
  for(let i=0;i<count;i++){
    const row=document.createElement('div');
    row.className='check-line';
    const box=document.createElement('span');
    box.className='box';
    const line=document.createElement('span');
    line.className='mini-line';
    row.append(box, line);
    d.appendChild(row);
  }
  return d;
}

function renderDecor(){
  const pack = currentPack();
  const page = currentPage;
  const schemes = {
    daily: [
      {t:pack[0], x:16, y:18, w:72, h:36, o:.14},
      {t:pack[1], x:490, y:20, w:66, h:34, o:.13},
      {t:pack[2], x:34, y:674, w:76, h:38, o:.12},
      {t:pack[0], x:484, y:650, w:72, h:36, o:.11},
      {t:pack[1], x:520, y:302, w:54, h:28, o:.08},
      {t:pack[2], x:22, y:322, w:56, h:26, o:.08}
    ],
    weekly: [
      {t:pack[1], x:24, y:18, w:70, h:34, o:.14},
      {t:pack[2], x:488, y:18, w:70, h:34, o:.14},
      {t:pack[0], x:282, y:120, w:50, h:24, o:.09},
      {t:pack[1], x:36, y:652, w:64, h:28, o:.11},
      {t:pack[0], x:488, y:658, w:66, h:28, o:.11}
    ],
    monthly: [
      {t:pack[2], x:24, y:18, w:72, h:32, o:.14},
      {t:pack[0], x:490, y:18, w:68, h:30, o:.14},
      {t:pack[1], x:274, y:98, w:58, h:26, o:.09},
      {t:pack[2], x:36, y:680, w:68, h:28, o:.1},
      {t:pack[0], x:490, y:680, w:68, h:28, o:.1}
    ],
    todo: [
      {t:pack[0], x:18, y:18, w:72, h:34, o:.14},
      {t:pack[1], x:488, y:18, w:68, h:34, o:.14},
      {t:pack[2], x:490, y:430, w:62, h:30, o:.1},
      {t:pack[0], x:34, y:668, w:70, h:30, o:.1}
    ],
    notes: [
      {t:pack[1], x:20, y:18, w:74, h:34, o:.14},
      {t:pack[2], x:490, y:18, w:68, h:30, o:.14},
      {t:pack[0], x:32, y:682, w:70, h:30, o:.1},
      {t:pack[1], x:490, y:682, w:68, h:28, o:.1}
    ],
    habit: [
      {t:pack[2], x:20, y:18, w:72, h:34, o:.14},
      {t:pack[0], x:490, y:18, w:70, h:34, o:.14},
      {t:pack[1], x:268, y:106, w:54, h:24, o:.1},
      {t:pack[2], x:36, y:686, w:68, h:28, o:.09},
      {t:pack[0], x:488, y:686, w:68, h:28, o:.09}
    ]
  };
  plannerDecor.innerHTML = (schemes[page] || []).map(item => `
    <div class="decor-motif" style="left:${item.x}px; top:${item.y}px; width:${item.w}px; height:${item.h}px; opacity:${item.o};">${motifSvg(item.t)}</div>
  `).join('');
}

function renderDaily(container) {
  container.innerHTML = headerHtml('DAILY PLANNER', 'Today', 'Date');
  const pack = currentPack();
  const layout = dailyLayouts[dailyLayoutIndex].id;
  const grid = document.createElement('div');
  grid.className = 'planner-grid ' + layout;
  const enabled = activeSections.map(id => sections.find(s => s.id === id)).filter(Boolean);

  if(layout === 'balanced') {
    enabled.forEach((section, idx) => {
      const card = cardEl(section, pack[idx % pack.length]);
      if(idx === enabled.length - 1 && enabled.length % 2 === 1) card.classList.add('wide');
      grid.appendChild(card);
    });
  }

  if(layout === 'focus') {
    const ordered = [...enabled];
    if(ordered[0]) {
      const lead = cardEl(ordered[0], pack[0], 'wide');
      lead.classList.add('short');
      grid.appendChild(lead);
    }
    ordered.slice(1).forEach((section, idx) => {
      const card = cardEl(section, pack[(idx+1) % pack.length]);
      grid.appendChild(card);
    });
  }

  if(layout === 'sidebar') {
    const ordered = [...enabled];
    if(ordered[1]) {
      const leftOne = cardEl(ordered[0], pack[0], 'short');
      const main = cardEl(ordered[1], pack[1], 'sidebar-main');
      grid.append(leftOne, main);
      ordered.slice(2).forEach((section, idx) => {
        const card = cardEl(section, pack[(idx+2) % pack.length], idx < 2 ? 'short' : '');
        grid.appendChild(card);
      });
    } else {
      ordered.forEach((section, idx) => grid.appendChild(cardEl(section, pack[idx % pack.length])));
    }
  }

  if(layout === 'stacked') {
    enabled.forEach((section, idx) => {
      const card = cardEl(section, pack[idx % pack.length], idx % 3 === 0 ? 'short' : '');
      card.classList.add('wide');
      grid.appendChild(card);
    });
  }

  container.appendChild(grid);
}

function renderWeekly(container) {
  container.innerHTML = headerHtml('WEEKLY PLANNER', 'This Week', 'Week of');
  const grid = document.createElement('div');
  grid.className = 'week-grid';
  const pack = currentPack();
  ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].forEach((day,i) => {
    const box = document.createElement('section');
    box.className = 'week-day';
    box.innerHTML = titledBlockHeading(day, pack[i % pack.length]);
    box.appendChild(makeLines(day === 'Sunday' ? 7 : 5));
    grid.appendChild(box);
  });
  container.appendChild(grid);
}

function renderMonthly(container) {
  container.innerHTML = headerHtml('MONTHLY PLANNER', 'This Month', 'Month');
  const names = document.createElement('div');
  names.className = 'month-weekdays';
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => {
    const x = document.createElement('div');
    x.textContent = d;
    names.appendChild(x);
  });
  const grid = document.createElement('div');
  grid.className = 'month-grid';
  for (let i=1;i<=42;i++) {
    const c = document.createElement('div');
    c.className = 'month-cell';
    const n = document.createElement('span');
    n.className = 'num';
    n.textContent = i <= 31 ? i : '';
    c.appendChild(n);
    grid.appendChild(c);
  }
  container.append(names, grid);
}

function renderTodo(container) {
  container.innerHTML = headerHtml('MASTER LIST', 'To-Do', 'Date');
  const wrap = document.createElement('div');
  wrap.className = 'todo-layout';
  const pack = currentPack();

  const main = document.createElement('section');
  main.className = 'todo-main';
  main.innerHTML = titledBlockHeading('Tasks', pack[0]);
  main.append(makeChecks(20));

  const side = document.createElement('aside');
  side.className = 'todo-side';
  ['Top 3','Calls / Emails','Errands','Later'].forEach((name,i) => {
    const card = document.createElement('div');
    card.className = 'side-card';
    card.innerHTML = titledBlockHeading(name, pack[(i+1) % pack.length]);
    card.append(i === 0 ? makeChecks(3) : makeLines(4));
    side.appendChild(card);
  });

  wrap.append(main, side);
  container.appendChild(wrap);
}

function renderNotes(container) {
  container.innerHTML = headerHtml('NOTES', 'Notes', 'Date');
  const sheet = document.createElement('section');
  sheet.className = 'notes-sheet';
  sheet.innerHTML = titledBlockHeading('Topic', currentPack()[1]);
  sheet.appendChild(makeLines(24, 'notes-lines'));
  container.appendChild(sheet);
}

function renderHabit(container) {
  container.innerHTML = headerHtml('HABIT TRACKER', 'My Habits', 'Week of');
  const sheet = document.createElement('section');
  sheet.className = 'habit-sheet';
  sheet.innerHTML = titledBlockHeading('Weekly habits', currentPack()[2]);
  const table = document.createElement('div');
  table.className = 'habit-table';
  const heads = ['Habit','M','T','W','T','F','S','S'];
  heads.forEach((x,i) => {
    const c = document.createElement('div');
    c.className = 'head' + (i===0 ? ' habit-name' : '');
    c.textContent = x;
    table.appendChild(c);
  });
  for(let r=1;r<=10;r++) {
    for(let c=0;c<8;c++) {
      const cell = document.createElement('div');
      if(c===0) {
        cell.className = 'habit-name';
        cell.textContent = `Habit ${r}`;
      } else {
        const box = document.createElement('span');
        box.className = 'box';
        cell.appendChild(box);
      }
      table.appendChild(cell);
    }
  }
  sheet.appendChild(table);
  container.appendChild(sheet);
}

function updateLayoutLabel(){ el('layoutLabel').textContent = dailyLayouts[dailyLayoutIndex].label; }

function renderCurrentPage() {
  plannerContent.innerHTML = '';
  if(currentPage === 'daily') renderDaily(plannerContent);
  if(currentPage === 'weekly') renderWeekly(plannerContent);
  if(currentPage === 'monthly') renderMonthly(plannerContent);
  if(currentPage === 'todo') renderTodo(plannerContent);
  if(currentPage === 'notes') renderNotes(plannerContent);
  if(currentPage === 'habit') renderHabit(plannerContent);
  document.querySelectorAll('#pageTabs button').forEach(btn => btn.classList.toggle('active', btn.dataset.page === currentPage));
  el('motifLabel').textContent = currentPackName().charAt(0).toUpperCase() + currentPackName().slice(1);
  updateLayoutLabel();
  renderDecor();
  applyStyleControls(false);
}

function renderSectionControls() {
  const wrap = el('sectionControls');
  wrap.innerHTML = '';
  sections.forEach(section => {
    const label = document.createElement('label');
    label.className = 'section-toggle';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = activeSections.includes(section.id);
    input.addEventListener('change', () => {
      if(input.checked) activeSections.push(section.id);
      else activeSections = activeSections.filter(id => id !== section.id);
      renderCurrentPage();
      autosave();
    });
    const span = document.createElement('span');
    span.textContent = section.label;
    label.append(input, span);
    wrap.appendChild(label);
  });
}

function renderPalette() {
  const wrap = el('palette');
  wrap.innerHTML = '';
  extractedPalette.forEach((color, idx) => {
    const swatch = document.createElement('button');
    swatch.className = 'swatch';
    swatch.style.background = color;
    swatch.title = color;
    swatch.addEventListener('click', () => {
      const ids = ['bgColor','accentColor','textColor','borderColor','softFillColor'];
      el(ids[idx] || 'accentColor').value = color;
      applyStyleControls();
    });
    wrap.appendChild(swatch);
  });
}

function applyStyleControls(save=true) {
  planner.style.setProperty('--page-bg', el('bgColor').value);
  planner.style.setProperty('--page-accent', el('accentColor').value);
  planner.style.setProperty('--page-text', el('textColor').value);
  planner.style.setProperty('--page-border', el('borderColor').value);
  planner.style.setProperty('--page-fill', el('softFillColor').value);
  planner.style.setProperty('--page-radius', el('cornerRadius').value + 'px');
  planner.style.setProperty('--page-gap', el('spacing').value + 'px');
  planner.style.setProperty('--font-title', el('titleFont').value);
  planner.style.setProperty('--font-label', el('labelFont').value);
  planner.style.setProperty('--font-body', el('bodyFont').value);
  planner.className = 'planner-page ' + el('stylePreset').value;
  if(save) autosave();
}

function pageDimensionsPx() {
  const size = el('pageSize').value;
  if(size === 'a4') return {w:595, h:842};
  if(size === 'a5') return {w:420, h:595};
  return {w:612, h:792};
}
function pageDimensionsMm() {
  const size = el('pageSize').value;
  if(size === 'a4') return {w:210, h:297};
  if(size === 'a5') return {w:148, h:210};
  return {w:215.9, h:279.4};
}
function applyPageSize() {
  const d = pageDimensionsPx();
  planner.style.width = d.w + 'px';
  planner.style.minHeight = d.h + 'px';
}

el('imageInput').addEventListener('change', e => {
  const file = e.target.files?.[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = el('imagePreview');
    img.src = reader.result;
    img.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
});

el('extractPaletteBtn').addEventListener('click', () => {
  if(!el('rightsCheck').checked) return showToast('Please confirm the image-use checkbox first.');
  const img = el('imagePreview');
  if(!img.src) return showToast('Upload an inspiration image first.');
  const raw = averagePaletteFromImage(img, 12);
  extractedPalette = buildSoftPalette(raw);
  rawDetectedPack = detectPackName(raw);
  renderPalette();
  ['bgColor','accentColor','textColor','borderColor','softFillColor'].forEach((id, idx) => el(id).value = extractedPalette[idx]);
  renderCurrentPage();
  applyStyleControls();
  showToast('Soft palette extracted and motif pack updated.');
});

document.querySelectorAll('#pageTabs button').forEach(btn => {
  btn.addEventListener('click', () => {
    currentPage = btn.dataset.page;
    renderCurrentPage();
    autosave();
  });
});

['bgColor','accentColor','textColor','borderColor','softFillColor','cornerRadius','spacing','titleFont','labelFont','bodyFont','stylePreset','motifMode']
  .forEach(id => el(id).addEventListener('input', () => {
    renderCurrentPage();
    applyStyleControls();
  }));

el('pageSize').addEventListener('change', () => {
  applyPageSize();
  renderCurrentPage();
  autosave();
});

el('regenerateBtn').addEventListener('click', () => {
  dailyLayoutIndex = (dailyLayoutIndex + 1) % dailyLayouts.length;
  const kept = activeSections.filter(Boolean);
  if(kept.length > 2) {
    const first = kept.shift();
    kept.push(first);
    const middle = kept.splice(1, 1);
    activeSections = [kept[0], ...shuffleArray(kept.slice(1)), ...middle].filter(Boolean).slice(0, kept.length + middle.length);
  }
  currentPage = 'daily';
  renderSectionControls();
  renderCurrentPage();
  autosave();
  showToast(`Daily layout changed to ${dailyLayouts[dailyLayoutIndex].label}.`);
});

async function plannerCanvas(scale=3) {
  return await html2canvas(planner, { scale, backgroundColor: el('bgColor').value, useCORS: true, logging: false });
}

el('exportPngBtn').addEventListener('click', async () => {
  try {
    showToast('Preparing PNG...');
    const canvas = await plannerCanvas(3);
    const a = document.createElement('a');
    a.download = `${currentPage}-${el('pageSize').value}.png`;
    a.href = canvas.toDataURL('image/png');
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('Current page PNG exported.');
  } catch(err) {
    console.error(err);
    showToast('PNG export failed.');
  }
});

function mapTitleFontToPdf() {
  const v = el('titleFont').value;
  if(/Great Vibes|Parisienne|Allura|Caveat/i.test(v)) return {family:'times', style:'italic'};
  if(/Montserrat|Poppins|Raleway/i.test(v)) return {family:'helvetica', style:'normal'};
  return {family:'times', style:'normal'};
}
function mapLabelFontToPdf() {
  const v = el('labelFont').value;
  if(/Cormorant|Lora|Spectral/i.test(v)) return {family:'times', style:'normal'};
  if(/Kalam|Patrick Hand/i.test(v)) return {family:'times', style:'italic'};
  return {family:'helvetica', style:'bold'};
}
function mapBodyFontToPdf() {
  const v = el('bodyFont').value;
  if(/Lora|Spectral/i.test(v)) return {family:'times', style:'normal'};
  if(/Patrick Hand|Kalam/i.test(v)) return {family:'times', style:'italic'};
  return {family:'helvetica', style:'normal'};
}
function setPdfColor(pdf, method, hex) {
  const {r,g,b} = hexToRgb(hex);
  pdf[method](r,g,b);
}
function pdfCfg() {
  const d = pageDimensionsMm();
  return {
    w:d.w, h:d.h, m:d.w*.075,
    bg:el('bgColor').value,
    accent:el('accentColor').value,
    text:el('textColor').value,
    border:el('borderColor').value,
    fill:el('softFillColor').value,
    pack:currentPack(),
    titleFont: mapTitleFontToPdf(),
    labelFont: mapLabelFontToPdf(),
    bodyFont: mapBodyFontToPdf()
  };
}
function pdfBase(pdf,cfg) {
  setPdfColor(pdf,'setFillColor',cfg.bg);
  pdf.rect(0,0,cfg.w,cfg.h,'F');
}
function drawPdfMotif(pdf,type,x,y,scale=1,alpha=1){
  setPdfColor(pdf,'setDrawColor',pdf.__accentColor || '#000');
  setPdfColor(pdf,'setFillColor',pdf.__accentColor || '#000');
  pdf.setLineWidth(0.25);
  if(type==='petals'){
    pdf.circle(x,y,0.7*scale,'F');
    pdf.ellipse(x,y-2*scale,1.2*scale,0.7*scale,'S');
    pdf.ellipse(x,y+2*scale,1.2*scale,0.7*scale,'S');
    pdf.ellipse(x-2*scale,y,0.7*scale,1.2*scale,'S');
    pdf.ellipse(x+2*scale,y,0.7*scale,1.2*scale,'S');
  } else if(type==='leaves'){
    pdf.ellipse(x-1.8*scale,y,1.7*scale,0.9*scale,'S');
    pdf.ellipse(x+1.8*scale,y-0.5*scale,1.7*scale,0.9*scale,'S');
    pdf.line(x-2.4*scale,y+1.3*scale,x+2.5*scale,y-1*scale);
  } else if(type==='bows'){
    pdf.ellipse(x-2*scale,y,1.6*scale,1.1*scale,'S');
    pdf.ellipse(x+2*scale,y,1.6*scale,1.1*scale,'S');
    pdf.circle(x,y,0.8*scale,'S');
    pdf.line(x-0.4*scale,y+1*scale,x-2*scale,y+3*scale);
    pdf.line(x+0.4*scale,y+1*scale,x+2*scale,y+3*scale);
  } else if(type==='stars'){
    pdf.line(x-2*scale,y,x+2*scale,y);
    pdf.line(x,y-2*scale,x,y+2*scale);
    pdf.line(x-1.4*scale,y-1.4*scale,x+1.4*scale,y+1.4*scale);
    pdf.line(x-1.4*scale,y+1.4*scale,x+1.4*scale,y-1.4*scale);
  } else if(type==='waves'){
    pdf.lines([[1.1*scale,-1.1*scale],[1.1*scale,1.1*scale],[1.1*scale,-1.1*scale],[1.1*scale,1.1*scale],[1.1*scale,-1.1*scale]],x-2.8*scale,y);
    pdf.lines([[1.1*scale,-1.1*scale],[1.1*scale,1.1*scale],[1.1*scale,-1.1*scale],[1.1*scale,1.1*scale],[1.1*scale,-1.1*scale]],x-2.8*scale,y+2.4*scale);
  } else if(type==='scallops'){
    for(let i=0;i<4;i++) pdf.ellipse(x-3*scale+i*2*scale,y,1*scale,0.8*scale,'S');
    for(let i=0;i<4;i++) pdf.ellipse(x-3*scale+i*2*scale,y+1.8*scale,1*scale,0.8*scale,'S');
  }
}
function drawPdfBackgroundMotifs(pdf,cfg,pageKey){
  const p = cfg.pack;
  const items = {
    daily:[ [p[0],cfg.m+8,16,.95],[p[1],cfg.w-cfg.m-8,16,.9],[p[2],cfg.m+10,cfg.h-26,.85],[p[0],cfg.w-cfg.m-10,cfg.h-28,.85],[p[1],cfg.w-cfg.m-8,cfg.h*.44,.75],[p[2],cfg.m+8,cfg.h*.45,.75] ],
    weekly:[ [p[1],cfg.m+8,16,.95],[p[2],cfg.w-cfg.m-8,16,.95],[p[0],cfg.w/2,cfg.h*.17,.7],[p[1],cfg.m+8,cfg.h-24,.82],[p[0],cfg.w-cfg.m-8,cfg.h-24,.82] ],
    monthly:[ [p[2],cfg.m+8,16,.95],[p[0],cfg.w-cfg.m-8,16,.95],[p[1],cfg.w/2,cfg.h*.16,.7],[p[2],cfg.m+8,cfg.h-24,.78],[p[0],cfg.w-cfg.m-8,cfg.h-24,.78] ],
    todo:[ [p[0],cfg.m+8,16,.95],[p[1],cfg.w-cfg.m-8,16,.95],[p[2],cfg.w-cfg.m-8,cfg.h*.55,.75],[p[0],cfg.m+10,cfg.h-26,.78] ],
    notes:[ [p[1],cfg.m+8,16,.95],[p[2],cfg.w-cfg.m-8,16,.95],[p[0],cfg.m+10,cfg.h-24,.78],[p[1],cfg.w-cfg.m-8,cfg.h-24,.78] ],
    habit:[ [p[2],cfg.m+8,16,.95],[p[0],cfg.w-cfg.m-8,16,.95],[p[1],cfg.w/2,cfg.h*.17,.7],[p[2],cfg.m+10,cfg.h-22,.72],[p[0],cfg.w-cfg.m-8,cfg.h-22,.72] ]
  }[pageKey] || [];
  pdf.__accentColor = blendHex(cfg.accent, cfg.bg, .45);
  items.forEach(([type,x,y,scale])=> drawPdfMotif(pdf,type,x,y,scale));
  pdf.__accentColor = cfg.accent;
}
function drawPdfHeader(pdf, title, eyebrow, right, cfg, pageKey) {
  const {w,h,m,accent,text,border,pack,titleFont,labelFont} = cfg;
  pdf.__accentColor = accent;
  drawPdfBackgroundMotifs(pdf,cfg,pageKey);
  const top = h*.07;
  setPdfColor(pdf,'setTextColor',accent);
  pdf.setFont(labelFont.family,labelFont.style);
  pdf.setFontSize(Math.max(7,w*.04));
  pdf.text(eyebrow,m,top);
  setPdfColor(pdf,'setTextColor',text);
  pdf.setFont(titleFont.family,titleFont.style);
  pdf.setFontSize(Math.max(20,w*.14));
  pdf.text(title,m,top+h*.045);
  setPdfColor(pdf,'setTextColor',accent);
  pdf.setFont(labelFont.family,labelFont.style);
  pdf.setFontSize(Math.max(7,w*.04));
  pdf.text(right,w-m-35,top+h*.023);
  setPdfColor(pdf,'setDrawColor',border);
  pdf.setLineWidth(.25);
  pdf.line(w-m-35,top+h*.035,w-m,top+h*.035);
  setPdfColor(pdf,'setDrawColor',accent);
  pdf.setLineWidth(.5);
  pdf.line(m,top+h*.058,w-m,top+h*.058);
  drawPdfMotif(pdf,pack[0],w/2-10,top+h*.071,.52);
  drawPdfMotif(pdf,pack[1],w/2,top+h*.071,.52);
  drawPdfMotif(pdf,pack[2],w/2+10,top+h*.071,.52);
  return top+h*.086;
}
function drawPdfFooter(pdf,cfg){
  setPdfColor(pdf,'setTextColor',cfg.accent);
  pdf.setFont(cfg.labelFont.family, 'normal');
  pdf.setFontSize(Math.max(6.5,cfg.w*.031));
  pdf.text('Make room for what matters.', cfg.w/2, cfg.h-cfg.h*.028, {align:'center'});
}
function drawPdfLineSet(pdf,x,y,w,count,gap,border,checks=false) {
  setPdfColor(pdf,'setDrawColor',border);
  pdf.setLineWidth(.23);
  for(let i=0;i<count;i++) {
    const yy = y + i*gap;
    if(checks) {
      pdf.rect(x, yy-2.1, 2.6, 2.6);
      pdf.line(x+5.5, yy, x+w, yy);
    } else pdf.line(x, yy, x+w, yy);
  }
}
function drawPdfTitleWithIcon(pdf,label,x,y,cfg,motifType){
  drawPdfMotif(pdf,motifType,x+2.5,y-1.0,0.45);
  setPdfColor(pdf,'setTextColor',cfg.accent);
  pdf.setFont(cfg.labelFont.family, cfg.labelFont.style === 'italic' ? 'italic' : 'bold');
  pdf.setFontSize(Math.max(6.6,cfg.w*.036));
  pdf.text(label.toUpperCase(), x+7, y);
}
function fillPanel(pdf,cfg,x,y,w,h){
  setPdfColor(pdf,'setFillColor',cfg.fill);
  setPdfColor(pdf,'setDrawColor',cfg.border);
  pdf.roundedRect(x,y,w,h,4,4,'FD');
}
function drawDailyPdf(pdf,cfg){
  pdfBase(pdf,cfg);
  const startY = drawPdfHeader(pdf,'Today','DAILY PLANNER','DATE',cfg,'daily');
  const totalW = cfg.w - cfg.m*2;
  const gap = cfg.w*.028;
  const enabled = activeSections.map(id => sections.find(s => s.id===id)).filter(Boolean);
  const layout = dailyLayouts[dailyLayoutIndex].id;
  if(layout === 'balanced') {
    const colW = (totalW-gap)/2;
    const rows = Math.max(1, Math.ceil(enabled.length/2));
    const bottom = cfg.h*.07;
    const rowGap = cfg.h*.025;
    const cardH = (cfg.h-startY-bottom-rowGap*(rows-1))/rows;
    enabled.forEach((s,i)=>{
      const row=Math.floor(i/2), col=i%2;
      let x=cfg.m+col*(colW+gap), y=startY+row*(cardH+rowGap), w=colW;
      if(i===enabled.length-1 && enabled.length%2===1){ x=cfg.m; w=totalW; }
      fillPanel(pdf,cfg,x,y,w,cardH);
      drawPdfTitleWithIcon(pdf,s.label,x+2,y+8,cfg,cfg.pack[i % cfg.pack.length]);
      drawPdfLineSet(pdf,x+5,y+18,w-10,s.tall?8:5,(cardH-25)/(s.tall?8:5),cfg.border,s.type==='check');
    });
  }
  if(layout === 'focus') {
    const topH = 34;
    fillPanel(pdf,cfg,cfg.m,startY,totalW,topH);
    if(enabled[0]){
      drawPdfTitleWithIcon(pdf,enabled[0].label,cfg.m+2,startY+8,cfg,cfg.pack[0]);
      drawPdfLineSet(pdf,cfg.m+5,startY+18,totalW-10,4,(topH-24)/4,cfg.border,enabled[0].type==='check');
    }
    const rest = enabled.slice(1);
    const colW=(totalW-gap)/2;
    const rows=Math.max(1,Math.ceil(rest.length/2));
    const rowGap=cfg.h*.022;
    const y0=startY+topH+8;
    const cardH=(cfg.h-y0-cfg.h*.07-rowGap*(rows-1))/rows;
    rest.forEach((s,i)=>{
      const row=Math.floor(i/2), col=i%2;
      const x=cfg.m+col*(colW+gap), y=y0+row*(cardH+rowGap);
      fillPanel(pdf,cfg,x,y,colW,cardH);
      drawPdfTitleWithIcon(pdf,s.label,x+2,y+8,cfg,cfg.pack[(i+1)%cfg.pack.length]);
      drawPdfLineSet(pdf,x+5,y+18,colW-10,s.tall?8:5,(cardH-25)/(s.tall?8:5),cfg.border,s.type==='check');
    });
  }
  if(layout === 'sidebar') {
    const leftW = totalW*.52;
    const rightW = totalW-leftW-gap;
    const leftItems = enabled.filter((_,i)=>i!==1);
    const main = enabled[1] || enabled[0];
    const rowGap = cfg.h*.02;
    const leftRows = Math.max(1, leftItems.length);
    const smallH = (cfg.h-startY-cfg.h*.07-rowGap*(leftRows-1))/leftRows;
    leftItems.forEach((s,i)=>{
      const y=startY+i*(smallH+rowGap);
      fillPanel(pdf,cfg,cfg.m,y,leftW,smallH);
      drawPdfTitleWithIcon(pdf,s.label,cfg.m+2,y+8,cfg,cfg.pack[i%cfg.pack.length]);
      drawPdfLineSet(pdf,cfg.m+5,y+18,leftW-10,s.tall?6:4,(smallH-25)/(s.tall?6:4),cfg.border,s.type==='check');
    });
    const rx = cfg.m+leftW+gap;
    const rh = cfg.h-startY-cfg.h*.07;
    fillPanel(pdf,cfg,rx,startY,rightW,rh);
    if(main){
      drawPdfTitleWithIcon(pdf,main.label,rx+2,startY+8,cfg,cfg.pack[1]);
      drawPdfLineSet(pdf,rx+5,startY+18,rightW-10,12,(rh-28)/12,cfg.border,main.type==='check');
    }
  }
  if(layout === 'stacked') {
    const rowGap = cfg.h*.018;
    const rows = enabled.length;
    const cardH = (cfg.h-startY-cfg.h*.07-rowGap*(rows-1))/rows;
    enabled.forEach((s,i)=>{
      const y=startY+i*(cardH+rowGap);
      fillPanel(pdf,cfg,cfg.m,y,totalW,cardH);
      drawPdfTitleWithIcon(pdf,s.label,cfg.m+2,y+8,cfg,cfg.pack[i%cfg.pack.length]);
      drawPdfLineSet(pdf,cfg.m+5,y+18,totalW-10,s.tall?6:4,(cardH-24)/(s.tall?6:4),cfg.border,s.type==='check');
    });
  }
  drawPdfFooter(pdf,cfg);
}
function drawWeeklyPdf(pdf,cfg){
  pdfBase(pdf,cfg);
  const startY=drawPdfHeader(pdf,'This Week','WEEKLY PLANNER','WEEK OF',cfg,'weekly');
  const gap=cfg.w*.025;
  const colW=(cfg.w-cfg.m*2-gap)/2;
  const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const rowGap=cfg.h*.018;
  const cardH=(cfg.h-startY-cfg.h*.075-rowGap*3)/4;
  days.forEach((day,i)=>{
    let x,y,w=colW;
    if(i<6){ const row=Math.floor(i/2), col=i%2; x=cfg.m+col*(colW+gap); y=startY+row*(cardH+rowGap); }
    else { x=cfg.m; y=startY+3*(cardH+rowGap); w=cfg.w-cfg.m*2; }
    fillPanel(pdf,cfg,x,y,w,cardH);
    drawPdfTitleWithIcon(pdf,day,x+2,y+8,cfg,cfg.pack[i % cfg.pack.length]);
    drawPdfLineSet(pdf,x+5,y+17,w-10,5,(cardH-23)/5,cfg.border,false);
  });
  drawPdfFooter(pdf,cfg);
}
function drawMonthlyPdf(pdf,cfg){
  pdfBase(pdf,cfg);
  const startY=drawPdfHeader(pdf,'This Month','MONTHLY PLANNER','MONTH',cfg,'monthly');
  const days=['SUN','MON','TUE','WED','THU','FRI','SAT'];
  const gridW=cfg.w-cfg.m*2;
  const cellW=gridW/7;
  const headY=startY+3;
  setPdfColor(pdf,'setTextColor',cfg.accent);
  pdf.setFont(cfg.labelFont.family, cfg.labelFont.style === 'italic' ? 'italic' : 'bold');
  pdf.setFontSize(Math.max(5.8,cfg.w*.028));
  days.forEach((d,i)=>pdf.text(d,cfg.m+i*cellW+cellW/2,headY,{align:'center'}));
  const gridY=startY+8;
  const gridH=cfg.h-gridY-cfg.h*.07;
  const cellH=gridH/6;
  let n=1;
  for(let r=0;r<6;r++) for(let c=0;c<7;c++){
    const x=cfg.m+c*cellW, y=gridY+r*cellH;
    setPdfColor(pdf,'setFillColor',cfg.fill);
    setPdfColor(pdf,'setDrawColor',cfg.border); pdf.setLineWidth(.18);
    pdf.rect(x,y,cellW,cellH,'FD');
    if(n<=31){ setPdfColor(pdf,'setTextColor',cfg.accent); pdf.text(String(n),x+2.5,y+4.5); n++; }
  }
  drawPdfFooter(pdf,cfg);
}
function drawTodoPdf(pdf,cfg){
  pdfBase(pdf,cfg);
  const startY=drawPdfHeader(pdf,'To-Do','MASTER LIST','DATE',cfg,'todo');
  const gap=cfg.w*.025; const totalW=cfg.w-cfg.m*2; const mainW=totalW*.64; const sideW=totalW-mainW-gap; const h=cfg.h-startY-cfg.h*.075;
  fillPanel(pdf,cfg,cfg.m,startY,mainW,h);
  drawPdfTitleWithIcon(pdf,'Tasks',cfg.m+2,startY+8,cfg,cfg.pack[0]);
  drawPdfLineSet(pdf,cfg.m+5,startY+19,mainW-10,20,(h-28)/20,cfg.border,true);
  const sx=cfg.m+mainW+gap;
  fillPanel(pdf,cfg,sx,startY,sideW,h);
  const labels=['Top 3','Calls / Emails','Errands','Later'];
  const blockH=h/4;
  labels.forEach((lab,i)=>{
    const y=startY+i*blockH;
    drawPdfTitleWithIcon(pdf,lab,sx+2,y+8,cfg,cfg.pack[(i+1)%cfg.pack.length]);
    drawPdfLineSet(pdf,sx+5,y+17,sideW-10,i===0?3:4,(blockH-23)/(i===0?3:4),cfg.border,i===0);
    if(i<3){ setPdfColor(pdf,'setDrawColor',cfg.border); pdf.line(sx+4,y+blockH,sx+sideW-4,y+blockH); }
  });
  drawPdfFooter(pdf,cfg);
}
function drawNotesPdf(pdf,cfg){
  pdfBase(pdf,cfg);
  const startY=drawPdfHeader(pdf,'Notes','NOTES','DATE',cfg,'notes');
  const h=cfg.h-startY-cfg.h*.075;
  fillPanel(pdf,cfg,cfg.m,startY,cfg.w-cfg.m*2,h);
  drawPdfTitleWithIcon(pdf,'Topic',cfg.m+2,startY+8,cfg,cfg.pack[1]);
  drawPdfLineSet(pdf,cfg.m+5,startY+19,cfg.w-cfg.m*2-10,24,(h-28)/24,cfg.border,false);
  drawPdfFooter(pdf,cfg);
}
function drawHabitPdf(pdf,cfg){
  pdfBase(pdf,cfg);
  const startY=drawPdfHeader(pdf,'My Habits','HABIT TRACKER','WEEK OF',cfg,'habit');
  const x=cfg.m, y=startY+8, totalW=cfg.w-cfg.m*2, nameW=totalW*.34, dayW=(totalW-nameW)/7, rowH=(cfg.h-y-cfg.h*.085)/11;
  const headers=['HABIT','M','T','W','T','F','S','S'];
  for(let c=0;c<8;c++){
    const cx=c===0?x:x+nameW+(c-1)*dayW, cw=c===0?nameW:dayW;
    setPdfColor(pdf,'setFillColor',cfg.fill); setPdfColor(pdf,'setDrawColor',cfg.border); pdf.setLineWidth(.2);
    pdf.rect(cx,y,cw,rowH,'FD');
    setPdfColor(pdf,'setTextColor',cfg.accent); pdf.setFont(cfg.labelFont.family, cfg.labelFont.style === 'italic' ? 'italic' : 'bold'); pdf.setFontSize(Math.max(5.5,cfg.w*.027));
    pdf.text(headers[c],cx+cw/2,y+rowH*.62,{align:'center'});
  }
  for(let r=1;r<=10;r++){
    const ry=y+r*rowH;
    for(let c=0;c<8;c++){
      const cx=c===0?x:x+nameW+(c-1)*dayW, cw=c===0?nameW:dayW;
      setPdfColor(pdf,'setFillColor',cfg.fill); setPdfColor(pdf,'setDrawColor',cfg.border); pdf.rect(cx,ry,cw,rowH,'FD');
      if(c===0){ setPdfColor(pdf,'setTextColor',cfg.accent); pdf.setFont(cfg.bodyFont.family,cfg.bodyFont.style); pdf.setFontSize(Math.max(5.5,cfg.w*.027)); pdf.text(`Habit ${r}`,cx+3,ry+rowH*.62); }
      else { const box=Math.min(3.2,rowH*.35); pdf.rect(cx+cw/2-box/2,ry+rowH/2-box/2,box,box); }
    }
  }
  drawPdfFooter(pdf,cfg);
}
function drawVectorPage(pdf,type,cfg){
  if(type==='daily') drawDailyPdf(pdf,cfg);
  if(type==='weekly') drawWeeklyPdf(pdf,cfg);
  if(type==='monthly') drawMonthlyPdf(pdf,cfg);
  if(type==='todo') drawTodoPdf(pdf,cfg);
  if(type==='notes') drawNotesPdf(pdf,cfg);
  if(type==='habit') drawHabitPdf(pdf,cfg);
}

el('exportPdfBtn').addEventListener('click', async () => {
  const isiPadOrIPhone = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let previewWindow = null;
  if(isiPadOrIPhone) {
    previewWindow = window.open('', '_blank');
    if(previewWindow) previewWindow.document.write("<!doctype html><title>Preparing PDF...</title><meta name='viewport' content='width=device-width,initial-scale=1'><body style='font-family:system-ui;padding:30px'>Preparing your refined 6-page planner collection…</body>");
  }
  try {
    if(!window.jspdf || !window.jspdf.jsPDF) throw new Error('jsPDF did not load.');
    showToast('Building refined 6-page PDF...');
    const {jsPDF} = window.jspdf;
    const cfg = pdfCfg();
    const pdf = new jsPDF({orientation:'portrait', unit:'mm', format:[cfg.w,cfg.h], compress:true});
    pageTypes.forEach((type, index) => { if(index>0) pdf.addPage([cfg.w,cfg.h], 'portrait'); drawVectorPage(pdf, type, cfg); });
    const blob = pdf.output('blob');
    const url = URL.createObjectURL(blob);
    const fileName = `planner-collection-phase5-${el('pageSize').value}.pdf`;
    if(isiPadOrIPhone) {
      if(previewWindow) previewWindow.location.href = url;
      showToast('PDF opened. Use Share → Save to Files.');
    } else {
      const a = document.createElement('a');
      a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove();
      showToast('Refined 6-page PDF exported.');
    }
    setTimeout(() => URL.revokeObjectURL(url), 120000);
  } catch(err) {
    console.error(err);
    if(previewWindow && !previewWindow.closed) previewWindow.document.body.innerHTML = "<p style='font-family:system-ui;padding:24px'>PDF export failed. Return to Planner Studio and try again.</p>";
    showToast('PDF export failed.');
  }
});

function projectData(){
  return {
    version:6,
    currentPage,
    activeSections,
    extractedPalette,
    rawDetectedPack,
    dailyLayoutIndex,
    pageSize:el('pageSize').value,
    stylePreset:el('stylePreset').value,
    motifMode:el('motifMode').value,
    palette:{ background:el('bgColor').value, accent:el('accentColor').value, text:el('textColor').value, border:el('borderColor').value, fill:el('softFillColor').value },
    typography:{ title:el('titleFont').value, label:el('labelFont').value, body:el('bodyFont').value },
    cornerRadius:el('cornerRadius').value,
    spacing:el('spacing').value
  };
}
function autosave(){ localStorage.setItem('plannerStudioProject', JSON.stringify(projectData())); }
function loadSaved(){
  try {
    const saved = JSON.parse(localStorage.getItem('plannerStudioProject'));
    if(!saved) return;
    currentPage = saved.currentPage || currentPage;
    activeSections = saved.activeSections || activeSections;
    extractedPalette = saved.extractedPalette || extractedPalette;
    rawDetectedPack = saved.rawDetectedPack || rawDetectedPack;
    dailyLayoutIndex = typeof saved.dailyLayoutIndex === 'number' ? saved.dailyLayoutIndex : dailyLayoutIndex;
    if(saved.pageSize) el('pageSize').value = saved.pageSize;
    if(saved.stylePreset) el('stylePreset').value = saved.stylePreset;
    if(saved.motifMode) el('motifMode').value = saved.motifMode;
    if(saved.palette){
      el('bgColor').value = saved.palette.background || el('bgColor').value;
      el('accentColor').value = saved.palette.accent || el('accentColor').value;
      el('textColor').value = saved.palette.text || el('textColor').value;
      el('borderColor').value = saved.palette.border || el('borderColor').value;
      el('softFillColor').value = saved.palette.fill || el('softFillColor').value;
    }
    if(saved.typography){
      el('titleFont').value = saved.typography.title || el('titleFont').value;
      el('labelFont').value = saved.typography.label || el('labelFont').value;
      el('bodyFont').value = saved.typography.body || el('bodyFont').value;
    }
    if(saved.cornerRadius) el('cornerRadius').value = saved.cornerRadius;
    if(saved.spacing) el('spacing').value = saved.spacing;
  } catch(err) { console.warn(err); }
}

el('saveProjectBtn').addEventListener('click', () => {
  autosave();
  const blob = new Blob([JSON.stringify(projectData(), null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.download = 'planner-studio-project.json';
  a.href = URL.createObjectURL(blob);
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('Project JSON saved.');
});

loadSaved();
renderSectionControls();
renderPalette();
applyPageSize();
renderCurrentPage();
applyStyleControls(false);
