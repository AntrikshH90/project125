import re
import os

with open("uploads/antriksh-portfolio-studio.html", "r", encoding="utf-8") as f:
    orig = f.read()

print("Original length:", len(orig))

# Let's inspect CSS to see where we append or insert
# In orig:
# <style> ... </style>
# We can find </style> and insert our CSS right before it!
style_end = orig.find("</style>")
print("Style ends at:", style_end)

# In orig:
# <body id="top">
#   <a class="skip-link" href="#main">Skip to content</a>
body_pos = orig.find("<body id=\"top\">")
print("Body pos:", body_pos)

# In orig:
# <section id="credentials" ... </section>
cred_start = orig.find('<section id="credentials"')
cred_end = orig.find('</section>', cred_start) + len('</section>')
print("Credentials section from:", cred_start, "to", cred_end)

# In orig:
# <section id="playground" ... </section>
play_start = orig.find('<section id="playground"')
play_end = orig.find('</section>', play_start) + len('</section>')
print("Playground section from:", play_start, "to", play_end)

# In orig:
# <script> ... </script>
script_start = orig.find('<script>')
script_end = orig.rfind('</script>')
print("Script from:", script_start, "to", script_end)

