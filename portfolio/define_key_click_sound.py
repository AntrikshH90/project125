with open("antriksh-portfolio-studio.html", "r", encoding="utf-8") as f:
    text = f.read()

OLD = """function playPageTurnSound() {"""

NEW = """function playKeyClickSound() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(750 + Math.random() * 350, now);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  } catch(e){}
}

function playPageTurnSound() {"""

if OLD in text:
    text = text.replace(OLD, NEW, 1)
    with open("antriksh-portfolio-studio.html", "w", encoding="utf-8") as f:
        f.write(text)
    with open("index.html", "w", encoding="utf-8") as f:
        f.write(text)
    print("playKeyClickSound defined.")
else:
    print("ERROR: OLD not matched.")
