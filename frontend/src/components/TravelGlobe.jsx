import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';
import './TravelGlobe.css';
import {
  DEFAULT_GLOBE_VISUAL,
  getGlobeTheme,
  getMarkerStyle,
  getRouteStyle
} from '../config/globeThemes';
import { createVehicleObject, updateVehicleObject } from '../utils/globeVehicleObjects';
import { buildVisitedDestinationIndex, getWorldHighlightMarkers } from '../utils/worldHighlightLayer';
import { buildVisitedCityClusters } from '../utils/globeCityClusters';
import {
  createScreenHudSprite,
  disposeScreenHudSprite,
  drawRouteHud,
  drawStarshipHud,
  positionScreenHudSprite
} from '../utils/simulationCanvasHud';
import {
  calculateFlightPhase,
  calculateAltitude,
  calculateBankAngle,
  calculatePitch,
  calculateSpeed,
  getGreatCircleDistance,
  calculateCameraAltitude
} from '../utils/flightPhysics';

const OVERVIEW_LABEL_LIMIT = 48;
const SIMULATION_FRAME_INTERVAL_MS = 1000 / 30;
const SUN_UPDATE_INTERVAL_MS = 250;
const AERIAL_LANDING_APPROACH_KM = 180;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

const TRANSPORT_LABELS = {
  plane: 'Flight',
  starship: 'Starship',
  ship: 'Voyage',
  train: 'Rail',
  ground: 'Drive',
  ufo: 'UFO',
  hero: 'Hero',
  comet: 'Comet'
};

const normalizeTransport = (event, fallbackMode = 'plane') => {
  const selectedMode = String(fallbackMode || 'plane').toLowerCase();
  const raw = selectedMode !== 'plane' ? selectedMode : String(event?.transport || selectedMode).toLowerCase();

  if (['plane', 'flight', 'air', 'airplane'].includes(raw)) return 'plane';
  if (['starship', 'rocket', 'spacecraft', 'spaceship'].includes(raw)) return 'starship';
  if (['ship', 'boat', 'ferry', 'cruise'].includes(raw)) return 'ship';
  if (['train', 'rail'].includes(raw)) return 'train';
  if (['car', 'bus', 'drive', 'road'].includes(raw)) return 'ground';
  return raw === 'ufo' || raw === 'hero' || raw === 'comet' ? raw : 'plane';
};

const getTransportToneKey = (transport) => (transport === 'train' || transport === 'ground' ? 'ground' : transport);

const getRouteColors = (theme, transport, active, ghostOpacity, secondaryScale = 0.58) => {
  const tone = theme.routes?.[getTransportToneKey(transport)] || theme.routes?.plane;
  if (!tone) return active ? ['#9ecfc6', '#ffe2a8'] : [`rgba(158, 207, 198, ${ghostOpacity})`, `rgba(220, 236, 184, ${ghostOpacity * secondaryScale})`];
  if (active) return tone.active;
  return [
    `rgba(${tone.inactive[0]}, ${ghostOpacity})`,
    `rgba(${tone.inactive[1]}, ${ghostOpacity * secondaryScale})`
  ];
};

const hexToRgba = (hex, alpha) => {
  const clean = String(hex || '').replace('#', '');
  if (clean.length !== 6) return `rgba(158, 207, 198, ${alpha})`;
  const value = parseInt(clean, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const formatRouteDate = (dateValue) => {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
};

const getAerialCameraAltitude = (distance, progress = 0.5, landingProgress = 0) => {
  const cruiseAltitude = distance < 350
    ? 0.42
    : distance < 1200
      ? 0.52
      : distance < 3000
        ? 0.68
        : 0.86;
  const landingAltitude = distance < 350
    ? 0.32
    : distance < 1200
      ? 0.38
      : distance < 3000
        ? 0.5
        : 0.64;
  const terminalLift = progress < 0.12 || progress > 0.88 ? 0.08 : 0;
  return cruiseAltitude + terminalLift + (landingAltitude - cruiseAltitude) * landingProgress;
};

const clamp01 = (value) => Math.max(0, Math.min(1, value));

const applyRouteStyle = (visual, active, routeStyle) => ({
  ...visual,
  dashLength: active
    ? routeStyle.activeDashLength
    : visual.dashLength * routeStyle.inactiveDashLengthScale,
  dashGap: active
    ? routeStyle.activeDashGap
    : visual.dashGap * routeStyle.inactiveDashGapScale,
  dashTime: visual.dashTime * routeStyle.dashTimeScale,
  altitude: visual.altitude * routeStyle.altitudeScale,
  stroke: Math.max(0.16, visual.stroke * (active ? routeStyle.activeStrokeScale : routeStyle.inactiveStrokeScale))
});

const getTransportVisual = (event, active, focusMode, fallbackMode = 'plane', visualConfig = DEFAULT_GLOBE_VISUAL) => {
  const transport = normalizeTransport(event, fallbackMode);
  const theme = getGlobeTheme(visualConfig.themeId);
  const routeStyle = getRouteStyle(visualConfig.routeStyleId);
  const ghostOpacity = focusMode ? 0.16 : 0.24;
  const base = {
    transport,
    arcColor: getRouteColors(theme, transport, active, ghostOpacity),
    dashLength: active ? 0.42 : 0.22,
    dashGap: active ? 0.16 : 0.34,
    dashTime: active ? 1050 : 5400,
    altitude: active ? 0.25 : 0.08,
    stroke: active ? 1.2 : 0.35,
    ringColor: active ? theme.activeMarker : hexToRgba(theme.marker, 0.42),
    ringMaxRadius: active ? 3.2 : 1.2,
    ringSpeed: active ? 4 : 1.8,
    ringPeriod: active ? 900 : 2400
  };

  if (transport === 'ship') {
    return applyRouteStyle({
      ...base,
      arcColor: getRouteColors(theme, transport, active, ghostOpacity, 0.72),
      dashLength: active ? 0.24 : 0.16,
      dashGap: active ? 0.32 : 0.42,
      dashTime: active ? 2600 : 7200,
      altitude: active ? 0.09 : 0.035,
      stroke: active ? 1.05 : 0.32,
      ringColor: active ? theme.activeMarker : hexToRgba(theme.marker, 0.36),
      ringMaxRadius: active ? 3.8 : 1.6,
      ringSpeed: active ? 2.1 : 1.1,
      ringPeriod: active ? 1500 : 3000
    }, active, routeStyle);
  }

  if (transport === 'starship') {
    return applyRouteStyle({
      ...base,
      arcColor: getRouteColors(theme, transport, active, ghostOpacity, 0.62),
      dashLength: active ? 0.34 : 0.18,
      dashGap: active ? 0.18 : 0.36,
      dashTime: active ? 820 : 5200,
      altitude: active ? 0.32 : 0.11,
      stroke: active ? 1.18 : 0.34,
      ringColor: active ? theme.activeMarker : hexToRgba(theme.marker, 0.36),
      ringMaxRadius: active ? 3.5 : 1.4,
      ringSpeed: active ? 4.4 : 1.8,
      ringPeriod: active ? 820 : 2400
    }, active, routeStyle);
  }

  if (transport === 'train' || transport === 'ground') {
    return applyRouteStyle({
      ...base,
      arcColor: getRouteColors(theme, transport, active, ghostOpacity, 0.52),
      dashLength: active ? 0.2 : 0.12,
      dashGap: active ? 0.24 : 0.38,
      dashTime: active ? 1900 : 6200,
      altitude: active ? 0.055 : 0.026,
      stroke: active ? 0.95 : 0.3,
      ringColor: active ? theme.activeMarker : hexToRgba(theme.marker, 0.34),
      ringMaxRadius: active ? 2.4 : 1,
      ringSpeed: active ? 2.5 : 1.3,
      ringPeriod: active ? 1300 : 2800
    }, active, routeStyle);
  }

  return applyRouteStyle(base, active, routeStyle);
};

const getHeading = (phi1, lam1, phi2, lam2) => {
  const y = Math.sin(lam2 - lam1) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) -
            Math.sin(phi1) * Math.cos(phi2) * Math.cos(lam2 - lam1);
  const theta = Math.atan2(y, x);
  return (theta * RAD_TO_DEG + 360) % 360;
};

const createGreatCircleInterpolator = (lat1, lng1, lat2, lng2) => {
  const phi1 = lat1 * DEG_TO_RAD;
  const lambda1 = lng1 * DEG_TO_RAD;
  const phi2 = lat2 * DEG_TO_RAD;
  const lambda2 = lng2 * DEG_TO_RAD;
  const sinPhiDelta = Math.sin((phi2 - phi1) / 2);
  const sinLambdaDelta = Math.sin((lambda2 - lambda1) / 2);
  const d = 2 * Math.asin(Math.sqrt(
    sinPhiDelta * sinPhiDelta +
    Math.cos(phi1) * Math.cos(phi2) * sinLambdaDelta * sinLambdaDelta
  ));
  const sinD = Math.sin(d);

  if (d === 0 || sinD === 0) {
    return () => ({ lat: lat1, lng: lng1 });
  }

  const cosPhi1 = Math.cos(phi1);
  const cosPhi2 = Math.cos(phi2);
  const sinPhi1 = Math.sin(phi1);
  const sinPhi2 = Math.sin(phi2);
  const cosLambda1 = Math.cos(lambda1);
  const sinLambda1 = Math.sin(lambda1);
  const cosLambda2 = Math.cos(lambda2);
  const sinLambda2 = Math.sin(lambda2);

  return (t) => {
    const a = Math.sin((1 - t) * d) / sinD;
    const b = Math.sin(t * d) / sinD;

    const x = a * cosPhi1 * cosLambda1 + b * cosPhi2 * cosLambda2;
    const y = a * cosPhi1 * sinLambda1 + b * cosPhi2 * sinLambda2;
    const z = a * sinPhi1 + b * sinPhi2;

    return {
      lat: Math.atan2(z, Math.sqrt(x * x + y * y)) * RAD_TO_DEG,
      lng: Math.atan2(y, x) * RAD_TO_DEG
    };
  };
};

const calculateSunPosition = (date) => {
  const now = date || new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const day = Math.floor(diff / oneDay);
  const lat = 23.44 * Math.sin(2 * Math.PI * (day - 81) / 365);
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
  const lng = (12 - utcHours) * 15;

  return { lat, lng };
};

const TravelGlobe = forwardRef(({ events, currentEventIndex, isPlaying, onGlobeClick, onMarkerClick, onWorldHighlightClick, speed, vehicleMode, freeCameraMode, forcedCamera, globeVisual, recordingActive, recordingViewMode }, ref) => {
  const globeEl = useRef();
  const cameraTimerRefs = useRef([]);
  const animationFrameRef = useRef(null);
  const travelerTextureCacheRef = useRef(new Map());
  const recordingHudRef = useRef({ frame: null, routeSprite: null, routeKey: null, starshipSprite: null });
  const recordingHudDataRef = useRef(null);
  const lastSimulationFrameRef = useRef(0);
  const lastSunUpdateRef = useRef(0);
  const visualConfig = useMemo(() => ({
    ...DEFAULT_GLOBE_VISUAL,
    ...(globeVisual || {})
  }), [globeVisual]);
  const globeTheme = useMemo(() => getGlobeTheme(visualConfig.themeId), [visualConfig.themeId]);
  const routeStyle = useMemo(() => getRouteStyle(visualConfig.routeStyleId), [visualConfig.routeStyleId]);
  const markerStyle = useMemo(() => getMarkerStyle(visualConfig.markerStyleId), [visualConfig.markerStyleId]);
  const markerVisualKey = `${visualConfig.themeId}:${visualConfig.markerStyleId}`;

  useImperativeHandle(ref, () => ({
    getRecordingCanvas: () => {
      const renderer = globeEl.current?.renderer?.();
      return renderer?.domElement || document.querySelector('.app-container canvas');
    }
  }), []);

  const clearCameraTimers = () => {
    cameraTimerRefs.current.forEach(timerId => clearTimeout(timerId));
    cameraTimerRefs.current = [];
  };

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

  const currentEvent = events[currentEventIndex];
  const isFlightFocusMode = isPlaying && Boolean(currentEvent);

  const cityClusters = useMemo(() => {
    return buildVisitedCityClusters(events);
  }, [events]);

  const arcsData = useMemo(() => {
    return events.map((e, i) => {
      const active = i === currentEventIndex;
      const visual = getTransportVisual(e, active, isFlightFocusMode, vehicleMode, visualConfig);

      return {
        startLat: Number(e.from_lat),
        startLng: Number(e.from_lng),
        endLat: Number(e.to_lat),
        endLng: Number(e.to_lng),
        color: visual.arcColor,
        active,
        focusMode: isFlightFocusMode,
        transport: visual.transport,
        visual,
        title: e.title
      };
    }).filter(Boolean).filter(e =>
      Number.isFinite(e.startLat) &&
      Number.isFinite(e.startLng) &&
      Number.isFinite(e.endLat) &&
      Number.isFinite(e.endLng)
    );
  }, [events, currentEventIndex, isFlightFocusMode, vehicleMode, visualConfig]);

  const focusRouteCities = useMemo(() => {
    if (!currentEvent) return [];

    return [
      {
        name: currentEvent.from_name,
        lat: Number(currentEvent.from_lat),
        lng: Number(currentEvent.from_lng),
        routeRole: 'origin'
      },
      {
        name: currentEvent.to_name,
        lat: Number(currentEvent.to_lat),
        lng: Number(currentEvent.to_lng),
        routeRole: 'destination'
      }
    ].filter(c =>
      c.name &&
      Number.isFinite(c.lat) &&
      Number.isFinite(c.lng)
    );
  }, [currentEvent]);

  const labelCityMarkers = useMemo(() => {
    if (!isFlightFocusMode) {
      const priorityNames = new Set([
        currentEvent?.from_name,
        currentEvent?.to_name
      ].filter(Boolean));

      const priorityCities = cityClusters.filter(city => priorityNames.has(city.name));
      const remainingCities = cityClusters
        .filter(city => !priorityNames.has(city.name))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

      return [...priorityCities, ...remainingCities].slice(0, OVERVIEW_LABEL_LIMIT);
    }

    return focusRouteCities.map(routeCity => {
      const cluster = cityClusters.find(c => c.name === routeCity.name);
      return {
        ...routeCity,
        count: cluster?.count ?? 1,
        events: cluster?.events ?? []
      };
    });
  }, [cityClusters, currentEvent?.from_name, currentEvent?.to_name, focusRouteCities, isFlightFocusMode]);

  const labelsData = useMemo(() => {
    return labelCityMarkers
      .filter(c => Number.isFinite(Number(c.lat)) && Number.isFinite(Number(c.lng)))
      .map(c => {
        const active = currentEvent?.to_name === c.name;
        return {
          ...c,
          lat: Number(c.lat),
          lng: Number(c.lng),
          active,
          focusMode: isFlightFocusMode,
          visualKey: markerVisualKey,
          label: isFlightFocusMode ? c.name : `${c.name}${c.count > 1 ? ` x${c.count}` : ''}`
        };
      });
  }, [labelCityMarkers, currentEvent, isFlightFocusMode, markerVisualKey]);

  const visitedDestinationIndex = useMemo(() => buildVisitedDestinationIndex(events), [events]);

  const worldHighlightMarkers = useMemo(() => {
    return getWorldHighlightMarkers({
      isFlightFocusMode,
      markerStyle,
      visualConfig,
      visitedDestinationIndex
    });
  }, [isFlightFocusMode, markerStyle, visitedDestinationIndex, visualConfig]);

  const recordingHudData = useMemo(() => {
    if (!recordingActive || !isFlightFocusMode || !currentEvent) return null;

    const fromLat = Number(currentEvent.from_lat);
    const fromLng = Number(currentEvent.from_lng);
    const toLat = Number(currentEvent.to_lat);
    const toLng = Number(currentEvent.to_lng);
    if (![fromLat, fromLng, toLat, toLng].every(Number.isFinite)) return null;

    const progress = Math.max(0, Math.min(1, Number(airplanePos?.progress ?? 0)));
    const transport = normalizeTransport(currentEvent, vehicleMode);
    const transportLabel = TRANSPORT_LABELS[transport] || TRANSPORT_LABELS.plane;
    const dateLabel = formatRouteDate(currentEvent.start_datetime || currentEvent.date);
    const route = {
      fromName: currentEvent.from_name,
      toName: currentEvent.to_name,
      transportLabel,
      dateLabel,
      key: [currentEvent.id ?? currentEventIndex, currentEvent.from_name, currentEvent.to_name, dateLabel, transportLabel].join(':')
    };

    if (transport !== 'starship') return { route, starship: null };

    const distance = getGreatCircleDistance(fromLat, fromLng, toLat, toLng);
    const boostCurve = Math.max(0, 1 - progress / 0.34);
    const entryCurve = Math.max(0, (progress - 0.72) / 0.28);
    const arcLift = Math.sin(progress * Math.PI);
    const headingRadians = Number.isFinite(Number(airplanePos?.heading))
      ? Number(airplanePos.heading) * DEG_TO_RAD
      : 0;

    return {
      route,
      starship: {
        progress,
        currentLat: Number(airplanePos?.lat || fromLat),
        currentLng: Number(airplanePos?.lng || fromLng),
        headingRadians,
        speedKmh: (2200 + distance * 0.1 + boostCurve * 5100 - entryCurve * 1700) * speed,
        altitudeKm: 22 + arcLift * 70 + progress * 14,
        lox: Math.max(0.18, 1 - progress * 0.62),
        ch4: Math.max(0.12, 1 - progress * 0.58),
        throttle: Math.max(0.12, 0.9 - progress * 0.32 + boostCurve * 0.24 + entryCurve * 0.18)
      }
    };
  }, [airplanePos, currentEvent, currentEventIndex, isFlightFocusMode, recordingActive, speed, vehicleMode]);

  useEffect(() => {
    recordingHudDataRef.current = recordingHudData;
  }, [recordingHudData]);

  const toGlobeVector = useCallback((lat, lng, altitude = 0, globeRadius = 100) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (90 - lng) * (Math.PI / 180);
    const radius = globeRadius * (1 + altitude);
    const phiSin = Math.sin(phi);

    return new THREE.Vector3(
      radius * phiSin * Math.cos(theta),
      radius * Math.cos(phi),
      radius * phiSin * Math.sin(theta)
    );
  }, []);

  const createLabelSprite = useCallback((label, globeRadius) => {
    const text = label.label || label.name || '';
    const active = Boolean(label.active);
    const focusMode = Boolean(label.focusMode);
    const worldHighlight = label.type === 'world-highlight';
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const fontSize = Math.round((worldHighlight ? focusMode ? 12 : 13 : active ? 23 : focusMode ? 17 : 18) * markerStyle.labelScale);
    const paddingX = worldHighlight ? 10 : active ? 18 : focusMode ? 12 : 13;
    const paddingY = worldHighlight ? 6 : active ? 10 : focusMode ? 7 : 8;
    const dotSize = worldHighlight ? 7 : active ? 14 : focusMode ? 8 : 10;

    const measureCanvas = document.createElement('canvas');
    const measureCtx = measureCanvas.getContext('2d');
    measureCtx.font = `700 ${fontSize}px "Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
    const textWidth = Math.ceil(measureCtx.measureText(text).width);
    const width = Math.max(worldHighlight ? 68 : 72, textWidth + paddingX * 2 + dotSize + (worldHighlight ? 8 : 10));
    const height = fontSize + paddingY * 2;

    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(width * pixelRatio);
    canvas.height = Math.ceil(height * pixelRatio);

    const ctx = canvas.getContext('2d');
    ctx.scale(pixelRatio, pixelRatio);
    ctx.font = `700 ${fontSize}px "Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
    ctx.textBaseline = 'middle';

    ctx.fillStyle = worldHighlight ? 'rgba(24, 22, 15, 0.48)' : active ? globeTheme.activeLabelFill : globeTheme.labelFill;
    ctx.strokeStyle = worldHighlight ? 'rgba(255, 226, 168, 0.38)' : active ? globeTheme.activeLabelStroke : globeTheme.labelStroke;
    ctx.lineWidth = 2;
    if (worldHighlight) ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.roundRect(1, 1, width - 2, height - 2, worldHighlight ? 12 : 9);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = worldHighlight ? 'rgba(255, 226, 168, 0.22)' : active ? globeTheme.activeMarker : globeTheme.marker;
    ctx.strokeStyle = worldHighlight ? 'rgba(255, 226, 168, 0.82)' : ctx.fillStyle;
    ctx.lineWidth = worldHighlight ? 2 : 1;
    ctx.beginPath();
    ctx.arc(paddingX, height / 2, dotSize / 2, 0, Math.PI * 2);
    if (worldHighlight) ctx.stroke();
    else ctx.fill();

    ctx.fillStyle = worldHighlight ? 'rgba(255, 244, 205, 0.78)' : active ? globeTheme.activeLabelText : globeTheme.labelText;
    ctx.fillText(text, paddingX + dotSize + 9, height / 2 + 1);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: true,
      depthWrite: false
    });

    const sprite = new THREE.Sprite(material);
    const spriteHeight = (worldHighlight ? focusMode ? 1.58 : 1.75 : active ? 3.9 : focusMode ? 2.35 : 2.55) * markerStyle.labelScale;
    sprite.scale.set((width / height) * spriteHeight, spriteHeight, 1);
    sprite.position.copy(toGlobeVector(label.lat, label.lng, worldHighlight ? 0.024 : active ? 0.035 : focusMode ? 0.012 : 0.018, globeRadius));
    sprite.renderOrder = worldHighlight ? 5 : active ? 18 : focusMode ? 16 : 4;
    sprite.userData = label;

    return sprite;
  }, [globeTheme, markerStyle.labelScale, toGlobeVector]);

  const createGlobeSprite = useCallback((item, globeRadius) => {
    if (item.type === 'vehicle') {
      return createVehicleObject(item, globeRadius, toGlobeVector, travelerTextureCacheRef);
    }
    return createLabelSprite(item, globeRadius);
  }, [createLabelSprite, toGlobeVector]);

  const updateGlobeSprite = useCallback((obj, item, globeRadius) => {
    if (!obj || !item) return;

    if (item.type === 'vehicle') {
      updateVehicleObject(obj, item, globeRadius, toGlobeVector, travelerTextureCacheRef);
      return;
    }

    if (obj.userData?.visualKey !== item.visualKey || obj.userData?.label !== item.label) {
      const fresh = createLabelSprite(item, globeRadius);
      obj.material?.map?.dispose(); obj.material?.dispose();
      obj.material = fresh.material; obj.scale.copy(fresh.scale); obj.renderOrder = fresh.renderOrder;
    }
    obj.position.copy(toGlobeVector(Number(item.lat), Number(item.lng), item.active ? 0.035 : item.focusMode ? 0.012 : 0.018, globeRadius));
    obj.userData = item;
  }, [createLabelSprite, toGlobeVector]);

  const customLayerData = useMemo(() => {
    const remainingAerialKm = airplanePos && currentEvent
      ? getGreatCircleDistance(
          Number(airplanePos.lat),
          Number(airplanePos.lng),
          Number(currentEvent.to_lat),
          Number(currentEvent.to_lng)
        )
      : Infinity;
    const landingProgress = recordingActive && recordingViewMode === 'aerial'
      ? Math.max(
          clamp01((Number(airplanePos?.progress || 0) - 0.68) / 0.32),
          clamp01(1 - (remainingAerialKm / AERIAL_LANDING_APPROACH_KM))
        )
      : 0;
    const vehicleData = airplanePos
      ? [{
          ...airplanePos,
          lat: Number(airplanePos.lat),
          lng: Number(airplanePos.lng),
          landingProgress,
          vehicleMode: normalizeTransport(null, vehicleMode),
          routeFromName: currentEvent?.from_name,
          routeToName: currentEvent?.to_name,
          vehicleLift: routeStyle.vehicleLift,
          type: 'vehicle'
        }]
      : [];

    return [...worldHighlightMarkers, ...labelsData, ...vehicleData];
  }, [airplanePos, currentEvent, labelsData, recordingActive, recordingViewMode, routeStyle.vehicleLift, vehicleMode, worldHighlightMarkers]);

  const ringsData = useMemo(() => {
    const cityRings = cityClusters.map(c => {
      const active = currentEvent?.to_name === c.name;
      const currentLegVisual = getTransportVisual(currentEvent, active, isFlightFocusMode, vehicleMode, visualConfig);

      return {
        lat: c.lat,
        lng: c.lng,
        active,
        focusMode: isFlightFocusMode,
        routeRole: c.routeRole,
        transport: currentLegVisual.transport,
        visual: currentLegVisual
      };
    });

    const worldHighlightRings = worldHighlightMarkers.map(destination => ({
      lat: destination.lat,
      lng: destination.lng,
      focusMode: isFlightFocusMode,
      worldHighlight: true
    }));

    return [...worldHighlightRings, ...cityRings];
  }, [cityClusters, currentEvent, isFlightFocusMode, vehicleMode, visualConfig, worldHighlightMarkers]);

  const applySunPosition = useCallback((sunPosition) => {
    if (!sunPosition || !globeEl.current) return;

    const scene = globeEl.current.scene();
    const sunLight = scene.getObjectByName('SunLight');
    if (!sunLight) return;

    const ALTITUDE = 100;
    const phi = (90 - sunPosition.lat) * (Math.PI / 180);
    const theta = (sunPosition.lng + 180) * (Math.PI / 180);

    const x = -(ALTITUDE * Math.sin(phi) * Math.cos(theta));
    const z = ALTITUDE * Math.sin(phi) * Math.sin(theta);
    const y = ALTITUDE * Math.cos(phi);

    sunLight.position.set(x, y, z);
  }, []);

  // Setup Lighting Effect
  useEffect(() => {
    if (globeEl.current) {
      const scene = globeEl.current.scene();
      let sunLight = scene.getObjectByName('SunLight');
      if (!sunLight) {
        sunLight = new THREE.DirectionalLight(0xffffff, globeTheme.sunIntensity);
        sunLight.name = 'SunLight';
        scene.add(sunLight);
      } else {
        sunLight.intensity = globeTheme.sunIntensity;
      }

      let ambient = scene.getObjectByName('VoyageAmbientLight');
      if (!ambient) {
        ambient = new THREE.AmbientLight(0x404040, globeTheme.ambientIntensity);
        ambient.name = 'VoyageAmbientLight';
        scene.add(ambient);
      } else {
        ambient.intensity = globeTheme.ambientIntensity;
      }

      applySunPosition(calculateSunPosition(new Date()));
    }
  }, [applySunPosition, globeTheme.ambientIntensity, globeTheme.sunIntensity]);


  useEffect(() => {
    clearCameraTimers();
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (currentEventIndex >= 0 && currentEventIndex < events.length && isPlaying && currentEvent) {
      const current = currentEvent;
      const fromLat = Number(current.from_lat);
      const fromLng = Number(current.from_lng);
      const toLat = Number(current.to_lat);
      const toLng = Number(current.to_lng);

      if (![fromLat, fromLng, toLat, toLng].every(Number.isFinite)) {
        setAirplanePos(null);
        return undefined;
      }

      // Calculate flight distance for physics scaling
      const distance = getGreatCircleDistance(fromLat, fromLng, toLat, toLng);
      const interpolateRoute = createGreatCircleInterpolator(fromLat, fromLng, toLat, toLng);

      let startTime = performance.now();
      lastSimulationFrameRef.current = 0;
      lastSunUpdateRef.current = 0;
      // Scale duration with distance - longer flights take more time to visualize
      const baseDuration = Math.max(5000, Math.min(distance * 0.8, 12000));
      const duration = baseDuration / speed;
      const useAerialRecordingView = recordingActive && recordingViewMode === 'aerial' && !freeCameraMode;

      // Base Date from Event
      const startDate = current.start_datetime ? new Date(current.start_datetime) : new Date();

      let previousHeading = null;

      const updateAirplane = (frameTime = performance.now()) => {
        const elapsed = frameTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        if (
          progress < 1 &&
          frameTime - lastSimulationFrameRef.current < SIMULATION_FRAME_INTERVAL_MS
        ) {
          animationFrameRef.current = requestAnimationFrame(updateAirplane);
          return;
        }

        lastSimulationFrameRef.current = frameTime;

        // Calculate flight physics parameters
        const phase = calculateFlightPhase(progress);
        const altitude = calculateAltitude(progress, distance);
        const speedMultiplier = calculateSpeed(progress, 1.0);

        // Calculate Simulated Current Time (4 hours of flight simulation)
        if (
          progress === 1 ||
          frameTime - lastSunUpdateRef.current >= SUN_UPDATE_INTERVAL_MS
        ) {
          const simulatedTime = new Date(startDate.getTime() + (progress * 4 * 60 * 60 * 1000));
          applySunPosition(calculateSunPosition(simulatedTime));
          lastSunUpdateRef.current = frameTime;
        }

        // Use Great Circle Interpolation for realistic curved path
        const nextPos = interpolateRoute(progress);

        const futureProgress = Math.min(progress + 0.01, 1);
        const futurePos = interpolateRoute(futureProgress);

        const heading = getHeading(
          nextPos.lat * DEG_TO_RAD,
          nextPos.lng * DEG_TO_RAD,
          futurePos.lat * DEG_TO_RAD,
          futurePos.lng * DEG_TO_RAD
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
          targetLat: futurePos.lat,
          targetLng: futurePos.lng,
          altitude,
          heading,
          bank,
          pitch,
          phase,
          progress
        });

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(updateAirplane);
        } else {
          setAirplanePos(null);
        }
      };

      updateAirplane();

      // Camera Animation - only auto-follow if NOT in free camera mode
      if (!freeCameraMode && globeEl.current) {
        // Calculate optimal altitudes based on flight distance
        const initialCameraAlt = calculateCameraAltitude(distance, 'start');
        const finalCameraAlt = calculateCameraAltitude(distance, 'end');

        // Calculate arc midpoint for better framing
        const midpointLat = (fromLat + toLat) / 2;
        const midpointLng = (fromLng + toLng) / 2;
        const midpointAlt = initialCameraAlt * 1.15; // Slightly zoom out at midpoint to see full arc

        if (useAerialRecordingView) {
          const approachAnchor = interpolateRoute(0.68);
          const approachAltitude = getAerialCameraAltitude(distance, 0.45, 0) + 0.16;
          const landingAltitude = getAerialCameraAltitude(distance, 0.92, 1);
          const settleDelay = Math.min(1100, Math.max(520, duration * 0.16));
          const landingDuration = Math.min(3600, Math.max(1800, duration * 0.52));

          globeEl.current.pointOfView({
            lat: approachAnchor.lat,
            lng: approachAnchor.lng,
            altitude: approachAltitude
          }, 760);

          const landingCameraTimer = setTimeout(() => {
            globeEl.current?.pointOfView({
              lat: toLat,
              lng: toLng,
              altitude: landingAltitude
            }, landingDuration);
          }, settleDelay);
          cameraTimerRefs.current.push(landingCameraTimer);
        } else {
          // 3-phase camera movement: from → midpoint → to
          // Phase 1: Move to origin city
          globeEl.current.pointOfView({
            lat: fromLat,
            lng: fromLng,
            altitude: initialCameraAlt
          }, 800);

          // Phase 2: Pan to arc midpoint (shows full flight path)
          const midpointTimer = setTimeout(() => {
            globeEl.current?.pointOfView({
              lat: midpointLat,
              lng: midpointLng,
              altitude: midpointAlt
            }, 2000); // 2 seconds to reach midpoint
          }, 1000);
          cameraTimerRefs.current.push(midpointTimer);

          // Phase 3: Continue to destination
          const destinationTimer = setTimeout(() => {
            globeEl.current?.pointOfView({
              lat: toLat,
              lng: toLng,
              altitude: finalCameraAlt
            }, 2000); // 2 seconds from midpoint to destination
          }, 3000); // Start after reaching midpoint
          cameraTimerRefs.current.push(destinationTimer);
        }
      }
      // If freeCameraMode === true, camera stays wherever user positioned it
    } else {
      setAirplanePos(null);
      // Default Sun to NOW if idle
      applySunPosition(calculateSunPosition(new Date()));
    }
    return () => {
      clearCameraTimers();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [currentEventIndex, isPlaying, speed, events, currentEvent, freeCameraMode, applySunPosition, recordingActive, recordingViewMode]); // Added speed, events, and freeCameraMode dependency

  // Smooth transition when exiting free camera mode
  useEffect(() => {
    if (!freeCameraMode && isPlaying && currentEventIndex >= 0 && currentEventIndex < events.length) {
      // Gently return to auto-follow position when re-locking camera
      const current = currentEvent;
      if (current && globeEl.current) {
        // Calculate distance for optimal altitude
        const distance = getGreatCircleDistance(
          current.from_lat, current.from_lng,
          current.to_lat, current.to_lng
        );
        const optimalAlt = calculateCameraAltitude(distance, 'start');

        globeEl.current.pointOfView({
          lat: (current.from_lat + current.to_lat) / 2,  // Midpoint between origin and destination
          lng: (current.from_lng + current.to_lng) / 2,
          altitude: optimalAlt * 1.15  // Slightly higher to see arc
        }, 1500);  // Smooth 1.5s transition
      }
    }
  }, [freeCameraMode, events, currentEvent, currentEventIndex, isPlaying]);

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

  useEffect(() => {
    let disposed = false;
    const hud = recordingHudRef.current;

    const removeRouteSprite = () => {
      disposeScreenHudSprite(hud.routeSprite);
      hud.routeSprite = null;
      hud.routeKey = null;
    };

    const removeStarshipSprite = () => {
      disposeScreenHudSprite(hud.starshipSprite);
      hud.starshipSprite = null;
    };

    const ensureRouteSprite = (scene) => {
      if (!hud.routeSprite) {
        hud.routeSprite = createScreenHudSprite(360, 96);
        scene.add(hud.routeSprite);
      } else if (!hud.routeSprite.parent) {
        scene.add(hud.routeSprite);
      }
      return hud.routeSprite;
    };

    const ensureStarshipSprite = (scene) => {
      if (!hud.starshipSprite) {
        hud.starshipSprite = createScreenHudSprite(460, 220);
        scene.add(hud.starshipSprite);
      } else if (!hud.starshipSprite.parent) {
        scene.add(hud.starshipSprite);
      }
      return hud.starshipSprite;
    };

    const updateHud = () => {
      const scene = globeEl.current?.scene?.();
      const camera = globeEl.current?.camera?.();
      const data = recordingHudDataRef.current;

      if (!scene || !camera || !data?.route) {
        removeRouteSprite();
        removeStarshipSprite();
      } else {
        const routeSprite = ensureRouteSprite(scene);
        if (hud.routeKey !== data.route.key) {
          drawRouteHud(routeSprite, data.route);
          hud.routeKey = data.route.key;
        }
        positionScreenHudSprite(routeSprite, camera, dimensions, { x: 0.5, y: 0.79 }, 96);

        if (data.starship && dimensions.width >= 1080) {
          const starshipSprite = ensureStarshipSprite(scene);
          drawStarshipHud(starshipSprite, data.starship);
          positionScreenHudSprite(starshipSprite, camera, dimensions, { x: 0.69, y: 0.47 }, 220);
        } else {
          removeStarshipSprite();
        }
      }

      if (!disposed) hud.frame = requestAnimationFrame(updateHud);
    };

    updateHud();

    return () => {
      disposed = true;
      if (hud.frame) cancelAnimationFrame(hud.frame);
      removeRouteSprite();
      removeStarshipSprite();
    };
  }, [dimensions]);

  return (
    <Globe
      ref={globeEl}
      width={dimensions.width}
      height={dimensions.height}
      globeImageUrl={globeTheme.globeImageUrl}
      bumpImageUrl={globeTheme.bumpImageUrl}
      backgroundImageUrl={globeTheme.backgroundImageUrl}
      
      showAtmosphere={true}
      atmosphereColor={globeTheme.atmosphereColor}
      atmosphereAltitude={globeTheme.atmosphereAltitude}
      
      arcsData={arcsData}
      arcColor={d => d.visual?.arcColor || d.color}
      arcDashLength={d => d.visual?.dashLength ?? 0.3}
      arcDashGap={d => d.visual?.dashGap ?? 0.3}
      arcDashAnimateTime={d => d.visual?.dashTime ?? 5000}
      arcAltitude={d => d.visual?.altitude ?? 0.1}
      arcStroke={d => d.visual?.stroke ?? 0.35}
      ringsData={ringsData}
      ringColor={d => d.worldHighlight ? `rgba(255, 226, 168, ${d.focusMode ? 0.16 : 0.34})` : d.active ? d.visual?.ringColor || globeTheme.activeMarker : d.focusMode ? hexToRgba(globeTheme.marker, 0.24) : hexToRgba(globeTheme.marker, 0.58)}
      ringMaxRadius={d => d.worldHighlight ? (d.focusMode ? 0.52 : 0.92) * markerStyle.inactiveRingScale : (d.active ? d.visual?.ringMaxRadius || 3.2 : d.focusMode ? 0.65 : 1.85) * (d.active ? markerStyle.ringRadiusScale : markerStyle.inactiveRingScale)}
      ringPropagationSpeed={d => d.worldHighlight ? 0.62 * markerStyle.ringSpeedScale : (d.active ? d.visual?.ringSpeed || 4 : d.focusMode ? 1.1 : 2) * markerStyle.ringSpeedScale}
      ringRepeatPeriod={d => d.worldHighlight ? 3600 : d.active ? d.visual?.ringPeriod || 900 : d.focusMode ? 2700 : 2100}

      customLayerData={customLayerData}
      customThreeObject={createGlobeSprite}
      customThreeObjectUpdate={updateGlobeSprite}
      onCustomLayerClick={(obj) => {
        const data = obj.userData || obj;
        if (data.type === 'world-highlight') {
          onWorldHighlightClick && onWorldHighlightClick(data);
        } else if (data.type !== 'vehicle') {
          onMarkerClick && onMarkerClick(data);
        }
      }}

      onGlobeClick={({ lat, lng }) => onGlobeClick && onGlobeClick(lat, lng)}
    />
  );
});

TravelGlobe.displayName = 'TravelGlobe';

export default TravelGlobe;
