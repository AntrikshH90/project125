import re
import sys

with open("uploads/antriksh-portfolio-studio.html", "r", encoding="utf-8") as f:
    orig = f.read()

print("Original loaded, size:", len(orig))
