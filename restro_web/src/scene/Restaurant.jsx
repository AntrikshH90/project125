import React, { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { useStore } from '../store/useStore';
import { Lighting } from './Lighting';
import { Particles } from './Particles';
import { CameraRig } from './CameraRig';
import { Hotspots } from './Hotspots';
import { ProceduralRestaurant } from './ProceduralRestaurant';

export function Scene() {
  const { camera } = useThree();
  const currentZone = useStore((s) => s.currentZone);
  const setLoaded = useStore((s) => s.setLoaded);

  useEffect(() => {
    camera.position.set(0, 1.7, 8);
  }, [camera]);

  return (
    <>
      <Environment preset="night" environmentIntensity={0.25} background={false} />
      <Lighting zone={currentZone} />
      <ProceduralRestaurant />
      <Particles />
      <Hotspots />
      <CameraRig />
      <EffectComposer multisampling={0}>
        <Bloom intensity={0.7} luminanceThreshold={0.72} luminanceSmoothing={0.3} mipmapBlur />
        <Vignette eskil={false} offset={0.12} darkness={0.72} />
      </EffectComposer>
    </>
  );
}
