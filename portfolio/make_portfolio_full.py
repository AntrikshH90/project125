import re
import sys
import subprocess

# Read original
with open("uploads/antriksh-portfolio-studio.html", "r", encoding="utf-8") as f:
    ant = f.read()

# Let's inspect CSS to see where we append
pos_style_close = ant.find("</style>")

# Let's inspect body to see where we inject ambient elements
pos_body = ant.find("<body id=\"top\">")
pos_body_inner = ant.find(">", pos_body) + 1

# Let's inspect where #credentials and #playground are
pos_cred_start = ant.find('<section id="credentials"')
pos_cred_end = ant.find('</section>', pos_cred_start) + len('</section>')

pos_play_start = ant.find('<section id="playground"')
pos_play_end = ant.find('</section>', pos_play_start) + len('</section>')

# Let's inspect where <script> starts and ends
pos_script_open = ant.find("<script>")
pos_script_close = ant.rfind("</script>")

print("Everything located properly!")
