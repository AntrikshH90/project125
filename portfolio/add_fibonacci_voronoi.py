with open("antriksh-portfolio-studio.html", "r", encoding="utf-8") as f:
    text = f.read()

OLD = """      vCtx.stroke();
      vCtx.restore();
    }
  } else if (vPreset === "bezier") {"""

NEW = """      vCtx.stroke();
      vCtx.restore();
    }
  } else if (vPreset === "fibonacci") {
    const phi = 1.61803398875;
    const maxR = Math.min(w, h) * 0.42;
    vCtx.beginPath();
    for (let t = 0; t <= Math.PI * 7.5; t += 0.04) {
      const r = (maxR / 16) * Math.pow(phi, (t * vTension) / (Math.PI * 2));
      if (r > maxR) break;
      const x = cx + r * Math.cos(t);
      const y = cy + r * Math.sin(t);
      if (t === 0) vCtx.moveTo(x, y);
      else vCtx.lineTo(x, y);
    }
    vCtx.stroke();
  } else if (vPreset === "voronoi") {
    const cells = Math.max(6, vPetals * 2);
    const pts = [];
    for (let k = 0; k < cells; k++) {
      const a = (k / cells) * Math.PI * 2;
      const d = (Math.sin(k * 1.8 + vTension) * 0.45 + 0.5) * Math.min(w, h) * 0.38;
      pts.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d });
    }
    vCtx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dist = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        if (dist < Math.min(w, h) * 0.35) {
          vCtx.moveTo(pts[i].x, pts[i].y);
          vCtx.lineTo(pts[j].x, pts[j].y);
        }
      }
    }
    vCtx.stroke();
  } else if (vPreset === "bezier") {"""

if OLD in text:
    text = text.replace(OLD, NEW, 1)
    with open("antriksh-portfolio-studio.html", "w", encoding="utf-8") as f:
        f.write(text)
    with open("index.html", "w", encoding="utf-8") as f:
        f.write(text)
    print("Fibonacci & Voronoi drawing successfully injected.")
else:
    print("ERROR: OLD not matched.")
