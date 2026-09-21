import re
import sys

with open("antriksh-portfolio-studio.html", "r", encoding="utf-8") as f:
    html = f.read()

# 1. Add CSS for Avatar Card, AI Terminal, and Foil Sheen
enrich_css = """
/* ==========================================================
   ENRICHMENTS: AVATAR CARD, AI TERMINAL, FOIL SHEEN
========================================================== */
/* About Section Grid with Avatar */
.about-grid-content {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 48px;
  align-items: start;
}
@media (max-width: 900px) {
  .about-grid-content {
    grid-template-columns: 1fr;
    gap: 32px;
  }
}

.avatar-card {
  background: #141613;
  border: 1px solid rgba(214, 255, 98, 0.2);
  border-radius: 20px;
  padding: 24px;
  text-align: center;
  position: relative;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
  transition: transform 0.4s var(--ease), border-color 0.4s var(--ease);
}
.avatar-card:hover {
  transform: translateY(-4px);
  border-color: var(--acid);
}
.avatar-img-wrap {
  position: relative;
  width: 140px;
  height: 140px;
  margin: 0 auto 18px;
  border-radius: 50%;
  padding: 4px;
  background: linear-gradient(135deg, var(--acid), var(--violet), var(--orange));
  box-shadow: 0 0 24px rgba(214, 255, 98, 0.2);
}
.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  background: #1a1c18;
  display: block;
}
.avatar-status-pill {
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  background: #11130f;
  border: 1px solid rgba(214, 255, 98, 0.4);
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 9px;
  color: var(--acid);
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 6px;
}
.status-beacon {
  width: 6px;
  height: 6px;
  background: var(--acid);
  border-radius: 50%;
  box-shadow: 0 0 8px var(--acid);
  animation: beacon-pulse 1.8s infinite;
}
@keyframes beacon-pulse {
  0%, 100% { opacity: 0.4; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1.2); }
}

.avatar-name {
  color: #fff;
  font-size: 20px;
  font-weight: 800;
  margin: 0 0 4px;
  letter-spacing: -0.5px;
}
.avatar-role {
  color: #8c9082;
  font-size: 11px;
  margin-bottom: 16px;
}
.avatar-badges {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 14px;
}
.ambassador-badge {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 9.5px;
  color: #cdd1c2;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 8px;
}
.badge-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--acid);
  flex-shrink: 0;
}

/* AI Terminal Floating Widget */
.ai-terminal-trigger {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: #141613;
  color: #f2f1ea;
  border: 1px solid rgba(214, 255, 98, 0.4);
  padding: 10px 18px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  z-index: 999;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4), 0 0 16px rgba(214, 255, 98, 0.15);
  transition: all 0.25s var(--ease);
}
.ai-terminal-trigger:hover {
  background: var(--ink);
  color: var(--acid);
  border-color: var(--acid);
  transform: translateY(-3px) scale(1.03);
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.5), 0 0 24px rgba(214, 255, 98, 0.3);
}
.terminal-icon {
  font-size: 14px;
  animation: slow-spin 20s linear infinite;
}

/* AI Terminal Modal Window */
.terminal-dialog {
  background: #121410;
  color: #efeee8;
  border: 1px solid rgba(214, 255, 98, 0.35);
  border-radius: 20px;
  padding: 24px;
  width: min(580px, calc(100% - 32px));
  max-height: 85dvh;
  box-shadow: 0 30px 100px rgba(0, 0, 0, 0.8), 0 0 40px rgba(214, 255, 98, 0.15);
}
.terminal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 14px;
  margin-bottom: 18px;
}
.terminal-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}
.terminal-dots {
  display: flex;
  gap: 5px;
}
.term-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.term-red { background: #ff5f56; }
.term-yellow { background: #ffbd2e; }
.term-green { background: #27c93f; }

.terminal-chat-log {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: 380px;
  overflow-y: auto;
  padding-right: 6px;
  margin-bottom: 18px;
}
.terminal-chat-log::-webkit-scrollbar { width: 3px; }
.terminal-chat-log::-webkit-scrollbar-thumb { background: rgba(214, 255, 98, 0.2); border-radius: 3px; }

.term-msg {
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 12px;
  line-height: 1.5;
}
.term-bot {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #d8dcce;
}
.term-user {
  background: rgba(214, 255, 98, 0.15);
  border: 1px solid rgba(214, 255, 98, 0.3);
  color: #fff;
  align-self: flex-end;
  max-width: 85%;
}

.term-quick-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
}
.term-chip {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #9ea294;
  font-size: 10.5px;
  padding: 5px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}
.term-chip:hover {
  background: var(--acid);
  color: var(--ink);
  border-color: var(--acid);
}

.term-input-box {
  display: flex;
  gap: 8px;
}
.term-input {
  flex: 1;
  background: #181b15;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 10px 14px;
  color: #fff;
  font-size: 12px;
}
.term-input:focus {
  outline: none;
  border-color: var(--acid);
}
.term-send-btn {
  background: var(--acid);
  color: var(--ink);
  border: 0;
  border-radius: 8px;
  padding: 0 16px;
  font-weight: 700;
  cursor: pointer;
  font-size: 12px;
}

/* Page corner curl hover */
.page-front::after {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 0 0 0 0;
  border-color: transparent transparent transparent transparent;
  transition: all 0.3s var(--ease);
  pointer-events: none;
  box-shadow: -2px 2px 6px rgba(0, 0, 0, 0.1);
}
.book-leaf:not(.flipped):hover .page-front::after {
  border-width: 0 26px 26px 0;
  border-color: transparent #e5e2d6 transparent transparent;
}
"""

pos_style_close = html.find("</style>")
html = html[:pos_style_close] + "\n" + enrich_css + "\n" + html[pos_style_close:]

# 2. Add AI Terminal Button & Modal right before </body>
terminal_html = """
  <!-- AI Terminal Floating Action Widget -->
  <button type="button" class="ai-terminal-trigger mono magnetic" id="ai-terminal-open" aria-label="Open AI Recruiter Assistant">
    <span class="terminal-icon" aria-hidden="true">✦</span>
    <span>Ask Antriksh's AI</span>
  </button>

  <!-- AI Terminal Modal Dialog -->
  <dialog class="terminal-dialog" id="ai-terminal-modal" aria-labelledby="terminal-modal-title">
    <div class="terminal-header">
      <div class="terminal-title-group">
        <div class="terminal-dots">
          <span class="term-dot term-red"></span>
          <span class="term-dot term-yellow"></span>
          <span class="term-dot term-green"></span>
        </div>
        <span class="mono" id="terminal-modal-title" style="color:var(--acid); font-size:11px; font-weight:700;">
          APEX AGENT INTERFACE · ANTRISKSH KNOWLEDGE BASE v2.6
        </span>
      </div>
      <button type="button" class="dialog-close" id="terminal-modal-close" aria-label="Close terminal">×</button>
    </div>

    <div class="terminal-chat-log" id="terminal-log">
      <div class="term-msg term-bot mono">
        <strong>Apex Terminal Agent initialized.</strong><br>
        Ask me anything about Antriksh's AI engineering, B.Tech background at AKTU, IIT Guwahati ambassadorship, Nebius × NVIDIA hackathon project (SandForge), or verified credentials.
      </div>
    </div>

    <div class="term-quick-chips mono">
      <button type="button" class="term-chip" data-query="Tell me about SandForge and the NVIDIA Hackathon">SandForge (NVIDIA Hackathon) ↗</button>
      <button type="button" class="term-chip" data-query="What is Antriksh's education & IIT-G role?">Education & IIT-G Ambassador ↗</button>
      <button type="button" class="term-chip" data-query="What AI & LLM tech stack does he specialize in?">AI & LLM Tech Stack ↗</button>
      <button type="button" class="term-chip" data-query="Show me his Adobe Illustrator work">Adobe Illustrator Lab ↗</button>
      <button type="button" class="term-chip" data-query="How do I contact Antriksh?">Contact / Hire Antriksh ↗</button>
    </div>

    <form class="term-input-box" id="terminal-form" onsubmit="return false;">
      <input type="text" class="term-input mono" id="terminal-input" placeholder="Type a question (e.g. What did he build with Nemotron?)" />
      <button type="submit" class="term-send-btn mono" id="terminal-send">Send ↵</button>
    </form>
  </dialog>
"""

pos_body_close = html.rfind("</body>")
html = html[:pos_body_close] + "\n" + terminal_html + "\n" + html[pos_body_close:]

# 3. Enhance About section with Avatar Card
new_about_section = """<section id="about" class="section about wrap" aria-labelledby="about-title">
      <div class="about-label reveal">
        <span class="mono muted">04 / The human behind it</span>
        <svg class="about-doodle" viewBox="0 0 100 100" aria-hidden="true">
          <g fill="none" stroke="currentColor" stroke-width="2">
            <ellipse cx="50" cy="50" rx="43" ry="17" transform="rotate(-35 50 50)"/>
            <ellipse cx="50" cy="50" rx="43" ry="17" transform="rotate(35 50 50)"/>
            <ellipse cx="50" cy="50" rx="43" ry="17" transform="rotate(90 50 50)"/>
          </g>
          <circle cx="50" cy="50" r="7" fill="currentColor"/>
        </svg>
      </div>

      <div class="about-grid-content reveal">
        <!-- Interactive Avatar Card -->
        <div class="avatar-card">
          <div class="avatar-img-wrap">
            <img class="avatar-img" src="https://avatars.githubusercontent.com/u/203316506?v=4" alt="Antriksh Yadav" onerror="this.src='https://github.com/AntrikshH90.png';" />
            <div class="avatar-status-pill mono">
              <span class="status-beacon"></span>
              <span>Available for AI Roles</span>
            </div>
          </div>
          <h3 class="avatar-name">Antriksh Yadav</h3>
          <div class="avatar-role mono">AI/ML Engineer · Founder, Apex</div>

          <div class="avatar-badges mono">
            <div class="ambassador-badge">
              <span class="badge-dot"></span>
              <span>Campus Ambassador @ IIT Guwahati</span>
            </div>
            <div class="ambassador-badge">
              <span class="badge-dot"></span>
              <span>Member, Google Developer Group (GDG)</span>
            </div>
            <div class="ambassador-badge">
              <span class="badge-dot"></span>
              <span>B.Tech AIML · AKTU (Dr. APJ Abdul Kalam Tech Univ)</span>
            </div>
            <div class="ambassador-badge">
              <span class="badge-dot"></span>
              <span>McKinsey Forward Program Scholar</span>
            </div>
          </div>
        </div>

        <!-- Bio & Facts -->
        <div>
          <h2 id="about-title">
            Still learning the rules.<br />
            <span>Already wondering<br />what’s beyond them.</span>
          </h2>
          <p>
            I’m <strong>Antriksh Yadav</strong> — an Artificial Intelligence &amp; Machine Learning engineer based in Kanpur, India.
            I’m a Second-Year B.Tech student in AIML at <strong>Dr. A.P.J. Abdul Kalam Technical University (AKTU)</strong>,
            actively serving as a <strong>Campus Ambassador for IIT Guwahati</strong> and a member of the <strong>Google Developer Group (GDG)</strong>.
          </p>
          <p>
            I run <strong>Apex Intelligence</strong>, where I architect high-impact autonomous AI agents, fine-tune open-source models,
            and build intelligent software systems. Recently, I created <strong>SandForge</strong> for the
            <em>Nebius × NVIDIA Global AI Hackathon</em> — an autonomous PR agent that plans with Nemotron 3 Nano, patches with Nemotron 3 Super (120B-A12B),
            and backtracks across checkpointed VM sandboxes.
          </p>
          <p>
            With <strong>47 verified credentials</strong> across NVIDIA, Anthropic, Google Cloud, McKinsey &amp; Company, Deloitte, and Adobe Creative Direction —
            every project on this page is genuinely engineered and deployed.
          </p>
          <div class="about-facts">
            <div class="fact"><b>20+</b><span class="mono">Builds Shipped</span></div>
            <div class="fact"><b>47</b><span class="mono">Verified Honors</span></div>
            <div class="fact"><b>IIT-G</b><span class="mono">Campus Ambassador</span></div>
            <div class="fact"><b>Founder</b><span class="mono">Apex Intelligence</span></div>
          </div>
        </div>
      </div>
    </section>"""

pos_about_start = html.find('<section id="about"')
pos_about_end = html.find('</section>', pos_about_start) + len('</section>')
html = html[:pos_about_start] + new_about_section + html[pos_about_end:]

# 4. Add AI Terminal JS logic
terminal_js = """
/* ==========================================================
   AI TERMINAL / RECRUITER AGENT CONTROLLER
========================================================== */
const termModal = document.getElementById("ai-terminal-modal");
const termOpenBtn = document.getElementById("ai-terminal-open");
const termCloseBtn = document.getElementById("terminal-modal-close");
const termLog = document.getElementById("terminal-log");
const termInput = document.getElementById("terminal-input");
const termForm = document.getElementById("terminal-form");

if (termOpenBtn && termModal) {
  termOpenBtn.addEventListener("click", () => {
    termModal.showModal();
    document.body.classList.add("modal-open");
    if (termInput) termInput.focus();
  });
}

if (termCloseBtn && termModal) {
  termCloseBtn.addEventListener("click", () => {
    termModal.close();
    document.body.classList.remove("modal-open");
  });
}

const FAQ_DATA = [
  {
    keywords: ["sandforge", "nvidia", "hackathon", "nebius", "nemotron", "pr agent"],
    answer: "<strong>SandForge</strong> is Antriksh's flagship autonomous PR agent built for the <em>Nebius × NVIDIA Global AI Hackathon</em>. It clones GitHub repos into Nebius Token Factory Sandboxes, plans patches using <strong>NVIDIA Nemotron 3 Nano</strong>, generates reasoning-driven code with <strong>Nemotron 3 Super (120B-A12B)</strong>, runs test suites, and backtracks to clean sandbox checkpoints if tests fail — opening verified PRs when tests pass! <br><a href='https://github.com/AntrikshH90/sandforge' target='_blank' style='color:var(--acid); font-weight:700;'>Inspect SandForge Repo ↗</a>"
  },
  {
    keywords: ["education", "college", "btech", "aktu", "iit", "ambassador", "degree", "university", "guwahati"],
    answer: "Antriksh is a Second-Year <strong>B.Tech in Artificial Intelligence & Machine Learning (AIML)</strong> student at <strong>Dr. A.P.J. Abdul Kalam Technical University (AKTU)</strong>, Axis Institute. He is also actively serving as a <strong>Campus Ambassador for IIT Guwahati (IIT-G)</strong> and is a member of the <strong>Google Developer Group (GDG)</strong>."
  },
  {
    keywords: ["stack", "tech", "skills", "tools", "python", "model", "lang"],
    answer: "Antriksh's technical stack spans: <strong>Languages:</strong> Python, TypeScript/JavaScript, C/C++, SQL. <strong>AI & Agents:</strong> LangChain, LlamaIndex, NVIDIA Nemotron, Anthropic Claude API, OpenAI, RAG architecture, MLOps, Hugging Face. <strong>Hardware/IoT:</strong> NVIDIA Jetson Nano, ESP32, MQTT. <strong>Creative Engineering:</strong> Adobe Illustrator CC, WebGL, 3D Canvas mathematics."
  },
  {
    keywords: ["illustrator", "design", "creative", "vector", "adobe", "svg", "ui"],
    answer: "Antriksh combines deep AI engineering with vector design mastery! He holds certified qualifications in <strong>Adobe Illustrator CC</strong> and <strong>CalArts Graphic Design Specialization</strong>. Check out the interactive <strong>Adobe Illustrator & Vector Studio</strong> in the Playground section above to sculpt Bezier curves and export real SVG vector art!"
  },
  {
    keywords: ["contact", "hire", "email", "reach", "collaborate", "linkedin"],
    answer: "You can reach Antriksh directly via: <strong>Email:</strong> <a href='mailto:antrikshyadav97@gmail.com' style='color:var(--acid)'>antrikshyadav97@gmail.com</a> | <strong>LinkedIn:</strong> <a href='https://www.linkedin.com/in/antrikshyadav97' target='_blank' style='color:var(--acid)'>linkedin.com/in/antrikshyadav97 ↗</a> | <strong>GitHub:</strong> <a href='https://github.com/AntrikshH90' target='_blank' style='color:var(--acid)'>github.com/AntrikshH90 ↗</a>"
  },
  {
    keywords: ["credentials", "certificate", "license", "honors", "book"],
    answer: "Antriksh holds <strong>47 verified industry honors</strong> from NVIDIA (Jetson Nano AI), Anthropic (AI Fluency), Google (Gemini, Analytics, Cloud), McKinsey & Company (Forward Program), Deloitte, Goldman Sachs, and Adobe. You can flip through his physical-style <strong>3D Credential Book</strong> in Section 03 of this portfolio!"
  }
];

function handleTerminalQuery(queryText) {
  if (!queryText.trim()) return;
  const q = queryText.toLowerCase();

  // Add User Message
  const userDiv = document.createElement("div");
  userDiv.className = "term-msg term-user mono";
  userDiv.textContent = queryText;
  termLog.appendChild(userDiv);

  // Match response
  let match = FAQ_DATA.find(item => item.keywords.some(k => q.includes(k)));
  const botDiv = document.createElement("div");
  botDiv.className = "term-msg term-bot mono";

  if (match) {
    botDiv.innerHTML = match.answer;
  } else {
    botDiv.innerHTML = `I understand you're inquiring about "${queryText}". Antriksh is an AI/ML engineer, Founder of Apex Intelligence, and Campus Ambassador @ IIT-G with 47 verified credentials. Would you like to check his <strong>SandForge project</strong>, his <strong>3D Credential Book</strong>, or <strong>get in touch directly</strong>?`;
  }

  termLog.appendChild(botDiv);
  termLog.scrollTop = termLog.scrollHeight;
  if (termInput) termInput.value = "";
}

if (termForm) {
  termForm.addEventListener("submit", e => {
    e.preventDefault();
    if (termInput) handleTerminalQuery(termInput.value);
  });
}

document.querySelectorAll(".term-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    handleTerminalQuery(chip.dataset.query);
  });
});

// Dynamic foil light reflection on 3D book cover
const bookCoverFront = document.querySelector(".cover-front");
if (bookCoverFront) {
  bookCoverFront.addEventListener("mousemove", e => {
    const rect = bookCoverFront.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    bookCoverFront.style.background = `radial-gradient(circle at ${x}% ${y}%, rgba(214, 255, 98, 0.22) 0%, transparent 60%), linear-gradient(135deg, #141613 0%, #242720 50%, #151713 100%)`;
  });
  bookCoverFront.addEventListener("mouseleave", () => {
    bookCoverFront.style.background = "linear-gradient(135deg, #141613 0%, #242720 50%, #151713 100%)";
  });
}
"""

pos_script_close = html.rfind("</script>")
html = html[:pos_script_close] + "\n" + terminal_js + "\n" + html[pos_script_close:]

# Write updated files
with open("antriksh-portfolio-studio.html", "w", encoding="utf-8") as f:
    f.write(html)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

print("SUCCESS: Enriched portfolio with Avatar Card, AI Terminal, and Foil Sheen!")
print("Updated file size:", len(html), "chars, lines:", html.count("\n"))
