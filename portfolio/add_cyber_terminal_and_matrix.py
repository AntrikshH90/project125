with open("antriksh-portfolio-studio.html", "r", encoding="utf-8") as f:
    text = f.read()

# 1. Add Matrix Rain canvas to HTML before </body>
if '<canvas id="matrix-rain-canvas"' not in text:
    text = text.replace("</body>", '<canvas id="matrix-rain-canvas" aria-hidden="true"></canvas>\n</body>', 1)
    print("Matrix canvas added.")

# 2. Upgrade handleTerminalQuery with Shell Commands
OLD_TERM_HANDLER = """function handleTerminalQuery(queryText) {
  if (!queryText.trim()) return;
  const q = queryText.toLowerCase();

  // Add User Message
  const userDiv = document.createElement("div");
  userDiv.className = "term-msg term-user mono";
  userDiv.textContent = queryText;
  termLog.appendChild(userDiv);"""

NEW_TERM_HANDLER = """function handleTerminalQuery(queryText) {
  if (!queryText.trim()) return;
  playKeyClickSound();
  const q = queryText.trim().toLowerCase();

  // Add User Message
  const userDiv = document.createElement("div");
  userDiv.className = "term-msg term-user mono";
  userDiv.textContent = queryText;
  termLog.appendChild(userDiv);

  // Shell Command Interceptor
  if (q === "clear" || q === "cls") {
    termLog.innerHTML = `
      <div class="term-msg term-bot mono">
        <div class="term-bot-row">
          <img src="images/antriksh-avatar-head.png" alt="Antriksh AI" class="term-bot-avatar" />
          <div class="term-bot-body">
            <strong>Terminal buffer cleared.</strong> Type <code style="color:var(--acid);">help</code> to view available commands.
          </div>
        </div>
      </div>`;
    if (termInput) termInput.value = "";
    return;
  }

  if (q === "help") {
    const helpDiv = document.createElement("div");
    helpDiv.className = "term-msg term-bot mono";
    helpDiv.innerHTML = `
      <div class="term-bot-row">
        <img src="images/antriksh-avatar-head.png" alt="Antriksh AI" class="term-bot-avatar" />
        <div class="term-bot-body">
          <strong style="color:var(--acid);">AVAILABLE APEX COMMANDS:</strong><br>
          • <code style="color:var(--acid);">sandforge</code> — Autonomous PR Agent Architecture & Nebius Sandbox<br>
          • <code style="color:var(--acid);">arch</code> — Open System Architecture Deep Dive Flowcharts<br>
          • <code style="color:var(--acid);">games</code> — Play The Bezier Challenge & Neural Synapse Tuner<br>
          • <code style="color:var(--acid);">matrix</code> — Toggle Cyber Matrix Digital Rain<br>
          • <code style="color:var(--acid);">supernova</code> — Detonate Golden Particle Supernova Easter Egg<br>
          • <code style="color:var(--acid);">certs</code> — Jump to Chapter 1 in 3D Credential Book<br>
          • <code style="color:var(--acid);">clear</code> — Clear Terminal History
        </div>
      </div>`;
    termLog.appendChild(helpDiv);
    termLog.scrollTop = termLog.scrollHeight;
    if (termInput) termInput.value = "";
    return;
  }

  if (q === "matrix") {
    toggleMatrixDigitalRain();
    const mDiv = document.createElement("div");
    mDiv.className = "term-msg term-bot mono";
    mDiv.innerHTML = `<div class="term-bot-row"><img src="images/antriksh-avatar-head.png" class="term-bot-avatar" /><div class="term-bot-body"><strong>Matrix digital rain toggled.</strong> Press 'M' key or re-type 'matrix' to dismiss.</div></div>`;
    termLog.appendChild(mDiv);
    termLog.scrollTop = termLog.scrollHeight;
    if (termInput) termInput.value = "";
    return;
  }

  if (q === "supernova") {
    triggerSupernovaEasterEgg();
    const sDiv = document.createElement("div");
    sDiv.className = "term-msg term-bot mono";
    sDiv.innerHTML = `<div class="term-bot-row"><img src="images/antriksh-avatar-head.png" class="term-bot-avatar" /><div class="term-bot-body"><strong style="color:#ffd700;">✦ Golden Supernova Engaged!</strong> Check the 3D canvas behind the terminal.</div></div>`;
    termLog.appendChild(sDiv);
    termLog.scrollTop = termLog.scrollHeight;
    if (termInput) termInput.value = "";
    return;
  }

  if (q === "arch") {
    openArchModal("sandforge");
    if (termInput) termInput.value = "";
    return;
  }

  if (q === "games") {
    if (tabNeuralBtn) tabNeuralBtn.click();
    const gDiv = document.createElement("div");
    gDiv.className = "term-msg term-bot mono";
    gDiv.innerHTML = `<div class="term-bot-row"><img src="images/antriksh-avatar-head.png" class="term-bot-avatar" /><div class="term-bot-body">Switched to <strong>Neural Synapse Tuner & Bezier Playground</strong> in Section 05!</div></div>`;
    termLog.appendChild(gDiv);
    termLog.scrollTop = termLog.scrollHeight;
    if (termInput) termInput.value = "";
    return;
  }"""

if OLD_TERM_HANDLER in text:
    text = text.replace(OLD_TERM_HANDLER, NEW_TERM_HANDLER, 1)
    print("handleTerminalQuery shell commands injected.")
else:
    print("WARNING: OLD_TERM_HANDLER not matched.")

# 3. Add Matrix Rain Animation Engine
MATRIX_RAIN_JS = """
/* ==========================================================
   MATRIX DIGITAL RAIN EASTER EGG ENGINE
========================================================== */
let matrixActive = false;
let matrixAnimId = null;

function toggleMatrixDigitalRain() {
  const canvas = document.getElementById("matrix-rain-canvas");
  if (!canvas) return;
  matrixActive = !matrixActive;

  if (matrixActive) {
    canvas.classList.add("active");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext("2d");
    const chars = "01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンAntrikshApexAIML";
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = new Array(columns).fill(1);

    function drawMatrix() {
      if (!matrixActive) return;
      ctx.fillStyle = "rgba(10, 14, 8, 0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#d6ff62";
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const textChar = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(textChar, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
      matrixAnimId = requestAnimationFrame(drawMatrix);
    }
    drawMatrix();
  } else {
    canvas.classList.remove("active");
    if (matrixAnimId) cancelAnimationFrame(matrixAnimId);
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

// Hotkey 'm' toggles matrix digital rain (when not in an input/textarea)
window.addEventListener("keydown", e => {
  if (e.key.toLowerCase() === "m" && !["input", "textarea"].includes((document.activeElement || {}).tagName?.toLowerCase() || "")) {
    toggleMatrixDigitalRain();
  }
});
"""

text = text.replace("</script>", MATRIX_RAIN_JS + "\n</script>", 1)
print("Matrix rain engine added.")

with open("antriksh-portfolio-studio.html", "w", encoding="utf-8") as f:
    f.write(text)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(text)

print("Files saved successfully.")
