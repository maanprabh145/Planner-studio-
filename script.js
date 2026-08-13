
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
  setTimeout(() => t.classList.add("hidden"), 2600);
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
  if (size === "a4") return { w: 595, h: 842, mmW: 210, mmH: 297 };
  if (size === "a5") return { w: 420, h: 595, mmW: 148, mmH: 210 };
  return { w: 612, h: 792, mmW: 215.9, mmH: 279.4 };
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
  canvas.width = 120; canvas.height = 120;
  ctx.drawImage(img, 0, 0, 120, 120);
  const data = ctx.getImageData(0, 0, 120, 120).data;
  const buckets = new Map();

  for (let i=0;i<data.length;i+=16) {
    if (data[i+3] < 180) continue;
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
  if (!window.html2canvas) throw new Error("html2canvas did not load.");
  return await html2canvas(planner, {
    scale,
    backgroundColor: el("bgColor").value,
    useCORS: true,
    logging: false
  });
}

el("exportPngBtn").addEventListener("click", async () => {
  try {
    showToast("Preparing PNG...");
    const canvas = await plannerCanvas(3);
    const link = document.createElement("a");
    link.download = `planner-${el("pageSize").value}.png`;
    link.href = canvas.toDataURL("image/png");
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast("PNG exported.");
  } catch (err) {
    console.error(err);
    showToast("PNG export failed. Please refresh and try again.");
  }
});

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const value = parseInt(clean.length === 3
    ? clean.split("").map(c => c + c).join("")
    : clean, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
}

function pdfSetColor(pdf, method, hex) {
  const { r, g, b } = hexToRgb(hex);
  pdf[method](r, g, b);
}

function pdfDrawLines(pdf, x, y, w, count, gap, color) {
  pdfSetColor(pdf, "setDrawColor", color);
  pdf.setLineWidth(0.22);
  for (let i = 0; i < count; i++) {
    const yy = y + i * gap;
    pdf.line(x, yy, x + w, yy);
  }
}

function pdfDrawCheckLines(pdf, x, y, w, count, gap, color) {
  pdfSetColor(pdf, "setDrawColor", color);
  pdf.setLineWidth(0.22);
  for (let i = 0; i < count; i++) {
    const yy = y + i * gap;
    pdf.rect(x, yy - 2.4, 2.7, 2.7);
    pdf.line(x + 6, yy, x + w, yy);
  }
}

function plannerPdfLayout() {
  const size = el("pageSize").value;
  if (size === "a4") return { w: 210, h: 297 };
  if (size === "a5") return { w: 148, h: 210 };
  return { w: 215.9, h: 279.4 };
}

function drawPlannerVectorPage(pdf) {
  const { w, h } = plannerPdfLayout();

  const bg = el("bgColor").value;
  const accent = el("accentColor").value;
  const text = el("textColor").value;
  const border = el("borderColor").value;

  // Background
  pdfSetColor(pdf, "setFillColor", bg);
  pdf.rect(0, 0, w, h, "F");

  const margin = w * 0.075;
  const usableW = w - margin * 2;
  const top = h * 0.07;

  // Header
  pdfSetColor(pdf, "setTextColor", accent);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(Math.max(8, w * 0.043));
  pdf.text("DAILY PLANNER", margin, top);

  pdfSetColor(pdf, "setTextColor", text);
  pdf.setFont("times", "normal");
  pdf.setFontSize(Math.max(21, w * 0.15));
  pdf.text("Today", margin, top + h * 0.045);

  pdfSetColor(pdf, "setTextColor", accent);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(Math.max(8, w * 0.043));
  pdf.text("DATE", w - margin - 36, top + h * 0.024);

  pdfSetColor(pdf, "setDrawColor", border);
  pdf.setLineWidth(0.28);
  pdf.line(w - margin - 36, top + h * 0.035, w - margin, top + h * 0.035);

  pdfSetColor(pdf, "setDrawColor", accent);
  pdf.setLineWidth(0.55);
  pdf.line(margin, top + h * 0.058, w - margin, top + h * 0.058);

  // Grid geometry
  const gap = w * 0.028;
  const colW = (usableW - gap) / 2;
  const startY = top + h * 0.078;
  const bottomReserve = h * 0.07;
  const availableH = h - startY - bottomReserve;

  const enabled = activeSections
    .map(id => sections.find(s => s.id === id))
    .filter(Boolean);

  // Estimate rows, favor 3 rows like the current design.
  const rowCount = Math.max(1, Math.ceil(enabled.length / 2));
  const rowGap = h * 0.025;
  const cardH = (availableH - rowGap * (rowCount - 1)) / rowCount;

  const radius = Math.min(4.5, Number(el("cornerRadius").value) * 0.22);

  enabled.forEach((section, index) => {
    const row = Math.floor(index / 2);
    const col = index % 2;
    const x = margin + col * (colW + gap);
    const y = startY + row * (cardH + rowGap);

    pdfSetColor(pdf, "setDrawColor", border);
    pdf.setLineWidth(0.28);
    pdf.roundedRect(x, y, colW, cardH, radius, radius, "S");

    pdfSetColor(pdf, "setTextColor", accent);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(Math.max(8, w * 0.044));
    pdf.text(section.label.toUpperCase(), x + 5, y + 8);

    const innerX = x + 5;
    const innerY = y + 17;
    const innerW = colW - 10;
    const usableCardH = cardH - 22;

    const lineCount = section.tall ? 8 : 5;
    const lineGap = usableCardH / Math.max(1, lineCount);

    if (section.type === "check") {
      pdfDrawCheckLines(pdf, innerX, innerY, innerW, lineCount, lineGap, border);
    } else {
      pdfDrawLines(pdf, innerX, innerY, innerW, lineCount, lineGap, border);
    }
  });

  // Footer
  pdfSetColor(pdf, "setTextColor", accent);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(Math.max(7, w * 0.034));
  pdf.text("Make room for what matters.", w / 2, h - h * 0.03, { align: "center" });
}

el("exportPdfBtn").addEventListener("click", async () => {
  const isiPadOrIPhone =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  let previewWindow = null;

  // Open immediately on iPad so Safari doesn't block it after async work.
  if (isiPadOrIPhone) {
    previewWindow = window.open("", "_blank");
    if (previewWindow) {
      previewWindow.document.write(
        "<!doctype html><title>Preparing PDF...</title>" +
        "<meta name='viewport' content='width=device-width,initial-scale=1'>" +
        "<body style='font-family:system-ui;padding:30px'>Preparing your sharp print PDF…</body>"
      );
    }
  }

  try {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error("jsPDF did not load.");
    }

    showToast("Preparing sharp PDF...");

    const { jsPDF } = window.jspdf;
    const { w, h } = plannerPdfLayout();

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [w, h],
      compress: true
    });

    drawPlannerVectorPage(pdf);

    const blob = pdf.output("blob");
    const url = URL.createObjectURL(blob);
    const fileName = `planner-${el("pageSize").value}-print.pdf`;

    if (isiPadOrIPhone) {
      if (previewWindow) {
        previewWindow.location.href = url;
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      showToast("Sharp PDF opened. Use Share → Save to Files.");
    } else {
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast("Sharp PDF exported.");
    }

    setTimeout(() => URL.revokeObjectURL(url), 120000);
  } catch (err) {
    console.error("Vector PDF export error:", err);
    if (previewWindow && !previewWindow.closed) {
      previewWindow.document.body.innerHTML =
        "<p style='font-family:system-ui;padding:24px'>PDF export failed. Please return to Planner Studio and try again.</p>";
    }
    showToast("PDF export failed. Please refresh and try again.");
  }
});

function projectData() {
  return {
    version: 2,
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
