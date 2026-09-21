import { useEffect } from 'react';
import { useStore } from '../store/useStore';

let audioCtx = null;
let nodes = [];

// Procedural ambience — no audio files needed. Synthesizes a warm
// restaurant murmur + fireplace crackle with the Web Audio API.
function startAmbience() {
  if (audioCtx) {
    audioCtx.resume();
    return;
  }
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  const master = audioCtx.createGain();
  master.gain.value = 0.5;
  master.connect(audioCtx.destination);

  // Low warm rumble (room tone)
  const rumble = audioCtx.createOscillator();
  rumble.type = 'sine';
  rumble.frequency.value = 55;
  const rumbleGain = audioCtx.createGain();
  rumbleGain.gain.value = 0.02;
  rumble.connect(rumbleGain).connect(master);
  rumble.start();

  // Filtered noise — fire crackle bed
  const bufferSize = 2 * audioCtx.sampleRate;
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const fire = audioCtx.createBufferSource();
  fire.buffer = noiseBuffer;
  fire.loop = true;
  const fireFilter = audioCtx.createBiquadFilter();
  fireFilter.type = 'lowpass';
  fireFilter.frequency.value = 400;
  const fireGain = audioCtx.createGain();
  fireGain.gain.value = 0.03;
  fire.connect(fireFilter).connect(fireGain).connect(master);
  fire.start();

  // Random crackle pops
  const crackle = setInterval(() => {
    if (!audioCtx || audioCtx.state !== 'running') return;
    const pop = audioCtx.createBufferSource();
    pop.buffer = noiseBuffer;
    const hp = audioCtx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1500 + Math.random() * 2000;
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(0.05 + Math.random() * 0.08, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.08);
    pop.connect(hp).connect(g).connect(master);
    pop.start();
    pop.stop(audioCtx.currentTime + 0.1);
  }, 300);

  nodes = [{ stop: () => clearInterval(crackle) }, { stop: () => { rumble.stop(); fire.stop(); } }];
}

export function AudioToggle() {
  const audioEnabled = useStore((s) => s.audioEnabled);
  const setAudioAvailable = useStore((s) => s.setAudioAvailable);

  useEffect(() => {
    setAudioAvailable(!!(window.AudioContext || window.webkitAudioContext));
  }, [setAudioAvailable]);

  useEffect(() => {
    if (audioEnabled) startAmbience();
    else if (audioCtx) audioCtx.suspend();
  }, [audioEnabled]);

  return null;
}
