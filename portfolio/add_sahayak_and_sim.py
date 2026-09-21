with open("antriksh-portfolio-studio.html", "r", encoding="utf-8") as f:
    text = f.read()

OLD_ARCH_DATA_SANDFORGE = """  sandforge: {"""

SAHAYAK_ENTRY = """  sahayak: {
    title: "Sahayak-LM — Enterprise QLoRA 8B Bilingual Hinglish Fine-Tuning",
    subtitle: "Domain-Specific Language Model Fine-Tuned for Support Systems",
    flowchart: `
<svg viewBox="0 0 760 250" style="width:100%; height:auto;" aria-label="Sahayak-LM Architecture">
  <defs>
    <marker id="arrow-sahayak" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#83e1ff" />
    </marker>
  </defs>
  <g transform="translate(20, 30)">
    <rect width="160" height="65" rx="8" fill="#171915" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/>
    <text x="14" y="26" fill="#8c9082" font-size="10" font-family="monospace">DATASET CURATION</text>
    <text x="14" y="46" fill="#fff" font-size="11" font-weight="bold" font-family="monospace">10K+ Hinglish Dialogues</text>
  </g>
  <path d="M 180 62 L 220 62" stroke="#83e1ff" stroke-width="2" marker-end="url(#arrow-sahayak)"/>
  <g transform="translate(230, 30)">
    <rect width="160" height="65" rx="8" fill="#171915" stroke="#83e1ff" stroke-width="1.5"/>
    <text x="14" y="26" fill="#83e1ff" font-size="10" font-family="monospace">CUSTOM TOKENIZER</text>
    <text x="14" y="46" fill="#fff" font-size="11" font-weight="bold" font-family="monospace">+2,048 Hinglish Tokens</text>
  </g>
  <path d="M 390 62 L 430 62" stroke="#83e1ff" stroke-width="2" marker-end="url(#arrow-sahayak)"/>
  <g transform="translate(440, 30)">
    <rect width="170" height="65" rx="8" fill="#171915" stroke="#b8a2ff" stroke-width="1.5"/>
    <text x="14" y="26" fill="#b8a2ff" font-size="10" font-family="monospace">QLORA QUANTIZATION</text>
    <text x="14" y="46" fill="#fff" font-size="11" font-weight="bold" font-family="monospace">4-Bit NF4 Base Model</text>
  </g>
  <path d="M 610 62 L 640 62" stroke="#83e1ff" stroke-width="2" marker-end="url(#arrow-sahayak)"/>
  <g transform="translate(650, 30)">
    <rect width="100" height="65" rx="8" fill="#152012" stroke="#d6ff62" stroke-width="1.5"/>
    <text x="12" y="26" fill="#d6ff62" font-size="9" font-family="monospace">SERVING</text>
    <text x="12" y="46" fill="#fff" font-size="11" font-weight="bold" font-family="monospace">vLLM ↗</text>
  </g>
  <path d="M 525 95 L 525 145" stroke="#b8a2ff" stroke-width="2" marker-end="url(#arrow-sahayak)"/>
  <g transform="translate(360, 145)">
    <rect width="320" height="55" rx="8" fill="#1a1622" stroke="#b8a2ff" stroke-width="1.2"/>
    <text x="14" y="22" fill="#b8a2ff" font-size="10" font-weight="bold" font-family="monospace">PEFT / LORA ADAPTER WEIGHTS (r=64, alpha=16)</text>
    <text x="14" y="40" fill="#dcd8c8" font-size="10.5" font-family="monospace">Only 34.2M trainable parameters (0.42% of base model)</text>
  </g>
</svg>`,
    specs: [
      { label: "Base Architecture", val: "Llama-3 8B Instruct" },
      { label: "Fine-Tuning Method", val: "QLoRA 4-bit NormalFloat (NF4)" },
      { label: "Trainable Parameters", val: "34.2 Million (0.42%)" },
      { label: "Perplexity Score", val: "Reduced from 14.8 to 3.42" },
      { label: "Hardware Utilized", val: "NVIDIA A100 80GB Tensor Core" },
      { label: "Inference Latency", val: "~22ms / token via vLLM" }
    ],
    links: [
      { label: "Explore Model in Playground ↗", href: "#playground" }
    ]
  },
  sandforge: {"""

if OLD_ARCH_DATA_SANDFORGE in text:
    text = text.replace(OLD_ARCH_DATA_SANDFORGE, SAHAYAK_ENTRY, 1)
    print("Sahayak-LM entry added to ARCH_DATA.")
else:
    print("WARNING: OLD_ARCH_DATA_SANDFORGE not matched.")

OLD_RENDER_MODAL = """    <div class="arch-specs-grid">
      ${data.specs.map(s => `
        <div class="arch-spec-card">
          <div class="arch-spec-label mono">${s.label}</div>
          <div class="arch-spec-val mono">${s.val}</div>
        </div>
      `).join("")}
    </div>
    <div style="display:flex; gap:10px; margin-top:20px; flex-wrap:wrap;">"""

NEW_RENDER_MODAL = """    <div class="arch-specs-grid">
      ${data.specs.map(s => `
        <div class="arch-spec-card">
          <div class="arch-spec-label mono">${s.label}</div>
          <div class="arch-spec-val mono">${s.val}</div>
        </div>
      `).join("")}
    </div>
    ${key === "sandforge" ? `
      <div class="sim-box mono">
        <div class="sim-header">
          <span style="color:var(--acid); font-weight:700; font-size:11px;">▶ INTERACTIVE AGENT EXECUTION SIMULATOR</span>
          <span style="font-size:10px; color:#8c9082;">Click any stage or step through:</span>
        </div>
        <div class="sim-timeline" id="sim-timeline-box"></div>
        <div class="sim-console-output" id="sim-console-output"></div>
      </div>
    ` : ""}
    <div style="display:flex; gap:10px; margin-top:20px; flex-wrap:wrap;">"""

if OLD_RENDER_MODAL in text:
    text = text.replace(OLD_RENDER_MODAL, NEW_RENDER_MODAL, 1)
    print("Simulation container added to renderArchitectureModal.")
else:
    print("WARNING: OLD_RENDER_MODAL not matched.")

OLD_RENDER_BODY_CALL = """    <div style="display:flex; gap:10px; margin-top:20px; flex-wrap:wrap;">
      ${data.links.map(l => `
        <a href="${l.href}" ${l.href.startsWith("http") ? 'target="_blank" rel="noopener"' : ''} class="pill mono" style="font-size:11px; padding:8px 16px;">
          ${l.label}
        </a>
      `).join("")}
    </div>
  `;
}"""

NEW_RENDER_BODY_CALL = """    <div style="display:flex; gap:10px; margin-top:20px; flex-wrap:wrap;">
      ${data.links.map(l => `
        <a href="${l.href}" ${l.href.startsWith("http") ? 'target="_blank" rel="noopener"' : ''} class="pill mono" style="font-size:11px; padding:8px 16px;">
          ${l.label}
        </a>
      `).join("")}
    </div>
  `;
  if (key === "sandforge" && typeof renderSimTimeline === "function") {
    renderSimTimeline();
  }
}"""

if OLD_RENDER_BODY_CALL in text:
    text = text.replace(OLD_RENDER_BODY_CALL, NEW_RENDER_BODY_CALL, 1)
    print("renderSimTimeline invocation added.")
else:
    print("WARNING: OLD_RENDER_BODY_CALL not matched.")

with open("antriksh-portfolio-studio.html", "w", encoding="utf-8") as f:
    f.write(text)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(text)

print("Files saved successfully.")
