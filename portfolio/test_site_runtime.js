const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('index.html', 'utf8');

const dom = new JSDOM(html, {
  runScripts: "dangerously",
  resources: "usable",
  beforeParse(window) {
    window.HTMLCanvasElement.prototype.getContext = function() {
      return {
        clearRect: () => {},
        fillRect: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        fill: () => {},
        arc: () => {},
        bezierCurveTo: () => {},
        save: () => {},
        restore: () => {},
        translate: () => {},
        rotate: () => {},
        setTransform: () => {},
        createRadialGradient: () => ({ addColorStop: () => {} }),
        strokeRect: () => {},
        measureText: () => ({ width: 50 })
      };
    };

    window.HTMLCanvasElement.prototype.getBoundingClientRect = function() {
      return { width: 600, height: 440, top: 0, left: 0, right: 600, bottom: 440 };
    };

    window.Element.prototype.getBoundingClientRect = function() {
      return { width: 760, height: 520, top: 100, left: 100, right: 860, bottom: 620 };
    };

    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    window.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    window.HTMLDialogElement.prototype.showModal = function() { this.open = true; };
    window.HTMLDialogElement.prototype.close = function() { this.open = false; };
    window.requestAnimationFrame = function(cb) { return setTimeout(cb, 16); };
    window.cancelAnimationFrame = function(id) { clearTimeout(id); };
  }
});

const { window } = dom;

console.log("Waiting for DOM scripts execution...");
setTimeout(() => {
  const { document } = window;
  
  // 1. Check project cards
  const cards = document.querySelectorAll('.project-card');
  console.log("TEST 1 - Project cards count:", cards.length, "(expected 20)");
  if (cards.length !== 20) throw new Error("Expected 20 cards");

  // 2. Check book leaves
  const leaves = document.querySelectorAll('.book-leaf');
  console.log("TEST 2 - Book leaves count:", leaves.length, "(expected 6)");
  if (leaves.length !== 6) throw new Error("Expected 6 leaves");

  // 3. Test book flipping
  const nextBtn = document.getElementById('book-next');
  const prevBtn = document.getElementById('book-prev');
  console.log("TEST 3 - Book prev disabled initially:", prevBtn.disabled);
  if (!prevBtn.disabled) throw new Error("Prev should be disabled at cover");

  nextBtn.click();
  console.log("Clicked next. Leaf 0 classes:", leaves[0].className);
  if (!leaves[0].classList.contains('flipped')) throw new Error("Leaf 0 should be flipped");

  // 4. Test 3D Lab shape buttons
  const shapeButtons = document.querySelectorAll('.shape-button');
  console.log("TEST 4 - 3D shape buttons count:", shapeButtons.length, "(expected 8)");
  const nibBtn = [...shapeButtons].find(b => b.dataset.shape === 'nib');
  if (!nibBtn) throw new Error("Nib button missing");
  nibBtn.click();
  console.log("Clicked nib button. Aria-pressed:", nibBtn.getAttribute('aria-pressed'));
  if (nibBtn.getAttribute('aria-pressed') !== 'true') throw new Error("Nib should be active");

  // 5. Test Playground tab switcher
  const tabVector = document.getElementById('tab-vector-btn');
  const panelVector = document.getElementById('panel-vector-lab');
  tabVector.click();
  console.log("TEST 5 - Switched to Vector tab. Vector panel display:", panelVector.style.display);
  if (panelVector.style.display !== 'block') throw new Error("Vector panel should be visible");

  // 6. Test Credential View switcher
  const wallToggle = document.getElementById('toggle-wall-view');
  const bookToggle = document.getElementById('toggle-book-view');
  const wallView = document.getElementById('wall-view-container');
  const bookView = document.getElementById('book-view-container');
  wallToggle.click();
  console.log("TEST 6 - Switched to Wall Index. Wall display:", wallView.style.display, "Book display:", bookView.style.display);
  if (wallView.style.display !== 'block') throw new Error("Wall should be visible");
  if (bookView.style.display !== 'none') throw new Error("Book should be hidden");

  bookToggle.click();
  console.log("Switched back to 3D Book. Wall display:", wallView.style.display, "Book display:", bookView.style.display);
  if (bookView.style.display !== 'block') throw new Error("Book should be visible");

  // 7. Test Clicking a Certificate opens Dossier modal
  const firstCert = document.querySelector('.cert-card-row');
  console.log("TEST 7 - Clicking certificate:", firstCert.querySelector('.cert-card-title').textContent);
  firstCert.click();
  const dialog = document.getElementById('detail-dialog');
  console.log("Dialog open state:", dialog.open);
  console.log("Dialog title:", document.getElementById('dialog-title').textContent);
  if (!dialog.open) throw new Error("Dialog should be open");

  console.log("\nALL 7 TESTS PASSED WITH FLYING COLORS!");
  process.exit(0);
}, 600);
