
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

let activeSections = ["top3", "schedule", "todo", "notes", "meals", "gratitude"];
let extractedPalette = ["#f8f3ea", "#64756b", "#2e342f", "#b7b0a3", "#d9c8ae"];

const el = id => document.getElementById(id);
const planner = el("plannerPage");

function showToast(msg) {
  const t = el("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  setTimeout(() => t.classList.add("hidden"), 2200);
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
      renderPlanner();
      autosave();
    });
    const span = document.createElement("span");
    span.textContent = section.label;
    label.append(input, span);
    wrap.appendChild(label);
  });
}

function makeLines(count=5) {
  const d = document.createElement("div");
  d.className = "lines";
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
    row.append(box, line);
    d.appendChild(row);
  }
  return d;
}

function renderPlanner() {
  const grid = el("plannerGrid");
  grid.innerHTML = "";

  activeSections.forEach((id, idx) => {
    const section = sections.find(s => s.id === id);
    if (!section) return;

    const card = document.createElement("section");
    card.className = "planner-card";
    if (section.tall) card.classList.add("tall");
    if (idx === activeSections.length - 1 && activeSections.length % 2 === 1) {
      card.classList.add("wide");
    }

    const title = document.createElement("h3");
    title.className = "card-title";
    title.textContent = section.label;
    card.appendChild(title);
    card.appendChild(section.type === "check" ? makeChecks(section.tall ? 8 : 5) : makeLines(section.tall ? 9 : 5));
    grid.appendChild(card);
  });
}

function renderPalette() {
  const wrap = el("palette");
  wrap.innerHTML = "";
  extractedPalette.forEach((color, idx) => {
    const swatch = document.createElement("button");
    swatch.className = "swatch";
    swatch.style.background = color;
    swatch.title = color;
    swatch.addEventListener("click", () => {
      if (idx === 0) el("bgColor").value = color;
      else if (idx === 1) el("accentColor").value = color;
      else if (idx === 2) el("textColor").value = color;
      else el("borderColor").value = color;
      applyStyleControls();
    });
    wrap.appendChild(swatch);
  });
}

function applyStyleControls() {
  planner.style.setProperty("--page-bg", el("bgColor").value);
  planner.style.setProperty("--page-accent", el("accentColor").value);
  planner.style.setProperty("--page-text", el("textColor").value);
  planner.style.setProperty("--page-border", el("borderColor").value);
  planner.style.setProperty("--page-radius", el("cornerRadius").value + "px");
  planner.style.setProperty("--page-gap", el("spacing").value + "px");
  planner.style.fontFamily = el("bodyFont").value;
  planner.querySelector(".planner-header h2").style.fontFamily = el("headingFont").value;

  planner.className = "planner-page " + el("stylePreset").value;
  autosave();
}

function pageDimensions() {
  const size = el("pageSize").value;
  if (size === "a4") return { w: 595, h: 842, mmW: 210, mmH: 297, pdf: "a4" };
  if (size === "a5") return { w: 420, h: 595, mmW: 148, mmH: 210, pdf: "a5" };
  return { w: 612, h: 792, mmW: 215.9, mmH: 279.4, pdf: "letter" };
}

function applyPageSize() {
  const d = pageDimensions();
  planner.style.width = d.w + "px";
  planner.style.minHeight = d.h + "px";
  autosave();
}

function averagePaletteFromImage(img, count=5) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const w = 120, h = 120;
  canvas.width = w; canvas.height = h;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;

  const buckets = new Map();
  for (let i=0;i<data.length;i+=16) {
    const a = data[i+3];
    if (a < 180) continue;
    const r = Math.round(data[i]/40)*40;
    const g = Math.round(data[i+1]/40)*40;
    const b = Math.round(data[i+2]/40)*40;
    const key = [Math.min(r,255),Math.min(g,255),Math.min(b,255)].join(",");
    buckets.set(key, (buckets.get(key)||0)+1);
  }

  return [...buckets.entries()]
    .sort((a,b)=>b[1]-a[1])
    .slice(0,count)
    .map(([k]) => {
      const [r,g,b] = k.split(",").map(Number);
      return "#" + [r,g,b].map(v=>v.toString(16).padStart(2,"0")).join("");
    });
}

el("imageInput").addEventListener("change", e => {
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

el("extractPaletteBtn").addEventListener("click", () => {
  if (!el("rightsCheck").checked) {
    showToast("Please confirm the image-use checkbox first.");
    return;
  }
  const img = el("imagePreview");
  if (!img.src) {
    showToast("Upload an inspiration image first.");
    return;
  }
  extractedPalette = averagePaletteFromImage(img, 5);
  if (extractedPalette.length < 3) {
    showToast("Could not extract enough colors.");
    return;
  }
  while (extractedPalette.length < 5) extractedPalette.push("#d9d4c9");
  renderPalette();
  el("bgColor").value = extractedPalette[0];
  el("accentColor").value = extractedPalette[1];
  el("textColor").value = extractedPalette[2];
  el("borderColor").value = extractedPalette[3];
  applyStyleControls();
  showToast("Palette extracted.");
});

["bgColor","accentColor","textColor","borderColor","cornerRadius","spacing","headingFont","bodyFont","stylePreset"]
  .forEach(id => el(id).addEventListener("input", applyStyleControls));

el("pageSize").addEventListener("change", applyPageSize);

el("regenerateBtn").addEventListener("click", () => {
  activeSections = [...activeSections].sort(() => Math.random() - 0.5);
  renderPlanner();
  renderSectionControls();
  showToast("Layout regenerated.");
  autosave();
});

async function plannerCanvas(scale=3) {
  return await html2canvas(planner, {
    scale,
    backgroundColor: el("bgColor").value,
    useCORS: true,
    logging: false
  });
}

el("exportPngBtn").addEventListener("click", async () => {
  const canvas = await plannerCanvas(3);
  const link = document.createElement("a");
  link.download = `planner-${el("pageSize").value}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
  showToast("PNG exported.");
});

el("exportPdfBtn").addEventListener("click", async () => {
  const { jsPDF } = window.jspdf;
  const d = pageDimensions();
  const canvas = await plannerCanvas(3);
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [d.mmW, d.mmH]
  });
  pdf.addImage(imgData, "PNG", 0, 0, d.mmW, d.mmH, undefined, "FAST");
  pdf.save(`planner-${el("pageSize").value}.pdf`);
  showToast("PDF exported successfully.");
});

function projectData() {
  return {
    version: 1,
    activeSections,
    pageSize: el("pageSize").value,
    stylePreset: el("stylePreset").value,
    palette: {
      background: el("bgColor").value,
      accent: el("accentColor").value,
      text: el("textColor").value,
      border: el("borderColor").value
    },
    typography: {
      heading: el("headingFont").value,
      body: el("bodyFont").value
    },
    cornerRadius: el("cornerRadius").value,
    spacing: el("spacing").value
  };
}

function autosave() {
  localStorage.setItem("plannerStudioProject", JSON.stringify(projectData()));
}

function loadSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem("plannerStudioProject"));
    if (!saved) return;
    activeSections = saved.activeSections || activeSections;
    if (saved.pageSize) el("pageSize").value = saved.pageSize;
    if (saved.stylePreset) el("stylePreset").value = saved.stylePreset;
    if (saved.palette) {
      el("bgColor").value = saved.palette.background || el("bgColor").value;
      el("accentColor").value = saved.palette.accent || el("accentColor").value;
      el("textColor").value = saved.palette.text || el("textColor").value;
      el("borderColor").value = saved.palette.border || el("borderColor").value;
    }
    if (saved.typography) {
      el("headingFont").value = saved.typography.heading || el("headingFont").value;
      el("bodyFont").value = saved.typography.body || el("bodyFont").value;
    }
    if (saved.cornerRadius) el("cornerRadius").value = saved.cornerRadius;
    if (saved.spacing) el("spacing").value = saved.spacing;
  } catch {}
}

el("saveProjectBtn").addEventListener("click", () => {
  autosave();
  const blob = new Blob([JSON.stringify(projectData(), null, 2)], {type: "application/json"});
  const link = document.createElement("a");
  link.download = "planner-studio-project.json";
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("Project JSON saved.");
});

loadSaved();
renderSectionControls();
renderPalette();
renderPlanner();
applyStyleControls();
applyPageSize();
