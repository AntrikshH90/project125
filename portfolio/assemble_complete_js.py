import json
import re
import sys
import subprocess

with open("uploads/antriksh-portfolio-studio.html", "r", encoding="utf-8") as f:
    ant = f.read()

# Load CRED_RAW
cred_raw_match = re.search(r'const CRED_RAW = (\[[\s\S]*?\]);', ant)
CRED_RAW = eval(cred_raw_match.group(1))

illustrator_creds = [
    ["Adobe Illustrator CC Masterclass: Vector Art & Brand Systems", "Adobe Certified", "May 2025", "ADOBE-ILLUST-CC90", 4],
    ["Graphic Design & Visual Principles Specialization", "CalArts / Coursera", "Aug 2025", "CALARTS-GD-8841", 4],
    ["Typography, Grid Systems & Editorial Layout", "Adobe Design", "Oct 2025", "ADOBE-TYPO-7729", 4],
    ["Visual Elements of UI Design", "CalArts", "Nov 2025", "CALARTS-UI-6632", 4]
]
for ic in illustrator_creds:
    if not any(c[0] == ic[0] for c in CRED_RAW):
        CRED_RAW.append(ic)

# Extract PROJECTS from original
p_start = ant.find('const PROJECTS = [')
p_end = ant.find('const GROUP_NAMES =')
projects_only = ant[p_start:p_end]
pos_semi = projects_only.rfind('];')
projects_raw = projects_only[len('const PROJECTS = '):pos_semi+1].strip()

js_code = """
"use strict";

const PROFILE = {
  name: "Antriksh",
  email: "antrikshyadav97@gmail.com",
  github: "https://github.com/AntrikshH90",
  lab: "https://github.com/Antriksh-Lab",
  linkedin: "https://www.linkedin.com/in/antrikshyadav97",
  org: "Apex Intelligence"
};

const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

document.getElementById("year").textContent = new Date().getFullYear();

/* ==========================================================
   SCROLL REVEALS & PROGRESS
========================================================== */
document.documentElement.classList.add("js");

const revealElements = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
  );
  revealElements.forEach(el => revealObserver.observe(el));
} else {
  revealElements.forEach(el => el.classList.add("visible"));
}

// Reading progress bar
const navProgress = document.getElementById("nav-progress");
window.addEventListener("scroll", () => {
  if (!navProgress) return;
  const total = document.documentElement.scrollHeight - window.innerHeight;
  const progress = total > 0 ? (window.scrollY / total) * 100 : 0;
  navProgress.style.width = progress + "%";
}, { passive: true });

/* ==========================================================
   CUSTOM CURSOR
========================================================== */
const cursorTrail = document.getElementById("cursor-trail");
const cursorDot = document.getElementById("cursor-dot");
let mouseX = -100, mouseY = -100, trailX = -100, trailY = -100;

if (!motionPreference.matches && window.innerWidth > 768) {
  document.addEventListener("mousemove", e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (cursorDot) {
      cursorDot.style.left = mouseX + "px";
      cursorDot.style.top = mouseY + "px";
      cursorDot.classList.add("active");
    }
    if (cursorTrail) cursorTrail.classList.add("active");
  });

  document.addEventListener("mouseleave", () => {
    if (cursorTrail) cursorTrail.classList.remove("active");
    if (cursorDot) cursorDot.classList.remove("active");
  });

  document.addEventListener("mouseover", e => {
    if (e.target.closest("button, a, .project-card, .cert-card-row, .magnetic, .shape-button, .mode-pill-btn, .preset-btn")) {
      if (cursorTrail) cursorTrail.classList.add("hover");
    }
  });

  document.addEventListener("mouseout", e => {
    if (e.target.closest("button, a, .project-card, .cert-card-row, .magnetic, .shape-button, .mode-pill-btn, .preset-btn")) {
      if (cursorTrail) cursorTrail.classList.remove("hover");
    }
  });

  function animateCursor() {
    trailX += (mouseX - trailX) * 0.16;
    trailY += (mouseY - trailY) * 0.16;
    if (cursorTrail) {
      cursorTrail.style.left = trailX + "px";
      cursorTrail.style.top = trailY + "px";
    }
    requestAnimationFrame(animateCursor);
  }
  animateCursor();
}

/* ==========================================================
   AMBIENT BACKGROUND PARTICLES
========================================================== */
const particlesCanvas = document.getElementById("particles-bg");
if (particlesCanvas && !motionPreference.matches) {
  const pCtx = particlesCanvas.getContext("2d");
  let pWidth = 0, pHeight = 0;
  const pList = [];
  const P_COUNT = 45;

  function resizeParticles() {
    pWidth = window.innerWidth;
    pHeight = window.innerHeight;
    particlesCanvas.width = pWidth;
    particlesCanvas.height = pHeight;
  }
  resizeParticles();
  window.addEventListener("resize", resizeParticles);

  for (let i = 0; i < P_COUNT; i++) {
    pList.push({
      x: Math.random() * pWidth,
      y: Math.random() * pHeight,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.35 + 0.1
    });
  }

  function loopParticles() {
    pCtx.clearRect(0, 0, pWidth, pHeight);
    for (const p of pList) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = pWidth;
      if (p.x > pWidth) p.x = 0;
      if (p.y < 0) p.y = pHeight;
      if (p.y > pHeight) p.y = 0;

      pCtx.fillStyle = `rgba(214, 255, 98, ${p.alpha * 0.4})`;
      pCtx.beginPath();
      pCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      pCtx.fill();
    }
    requestAnimationFrame(loopParticles);
  }
  loopParticles();
}

/* ==========================================================
   MAGNETIC BUTTONS
========================================================== */
if (!motionPreference.matches && window.innerWidth > 768) {
  document.querySelectorAll(".magnetic").forEach(btn => {
    btn.addEventListener("mousemove", e => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.18}px, ${y * 0.18}px)`;
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "translate(0, 0)";
    });
  });
}

/* ==========================================================
   NATIVE CANVAS 3D ENGINE — 8 MATHEMATICAL GEOMETRIES
   Genuine XYZ geometry, perspective projection, depth sorting.
   Shapes: knot, sphere, wave, torus, helix, hypercube, mobius, nib
========================================================== */
class ParticleSculpture {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext("2d") : null;
    this.shape = options.shape || "knot";
    this.color = options.color || [193, 174, 255];
    this.speed = 1;
    this.paused = motionPreference.matches;
    this.time = 0;
    this.angle = 0.45;
    this.pointer = { x: 0, y: 0 };
    this.tilt = { x: 0, y: 0 };
    this.zoom = 1;
    this.width = 1;
    this.height = 1;
    this.visible = false;
    this.dirty = true;
    this.previousTime = 0;
    this.points = [];
    this.target = [];
    this.projected = [];
    this.morphing = false;
    this.count = 1152;
    this.renderMode = options.renderMode || "particles";

    if (!this.ctx) return;

    this.createGeometry(this.shape, true);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);

    this.visibilityObserver = new IntersectionObserver(entries => {
      this.visible = entries[0].isIntersecting;
      if (this.visible) this.dirty = true;
    });
    this.visibilityObserver.observe(canvas);

    // Pointer Move / Drag Orbit interaction
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };

    canvas.addEventListener("pointerdown", event => {
      isDragging = true;
      dragStart.x = event.clientX;
      dragStart.y = event.clientY;
      try { canvas.setPointerCapture(event.pointerId); } catch(e){}
    });

    canvas.addEventListener("pointermove", event => {
      if (isDragging) {
        const dx = event.clientX - dragStart.x;
        const dy = event.clientY - dragStart.y;
        this.angle += dx * 0.008;
        this.tilt.y = clamp(this.tilt.y + dy * 0.008, -1.6, 1.6);
        dragStart.x = event.clientX;
        dragStart.y = event.clientY;
        this.dirty = true;
      } else {
        const rect = canvas.getBoundingClientRect();
        this.pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        this.pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
        this.dirty = true;
      }
    }, { passive: true });

    const endDrag = event => {
      if (isDragging) {
        isDragging = false;
        try { canvas.releasePointerCapture(event.pointerId); } catch(e){}
        this.dirty = true;
      }
    };
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);

    canvas.addEventListener("pointerleave", () => {
      if (!isDragging) {
        this.pointer.x = 0;
        this.pointer.y = 0;
        this.dirty = true;
      }
    });

    // Zoom on wheel
    canvas.addEventListener("wheel", event => {
      event.preventDefault();
      this.zoom = clamp((this.zoom || 1) - event.deltaY * 0.001, 0.5, 2.2);
      this.dirty = true;
    }, { passive: false });

    this.resize();
    this.frame = this.frame.bind(this);
    this.frameId = requestAnimationFrame(this.frame);
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.dirty = true;
  }

  createGeometry(shape, immediate = false) {
    this.shape = shape;
    const result = [];
    const TAU = Math.PI * 2;

    for (let i = 0; i < this.count; i++) {
      let x, y, z;

      if (shape === "sphere") {
        const vertical = 1 - (i / (this.count - 1)) * 2;
        const radius = Math.sqrt(Math.max(0, 1 - vertical * vertical));
        const theta = i * Math.PI * (3 - Math.sqrt(5));
        x = Math.cos(theta) * radius * 1.5;
        y = vertical * 1.5;
        z = Math.sin(theta) * radius * 1.5;
      } else if (shape === "wave") {
        const col = i % 48;
        const row = Math.floor(i / 48);
        x = (col / 47 - 0.5) * 3.5;
        z = (row / 23 - 0.5) * 2.6;
        y = Math.sin(x * 2.1) * Math.cos(z * 1.8) * 0.55;
      } else if (shape === "torus") {
        const u = (i % 48) / 48 * TAU;
        const v = Math.floor(i / 48) / (this.count / 48) * TAU;
        const R = 1.25, r = 0.45;
        x = (R + r * Math.cos(v)) * Math.cos(u);
        y = r * Math.sin(v);
        z = (R + r * Math.cos(v)) * Math.sin(u);
      } else if (shape === "helix") {
        const strand = i % 2;
        const t = (Math.floor(i / 2) / (this.count / 2)) * 4 * Math.PI - 2 * Math.PI;
        const offset = strand * Math.PI;
        const r = 1.1;
        y = (Math.floor(i / 2) / (this.count / 2) - 0.5) * 2.8;
        if (i % 12 === 0) {
          const frac = (i % 24) / 24;
          x = r * (1 - 2 * frac) * Math.cos(t);
          z = r * (1 - 2 * frac) * Math.sin(t);
        } else {
          x = r * Math.cos(t + offset);
          z = r * Math.sin(t + offset);
        }
      } else if (shape === "hypercube") {
        const edge = i % 32;
        const v16 = [];
        for (let vx of [-1, 1]) for (let vy of [-1, 1]) for (let vz of [-1, 1]) for (let vw of [-1, 1]) v16.push([vx, vy, vz, vw]);
        const edges4d = [];
        for (let a = 0; a < 16; a++) {
          for (let b = a + 1; b < 16; b++) {
            let diff = 0;
            for (let k = 0; k < 4; k++) if (v16[a][k] !== v16[b][k]) diff++;
            if (diff === 1) edges4d.push([a, b]);
          }
        }
        const pair = edges4d[edge % edges4d.length];
        const pA = v16[pair[0]];
        const pB = v16[pair[1]];
        const f = (i % 36) / 35;
        const p4 = [
          pA[0] * (1 - f) + pB[0] * f,
          pA[1] * (1 - f) + pB[1] * f,
          pA[2] * (1 - f) + pB[2] * f,
          pA[3] * (1 - f) + pB[3] * f
        ];
        const A4 = 0.65;
        const xRot = p4[0] * Math.cos(A4) - p4[3] * Math.sin(A4);
        const wRot = p4[0] * Math.sin(A4) + p4[3] * Math.cos(A4);
        const proj4 = 2.4 / (3.2 - wRot);
        x = xRot * proj4 * 0.95;
        y = p4[1] * proj4 * 0.95;
        z = p4[2] * proj4 * 0.95;
      } else if (shape === "mobius") {
        const u = (i / this.count) * TAU;
        const v = ((i % 24) / 23 - 0.5) * 0.85;
        x = (1.25 + v * Math.cos(u / 2)) * Math.cos(u);
        y = v * Math.sin(u / 2) * 1.35;
        z = (1.25 + v * Math.cos(u / 2)) * Math.sin(u);
      } else if (shape === "nib") {
        const t = i / this.count;
        y = (t - 0.5) * 3.0;
        let w = y < -0.8 ? (y + 1.5) / 0.7 * 0.65 : (y < 0.2 ? 0.65 + (y + 0.8) / 1.0 * 0.55 : 1.2 - (y - 0.2) / 1.3 * 0.3);
        const angle = (i % 18) / 18 * TAU;
        x = w * Math.cos(angle);
        z = w * 0.32 * Math.sin(angle);
        const distBreather = Math.hypot(x, y - 0.1);
        if (distBreather < 0.22) x *= 1.8;
        if (Math.abs(x) < 0.05 && y < 0.1) x = (x >= 0 ? 0.06 : -0.06);
      } else {
        const segment = Math.floor(i / 8);
        const side = i % 8;
        const t = segment / (this.count / 8) * TAU;
        const v = side / 8 * TAU;
        const center = s => {
          const r = 1.05 + 0.36 * Math.cos(3 * s);
          return [r * Math.cos(2 * s), r * Math.sin(2 * s), 0.52 * Math.sin(3 * s)];
        };
        const a = center(t);
        const b = center(t + 0.001);
        let tx = b[0] - a[0], ty = b[1] - a[1], tz = b[2] - a[2];
        const tl = Math.hypot(tx, ty, tz);
        tx /= tl; ty /= tl; tz /= tl;
        const nl = Math.hypot(ty, tx);
        const nx = ty / nl, ny = -tx / nl;
        const bx = -tz * ny, by = tz * nx, bz = tx * ny - ty * nx;
        const tube = 0.235;
        x = a[0] + tube * (nx * Math.cos(v) + bx * Math.sin(v));
        y = a[1] + tube * (ny * Math.cos(v) + by * Math.sin(v));
        z = a[2] + tube * bz * Math.sin(v);
      }
      result.push({ x, y, z });
    }

    this.target = result;
    if (immediate || motionPreference.matches) {
      this.points = result.map(point => ({ ...point }));
      this.morphing = false;
    } else {
      this.morphing = true;
    }
    this.dirty = true;
  }

  setPaused(paused) {
    this.paused = paused;
    this.dirty = true;
  }

  setColor(color) {
    this.color = color;
    this.dirty = true;
  }

  setRenderMode(mode) {
    this.renderMode = mode;
    this.dirty = true;
  }

  frame(timestamp) {
    this.frameId = requestAnimationFrame(this.frame);
    if (timestamp - this.previousTime < 1000 / 35) return;
    const dt = Math.min((timestamp - this.previousTime) / 1000 || 0.033, 0.06);
    this.previousTime = timestamp;

    if (!this.visible || document.hidden) return;

    const pointerMoving =
      Math.abs(this.pointer.x - this.tilt.x) > 0.001 ||
      Math.abs(this.pointer.y - this.tilt.y) > 0.001;
    const animated = !this.paused && this.speed > 0;

    if (!animated && !this.dirty && !pointerMoving && !this.morphing) return;

    if (animated) {
      this.time += dt * this.speed;
      this.angle += dt * 0.24 * this.speed;
    }

    const smoothing = motionPreference.matches ? 1 : 1 - Math.exp(-dt * 7);
    this.tilt.x += (this.pointer.x - this.tilt.x) * smoothing;
    this.tilt.y += (this.pointer.y - this.tilt.y) * smoothing;

    if (this.morphing) {
      let largestDelta = 0;
      for (let i = 0; i < this.points.length; i++) {
        const point = this.points[i];
        const target = this.target[i];
        for (const axis of ["x", "y", "z"]) {
          const delta = target[axis] - point[axis];
          point[axis] += delta * smoothing;
          largestDelta = Math.max(largestDelta, Math.abs(delta));
        }
      }
      if (largestDelta < 0.002) {
        this.points = this.target.map(point => ({ ...point }));
        this.morphing = false;
      }
    }

    this.draw();
    this.dirty = false;
  }

  draw() {
    const ctx = this.ctx;
    if (!ctx) return;
    const w = this.width;
    const h = this.height;
    ctx.clearRect(0, 0, w, h);

    const [r, g, b] = this.color;
    const scale = Math.min(w, h) * 0.265 * (this.zoom || 1);
    const yaw = this.angle + this.tilt.x * 0.5;
    const pitch = -0.32 + this.tilt.y * 0.4;
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const cx = Math.cos(pitch);
    const sx = Math.sin(pitch);

    const glow = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, scale * 2);
    glow.addColorStop(0, `rgba(${r},${g},${b},.065)`);
    glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    this.projected.length = 0;

    for (let i = 0; i < this.points.length; i++) {
      const point = this.points[i];
      let py = point.y;

      if (this.shape === "wave" && !this.morphing) {
        py = Math.sin(point.x * 2.1 + this.time) *
             Math.cos(point.z * 1.8 + this.time * 0.65) * 0.55;
      }

      const x = point.x * cy - point.z * sy;
      const z1 = point.x * sy + point.z * cy;
      const y = py * cx - z1 * sx;
      const z = py * sx + z1 * cx;
      const perspective = 4.8 / (4.8 + z);

      this.projected.push({
        x: w / 2 + x * scale * perspective,
        y: h / 2 + y * scale * perspective,
        z,
        radius: clamp(1.65 * perspective, 0.65, 3.2),
        alpha: clamp((1.9 - z) / 3.4, 0.14, 0.98),
        index: i
      });
    }

    this.projected.sort((a, b) => b.z - a.z);

    const indexed = new Array(this.count);
    for (const point of this.projected) indexed[point.index] = point;

    // Render wireframe or structural lines
    if (this.renderMode === "wireframe" || this.renderMode === "particles") {
      ctx.lineWidth = this.renderMode === "wireframe" ? 1.0 : 0.55;
      const lineAlphaMult = this.renderMode === "wireframe" ? 0.38 : 0.14;
      for (let i = 0; i < this.count; i++) {
        const a = indexed[i];
        const nextIndex = this.shape === "knot" ? i + 8 : (this.shape === "helix" ? i + 2 : i + 1);
        const next = indexed[nextIndex];
        if (!next) continue;
        if (this.shape === "wave" && i % 48 === 47) continue;

        const distance = Math.hypot(a.x - next.x, a.y - next.y);
        if (distance > scale * 0.42) continue;

        ctx.strokeStyle = `rgba(${r},${g},${b},${a.alpha * lineAlphaMult})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(next.x, next.y);
        ctx.stroke();
      }
    } else if (this.renderMode === "constellation") {
      ctx.lineWidth = 0.5;
      const maxDist = scale * 0.18;
      for (let i = 0; i < this.projected.length; i += 3) {
        const a = this.projected[i];
        for (let j = i + 1; j < Math.min(i + 14, this.projected.length); j++) {
          const b = this.projected[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < maxDist) {
            ctx.strokeStyle = `rgba(${r},${g},${b},${(1 - d / maxDist) * 0.25 * a.alpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
    }

    // Points
    for (const point of this.projected) {
      const ptRadius = this.renderMode === "wireframe" ? point.radius * 0.75 : point.radius;
      ctx.fillStyle = `rgba(${r},${g},${b},${point.alpha})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, ptRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Hero & Lab 3D Sculptures
const hero = new ParticleSculpture(
  document.getElementById("hero-canvas"),
  { color: [197, 175, 255] }
);
const lab = new ParticleSculpture(
  document.getElementById("lab-canvas"),
  { color: [214, 255, 98] }
);

/* ==========================================================
   PLAYGROUND LAB CONTROLS
========================================================== */
const shapeButtons = [...document.querySelectorAll("[data-shape]")];
const renderModeButtons = [...document.querySelectorAll("[data-render-mode]")];
const speedSlider = document.getElementById("speed");
const speedValue = document.getElementById("speed-value");
const paletteButton = document.getElementById("palette-button");
const pauseButton = document.getElementById("lab-pause");
const labStatus = document.getElementById("lab-status");

const LAB_PALETTES = [
  { name: "Chartreuse", color: [214, 255, 98] },
  { name: "Cyber Violet", color: [184, 162, 255] },
  { name: "Electric Cyan", color: [131, 225, 255] },
  { name: "Tangerine", color: [255, 117, 77] }
];
let paletteIndex = 0;

function syncPauseButtons(paused) {
  lab.setPaused(paused);
  pauseButton.setAttribute("aria-pressed", String(paused));
  pauseButton.textContent = paused ? "Play ▶" : "Pause Ⅱ";
}

function updateLabStatus() {
  const shapeNames = {
    knot: "Knot",
    sphere: "Orb",
    wave: "Wave",
    torus: "Torus Ring",
    helix: "DNA Double Helix",
    hypercube: "4D Tesseract",
    mobius: "Möbius Strip",
    nib: "Adobe Pen Nib"
  };
  const sName = shapeNames[lab.shape] || lab.shape;
  const pName = LAB_PALETTES[paletteIndex].name;
  if (labStatus) {
    labStatus.textContent = `${sName} / ${pName} / ${lab.count.toLocaleString()} particles / ${lab.renderMode.toUpperCase()}`;
  }
}

function selectShape(shape) {
  shapeButtons.forEach(button => {
    const active = button.dataset.shape === shape;
    button.setAttribute("aria-pressed", String(active));
  });
  lab.createGeometry(shape);
  updateLabStatus();
}

shapeButtons.forEach(button => {
  button.addEventListener("click", () => selectShape(button.dataset.shape));
});

renderModeButtons.forEach(button => {
  button.addEventListener("click", () => {
    renderModeButtons.forEach(b => b.classList.remove("active"));
    button.classList.add("active");
    lab.setRenderMode(button.dataset.renderMode);
    updateLabStatus();
  });
});

if (speedSlider) {
  speedSlider.addEventListener("input", event => {
    const value = Number(event.target.value);
    lab.speed = value;
    if (speedValue) speedValue.textContent = `${value.toFixed(1)}×`;
    if (value === 0 && !lab.paused) syncPauseButtons(true);
    else if (value > 0 && lab.paused && !motionPreference.matches) syncPauseButtons(false);
  });
}

if (paletteButton) {
  paletteButton.addEventListener("click", () => {
    paletteIndex = (paletteIndex + 1) % LAB_PALETTES.length;
    lab.setColor(LAB_PALETTES[paletteIndex].color);
    updateLabStatus();
  });
}

if (pauseButton) {
  pauseButton.addEventListener("click", () => {
    const nextPaused = !lab.paused;
    syncPauseButtons(nextPaused);
    if (!nextPaused && Number(speedSlider.value) === 0) {
      speedSlider.value = "1";
      lab.speed = 1;
      if (speedValue) speedValue.textContent = "1.0×";
    }
  });
}

// Mode Tab Switcher: 3D Sculpture vs Illustrator Vector Studio
const tab3dBtn = document.getElementById("tab-3d-btn");
const tabVectorBtn = document.getElementById("tab-vector-btn");
const panel3dLab = document.getElementById("panel-3d-lab");
const panelVectorLab = document.getElementById("panel-vector-lab");

function switchLabTab(tab) {
  if (tab === "3d") {
    if (tab3dBtn) { tab3dBtn.classList.add("active"); tab3dBtn.setAttribute("aria-selected", "true"); }
    if (tabVectorBtn) { tabVectorBtn.classList.remove("active"); tabVectorBtn.setAttribute("aria-selected", "false"); }
    if (panel3dLab) panel3dLab.style.display = "block";
    if (panelVectorLab) panelVectorLab.style.display = "none";
    lab.resize();
  } else {
    if (tab3dBtn) { tab3dBtn.classList.remove("active"); tab3dBtn.setAttribute("aria-selected", "false"); }
    if (tabVectorBtn) { tabVectorBtn.classList.add("active"); tabVectorBtn.setAttribute("aria-selected", "true"); }
    if (panel3dLab) panel3dLab.style.display = "none";
    if (panelVectorLab) panelVectorLab.style.display = "block";
    resizeVectorCanvas();
  }
}
if (tab3dBtn) tab3dBtn.addEventListener("click", () => switchLabTab("3d"));
if (tabVectorBtn) tabVectorBtn.addEventListener("click", () => switchLabTab("vector"));

/* ==========================================================
   ADOBE ILLUSTRATOR & VECTOR STUDIO ENGINE
========================================================== */
const vCanvas = document.getElementById("vector-canvas");
const vCtx = vCanvas ? vCanvas.getContext("2d") : null;
let vPreset = "guilloche";
let vPetals = 8;
let vTension = 1.0;
let vStrokeWidth = 1.5;
let vColorIndex = 0;
const V_PALETTES = [
  { name: "Acid & Dark", stroke: "#d6ff62", glow: "rgba(214,255,98,0.25)" },
  { name: "Cyber Violet", stroke: "#b8a2ff", glow: "rgba(184,162,255,0.25)" },
  { name: "Electric Cyan", stroke: "#83e1ff", glow: "rgba(131,225,255,0.25)" },
  { name: "Tangerine Flame", stroke: "#ff754d", glow: "rgba(255,117,77,0.25)" },
  { name: "Pure Platinum", stroke: "#efeee8", glow: "rgba(239,238,232,0.25)" }
];

let bezierNodes = [
  { x: 120, y: 320, hx1: 180, hy1: 140, hx2: 60, hy2: 400 },
  { x: 300, y: 120, hx1: 220, hy1: 80, hx2: 380, hy2: 160 },
  { x: 480, y: 320, hx1: 420, hy1: 400, hx2: 540, hy2: 240 }
];

function resizeVectorCanvas() {
  if (!vCanvas || !vCtx) return;
  const rect = vCanvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  vCanvas.width = Math.round(rect.width * dpr);
  vCanvas.height = Math.round(rect.height * dpr);
  vCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawVectorStudio();
}

function drawVectorStudio() {
  if (!vCanvas || !vCtx) return;
  const rect = vCanvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  const cx = w / 2;
  const cy = h / 2;
  const pal = V_PALETTES[vColorIndex % V_PALETTES.length];

  vCtx.clearRect(0, 0, w, h);

  // Background grid
  vCtx.strokeStyle = "rgba(255,255,255,0.035)";
  vCtx.lineWidth = 1;
  const gridSize = 24;
  for (let x = 0; x < w; x += gridSize) {
    vCtx.beginPath(); vCtx.moveTo(x, 0); vCtx.lineTo(x, h); vCtx.stroke();
  }
  for (let y = 0; y < h; y += gridSize) {
    vCtx.beginPath(); vCtx.moveTo(0, y); vCtx.lineTo(w, y); vCtx.stroke();
  }

  // Center axes
  vCtx.strokeStyle = "rgba(214,255,98,0.12)";
  vCtx.beginPath();
  vCtx.moveTo(cx - 15, cy); vCtx.lineTo(cx + 15, cy);
  vCtx.moveTo(cx, cy - 15); vCtx.lineTo(cx, cy + 15);
  vCtx.stroke();

  vCtx.strokeStyle = pal.stroke;
  vCtx.lineWidth = vStrokeWidth;
  vCtx.shadowColor = pal.glow;
  vCtx.shadowBlur = 12;

  if (vPreset === "guilloche") {
    const R = Math.min(w, h) * 0.38;
    const r = (R / vPetals) * vTension;
    const p = r * 1.45;
    const steps = 720;
    vCtx.beginPath();
    for (let theta = 0; theta <= Math.PI * 4; theta += (Math.PI * 4) / steps) {
      const x = cx + (R - r) * Math.cos(theta) + p * Math.cos(((R - r) / r) * theta);
      const y = cy + (R - r) * Math.sin(theta) - p * Math.sin(((R - r) / r) * theta);
      if (theta === 0) vCtx.moveTo(x, y);
      else vCtx.lineTo(x, y);
    }
    vCtx.stroke();
  } else if (vPreset === "harmonograph") {
    const f1 = vPetals * 0.5, f2 = f1 + 1, f3 = 1;
    const d = 0.0015;
    vCtx.beginPath();
    for (let t = 0; t < 160; t += 0.2) {
      const decay = Math.exp(-d * t * vTension);
      const x = cx + (Math.sin(f1 * t * 0.05) * 110 + Math.sin(f2 * t * 0.05 + 1.2) * 60) * decay;
      const y = cy + (Math.cos(f2 * t * 0.05) * 110 + Math.cos(f3 * t * 0.05 + 0.8) * 60) * decay;
      if (t === 0) vCtx.moveTo(x, y);
      else vCtx.lineTo(x, y);
    }
    vCtx.stroke();
  } else if (vPreset === "mandala") {
    const petals = Math.max(3, vPetals);
    const radius = Math.min(w, h) * 0.36;
    for (let k = 0; k < petals; k++) {
      const angle = (k / petals) * Math.PI * 2;
      vCtx.save();
      vCtx.translate(cx, cy);
      vCtx.rotate(angle);
      vCtx.beginPath();
      vCtx.moveTo(0, 0);
      vCtx.bezierCurveTo(
        radius * 0.45 * vTension, -radius * 0.35,
        radius * 0.75, -radius * 0.15 * vTension,
        radius, 0
      );
      vCtx.bezierCurveTo(
        radius * 0.75, radius * 0.15 * vTension,
        radius * 0.45 * vTension, radius * 0.35,
        0, 0
      );
      vCtx.stroke();
      vCtx.restore();
    }
  } else if (vPreset === "bezier") {
    vCtx.beginPath();
    vCtx.moveTo(bezierNodes[0].x, bezierNodes[0].y);
    vCtx.bezierCurveTo(
      bezierNodes[0].hx1, bezierNodes[0].hy1,
      bezierNodes[1].hx1, bezierNodes[1].hy1,
      bezierNodes[1].x, bezierNodes[1].y
    );
    vCtx.bezierCurveTo(
      bezierNodes[1].hx2, bezierNodes[1].hy2,
      bezierNodes[2].hx1, bezierNodes[2].hy1,
      bezierNodes[2].x, bezierNodes[2].y
    );
    vCtx.stroke();

    // Illustrator handles & nodes
    vCtx.shadowBlur = 0;
    bezierNodes.forEach(node => {
      vCtx.strokeStyle = "rgba(131,225,255,0.5)";
      vCtx.lineWidth = 1;
      vCtx.beginPath();
      vCtx.moveTo(node.x, node.y); vCtx.lineTo(node.hx1, node.hy1);
      if (node.hx2) { vCtx.moveTo(node.x, node.y); vCtx.lineTo(node.hx2, node.hy2); }
      vCtx.stroke();

      vCtx.fillStyle = "#83e1ff";
      vCtx.beginPath(); vCtx.arc(node.hx1, node.hy1, 3.5, 0, Math.PI * 2); vCtx.fill();
      if (node.hx2) {
        vCtx.beginPath(); vCtx.arc(node.hx2, node.hy2, 3.5, 0, Math.PI * 2); vCtx.fill();
      }

      vCtx.fillStyle = pal.stroke;
      vCtx.strokeStyle = "#171816";
      vCtx.lineWidth = 1.5;
      vCtx.fillRect(node.x - 4, node.y - 4, 8, 8);
      vCtx.strokeRect(node.x - 4, node.y - 4, 8, 8);
    });
  }
  vCtx.shadowBlur = 0;

  const vStatus = document.getElementById("vector-status");
  if (vStatus) {
    vStatus.textContent = `${vPreset.toUpperCase()} / ${pal.name} / ${vPetals}-Fold Symmetry / Vector Splines`;
  }
}

// Preset buttons
document.querySelectorAll("[data-preset]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-preset]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    vPreset = btn.dataset.preset;
    drawVectorStudio();
  });
});

const petalsInput = document.getElementById("vector-petals");
if (petalsInput) {
  petalsInput.addEventListener("input", e => {
    vPetals = Number(e.target.value);
    document.getElementById("petals-val").textContent = vPetals;
    drawVectorStudio();
  });
}

const tensionInput = document.getElementById("vector-tension");
if (tensionInput) {
  tensionInput.addEventListener("input", e => {
    vTension = Number(e.target.value);
    document.getElementById("tension-val").textContent = vTension.toFixed(1);
    drawVectorStudio();
  });
}

const strokeInput = document.getElementById("vector-stroke");
if (strokeInput) {
  strokeInput.addEventListener("input", e => {
    vStrokeWidth = Number(e.target.value);
    document.getElementById("stroke-val").textContent = `${vStrokeWidth.toFixed(1)}px`;
    drawVectorStudio();
  });
}

const vColorBtn = document.getElementById("vector-color-btn");
if (vColorBtn) {
  vColorBtn.addEventListener("click", () => {
    vColorIndex = (vColorIndex + 1) % V_PALETTES.length;
    drawVectorStudio();
  });
}

const vRandomBtn = document.getElementById("vector-random-btn");
if (vRandomBtn) {
  vRandomBtn.addEventListener("click", () => {
    vPetals = Math.floor(Math.random() * 12) + 4;
    vTension = Number((Math.random() * 1.8 + 0.4).toFixed(1));
    if (petalsInput) petalsInput.value = vPetals;
    if (document.getElementById("petals-val")) document.getElementById("petals-val").textContent = vPetals;
    if (tensionInput) tensionInput.value = vTension;
    if (document.getElementById("tension-val")) document.getElementById("tension-val").textContent = vTension.toFixed(1);
    drawVectorStudio();
  });
}

// Dragging anchor nodes in bezier preset
let draggingNode = null;
if (vCanvas) {
  vCanvas.addEventListener("pointerdown", e => {
    if (vPreset !== "bezier") return;
    const rect = vCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    for (let i = 0; i < bezierNodes.length; i++) {
      const node = bezierNodes[i];
      if (Math.hypot(node.x - mx, node.y - my) < 14) {
        draggingNode = { node, type: "anchor" };
        return;
      }
      if (Math.hypot(node.hx1 - mx, node.hy1 - my) < 12) {
        draggingNode = { node, type: "h1" };
        return;
      }
      if (node.hx2 && Math.hypot(node.hx2 - mx, node.hy2 - my) < 12) {
        draggingNode = { node, type: "h2" };
        return;
      }
    }
  });

  vCanvas.addEventListener("pointermove", e => {
    if (!draggingNode) return;
    const rect = vCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (draggingNode.type === "anchor") {
      const dx = mx - draggingNode.node.x;
      const dy = my - draggingNode.node.y;
      draggingNode.node.x = mx;
      draggingNode.node.y = my;
      draggingNode.node.hx1 += dx;
      draggingNode.node.hy1 += dy;
      if (draggingNode.node.hx2) {
        draggingNode.node.hx2 += dx;
        draggingNode.node.hy2 += dy;
      }
    } else if (draggingNode.type === "h1") {
      draggingNode.node.hx1 = mx;
      draggingNode.node.hy1 = my;
    } else if (draggingNode.type === "h2") {
      draggingNode.node.hx2 = mx;
      draggingNode.node.hy2 = my;
    }
    drawVectorStudio();
  });

  const stopVDrag = () => { draggingNode = null; };
  vCanvas.addEventListener("pointerup", stopVDrag);
  vCanvas.addEventListener("pointercancel", stopVDrag);
}

// Export SVG Vector File (Adobe Illustrator Compatible)
function downloadSVG() {
  const pal = V_PALETTES[vColorIndex % V_PALETTES.length];
  let svgContent = "";
  const w = 600, h = 440, cx = 300, cy = 220;

  if (vPreset === "guilloche") {
    const R = Math.min(w, h) * 0.38;
    const r = (R / vPetals) * vTension;
    const p = r * 1.45;
    const steps = 720;
    let pathD = "";
    for (let theta = 0; theta <= Math.PI * 4; theta += (Math.PI * 4) / steps) {
      const x = (cx + (R - r) * Math.cos(theta) + p * Math.cos(((R - r) / r) * theta)).toFixed(2);
      const y = (cy + (R - r) * Math.sin(theta) - p * Math.sin(((R - r) / r) * theta)).toFixed(2);
      pathD += (theta === 0 ? `M ${x} ${y} ` : `L ${x} ${y} `);
    }
    svgContent = `<path d="${pathD}" fill="none" stroke="${pal.stroke}" stroke-width="${vStrokeWidth}" />`;
  } else if (vPreset === "harmonograph") {
    let pathD = "";
    const f1 = vPetals * 0.5, f2 = f1 + 1, f3 = 1;
    const d = 0.0015;
    for (let t = 0; t < 160; t += 0.2) {
      const decay = Math.exp(-d * t * vTension);
      const x = (cx + (Math.sin(f1 * t * 0.05) * 110 + Math.sin(f2 * t * 0.05 + 1.2) * 60) * decay).toFixed(2);
      const y = (cy + (Math.cos(f2 * t * 0.05) * 110 + Math.cos(f3 * t * 0.05 + 0.8) * 60) * decay).toFixed(2);
      pathD += (t === 0 ? `M ${x} ${y} ` : `L ${x} ${y} `);
    }
    svgContent = `<path d="${pathD}" fill="none" stroke="${pal.stroke}" stroke-width="${vStrokeWidth}" />`;
  } else if (vPreset === "mandala") {
    const petals = Math.max(3, vPetals);
    const radius = Math.min(w, h) * 0.36;
    let paths = "";
    for (let k = 0; k < petals; k++) {
      const angle = ((k / petals) * 360).toFixed(2);
      paths += `<path d="M 0 0 C ${(radius * 0.45 * vTension).toFixed(1)} ${(-radius * 0.35).toFixed(1)}, ${(radius * 0.75).toFixed(1)} ${(-radius * 0.15 * vTension).toFixed(1)}, ${radius.toFixed(1)} 0 C ${(radius * 0.75).toFixed(1)} ${(radius * 0.15 * vTension).toFixed(1)}, ${(radius * 0.45 * vTension).toFixed(1)} ${(radius * 0.35).toFixed(1)}, 0 0" transform="translate(${cx}, ${cy}) rotate(${angle})" fill="none" stroke="${pal.stroke}" stroke-width="${vStrokeWidth}" />`;
    }
    svgContent = paths;
  } else {
    svgContent = `<path d="M ${bezierNodes[0].x} ${bezierNodes[0].y} C ${bezierNodes[0].hx1} ${bezierNodes[0].hy1}, ${bezierNodes[1].hx1} ${bezierNodes[1].hy1}, ${bezierNodes[1].x} ${bezierNodes[1].y} C ${bezierNodes[1].hx2} ${bezierNodes[1].hy2}, ${bezierNodes[2].hx1} ${bezierNodes[2].hy1}, ${bezierNodes[2].x} ${bezierNodes[2].y}" fill="none" stroke="${pal.stroke}" stroke-width="${vStrokeWidth}" />`;
  }

  const fullSvg = `<?xml version="1.0" encoding="utf-8"?>
<!-- Generated by Antriksh Creative Studio — Compatible with Adobe Illustrator CC -->
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect width="100%" height="100%" fill="#131411" />
  ${svgContent}
</svg>`;

  const blob = new Blob([fullSvg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `antriksh-${vPreset}-vector-art.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const exportSvgBtn = document.getElementById("export-svg-btn");
if (exportSvgBtn) exportSvgBtn.addEventListener("click", downloadSVG);

/* ==========================================================
   STUDIO ENGINE — REAL PROJECTS, LIVE SPECIMENS, CREDENTIALS
========================================================== */
const CATS = { aiml: "AI / ML", web: "Full-Stack / Web", res: "Resources" };

const dialog = document.getElementById("detail-dialog");
const dialogTitle = document.getElementById("dialog-title");
const dialogTag = document.getElementById("dialog-tag");
const dialogDescription = document.getElementById("dialog-description");
const dialogNote = document.getElementById("dialog-note");
const dialogDemo = document.getElementById("dialog-demo");
const dialogAction = document.getElementById("dialog-action");
const dialogActionLabel = document.getElementById("dialog-action-label");
const dialogStack = document.getElementById("dialog-stack");
const dialogLinks = document.getElementById("dialog-links");
const dialogSocials = document.getElementById("dialog-socials");
let activeProjectShape = null;
let returnFocus = null;
let preview = null;

const PROJECTS = """ + projects_raw + """;

/* name, issuer, when, credentialId, group, url?, expires? */
const GROUP_NAMES = [
  "Foundations & Flagships",
  "AI / LLM Training",
  "Cloud, Data & Engineering",
  "Consulting & Business",
  "Creative & Marketing"
];

const CRED_RAW = """ + json.dumps(CRED_RAW) + """;

const MONTH_ORDER = { Jan:1, Feb:2, Mar:3, Apr:4, May:5, Jun:6, Jul:7, Aug:8, Sep:9, Oct:10, Nov:11, Dec:12 };
const CREDENTIALS = CRED_RAW.map(([name, issuer, when, cid, group, url, expires]) => {
  const [mon, yr] = when.split(" ");
  return {
    name, issuer, when, cid, group,
    url: url || "",
    expires: expires || "",
    key: Number(yr) * 100 + (MONTH_ORDER[mon] || 0)
  };
});

// Render Project Grid & Live 3D Canvas Specimens
const grid = document.getElementById("project-grid");
const cardSpecs = [];

PROJECTS.forEach((p, i) => {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "project-card";
  card.dataset.cat = p.cat;
  card.setAttribute("aria-haspopup", "dialog");
  card.innerHTML = `
    <div class="project-art live ${p.cat === 'res' ? 'orbit' : p.cat === 'web' ? 'neural' : ''}">
      <span class="art-tag mono">${CATS[p.cat]}</span>
      <canvas role="img" aria-label="Live specimen for ${p.title}"></canvas>
      <span class="art-index mono">FIG. ${String(i + 1).padStart(2, "0")} · 3D ${p.shape.toUpperCase()}</span>
      <span class="project-open" aria-hidden="true">↗</span>
    </div>
    <div class="project-meta">
      <h3>${p.title}</h3>
      <p>${p.blurb}</p>
      <div class="project-tags mono">
        <span class="tag-pill">${p.tag}</span>
        <span class="tag-pill">${p.fig}</span>
      </div>
    </div>`;

  card.addEventListener("click", () => openDossier(i));
  grid.appendChild(card);
  cardSpecs.push({ canvas: card.querySelector("canvas"), shape: p.shape, color: p.color });
});

// Initialize 20 3D canvas specimens across project cards
const cardSculptures = cardSpecs.map(spec => new ParticleSculpture(spec.canvas, {
  shape: spec.shape,
  color: spec.color
}));

/* ---------- Project Filters ---------- */
const workFilters = document.getElementById("work-filters");
const workCount = document.getElementById("work-count");
const catCounts = { all: PROJECTS.length, aiml: 0, web: 0, res: 0 };
PROJECTS.forEach(p => { catCounts[p.cat] = (catCounts[p.cat] || 0) + 1; });

let workActive = "all";
function applyWorkFilter(cat) {
  workActive = cat;
  const cards = grid.querySelectorAll(".project-card");
  let visibleCount = 0;
  cards.forEach(card => {
    const match = cat === "all" || card.dataset.cat === cat;
    card.hidden = !match;
    if (match) visibleCount += 1;
  });
  workFilters.querySelectorAll(".filter-chip").forEach(chip => {
    chip.setAttribute("aria-pressed", String(chip.dataset.filter === cat));
  });
  workCount.textContent = `Showing ${visibleCount} of ${PROJECTS.length} items`;
}

[
  ["all", "All"],
  ["aiml", "AI / ML"],
  ["web", "Full-Stack / Web"],
  ["res", "Resources"]
].forEach(([cat, label]) => {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "filter-chip mono";
  chip.dataset.filter = cat;
  chip.setAttribute("aria-pressed", String(cat === "all"));
  chip.textContent = `${label} (${catCounts[cat]})`;
  chip.addEventListener("click", () => applyWorkFilter(cat));
  workFilters.appendChild(chip);
});

/* ---------- Dossier Dialog Handling ---------- */
function clearDialogExtras() {
  dialogStack.innerHTML = "";
  dialogLinks.innerHTML = "";
  dialogSocials.innerHTML = "";
}

function openDossier(index) {
  const p = PROJECTS[index];
  activeProjectShape = p.shape;
  dialogTitle.textContent = p.title;
  dialogTag.textContent = `${CATS[p.cat]} · Dossier ${String(index + 1).padStart(3, "0")}`;
  dialogDescription.textContent = p.desc;
  dialogNote.textContent = p.note;
  dialogAction.target = "";

  clearDialogExtras();
  p.stack.forEach(s => {
    const chip = document.createElement("span");
    chip.className = "stack-chip mono";
    chip.textContent = s;
    dialogStack.appendChild(chip);
  });

  p.links.slice(1).forEach(l => {
    const a = document.createElement("a");
    a.href = l.href; a.target = "_blank"; a.rel = "noopener";
    a.textContent = l.label;
    dialogLinks.appendChild(a);
  });

  if (!p.links.length && p.action.href === "#playground") {
    const note = document.createElement("span");
    note.className = "private-note mono";
    note.textContent = "Private build — source not public";
    dialogLinks.appendChild(note);
  }

  if (p.action.href === "#playground" || p.action.href === "#apex") {
    dialogAction.href = p.action.href;
    dialogActionLabel.textContent = p.action.label;
  } else {
    dialogAction.href = p.action.href;
    dialogAction.target = "_blank";
    dialogAction.rel = "noopener";
    dialogActionLabel.textContent = p.action.label;
  }

  dialogDemo.hidden = false;
  if (!preview) {
    preview = new ParticleSculpture(
      document.getElementById("preview-canvas"),
      { shape: p.shape, color: p.color }
    );
  } else {
    preview.createGeometry(p.shape, true);
    preview.setColor(p.color);
    preview.setPaused(motionPreference.matches);
    preview.resize();
  }

  showDialog();
}

function openCredDossier(c) {
  activeProjectShape = "nib";
  dialogTitle.textContent = c.name;
  dialogTag.textContent = `${GROUP_NAMES[c.group]} · Issued by ${c.issuer}`;
  dialogDescription.textContent = `Official industry credential earned and cryptographically certified. Issued ${c.when}${c.expires ? ` · Valid through ${c.expires}` : ""}.`;

  clearDialogExtras();

  const chipIssuer = document.createElement("span");
  chipIssuer.className = "stack-chip mono";
  chipIssuer.textContent = `Issuer: ${c.issuer}`;
  dialogStack.appendChild(chipIssuer);

  const chipWhen = document.createElement("span");
  chipWhen.className = "stack-chip mono";
  chipWhen.textContent = `Issued: ${c.when}`;
  dialogStack.appendChild(chipWhen);

  if (c.cid) {
    const chipCid = document.createElement("span");
    chipCid.className = "stack-chip mono";
    chipCid.textContent = `ID: ${c.cid}`;
    dialogStack.appendChild(chipCid);
  }

  if (c.url) {
    dialogNote.textContent = `Verification URL: ${c.url}`;
    dialogAction.href = c.url;
    dialogAction.target = "_blank";
    dialogAction.rel = "noopener";
    dialogActionLabel.textContent = "Verify Credential Online ↗";
    dialogAction.hidden = false;
  } else if (c.cid) {
    dialogNote.textContent = `Credential Identifier: ${c.cid}`;
    dialogAction.href = "#credentials";
    dialogAction.target = "";
    dialogActionLabel.textContent = "Copy Credential ID";
    dialogAction.hidden = false;
    dialogAction.onclick = e => {
      e.preventDefault();
      navigator.clipboard.writeText(c.cid).then(() => {
        dialogActionLabel.textContent = "Copied to Clipboard! ✓";
        setTimeout(() => { dialogActionLabel.textContent = "Copy Credential ID"; }, 2000);
      });
    };
  } else {
    dialogNote.textContent = "Official credential on record with issuer · Verified certificate badge available on request.";
    dialogAction.hidden = true;
  }

  dialogDemo.hidden = false;
  if (!preview) {
    preview = new ParticleSculpture(
      document.getElementById("preview-canvas"),
      { shape: "nib", color: [214, 255, 98] }
    );
  } else {
    preview.createGeometry("nib", true);
    preview.setColor([214, 255, 98]);
    preview.setPaused(motionPreference.matches);
    preview.resize();
  }

  showDialog();
}

function showDialog() {
  returnFocus = document.activeElement;
  dialog.showModal();
  document.body.classList.add("modal-open");
}

/* ==========================================================
   3D CREDENTIAL BOOK CONTROLLER
========================================================== */
const bookElem = document.getElementById("credential-book");
const bookLeaves = bookElem ? [...bookElem.querySelectorAll(".book-leaf")] : [];
const bookDots = document.getElementById("book-dots");
const bookPageLabel = document.getElementById("book-page-label");
const bookPrevBtn = document.getElementById("book-prev");
const bookNextBtn = document.getElementById("book-next");
const bookSoundToggle = document.getElementById("book-sound-toggle");
const ribbonBtns = [...document.querySelectorAll(".ribbon-btn")];
const totalLeaves = bookLeaves.length;
let currentLeaf = 0;
let soundEnabled = true;
let isFlipping = false;
let audioCtx = null;

const PAGE_LABELS = [
  "Cover · Antriksh Archive",
  "Spread 1 · Foundations & Flagships",
  "Spread 2 · AI & Large Language Models",
  "Spread 3 · AI Systems & Cloud Infrastructure",
  "Spread 4 · Business Strategy & Vector Direction",
  "Spread 5 · Creative Studio & Verification Seal",
  "Endpaper · Archival Verification"
];

function playPageTurnSound() {
  if (!soundEnabled) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const now = audioCtx.currentTime;

    const bufSize = Math.floor(audioCtx.sampleRate * 0.22);
    const buffer = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.45));
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1600, now);
    filter.frequency.exponentialRampToValueAtTime(320, now + 0.2);
    filter.Q.value = 1.6;

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    noise.start(now);
  } catch (e) {}
}

function updateBookState() {
  bookLeaves.forEach((leaf, i) => {
    if (i < currentLeaf) {
      leaf.classList.add("flipped");
      leaf.style.zIndex = i + 1;
    } else {
      leaf.classList.remove("flipped");
      leaf.style.zIndex = totalLeaves - i;
    }
  });

  if (bookPrevBtn) bookPrevBtn.disabled = (currentLeaf === 0);
  if (bookNextBtn) bookNextBtn.disabled = (currentLeaf >= totalLeaves);

  if (bookPageLabel) {
    bookPageLabel.textContent = PAGE_LABELS[currentLeaf] || `Spread ${currentLeaf}`;
  }

  const dots = bookDots ? [...bookDots.querySelectorAll(".book-dot")] : [];
  dots.forEach((dot, i) => {
    dot.classList.toggle("active", i === currentLeaf);
  });

  ribbonBtns.forEach(btn => {
    const target = Number(btn.dataset.leaf);
    btn.classList.toggle("active", target === currentLeaf);
  });
}

function flipForward() {
  if (currentLeaf >= totalLeaves || isFlipping) return;
  isFlipping = true;
  playPageTurnSound();

  const leaf = bookLeaves[currentLeaf];
  leaf.classList.add("flipping");
  leaf.style.zIndex = 50;
  leaf.classList.add("flipped");

  currentLeaf++;

  setTimeout(() => {
    leaf.style.zIndex = currentLeaf;
  }, 420);

  setTimeout(() => {
    leaf.classList.remove("flipping");
    isFlipping = false;
    updateBookState();
  }, 850);
}

function flipBackward() {
  if (currentLeaf <= 0 || isFlipping) return;
  isFlipping = true;
  playPageTurnSound();

  currentLeaf--;
  const leaf = bookLeaves[currentLeaf];
  leaf.classList.add("flipping");
  leaf.style.zIndex = 50;
  leaf.classList.remove("flipped");

  setTimeout(() => {
    leaf.style.zIndex = totalLeaves - currentLeaf;
  }, 420);

  setTimeout(() => {
    leaf.classList.remove("flipping");
    isFlipping = false;
    updateBookState();
  }, 850);
}

function goToLeaf(target) {
  if (target === currentLeaf || isFlipping) return;
  target = clamp(target, 0, totalLeaves);
  const diff = target - currentLeaf;
  const step = diff > 0 ? 1 : -1;
  const count = Math.abs(diff);

  let i = 0;
  function nextStep() {
    if (i < count) {
      if (step > 0) flipForward();
      else flipBackward();
      i++;
      setTimeout(nextStep, 260);
    }
  }
  nextStep();
}

if (bookElem) {
  bookElem.addEventListener("click", e => {
    const certCard = e.target.closest(".cert-card-row");
    if (certCard) {
      const idx = Number(certCard.dataset.credIndex);
      if (!isNaN(idx) && CREDENTIALS[idx]) {
        openCredDossier(CREDENTIALS[idx]);
        return;
      }
    }

    const tocItem = e.target.closest(".toc-item");
    if (tocItem) {
      const dest = Number(tocItem.dataset.goto);
      if (!isNaN(dest)) goToLeaf(dest);
      return;
    }

    if (e.target.closest("button, a")) return;

    const rect = bookElem.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    if (clickX > rect.width * 0.5) {
      flipForward();
    } else {
      flipBackward();
    }
  });

  let touchStartX = 0;
  bookElem.addEventListener("touchstart", e => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  bookElem.addEventListener("touchend", e => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (diff > 40) flipForward();
    else if (diff < -40) flipBackward();
  }, { passive: true });
}

if (bookPrevBtn) bookPrevBtn.addEventListener("click", flipBackward);
if (bookNextBtn) bookNextBtn.addEventListener("click", flipForward);

window.addEventListener("keydown", e => {
  const credSec = document.getElementById("credentials");
  if (!credSec) return;
  const rect = credSec.getBoundingClientRect();
  const inView = rect.top < window.innerHeight && rect.bottom > 0;
  if (!inView) return;

  if (e.key === "ArrowRight") flipForward();
  else if (e.key === "ArrowLeft") flipBackward();
});

ribbonBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const target = Number(btn.dataset.leaf);
    if (!isNaN(target)) goToLeaf(target);
  });
});

if (bookSoundToggle) {
  bookSoundToggle.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    const icon = document.getElementById("sound-icon");
    if (icon) icon.textContent = soundEnabled ? "🔊" : "🔇";
    bookSoundToggle.style.opacity = soundEnabled ? "1" : "0.55";
  });
}

function fitBook() {
  const stage = document.querySelector(".book-stage-outer");
  const book = document.getElementById("credential-book");
  if (!stage || !book) return;
  const availW = stage.clientWidth - 24;
  const baseW = 760;
  const scale = Math.min(1, Math.max(0.40, availW / baseW));
  book.style.transform = `scale(${scale})`;
  stage.style.height = `${520 * scale + 30}px`;
}
window.addEventListener("resize", fitBook);
window.addEventListener("orientationchange", fitBook);
setTimeout(fitBook, 150);

// View Switcher (3D Book vs Wall Index)
const toggleBookBtn = document.getElementById("toggle-book-view");
const toggleWallBtn = document.getElementById("toggle-wall-view");
const bookViewBox = document.getElementById("book-view-container");
const wallViewBox = document.getElementById("wall-view-container");
const sealWallJump = document.getElementById("seal-wall-jump");

function setCredView(mode) {
  if (mode === "book") {
    if (toggleBookBtn) toggleBookBtn.classList.add("active");
    if (toggleWallBtn) toggleWallBtn.classList.remove("active");
    if (bookViewBox) bookViewBox.style.display = "block";
    if (wallViewBox) wallViewBox.style.display = "none";
    fitBook();
  } else {
    if (toggleBookBtn) toggleBookBtn.classList.remove("active");
    if (toggleWallBtn) toggleWallBtn.classList.add("active");
    if (bookViewBox) bookViewBox.style.display = "none";
    if (wallViewBox) wallViewBox.style.display = "block";
  }
}
if (toggleBookBtn) toggleBookBtn.addEventListener("click", () => setCredView("book"));
if (toggleWallBtn) toggleWallBtn.addEventListener("click", () => setCredView("wall"));
if (sealWallJump) sealWallJump.addEventListener("click", () => setCredView("wall"));

/* ==========================================================
   CREDENTIAL WALL — INSTANT SEARCH & FILTER
========================================================== */
const credList = document.getElementById("cred-list");
const credCount = document.getElementById("cred-count");
const credFilters = document.getElementById("cred-filters");
const credSearch = document.getElementById("cred-search");

const credGroups = GROUP_NAMES.map((name, gi) => {
  const wrap = document.createElement("div");
  wrap.className = "cred-group";
  wrap.dataset.group = String(gi);
  const head = document.createElement("div");
  head.className = "cred-group-h mono";
  credList.appendChild(wrap);
  return { wrap, head, name, gi };
});

CREDENTIALS.sort((a, b) => b.key - a.key || a.name.localeCompare(b.name));

CREDENTIALS.forEach(c => {
  const g = credGroups[c.group];
  const row = document.createElement("div");
  row.className = "cred-row";
  row.dataset.search = `${c.name} ${c.issuer}`.toLowerCase();

  const head = document.createElement("button");
  head.type = "button";
  head.className = "cred-head";
  head.setAttribute("aria-expanded", "false");
  head.innerHTML = `
    <span class="cred-name">${c.name}</span>
    <span class="cred-issuer mono">${c.issuer}</span>
    <span class="cred-when mono">${c.when}</span>
    <span class="cred-plus" aria-hidden="true">+</span>`;

  const body = document.createElement("div");
  body.className = "cred-body";
  const idLine = document.createElement("div");
  const idText = c.url
    ? `Credential: ${c.url}`
    : c.cid ? `Credential ID: ${c.cid}` : "Credential on file — verified badge on request";
  idLine.innerHTML = `<span class="cred-id">${idText}</span>`;

  if (c.cid && !c.url) {
    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "copy-id mono";
    copy.textContent = "Copy ID";
    copy.addEventListener("click", e => {
      e.stopPropagation();
      navigator.clipboard.writeText(c.cid).then(() => {
        copy.textContent = "Copied ✓";
        setTimeout(() => { copy.textContent = "Copy ID"; }, 1800);
      });
    });
    idLine.appendChild(copy);
  } else if (c.url) {
    const open = document.createElement("a");
    open.href = c.url;
    open.target = "_blank";
    open.rel = "noopener";
    open.className = "mono";
    open.style.color = "var(--acid)";
    open.style.fontSize = "10px";
    open.style.marginLeft = "8px";
    open.textContent = "Show credential ↗";
    idLine.appendChild(open);
  }

  if (c.expires) {
    const exp = document.createElement("div");
    exp.textContent = `Issued ${c.when} · Expires ${c.expires}`;
    exp.style.color = "#8d9082";
    exp.style.fontSize = "10px";
    exp.style.marginTop = "4px";
    body.appendChild(exp);
  }

  body.prepend(idLine);
  row.appendChild(head);
  row.appendChild(body);

  head.addEventListener("click", () => {
    const open = head.getAttribute("aria-expanded") === "true";
    head.setAttribute("aria-expanded", String(!open));
    body.classList.toggle("open", !open);
  });

  g.wrap.appendChild(row);
});

credGroups.forEach(g => {
  const n = g.wrap.querySelectorAll(".cred-row").length;
  g.head.innerHTML = `<span>${g.name}</span><span class="cred-group-n mono">${n} credentials</span>`;
  g.wrap.prepend(g.head);
});

const credStatsElem = document.getElementById("cred-stats");
if (credStatsElem) {
  credStatsElem.textContent = `${CREDENTIALS.length} credentials · ${new Set(CREDENTIALS.map(c => c.issuer)).size} issuers · NVIDIA → McKinsey → Adobe → Google`;
}
if (credSearch) {
  credSearch.placeholder = `Search ${CREDENTIALS.length} credentials…`;
}
if (credCount) {
  credCount.textContent = `Showing all ${CREDENTIALS.length}`;
}

let credActive = "all";
function applyCredFilter() {
  const q = credSearch.value.trim().toLowerCase();
  let shown = 0;
  credGroups.forEach(g => {
    let groupShown = 0;
    g.wrap.querySelectorAll(".cred-row").forEach(row => {
      const matchCat = credActive === "all" || g.gi === Number(credActive);
      const matchQ = !q || row.dataset.search.includes(q);
      const visible = matchCat && matchQ;
      row.hidden = !visible;
      if (visible) { shown += 1; groupShown += 1; }
    });
    g.wrap.hidden = groupShown === 0;
  });
  if (credCount) credCount.textContent = `Showing ${shown} of ${CREDENTIALS.length} credentials`;
}

const credFilterDefs = [["all", "All"]].concat(GROUP_NAMES.map((n, i) => [String(i), n]));
credFilterDefs.forEach(([key, label], idx) => {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "filter-chip mono";
  chip.dataset.filter = key;
  chip.setAttribute("aria-pressed", String(idx === 0));
  chip.textContent = label;
  chip.addEventListener("click", () => {
    credActive = key;
    credFilters.querySelectorAll(".filter-chip").forEach(c2 => {
      c2.setAttribute("aria-pressed", String(c2.dataset.filter === key));
    });
    applyCredFilter();
  });
  credFilters.appendChild(chip);
});
if (credSearch) credSearch.addEventListener("input", applyCredFilter);

/* ==========================================================
   APEX SCULPTURE & DIALOG EVENTS
========================================================== */
const apexSculpture = new ParticleSculpture(
  document.getElementById("apex-canvas"),
  { shape: "knot", color: [214, 255, 98] }
);

dialog.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => {
  const rect = dialog.getBoundingClientRect();
  const outside =
    event.clientX < rect.left || event.clientX > rect.right ||
    event.clientY < rect.top || event.clientY > rect.bottom;
  if (event.target === dialog && outside) dialog.close();
});

dialogAction.addEventListener("click", event => {
  const href = dialogAction.getAttribute("href");
  if (!href) return;
  if (href.startsWith("#")) {
    if (activeProjectShape && href === "#playground") {
      selectShape(activeProjectShape);
    }
    dialog.close();
    if (href !== "#playground") {
      const selected = shapeButtons.find(b => b.dataset.shape === activeProjectShape);
      if (selected) selected.focus();
    }
  } else {
    dialog.close();
  }
});

dialog.addEventListener("close", () => {
  document.body.classList.remove("modal-open");
  if (preview) {
    preview.setPaused(true);
  }
  if (returnFocus && typeof returnFocus.focus === "function") {
    returnFocus.focus();
  }
});

/* ==========================================================
   CONTACT SECTION LISTENERS
========================================================== */
document.querySelectorAll("[data-contact]").forEach(button => {
  button.addEventListener("click", () => {
    activeProjectShape = "nib";
    dialogTag.textContent = "A conversation starts here";
    dialogTitle.textContent = "Hello, future collaborator.";
    dialogDemo.hidden = true;

    if (PROFILE.email.trim()) {
      dialogDescription.textContent =
        "Have an idea, a question, or an interesting project in mind? Let's talk.";
      dialogNote.textContent = PROFILE.email;
      dialogAction.href = `mailto:${PROFILE.email}`;
      dialogActionLabel.textContent = "Write me an email";
      dialogAction.hidden = false;
      dialogSocials.innerHTML = "";
      [
        ["GitHub ↗", PROFILE.github],
        ["Antriksh-Lab ↗", PROFILE.lab],
        ["LinkedIn ↗", PROFILE.linkedin]
      ].forEach(([label, href]) => {
        const a = document.createElement("a");
        a.href = href; a.target = "_blank"; a.rel = "noopener";
        a.textContent = label;
        dialogSocials.appendChild(a);
      });
    } else {
      dialogDescription.textContent =
        "Drop by the lab repositories or browse the experiments above.";
      dialogNote.textContent = "Email is off-grid right now.";
      dialogAction.hidden = true;
      dialogSocials.innerHTML = "";
    }

    clearDialogExtras();
    showDialog();
  });
});
"""

with open("complete_script.js", "w") as f:
    f.write(js_code)

print("Saved complete_script.js. Testing with node...")
res = subprocess.run(["node", "-c", "complete_script.js"], capture_output=True, text=True)
if res.returncode == 0:
    print("SUCCESS: complete_script.js is 100% syntactically valid!")
else:
    print("ERROR in complete_script.js:", res.stderr)
    sys.exit(1)
