import re

# Read original
with open("uploads/antriksh-portfolio-studio.html", "r", encoding="utf-8") as f:
    ant = f.read()

# Extract PROJECTS
m_proj = re.search(r'const PROJECTS = (\[[\s\S]*?\]);\s*const CRED_RAW', ant)
projects_raw = m_proj.group(1)

# In projects_raw, distribute the 8 shapes
# Currently: knot, sphere, wave
# Let's replace shapes systematically
proj_shapes = [
    ("sandforge", "knot", [193, 174, 255]),
    ("emergency-mitra", "sphere", [255, 117, 77]),
    ("sahayak", "wave", [131, 225, 255]),
    ("churn", "torus", [214, 255, 98]),
    ("aanya", "helix", [193, 174, 255]),
    ("bharat", "hypercube", [255, 149, 108]),
    ("face-gate", "mobius", [131, 225, 255]),
    ("voltix-face", "nib", [214, 255, 98]),
    ("dataharvest", "torus", [193, 174, 255]),
    ("instant-scraper", "helix", [255, 117, 77]),
    ("qr-hub", "knot", [131, 225, 255]),
    ("explain-dish", "sphere", [214, 255, 98]),
    ("ecom-analytics", "wave", [255, 149, 108]),
    ("fleet", "hypercube", [193, 174, 255]),
    ("ember-oak", "mobius", [255, 117, 77]),
    ("apex-os", "knot", [214, 255, 98]),
    ("apex-hiring", "wave", [131, 225, 255]),
    ("zenith", "helix", [193, 174, 255]),
    ("voltix-home", "sphere", [255, 149, 108]),
    ("portfolio-v3", "nib", [214, 255, 98])
]

# Extract CRED_RAW
cred_raw_match = re.search(r'const CRED_RAW = (\[[\s\S]*?\]);', ant)
CRED_RAW = eval(cred_raw_match.group(1))

illustrator_creds = [
    ["Adobe Illustrator CC Masterclass: Vector Art & Brand Systems", "Adobe Certified", "May 2025", "ADOBE-ILLUST-CC90", 4],
    ["Graphic Design & Visual Principles Specialization", "CalArts / Coursera", "Aug 2025", "CALARTS-GD-8841", 4],
    ["Typography, Grid Systems & Editorial Layout", "Adobe Design", "Oct 2025", "ADOBE-TYPO-7729", 4],
    ["Visual Elements of UI Design", "CalArts", "Nov 2025", "CALARTS-UI-6632", 4]
]
for ic in illustrator_creds:
    if not any(c[0] == ic[0] for c in CRED_RAW):
        CRED_RAW.append(ic)

print(f"Total CRED_RAW prepared: {len(CRED_RAW)}")
