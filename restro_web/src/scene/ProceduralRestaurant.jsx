import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

export function ProceduralRestaurant() {
  return (
    <group>
      <Floor />
      <Ceiling />
      <Walls />
      <DiningTables />
      <Bar />
      <LoungeFurniture />
      <Kitchen />
      <Cellar />
      <Fireplace />
      <Artwork />
      <Plants />
      <Signage />
    </group>
  );
}

/* =============== FLOOR =============== */
function Floor() {
  const floorTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const plankWidth = 64;
    for (let i = 0; i < canvas.width; i += plankWidth) {
      const shade = 40 + Math.random() * 20;
      ctx.fillStyle = `rgb(${shade}, ${shade * 0.6}, ${shade * 0.3})`;
      ctx.fillRect(i, 0, plankWidth - 2, canvas.height);
      for (let j = 0; j < 20; j++) {
        ctx.strokeStyle = `rgba(20, 10, 5, ${Math.random() * 0.3})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(i, Math.random() * canvas.height);
        ctx.lineTo(i + plankWidth - 2, Math.random() * canvas.height);
        ctx.stroke();
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 8);
    return tex;
  }, []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial map={floorTexture} roughness={0.7} metalness={0.1} color="#5a3a20" />
    </mesh>
  );
}

/* =============== CEILING =============== */
function Ceiling() {
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 5, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#1a0e08" roughness={0.9} />
      </mesh>
      {[-8, -4, 0, 4, 8].map((z) => (
        <mesh key={z} position={[0, 4.8, z]} castShadow>
          <boxGeometry args={[20, 0.4, 0.3]} />
          <meshStandardMaterial color="#2a1810" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/* =============== WALLS =============== */
function Walls() {
  const wallMat = <meshStandardMaterial color="#1a0e08" roughness={0.9} />;
  return (
    <group>
      <mesh position={[0, 2.5, -10]} receiveShadow>
        <boxGeometry args={[20, 5, 0.3]} />
        {wallMat}
      </mesh>
      <mesh position={[-8, 2.5, 10]} receiveShadow>
        <boxGeometry args={[4, 5, 0.3]} />
        {wallMat}
      </mesh>
      <mesh position={[8, 2.5, 10]} receiveShadow>
        <boxGeometry args={[4, 5, 0.3]} />
        {wallMat}
      </mesh>
      <mesh position={[0, 4, 10]} receiveShadow>
        <boxGeometry args={[12, 1, 0.3]} />
        {wallMat}
      </mesh>
      <mesh position={[-10, 2.5, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[20, 5, 0.3]} />
        {wallMat}
      </mesh>
      <mesh position={[10, 2.5, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[20, 5, 0.3]} />
        {wallMat}
      </mesh>
      <mesh position={[-9.8, 2.5, -8]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[4, 5, 0.3]} />
        <meshStandardMaterial color="#3a3530" roughness={1} />
      </mesh>
    </group>
  );
}

/* =============== DINING TABLES =============== */
function DiningTables() {
  return (
    <group>
      {[[-4, 0, -2], [4, 0, -2], [-4, 0, -6], [4, 0, -6]].map((pos, i) => (
        <DiningTable key={i} position={pos} />
      ))}
    </group>
  );
}

function DiningTable({ position }) {
  return (
    <group position={position}>
      <RoundedBox args={[1.8, 0.08, 1.8]} radius={0.04} smoothness={4} position={[0, 0.75, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#3a2515" roughness={0.4} metalness={0.1} />
      </RoundedBox>
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.15, 0.75, 16]} />
        <meshStandardMaterial color="#1a0e08" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.03, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 0.05, 32]} />
        <meshStandardMaterial color="#1a0e08" roughness={0.6} />
      </mesh>
      <TableSetting position={[0, 0.8, 0]} />
      {[[-1.1, 0, 0], [1.1, 0, 0], [0, 0, -1.1], [0, 0, 1.1]].map((pos, i) => (
        <Chair key={i} position={pos} rotation={i * Math.PI / 2} />
      ))}
    </group>
  );
}

function TableSetting({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.005, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.01, 32]} />
        <meshStandardMaterial color="#f5f0e8" roughness={0.3} metalness={0.1} />
      </mesh>
      <WineGlass position={[-0.15, 0, 0.1]} />
      <WineGlass position={[0.15, 0, 0.1]} />
      <Cutlery position={[-0.25, 0.01, 0]} />
      <Cutlery position={[0.25, 0.01, 0]} />
      <Candle position={[0, 0.01, -0.2]} />
    </group>
  );
}

function WineGlass({ position }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <coneGeometry args={[0.04, 0.08, 8, 1, true]} />
        <meshPhysicalMaterial color="#8b1a1a" roughness={0.1} transmission={0.9} thickness={0.5} ior={1.5} />
      </mesh>
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.1, 8]} />
        <meshPhysicalMaterial color="#ffffff" roughness={0.1} transmission={0.95} thickness={0.3} />
      </mesh>
    </group>
  );
}

function Cutlery({ position }) {
  return (
    <mesh position={position} castShadow>
      <boxGeometry args={[0.02, 0.005, 0.15]} />
      <meshStandardMaterial color="#c0c0c0" roughness={0.2} metalness={0.9} />
    </mesh>
  );
}

function Candle({ position }) {
  const flame = useRef();
  useFrame((state) => {
    if (flame.current) {
      const t = state.clock.elapsedTime;
      flame.current.scale.set(1 + Math.sin(t * 8) * 0.1, 1 + Math.sin(t * 10) * 0.15, 1 + Math.sin(t * 9) * 0.1);
    }
  });
  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.15, 12]} />
        <meshStandardMaterial color="#f5e6d3" roughness={0.6} />
      </mesh>
      <mesh ref={flame} position={[0, 0.09, 0]}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshBasicMaterial color="#f4a464" />
      </mesh>
    </group>
  );
}

function Chair({ position, rotation }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <RoundedBox args={[0.5, 0.05, 0.5]} radius={0.02} smoothness={3} position={[0, 0.45, 0]} castShadow>
        <meshStandardMaterial color="#2a1810" roughness={0.5} />
      </RoundedBox>
      <RoundedBox args={[0.5, 0.6, 0.05]} radius={0.02} position={[0, 0.75, -0.225]} castShadow>
        <meshStandardMaterial color="#2a1810" roughness={0.5} />
      </RoundedBox>
      {[[-0.2, 0.225, -0.2], [0.2, 0.225, -0.2], [-0.2, 0.225, 0.2], [0.2, 0.225, 0.2]].map((pos, i) => (
        <mesh key={i} position={pos} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.45, 8]} />
          <meshStandardMaterial color="#1a0e08" />
        </mesh>
      ))}
    </group>
  );
}

/* =============== BAR =============== */
function Bar() {
  return (
    <group position={[0, 0, 6]}>
      <RoundedBox args={[8, 1.1, 0.8]} radius={0.02} position={[0, 0.55, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#1a0e08" roughness={0.4} metalness={0.1} />
      </RoundedBox>
      <RoundedBox args={[8.1, 0.05, 0.9]} radius={0.01} position={[0, 1.12, 0]} castShadow>
        <meshStandardMaterial color="#3a2515" roughness={0.3} metalness={0.1} />
      </RoundedBox>
      {Array.from({ length: 20 }).map((_, i) => {
        const x = -3.5 + (i % 10) * 0.7;
        const y = 1.8 + Math.floor(i / 10) * 0.5;
        return (
          <mesh key={i} position={[x, y, -0.3]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.3, 8]} />
            <meshStandardMaterial color={['#4a2a1a', '#1a3a2a', '#2a1a3a', '#3a3a1a'][i % 4]} roughness={0.3} metalness={0.2} />
          </mesh>
        );
      })}
      {[-2.5, -0.8, 0.8, 2.5].map((x, i) => (
        <BarStool key={i} position={[x, 0, 1.2]} />
      ))}
    </group>
  );
}

function BarStool({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.25, 0.05, 16]} />
        <meshStandardMaterial color="#1a0e08" />
      </mesh>
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.7, 8]} />
        <meshStandardMaterial color="#1a0e08" />
      </mesh>
      <mesh position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.25, 0.05, 16]} />
        <meshStandardMaterial color="#0a0604" />
      </mesh>
    </group>
  );
}

/* =============== FIREPLACE =============== */
function Fireplace() {
  const fireGroup = useRef();
  useFrame((state) => {
    if (fireGroup.current) {
      const t = state.clock.elapsedTime;
      fireGroup.current.children.forEach((particle, i) => {
        particle.position.y += 0.005;
        particle.position.x += Math.sin(t * 3 + i) * 0.001;
        particle.position.z += Math.cos(t * 2 + i) * 0.001;
        particle.material.opacity = Math.max(0, 1 - (particle.position.y - 1.5) * 2);
        if (particle.position.y > 2.5) {
          particle.position.y = 1.5;
          particle.position.x = (Math.random() - 0.5) * 0.4;
          particle.position.z = (Math.random() - 0.5) * 0.2;
        }
      });
    }
  });

  return (
    <group position={[-9.7, 0, -8]}>
      <mesh position={[0, 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.5, 4, 1.2]} />
        <meshStandardMaterial color="#2a2520" roughness={1} />
      </mesh>
      <mesh position={[0.3, 1.5, 0.6]} castShadow>
        <boxGeometry args={[2, 2, 0.5]} />
        <meshStandardMaterial color="#0a0604" />
      </mesh>
      <RoundedBox args={[3.8, 0.2, 1.5]} radius={0.02} position={[0, 4, 0]} castShadow>
        <meshStandardMaterial color="#3a2515" roughness={0.5} />
      </RoundedBox>
      <group position={[0.3, 0.6, 0.6]}>
        <mesh rotation={[0, 0, 0.3]} castShadow>
          <cylinderGeometry args={[0.1, 0.1, 1.2, 8]} />
          <meshStandardMaterial color="#1a0a05" roughness={1} />
        </mesh>
        <mesh rotation={[0, 0, -0.2]} position={[0.05, 0.15, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.1, 1.2, 8]} />
          <meshStandardMaterial color="#1a0a05" roughness={1} />
        </mesh>
      </group>
      <group ref={fireGroup} position={[0.3, 1.5, 0.6]}>
        {Array.from({ length: 20 }).map((_, i) => (
          <mesh key={i} position={[(Math.random() - 0.5) * 0.4, Math.random() * 1, (Math.random() - 0.5) * 0.2]}>
            <sphereGeometry args={[0.04 + Math.random() * 0.04, 6, 6]} />
            <meshBasicMaterial color={i % 2 ? '#f4a464' : '#d4793a'} transparent opacity={0.8} />
          </mesh>
        ))}
      </group>
      <pointLight position={[0.3, 2, 1]} intensity={3} color="#d4793a" distance={12} decay={1.5} castShadow />
    </group>
  );
}

/* =============== KITCHEN =============== */
function Kitchen() {
  return (
    <group position={[9.5, 0, -6]}>
      <RoundedBox args={[0.9, 1.1, 4]} radius={0.02} position={[0, 0.55, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#2a2520" roughness={0.4} metalness={0.3} />
      </RoundedBox>
      <RoundedBox args={[1, 0.05, 4.1]} radius={0.01} position={[0, 1.12, 0]}>
        <meshStandardMaterial color="#c0c0c0" roughness={0.3} metalness={0.9} />
      </RoundedBox>
      <group position={[0, 1.2, -1.5]}>
        <mesh>
          <boxGeometry args={[0.7, 0.05, 0.7]} />
          <meshStandardMaterial color="#0a0604" roughness={0.9} />
        </mesh>
        <pointLight position={[0, 0.3, 0]} intensity={1.5} color="#ff6b35" distance={3} />
        <mesh position={[0, 0.2, 0]}>
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshBasicMaterial color="#ff6b35" transparent opacity={0.4} />
        </mesh>
      </group>
      {[-1, 0, 1].map((x, i) => (
        <group key={i} position={[x, 3, 0]}>
          <mesh castShadow>
            <torusGeometry args={[0.15, 0.02, 8, 16]} />
            <meshStandardMaterial color="#1a0e08" />
          </mesh>
          <mesh position={[0, -0.3, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.18, 0.3, 16]} />
            <meshStandardMaterial color="#404040" roughness={0.3} metalness={0.9} />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.005, 0.005, 0.4, 8]} />
            <meshStandardMaterial color="#1a0e08" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 3.5, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 2, 8]} />
        <meshStandardMaterial color="#1a0e08" />
      </mesh>
    </group>
  );
}

/* =============== CELLAR =============== */
function Cellar() {
  return (
    <group position={[-9.5, 0, 4]}>
      <mesh position={[0.4, 1.8, -0.4]} castShadow>
        <boxGeometry args={[0.8, 3.6, 2.6]} />
        <meshStandardMaterial color="#1a0e08" />
      </mesh>
      {Array.from({ length: 24 }).map((_, i) => {
        const row = Math.floor(i / 4);
        const col = i % 4;
        return (
          <group key={i} position={[0.4, 0.3 + row * 0.5, -1.5 + col * 0.8]}>
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.05, 0.05, 0.4, 12]} />
              <meshStandardMaterial color="#1a0a05" roughness={0.3} metalness={0.2} />
            </mesh>
            <mesh position={[0.22, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.02, 0.05, 0.1, 8]} />
              <meshStandardMaterial color="#0a0604" />
            </mesh>
            <mesh position={[0, 0, 0.05]}>
              <planeGeometry args={[0.15, 0.1]} />
              <meshStandardMaterial color="#f5e6d3" />
            </mesh>
          </group>
        );
      })}
      <pointLight position={[0, 3, 0]} intensity={0.5} color="#d4793a" distance={4} />
    </group>
  );
}

/* =============== LOUNGE =============== */
function LoungeFurniture() {
  return (
    <group position={[0, 0, 3]}>
      <group position={[-5, 0, 0]}>
        <RoundedBox args={[2, 0.5, 0.8]} radius={0.05} position={[0, 0.4, 0]} castShadow>
          <meshStandardMaterial color="#3a2515" roughness={0.8} />
        </RoundedBox>
        <RoundedBox args={[2, 0.6, 0.15]} radius={0.05} position={[0, 0.7, -0.35]} castShadow>
          <meshStandardMaterial color="#3a2515" roughness={0.8} />
        </RoundedBox>
      </group>
      <mesh position={[-5, 0.3, 0.8]} castShadow>
        <boxGeometry args={[1, 0.05, 0.6]} />
        <meshStandardMaterial color="#1a0e08" roughness={0.3} />
      </mesh>
      <mesh position={[-5, 0.15, 0.8]}>
        <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
        <meshStandardMaterial color="#1a0e08" />
      </mesh>
      {[-6, -4].map((x, i) => (
        <group key={i} position={[x, 0, 2]}>
          <RoundedBox args={[0.8, 0.5, 0.8]} radius={0.05} position={[0, 0.3, 0]} castShadow>
            <meshStandardMaterial color="#5a3a1a" roughness={0.8} />
          </RoundedBox>
          <RoundedBox args={[0.8, 0.6, 0.15]} radius={0.05} position={[0, 0.6, -0.35]} castShadow>
            <meshStandardMaterial color="#5a3a1a" roughness={0.8} />
          </RoundedBox>
        </group>
      ))}
    </group>
  );
}

/* =============== PLANTS =============== */
function Plants() {
  return (
    <group>
      {[{ p: [-8, 0, 8], s: 1 }, { p: [8, 0, 8], s: 0.8 }, { p: [-8, 0, -3], s: 1.2 }, { p: [8, 0, -3], s: 0.9 }].map((plant, i) => (
        <group key={i} position={plant.p} scale={plant.s}>
          <mesh position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.25, 0.4, 16]} />
            <meshStandardMaterial color="#3a2515" />
          </mesh>
          {Array.from({ length: 8 }).map((_, j) => (
            <mesh
              key={j}
              position={[Math.cos((j / 8) * Math.PI * 2) * 0.2, 0.6 + Math.random() * 0.4, Math.sin((j / 8) * Math.PI * 2) * 0.2]}
              castShadow
            >
              <sphereGeometry args={[0.15 + Math.random() * 0.1, 6, 6]} />
              <meshStandardMaterial color="#1a3a1a" roughness={0.8} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/* =============== ARTWORK =============== */
function Artwork() {
  return (
    <group>
      {[
        { p: [-9.7, 2.5, 0], r: [0, Math.PI / 2, 0], c: '#3a2515' },
        { p: [-9.7, 2.5, 4], r: [0, Math.PI / 2, 0], c: '#2a3a2a' },
        { p: [-9.7, 2.5, -4], r: [0, Math.PI / 2, 0], c: '#3a2a1a' },
        { p: [0, 3, -9.85], r: [0, 0, 0], c: '#4a3525' }
      ].map((art, i) => (
        <group key={i} position={art.p} rotation={art.r}>
          <mesh>
            <boxGeometry args={[1.5, 2, 0.05]} />
            <meshStandardMaterial color={art.c} />
          </mesh>
          <mesh position={[0, 0, 0.03]}>
            <planeGeometry args={[1.3, 1.8]} />
            <meshStandardMaterial color="#f5e6d3" />
          </mesh>
          <mesh position={[-0.3, 0.3, 0.05]}>
            <circleGeometry args={[0.2, 16]} />
            <meshStandardMaterial color="#d4793a" />
          </mesh>
          <mesh position={[0.2, -0.2, 0.05]}>
            <circleGeometry args={[0.15, 16]} />
            <meshStandardMaterial color="#1a3a2a" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* =============== SIGNAGE =============== */
function Signage() {
  const signTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0a0604';
    ctx.fillRect(0, 0, 1024, 256);
    ctx.strokeStyle = '#d4793a';
    ctx.lineWidth = 6;
    ctx.strokeRect(12, 12, 1000, 232);
    ctx.font = '500 110px Georgia, serif';
    ctx.fillStyle = '#d4793a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EMBER & OAK', 512, 128);
    const tex = new THREE.CanvasTexture(canvas);
    if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  return (
    <mesh position={[0, 4.2, -9.8]}>
      <planeGeometry args={[4, 1]} />
      <meshBasicMaterial map={signTexture} toneMapped={false} />
    </mesh>
  );
}
