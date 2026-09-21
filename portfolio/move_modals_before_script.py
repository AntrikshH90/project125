with open("antriksh-portfolio-studio.html", "r", encoding="utf-8") as f:
    html = f.read()

# Extract the modals block from after </script>
script_end_idx = html.rfind("</script>")
after_script = html[script_end_idx + len("</script>"):]

# Find closing </body>
body_end_idx = after_script.rfind("</body>")
if body_end_idx != -1:
    modals_block = after_script[:body_end_idx].strip()
    after_script_clean = "\n\n</body>\n</html>"
else:
    modals_block = ""
    after_script_clean = after_script

print("Modals block length:", len(modals_block))

# Remove modals_block from after </script>
new_html = html[:script_end_idx + len("</script>")] + after_script_clean

# Now insert modals_block before <script>
script_start_idx = new_html.find("<script>")
if script_start_idx != -1 and modals_block:
    new_html = new_html[:script_start_idx] + modals_block + "\n\n" + new_html[script_start_idx:]
    print("Modals moved before <script>.")
else:
    print("ERROR: could not find <script> or modals_block is empty.")

with open("antriksh-portfolio-studio.html", "w", encoding="utf-8") as f:
    f.write(new_html)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(new_html)

print("Files saved successfully.")
