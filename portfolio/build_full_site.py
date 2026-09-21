import re
import json

# Read original file
with open("uploads/antriksh-portfolio-studio.html", "r", encoding="utf-8") as f:
    ant = f.read()

# Extract CRED_RAW
cred_raw_match = re.search(r'const CRED_RAW = (\[[\s\S]*?\]);', ant)
CRED_RAW = eval(cred_raw_match.group(1))

# Add Illustrator and design certifications if not already present
illustrator_creds = [
    ["Adobe Illustrator CC Masterclass: Vector Art & Brand Systems", "Adobe Certified", "May 2025", "ADOBE-ILLUST-CC90", 4],
    ["Graphic Design & Visual Principles Specialization", "CalArts / Coursera", "Aug 2025", "CALARTS-GD-8841", 4],
    ["Typography, Grid Systems & Editorial Layout", "Adobe Design", "Oct 2025", "ADOBE-TYPO-7729", 4],
    ["Visual Elements of UI Design", "CalArts", "Nov 2025", "CALARTS-UI-6632", 4]
]
for ic in illustrator_creds:
    if not any(c[0] == ic[0] for c in CRED_RAW):
        CRED_RAW.append(ic)

print(f"Total credentials with Illustrator additions: {len(CRED_RAW)}")
