import re
import sys

# 1. Read base files
with open("uploads/antriksh-portfolio-studio.html", "r", encoding="utf-8") as f:
    ant = f.read()

with open("generated_css.txt", "r", encoding="utf-8") as f:
    css_additions = f.read()

with open("complete_script.js", "r", encoding="utf-8") as f:
    js_code = f.read()

# Read book_html and play_html from build_site.py
# Let's import or load them
import build_site
book_html = build_site.book_html
play_html = build_site.play_html

# A. Insert CSS before </style>
pos_style_close = ant.find("</style>")
ant = ant[:pos_style_close] + "\n" + css_additions + "\n" + ant[pos_style_close:]

# B. Insert ambient background & cursor right after <body id="top">
ambient_html = """
  <div class="nav-progress" id="nav-progress" aria-hidden="true"></div>
  <div class="ambient-bg" aria-hidden="true">
    <div class="ambient-orb"></div>
    <div class="ambient-orb"></div>
    <div class="ambient-orb"></div>
  </div>
  <canvas id="particles-bg" aria-hidden="true"></canvas>
  <div class="cursor-trail" id="cursor-trail" aria-hidden="true"></div>
  <div class="cursor-dot" id="cursor-dot" aria-hidden="true"></div>
"""
pos_body = ant.find("<body id=\"top\">")
pos_body_inner = ant.find(">", pos_body) + 1
ant = ant[:pos_body_inner] + "\n" + ambient_html + ant[pos_body_inner:]

# C. Add magnetic class to brand and contact button
ant = ant.replace('<a href="#top" class="brand"', '<a href="#top" class="brand magnetic"')
ant = ant.replace('<button class="nav-contact" data-contact>', '<button class="nav-contact magnetic" data-contact>')

# D. Replace #credentials section
pos_cred_start = ant.find('<section id="credentials"')
pos_cred_end = ant.find('</section>', pos_cred_start) + len('</section>')
ant = ant[:pos_cred_start] + book_html + ant[pos_cred_end:]

# E. Replace #playground section
pos_play_start = ant.find('<section id="playground"')
pos_play_end = ant.find('</section>', pos_play_start) + len('</section>')
ant = ant[:pos_play_start] + play_html + ant[pos_play_end:]

# F. Replace <script>
pos_script_start = ant.find("<script>") + len("<script>")
pos_script_end = ant.rfind("</script>")
ant = ant[:pos_script_start] + "\n" + js_code + "\n" + ant[pos_script_end:]

# Write to both locations
with open("antriksh-portfolio-studio.html", "w", encoding="utf-8") as f:
    f.write(ant)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(ant)

print("SUCCESS: Wrote antriksh-portfolio-studio.html and index.html")
print("Total size:", len(ant), "chars, lines:", ant.count("\n"))
