import re
import json

# Read the original antriksh file
with open("uploads/antriksh-portfolio-studio.html", "r", encoding="utf-8") as f:
    ant = f.read()

print("Original length:", len(ant))
