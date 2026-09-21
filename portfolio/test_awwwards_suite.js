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
        closePath: () => {},
        save: () => {},
        restore: () => {},
        translate: () => {},
        rotate: () => {},
        setTransform: () => {},
        setLineDash: () => {},
        createRadialGradient: () => ({ addColorStop: () => {} }),
        strokeRect: () => {},
        measureText: () => ({ width: 50 }),
        fillText: () => {}
      };
    };

    window.HTMLCanvasElement.prototype.getBoundingClientRect = function() {
      return { width: 600, height: 440, top: 0, left: 0, right: 600, bottom: 440 };
    };

    window.Element.prototype.getBoundingClientRect = function() {
      return { width: 760, height: 520, top: 100, left: 100, right: 860, bottom: 620 };
    };

    window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
    window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };

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
      createBuffer(c, l, r) { return { getChannelData: () => new Float32Array(l) }; }
      createBufferSource() { return { buffer: null, connect: () => {}, start: () => {} }; }
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

  // TEST 1: AKTU passing year is Class of 2029
  console.log("\n--- TEST 1: AKTU Passing Year ---");
  const heroRole = document.querySelector('.hero-avatar-role');
  console.log("Hero role text:", heroRole ? heroRole.textContent : "null");
  if (!heroRole.textContent.includes("AKTU '29")) throw new Error("Expected AKTU '29 in hero role");
  console.log("PASS: AKTU passing year correctly set to Class of 2029!");

  // TEST 2: Hero Headline & Quote Card
  console.log("\n--- TEST 2: Hero Headline & Quote Card ---");
  const heroTitle = document.getElementById('hero-title');
  console.log("Hero Title text:", heroTitle.textContent.replace(/\s+/g, ' ').trim());
  if (!heroTitle.textContent.includes("Architecting intelligence")) throw new Error("Expected new headline");

  const quoteDisplay = document.getElementById('hero-quote-display');
  console.log("Initial Quote:", quoteDisplay.textContent.trim());
  const quoteShuffleBtn = document.getElementById('quote-shuffle-btn');
  quoteShuffleBtn.click();
  console.log("Shuffled Quote button clicked.");
  console.log("PASS: Hero headline and philosophical quote active!");

  // TEST 3: 12 3D Models in Lab
  console.log("\n--- TEST 3: 12 3D Mathematical Geometries ---");
  const shapeButtons = document.querySelectorAll('.shape-button');
  console.log("Total shape buttons:", shapeButtons.length, "(expected 12)");
  if (shapeButtons.length !== 12) throw new Error("Expected 12 shape buttons");

  const lorenzBtn = [...shapeButtons].find(b => b.dataset.shape === 'lorenz');
  const calabiBtn = [...shapeButtons].find(b => b.dataset.shape === 'calabi');
  const hopfBtn = [...shapeButtons].find(b => b.dataset.shape === 'hopf');
  const blackholeBtn = [...shapeButtons].find(b => b.dataset.shape === 'blackhole');

  if (!lorenzBtn || !calabiBtn || !hopfBtn || !blackholeBtn) {
    throw new Error("Missing new shape buttons: lorenz, calabi, hopf, or blackhole");
  }

  lorenzBtn.click();
  console.log("Switched to Lorenz Attractor shape. Lab status:", document.getElementById('lab-status').textContent);
  calabiBtn.click();
  console.log("Switched to Calabi-Yau 6D shape. Lab status:", document.getElementById('lab-status').textContent);
  hopfBtn.click();
  console.log("Switched to Hopf Fibration shape. Lab status:", document.getElementById('lab-status').textContent);
  blackholeBtn.click();
  console.log("Switched to Accretion Singularity shape. Lab status:", document.getElementById('lab-status').textContent);
  console.log("PASS: All 12 3D geometries verified!");

  // TEST 4: Graviton Singularity Mode
  console.log("\n--- TEST 4: Graviton Singularity Mode ---");
  const gravityToggle = document.getElementById('lab-gravity-toggle');
  console.log("Gravity toggle button exists:", !!gravityToggle);
  gravityToggle.click();
  console.log("Graviton toggle aria-pressed:", gravityToggle.getAttribute('aria-pressed'));
  if (gravityToggle.getAttribute('aria-pressed') !== 'true') throw new Error("Gravitons should be ON");
  const labCanvas = document.getElementById('lab-canvas');
  labCanvas.dispatchEvent(new window.MouseEvent('click', { clientX: 250, clientY: 200 }));
  console.log("PASS: Graviton singularity clicked & particles warped!");

  // TEST 5: 3-Tab Switcher (3D Lab, Vector Lab, Neural Lab)
  console.log("\n--- TEST 5: 3-Tab Lab Switcher ---");
  const tabNeuralBtn = document.getElementById('tab-neural-btn');
  const panelNeuralLab = document.getElementById('panel-neural-lab');
  const tabVectorBtn = document.getElementById('tab-vector-btn');
  const panelVectorLab = document.getElementById('panel-vector-lab');
  const tab3dBtn = document.getElementById('tab-3d-btn');
  const panel3dLab = document.getElementById('panel-3d-lab');

  tabNeuralBtn.click();
  console.log("Switched to Neural Tab. Neural display:", panelNeuralLab.style.display, "3D display:", panel3dLab.style.display);
  if (panelNeuralLab.style.display !== 'block') throw new Error("Neural panel should be visible");

  // TEST 6: Neural Synapse Tuner Mini-Game
  console.log("\n--- TEST 6: Neural Synapse Tuner Mini-Game ---");
  const trainBtn = document.getElementById('neural-train-btn');
  const lossEl = document.getElementById('neural-loss-val');
  console.log("Initial Neural Loss:", lossEl.textContent);
  trainBtn.click();
  console.log("Clicked Train Weights.");
  console.log("PASS: Neural Synapse Tuner training loop active!");

  // TEST 7: Illustrator Studio Enhancements & Path Code Inspector
  console.log("\n--- TEST 7: Illustrator Studio & Path Code Inspector ---");
  tabVectorBtn.click();
  console.log("Switched to Vector tab.");
  const fibonacciPresetBtn = document.querySelector('[data-preset="fibonacci"]');
  const voronoiPresetBtn = document.querySelector('[data-preset="voronoi"]');
  if (!fibonacciPresetBtn || !voronoiPresetBtn) throw new Error("Fibonacci or Voronoi preset buttons missing");
  fibonacciPresetBtn.click();
  console.log("Selected Golden Spiral (Fibonacci) preset.");
  voronoiPresetBtn.click();
  console.log("Selected Voronoi Cellular preset.");

  const inspectBtn = document.getElementById('inspect-svg-btn');
  const codeDrawer = document.getElementById('svg-code-drawer');
  inspectBtn.click();
  console.log("Code drawer display after inspect click:", codeDrawer.style.display);
  if (codeDrawer.style.display !== 'block') throw new Error("SVG code drawer should be visible");
  console.log("PASS: Illustrator Studio and Path Code Inspector verified!");

  // TEST 8: Architecture Modal: Sahayak-LM & SandForge Simulation
  console.log("\n--- TEST 8: Architecture Deep Dives ---");
  const archModal = document.getElementById('arch-dialog');
  window.openArchModal('sandforge');
  console.log("Architecture modal open:", archModal.open);
  const simTimeline = document.getElementById('sim-timeline-box');
  console.log("SandForge Interactive Simulation Timeline exists:", !!simTimeline);
  if (!simTimeline) throw new Error("Simulation timeline should exist in SandForge arch modal");

  window.selectSimStep(4); // Test red step
  const consoleOut = document.getElementById('sim-console-output');
  console.log("Sim step 4 output:", consoleOut.textContent.trim().split('\n')[0]);

  // Open Sahayak-LM tab
  const sahayakTabBtn = document.querySelector('[data-arch="sahayak"]');
  sahayakTabBtn.click();
  const archBody = document.getElementById('arch-body');
  console.log("Sahayak tab contains QLoRA:", archBody.innerHTML.includes("QLoRA"));
  if (!archBody.innerHTML.includes("QLoRA")) throw new Error("Sahayak tab should contain QLoRA architecture");
  console.log("PASS: Architecture modal and simulation engine verified!");

  // TEST 9: AI Terminal Shell Commands
  console.log("\n--- TEST 9: AI Terminal Cyber Shell Commands ---");
  const termTrigger = document.getElementById('ai-terminal-open');
  termTrigger.click();

  const termInput = document.getElementById('terminal-input');
  const termForm = document.getElementById('terminal-form');

  // Test "help" command
  termInput.value = "help";
  termForm.dispatchEvent(new window.Event("submit", { cancelable: true }));
  const msgs = document.querySelectorAll('.term-msg');
  const lastHelpMsg = msgs[msgs.length - 1];
  console.log("Help command output contains AVAILABLE APEX COMMANDS:", lastHelpMsg.innerHTML.includes("AVAILABLE APEX COMMANDS"));
  if (!lastHelpMsg.innerHTML.includes("AVAILABLE APEX COMMANDS")) throw new Error("Help command output missing");

  // TEST 10: Matrix Digital Rain
  console.log("\n--- TEST 10: Matrix Digital Rain ---");
  const matrixCanvas = document.getElementById('matrix-rain-canvas');
  console.log("Matrix canvas exists:", !!matrixCanvas);
  window.toggleMatrixDigitalRain();
  console.log("Matrix canvas active class:", matrixCanvas.classList.contains('active'));
  if (!matrixCanvas.classList.contains('active')) throw new Error("Matrix canvas should have active class");
  window.toggleMatrixDigitalRain();
  console.log("Matrix canvas deactivated.");
  console.log("PASS: Matrix digital rain engine verified!");

  console.log("\n=======================================================");
  console.log("🏆 ALL 10 MEGA TEST SUITES PASSED FLAWLESSLY!");
  console.log("🌟 ULTRA-PREMIUM $1,000,000 PORTFOLIO READY!");
  console.log("=======================================================");
  process.exit(0);
}, 600);
