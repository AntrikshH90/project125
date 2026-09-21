with open("antriksh-portfolio-studio.html", "r", encoding="utf-8") as f:
    text = f.read()

# 1. Update AI Terminal Trigger button in HTML
OLD_TRIGGER = """  <!-- AI Terminal Floating Action Widget -->
  <button type="button" class="ai-terminal-trigger mono magnetic" id="ai-terminal-open" aria-label="Open AI Recruiter Assistant">
    <span class="terminal-icon" aria-hidden="true">✦</span>
    <span>Ask Antriksh's AI</span>
  </button>"""

NEW_TRIGGER = """  <!-- AI Terminal Floating Action Widget -->
  <button type="button" class="ai-terminal-trigger mono magnetic" id="ai-terminal-open" aria-label="Open AI Recruiter Assistant">
    <img src="images/antriksh-avatar-head.png" alt="Antriksh 3D Avatar" class="terminal-trigger-thumb" />
    <span>Ask Antriksh's AI</span>
    <span class="terminal-icon" aria-hidden="true">✦</span>
  </button>"""

if OLD_TRIGGER in text:
    text = text.replace(OLD_TRIGGER, NEW_TRIGGER, 1)
    print("Trigger button updated with 3D avatar headshot.")
else:
    print("WARNING: OLD_TRIGGER not matched.")

# 2. Update AI Terminal Header with Avatar
OLD_HEADER = """        <div class="terminal-dots">
          <span class="term-dot term-red"></span>
          <span class="term-dot term-yellow"></span>
          <span class="term-dot term-green"></span>
        </div>
        <span class="mono" id="terminal-modal-title" style="color:var(--acid); font-size:11px; font-weight:700;">
          APEX AGENT INTERFACE · ANTRISKSH KNOWLEDGE BASE v2.6
        </span>"""

NEW_HEADER = """        <img src="images/antriksh-avatar-head.png" alt="Antriksh Avatar" class="term-bot-avatar" />
        <div class="terminal-dots">
          <span class="term-dot term-red"></span>
          <span class="term-dot term-yellow"></span>
          <span class="term-dot term-green"></span>
        </div>
        <span class="mono" id="terminal-modal-title" style="color:var(--acid); font-size:11px; font-weight:700;">
          APEX AGENT INTERFACE · ANTRISKSH AI COPILOT v2.8
        </span>"""

if OLD_HEADER in text:
    text = text.replace(OLD_HEADER, NEW_HEADER, 1)
    print("Terminal header updated with 3D avatar.")
else:
    print("WARNING: OLD_HEADER not matched.")

# 3. Update Initial Chat Message with Avatar
OLD_INIT_MSG = """    <div class="terminal-chat-log" id="terminal-log">
      <div class="term-msg term-bot mono">
        <strong>Apex Terminal Agent initialized.</strong><br>
        Ask me anything about Antriksh's AI engineering, B.Tech background at AKTU, IIT Guwahati ambassadorship, Nebius × NVIDIA hackathon project (SandForge), or verified credentials.
      </div>
    </div>"""

NEW_INIT_MSG = """    <div class="terminal-chat-log" id="terminal-log">
      <div class="term-msg term-bot mono">
        <div class="term-bot-row">
          <img src="images/antriksh-avatar-head.png" alt="Antriksh AI" class="term-bot-avatar" />
          <div class="term-bot-body">
            <strong>Apex Terminal Agent initialized.</strong><br>
            Ask me anything about Antriksh's AI engineering, B.Tech background at AKTU, IIT Guwahati ambassadorship, Nebius × NVIDIA hackathon project (SandForge), or verified credentials.
          </div>
        </div>
      </div>
    </div>"""

if OLD_INIT_MSG in text:
    text = text.replace(OLD_INIT_MSG, NEW_INIT_MSG, 1)
    print("Initial chat message updated with avatar.")
else:
    print("WARNING: OLD_INIT_MSG not matched.")

# 4. Update FAQ Answers to include rich action buttons
OLD_SANDFORGE_FAQ = """    answer: "<strong>SandForge</strong> is Antriksh's flagship autonomous PR agent built for the <em>Nebius × NVIDIA Global AI Hackathon</em>. It clones GitHub repos into Nebius Token Factory Sandboxes, plans patches using <strong>NVIDIA Nemotron 3 Nano</strong>, generates reasoning-driven code with <strong>Nemotron 3 Super (120B-A12B)</strong>, runs test suites, and backtracks to clean sandbox checkpoints if tests fail — opening verified PRs when tests pass! <br><a href='https://github.com/AntrikshH90/sandforge' target='_blank' style='color:var(--acid); font-weight:700;'>Inspect SandForge Repo ↗</a>\""""

NEW_SANDFORGE_FAQ = """    answer: "<strong>SandForge</strong> is Antriksh's flagship autonomous PR agent built for the <em>Nebius × NVIDIA Global AI Hackathon</em>. It clones GitHub repos into Nebius Token Factory Sandboxes, plans patches using <strong>NVIDIA Nemotron 3 Nano</strong>, generates reasoning-driven code with <strong>Nemotron 3 Super (120B-A12B)</strong>, runs test suites, and backtracks to clean sandbox checkpoints if tests fail — opening verified PRs when tests pass! <br><div style='display:flex; gap:8px; margin-top:8px; flex-wrap:wrap;'><button type='button' class='card-arch-btn mono' onclick='openArchModal(\\"sandforge\\")'>📐 Inspect Architecture Flowchart</button><a href='https://github.com/AntrikshH90/sandforge' target='_blank' class='card-arch-btn mono' style='color:var(--acid);'>Inspect Repo ↗</a></div>\""""

if OLD_SANDFORGE_FAQ in text:
    text = text.replace(OLD_SANDFORGE_FAQ, NEW_SANDFORGE_FAQ, 1)
    print("SandForge FAQ updated with architecture button.")
else:
    print("WARNING: OLD_SANDFORGE_FAQ not matched.")

# 5. Update handleTerminalQuery to wrap botDiv in term-bot-row
OLD_HANDLE_TERM = """  if (match) {
    botDiv.innerHTML = match.answer;
  } else {
    botDiv.innerHTML = `I understand you're inquiring about "${queryText}". Antriksh is an AI/ML engineer, Founder of Apex Intelligence, and Campus Ambassador @ IIT-G with 47 verified credentials. Would you like to check his <strong>SandForge project</strong>, his <strong>3D Credential Book</strong>, or <strong>get in touch directly</strong>?`;
  }"""

NEW_HANDLE_TERM = """  let responseContent = "";
  if (match) {
    responseContent = match.answer;
  } else {
    responseContent = `I understand you're inquiring about "${queryText}". Antriksh is an AI/ML engineer, Founder of Apex Intelligence, and Campus Ambassador @ IIT-G with 47 verified credentials. Would you like to check his <strong>SandForge project</strong>, his <strong>3D Credential Book</strong>, or <strong>get in touch directly</strong>?`;
  }
  botDiv.innerHTML = `
    <div class="term-bot-row">
      <img src="images/antriksh-avatar-head.png" alt="Antriksh AI" class="term-bot-avatar" />
      <div class="term-bot-body">${responseContent}</div>
    </div>`;"""

if OLD_HANDLE_TERM in text:
    text = text.replace(OLD_HANDLE_TERM, NEW_HANDLE_TERM, 1)
    print("handleTerminalQuery updated with bot avatar row.")
else:
    print("WARNING: OLD_HANDLE_TERM not matched.")

with open("antriksh-portfolio-studio.html", "w", encoding="utf-8") as f:
    f.write(text)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(text)

print("Files saved successfully.")
