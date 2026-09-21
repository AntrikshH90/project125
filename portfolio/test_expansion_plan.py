with open("antriksh-portfolio-studio.html", "r", encoding="utf-8") as f:
    text = f.read()

print("Current length:", len(text), "chars")
print("Has 'Curiosity':", "Curiosity" in text)
print("Has 'AKTU '27':", "AKTU '27" in text)
