import re
import sys
import subprocess

# 1. Load original HTML
with open("uploads/antriksh-portfolio-studio.html", "r", encoding="utf-8") as f:
    ant = f.read()

# 2. Extract CRED_RAW
cred_raw_match = re.search(r'const CRED_RAW = (\[[\s\S]*?\]);', ant)
CRED_RAW = eval(cred_raw_match.group(1))

# Append Illustrator & Creative certifications
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

# 3. Read external chunks or assemble
print("Building full page string...")
