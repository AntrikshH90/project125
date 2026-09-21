with open("antriksh-portfolio-studio.html", "r", encoding="utf-8") as f:
    text = f.read()

print("File size:", len(text), "chars, lines:", text.count("\n"))
print("Has <style>:", "<style>" in text)
print("Has </style>:", "</style>" in text)
print("Has <dialog id=\"detail-dialog\":", 'id="detail-dialog"' in text)
print("Has <section id=\"about\":", 'id="about"' in text)
print("Has <section id=\"work\":", 'id="work"' in text)
print("Has <section id=\"playground\":", 'id="playground"' in text)
print("Has <div class=\"cover-front\":", 'class="cover-front"' in text)
