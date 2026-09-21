import re
import sys
import os

with open("uploads/antriksh-portfolio-studio.html", "r", encoding="utf-8") as f:
    ant = f.read()

# Let's inspect where sections are
pos_head_end = ant.find("</head>")
pos_body_start = ant.find("<body id=\"top\">")
pos_body_inner = ant.find(">", pos_body_start) + 1

pos_cred_start = ant.find('<section id="credentials"')
pos_cred_end = ant.find('</section>', pos_cred_start) + len('</section>')

pos_play_start = ant.find('<section id="playground"')
pos_play_end = ant.find('</section>', pos_play_start) + len('</section>')

pos_script_start = ant.find("<script>")
pos_script_end = ant.rfind("</script>")

print("Landmarks found:")
print("pos_head_end:", pos_head_end)
print("pos_body_inner:", pos_body_inner)
print("pos_cred_start:", pos_cred_start, "pos_cred_end:", pos_cred_end)
print("pos_play_start:", pos_play_start, "pos_play_end:", pos_play_end)
print("pos_script_start:", pos_script_start, "pos_script_end:", pos_script_end)

