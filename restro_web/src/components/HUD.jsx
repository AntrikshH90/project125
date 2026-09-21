import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useTour } from '../hooks/useTour';

const ZONE_NAMES = {
  entrance: 'The Entrance',
  lounge: 'The Lounge',
  dining: 'Main Dining',
  kitchen: 'Open Kitchen',
  cellar: 'Wine Cellar',
  patio: 'Garden Patio'
};

export function HUD() {
  const currentZone = useStore((s) => s.currentZone);
  const discoveredZones = useStore((s) => s.discoveredZones);
  const setZone = useStore((s) => s.setZone);
  const tourActive = useStore((s) => s.tourActive);
  const startTour = useStore((s) => s.startTour);
  const toggleAudio = useStore((s) => s.toggleAudio);
  const audioEnabled = useStore((s) => s.audioEnabled);
  const audioAvailable = useStore((s) => s.audioAvailable);

  useTour();

  useEffect(() => {
    const marker = document.getElementById('minimapMarker');
    document.querySelectorAll('.minimap-zone').forEach((z) => {
      z.classList.remove('active', 'visited');
      if (z.dataset.zone === currentZone) z.classList.add('active');
      else if (discoveredZones.has(z.dataset.zone)) z.classList.add('visited');
      z.onclick = () => setZone(z.dataset.zone);
    });
    if (marker) {
      const active = document.querySelector(`.minimap-zone[data-zone="${currentZone}"]`);
      if (active) {
        marker.style.left = active.style.left;
        marker.style.top = active.style.top;
      }
    }
  }, [currentZone, discoveredZones, setZone]);

  useEffect(() => {
    document.querySelectorAll('.hud-link').forEach((link) => {
      link.classList.toggle('active', link.dataset.zone === currentZone);
      link.onclick = () => setZone(link.dataset.zone);
    });
  }, [currentZone, setZone]);

  useEffect(() => {
    const nameEl = document.getElementById('currentZone');
    if (nameEl) {
      nameEl.style.opacity = 0;
      nameEl.style.transform = 'translateY(10px)';
      setTimeout(() => {
        nameEl.textContent = ZONE_NAMES[currentZone] || currentZone;
        nameEl.style.opacity = 1;
        nameEl.style.transform = 'translateY(0)';
      }, 200);
    }
  }, [currentZone]);

  useEffect(() => {
    const progress = (discoveredZones.size / 6) * 100;
    const bar = document.getElementById('exploreProgress');
    const disc = document.getElementById('discovered');
    if (bar) bar.style.setProperty('--progress', progress + '%');
    if (disc) disc.textContent = discoveredZones.size;
  }, [discoveredZones]);

  useEffect(() => {
    const btn = document.getElementById('tourBtn');
    if (btn) {
      btn.onclick = startTour;
      btn.classList.toggle('active', tourActive);
    }
  }, [tourActive, startTour]);

  useEffect(() => {
    const btn = document.getElementById('audioToggle');
    if (btn) {
      btn.onclick = toggleAudio;
      btn.classList.toggle('active', audioEnabled);
      btn.style.opacity = audioAvailable ? 1 : 0.4;
      btn.title = audioAvailable ? 'Toggle ambience' : 'Add audio files to public/assets/audio to enable';
    }
  }, [audioEnabled, audioAvailable, toggleAudio]);

  return null;
}
