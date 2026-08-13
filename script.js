
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
let currentPage = "daily";
let activeSections = ["top3","schedule","todo","notes","meals","gratitude"];
let extractedPalette = ["#f6f1ea","#7d8a7d","#3d403d","#c9c0b4","#e6d6c9"];
let detectedMotif = "petals";

const el = id => document.getElementById(id);
const planner = el("plannerPage");

function showToast(msg) {
  const t = el("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  setTimeout(() => t.classList.add("hidden"), 2600);
}

function clamp(v,min,max){ return Math.min(max,Math.max(min,v)); }

function hexToRgb(hex) {
  const clean = hex.replace("#","");
  const full = clean.length === 3 ? clean.split("").map(c=>c+c).join("") : clean;
  const num = parseInt(full,16);
  return { r:(num>>16)&255, g:(num>>8)&255, b:num&255 };
}
function rgbToHex(r,g,b) {
  return "#" + [r,g,b].map(v=>Math.round(v).toString(16).padStart(2,"0")).join("");
}
function rgbToHsl(r,g,b){
  r/=255; g/=255; b/=255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b);
  let h, s, l=(max+min)/2;
  if(max===min){ h=s=0; }
  else{
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
  if(s===0){
    const v=l*255;
    return {r:v,g:v,b:v};
  }
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
function hexToHsl(hex){
  const {r,g,b}=hexToRgb(hex);
  return rgbToHsl(r,g,b);
}
function hslToHex(h,s,l){
  const {r,g,b}=hslToRgb(h,s,l);
  return rgbToHex(r,g,b);
}
function luminance(hex){
  const {r,g,b}=hexToRgb(hex);
  return 0.2126*(r/255)+0.7152*(g/255)+0.0722*(b/255);
}
function blendHex(a,b,amount){
  const ca=hexToRgb(a), cb=hexToRgb(b);
  const r=ca.r*(1-amount)+cb.r*amount;
  const g=ca.g*(1-amount)+cb.g*amount;
  const b2=ca.b*(1-amount)+cb.b*amount;
  return rgbToHex(r,g,b2);
}
function softenHex(hex,{maxSat=34,minLight=36,maxLight=84,targetLight=null,targetSat=null,withCream=0.18}={}){
  const hsl=hexToHsl(hex);
  let s = targetSat !== null ? targetSat : Math.min(hsl.s, maxSat);
  let l = targetLight !== null ? targetLight : clamp(hsl.l, minLight, maxLight);
  let out = hslToHex(hsl.h, s, l);
  if(withCream>0) out = blendHex(out, "#faf6ef", withCream);
  return out;
}
function buildSoftPalette(raw){
  const sorted=[...raw].sort((a,b)=>luminance(b)-luminance(a));
  const lightest=sorted[0] || "#f5efe6";
  const second=sorted[1] || raw[1] || "#d9cec0";
  const darkest=[...raw].sort((a,b)=>luminance(a)-luminance(b))[0] || "#444";
  const middle=raw[1] || raw[0] || "#8a978a";
  const warm=raw[2] || second;

  const bg = softenHex(lightest,{maxSat:18,targetLight:94,withCream:0.40});
  const accent = softenHex(middle,{maxSat:34,targetLight:58,withCream:0.18});
  const text = softenHex(darkest,{maxSat:20,targetLight:26,withCream:0.05});
  const border = blendHex(accent,bg,0.56);
  const softExtra1 = softenHex(second,{maxSat:26,targetLight:78,withCream:0.18});
  const softExtra2 = softenHex(warm,{maxSat:30,targetLight:72,withCream:0.15});

  return [bg, accent, text, border, softExtra1, softExtra2];
}
function averagePaletteFromImage(img,count=5) {
  const canvas=document.createElement("canvas");
  const ctx=canvas.getContext("2d",{willReadFrequently:true});
  canvas.width=140; canvas.height=140;
  ctx.drawImage(img,0,0,140,140);
  const data=ctx.getImageData(0,0,140,140).data;
  const buckets=new Map();

  for(let i=0;i<data.length;i+=16){
    if(data[i+3]<180) continue;
    const r=Math.round(data[i]/32)*32;
    const g=Math.round(data[i+1]/32)*32;
    const b=Math.round(data[i+2]/32)*32;
    const key=[Math.min(r,255),Math.min(g,255),Math.min(b,255)].join(",");
    buckets.set(key,(buckets.get(key)||0)+1);
  }
  const raw=[...buckets.entries()]
    .sort((a,b)=>b[1]-a[1])
    .slice(0,count)
    .map(([k])=>{
      const [r,g,b]=k.split(",").map(Number);
      return rgbToHex(r,g,b);
    });

  return raw.length ? raw : ["#e8dfd6","#afbcac","#7f817a","#d3c3b2","#d9d0c4"];
}
function chooseMotifFromPalette(palette){
  const sample = palette[4] || palette[1] || "#cda6b6";
  const {h,s,l} = hexToHsl(sample);
  if(h >= 320 || h <= 18) return "bows";
  if(h > 18 && h <= 55) return "petals";
  if(h > 55 && h <= 105) return "scallops";
  if(h > 105 && h <= 165) return "leaves";
  if(h > 165 && h <= 235) return "waves";
  if(h > 235 && h <= 310) return "stars";
  return "petals";
}
function currentMotif(){
  const chosen = el("motifStyle").value;
  return chosen === "auto" ? detectedMotif : chosen;
}
function titleIconSvg(){
  return motifSvg(currentMotif(),"mini");
}
function motifSvg(type, placement="mini"){
  const cls = placement === "mini" ? "motif-mini" : "ornament-corner " + placement;
  if(type==="petals"){
    return `<svg class="${cls}" viewBox="0 0 48 24" fill="none" stroke="currentColor" stroke-width="1.6">
      <circle cx="24" cy="12" r="2.2" fill="currentColor" opacity=".7"/>
      <ellipse cx="24" cy="5.8" rx="4.4" ry="2.7"/>
      <ellipse cx="24" cy="18.2" rx="4.4" ry="2.7"/>
      <ellipse cx="16.8" cy="12" rx="4.4" ry="2.7" transform="rotate(-90 16.8 12)"/>
      <ellipse cx="31.2" cy="12" rx="4.4" ry="2.7" transform="rotate(-90 31.2 12)"/>
    </svg>`;
  }
  if(type==="leaves"){
    return `<svg class="${cls}" viewBox="0 0 48 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
      <path d="M10 16c6-8 12-9 18-7-3 6-8 10-18 7z"/>
      <path d="M20 9c2 4 4 7 8 9"/>
      <path d="M28 14c3-5 8-7 14-5-2 5-5 8-12 8"/>
    </svg>`;
  }
  if(type==="bows"){
    return `<svg class="${cls}" viewBox="0 0 48 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M24 12c-3-2-6-4-9-4-2.6 0-3.8 2.2-2.9 4.2 1 2.1 3.8 2.8 7.1 2.3"/>
      <path d="M24 12c3-2 6-4 9-4 2.6 0 3.8 2.2 2.9 4.2-1 2.1-3.8 2.8-7.1 2.3"/>
      <circle cx="24" cy="12" r="2.2"/>
      <path d="M22.8 13.7l-4.2 5.8M25.2 13.7l4.2 5.8"/>
    </svg>`;
  }
  if(type==="stars"){
    return `<svg class="${cls}" viewBox="0 0 48 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
      <path d="M12 5v10M7 10h10M8.5 6.5l7 7M15.5 6.5l-7 7"/>
      <path d="M31 8v8M27 12h8M28.5 9.5l5 5M33.5 9.5l-5 5"/>
    </svg>`;
  }
  if(type==="waves"){
    return `<svg class="${cls}" viewBox="0 0 48 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
      <path d="M3 9c4 0 4 4 8 4s4-4 8-4 4 4 8 4 4-4 8-4 4 4 8 4"/>
      <path d="M3 15c4 0 4 4 8 4s4-4 8-4 4 4 8 4 4-4 8-4 4 4 8 4" opacity=".75"/>
    </svg>`;
  }
  if(type==="scallops"){
    return `<svg class="${cls}" viewBox="0 0 48 24" fill="none" stroke="currentColor" stroke-width="1.6">
      <path d="M4 16c2.6 0 2.6-4 5.2-4s2.6 4 5.2 4 2.6-4 5.2-4 2.6 4 5.2 4 2.6-4 5.2-4 2.6 4 5.2 4 2.6-4 5.2-4"/>
      <path d="M4 11c2.6 0 2.6-4 5.2-4s2.6 4 5.2 4 2.6-4 5.2-4 2.6 4 5.2 4 2.6-4 5.2-4 2.6 4 5.2 4 2.6-4 5.2-4" opacity=".72"/>
    </svg>`;
  }
  return motifSvg("petals", placement);
}
function ornamentRowHtml(){
  const motif = currentMotif();
  return `<div class="ornament-row">
    ${motifSvg(motif,"mini")}
    ${motifSvg(motif,"mini")}
    ${motifSvg(motif,"mini")}
  </div>`;
}
function headerHtml(eyebrow, title, rightLabel="Date") {
  const motif = currentMotif();
  return `
    <div class="planner-header">
      <div class="header-left">
        ${motifSvg(motif,"left")}
        <p class="eyebrow">${eyebrow}</p>
        <h2>${title}</h2>
      </div>
      <div class="header-right">
        ${motifSvg(motif,"right")}
        <div class="date-box">
          <span>${rightLabel}</span>
          <div class="date-line"></div>
        </div>
      </div>
    </div>
    ${ornamentRowHtml()}
  `;
}
function titledBlockHeading(label){
  return `
    <div class="title-with-icon">
      <span class="title-icon">${titleIconSvg()}</span>
      <h3 class="card-title">${label}</h3>
    </div>
  `;
}
function makeLines(count=5, className="lines") {
  const d=document.createElement("div");
  d.className=className;
  for(let i=0;i<count;i++){
    const line=document.createElement("div");
    line.className="line";
    d.appendChild(line);
  }
  return d;
}
function makeChecks(count=5) {
  const d=document.createElement("div");
  d.className="check-lines";
  for(let i=0;i<count;i++){
    const row=document.createElement("div");
    row.className="check-line";
    const box=document.createElement("span");
    box.className="box";
    const line=document.createElement("span");
    line.className="mini-line";
    row.append(box,line);
    d.appendChild(row);
  }
  return d;
}

function renderDaily(container) {
  container.innerHTML = headerHtml("DAILY PLANNER","Today");
  const grid = document.createElement("div");
  grid.className = "planner-grid";

  activeSections.forEach((id,idx) => {
    const section = sections.find(s => s.id === id);
    if (!section) return;
    const card = document.createElement("section");
    card.className = "planner-card";
    if (section.tall) card.classList.add("tall");
    if (idx === activeSections.length - 1 && activeSections.length % 2 === 1) card.classList.add("wide");
    card.innerHTML = titledBlockHeading(section.label);
    card.appendChild(section.type === "check" ? makeChecks(section.tall ? 8 : 5) : makeLines(section.tall ? 9 : 5));
    grid.appendChild(card);
  });
  container.appendChild(grid);
}

function renderWeekly(container) {
  container.innerHTML = headerHtml("WEEKLY PLANNER","This Week","Week of");
  const grid = document.createElement("div");
  grid.className = "week-grid";
  ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].forEach(day => {
    const box = document.createElement("section");
    box.className = "week-day";
    box.innerHTML = titledBlockHeading(day);
    box.appendChild(makeLines(day === "Sunday" ? 7 : 5));
    grid.appendChild(box);
  });
  container.appendChild(grid);
}

function renderMonthly(container) {
  container.innerHTML = headerHtml("MONTHLY PLANNER","This Month","Month");
  const names = document.createElement("div");
  names.className = "month-weekdays";
  ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].forEach(d => {
    const x = document.createElement("div");
    x.textContent = d;
    names.appendChild(x);
  });
  const grid = document.createElement("div");
  grid.className = "month-grid";
  for (let i=1;i<=42;i++) {
    const c = document.createElement("div");
    c.className = "month-cell";
    const n = document.createElement("span");
    n.className = "num";
    n.textContent = i <= 31 ? i : "";
    c.appendChild(n);
    grid.appendChild(c);
  }
  container.append(names,grid);
}

function renderTodo(container) {
  container.innerHTML = headerHtml("MASTER LIST","To-Do","Date");
  const wrap = document.createElement("div");
  wrap.className = "todo-layout";

  const main = document.createElement("section");
  main.className = "todo-main";
  main.innerHTML = titledBlockHeading("Tasks");
  main.append(makeChecks(20));

  const side = document.createElement("aside");
  side.className = "todo-side";
  ["Top 3","Calls / Emails","Errands","Later"].forEach((name,i) => {
    const card = document.createElement("div");
    card.className = "side-card";
    card.innerHTML = titledBlockHeading(name);
    card.append(i === 0 ? makeChecks(3) : makeLines(4));
    side.appendChild(card);
  });

  wrap.append(main,side);
  container.appendChild(wrap);
}

function renderNotes(container) {
  container.innerHTML = headerHtml("NOTES","Notes","Date");
  const sheet = document.createElement("section");
  sheet.className = "notes-sheet";
  sheet.innerHTML = titledBlockHeading("Topic");
  sheet.appendChild(makeLines(24,"notes-lines"));
  container.appendChild(sheet);
}

function renderHabit(container) {
  container.innerHTML = headerHtml("HABIT TRACKER","My Habits","Week of");
  const sheet = document.createElement("section");
  sheet.className = "habit-sheet";
  sheet.innerHTML = titledBlockHeading("Weekly habits");

  const table = document.createElement("div");
  table.className = "habit-table";
  const heads = ["Habit","M","T","W","T","F","S","S"];
  heads.forEach((x,i) => {
    const c = document.createElement("div");
    c.className = "head" + (i===0 ? " habit-name" : "");
    c.textContent = x;
    table.appendChild(c);
  });

  for (let r=1;r<=10;r++) {
    for (let c=0;c<8;c++) {
      const cell = document.createElement("div");
      if (c===0) {
        cell.className = "habit-name";
        cell.textContent = `Habit ${r}`;
      } else {
        const box = document.createElement("span");
        box.className = "box";
        cell.appendChild(box);
      }
      table.appendChild(cell);
    }
  }
  sheet.appendChild(table);
  container.appendChild(sheet);
}

function renderCurrentPage() {
  const container = el("plannerContent");
  container.innerHTML = "";
  if (currentPage === "daily") renderDaily(container);
  if (currentPage === "weekly") renderWeekly(container);
  if (currentPage === "monthly") renderMonthly(container);
  if (currentPage === "todo") renderTodo(container);
  if (currentPage === "notes") renderNotes(container);
  if (currentPage === "habit") renderHabit(container);

  document.querySelectorAll("#pageTabs button").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.page === currentPage);
  });

  el("motifLabel").textContent = currentMotif().charAt(0).toUpperCase() + currentMotif().slice(1);
  applyStyleControls(false);
}

function renderSectionControls() {
  const wrap = el("sectionControls");
  wrap.innerHTML = "";
  sections.forEach(section => {
    const label = document.createElement("label");
    label.className = "section-toggle";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = activeSections.includes(section.id);
    input.addEventListener("change", () => {
      if (input.checked) activeSections.push(section.id);
      else activeSections = activeSections.filter(id => id !== section.id);
      if (currentPage === "daily") renderCurrentPage();
      autosave();
    });
    const span = document.createElement("span");
    span.textContent = section.label;
    label.append(input,span);
    wrap.appendChild(label);
  });
}

function renderPalette() {
  const wrap = el("palette");
  wrap.innerHTML = "";
  extractedPalette.slice(0,5).forEach((color,idx) => {
    const swatch = document.createElement("button");
    swatch.className = "swatch";
    swatch.style.background = color;
    swatch.title = color;
    swatch.addEventListener("click", () => {
      if (idx===0) el("bgColor").value = color;
      else if (idx===1) el("accentColor").value = color;
      else if (idx===2) el("textColor").value = color;
      else el("borderColor").value = color;
      applyStyleControls();
    });
    wrap.appendChild(swatch);
  });
}

function applyStyleControls(save=true) {
  planner.style.setProperty("--page-bg", el("bgColor").value);
  planner.style.setProperty("--page-accent", el("accentColor").value);
  planner.style.setProperty("--page-text", el("textColor").value);
  planner.style.setProperty("--page-border", el("borderColor").value);
  planner.style.setProperty("--page-radius", el("cornerRadius").value + "px");
  planner.style.setProperty("--page-gap", el("spacing").value + "px");
  planner.style.fontFamily = el("bodyFont").value;
  const title = planner.querySelector(".planner-header h2");
  if (title) title.style.fontFamily = el("headingFont").value;
  planner.className = "planner-page " + el("stylePreset").value;
  el("motifLabel").textContent = currentMotif().charAt(0).toUpperCase() + currentMotif().slice(1);
  if (save) autosave();
}

function pageDimensionsPx() {
  const size = el("pageSize").value;
  if (size==="a4") return {w:595,h:842};
  if (size==="a5") return {w:420,h:595};
  return {w:612,h:792};
}
function pageDimensionsMm() {
  const size = el("pageSize").value;
  if (size==="a4") return {w:210,h:297};
  if (size==="a5") return {w:148,h:210};
  return {w:215.9,h:279.4};
}

function applyPageSize() {
  const d = pageDimensionsPx();
  planner.style.width = d.w + "px";
  planner.style.minHeight = d.h + "px";
  autosave();
}

el("imageInput").addEventListener("change",e => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = el("imagePreview");
    img.src = reader.result;
    img.classList.remove("hidden");
  };
  reader.readAsDataURL(file);
});

el("extractPaletteBtn").addEventListener("click",() => {
  if (!el("rightsCheck").checked) return showToast("Please confirm the image-use checkbox first.");
  const img = el("imagePreview");
  if (!img.src) return showToast("Upload an inspiration image first.");

  const raw = averagePaletteFromImage(img,5);
  const soft = buildSoftPalette(raw);
  extractedPalette = soft;
  detectedMotif = chooseMotifFromPalette(soft);

  renderPalette();
  el("bgColor").value = soft[0];
  el("accentColor").value = soft[1];
  el("textColor").value = soft[2];
  el("borderColor").value = soft[3];
  renderCurrentPage();
  applyStyleControls();
  showToast(`Soft palette applied. Motif: ${currentMotif()}.`);
});

document.querySelectorAll("#pageTabs button").forEach(btn => {
  btn.addEventListener("click",() => {
    currentPage = btn.dataset.page;
    renderCurrentPage();
    autosave();
  });
});

["bgColor","accentColor","textColor","borderColor","cornerRadius","spacing","headingFont","bodyFont","stylePreset","motifStyle"]
  .forEach(id => el(id).addEventListener("input",() => {
    renderCurrentPage();
    applyStyleControls();
  }));

el("pageSize").addEventListener("change",() => {
  applyPageSize();
  renderCurrentPage();
});

el("regenerateBtn").addEventListener("click",() => {
  activeSections = [...activeSections].sort(() => Math.random() - .5);
  renderSectionControls();
  currentPage = "daily";
  renderCurrentPage();
  showToast("Daily layout regenerated.");
  autosave();
});

async function plannerCanvas(scale=3) {
  return await html2canvas(planner,{
    scale,
    backgroundColor:el("bgColor").value,
    useCORS:true,
    logging:false
  });
}

el("exportPngBtn").addEventListener("click",async() => {
  try {
    showToast("Preparing PNG...");
    const canvas = await plannerCanvas(3);
    const a = document.createElement("a");
    a.download = `${currentPage}-${el("pageSize").value}.png`;
    a.href = canvas.toDataURL("image/png");
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast("Current page PNG exported.");
  } catch(err) {
    console.error(err);
    showToast("PNG export failed.");
  }
});

// --- PDF helpers ---
function setPdfColor(pdf,method,hex) {
  const {r,g,b} = hexToRgb(hex);
  pdf[method](r,g,b);
}
function pdfCfg() {
  const d=pageDimensionsMm();
  return {
    w:d.w,h:d.h,m:d.w*.075,
    bg:el("bgColor").value,
    accent:el("accentColor").value,
    text:el("textColor").value,
    border:el("borderColor").value,
    motif: currentMotif()
  };
}
function pdfBase(pdf,cfg) {
  setPdfColor(pdf,"setFillColor",cfg.bg);
  pdf.rect(0,0,cfg.w,cfg.h,"F");
}
function drawPdfSimpleMotif(pdf,cfg,x,y,scale=1){
  const type=cfg.motif;
  setPdfColor(pdf,"setDrawColor",cfg.accent);
  setPdfColor(pdf,"setFillColor",cfg.accent);
  pdf.setLineWidth(0.25);
  if(type==="petals"){
    pdf.circle(x,y,0.8*scale,"F");
    pdf.ellipse(x,y-1.8*scale,1.2*scale,0.8*scale,"S");
    pdf.ellipse(x,y+1.8*scale,1.2*scale,0.8*scale,"S");
    pdf.ellipse(x-1.8*scale,y,0.8*scale,1.2*scale,"S");
    pdf.ellipse(x+1.8*scale,y,0.8*scale,1.2*scale,"S");
  } else if(type==="leaves"){
    pdf.ellipse(x-1.6*scale,y,1.8*scale,1.0*scale,"S");
    pdf.ellipse(x+1.8*scale,y-0.4*scale,1.8*scale,1.0*scale,"S");
    pdf.line(x-2.3*scale,y+1.3*scale,x+2.7*scale,y-1.2*scale);
  } else if(type==="bows"){
    pdf.ellipse(x-2*scale,y,1.6*scale,1.2*scale,"S");
    pdf.ellipse(x+2*scale,y,1.6*scale,1.2*scale,"S");
    pdf.circle(x,y,0.8*scale,"S");
    pdf.line(x-0.5*scale,y+0.8*scale,x-2*scale,y+3*scale);
    pdf.line(x+0.5*scale,y+0.8*scale,x+2*scale,y+3*scale);
  } else if(type==="stars"){
    pdf.line(x-2*scale,y,x+2*scale,y);
    pdf.line(x,y-2*scale,x,y+2*scale);
    pdf.line(x-1.4*scale,y-1.4*scale,x+1.4*scale,y+1.4*scale);
    pdf.line(x-1.4*scale,y+1.4*scale,x+1.4*scale,y-1.4*scale);
  } else if(type==="waves"){
    pdf.lines([[1.2*scale,-1.2*scale],[1.2*scale,1.2*scale],[1.2*scale,-1.2*scale],[1.2*scale,1.2*scale],[1.2*scale,-1.2*scale]],x-3*scale,y);
    pdf.lines([[1.2*scale,-1.2*scale],[1.2*scale,1.2*scale],[1.2*scale,-1.2*scale],[1.2*scale,1.2*scale],[1.2*scale,-1.2*scale]],x-3*scale,y+2.4*scale);
  } else if(type==="scallops"){
    for(let i=0;i<4;i++) pdf.ellipse(x-3*scale+i*2*scale,y,1*scale,0.8*scale,"S");
    for(let i=0;i<4;i++) pdf.ellipse(x-3*scale+i*2*scale,y+1.7*scale,1*scale,0.8*scale,"S");
  }
}
function drawPdfHeader(pdf, title, eyebrow, right, cfg) {
  const {w,h,m,accent,text,border} = cfg;
  const top = h*.07;
  drawPdfSimpleMotif(pdf,cfg,m+5,top-1.4,0.7);
  drawPdfSimpleMotif(pdf,cfg,w-m-8,top-1.4,0.7);

  setPdfColor(pdf,"setTextColor",accent);
  pdf.setFont("helvetica","bold");
  pdf.setFontSize(Math.max(7,w*.04));
  pdf.text(eyebrow,m,top);

  setPdfColor(pdf,"setTextColor",text);
  pdf.setFont("times","normal");
  pdf.setFontSize(Math.max(20,w*.14));
  pdf.text(title,m,top+h*.045);

  setPdfColor(pdf,"setTextColor",accent);
  pdf.setFont("helvetica","bold");
  pdf.setFontSize(Math.max(7,w*.04));
  pdf.text(right,w-m-35,top+h*.023);
  setPdfColor(pdf,"setDrawColor",border);
  pdf.setLineWidth(.25);
  pdf.line(w-m-35,top+h*.035,w-m,top+h*.035);

  setPdfColor(pdf,"setDrawColor",accent);
  pdf.setLineWidth(.5);
  pdf.line(m,top+h*.058,w-m,top+h*.058);

  // centered ornament row
  drawPdfSimpleMotif(pdf,cfg,w/2-10,top+h*.067,0.55);
  drawPdfSimpleMotif(pdf,cfg,w/2,top+h*.067,0.55);
  drawPdfSimpleMotif(pdf,cfg,w/2+10,top+h*.067,0.55);

  return top+h*.082;
}
function drawPdfFooter(pdf,cfg) {
  const {w,h,accent} = cfg;
  setPdfColor(pdf,"setTextColor",accent);
  pdf.setFont("helvetica","normal");
  pdf.setFontSize(Math.max(6.5,w*.031));
  pdf.text("Make room for what matters.",w/2,h-h*.028,{align:"center"});
}
function drawPdfLineSet(pdf,x,y,w,count,gap,border,checks=false) {
  setPdfColor(pdf,"setDrawColor",border);
  pdf.setLineWidth(.2);
  for(let i=0;i<count;i++) {
    const yy=y+i*gap;
    if(checks) {
      pdf.rect(x,yy-2.1,2.6,2.6);
      pdf.line(x+5.5,yy,x+w,yy);
    } else {
      pdf.line(x,yy,x+w,yy);
    }
  }
}
function drawPdfTitleWithIcon(pdf,label,x,y,cfg){
  drawPdfSimpleMotif(pdf,cfg,x+2.5,y-1.1,0.42);
  setPdfColor(pdf,"setTextColor",cfg.accent);
  pdf.setFont("helvetica","bold");
  pdf.setFontSize(Math.max(6.7,cfg.w*.036));
  pdf.text(label.toUpperCase(),x+7,y);
}

function drawDailyPdf(pdf,cfg) {
  pdfBase(pdf,cfg);
  const startY=drawPdfHeader(pdf,"Today","DAILY PLANNER","DATE",cfg);
  const gap=cfg.w*.028;
  const colW=(cfg.w-cfg.m*2-gap)/2;
  const enabled=activeSections.map(id=>sections.find(s=>s.id===id)).filter(Boolean);
  const rows=Math.max(1,Math.ceil(enabled.length/2));
  const bottom=cfg.h*.07;
  const rowGap=cfg.h*.025;
  const cardH=(cfg.h-startY-bottom-rowGap*(rows-1))/rows;

  enabled.forEach((s,i)=>{
    const row=Math.floor(i/2), col=i%2;
    const x=cfg.m+col*(colW+gap), y=startY+row*(cardH+rowGap);
    setPdfColor(pdf,"setDrawColor",cfg.border);
    pdf.setLineWidth(.25);
    pdf.roundedRect(x,y,colW,cardH,4,4,"S");
    drawPdfTitleWithIcon(pdf,s.label,x+2,y+8,cfg);
    const count=s.tall?8:5;
    drawPdfLineSet(pdf,x+5,y+18,colW-10,count,(cardH-25)/count,cfg.border,s.type==="check");
  });
  drawPdfFooter(pdf,cfg);
}

function drawWeeklyPdf(pdf,cfg) {
  pdfBase(pdf,cfg);
  const startY=drawPdfHeader(pdf,"This Week","WEEKLY PLANNER","WEEK OF",cfg);
  const gap=cfg.w*.025;
  const colW=(cfg.w-cfg.m*2-gap)/2;
  const days=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const rowGap=cfg.h*.018;
  const cardH=(cfg.h-startY-cfg.h*.075-rowGap*3)/4;
  days.forEach((day,i)=>{
    let x,y,w=colW;
    if(i<6){
      const row=Math.floor(i/2), col=i%2;
      x=cfg.m+col*(colW+gap); y=startY+row*(cardH+rowGap);
    } else {
      x=cfg.m; y=startY+3*(cardH+rowGap); w=cfg.w-cfg.m*2;
    }
    setPdfColor(pdf,"setDrawColor",cfg.border); pdf.setLineWidth(.25);
    pdf.roundedRect(x,y,w,cardH,4,4,"S");
    drawPdfTitleWithIcon(pdf,day,x+2,y+8,cfg);
    drawPdfLineSet(pdf,x+5,y+17,w-10,5,(cardH-23)/5,cfg.border,false);
  });
  drawPdfFooter(pdf,cfg);
}

function drawMonthlyPdf(pdf,cfg) {
  pdfBase(pdf,cfg);
  const startY=drawPdfHeader(pdf,"This Month","MONTHLY PLANNER","MONTH",cfg);
  const days=["SUN","MON","TUE","WED","THU","FRI","SAT"];
  const gridW=cfg.w-cfg.m*2;
  const cellW=gridW/7;
  const headY=startY+3;
  setPdfColor(pdf,"setTextColor",cfg.accent);
  pdf.setFont("helvetica","bold"); pdf.setFontSize(Math.max(5.8,cfg.w*.028));
  days.forEach((d,i)=>pdf.text(d,cfg.m+i*cellW+cellW/2,headY,{align:"center"}));
  const gridY=startY+8;
  const gridH=cfg.h-gridY-cfg.h*.07;
  const cellH=gridH/6;
  let n=1;
  for(let r=0;r<6;r++){
    for(let c=0;c<7;c++){
      const x=cfg.m+c*cellW, y=gridY+r*cellH;
      setPdfColor(pdf,"setDrawColor",cfg.border); pdf.setLineWidth(.18);
      pdf.rect(x,y,cellW,cellH);
      if(n<=31){
        setPdfColor(pdf,"setTextColor",cfg.accent);
        pdf.setFont("helvetica","normal"); pdf.setFontSize(Math.max(5.5,cfg.w*.026));
        pdf.text(String(n),x+2.5,y+4.5); n++;
      }
    }
  }
  drawPdfFooter(pdf,cfg);
}

function drawTodoPdf(pdf,cfg) {
  pdfBase(pdf,cfg);
  const startY=drawPdfHeader(pdf,"To-Do","MASTER LIST","DATE",cfg);
  const gap=cfg.w*.025;
  const totalW=cfg.w-cfg.m*2;
  const mainW=totalW*.64;
  const sideW=totalW-mainW-gap;
  const h=cfg.h-startY-cfg.h*.075;

  setPdfColor(pdf,"setDrawColor",cfg.border); pdf.setLineWidth(.25);
  pdf.roundedRect(cfg.m,startY,mainW,h,4,4,"S");
  drawPdfTitleWithIcon(pdf,"Tasks",cfg.m+2,startY+8,cfg);
  drawPdfLineSet(pdf,cfg.m+5,startY+19,mainW-10,20,(h-28)/20,cfg.border,true);

  const sx=cfg.m+mainW+gap;
  pdf.roundedRect(sx,startY,sideW,h,4,4,"S");
  const labels=["Top 3","Calls / Emails","Errands","Later"];
  const blockH=h/4;
  labels.forEach((lab,i)=>{
    const y=startY+i*blockH;
    drawPdfTitleWithIcon(pdf,lab,sx+2,y+8,cfg);
    drawPdfLineSet(pdf,sx+5,y+17,sideW-10,i===0?3:4,(blockH-23)/(i===0?3:4),cfg.border,i===0);
    if(i<3){ setPdfColor(pdf,"setDrawColor",cfg.border); pdf.line(sx+4,y+blockH,sx+sideW-4,y+blockH); }
  });
  drawPdfFooter(pdf,cfg);
}

function drawNotesPdf(pdf,cfg) {
  pdfBase(pdf,cfg);
  const startY=drawPdfHeader(pdf,"Notes","NOTES","DATE",cfg);
  const h=cfg.h-startY-cfg.h*.075;
  setPdfColor(pdf,"setDrawColor",cfg.border); pdf.setLineWidth(.25);
  pdf.roundedRect(cfg.m,startY,cfg.w-cfg.m*2,h,4,4,"S");
  drawPdfTitleWithIcon(pdf,"Topic",cfg.m+2,startY+8,cfg);
  drawPdfLineSet(pdf,cfg.m+5,startY+19,cfg.w-cfg.m*2-10,24,(h-28)/24,cfg.border,false);
  drawPdfFooter(pdf,cfg);
}

function drawHabitPdf(pdf,cfg) {
  pdfBase(pdf,cfg);
  const startY=drawPdfHeader(pdf,"My Habits","HABIT TRACKER","WEEK OF",cfg);
  const x=cfg.m, y=startY+8;
  const totalW=cfg.w-cfg.m*2;
  const nameW=totalW*.34;
  const dayW=(totalW-nameW)/7;
  const rowH=(cfg.h-y-cfg.h*.085)/11;

  const headers=["HABIT","M","T","W","T","F","S","S"];
  for(let c=0;c<8;c++){
    const cx = c===0 ? x : x+nameW+(c-1)*dayW;
    const cw = c===0 ? nameW : dayW;
    setPdfColor(pdf,"setDrawColor",cfg.border); pdf.setLineWidth(.2);
    pdf.rect(cx,y,cw,rowH);
    setPdfColor(pdf,"setTextColor",cfg.accent); pdf.setFont("helvetica","bold"); pdf.setFontSize(Math.max(5.5,cfg.w*.027));
    pdf.text(headers[c],cx+cw/2,y+rowH*.62,{align:"center"});
  }

  for(let r=1;r<=10;r++){
    const ry=y+r*rowH;
    for(let c=0;c<8;c++){
      const cx=c===0?x:x+nameW+(c-1)*dayW;
      const cw=c===0?nameW:dayW;
      setPdfColor(pdf,"setDrawColor",cfg.border); pdf.rect(cx,ry,cw,rowH);
      if(c===0){
        setPdfColor(pdf,"setTextColor",cfg.accent); pdf.setFont("helvetica","normal"); pdf.setFontSize(Math.max(5.5,cfg.w*.027));
        pdf.text(`Habit ${r}`,cx+3,ry+rowH*.62);
      }else{
        const box=Math.min(3.2,rowH*.35);
        pdf.rect(cx+cw/2-box/2,ry+rowH/2-box/2,box,box);
      }
    }
  }
  drawPdfFooter(pdf,cfg);
}

function drawVectorPage(pdf,type,cfg){
  if(type==="daily") drawDailyPdf(pdf,cfg);
  if(type==="weekly") drawWeeklyPdf(pdf,cfg);
  if(type==="monthly") drawMonthlyPdf(pdf,cfg);
  if(type==="todo") drawTodoPdf(pdf,cfg);
  if(type==="notes") drawNotesPdf(pdf,cfg);
  if(type==="habit") drawHabitPdf(pdf,cfg);
}

el("exportPdfBtn").addEventListener("click",async() => {
  const isiPadOrIPhone =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform==="MacIntel" && navigator.maxTouchPoints>1);

  let previewWindow=null;
  if(isiPadOrIPhone){
    previewWindow=window.open("","_blank");
    if(previewWindow){
      previewWindow.document.write(
        "<!doctype html><title>Preparing PDF...</title><meta name='viewport' content='width=device-width,initial-scale=1'>" +
        "<body style='font-family:system-ui;padding:30px'>Preparing your styled 6-page planner collection…</body>"
      );
    }
  }

  try{
    if(!window.jspdf || !window.jspdf.jsPDF) throw new Error("jsPDF did not load.");
    showToast("Building 6-page PDF...");
    const {jsPDF}=window.jspdf;
    const cfg=pdfCfg();

    const pdf=new jsPDF({
      orientation:"portrait",
      unit:"mm",
      format:[cfg.w,cfg.h],
      compress:true
    });

    pageTypes.forEach((type,index)=>{
      if(index>0) pdf.addPage([cfg.w,cfg.h],"portrait");
      drawVectorPage(pdf,type,cfg);
    });

    const blob=pdf.output("blob");
    const url=URL.createObjectURL(blob);
    const fileName=`planner-collection-styled-${el("pageSize").value}.pdf`;

    if(isiPadOrIPhone){
      if(previewWindow) previewWindow.location.href=url;
      else {
        const a=document.createElement("a");
        a.href=url; a.target="_blank"; a.rel="noopener";
        document.body.appendChild(a); a.click(); a.remove();
      }
      showToast("Styled 6-page PDF opened. Use Share → Save to Files.");
    } else {
      const a=document.createElement("a");
      a.href=url; a.download=fileName;
      document.body.appendChild(a); a.click(); a.remove();
      showToast("Styled 6-page PDF exported.");
    }
    setTimeout(()=>URL.revokeObjectURL(url),120000);
  }catch(err){
    console.error(err);
    if(previewWindow && !previewWindow.closed){
      previewWindow.document.body.innerHTML="<p style='font-family:system-ui;padding:24px'>PDF export failed. Return to Planner Studio and try again.</p>";
    }
    showToast("PDF export failed.");
  }
});

function projectData(){
  return {
    version:4,
    currentPage,
    activeSections,
    pageSize:el("pageSize").value,
    stylePreset:el("stylePreset").value,
    motifStyle:el("motifStyle").value,
    detectedMotif,
    palette:{
      background:el("bgColor").value,
      accent:el("accentColor").value,
      text:el("textColor").value,
      border:el("borderColor").value
    },
    typography:{
      heading:el("headingFont").value,
      body:el("bodyFont").value
    },
    cornerRadius:el("cornerRadius").value,
    spacing:el("spacing").value
  };
}
function autosave(){
  localStorage.setItem("plannerStudioProject",JSON.stringify(projectData()));
}
function loadSaved(){
  try{
    const saved=JSON.parse(localStorage.getItem("plannerStudioProject"));
    if(!saved) return;
    currentPage=saved.currentPage || currentPage;
    activeSections=saved.activeSections || activeSections;
    detectedMotif=saved.detectedMotif || detectedMotif;
    if(saved.pageSize) el("pageSize").value=saved.pageSize;
    if(saved.stylePreset) el("stylePreset").value=saved.stylePreset;
    if(saved.motifStyle) el("motifStyle").value=saved.motifStyle;
    if(saved.palette){
      el("bgColor").value=saved.palette.background || el("bgColor").value;
      el("accentColor").value=saved.palette.accent || el("accentColor").value;
      el("textColor").value=saved.palette.text || el("textColor").value;
      el("borderColor").value=saved.palette.border || el("borderColor").value;
    }
    if(saved.typography){
      el("headingFont").value=saved.typography.heading || el("headingFont").value;
      el("bodyFont").value=saved.typography.body || el("bodyFont").value;
    }
    if(saved.cornerRadius) el("cornerRadius").value=saved.cornerRadius;
    if(saved.spacing) el("spacing").value=saved.spacing;
  }catch{}
}

el("saveProjectBtn").addEventListener("click",()=>{
  autosave();
  const blob=new Blob([JSON.stringify(projectData(),null,2)],{type:"application/json"});
  const a=document.createElement("a");
  a.download="planner-studio-project.json";
  a.href=URL.createObjectURL(blob);
  a.click();
  URL.revokeObjectURL(a.href);
  showToast("Project JSON saved.");
});

loadSaved();
renderSectionControls();
renderPalette();
applyPageSize();
renderCurrentPage();
applyStyleControls(false);
