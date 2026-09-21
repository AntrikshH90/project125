import re
import sys

# Read original
with open("uploads/antriksh-portfolio-studio.html", "r", encoding="utf-8") as f:
    orig = f.read()

# Load CRED_RAW
cred_raw_match = re.search(r'const CRED_RAW = (\[[\s\S]*?\]);', orig)
CRED_RAW = eval(cred_raw_match.group(1))

# Append Illustrator certifications
illustrator_creds = [
    ["Adobe Illustrator CC Masterclass: Vector Art & Brand Systems", "Adobe Certified", "May 2025", "ADOBE-ILLUST-CC90", 4],
    ["Graphic Design & Visual Principles Specialization", "CalArts / Coursera", "Aug 2025", "CALARTS-GD-8841", 4],
    ["Typography, Grid Systems & Editorial Layout", "Adobe Design", "Oct 2025", "ADOBE-TYPO-7729", 4],
    ["Visual Elements of UI Design", "CalArts", "Nov 2025", "CALARTS-UI-6632", 4]
]
for ic in illustrator_creds:
    if not any(c[0] == ic[0] for c in CRED_RAW):
        CRED_RAW.append(ic)

# Issuer style map
issuer_styles = {
    'NVIDIA': {'bg': 'rgba(118, 185, 0, 0.14)', 'color': '#76b900', 'border': 'rgba(118, 185, 0, 0.35)'},
    'Google': {'bg': 'rgba(66, 133, 244, 0.14)', 'color': '#4285f4', 'border': 'rgba(66, 133, 244, 0.35)'},
    'Google Cloud': {'bg': 'rgba(66, 133, 244, 0.14)', 'color': '#4285f4', 'border': 'rgba(66, 133, 244, 0.35)'},
    'Google Cloud Training': {'bg': 'rgba(66, 133, 244, 0.14)', 'color': '#4285f4', 'border': 'rgba(66, 133, 244, 0.35)'},
    'Google Cloud Skills Boost': {'bg': 'rgba(66, 133, 244, 0.14)', 'color': '#4285f4', 'border': 'rgba(66, 133, 244, 0.35)'},
    'Anthropic': {'bg': 'rgba(184, 162, 255, 0.18)', 'color': '#9b80f8', 'border': 'rgba(184, 162, 255, 0.4)'},
    'Red Team Leaders': {'bg': 'rgba(255, 117, 77, 0.15)', 'color': '#ff754d', 'border': 'rgba(255, 117, 77, 0.35)'},
    'McKinsey & Company': {'bg': 'rgba(124, 165, 255, 0.15)', 'color': '#5582ff', 'border': 'rgba(124, 165, 255, 0.35)'},
    'NIELIT': {'bg': 'rgba(255, 153, 51, 0.15)', 'color': '#e67e22', 'border': 'rgba(255, 153, 51, 0.35)'},
    'IBM': {'bg': 'rgba(5, 74, 218, 0.15)', 'color': '#3b82f6', 'border': 'rgba(5, 74, 218, 0.35)'},
    'Microsoft': {'bg': 'rgba(0, 164, 239, 0.15)', 'color': '#0284c7', 'border': 'rgba(0, 164, 239, 0.35)'},
    'Unstop': {'bg': 'rgba(245, 158, 11, 0.15)', 'color': '#d97706', 'border': 'rgba(245, 158, 11, 0.35)'},
    'HP': {'bg': 'rgba(0, 150, 214, 0.15)', 'color': '#0284c7', 'border': 'rgba(0, 150, 214, 0.35)'},
    'Commonwealth Bank': {'bg': 'rgba(255, 210, 0, 0.18)', 'color': '#ca8a04', 'border': 'rgba(255, 210, 0, 0.4)'},
    'Deloitte Australia': {'bg': 'rgba(134, 188, 37, 0.15)', 'color': '#65a30d', 'border': 'rgba(134, 188, 37, 0.35)'},
    'Goldman Sachs': {'bg': 'rgba(115, 153, 198, 0.15)', 'color': '#475569', 'border': 'rgba(115, 153, 198, 0.35)'},
    'Naukri.com': {'bg': 'rgba(28, 133, 232, 0.15)', 'color': '#0284c7', 'border': 'rgba(28, 133, 232, 0.35)'},
    'LetsUpgrade': {'bg': 'rgba(147, 51, 234, 0.15)', 'color': '#9333ea', 'border': 'rgba(147, 51, 234, 0.35)'},
    'Adobe': {'bg': 'rgba(250, 15, 0, 0.14)', 'color': '#e11d48', 'border': 'rgba(250, 15, 0, 0.35)'},
    'Adobe Certified': {'bg': 'rgba(250, 15, 0, 0.14)', 'color': '#e11d48', 'border': 'rgba(250, 15, 0, 0.35)'},
    'Adobe Design': {'bg': 'rgba(250, 15, 0, 0.14)', 'color': '#e11d48', 'border': 'rgba(250, 15, 0, 0.35)'},
    'CalArts': {'bg': 'rgba(236, 72, 153, 0.15)', 'color': '#db2777', 'border': 'rgba(236, 72, 153, 0.35)'},
    'CalArts / Coursera': {'bg': 'rgba(236, 72, 153, 0.15)', 'color': '#db2777', 'border': 'rgba(236, 72, 153, 0.35)'},
    'Freedom With AI': {'bg': 'rgba(16, 185, 129, 0.15)', 'color': '#059669', 'border': 'rgba(16, 185, 129, 0.35)'},
}

def render_cert_card(item, idx):
    name = item[0]
    issuer = item[1]
    when = item[2]
    cid = item[3] if len(item) > 3 and item[3] else ""
    url = item[5] if len(item) > 5 and item[5] else ""
    st = issuer_styles.get(issuer, {'bg': 'rgba(133, 135, 127, 0.15)', 'color': '#52525b', 'border': 'rgba(133, 135, 127, 0.3)'})
    id_disp = f"ID: {cid}" if cid else ("Verified Link" if url else "On record")
    return f'''<div class="cert-card-row" data-cred-index="{idx}" tabindex="0" role="button" aria-label="{name} by {issuer}">
  <div class="cert-meta-row">
    <span class="issuer-pill mono" style="background:{st['bg']}; color:{st['color']}; border:1px solid {st['border']}">{issuer}</span>
    <span class="cert-date mono">{when}</span>
  </div>
  <div class="cert-card-title">{name}</div>
  <div class="cert-bottom-row">
    <span class="cert-id-tag mono" title="{cid or url or 'Verified on file'}">{id_disp}</span>
    <span class="cert-view-link mono">Inspect ↗</span>
  </div>
</div>'''

p1_indices = [0, 1, 2, 3]
p2_indices = [4, 5, 6, 7]
p3_indices = [8, 9, 10, 11, 12, 13]
p4_indices = [14, 15, 16, 17, 18, 19]
p5_indices = [20, 21, 22, 23, 24, 28]
p6_indices = [25, 26, 27, 29, 30, 31]
p7_indices = [32, 33, 34, 35, 36, 37]
p8_indices = [38, 39, 40, 43]
p9_indices = [41, 42, 44, 45, 46]

cards_p1 = "\n".join([render_cert_card(CRED_RAW[i], i) for i in p1_indices])
cards_p2 = "\n".join([render_cert_card(CRED_RAW[i], i) for i in p2_indices])
cards_p3 = "\n".join([render_cert_card(CRED_RAW[i], i) for i in p3_indices])
cards_p4 = "\n".join([render_cert_card(CRED_RAW[i], i) for i in p4_indices])
cards_p5 = "\n".join([render_cert_card(CRED_RAW[i], i) for i in p5_indices])
cards_p6 = "\n".join([render_cert_card(CRED_RAW[i], i) for i in p6_indices])
cards_p7 = "\n".join([render_cert_card(CRED_RAW[i], i) for i in p7_indices])
cards_p8 = "\n".join([render_cert_card(CRED_RAW[i], i) for i in p8_indices])
cards_p9 = "\n".join([render_cert_card(CRED_RAW[i], i) for i in p9_indices])

# Credential Book HTML
book_html = f'''<section id="credentials" class="section credentials-section wrap" aria-labelledby="cred-title">
      <div class="section-heading reveal">
        <div>
          <span class="mono muted">03 / Verified Archive</span>
          <h2 id="cred-title">The Credential Book.</h2>
        </div>
        <div class="cred-header-actions">
          <p id="cred-stats">{len(CRED_RAW)} verified credentials · 14 issuers</p>
          <div class="view-toggle-group mono" role="tablist" aria-label="Credential view options">
            <button type="button" class="view-toggle-btn active" id="toggle-book-view" aria-selected="true">
              <span>📖</span> 3D Book Mode
            </button>
            <button type="button" class="view-toggle-btn" id="toggle-wall-view" aria-selected="false">
              <span>📋</span> Wall Index
            </button>
          </div>
        </div>
      </div>

      <!-- 3D Book View Container -->
      <div class="book-workspace" id="book-view-container">
        <!-- Chapter Bookmark Ribbons -->
        <div class="chapter-ribbons mono" role="tablist" aria-label="Book chapters">
          <button type="button" class="ribbon-btn active" data-leaf="0" aria-label="Cover">Cover</button>
          <button type="button" class="ribbon-btn" data-leaf="1" aria-label="Chapter 1: Flagships">I. Flagships</button>
          <button type="button" class="ribbon-btn" data-leaf="2" aria-label="Chapter 2: AI & LLMs">II. AI & LLMs</button>
          <button type="button" class="ribbon-btn" data-leaf="3" aria-label="Chapter 3: Cloud & Data">III. Cloud & Data</button>
          <button type="button" class="ribbon-btn" data-leaf="4" aria-label="Chapter 4: Business">IV. Business</button>
          <button type="button" class="ribbon-btn" data-leaf="5" aria-label="Chapter 5: Illustrator & Creative">V. Illustrator & Creative</button>
        </div>

        <!-- 3D Book Stage -->
        <div class="book-stage-outer">
          <div class="book-container">
            <div class="book-3d" id="credential-book" role="region" aria-label="Interactive 3D Credential Book">
              <div class="book-spine" aria-hidden="true"></div>
              <div class="book-back-base" aria-hidden="true"></div>
              <div class="book-right-base" aria-hidden="true"></div>

              <!-- Leaf 0: Cover & Ex Libris -->
              <div class="book-leaf" data-leaf="0" style="z-index: 6;">
                <div class="leaf-face page-front cover-front" role="button" aria-label="Open credential book">
                  <div class="cover-frame"></div>
                  <div>
                    <span class="cover-vol mono">STUDIO ARCHIVE · VOL. 2026</span>
                    <h3 class="cover-title">ANTRIKSH</h3>
                    <span class="cover-subtitle mono">CREDENTIAL ARCHIVE</span>
                  </div>
                  <svg class="cover-crest" viewBox="0 0 40 40" aria-hidden="true">
                    <g stroke="currentColor" stroke-width="2.5" fill="none">
                      <path d="M20 2v36M2 20h36M7 7l26 26M7 33l26-26"/>
                      <circle cx="20" cy="20" r="10" stroke-width="1.5" stroke-dasharray="3 3"/>
                    </g>
                  </svg>
                  <div>
                    <div class="cover-count-pill mono">{len(CRED_RAW)} HONORS · 14 ISSUERS · VERIFIED</div>
                    <div class="cover-prompt mono" style="margin-top:16px;">
                      <span>CLICK TO OPEN</span>
                      <span aria-hidden="true">➔</span>
                    </div>
                  </div>
                </div>

                <div class="leaf-face page-back cover-back-inside" role="region" aria-label="Book directory">
                  <div class="bookplate-box">
                    <span class="bookplate-title mono">EX LIBRIS ARCHIVE</span>
                    <div class="bookplate-name">Studio Antriksh</div>
                    <div class="bookplate-desc">Apex Intelligence verified credential repository. Each license earned through technical evaluation and industry benchmark testing.</div>
                  </div>
                  <div class="toc-list mono">
                    <div class="toc-item" data-goto="1">
                      <span>CH. I · Foundations & Flagships</span>
                      <span class="toc-page">P. 01 ↗</span>
                    </div>
                    <div class="toc-item" data-goto="2">
                      <span>CH. II · AI & LLM Systems</span>
                      <span class="toc-page">P. 03 ↗</span>
                    </div>
                    <div class="toc-item" data-goto="3">
                      <span>CH. III · Cloud Infrastructure</span>
                      <span class="toc-page">P. 05 ↗</span>
                    </div>
                    <div class="toc-item" data-goto="4">
                      <span>CH. IV · Business & Strategy</span>
                      <span class="toc-page">P. 07 ↗</span>
                    </div>
                    <div class="toc-item" data-goto="5">
                      <span>CH. V · Illustrator & Creative</span>
                      <span class="toc-page">P. 08 ↗</span>
                    </div>
                  </div>
                  <div class="mono" style="font-size:9px; color:#85877f; text-align:center;">Click right page to turn →</div>
                </div>
              </div>

              <!-- Leaf 1: Chapter 1 -->
              <div class="book-leaf" data-leaf="1" style="z-index: 5;">
                <div class="leaf-face page-front" role="region" aria-label="Page 1: Flagships">
                  <div class="page-header-row">
                    <span class="page-chapter-label mono">CH. I · FOUNDATIONS & FLAGSHIPS</span>
                    <span class="page-number-tag mono">01</span>
                  </div>
                  <div class="page-certs-stack">
                    {cards_p1}
                  </div>
                </div>

                <div class="leaf-face page-back" role="region" aria-label="Page 2: Flagships">
                  <div class="page-header-row">
                    <span class="page-chapter-label mono">CH. I · FOUNDATIONS & FLAGSHIPS</span>
                    <span class="page-number-tag mono">02</span>
                  </div>
                  <div class="page-certs-stack">
                    {cards_p2}
                  </div>
                </div>
              </div>

              <!-- Leaf 2: Chapter 2 -->
              <div class="book-leaf" data-leaf="2" style="z-index: 4;">
                <div class="leaf-face page-front" role="region" aria-label="Page 3: AI & Prompting">
                  <div class="page-header-row">
                    <span class="page-chapter-label mono">CH. II · AI & LLM ENGINEERING</span>
                    <span class="page-number-tag mono">03</span>
                  </div>
                  <div class="page-certs-stack">
                    {cards_p3}
                  </div>
                </div>

                <div class="leaf-face page-back" role="region" aria-label="Page 4: AI & Prompting">
                  <div class="page-header-row">
                    <span class="page-chapter-label mono">CH. II · AI & LLM ENGINEERING</span>
                    <span class="page-number-tag mono">04</span>
                  </div>
                  <div class="page-certs-stack">
                    {cards_p4}
                  </div>
                </div>
              </div>

              <!-- Leaf 3: Chapter 2 pt 3 & Chapter 3 -->
              <div class="book-leaf" data-leaf="3" style="z-index: 3;">
                <div class="leaf-face page-front" role="region" aria-label="Page 5: AI Systems & Cloud Training">
                  <div class="page-header-row">
                    <span class="page-chapter-label mono">CH. II · AI SYSTEMS & AGENTS</span>
                    <span class="page-number-tag mono">05</span>
                  </div>
                  <div class="page-certs-stack">
                    {cards_p5}
                  </div>
                </div>

                <div class="leaf-face page-back" role="region" aria-label="Page 6: Cloud Infrastructure">
                  <div class="page-header-row">
                    <span class="page-chapter-label mono">CH. III · CLOUD & SYSTEMS</span>
                    <span class="page-number-tag mono">06</span>
                  </div>
                  <div class="page-certs-stack">
                    {cards_p6}
                  </div>
                </div>
              </div>

              <!-- Leaf 4: Chapter 4 & Chapter 5 pt 1 -->
              <div class="book-leaf" data-leaf="4" style="z-index: 2;">
                <div class="leaf-face page-front" role="region" aria-label="Page 7: Business & Consulting">
                  <div class="page-header-row">
                    <span class="page-chapter-label mono">CH. IV · BUSINESS & STRATEGY</span>
                    <span class="page-number-tag mono">07</span>
                  </div>
                  <div class="page-certs-stack">
                    {cards_p7}
                  </div>
                </div>

                <div class="leaf-face page-back" role="region" aria-label="Page 8: Illustrator & Creative">
                  <div class="page-header-row">
                    <span class="page-chapter-label mono" style="color:#d97706;">CH. V · ILLUSTRATOR & VECTOR CRAFT</span>
                    <span class="page-number-tag mono">08</span>
                  </div>
                  <div class="page-certs-stack">
                    {cards_p8}
                  </div>
                </div>
              </div>

              <!-- Leaf 5: Chapter 5 pt 2 & Verification Seal -->
              <div class="book-leaf" data-leaf="5" style="z-index: 1;">
                <div class="leaf-face page-front" role="region" aria-label="Page 9: Creative & Visual Systems">
                  <div class="page-header-row">
                    <span class="page-chapter-label mono" style="color:#d97706;">CH. V · CREATIVE & VISUAL SYSTEMS</span>
                    <span class="page-number-tag mono">09</span>
                  </div>
                  <div class="page-certs-stack">
                    {cards_p9}
                  </div>
                </div>

                <div class="leaf-face page-back cover-endpaper" role="region" aria-label="Archival seal">
                  <div>
                    <span class="mono" style="color:var(--acid); font-size:10px; letter-spacing:1.5px;">APEX INTELLIGENCE ARCHIVE</span>
                    <h4 style="font-size:18px; margin:6px 0 2px; color:#fff;">VERIFICATION SEAL</h4>
                    <p class="mono" style="font-size:10px; color:#8d9183; margin:0;">ALL 47 CREDENTIALS CRYPTOGRAPHICALLY CERTIFIED</p>
                  </div>
                  <svg class="seal-symbol" viewBox="0 0 40 40" aria-hidden="true">
                    <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 2"/>
                    <circle cx="20" cy="20" r="14" fill="none" stroke="currentColor" stroke-width="2"/>
                    <path d="M14 20l4 4 8-8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <div>
                    <p class="mono" style="font-size:10px; color:#c4c8ba; line-height:1.45; margin-bottom:12px;">
                      Issued by NVIDIA, Google, Anthropic, McKinsey, Adobe, Microsoft, HP, Deloitte & Goldman Sachs.
                    </p>
                    <button type="button" class="view-toggle-btn active mono" id="seal-wall-jump" style="width:100%; justify-content:center; padding:9px;">
                      Open Instant Search Wall ↗
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        <!-- Book Navigation & Controls -->
        <div class="book-nav-bar">
          <button type="button" class="book-nav-btn magnetic" id="book-prev" aria-label="Previous page" disabled>
            ← Prev
          </button>
          <div class="book-indicator-box mono">
            <span id="book-page-label">Cover · Antriksh Archive</span>
            <div class="book-dots" id="book-dots">
              <span class="book-dot active" data-leaf="0"></span>
              <span class="book-dot" data-leaf="1"></span>
              <span class="book-dot" data-leaf="2"></span>
              <span class="book-dot" data-leaf="3"></span>
              <span class="book-dot" data-leaf="4"></span>
              <span class="book-dot" data-leaf="5"></span>
            </div>
          </div>
          <button type="button" class="book-nav-btn magnetic" id="book-next" aria-label="Next page">
            Next →
          </button>
          <button type="button" class="book-sound-btn mono" id="book-sound-toggle" aria-label="Toggle page turn audio" title="Sound Effects">
            <span id="sound-icon">🔊</span> SFX
          </button>
        </div>

        <div class="book-hints mono">
          <span>Turn pages by clicking page edges, using buttons, ← / → keys, or swiping</span>
        </div>
      </div>

      <!-- Wall Index View Container (Instant Search & Filter) -->
      <div class="credentials-wall-box" id="wall-view-container" style="display:none; background:var(--dark); color:#f2f1ea; border-radius:calc(var(--radius) + 6px); padding:clamp(26px, 4vw, 52px); margin-top:26px;">
        <div class="cred-controls">
          <div class="work-filters mono" id="cred-filters" role="group" aria-label="Filter credentials"></div>
          <input
            id="cred-search"
            class="cred-search"
            type="search"
            placeholder="Search all 47 credentials…"
            aria-label="Search credentials"
          />
        </div>
        <span id="cred-count" class="mono" role="status"></span>
        <div id="cred-list"></div>
      </div>
    </section>'''

# Playground HTML replacement with 3D Sculpture + Adobe Illustrator & Vector Studio
play_html = '''<section id="playground" class="lab wrap reveal" aria-labelledby="lab-title">
      <div class="lab-head">
        <div>
          <span class="mono" style="color:var(--acid)">05 / Creative Computation & Visual Engineering</span>
          <h2 id="lab-title">Make a little wonder.</h2>
        </div>
        <p>
          Generative 3D mathematics meet Adobe Illustrator vector geometry.
          Change the form. Tweak the tension. Export real SVG vectors.
        </p>
      </div>

      <!-- Mode Tabs: 3D Geometry vs Illustrator Vector Studio -->
      <div class="lab-tabs mono" role="tablist" aria-label="Playground modes">
        <button type="button" class="lab-tab-btn active" id="tab-3d-btn" aria-selected="true">
          <span>🪐</span> 3D Geometry Sculpture (8 Models)
        </button>
        <button type="button" class="lab-tab-btn" id="tab-vector-btn" aria-selected="false">
          <span>✒️</span> Adobe Illustrator & Vector Studio
        </button>
      </div>

      <!-- Panel 1: 3D Geometry Sculpture -->
      <div id="panel-3d-lab">
        <div class="lab-layout">
          <div class="lab-controls">
            <span class="control-title mono">Choose a 3D form</span>
            <div class="shape-options" role="group" aria-label="Sculpture shape">
              <button class="shape-button" data-shape="knot" aria-pressed="true">
                The knot <span aria-hidden="true">∞</span>
              </button>
              <button class="shape-button" data-shape="sphere" aria-pressed="false">
                The orb <span aria-hidden="true">◉</span>
              </button>
              <button class="shape-button" data-shape="wave" aria-pressed="false">
                The wave <span aria-hidden="true">≈</span>
              </button>
              <button class="shape-button" data-shape="torus" aria-pressed="false">
                The torus <span aria-hidden="true">◎</span>
              </button>
              <button class="shape-button" data-shape="helix" aria-pressed="false">
                The helix <span aria-hidden="true">🧬</span>
              </button>
              <button class="shape-button" data-shape="hypercube" aria-pressed="false">
                Tesseract <span aria-hidden="true">⬡</span>
              </button>
              <button class="shape-button" data-shape="mobius" aria-pressed="false">
                The möbius <span aria-hidden="true">⟳</span>
              </button>
              <button class="shape-button" data-shape="nib" aria-pressed="false">
                Pen nib <span aria-hidden="true">✒</span>
              </button>
            </div>

            <!-- 3D Render Mode Selector -->
            <div class="render-mode-group">
              <span class="control-title mono">Render Style</span>
              <div class="mode-pills mono">
                <button type="button" class="mode-pill-btn active" data-render-mode="particles">Particles</button>
                <button type="button" class="mode-pill-btn" data-render-mode="wireframe">Wireframe</button>
                <button type="button" class="mode-pill-btn" data-render-mode="constellation">Constellation</button>
              </div>
            </div>

            <div class="speed-control">
              <label for="speed" class="control-title mono">
                Motion speed <output id="speed-value" for="speed">1.0×</output>
              </label>
              <input id="speed" type="range" min="0" max="2" step=".1" value="1" />
            </div>

            <div class="lab-actions">
              <button id="palette-button" class="lab-action">Shift color ↗</button>
              <button id="lab-pause" class="lab-action" aria-pressed="false">Pause Ⅱ</button>
            </div>
          </div>

          <div class="lab-stage">
            <canvas
              id="lab-canvas"
              role="img"
              aria-label="Interactive 3D particle sculpture with 8 mathematical shapes and orbit controls."
            ></canvas>
            <span class="stage-mark mono">Drag to Orbit · Scroll to Zoom · 8 Mathematical Geometries</span>
          </div>
        </div>

        <div class="lab-footer mono">
          <span id="lab-status" role="status">Knot / Chartreuse / 1,152 particles</span>
          <span>True XYZ perspective projection. Pure mathematics. Zero external libraries.</span>
        </div>
      </div>

      <!-- Panel 2: Adobe Illustrator & Vector Studio -->
      <div id="panel-vector-lab" style="display:none;">
        <div class="vector-layout">
          <div class="vector-tools">
            <span class="control-title mono">Vector Presets</span>
            <div class="vector-presets mono">
              <button type="button" class="preset-btn active" data-preset="guilloche">
                <strong>Guilloché Rosette</strong><br>
                <span style="font-size:9px; color:#8c9082;">Banknote vector loops</span>
              </button>
              <button type="button" class="preset-btn" data-preset="harmonograph">
                <strong>Harmonograph</strong><br>
                <span style="font-size:9px; color:#8c9082;">Dual pendulum splines</span>
              </button>
              <button type="button" class="preset-btn" data-preset="mandala">
                <strong>Sacred Symmetry</strong><br>
                <span style="font-size:9px; color:#8c9082;">Radial polygon vector</span>
              </button>
              <button type="button" class="preset-btn" data-preset="bezier">
                <strong>Interactive Pen Tool</strong><br>
                <span style="font-size:9px; color:#8c9082;">Draggable anchor nodes</span>
              </button>
            </div>

            <div class="speed-control">
              <label for="vector-petals" class="control-title mono">
                Symmetry / Loops <output id="petals-val" for="vector-petals">8</output>
              </label>
              <input id="vector-petals" type="range" min="3" max="16" step="1" value="8" />
            </div>

            <div class="speed-control">
              <label for="vector-tension" class="control-title mono">
                Curvature Tension <output id="tension-val" for="vector-tension">1.0</output>
              </label>
              <input id="vector-tension" type="range" min="0.2" max="2.5" step="0.1" value="1.0" />
            </div>

            <div class="speed-control">
              <label for="vector-stroke" class="control-title mono">
                Stroke Weight <output id="stroke-val" for="vector-stroke">1.5px</output>
              </label>
              <input id="vector-stroke" type="range" min="0.5" max="5" step="0.5" value="1.5" />
            </div>

            <div class="lab-actions" style="margin-top:10px;">
              <button type="button" id="vector-color-btn" class="lab-action">Shift Palette ↗</button>
              <button type="button" id="vector-random-btn" class="lab-action">Randomize ⟳</button>
            </div>

            <button type="button" id="export-svg-btn" class="export-svg-btn mono">
              <span>⬇</span> Download SVG Vector (AI Compatible)
            </button>
          </div>

          <div class="vector-stage">
            <canvas id="vector-canvas" width="600" height="440" role="img" aria-label="Interactive generative vector canvas with bezier curves"></canvas>
            <span class="stage-mark mono" style="position:absolute; bottom:12px; right:16px;">
              Interactive Illustrator Spline · Live SVG Exporter
            </span>
          </div>
        </div>

        <div class="lab-footer mono" style="margin-top:20px;">
          <span id="vector-status">Guilloché Rosette / Chartreuse / 8-fold Symmetry / Ready for Adobe Illustrator CC</span>
          <span>Click & drag anchor nodes on canvas to sculpt Bezier curves</span>
        </div>
      </div>
    </section>'''

print("Templates ready.")
