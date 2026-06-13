import React, { useEffect, useRef, useState } from 'react';
import { Compass, LocateFixed } from 'lucide-react';
import './ContinentNavigator.css';

const CONTINENT_TARGETS = [
  { id: 'asia', label: 'Asia', ko: '아시아', lat: 34, lng: 100, tone: 'emerald' },
  { id: 'europe', label: 'Europe', ko: '유럽', lat: 52, lng: 15, tone: 'gold' },
  { id: 'africa', label: 'Africa', ko: '아프리카', lat: 3, lng: 20, tone: 'sun' },
  { id: 'north-america', label: 'N. America', ko: '북미', lat: 44, lng: -102, tone: 'cyan' },
  { id: 'south-america', label: 'S. America', ko: '남미', lat: -16, lng: -60, tone: 'rose' },
  { id: 'oceania', label: 'Oceania', ko: '오세아니아', lat: -25, lng: 135, tone: 'violet' }
];

const getNearestLongitude = (targetLng, referenceLng) => {
  if (!Number.isFinite(referenceLng)) return targetLng;

  let nearest = targetLng;
  while (nearest - referenceLng > 180) nearest -= 360;
  while (nearest - referenceLng < -180) nearest += 360;
  return nearest;
};

const ContinentNavigator = ({ referenceLng, onNavigate }) => {
  const [activeTargetId, setActiveTargetId] = useState('');
  const lastLongitudeRef = useRef(null);
  const activeTimerRef = useRef(null);

  useEffect(() => () => clearTimeout(activeTimerRef.current), []);

  const handleNavigate = (target) => {
    const reference = lastLongitudeRef.current ?? Number(referenceLng);
    const lng = getNearestLongitude(target.lng, reference);
    lastLongitudeRef.current = lng;
    setActiveTargetId(target.id);
    clearTimeout(activeTimerRef.current);
    activeTimerRef.current = setTimeout(() => setActiveTargetId(''), 1800);
    onNavigate?.({
      lat: target.lat,
      lng,
      altitude: target.id === 'oceania' ? 1.42 : 1.34,
      duration: 1450
    });
  };

  return (
    <section className="continent-navigator glass-panel hud-font" aria-label="Continent quick navigation">
      <div className="continent-nav-header">
        <span><Compass size={13} /> Continent jump</span>
        <strong>대륙 이동</strong>
      </div>
      <div className="continent-nav-grid">
        {CONTINENT_TARGETS.map((target) => (
          <button
            key={target.id}
            type="button"
            className={`continent-jump ${target.tone} ${activeTargetId === target.id ? 'active' : ''}`}
            onClick={() => handleNavigate(target)}
            title={`${target.ko}로 지구본 이동`}
          >
            <LocateFixed size={14} />
            <span>{target.ko}</span>
            <small>{target.label}</small>
          </button>
        ))}
      </div>
    </section>
  );
};

export default ContinentNavigator;
