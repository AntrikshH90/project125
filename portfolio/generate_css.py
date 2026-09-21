css_content = """
/* ==========================================================
   AMBIENT BACKGROUND EFFECTS & PARTICLES
========================================================== */
.ambient-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}
.ambient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.12;
  animation: float-ambient-orb 22s ease-in-out infinite alternate;
}
.ambient-orb:nth-child(1) {
  width: 450px; height: 450px;
  background: var(--acid);
  top: -100px; right: -100px;
}
.ambient-orb:nth-child(2) {
  width: 500px; height: 500px;
  background: var(--violet);
  bottom: 20%; left: -150px;
  animation-duration: 28s;
  animation-delay: -7s;
}
.ambient-orb:nth-child(3) {
  width: 400px; height: 400px;
  background: var(--orange);
  bottom: -100px; right: 10%;
  animation-duration: 32s;
  animation-delay: -14s;
}
@keyframes float-ambient-orb {
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(60px, 40px) scale(1.1); }
  100% { transform: translate(-40px, 80px) scale(0.95); }
}

#particles-bg {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

/* Custom Cursor */
.cursor-trail {
  position: fixed;
  width: 28px;
  height: 28px;
  border: 1.5px solid rgba(23, 24, 22, 0.45);
  border-radius: 50%;
  pointer-events: none;
  z-index: 9999;
  transform: translate(-50%, -50%);
  transition: width 0.25s var(--ease), height 0.25s var(--ease), border-color 0.25s var(--ease), background 0.25s var(--ease);
  opacity: 0;
}
.cursor-dot {
  position: fixed;
  width: 6px;
  height: 6px;
  background: var(--ink);
  border-radius: 50%;
  pointer-events: none;
  z-index: 10000;
  transform: translate(-50%, -50%);
  opacity: 0;
}
.cursor-trail.active, .cursor-dot.active { opacity: 1; }
.cursor-trail.hover {
  width: 46px;
  height: 46px;
  border-color: var(--acid);
  background: rgba(214, 255, 98, 0.18);
}
@media (max-width: 768px), (pointer: coarse) {
  .cursor-trail, .cursor-dot { display: none !important; }
}

/* Nav Progress Bar */
.nav-progress {
  position: fixed;
  top: 0;
  left: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--acid), var(--violet), var(--orange));
  z-index: 1001;
  width: 0%;
  transition: width 0.1s linear;
}

/* ==========================================================
   3D CREDENTIAL BOOK — STUDIO ARCHIVE
========================================================== */
.credentials-section {
  position: relative;
  z-index: 2;
  padding: 60px 0 80px;
}

.cred-header-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
}
@media (max-width: 768px) {
  .cred-header-actions {
    align-items: flex-start;
    margin-top: 14px;
  }
}

.view-toggle-group {
  display: inline-flex;
  background: #141613;
  padding: 4px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.1);
  gap: 4px;
}
.view-toggle-btn {
  background: transparent;
  border: 0;
  color: #8c9082;
  padding: 6px 16px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.25s var(--ease);
}
.view-toggle-btn:hover { color: #f2f1ea; }
.view-toggle-btn.active {
  background: var(--acid);
  color: var(--ink);
  box-shadow: 0 2px 8px rgba(214, 255, 98, 0.25);
}

.chapter-ribbons {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin: 15px 0 25px;
}
.ribbon-btn {
  background: rgba(23, 24, 22, 0.05);
  border: 1px solid var(--line);
  color: var(--muted);
  font-size: 11px;
  padding: 6px 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.25s var(--ease);
}
.ribbon-btn:hover {
  background: rgba(23, 24, 22, 0.1);
  color: var(--ink);
  transform: translateY(-2px);
}
.ribbon-btn.active {
  background: var(--dark);
  color: var(--acid);
  border-color: var(--dark);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.book-stage-outer {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  perspective: 2400px;
  padding: 20px 0;
  overflow: visible;
}

.book-container {
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  transform-style: preserve-3d;
}

.book-3d {
  width: 760px;
  height: 520px;
  position: relative;
  transform-style: preserve-3d;
  transform: rotateX(4deg);
  transition: transform 0.45s var(--ease);
  box-shadow: 0 28px 70px rgba(0,0,0,0.35), 0 10px 25px rgba(0,0,0,0.2);
  border-radius: 4px 16px 16px 4px;
}
.book-3d:hover {
  transform: rotateX(1deg);
}

.book-spine {
  position: absolute;
  left: 50%;
  top: -6px;
  bottom: -6px;
  width: 34px;
  transform: translateX(-50%) translateZ(1px);
  background: linear-gradient(90deg, #181916 0%, #353830 25%, #252820 50%, #353830 75%, #181916 100%);
  border-radius: 3px;
  z-index: 35;
  box-shadow: 0 0 16px rgba(0,0,0,0.5), inset 0 0 4px rgba(255,255,255,0.08);
  pointer-events: none;
}
.book-spine::after {
  content: "";
  position: absolute;
  inset: 12px 6px;
  border-top: 2px solid rgba(214, 255, 98, 0.3);
  border-bottom: 2px solid rgba(214, 255, 98, 0.3);
}

.book-back-base {
  position: absolute;
  left: 0;
  top: 0;
  width: 50%;
  height: 100%;
  background: linear-gradient(135deg, #141613 0%, #20231c 50%, #151713 100%);
  border-radius: 16px 4px 4px 16px;
  z-index: 0;
  box-shadow: inset -6px 0 16px rgba(0,0,0,0.6);
  border: 1px solid rgba(255,255,255,0.06);
}

.book-right-base {
  position: absolute;
  right: 0;
  top: 0;
  width: 50%;
  height: 100%;
  background: linear-gradient(135deg, #161814 0%, #22251e 50%, #131512 100%);
  border-radius: 4px 16px 16px 4px;
  z-index: 0;
  box-shadow: inset 6px 0 16px rgba(0,0,0,0.6);
  border: 1px solid rgba(255,255,255,0.06);
}

.book-leaf {
  position: absolute;
  left: 50%;
  top: 0;
  width: 50%;
  height: 100%;
  transform-origin: left center;
  transform-style: preserve-3d;
  transition: transform 0.85s cubic-bezier(0.25, 1, 0.35, 1);
  will-change: transform;
}
.book-leaf.flipped {
  transform: rotateY(-180deg);
}

.leaf-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  box-sizing: border-box;
  overflow: hidden;
  cursor: pointer;
}

.leaf-face::after {
  content: "";
  position: absolute;
  inset: 0;
  background: #000;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.4s ease;
  z-index: 20;
}
.book-leaf.flipping .leaf-face::after {
  opacity: 0.24;
}

/* Right side page */
.page-front {
  background: linear-gradient(180deg, #fdfbf7 0%, #f7f4ec 100%);
  border-radius: 2px 14px 14px 2px;
  box-shadow: inset -4px 0 12px rgba(0,0,0,0.03), 2px 0 8px rgba(0,0,0,0.06);
  padding: 26px 22px 20px 28px;
  transform: rotateY(0deg);
  border-left: 1px solid rgba(0,0,0,0.08);
}
.page-front::before {
  content: "";
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 28px;
  background: linear-gradient(90deg, rgba(0,0,0,0.04), transparent);
  pointer-events: none;
}

/* Left side page */
.page-back {
  background: linear-gradient(180deg, #f7f4ec 0%, #f1eee4 100%);
  border-radius: 14px 2px 2px 14px;
  box-shadow: inset 4px 0 12px rgba(0,0,0,0.03), -2px 0 8px rgba(0,0,0,0.06);
  padding: 26px 28px 20px 22px;
  transform: rotateY(180deg);
  border-right: 1px solid rgba(0,0,0,0.08);
}
.page-back::before {
  content: "";
  position: absolute;
  right: 0; top: 0; bottom: 0;
  width: 28px;
  background: linear-gradient(270deg, rgba(0,0,0,0.04), transparent);
  pointer-events: none;
}

/* Cover Styling */
.cover-front {
  background: linear-gradient(135deg, #141613 0%, #242720 50%, #151713 100%);
  color: #f2f1ea;
  border-radius: 4px 16px 16px 4px;
  padding: 36px 30px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  text-align: center;
  box-shadow: inset 0 0 30px rgba(0,0,0,0.7);
  border: 1px solid rgba(255,255,255,0.08);
}
.cover-frame {
  position: absolute;
  inset: 12px;
  border: 1.5px solid rgba(214, 255, 98, 0.25);
  border-radius: 2px 12px 12px 2px;
  pointer-events: none;
}
.cover-crest {
  width: 68px;
  height: 68px;
  color: var(--acid);
  margin: 10px auto 14px;
  animation: slow-spin 26s linear infinite;
}
@keyframes slow-spin { to { transform: rotate(360deg); } }
.cover-vol {
  font-size: 10px;
  letter-spacing: 2px;
  color: #8c9082;
}
.cover-title {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -1px;
  line-height: 1.15;
  color: #f2f1ea;
  margin: 6px 0;
}
.cover-subtitle {
  font-size: 10px;
  letter-spacing: 2px;
  color: var(--acid);
}
.cover-count-pill {
  margin-top: 14px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(214,255,98,0.2);
  padding: 6px 16px;
  border-radius: 999px;
  font-size: 10px;
  color: #c9cdc0;
}
.cover-prompt {
  font-size: 11px;
  color: var(--acid);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  animation: pulse-cover 2s ease-in-out infinite;
}
@keyframes pulse-cover {
  0%, 100% { opacity: 0.65; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
}

/* Inside Cover / Ex Libris */
.cover-back-inside {
  background: linear-gradient(135deg, #1d201a 0%, #252820 100%);
  color: #efeee8;
  padding: 28px 24px;
  border-radius: 16px 2px 2px 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.bookplate-box {
  border: 1px dashed rgba(214, 255, 98, 0.3);
  padding: 14px;
  border-radius: 8px;
  background: rgba(0,0,0,0.25);
  margin-bottom: 8px;
}
.bookplate-title {
  font-size: 9.5px;
  color: var(--acid);
  letter-spacing: 1.5px;
  margin-bottom: 4px;
}
.bookplate-name {
  font-size: 15px;
  font-weight: 800;
  color: #fff;
}
.bookplate-desc {
  font-size: 10.5px;
  color: #9ea294;
  line-height: 1.4;
  margin-top: 4px;
}
.toc-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.toc-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10.5px;
  color: #c4c8ba;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}
.toc-item:hover {
  background: rgba(214, 255, 98, 0.12);
  color: #fff;
}
.toc-page {
  color: var(--acid);
  font-family: monospace;
  font-size: 9.5px;
}

/* Page Inner Layout */
.page-header-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding-bottom: 6px;
  margin-bottom: 10px;
  border-bottom: 1px solid rgba(0,0,0,0.08);
}
.page-chapter-label {
  font-size: 10.5px;
  font-weight: 800;
  color: var(--ink);
  letter-spacing: 0.5px;
}
.page-number-tag {
  font-size: 9.5px;
  color: var(--muted);
  font-weight: 700;
}

.page-certs-stack {
  display: flex;
  flex-direction: column;
  gap: 7px;
  max-height: 410px;
  overflow-y: auto;
  padding-right: 3px;
}
.page-certs-stack::-webkit-scrollbar { width: 3px; }
.page-certs-stack::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 3px; }

.cert-card-row {
  background: rgba(255,255,255,0.72);
  border: 1px solid rgba(0,0,0,0.07);
  border-radius: 7px;
  padding: 7px 10px;
  transition: all 0.2s var(--ease);
  cursor: pointer;
  position: relative;
}
.cert-card-row:hover {
  background: #fff;
  border-color: rgba(0,0,0,0.15);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  transform: translateX(2px);
}
.cert-meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3px;
  font-size: 8.5px;
}
.issuer-pill {
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 8px;
  letter-spacing: 0.3px;
  display: inline-block;
}
.cert-date {
  color: var(--muted);
  font-size: 8.5px;
}
.cert-card-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--ink);
  line-height: 1.25;
  margin-bottom: 3px;
}
.cert-bottom-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 8px;
  color: #7a7d72;
}
.cert-id-tag {
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 170px;
}
.cert-view-link {
  color: #4a52ff;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.cert-card-row:hover .cert-view-link {
  color: var(--ink);
  text-decoration: underline;
}

/* Endpaper */
.cover-endpaper {
  background: linear-gradient(135deg, #1c1e19 0%, #242720 100%);
  color: #efeee8;
  padding: 28px 24px;
  border-radius: 16px 4px 4px 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  text-align: center;
}
.seal-symbol {
  width: 68px;
  height: 68px;
  color: var(--acid);
  margin: 10px auto;
}

/* Book Controls */
.book-nav-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 24px;
}
.book-nav-btn {
  background: var(--dark);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.1);
  padding: 10px 22px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.25s var(--ease);
}
.book-nav-btn:hover {
  background: var(--ink);
  color: var(--acid);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.2);
}
.book-nav-btn:disabled {
  opacity: 0.3;
  pointer-events: none;
}
.book-indicator-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
#book-page-label {
  font-size: 11px;
  color: var(--muted);
  font-weight: 700;
}
.book-dots {
  display: flex;
  gap: 6px;
}
.book-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--line);
  transition: all 0.3s var(--ease);
  cursor: pointer;
}
.book-dot.active {
  width: 22px;
  border-radius: 4px;
  background: var(--dark);
}

.book-sound-btn {
  background: transparent;
  border: 1px solid var(--line);
  color: var(--muted);
  font-size: 11px;
  padding: 8px 14px;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.book-sound-btn:hover {
  background: rgba(23,24,22,0.06);
  color: var(--ink);
}

.book-hints {
  text-align: center;
  font-size: 10px;
  color: #8c9082;
  margin-top: 14px;
}

@media (max-width: 820px) {
  .book-stage-outer { padding: 10px 0; }
  .book-nav-bar { gap: 8px; }
  .book-nav-btn { padding: 8px 14px; font-size: 11px; }
  .chapter-ribbons { gap: 4px; }
  .ribbon-btn { padding: 4px 8px; font-size: 9px; }
}

/* ==========================================================
   LAB TABS & ILLUSTRATOR VECTOR STUDIO
========================================================== */
.lab-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 1px solid rgba(214, 255, 98, 0.2);
  padding-bottom: 12px;
}
.lab-tab-btn {
  background: transparent;
  border: 0;
  color: #9a9d90;
  font-size: 12px;
  font-weight: 700;
  padding: 8px 18px;
  border-radius: 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}
.lab-tab-btn:hover { color: #fff; background: rgba(255,255,255,0.05); }
.lab-tab-btn.active {
  background: var(--acid);
  color: var(--ink);
}

/* 3D Shape buttons grid */
.shape-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
@media (min-width: 1200px) {
  .shape-options { grid-template-columns: repeat(4, 1fr); }
}

/* Render Mode Selector */
.render-mode-group {
  margin-top: 14px;
}
.mode-pills {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}
.mode-pill-btn {
  flex: 1;
  background: #141613;
  border: 1px solid #33362d;
  color: #8c9082;
  font-size: 10px;
  padding: 6px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}
.mode-pill-btn:hover { color: #f2f1ea; }
.mode-pill-btn.active {
  background: #2a2d24;
  color: var(--acid);
  border-color: var(--acid);
}

.lab-stage canvas {
  cursor: grab;
}
.lab-stage canvas:active {
  cursor: grabbing;
}

/* Illustrator Vector Studio */
.vector-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 24px;
}
@media (max-width: 900px) {
  .vector-layout { grid-template-columns: 1fr; }
}

.vector-stage {
  position: relative;
  background: #0f110d;
  border: 1px solid #2d3027;
  border-radius: 16px;
  overflow: hidden;
  height: 440px;
  display: flex;
  justify-content: center;
  align-items: center;
}
#vector-canvas {
  width: 100%;
  height: 100%;
  cursor: crosshair;
}
.vector-tools {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.vector-presets {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.preset-btn {
  background: #191c16;
  border: 1px solid #32362b;
  color: #cfd2c4;
  font-size: 11px;
  padding: 10px 12px;
  border-radius: 8px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
}
.preset-btn:hover { border-color: var(--acid); color: #fff; }
.preset-btn.active { background: #262a20; border-color: var(--acid); color: var(--acid); }
.export-svg-btn {
  background: var(--acid);
  color: var(--ink);
  font-weight: 800;
  font-size: 12px;
  border: 0;
  padding: 12px 18px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}
.export-svg-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(214, 255, 98, 0.3);
}
"""

with open("generated_css.txt", "w") as f:
    f.write(css_content)

print("CSS saved.")
