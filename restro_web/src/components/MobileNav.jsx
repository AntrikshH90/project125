import React from 'react';
import { useStore } from '../store/useStore';

const ZONES = [
  { id: 'entrance', icon: '🚪', label: 'Entrance' },
  { id: 'lounge', icon: '🍷', label: 'Lounge' },
  { id: 'dining', icon: '🍽️', label: 'Dining' },
  { id: 'kitchen', icon: '🔥', label: 'Kitchen' },
  { id: 'cellar', icon: '🍾', label: 'Cellar' },
  { id: 'patio', icon: '🌿', label: 'Patio' }
];

export function MobileNav() {
  const currentZone = useStore((s) => s.currentZone);
  const setZone = useStore((s) => s.setZone);
  const discoveredZones = useStore((s) => s.discoveredZones);

  return (
    <div className="mobile-nav">
      {ZONES.map((zone) => (
        <button
          key={zone.id}
          className={`mobile-nav-item ${currentZone === zone.id ? 'active' : ''} ${discoveredZones.has(zone.id) ? 'discovered' : ''}`}
          onClick={() => setZone(zone.id)}
          aria-label={zone.label}
        >
          <span className="mobile-nav-icon">{zone.icon}</span>
          <span className="mobile-nav-label">{zone.label}</span>
        </button>
      ))}
    </div>
  );
}
