import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useStore } from '../store/useStore';

const HOTSPOT_DATA = [
  { id: 'fireplace', position: [-8.6, 2.5, -7.2], title: 'The Hearth', text: 'Our 150-year-old stone fireplace, restored from the original homestead. The fire is lit every evening at 5pm.' },
  { id: 'kitchen-fire', position: [9.5, 1.9, -6], title: 'Open Fire Kitchen', text: 'Everything cooked over real wood and flame. No gas, no electric — just fire, smoke, and skill.' },
  { id: 'cellar', position: [-9.0, 2.2, 4], title: 'The Cellar', text: '300+ labels, including rarities from Burgundy, Napa, and our private reserve. Ask about the sommelier pairing.' },
  { id: 'chef-table', position: [4, 1.6, -2], title: "Chef's Table", text: 'Six seats at the pass. Watch the kitchen work, course by course, with wine pairings by our sommelier.' },
  { id: 'bar', position: [0, 1.8, 6], title: 'The Bar', text: 'Smoked Old Fashioneds, rare amari, and a marble-top counter that has heard every story in town.' },
  { id: 'art', position: [-9.3, 2.5, 0], title: 'Local Art', text: 'Rotating exhibitions from Bay Area artists. Currently featuring work by Lena Marquez.' }
];

export function Hotspots() {
  return (
    <>
      {HOTSPOT_DATA.map((h) => (
        <Hotspot key={h.id} {...h} />
      ))}
    </>
  );
}

function Hotspot({ position, title, text }) {
  const ring = useRef();
  const [hovered, setHovered] = useState(false);
  const setHotspot = useStore((s) => s.setHotspot);
  const hoverHotspot = useStore((s) => s.hoverHotspot);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ring.current) {
      ring.current.scale.setScalar(1 + Math.sin(t * 2) * 0.2);
      ring.current.material.opacity = 0.5 - Math.sin(t * 2) * 0.3;
    }
  });

  return (
    <group position={position}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.35, 32]} />
        <meshBasicMaterial color="#d4793a" transparent opacity={0.5} side={2} />
      </mesh>

      <mesh
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); hoverHotspot(title); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); hoverHotspot(null); document.body.style.cursor = 'none'; }}
        onClick={(e) => { e.stopPropagation(); setHotspot(title); }}
        scale={hovered ? 1.4 : 1}
      >
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color="#f4a464" />
      </mesh>

      {hovered && (
        <Html position={[0, 0.5, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(10,6,4,0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(212,121,58,0.4)',
            borderRadius: 8,
            padding: '12px 16px',
            minWidth: 200,
            maxWidth: 280,
            color: '#f5f0e8',
            fontFamily: 'Inter, sans-serif',
            fontSize: 12,
            transform: 'translateY(-100%)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}>
            <h4 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: '#d4793a', margin: '0 0 6px 0', fontWeight: 500 }}>{title}</h4>
            <p style={{ margin: 0, lineHeight: 1.5, color: '#a89888' }}>{text}</p>
          </div>
        </Html>
      )}
    </group>
  );
}
