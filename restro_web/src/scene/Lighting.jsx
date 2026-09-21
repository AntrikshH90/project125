import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStore } from '../store/useStore';

export function Lighting({ zone }) {
  const fireLight = useRef();
  const ambientRef = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (fireLight.current) {
      fireLight.current.intensity = 2.6 * (0.85 + Math.sin(t * 8) * 0.05 + Math.sin(t * 13) * 0.03);
    }
    if (ambientRef.current) {
      ambientRef.current.intensity = 0.15 + Math.sin(t * 0.5) * 0.02;
    }
  });

  const zoneColors = {
    entrance: '#d4793a',
    lounge: '#d4a06a',
    dining: '#f4a464',
    kitchen: '#ff6b35',
    cellar: '#7a9a8a',
    patio: '#8db896'
  };

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.15} color="#8b6f47" />
      <hemisphereLight skyColor="#1a1009" groundColor="#0a0604" intensity={0.3} />

      <pointLight
        ref={fireLight}
        position={[0, 2.5, -2]}
        intensity={2.6}
        color={zoneColors[zone] || '#d4793a'}
        distance={15}
        decay={2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
      />

      {[[-3, 3.5, 0], [3, 3.5, 0], [-3, 3.5, -6], [3, 3.5, -6]].map((pos, i) => (
        <spotLight
          key={i}
          position={pos}
          target-position={[pos[0], 0, pos[2]]}
          angle={0.5}
          penumbra={0.7}
          intensity={3}
          color="#f4a464"
          distance={8}
          castShadow
          shadow-mapSize={[512, 512]}
        />
      ))}

      <directionalLight
        position={[10, 8, 5]}
        intensity={0.1}
        color="#4a6b8a"
        castShadow
        shadow-mapSize={[512, 512]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
    </>
  );
}
