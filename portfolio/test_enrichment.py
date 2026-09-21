import re

with open("antriksh-portfolio-studio.html") as f:
    html = f.read()

print("Current length:", len(html))
print("About section found:", 'id="about"' in html)
