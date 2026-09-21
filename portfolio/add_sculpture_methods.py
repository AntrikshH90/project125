with open("antriksh-portfolio-studio.html", "r", encoding="utf-8") as f:
    content = f.read()

OLD = """  setColor(color) {
    this.color = color;
    this.dirty = true;
  }"""

NEW = """  setColor(color) {
    this.color = color;
    this.dirty = true;
  }

  setAudioReactive(active, analyserNode) {
    this.audioReactive = active;
    this.audioAnalyser = analyserNode;
    if (active && analyserNode) {
      this.audioData = new Uint8Array(analyserNode.frequencyBinCount);
    } else {
      this.audioData = null;
    }
    this.dirty = true;
  }

  triggerSupernova() {
    this.supernova = true;
    this.supernovaStart = performance.now();
    this.savedColor = [...this.color];
    this.color = [255, 215, 0];
    this.createGeometry("hypercube", true);
    this.dirty = true;
  }"""

if OLD in content:
    content = content.replace(OLD, NEW, 1)
    with open("antriksh-portfolio-studio.html", "w", encoding="utf-8") as f:
        f.write(content)
    with open("index.html", "w", encoding="utf-8") as f:
        f.write(content)
    print("Methods setAudioReactive & triggerSupernova added to ParticleSculpture class.")
else:
    print("ERROR: OLD not matched.")
