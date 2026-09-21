import re
import os
import sys

# Read original
with open("uploads/antriksh-portfolio-studio.html", "r", encoding="utf-8") as f:
    ant = f.read()

# Verify PROJECTS
projects_match = re.search(r'const PROJECTS = (\[[\s\S]*?\]);', ant)
if not projects_match:
    print("Could not find PROJECTS")
    sys.exit(1)

# Verify CRED_RAW
cred_raw_match = re.search(r'const CRED_RAW = (\[[\s\S]*?\]);', ant)
if not cred_raw_match:
    print("Could not find CRED_RAW")
    sys.exit(1)

print("Landmarks found successfully!")
