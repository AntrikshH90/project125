'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Float } from '@react-three/drei'
import * as THREE from 'three'

interface PointsCounterProps {
  points: number
  position?: [number, number, number]
}

export function PointsCounter({ points, position = [0, 0, 0] }: PointsCounterProps) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.2
    }
  })

  return (
    <Float speed={2} rotationIntensity={0.3} floatIntensity={0.3}>
      <group ref={groupRef} position={position}>
        {/* 3D Coin Stack */}
        {Array.from({ length: Math.min(5, Math.floor(points / 100) + 1) }).map((_, i) => (
          <mesh key={i} position={[0, i * 0.15, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.05, 32]} />
            <meshStandardMaterial
              color="#fbbf24"
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>
        ))}
        {/* Points Text */}
        <Text
          position={[0, 1, 0]}
          fontSize={0.3}
          color="#fbbf24"
          anchorX="center"
          anchorY="middle"
        >
          {points}
        </Text>
      </group>
    </Float>
  )
}
