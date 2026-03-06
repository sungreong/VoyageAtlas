import React, { useState, useEffect, useRef, useMemo } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';
import {
  calculateFlightPhase,
  calculateAltitude,
  calculateBankAngle,
  calculatePitch,
  calculateSpeed,
  getGreatCircleDistance,
  FlightPhase
} from '../utils/flightPhysics';

const TravelGlobe = ({ events, currentEventIndex, isPlaying, onGlobeClick, onMarkerClick, speed, freeCameraMode, forcedCamera }) => {
  const globeEl = useRef();
  // ...

  // Handle Forced Camera (Map Sync)
  useEffect(() => {
    if (forcedCamera && globeEl.current) {
       globeEl.current.pointOfView({
          lat: forcedCamera.lat,
          lng: forcedCamera.lng,
          altitude: forcedCamera.altitude || 1.5
       }, forcedCamera.duration || 1000);
    }
  }, [forcedCamera]);

  const [airplanePos, setAirplanePos] = useState(null);
  const [sunPos, setSunPos] = useState(null); // { lat, lng }
  const [contrailParticles, setContrailParticles] = useState([]); // Contrail trail particles

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

      // Calculate flight distance for physics scaling
      const distance = getGreatCircleDistance(
        current.from_lat, current.from_lng,
        current.to_lat, current.to_lng
      );

      let startTime = Date.now();
      // Scale duration with distance - longer flights take more time to visualize
      const baseDuration = Math.max(5000, Math.min(distance * 0.8, 12000));
      const duration = baseDuration / speed;

      // Base Date from Event
      const startDate = current.start_datetime ? new Date(current.start_datetime) : new Date();

      let previousHeading = null;

      const updateAirplane = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Calculate flight physics parameters
        const phase = calculateFlightPhase(progress);
        const altitude = calculateAltitude(progress, distance);
        const speedMultiplier = calculateSpeed(progress, 1.0);

        // Calculate Simulated Current Time (4 hours of flight simulation)
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

        // Calculate banking angle based on heading change
        const bank = previousHeading !== null
          ? calculateBankAngle(heading, previousHeading, speedMultiplier)
          : 0;

        // Calculate pitch angle based on flight phase
        const pitch = calculatePitch(progress, phase);

        previousHeading = heading;

        setAirplanePos({
          lat: nextPos.lat,
          lng: nextPos.lng,
          altitude,
          heading,
          bank,
          pitch,
          phase
        });

        // Spawn contrail particles during cruise phase
        if (phase === FlightPhase.CRUISE && Math.random() < 0.35) {
          setContrailParticles(prev => [
            ...prev,
            {
              id: Date.now() + Math.random(),
              lat: nextPos.lat,
              lng: nextPos.lng,
              alt: altitude - 0.015, // Slightly below aircraft
              createdAt: Date.now(),
              opacity: 1.0
            }
          ].slice(-60)); // Keep last 60 particles for performance
        }

        if (progress < 1) {
          requestAnimationFrame(updateAirplane);
        } else {
          setAirplanePos(null);
          // Clear contrails when flight ends
          setTimeout(() => setContrailParticles([]), 500);
        }
      };

      updateAirplane();

      // Camera Animation - only auto-follow if NOT in free camera mode
      if (!freeCameraMode) {
        const initialCameraAlt = distance > 3000 ? 2.5 : 2.2;
        const finalCameraAlt = distance > 3000 ? 1.8 : 1.5;

        globeEl.current.pointOfView({
          lat: current.from_lat,
          lng: current.from_lng,
          altitude: initialCameraAlt
        }, 800);

        setTimeout(() => {
          globeEl.current.pointOfView({
            lat: current.to_lat,
            lng: current.to_lng,
            altitude: finalCameraAlt
          }, 4000);
        }, 1000);
      }
      // If freeCameraMode === true, camera stays wherever user positioned it
    } else {
      setAirplanePos(null);
      setContrailParticles([]);
      // Default Sun to NOW if idle
      setSunPos(calculateSunPosition(new Date()));
    }
  }, [currentEventIndex, isPlaying, speed, events, freeCameraMode]); // Added speed, events, and freeCameraMode dependency

  // Smooth transition when exiting free camera mode
  useEffect(() => {
    if (!freeCameraMode && isPlaying && currentEventIndex >= 0 && currentEventIndex < events.length) {
      // Gently return to auto-follow position when re-locking camera
      const current = events[currentEventIndex];
      if (current && globeEl.current) {
        globeEl.current.pointOfView({
          lat: (current.from_lat + current.to_lat) / 2,  // Midpoint between origin and destination
          lng: (current.from_lng + current.to_lng) / 2,
          altitude: 2.0
        }, 1500);  // Smooth 1.5s transition
      }
    }
  }, [freeCameraMode, events, currentEventIndex, isPlaying]);

  // Contrail particle fade-out effect
  useEffect(() => {
    const interval = setInterval(() => {
      setContrailParticles(prev =>
        prev
          .filter(p => Date.now() - p.createdAt < 7000) // Remove particles older than 7 seconds
          .map(p => ({
            ...p,
            opacity: Math.max(0, 1.0 - ((Date.now() - p.createdAt) / 7000)) // Fade out over 7 seconds
          }))
      );
    }, 150); // Update every 150ms for smooth fade

    return () => clearInterval(interval);
  }, []);

  // Handle Window Resize
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Globe
      ref={globeEl}
      width={dimensions.width}
      height={dimensions.height}
      globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
      bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
      backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
      
      showAtmosphere={true}
      atmosphereColor="#00f2ff"
      atmosphereAltitude={0.15}
      
      arcsData={arcsData}
      arcColor={d => d.active ? ['#00f2ff', '#ffffff'] : ['rgba(0, 242, 255, 0.3)', 'rgba(0, 242, 255, 0.1)']} 
      arcDashLength={0.4}
      arcDashGap={0.2}
      arcDashAnimateTime={d => d.active ? 1000 : 5000}
      arcAltitude={d => d.active ? 0.25 : 0.1}
      arcStroke={d => d.active ? 1.0 : 0.5}

      // Radar Beacons on surface
      ringsData={cityClusters.map(c => ({ lat: c.lat, lng: c.lng }))}
      ringColor={() => '#00f2ff'}
      ringMaxRadius={2}
      ringPropagationSpeed={3}
      ringRepeatPeriod={1500}

      // Floating Labels, Airplane & Contrails
      htmlElementsData={[
        ...(airplanePos ? [{ ...airplanePos, type: 'airplane' }] : []),
        ...contrailParticles.map(p => ({ ...p, type: 'contrail' })),
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
          // Calculate pseudo-3D transforms based on physics
          const bank = d.bank || 0;
          const pitch = d.pitch || 0;
          const altitude = d.altitude || 0.2;
          const phase = d.phase || 'CRUISE';

          // Scale aircraft based on altitude (higher = appears smaller/further)
          const scale = 1.0 + (altitude * 0.6);

          // Pseudo-3D rotation - simulate banking with rotateY
          // Positive bank = right wing down = rotateY positive
          const bankTransform = `rotateY(${bank}deg)`;

          // Pitch affects vertical skew slightly
          const pitchSkew = pitch * 0.3; // Subtle skew effect

          // Engine glow intensity varies by phase
          const engineGlowIntensity = phase === 'TAKEOFF' || phase === 'CLIMB' ? 1.0 : 0.6;
          const engineGlowHeight = phase === 'TAKEOFF' ? 40 : 30;

          // Shadow depth based on altitude
          const shadowBlur = 5 + altitude * 15;
          const shadowOffset = 2 + altitude * 8;

          // Enhanced Sci-Fi Jet SVG with Physics
          el.innerHTML = `
            <div style="
              transform: rotate(${d.heading || 0}deg) ${bankTransform} scale(${scale});
              transform-style: preserve-3d;
              transition: transform 0.2s linear;
              position: relative;
              perspective: 1000px;
              width: 120px;
              height: 120px;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
               <!-- Engine Glow Effect (varies by phase) -->
               <div style="
                  position: absolute;
                  bottom: ${-engineGlowHeight}px;
                  left: 50%;
                  transform: translateX(-50%) skewY(${pitchSkew}deg);
                  width: 12px;
                  height: ${engineGlowHeight}px;
                  background: linear-gradient(to bottom, rgba(0, 242, 255, ${engineGlowIntensity}), transparent);
                  border-radius: 6px;
                  filter: blur(5px);
                  z-index: -1;
                  opacity: ${engineGlowIntensity};
               "></div>

               <!-- Modern Passenger Jet SVG -->
               <svg width="110" height="110" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg"
                    style="
                      filter: drop-shadow(0 ${shadowOffset}px ${shadowBlur}px rgba(0, 0, 0, 0.6)) drop-shadow(0 0 15px #00f2ff);
                      transform: rotate(180deg) skewY(${pitchSkew}deg);
                    ">
                  <!-- Fuselage body (white/silver gradient) -->
                  <ellipse cx="256" cy="256" rx="25" ry="140"
                           fill="url(#fuselageGradient)"
                           stroke="#88ccee"
                           stroke-width="3"/>

                  <!-- Main wings (swept back design) -->
                  <path d="M 180 256 Q 120 240 80 200 L 95 210 Q 130 240 180 250 Z"
                        fill="url(#wingGradient)"
                        stroke="#00f2ff"
                        stroke-width="2"/>
                  <path d="M 332 256 Q 392 240 432 200 L 417 210 Q 382 240 332 250 Z"
                        fill="url(#wingGradient)"
                        stroke="#00f2ff"
                        stroke-width="2"/>

                  <!-- Tail wings (horizontal stabilizers) -->
                  <path d="M 240 110 L 200 90 L 210 100 L 245 115 Z"
                        fill="url(#wingGradient)"
                        stroke="#00f2ff"
                        stroke-width="2"/>
                  <path d="M 272 110 L 312 90 L 302 100 L 267 115 Z"
                        fill="url(#wingGradient)"
                        stroke="#00f2ff"
                        stroke-width="2"/>

                  <!-- Vertical stabilizer (tail fin) -->
                  <path d="M 246 80 L 256 40 L 266 80 L 256 90 Z"
                        fill="url(#tailGradient)"
                        stroke="#00f2ff"
                        stroke-width="2.5"/>

                  <!-- Engines (under wings) -->
                  <ellipse cx="160" cy="270" rx="12" ry="25"
                           fill="url(#engineGradient)"
                           stroke="#00d4ff"
                           stroke-width="2"/>
                  <ellipse cx="352" cy="270" rx="12" ry="25"
                           fill="url(#engineGradient)"
                           stroke="#00d4ff"
                           stroke-width="2"/>

                  <!-- Engine intakes (glowing) -->
                  <ellipse cx="160" cy="285" rx="8" ry="12" fill="#0088ff" opacity="0.8"/>
                  <ellipse cx="352" cy="285" rx="8" ry="12" fill="#0088ff" opacity="0.8"/>

                  <!-- Cockpit windows -->
                  <ellipse cx="256" cy="130" rx="10" ry="15" fill="#00f2ff" opacity="0.9"/>
                  <ellipse cx="256" cy="150" rx="8" ry="10" fill="#00d4ff" opacity="0.7"/>

                  <!-- Passenger windows (row of lights) -->
                  <circle cx="256" cy="200" r="3" fill="#ffcc00" opacity="0.8"/>
                  <circle cx="256" cy="220" r="3" fill="#ffcc00" opacity="0.8"/>
                  <circle cx="256" cy="240" r="3" fill="#ffcc00" opacity="0.8"/>
                  <circle cx="256" cy="260" r="3" fill="#ffcc00" opacity="0.8"/>
                  <circle cx="256" cy="280" r="3" fill="#ffcc00" opacity="0.8"/>
                  <circle cx="256" cy="300" r="3" fill="#ffcc00" opacity="0.8"/>
                  <circle cx="256" cy="320" r="3" fill="#ffcc00" opacity="0.8"/>

                  <!-- Wing position lights (red/green) -->
                  <circle cx="85" cy="205" r="4" fill="#ff0000" opacity="${Math.abs(bank) / 40 + 0.6}"/>
                  <circle cx="427" cy="205" r="4" fill="#00ff00" opacity="${Math.abs(bank) / 40 + 0.6}"/>

                  <!-- Fuselage stripe (airline livery) -->
                  <path d="M 240 180 Q 230 256 240 330"
                        stroke="#00f2ff"
                        stroke-width="2"
                        fill="none"
                        opacity="0.6"/>
                  <path d="M 272 180 Q 282 256 272 330"
                        stroke="#00f2ff"
                        stroke-width="2"
                        fill="none"
                        opacity="0.6"/>

                  <!-- Gradient Definitions -->
                  <defs>
                    <linearGradient id="fuselageGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" style="stop-color:#e0e8f0;stop-opacity:1" />
                      <stop offset="50%" style="stop-color:#ffffff;stop-opacity:1" />
                      <stop offset="100%" style="stop-color:#d0dae5;stop-opacity:1" />
                    </linearGradient>

                    <linearGradient id="wingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style="stop-color:#f0f4f8;stop-opacity:1" />
                      <stop offset="100%" style="stop-color:#c8d6e5;stop-opacity:1" />
                    </linearGradient>

                    <linearGradient id="tailGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style="stop-color:#00f2ff;stop-opacity:0.9" />
                      <stop offset="50%" style="stop-color:#0099cc;stop-opacity:0.8" />
                      <stop offset="100%" style="stop-color:#006699;stop-opacity:0.7" />
                    </linearGradient>

                    <radialGradient id="engineGradient">
                      <stop offset="0%" style="stop-color:#2a3f5f;stop-opacity:1" />
                      <stop offset="100%" style="stop-color:#0a1428;stop-opacity:1" />
                    </radialGradient>
                  </defs>
               </svg>

               <!-- Flight number with phase indicator -->
               <div style="
                  color: #00f2ff;
                  font-family: 'Orbitron', sans-serif;
                  font-size: 11px;
                  margin-top: -5px;
                  text-align: center;
                  text-shadow: 0 0 8px #00f2ff;
                  font-weight: bold;
                  letter-spacing: 0.8px;
                  opacity: 0.95;
               ">
                 ${phase === 'TAKEOFF' ? '✈️↗' : phase === 'APPROACH' ? '✈️↘' : '✈️'}
               </div>
            </div>
          `;
        } else if (d.type === 'contrail') {
          // Contrail particle rendering
          el.innerHTML = `
            <div style="
              width: 45px;
              height: 3px;
              background: linear-gradient(90deg,
                transparent,
                rgba(255, 255, 255, ${d.opacity * 0.5}),
                transparent);
              pointer-events: none;
              border-radius: 2px;
              box-shadow: 0 0 4px rgba(255, 255, 255, ${d.opacity * 0.3});
            "></div>
          `;
          el.style.pointerEvents = 'none';
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
        el.style.pointerEvents = d.type === 'airplane' || d.type === 'contrail' ? 'none' : 'auto';
        return el;
      }}

      htmlAltitude={d => {
        if (d.type === 'airplane') return d.altitude || 0.2;
        if (d.type === 'contrail') return d.alt || 0.18;
        return 0; // City labels at surface
      }}

      onGlobeClick={({ lat, lng }) => onGlobeClick && onGlobeClick(lat, lng)}
    />
  );
};

export default TravelGlobe;
