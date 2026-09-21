import { useEffect } from 'react';
import { useStore } from '../store/useStore';

const TOUR_STEPS = [
  { zone: 'entrance', title: 'Welcome to EMBER & OAK', description: 'A culinary destination where fire meets artistry.' },
  { zone: 'lounge', title: 'The Lounge', description: 'Where evenings begin. Craft cocktails and conversation.' },
  { zone: 'dining', title: 'Main Dining Room', description: 'Intimate tables, each with a view of the hearth.' },
  { zone: 'kitchen', title: 'Open Fire Kitchen', description: 'Every dish begins over real wood and flame.' },
  { zone: 'cellar', title: 'The Cellar', description: '300+ labels, including rare finds and private reserve.' },
  { zone: 'patio', title: 'Garden Patio', description: 'Under the stars, surrounded by our herb garden.' }
];

export function useTour() {
  const tourActive = useStore((s) => s.tourActive);
  const tourStep = useStore((s) => s.tourStep);
  const setZone = useStore((s) => s.setZone);
  const nextStep = useStore((s) => s.nextTourStep);
  const endTour = useStore((s) => s.endTour);

  useEffect(() => {
    if (!tourActive) return;
    const step = TOUR_STEPS[tourStep];
    if (!step) {
      endTour();
      return;
    }

    setZone(step.zone);

    const zoneName = document.getElementById('currentZone');
    const zoneHint = document.querySelector('.hud-zone-hint');
    if (zoneName) zoneName.textContent = step.title;
    if (zoneHint) zoneHint.textContent = step.description;

    const timer = setTimeout(() => {
      if (tourStep + 1 < TOUR_STEPS.length) nextStep();
      else endTour();
    }, 5000);

    return () => clearTimeout(timer);
  }, [tourActive, tourStep, setZone, nextStep, endTour]);
}
