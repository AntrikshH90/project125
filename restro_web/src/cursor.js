class ImmersiveCursor {
  constructor() {
    this.dot = document.createElement('div');
    this.ring = document.createElement('div');
    this.dot.className = 'cursor-dot';
    this.ring.className = 'cursor-ring';
    document.body.appendChild(this.dot);
    document.body.appendChild(this.ring);

    this.mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.pos = { x: this.mouse.x, y: this.mouse.y };

    this.init();
  }

  init() {
    document.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    window.addEventListener('touchstart', () => {
      this.dot.style.display = 'none';
      this.ring.style.display = 'none';
      document.body.style.cursor = 'auto';
    }, { once: true });

    this.attachHoverListeners();
    this.animate();
  }

  attachHoverListeners() {
    document.addEventListener('mouseover', (e) => {
      const target = e.target.closest('button, a, .hud-link, .hud-reserve, .hud-icon, .minimap-zone');
      if (target) this.ring.classList.add('hover');
    });
    document.addEventListener('mouseout', (e) => {
      const target = e.target.closest('button, a, .hud-link, .hud-reserve, .hud-icon, .minimap-zone');
      if (target) this.ring.classList.remove('hover');
    });
    document.addEventListener('mousedown', () => this.ring.classList.add('click'));
    document.addEventListener('mouseup', () => this.ring.classList.remove('click'));
  }

  animate() {
    this.pos.x += (this.mouse.x - this.pos.x) * 0.18;
    this.pos.y += (this.mouse.y - this.pos.y) * 0.18;
    this.dot.style.left = this.mouse.x + 'px';
    this.dot.style.top = this.mouse.y + 'px';
    this.ring.style.left = this.pos.x + 'px';
    this.ring.style.top = this.pos.y + 'px';
    requestAnimationFrame(() => this.animate());
  }
}

if (window.matchMedia('(pointer: fine)').matches) {
  new ImmersiveCursor();
} else {
  document.body.style.cursor = 'auto';
}
