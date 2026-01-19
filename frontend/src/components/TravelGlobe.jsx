import React, { useState, useEffect, useRef, useMemo } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';

const TravelGlobe = ({ events, currentEventIndex, isPlaying, onGlobeClick, onMarkerClick, speed }) => {
  const globeEl = useRef();
  const [airplanePos, setAirplanePos] = useState(null);
  const [sunPos, setSunPos] = useState(null); // { lat, lng }

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
      color: i === currentEventIndex ? ['#00f2ff', '#ffffff'] : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)'],
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

  // Great Circle Interpolation Helper
  const getIntermediatePoint = (lat1, lng1, lat2, lng2, t) => {
    const toRad = (d) => d * Math.PI / 180;
    const toDeg = (r) => r * 180 / Math.PI;

    const φ1 = toRad(lat1);
    const λ1 = toRad(lng1);
    const φ2 = toRad(lat2);
    const λ2 = toRad(lng2);

    // Angular distance
    const d = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin((φ2 - φ1) / 2), 2) + Math.cos(φ1) * Math.cos(φ2) * Math.pow(Math.sin((λ2 - λ1) / 2), 2)));

    if (d === 0) return { lat: lat1, lng: lng1 };

    const A = Math.sin((1 - t) * d) / Math.sin(d);
    const B = Math.sin(t * d) / Math.sin(d);

    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
    const z = A * Math.sin(φ1) + B * Math.sin(φ2);

    const φi = Math.atan2(z, Math.sqrt(x * x + y * y));
    const λi = Math.atan2(y, x);

    return {
      lat: toDeg(φi),
      lng: toDeg(λi)
    };
  };

  // Solar Position Calculator
  const calculateSunPosition = (date) => {
    const now = date || new Date();
    // 1. Calculate Solar Declination (Latitude) - approx based on Day of Year
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const day = Math.floor(diff / oneDay);
    // 23.44 degree axial tilt
    // 81 is roughly the spring equinox offset (March 22)
    const lat = 23.44 * Math.sin(2 * Math.PI * (day - 81) / 365);

    // 2. Calculate Solar Hour Angle (Longitude)
    // Noon UTC = Sun is at 0 deg longitude ?? No.
    // Noon at Greenwich (UTC 12) -> Sun is at 0 deg.
    // So 12 UTC = 0 Long.
    // 18 UTC = -90 Long (90W). 
    // 06 UTC = +90 Long (90E).
    // Formula: (12 - UTC_Hours) * 15 degrees.
    const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
    const lng = (12 - utcHours) * 15;

    return { lat, lng };
  };

  // Setup Lighting Effect
  useEffect(() => {
    if (globeEl.current) {
      // Get Scene
      const scene = globeEl.current.scene();
      
      // Remove default lights if we want full custom control (optional, but good for day/night contrast)
      // Note: react-globe.gl adds lights attached to the camera or scene. 
      // Let's add our SUN.
      
      let sunLight = scene.getObjectByName('SunLight');
      if (!sunLight) {
        sunLight = new THREE.DirectionalLight(0xffffff, 2.0); // Bright Sun
        sunLight.name = 'SunLight';
        scene.add(sunLight);
        
        // Add a bit of ambient light so "Night" isn't PITCH black, just very dark
        const ambient = new THREE.AmbientLight(0x404040, 0.2); // Soft low light
        scene.add(ambient);
      }
    }
  }, []);

  // Update Sun Position
  useEffect(() => {
    if (sunPos && globeEl.current) {
      const scene = globeEl.current.scene();
      const sunLight = scene.getObjectByName('SunLight');
      if (sunLight) {
        // Convert Lat/Lng to Cartesian for the light source
        // Place it far away
        const ALTITUDE = 100; // Far enough
        const phi = (90 - sunPos.lat) * (Math.PI / 180);
        const theta = (sunPos.lng + 180) * (Math.PI / 180);
        
        const x = -(ALTITUDE * Math.sin(phi) * Math.cos(theta));
        const z = (ALTITUDE * Math.sin(phi) * Math.sin(theta));
        const y = (ALTITUDE * Math.cos(phi));
        
        sunLight.position.set(x, y, z);
      }
    }
  }, [sunPos]);


  useEffect(() => {
    if (currentEventIndex >= 0 && currentEventIndex < events.length && isPlaying) {
      const current = events[currentEventIndex];
      let startTime = Date.now();
      const baseDuration = 5000;
      const duration = baseDuration / speed;

      // Base Date from Event
      const startDate = current.start_datetime ? new Date(current.start_datetime) : new Date();

      const updateAirplane = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Calculate Simulated Current Time
        // Total flight approx 10 hours for simulation? Or just assume event moves forward?
        // Let's add 'Progress * 5 Hours' to the start time just to show time movement?
        // Or if we want real-ish time, we assume speed.
        // For visual effect: Let's assume the flight takes 4 hours of "Simulated Time".
        const simulatedTime = new Date(startDate.getTime() + (progress * 4 * 60 * 60 * 1000));
        setSunPos(calculateSunPosition(simulatedTime));

        // Use Great Circle Interpolation for realistic curved path
        const nextPos = getIntermediatePoint(current.from_lat, current.from_lng, current.to_lat, current.to_lng, progress);
        
        const futureProgress = Math.min(progress + 0.01, 1);
        const futurePos = getIntermediatePoint(current.from_lat, current.from_lng, current.to_lat, current.to_lng, futureProgress);

        const heading = getHeading(
          nextPos.lat * Math.PI / 180,
          nextPos.lng * Math.PI / 180,
          futurePos.lat * Math.PI / 180,
          futurePos.lng * Math.PI / 180
        );

        setAirplanePos({ lat: nextPos.lat, lng: nextPos.lng, heading });
        
        if (progress < 1) {
          requestAnimationFrame(updateAirplane);
        } else {
          setAirplanePos(null);
        }
      };
      
      updateAirplane();

      // Camera Animation
      globeEl.current.pointOfView({
        lat: current.from_lat,
        lng: current.from_lng,
        altitude: 2.2
      }, 800);

      setTimeout(() => {
        globeEl.current.pointOfView({
          lat: current.to_lat,
          lng: current.to_lng,
          altitude: 1.5 
        }, 4000);
      }, 1000);
    } else {
      setAirplanePos(null);
      // Default Sun to NOW if idle
      setSunPos(calculateSunPosition(new Date()));
    }
  }, [currentEventIndex, isPlaying, speed, events]); // Added speed and events dependency

  return (
    <Globe
      ref={globeEl}
      globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
      bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
      backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
      
      showAtmosphere={true}
      atmosphereColor="#00f2ff"
      atmosphereAltitude={0.15}
      
      arcsData={arcsData}
      arcColor={d => d.active ? ['#00f2ff', '#ffffff'] : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']} 
      arcDashLength={0.4}
      arcDashGap={0.2}
      arcDashAnimateTime={d => d.active ? 1000 : 3000}
      arcAltitude={d => d.active ? 0.25 : 0.1}
      arcStroke={d => d.active ? 1.0 : 0.3}

      // Radar Beacons on surface
      ringsData={cityClusters.map(c => ({ lat: c.lat, lng: c.lng }))}
      ringColor={() => '#00f2ff'}
      ringMaxRadius={2}
      ringPropagationSpeed={3}
      ringRepeatPeriod={1500}

      // Floating Labels & Airplane
      htmlElementsData={[
        ...(airplanePos ? [{ ...airplanePos, type: 'airplane' }] : []),
        ...cityClusters.map(c => {
          // Visibility Logic:
          // If Playing: Show only FROM and TO cities.
          // If Idle: Show ALL cities.
          const isFrom = events[currentEventIndex]?.from_name === c.name;
          const isTo = events[currentEventIndex]?.to_name === c.name;
          
          const isVisible = isPlaying ? (isFrom || isTo) : true;
          
          if (!isVisible) return null;

          return { 
            lat: c.lat, 
            lng: c.lng, 
            name: c.name, 
            count: c.count,
            type: 'label',
            active: isTo // "To" is active (highlighted)
          };
        }).filter(Boolean)
      ]}
      htmlElement={d => {
        const el = document.createElement('div');
        if (d.type === 'airplane') {
          // Enhanced Sci-Fi Jet SVG
          el.innerHTML = `
            <div style="transform: rotate(${d.heading}deg); transition: transform 0.1s linear; position: relative;">
               <!-- Engine Glow Effect -->
               <div style="
                  position: absolute;
                  bottom: -15px;
                  left: 50%;
                  transform: translateX(-50%);
                  width: 10px;
                  height: 30px;
                  background: linear-gradient(to bottom, rgba(0, 242, 255, 0.8), transparent);
                  border-radius: 5px;
                  filter: blur(4px);
                  z-index: -1;
               "></div>
               
               <!-- Jet Body -->
               <svg width="48" height="48" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 0 10px #00f2ff);">
                  <path d="M256 48L280 160H400L440 200H290L320 360L380 400H320L256 464L192 400H132L192 360L222 200H72L112 160H232L256 48Z" 
                        fill="rgba(10, 20, 40, 0.9)" 
                        stroke="#00f2ff" 
                        stroke-width="15" 
                        stroke-linejoin="round"/>
                  <!-- Cockpit detail -->
                  <path d="M256 100L265 140H247L256 100Z" fill="#00f2ff"/>
               </svg>

               <div style="
                  color: #00f2ff; 
                  font-family: 'Orbitron', sans-serif; 
                  font-size: 10px; 
                  margin-top: -10px; 
                  text-align: center;
                  text-shadow: 0 0 5px #00f2ff;
                  font-weight: bold;
                  letter-spacing: 1px;
               ">
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
