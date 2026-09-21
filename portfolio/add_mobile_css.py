with open("antriksh-portfolio-studio.html", "r", encoding="utf-8") as f:
    text = f.read()

OLD = """.supernova-toast.active {
  transform: translateX(-50%) translateY(0);
}"""

NEW = """.supernova-toast.active {
  transform: translateX(-50%) translateY(0);
}

@media (max-width: 640px) {
  .hero-avatar-pill {
    padding: 4px 10px 4px 4px;
    gap: 8px;
    max-width: 100%;
  }
  .hero-avatar-thumb {
    width: 32px;
    height: 32px;
  }
  .hero-avatar-role {
    font-size: 10px;
  }
  .hero-avatar-tag {
    display: none;
  }
  .bezier-game-hud {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 8px 12px;
  }
  .game-meter {
    width: 100%;
    justify-content: space-between;
  }
  .game-meter-bar {
    width: 65px;
  }
  .arch-dialog {
    padding: 18px 14px;
  }
  .arch-specs-grid {
    grid-template-columns: 1fr 1fr;
  }
}"""

if OLD in text:
    text = text.replace(OLD, NEW, 1)
    with open("antriksh-portfolio-studio.html", "w", encoding="utf-8") as f:
        f.write(text)
    with open("index.html", "w", encoding="utf-8") as f:
        f.write(text)
    print("Mobile media queries added.")
else:
    print("WARNING: OLD not matched.")
