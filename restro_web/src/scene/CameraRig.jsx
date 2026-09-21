import React, { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useStore } from '../store/useStore';
import gsap from 'gsap';

const ZONES = {
  entrance: { pos: [0, 1.7, 8], target: [0, 1.5, 0], duration: 2 },
  lounge: { pos: [-5, 1.7, 3], target: [-5, 1.0, 1], duration: 2 },
  dining: { pos: [0, 1.7, -2], target: [0, 1.0, -4], duration: 2 },
  kitchen: { pos: [7, 1.7, -4], target: [9.5, 1.0, -6], duration: 2 },
  cellar: { pos: [-7, 1.5, 4], target: [-9.5, 1.0, 4], duration: 2 },
  patio: { pos: [0, 1.6, -7], target: [0, 2.0, -10], duration: 2 }
};

const TOUR_PATH = ['entrance', 'lounge', 'dining', 'kitchen', 'cellar', 'patio'];

export function CameraRig() {
  const controls = useRef();
  const { camera } = useThree();
  const currentZone = useStore((s) => s.currentZone);
  const setZone = useStore((s) => s.setZone);
  const tourActive = useStore((s) => s.tourActive);
  const tourStep = useStore((s) => s.tourStep);

  useEffect(() => {
    if (!controls.current) return;
    const target = ZONES[currentZone];
    if (!target) return;

    gsap.to(camera.position, {
      x: target.pos[0], y: target.pos[1], z: target.pos[2],
      duration: target.duration, ease: 'power2.inOut'
    });
    gsap.to(controls.current.target, {
      x: target.target[0], y: target.target[1], z: target.target[2],
      duration: target.duration, ease: 'power2.inOut',
      onUpdate: () => controls.current.update()
    });
  }, [currentZone, camera]);

  useEffect(() => {
    if (!tourActive) return;
    if (tourStep >= TOUR_PATH.length) {
      useStore.getState().endTour();
      return;
    }
    setZone(TOUR_PATH[tourStep]);
    const timer = setTimeout(() => {
      const s = useStore.getState();
      if (s.tourActive && s.tourStep + 1 < TOUR_PATH.length) s.nextTourStep();
      else if (s.tourActive) s.endTour();
    }, 5000);
    return () => clearTimeout(timer);
  }, [tourActive, tourStep, setZone]);

  return (
    <OrbitControls
      ref={controls}
      enableDamping
      dampingFactor={0.05}
      enablePan={false}
      minDistance={2}
      maxDistance={12}
      minPolarAngle={Math.PI / 4}
      maxPolarAngle={Math.PI / 2.1}
      target={[0, 1.5, 0]}
    />
  );
}
