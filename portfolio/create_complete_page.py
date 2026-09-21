import re
import sys

# Load original
with open("uploads/antriksh-portfolio-studio.html", "r", encoding="utf-8") as f:
    orig = f.read()

print("Original length:", len(orig))

# We will construct the enhanced HTML file by cleanly injecting the CSS, HTML, and JS
