with open("generated_css.txt") as f:
    css = f.read()

css = css.replace(".credentials-section {\n  position: relative;\n  z-index: 2;\n  padding: 60px 0 80px;\n}",
                  ".credentials-section {\n  position: relative;\n  z-index: 2;\n  padding: 60px 0 80px;\n  overflow-x: clip;\n}")

css = css.replace(".book-stage-outer {\n  width: 100%;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  perspective: 2400px;\n  padding: 20px 0;\n  overflow: visible;\n}",
                  ".book-stage-outer {\n  width: 100%;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  perspective: 2400px;\n  padding: 20px 0;\n  overflow-x: clip;\n}")

with open("generated_css.txt", "w") as f:
    f.write(css)

print("Updated generated_css.txt with overflow-x: clip")
