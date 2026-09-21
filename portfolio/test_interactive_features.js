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
        setLineDash: () => {},
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

    window.AudioContext = class {
      constructor() {
        this.currentTime = 0;
        this.state = "running";
        this.sampleRate = 44100;
        this.destination = {};
      }
      createOscillator() {
        return {
          type: "sine",
          frequency: { setValueAtTime: () => {} },
          connect: () => {},
          start: () => {},
          stop: () => {},
          disconnect: () => {}
        };
      }
      createGain() {
        return {
          gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
          connect: () => {},
          disconnect: () => {}
        };
      }
      createAnalyser() {
        return {
          fftSize: 64,
          frequencyBinCount: 32,
          getByteFrequencyData: (arr) => {
            for (let i = 0; i < arr.length; i++) arr[i] = 128;
          },
          connect: () => {}
        };
      }
      createBuffer(channels, length, rate) {
        return { getChannelData: () => new Float32Array(length) };
      }
      createBufferSource() {
        return {
          buffer: null,
          connect: () => {},
          start: () => {}
        };
      }
      createBiquadFilter() {
        return {
          type: "bandpass",
          frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
          Q: { value: 1 },
          connect: () => {}
        };
      }
      resume() {}
    };
  }
});

const { window } = dom;

console.log("Waiting for DOM scripts execution...");
setTimeout(() => {
  const { document } = window;

  // TEST 1: Project cards count
  const cards = document.querySelectorAll('.project-card');
  console.log("TEST 1 - Project cards count:", cards.length, "(expected 20)");
  if (cards.length !== 20) throw new Error("Expected 20 cards");

  // TEST 2: Book leaves count
  const leaves = document.querySelectorAll('.book-leaf');
  console.log("TEST 2 - Book leaves count:", leaves.length, "(expected 6)");
  if (leaves.length !== 6) throw new Error("Expected 6 leaves");

  // TEST 3: Hero Avatar Pill
  const heroAvatarPill = document.getElementById('hero-avatar-pill');
  console.log("TEST 3 - Hero Avatar Pill found:", !!heroAvatarPill);
  if (!heroAvatarPill) throw new Error("Hero Avatar Pill should exist");

  // TEST 4: About Avatar Toggle Switcher
  const avatarSwitchBtns = document.querySelectorAll('.avatar-switch-btn');
  const mainAvatarImg = document.getElementById('main-avatar-img');
  console.log("TEST 4 - Avatar switch buttons count:", avatarSwitchBtns.length);
  if (avatarSwitchBtns.length !== 2) throw new Error("Expected 2 avatar switch buttons");
  console.log("Initial avatar src:", mainAvatarImg.src);
  // Click Obsidian Cyber button
  avatarSwitchBtns[1].click();
  setTimeout(() => {
    console.log("Toggled avatar src:", mainAvatarImg.src);

    // TEST 5: Foil Sheen on Book Cover
    const foilSheen = document.getElementById('cover-foil-sheen');
    const bookCover = document.getElementById('book-cover-front');
    console.log("TEST 5 - Foil sheen element exists:", !!foilSheen);
    if (!foilSheen) throw new Error("Foil sheen element missing");

    // Simulate mousemove on book cover
    const moveEvt = new window.MouseEvent("mousemove", { clientX: 200, clientY: 150 });
    bookCover.dispatchEvent(moveEvt);
    console.log("Book cover foil-x property:", bookCover.style.getPropertyValue("--foil-x"));

    // TEST 6: Page Corner Peels
    const cornerPeels = document.querySelectorAll('.page-corner-peel');
    console.log("TEST 6 - Page corner peel count:", cornerPeels.length);
    if (cornerPeels.length < 5) throw new Error("Expected corner peel elements on pages");

    // TEST 7: AI Terminal Recruiter Assistant
    const termTrigger = document.getElementById('ai-terminal-open');
    const termModal = document.getElementById('ai-terminal-modal');
    console.log("TEST 7 - Terminal trigger found:", !!termTrigger);
    termTrigger.click();
    console.log("Terminal open state:", termModal.open);
    if (!termModal.open) throw new Error("Terminal should open on click");

    // Send query
    const termInput = document.getElementById('terminal-input');
    const termForm = document.getElementById('terminal-form');
    termInput.value = "Tell me about SandForge";
    const submitEvt = new window.Event("submit", { cancelable: true });
    termForm.dispatchEvent(submitEvt);

    const termMsgs = document.querySelectorAll('.term-msg');
    console.log("Terminal messages count:", termMsgs.length);
    const lastMsg = termMsgs[termMsgs.length - 1];
    console.log("Last message contains SandForge:", lastMsg.textContent.includes("SandForge"));
    if (!lastMsg.textContent.includes("SandForge")) throw new Error("Bot response missing SandForge content");

    // TEST 8: Audio Reactive Mode in 3D Playground
    const audioToggle = document.getElementById('lab-audio-toggle');
    console.log("TEST 8 - Audio toggle found:", !!audioToggle);
    audioToggle.click();
    console.log("Audio toggle aria-pressed:", audioToggle.getAttribute('aria-pressed'));
    if (audioToggle.getAttribute('aria-pressed') !== 'true') throw new Error("Audio mode should be ON");
    const visualizerHud = document.getElementById('audio-visualizer-hud');
    console.log("Visualizer HUD display:", visualizerHud.style.display);
    if (visualizerHud.style.display !== 'flex') throw new Error("Visualizer should be visible");

    // TEST 9: The Bezier Game in Illustrator Studio
    const bezierGameBtn = document.getElementById('preset-bezier-game');
    console.log("TEST 9 - Bezier game button found:", !!bezierGameBtn);
    bezierGameBtn.click();
    const gameHud = document.getElementById('bezier-game-hud');
    console.log("Bezier game HUD display:", gameHud.style.display);
    if (gameHud.style.display !== 'flex') throw new Error("Bezier game HUD should be visible");

    const verifyBtn = document.getElementById('bezier-verify-btn');
    verifyBtn.click();
    console.log("Clicked verify spline.");

    // TEST 10: Architecture Deep Dive Modal
    const archDialog = document.getElementById('arch-dialog');
    console.log("TEST 10 - Architecture modal found:", !!archDialog);
    window.openArchModal('sandforge');
    console.log("Architecture modal open state:", archDialog.open);
    if (!archDialog.open) throw new Error("Architecture dialog should be open");
    const archBody = document.getElementById('arch-body');
    console.log("Arch body has SandForge flowchart SVG:", archBody.innerHTML.includes("<svg"));
    if (!archBody.innerHTML.includes("<svg")) throw new Error("Arch body should contain SVG flowchart");

    // TEST 11: Konami Code / Supernova Easter Egg
    console.log("TEST 11 - Triggering Supernova Easter Egg...");
    window.triggerSupernovaEasterEgg();
    const supernovaToast = document.getElementById('supernova-toast');
    console.log("Supernova toast has active class:", supernovaToast.classList.contains('active'));
    if (!supernovaToast.classList.contains('active')) throw new Error("Supernova toast should be active");

    console.log("\n=======================================================");
    console.log("🏆 ALL 11 TEST SUITES PASSED PERFECTLY!");
    console.log("=======================================================");
    process.exit(0);
  }, 250);

}, 500);
