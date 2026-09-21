import re
import sys

# Load original
with open("uploads/antriksh-portfolio-studio.html", "r", encoding="utf-8") as f:
    ant = f.read()

# Verify that all major parts exist
assert "</style>" in ant
assert "<body id=\"top\">" in ant
assert '<section id="credentials"' in ant
assert '<section id="playground"' in ant
assert "<script>" in ant
assert "</script>" in ant

print("Original verified successfully.")
