with open("antriksh-portfolio-studio.html", "r", encoding="utf-8") as f:
    text = f.read()

OLD = """      <div class="lab-tabs mono" role="tablist" aria-label="Playground modes">
        <button type="button" class="lab-tab-btn active" id="tab-3d-btn" aria-selected="true">
          <span>🪐</span> 3D Geometry Sculpture (8 Models)
        </button>
        <button type="button" class="lab-tab-btn" id="tab-vector-btn" aria-selected="false">
          <span>✒️</span> Adobe Illustrator & Vector Studio
        </button>
      </div>"""

NEW = """      <div class="lab-tabs mono" role="tablist" aria-label="Playground modes">
        <button type="button" class="lab-tab-btn active" id="tab-3d-btn" aria-selected="true">
          <span>🪐</span> 3D Mathematical Geometries (12 Models)
        </button>
        <button type="button" class="lab-tab-btn" id="tab-vector-btn" aria-selected="false">
          <span>✒️</span> Adobe Illustrator & Vector Studio
        </button>
        <button type="button" class="lab-tab-btn" id="tab-neural-btn" aria-selected="false">
          <span>🧠</span> Neural Synapse Tuner (Mini-Game)
        </button>
      </div>"""

if OLD in text:
    text = text.replace(OLD, NEW, 1)
    with open("antriksh-portfolio-studio.html", "w", encoding="utf-8") as f:
        f.write(text)
    with open("index.html", "w", encoding="utf-8") as f:
        f.write(text)
    print("Lab tabs successfully updated with 3 tabs.")
else:
    print("ERROR: OLD not matched.")
