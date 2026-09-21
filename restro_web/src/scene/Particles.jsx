import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function Particles() {
  const embers = useRef();
  const dust = useRef();

  const emberGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const count = 200;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = Math.random() * 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
      velocities[i * 3] = (Math.random() - 0.5) * 0.002;
      velocities[i * 3 + 1] = 0.005 + Math.random() * 0.01;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.002;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.userData.velocities = velocities;
    return geo;
  }, []);

  const dustGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const count = 300;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = Math.random() * 4.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (embers.current) {
      const positions = embers.current.geometry.attributes.position.array;
      const velocities = embers.current.geometry.userData.velocities;
      for (let i = 0; i < positions.length / 3; i++) {
        positions[i * 3] += velocities[i * 3] + Math.sin(t + i) * 0.001;
        positions[i * 3 + 1] += velocities[i * 3 + 1];
        positions[i * 3 + 2] += velocities[i * 3 + 2] + Math.cos(t + i) * 0.001;
        if (positions[i * 3 + 1] > 6) {
          positions[i * 3] = (Math.random() - 0.5) * 20;
          positions[i * 3 + 1] = 0;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
        }
      }
      embers.current.geometry.attributes.position.needsUpdate = true;
    }
    if (dust.current) {
      dust.current.rotation.y = t * 0.01;
    }
  });

  return (
    <>
      <points ref={embers} geometry={emberGeometry}>
        <pointsMaterial
          size={0.04}
          color="#f4a464"
          transparent
          opacity={0.6}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <points ref={dust} geometry={dustGeometry}>
        <pointsMaterial
          size={0.015}
          color="#a89888"
          transparent
          opacity={0.3}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </>
  );
}
