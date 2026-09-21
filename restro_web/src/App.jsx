import React, { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Preload, AdaptiveDpr, AdaptiveEvents } from '@react-three/drei';
import { Scene } from './scene/Restaurant';
import { Loader } from './components/Loader';
import { HUD } from './components/HUD';
import { Gyroscope } from './components/Gyroscope';
import { MobileNav } from './components/MobileNav';
import { ReserveModal } from './components/ReserveModal';
import { AudioToggle } from './components/AudioToggle';

export default function App() {
  const [reserveOpen, setReserveOpen] = useState(false);
  const [webglOK, setWebglOK] = useState(true);

  useEffect(() => {
    try {
      const c = document.createElement('canvas');
      const ok = !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
      setWebglOK(ok);
    } catch {
      setWebglOK(false);
    }

    const handler = (e) => {
      if (e.target.closest('.hud-reserve, [data-reserve]')) {
        e.preventDefault();
        setReserveOpen(true);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  if (!webglOK) {
    return (
      <div className="nogl-screen">
        <h2>3D Experience Unavailable</h2>
        <p>WebGL is disabled on this device. Enable hardware acceleration in your browser settings, or try Chrome / Edge.</p>
        <a href="/">← Return to main site</a>
      </div>
    );
  }

  return (
    <>
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        camera={{ position: [0, 1.7, 8], fov: 50, near: 0.1, far: 200 }}
      >
        <color attach="background" args={['#0a0604']} />
        <fog attach="fog" args={['#0a0604', 8, 35]} />
        <Suspense fallback={null}>
          <Scene />
          <Preload all />
        </Suspense>
        <AdaptiveDpr pixelated />
        <AdaptiveEvents />
      </Canvas>

      <HUD />
      <Gyroscope />
      <MobileNav />
      <Loader />
      <AudioToggle />
      {reserveOpen && <ReserveModal onClose={() => setReserveOpen(false)} />}
    </>
  );
}
