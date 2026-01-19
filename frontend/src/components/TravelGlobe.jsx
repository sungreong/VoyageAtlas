import React, { useState, useEffect, useRef, useMemo } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';

const TravelGlobe = ({ events, currentEventIndex, isPlaying, onGlobeClick, onMarkerClick, speed }) => {
  const globeEl = useRef();
  const [airplanePos, setAirplanePos] = useState(null);

  // Cluster events by destination
  const cityClusters = useMemo(() => {
    const clusters = {};
    events.forEach(e => {
      const key = e.to_name;
      if (!clusters[key]) {
        clusters[key] = { 
          name: e.to_name, 
          lat: e.to_lat, 
          lng: e.to_lng, 
          count: 0,
          events: []
        };
      }
      clusters[key].count += 1;
      clusters[key].events.push(e);
    });
    return Object.values(clusters);
  }, [events]);

  const arcsData = useMemo(() => {
    return events.map((e, i) => ({
      startLat: e.from_lat,
      startLng: e.from_lng,
      endLat: e.to_lat,
      endLng: e.to_lng,
      color: i === currentEventIndex ? ['#00f2ff', '#7000ff'] : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)'],
      active: i === currentEventIndex,
      title: e.title
    }));
  }, [events, currentEventIndex]);

  // Calculate heading between two points
  const getHeading = (phi1, lam1, phi2, lam2) => {
    const y = Math.sin(lam2 - lam1) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) -
              Math.sin(phi1) * Math.cos(phi2) * Math.cos(lam2 - lam1);
    const θ = Math.atan2(y, x);
    return (θ * 180 / Math.PI + 360) % 360;
  };

  useEffect(() => {
    if (currentEventIndex >= 0 && currentEventIndex < events.length && isPlaying) {
      const current = events[currentEventIndex];
      let startTime = Date.now();
      const baseDuration = 5000;
      const duration = baseDuration / speed;

      const updateAirplane = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Linear Interpolation for PoC (Arc interpolation would be even better)
        const lat = current.from_lat + (current.to_lat - current.from_lat) * progress;
        const lng = current.from_lng + (current.to_lng - current.from_lng) * progress;
        
        const heading = getHeading(
          current.from_lat * Math.PI / 180,
          current.from_lng * Math.PI / 180,
          current.to_lat * Math.PI / 180,
          current.to_lng * Math.PI / 180
        );

        setAirplanePos({ lat, lng, heading });
        
        if (progress < 1) {
          requestAnimationFrame(updateAirplane);
        } else {
          setAirplanePos(null);
        }
      };
      
      updateAirplane();

      // Stage 1: Take-off & Stage 2: Cruise
      globeEl.current.pointOfView({
        lat: current.from_lat,
        lng: current.from_lng,
        altitude: 2.2
      }, 800);

      setTimeout(() => {
        globeEl.current.pointOfView({
          lat: current.to_lat,
          lng: current.to_lng,
          altitude: 1.1
        }, 4000);
      }, 1000);
    } else {
      setAirplanePos(null);
    }
  }, [currentEventIndex, isPlaying]);

  return (
    <Globe
      ref={globeEl}
      globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
      bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
      backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
      
      showAtmosphere={true}
      atmosphereColor="#00f2ff"
      atmosphereAltitude={0.15}
      
      arcsData={arcsData}
      arcColor={'color'}
      arcDashLength={0.4}
      arcDashGap={1}
      arcDashAnimateTime={1500}
      arcAltitude={0.3}
      arcStroke={d => d.active ? 0.8 : 0.2}

      // Radar Beacons on surface
      ringsData={cityClusters.map(c => ({ lat: c.lat, lng: c.lng }))}
      ringColor={() => '#00f2ff'}
      ringMaxRadius={2}
      ringPropagationSpeed={3}
      ringRepeatPeriod={1500}

      // Floating Labels & Airplane
      htmlElementsData={[
        ...(airplanePos ? [{ ...airplanePos, type: 'airplane' }] : []),
        ...cityClusters.map(c => ({ 
          lat: c.lat, 
          lng: c.lng, 
          name: c.name, 
          count: c.count,
          type: 'label',
          active: events[currentEventIndex]?.to_name === c.name
        }))
      ]}
      htmlElement={d => {
        const el = document.createElement('div');
        if (d.type === 'airplane') {
          el.innerHTML = `
            <div style="transform: rotate(${d.heading}deg); transition: transform 0.1s linear;">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#00f2ff" stroke-width="2">
                <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3.5s-2.5 0-4 1.5L13.5 8.5 5.3 6.7c-1.1-.3-2.3.4-2.7 1.4-.4 1.1 0 2.3 1 2.8l7.6 3.4-1.8 1.8-3.4-.4c-.6-.1-1.2.2-1.5.7l-.6 1.1c-.2.4-.1.9.3 1.2l3.4 2.5a.7.7 0 0 0 .8 0l2.5-3.4c.3-.4.8-.5 1.2-.3l1.1.6c.5.3.8.9.7 1.5l-.4 3.4c.5.5 1 .9 1.4.3 1.1-.4 1.7-1.6 1.4-2.7z"/>
              </svg>
              <div style="color: #00f2ff; font-family: 'Orbitron', sans-serif; font-size: 10px; margin-top: -5px; text-shadow: 0 0 5px #000;">
                SQ-${700 + Math.floor(Math.random() * 100)}
              </div>
            </div>
          `;
        } else {
          el.innerHTML = `
            <div class="hologram-label ${d.active ? 'active' : ''}" style="pointer-events: auto; cursor: pointer;">
              <div class="hologram-pin"></div>
              <div class="hologram-text">
                ${d.name} ${d.count > 1 ? `<span class="signal-count">x${d.count}</span>` : ''}
              </div>
            </div>
          `;
          el.onclick = () => onMarkerClick && onMarkerClick(d);
        }
        el.style.pointerEvents = d.type === 'airplane' ? 'none' : 'auto';
        return el;
      }}
      
      onGlobeClick={({ lat, lng }) => onGlobeClick && onGlobeClick(lat, lng)}
    />
  );
};

export default TravelGlobe;
