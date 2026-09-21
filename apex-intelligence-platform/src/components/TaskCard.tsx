'use client'

import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'

interface TaskCardProps {
  title: string
  points: number
  onClick?: () => void
  position?: [number, number, number]
}

export function TaskCard({ title, points, onClick, position = [0, 0, 0] }: TaskCardProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  useEffect(() => {
    if (meshRef.current) {
      gsap.fromTo(meshRef.current.scale, 
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 1, z: 1, duration: 0.8, ease: 'back.out(1.7)' }
      )
    }
  }, [])

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1
    }
  })

  const handleClick = () => {
    if (meshRef.current && onClick) {
      gsap.to(meshRef.current.scale, { 
        x: 1.1, y: 1.1, z: 1.1, 
        duration: 0.3, 
        yoyo: true, 
        repeat: 1 
      })
      onClick()
    }
  }

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={handleClick}
    >
      <boxGeometry args={[2, 1.2, 0.1]} />
      <meshStandardMaterial
        color="#6366f1"
        metalness={0.3}
        roughness={0.4}
        emissive="#4f46e5"
        emissiveIntensity={0.2}
      />
    </mesh>
  )
}
