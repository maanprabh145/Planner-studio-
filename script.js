
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
let extractedPalette = ["#f8f3ea","#64756b","#2e342f","#b7b0a3","#d9c8ae"];

const el = id => document.getElementById(id);
const planner = el("plannerPage");

function showToast(msg) {
  const t = el("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  setTimeout(() => t.classList.add("hidden"), 2400);
}

function makeLines(count=5, className="lines") {
  const d = document.createElement("div");
  d.className = className;
  for (let i=0;i<count;i++) {
    const line = document.createElement("div");
    line.className = "line";
    d.appendChild(line);
  }
  return d;
}

function makeChecks(count=5) {
  const d = document.createElement("div");
  d.className = "check-lines";
  for (let i=0;i<count;i++) {
    const row = document.createElement("div");
    row.className = "check-line";
    const box = document.createElement("span");
    box.className = "box";
    const line = document.createElement("span");
    line.className = "mini-line";
    row.append(box,line);
    d.appendChild(row);
  }
  return d;
}

function headerHtml(eyebrow, title, rightLabel="Date") {
  return `
    <div class="planner-header">
      <div>
        <p class="eyebrow">${eyebrow}</p>
        <h2>${title}</h2>
      </div>
      <div class="date-box">
        <span>${rightLabel}</span>
        <div class="date-line"></div>
      </div>
    </div>
  `;
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

    const title = document.createElement("h3");
    title.className = "card-title";
    title.textContent = section.label;
    card.appendChild(title);
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
    const h = document.createElement("h3");
    h.textContent = day;
    box.appendChild(h);
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
  const h = document.createElement("h3");
  h.className = "card-title";
  h.textContent = "Tasks";
  main.append(h, makeChecks(20));

  const side = document.createElement("aside");
  side.className = "todo-side";
  ["Top 3","Calls / Emails","Errands","Later"].forEach((name,i) => {
    const card = document.createElement("div");
    card.className = "side-card";
    const t = document.createElement("h3");
    t.className = "card-title";
    t.textContent = name;
    card.append(t, i === 0 ? makeChecks(3) : makeLines(4));
    side.appendChild(card);
  });

  wrap.append(main,side);
  container.appendChild(wrap);
}

function renderNotes(container) {
  container.innerHTML = headerHtml("NOTES","Notes","Date");
  const sheet = document.createElement("section");
  sheet.className = "notes-sheet";
  const topic = document.createElement("h3");
  topic.className = "card-title";
  topic.textContent = "Topic";
  sheet.appendChild(topic);
  sheet.appendChild(makeLines(24,"notes-lines"));
  container.appendChild(sheet);
}

function renderHabit(container) {
  container.innerHTML = headerHtml("HABIT TRACKER","My Habits","Week of");
  const sheet = document.createElement("section");
  sheet.className = "habit-sheet";
  const title = document.createElement("h3");
  title.className = "card-title";
  title.textContent = "Weekly habits";
  sheet.appendChild(title);

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
  extractedPalette.forEach((color,idx) => {
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

function averagePaletteFromImage(img,count=5) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d",{willReadFrequently:true});
  canvas.width=120; canvas.height=120;
  ctx.drawImage(img,0,0,120,120);
  const data = ctx.getImageData(0,0,120,120).data;
  const buckets = new Map();

  for (let i=0;i<data.length;i+=16) {
    if (data[i+3] < 180) continue;
    const r = Math.round(data[i]/40)*40;
    const g = Math.round(data[i+1]/40)*40;
    const b = Math.round(data[i+2]/40)*40;
    const key = [Math.min(r,255),Math.min(g,255),Math.min(b,255)].join(",");
    buckets.set(key,(buckets.get(key)||0)+1);
  }

  return [...buckets.entries()]
    .sort((a,b)=>b[1]-a[1])
    .slice(0,count)
    .map(([k]) => {
      const [r,g,b] = k.split(",").map(Number);
      return "#" + [r,g,b].map(v=>v.toString(16).padStart(2,"0")).join("");
    });
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
  extractedPalette = averagePaletteFromImage(img,5);
  if (extractedPalette.length < 3) return showToast("Could not extract enough colors.");
  while (extractedPalette.length < 5) extractedPalette.push("#d9d4c9");
  renderPalette();
  el("bgColor").value = extractedPalette[0];
  el("accentColor").value = extractedPalette[1];
  el("textColor").value = extractedPalette[2];
  el("borderColor").value = extractedPalette[3];
  applyStyleControls();
  showToast("Palette applied to all 6 pages.");
});

document.querySelectorAll("#pageTabs button").forEach(btn => {
  btn.addEventListener("click",() => {
    currentPage = btn.dataset.page;
    renderCurrentPage();
    autosave();
  });
});

["bgColor","accentColor","textColor","borderColor","cornerRadius","spacing","headingFont","bodyFont","stylePreset"]
  .forEach(id => el(id).addEventListener("input",() => {
    applyStyleControls();
    renderCurrentPage();
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

// -------- VECTOR PDF HELPERS --------
function hexToRgb(hex) {
  const clean = hex.replace("#","");
  const value = parseInt(clean.length===3 ? clean.split("").map(c=>c+c).join("") : clean,16);
  return { r:(value>>16)&255, g:(value>>8)&255, b:value&255 };
}
function setPdfColor(pdf,method,hex) {
  const {r,g,b} = hexToRgb(hex);
  pdf[method](r,g,b);
}
function drawPdfHeader(pdf, title, eyebrow, right, cfg) {
  const {w,h,m,accent,text,border} = cfg;
  const top = h*.07;
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
  return top+h*.078;
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
function pdfCfg() {
  const d=pageDimensionsMm();
  return {
    w:d.w,h:d.h,m:d.w*.075,
    bg:el("bgColor").value,
    accent:el("accentColor").value,
    text:el("textColor").value,
    border:el("borderColor").value
  };
}
function pdfBase(pdf,cfg) {
  setPdfColor(pdf,"setFillColor",cfg.bg);
  pdf.rect(0,0,cfg.w,cfg.h,"F");
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
    setPdfColor(pdf,"setTextColor",cfg.accent);
    pdf.setFont("helvetica","bold"); pdf.setFontSize(Math.max(7,cfg.w*.04));
    pdf.text(s.label.toUpperCase(),x+5,y+8);
    const count=s.tall?8:5;
    drawPdfLineSet(pdf,x+5,y+17,colW-10,count,(cardH-24)/count,cfg.border,s.type==="check");
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
    setPdfColor(pdf,"setTextColor",cfg.accent);
    pdf.setFont("helvetica","bold"); pdf.setFontSize(Math.max(7,cfg.w*.038));
    pdf.text(day.toUpperCase(),x+5,y+8);
    drawPdfLineSet(pdf,x+5,y+16,w-10,5,(cardH-22)/5,cfg.border,false);
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
  setPdfColor(pdf,"setTextColor",cfg.accent); pdf.setFont("helvetica","bold"); pdf.setFontSize(Math.max(7,cfg.w*.04));
  pdf.text("TASKS",cfg.m+5,startY+8);
  drawPdfLineSet(pdf,cfg.m+5,startY+18,mainW-10,20,(h-26)/20,cfg.border,true);

  const sx=cfg.m+mainW+gap;
  pdf.roundedRect(sx,startY,sideW,h,4,4,"S");
  const labels=["TOP 3","CALLS / EMAILS","ERRANDS","LATER"];
  const blockH=h/4;
  labels.forEach((lab,i)=>{
    const y=startY+i*blockH;
    setPdfColor(pdf,"setTextColor",cfg.accent); pdf.setFont("helvetica","bold"); pdf.setFontSize(Math.max(6,cfg.w*.032));
    pdf.text(lab,sx+5,y+8);
    drawPdfLineSet(pdf,sx+5,y+16,sideW-10,i===0?3:4,(blockH-22)/(i===0?3:4),cfg.border,i===0);
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
  setPdfColor(pdf,"setTextColor",cfg.accent); pdf.setFont("helvetica","bold"); pdf.setFontSize(Math.max(7,cfg.w*.04));
  pdf.text("TOPIC",cfg.m+5,startY+8);
  drawPdfLineSet(pdf,cfg.m+5,startY+18,cfg.w-cfg.m*2-10,24,(h-26)/24,cfg.border,false);
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
        "<body style='font-family:system-ui;padding:30px'>Preparing your 6-page planner collection…</body>"
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
    const fileName=`planner-collection-${el("pageSize").value}-6-pages.pdf`;

    if(isiPadOrIPhone){
      if(previewWindow) previewWindow.location.href=url;
      else {
        const a=document.createElement("a");
        a.href=url; a.target="_blank"; a.rel="noopener";
        document.body.appendChild(a); a.click(); a.remove();
      }
      showToast("6-page PDF opened. Use Share → Save to Files.");
    } else {
      const a=document.createElement("a");
      a.href=url; a.download=fileName;
      document.body.appendChild(a); a.click(); a.remove();
      showToast("6-page PDF exported.");
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
    version:3,
    currentPage,
    activeSections,
    pageSize:el("pageSize").value,
    stylePreset:el("stylePreset").value,
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
    if(saved.pageSize) el("pageSize").value=saved.pageSize;
    if(saved.stylePreset) el("stylePreset").value=saved.stylePreset;
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
