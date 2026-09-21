with open("test_awwwards_suite.js", "r", encoding="utf-8") as f:
    t = f.read()

t = t.replace("console.log(\"Switched to Lorenz Attractor shape. Lab shape:\", window.lab.shape);",
              "console.log(\"Switched to Lorenz Attractor shape. Lab status:\", document.getElementById('lab-status').textContent);")
t = t.replace("console.log(\"Switched to Calabi-Yau 6D shape. Lab shape:\", window.lab.shape);",
              "console.log(\"Switched to Calabi-Yau 6D shape. Lab status:\", document.getElementById('lab-status').textContent);")
t = t.replace("console.log(\"Switched to Hopf Fibration shape. Lab shape:\", window.lab.shape);",
              "console.log(\"Switched to Hopf Fibration shape. Lab status:\", document.getElementById('lab-status').textContent);")
t = t.replace("console.log(\"Switched to Accretion Singularity shape. Lab shape:\", window.lab.shape);",
              "console.log(\"Switched to Accretion Singularity shape. Lab status:\", document.getElementById('lab-status').textContent);")

with open("test_awwwards_suite.js", "w", encoding="utf-8") as f:
    f.write(t)

print("test_awwwards_suite.js updated.")
