import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from './api/client';
import TravelGlobe from './components/TravelGlobe';
import CreateOdysseyModal from './components/CreateOdysseyModal';
import EventManager from './components/EventManager';
import PanoramaViewer from './components/PanoramaViewer';
import MediaCarousel from './components/MediaCarousel';
import TravelCalendar from './components/TravelCalendar';
import DataManagement from './components/DataManagement';
import ExportImportModal from './components/ExportImportModal';
import ContinentStats from './components/ContinentStats';
import GlobeJourneyInspector from './components/GlobeJourneyInspector';
import StarshipTelemetry from './components/StarshipTelemetry';
import RightRailStack from './components/RightRailStack';
import './App.css';
import { Play, Pause, SkipForward, SkipBack, AlertTriangle, RefreshCcw, Lock, Unlock } from 'lucide-react';
import TripDashboard from './components/TripDashboard';
import './components/HUD.css';
import { calculateDistance } from './utils';
import { useSimulationRecorder } from './hooks/useSimulationRecorder';
import { DEFAULT_GLOBE_VISUAL } from './config/globeThemes';

const getEventDateKey = (dateString) => {
  if (!dateString) return '';

  const text = String(dateString);
  const storedDate = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (storedDate) return storedDate[1];

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getEventDateParts = (dateString) => {
  const dateKey = getEventDateKey(dateString);
  if (!dateKey) return null;

  const [year, month] = dateKey.split('-');
  const monthNumber = Number(month);
  const half = `${year}-H${monthNumber <= 6 ? 1 : 2}`;
  const quarter = `${year}-Q${Math.ceil(monthNumber / 3)}`;

  return {
    dateKey,
    year,
    month: `${year}-${month}`,
    half,
    quarter
  };
};

const getEventTransport = (event, fallback = 'plane') => {
  const fallbackMode = String(fallback || 'plane').toLowerCase();
  const raw = fallbackMode !== 'plane' ? fallbackMode : String(event?.transport || fallbackMode).toLowerCase();
  if (['plane', 'flight', 'air', 'airplane'].includes(raw)) return 'plane';
  if (['starship', 'rocket', 'spacecraft', 'spaceship'].includes(raw)) return 'starship';
  if (['ship', 'boat', 'ferry', 'cruise'].includes(raw)) return 'ship';
  if (['train', 'rail'].includes(raw)) return 'train';
  if (['car', 'bus', 'drive', 'road'].includes(raw)) return 'ground';
  return ['ufo', 'hero', 'comet'].includes(raw) ? raw : 'plane';
};

const TRANSPORT_COPY = {
  plane: { label: 'Flight', status: 'In flight', metricA: 'Cruise alt', metricB: 'Air speed' },
  starship: { label: 'Orbital leg', status: 'Launch-ready', metricA: 'Orbit arc', metricB: 'Boost speed' },
  ship: { label: 'Sea route', status: 'At sea', metricA: 'Harbor arrival', metricB: 'Route speed' },
  train: { label: 'Rail leg', status: 'On rail', metricA: 'Track leg', metricB: 'Rail pace' },
  ground: { label: 'Ground leg', status: 'On route', metricA: 'Road leg', metricB: 'Drive pace' },
  ufo: { label: 'Traveler', status: 'Cruising', metricA: 'Altitude', metricB: 'Speed' },
  hero: { label: 'Traveler', status: 'Cruising', metricA: 'Altitude', metricB: 'Speed' },
  comet: { label: 'Traveler', status: 'Cruising', metricA: 'Altitude', metricB: 'Speed' }
};

const App = () => {
  const [events, setEvents] = useState([]);
  const [trips, setTrips] = useState([]); // Grouped data from backend
  const [currentEventIndex, setCurrentEventIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [vehicleMode, setVehicleMode] = useState('plane');
  const [globeVisual, setGlobeVisual] = useState(DEFAULT_GLOBE_VISUAL);
  const [simulationViewMode, setSimulationViewMode] = useState('globe');
  const [starshipTelemetry, setStarshipTelemetry] = useState(null);
  const [showGlobeSettings, setShowGlobeSettings] = useState(false);
  const [showUtilityRail, setShowUtilityRail] = useState(false);
  const [freeCameraMode, setFreeCameraMode] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [panoUrl, setPanoUrl] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [carouselData, setCarouselData] = useState(null); // { mediaList, index }
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [showManager, setShowManager] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [totalOdysseyDistance, setTotalOdysseyDistance] = useState(0);
  const [showDataManagement, setShowDataManagement] = useState(false);
  const [showExportImport, setShowExportImport] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showEventInfo, setShowEventInfo] = useState(false);
  const [selectedCity, setSelectedCity] = useState(null); // { name, lat, lng }
  const [selectedTripId, setSelectedTripId] = useState(null); 
  const [forcedCamera, setForcedCamera] = useState(null); // { lat, lng, altitude, duration }
  const [favoriteDraftTarget, setFavoriteDraftTarget] = useState(null);
  const [dataError, setDataError] = useState(null);
  const [globeFilter, setGlobeFilter] = useState({
    dateMode: 'all',
    dateValue: '',
    dateFrom: '',
    dateTo: '',
    places: []
  });
  const globeCaptureRef = React.useRef(null);
  
  useEffect(() => {
    fetchEvents();
  }, []);

  // Calculate Total Odyssey Distance whenever trips change
  useEffect(() => {
     let total = 0;
     trips.forEach(trip => {
         if(trip.events && trip.events.length > 0) {
             trip.events.forEach((ev, idx) => {
                 total += calculateDistance(ev.from_lat, ev.from_lng, ev.to_lat, ev.to_lng);
             });
         }
     });
     setTotalOdysseyDistance(total);
  }, [trips]);

  const fetchEvents = async () => {
    try {
      setDataError(null);
      // Fetch both flat events for globe AND grouped trips for dashboard metadata
      const [eventsRes, tripsRes] = await Promise.all([
          axios.get(`${API_BASE}/events/`),
          axios.get(`${API_BASE}/events/trips`)
      ]);
      
      setEvents(eventsRes.data);
      setTrips(tripsRes.data);
      
      if (eventsRes.data.length > 0 && currentEventIndex === -1) setCurrentEventIndex(0);
      return eventsRes.data;
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      const message = status
        ? `Backend returned ${status}${detail ? `: ${detail}` : ''}`
        : 'Backend is not reachable. Start the API on localhost:8888 or run docker compose.';
      setDataError(message);
      console.error("Failed to fetch VoyageAtlas data", err);
      return [];
    }
  };

  // derived selectedTrip is now accurate from the backend's grouped response
  const selectedTrip = React.useMemo(() => {
    if (!selectedTripId || trips.length === 0) return null;
    return trips.find(t => t.id === selectedTripId);
  }, [trips, selectedTripId]);

  const dateBounds = React.useMemo(() => {
    const dates = events
      .map(event => getEventDateKey(event.start_datetime))
      .filter(Boolean)
      .sort();

    return {
      min: dates[0] || '',
      max: dates[dates.length - 1] || ''
    };
  }, [events]);

  const placeScopeOptions = React.useMemo(() => {
    const places = new Map();
    events.forEach(event => {
      [event.from_name, event.to_name].forEach(name => {
        if (!name) return;
        places.set(name.trim().toLowerCase(), name);
      });
    });

    return Array.from(places.values())
      .sort((a, b) => a.localeCompare(b))
      .map(name => ({ value: name, label: name }));
  }, [events]);

  const datePresetOptions = React.useMemo(() => {
    const years = new Set();
    const halves = new Map();
    const quarters = new Map();
    const months = new Map();

    events.forEach(event => {
      const dateParts = getEventDateParts(event.start_datetime);
      if (!dateParts) return;

      const { year, month, half, quarter } = dateParts;
      years.add(year);
      halves.set(half, `${year} ${half.endsWith('H1') ? '상반기' : '하반기'}`);
      quarters.set(quarter, `${year} ${quarter.slice(-2)}`);
      const [monthYear, monthNumber] = month.split('-');
      const labelDate = new Date(Number(monthYear), Number(monthNumber) - 1, 1);
      months.set(month, labelDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }));
    });

    return [
      { value: 'all', label: 'All dates', group: 'Scope' },
      ...Array.from(years)
        .sort((a, b) => b.localeCompare(a))
        .map(year => ({ value: `year:${year}`, label: `${year}`, group: 'Year' })),
      ...Array.from(halves.entries())
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([value, label]) => ({ value: `half:${value}`, label, group: 'Half-year' })),
      ...Array.from(quarters.entries())
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([value, label]) => ({ value: `quarter:${value}`, label, group: 'Quarter' })),
      ...Array.from(months.entries())
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([value, label]) => ({ value: `month:${value}`, label, group: 'Month' })),
      { value: 'range', label: 'Custom range', group: 'Custom' }
    ];
  }, [events]);

  const visibleEvents = React.useMemo(() => {
    return events
      .map((event, index) => ({ ...event, __sourceIndex: index }))
      .filter(event => {
        if (globeFilter.dateMode && globeFilter.dateMode !== 'all') {
          const dateParts = getEventDateParts(event.start_datetime);
          if (!dateParts) return false;
          const {
            dateKey: eventDate,
            year: eventYear,
            month: eventMonth,
            half: eventHalf,
            quarter: eventQuarter
          } = dateParts;

          if (globeFilter.dateMode === 'year' && eventYear !== globeFilter.dateValue) return false;
          if (globeFilter.dateMode === 'half' && eventHalf !== globeFilter.dateValue) return false;
          if (globeFilter.dateMode === 'quarter' && eventQuarter !== globeFilter.dateValue) return false;
          if (globeFilter.dateMode === 'month' && eventMonth !== globeFilter.dateValue) return false;
          if (globeFilter.dateMode === 'range') {
            if (globeFilter.dateFrom && eventDate < globeFilter.dateFrom) return false;
            if (globeFilter.dateTo && eventDate > globeFilter.dateTo) return false;
          }
        }

        if (globeFilter.places.length > 0) {
          return globeFilter.places.includes(event.from_name) || globeFilter.places.includes(event.to_name);
        }

        return true;
      });
  }, [events, globeFilter]);

  const currentVisibleIndex = React.useMemo(() => {
    return visibleEvents.findIndex(event => event.__sourceIndex === currentEventIndex);
  }, [currentEventIndex, visibleEvents]);

  const currentVisibleEvent = currentVisibleIndex >= 0 ? visibleEvents[currentVisibleIndex] : null;

  const visibleDistance = React.useMemo(() => {
    return visibleEvents.reduce((total, event) => {
      return total + calculateDistance(event.from_lat, event.from_lng, event.to_lat, event.to_lng);
    }, 0);
  }, [visibleEvents]);

  const isGlobeFiltered = Boolean(globeFilter.dateMode !== 'all' || globeFilter.places.length);
  const displayedDistance = isGlobeFiltered ? visibleDistance : totalOdysseyDistance;
  const activeTransport = getEventTransport(currentVisibleEvent, vehicleMode);
  const activeTransportCopy = TRANSPORT_COPY[activeTransport] || TRANSPORT_COPY.plane;
  const activeLegDistance = currentVisibleEvent
    ? calculateDistance(
      currentVisibleEvent.from_lat,
      currentVisibleEvent.from_lng,
      currentVisibleEvent.to_lat,
      currentVisibleEvent.to_lng
    )
    : 0;
  const dateScopeLabel = (() => {
    if (globeFilter.dateMode === 'year') return globeFilter.dateValue || 'Select year';
    if (globeFilter.dateMode === 'half') {
      return datePresetOptions.find(option => option.value === `half:${globeFilter.dateValue}`)?.label || 'Select half';
    }
    if (globeFilter.dateMode === 'quarter') {
      return datePresetOptions.find(option => option.value === `quarter:${globeFilter.dateValue}`)?.label || 'Select quarter';
    }
    if (globeFilter.dateMode === 'month') {
      return datePresetOptions.find(option => option.value === `month:${globeFilter.dateValue}`)?.label || 'Select month';
    }
    if (globeFilter.dateMode === 'range') {
      return `${globeFilter.dateFrom || dateBounds.min || 'Start'} - ${globeFilter.dateTo || dateBounds.max || 'End'}`;
    }
    return 'All dates';
  })();
  const placeScopeLabel = globeFilter.places.length
    ? globeFilter.places.join(', ')
    : 'All places';
  const globeFilterSummary = {
    isFiltered: isGlobeFiltered,
    dateLabel: dateScopeLabel,
    placeLabel: placeScopeLabel,
    visibleLegs: visibleEvents.length,
    totalLegs: events.length,
    distance: displayedDistance,
    activeLegDistance
  };

  useEffect(() => {
    if (visibleEvents.length === 0) {
      if (currentEventIndex !== -1) setCurrentEventIndex(-1);
      if (isPlaying) setIsPlaying(false);
      return;
    }

    if (currentVisibleIndex === -1) {
      setCurrentEventIndex(visibleEvents[0].__sourceIndex);
      setIsPlaying(false);
    }
  }, [currentEventIndex, currentVisibleIndex, isPlaying, visibleEvents]);

  // Format datetime string to readable date
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown Date';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  // Upload related state
  const fileInputRef = React.useRef(null);
  const [uploadingEventId, setUploadingEventId] = useState(null);

  const handleGlobeClick = (lat, lng) => {
    setSelectedCoords({ lat, lng });
    setShowForm(true);
  };

  const handleGlobeFavoritePick = async ({ lat, lng }) => {
    const targetLat = Number(lat);
    const targetLng = Number(lng);
    if (!Number.isFinite(targetLat) || !Number.isFinite(targetLng)) return;

    setIsPlaying(false);
    setForcedCamera({ lat: targetLat, lng: targetLng, altitude: 1.18, duration: 850 });
    const draftId = `${targetLat.toFixed(4)}:${targetLng.toFixed(4)}:${Date.now()}`;
    setFavoriteDraftTarget({
      id: draftId,
      name: `선택 위치 ${targetLat.toFixed(3)}, ${targetLng.toFixed(3)}`,
      lat: targetLat,
      lng: targetLng,
      resolving: true
    });

    try {
      const { data } = await axios.get(`${API_BASE}/geocode`, {
        params: { lat: targetLat, lng: targetLng }
      });
      setFavoriteDraftTarget(prev => (
        prev?.id === draftId
          ? {
              ...prev,
              name: data.name || prev.name,
              city: data.city || '',
              region: data.region || '',
              country: data.country || '',
              display_name: data.display_name || '',
              source: data.source || '',
              resolving: false
            }
          : prev
      ));
    } catch {
      setFavoriteDraftTarget(prev => (
        prev?.id === draftId ? { ...prev, resolving: false } : prev
      ));
    }
  };

  const openBlankOdysseyModal = () => {
    setSelectedCoords(null);
    setShowForm(true);
  };

  const closeOdysseyModal = () => {
    setShowForm(false);
    setSelectedCoords(null);
  };

  const handleMarkerClick = (city) => {
    setSelectedCity(city);
    // Find the first event for this city to center on the timeline
    const firstEventIndex = visibleEvents.find(e => e.to_name === city.name || e.from_name === city.name)?.__sourceIndex;
    if (firstEventIndex !== undefined) setCurrentEventIndex(firstEventIndex);
    // Also set selectedTrip if we can find which trip this event belongs to?
    // For now just show event info
    setShowEventInfo(true);
  };

  const handleWorldHighlightClick = (destination) => {
    const lat = Number(destination.lat);
    const lng = Number(destination.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    setSelectedCoords({ lat, lng });
    setForcedCamera({ lat, lng, altitude: 1.18, duration: 850 });
    setShowForm(true);
  };

  const handleInspectorCityFocus = (city) => {
    setSelectedCity(city);
    const visibleIndex = city.eventIndexes?.[0] ?? visibleEvents.findIndex(e => e.to_name === city.name || e.from_name === city.name);
    const sourceIndex = visibleEvents[visibleIndex]?.__sourceIndex;
    if (sourceIndex !== undefined) setCurrentEventIndex(sourceIndex);
    setForcedCamera({
      lat: Number(city.lat),
      lng: Number(city.lng),
      altitude: 1.28,
      duration: 900
    });
  };

  const handleInspectorEventFocus = (eventIndex) => {
    if (eventIndex < 0 || eventIndex >= visibleEvents.length) return;
    const event = visibleEvents[eventIndex];
    const destinationLat = Number(event.to_lat);
    const destinationLng = Number(event.to_lng);

    setIsPlaying(false);
    setCurrentEventIndex(event.__sourceIndex);
    setSelectedCity(
      Number.isFinite(destinationLat) && Number.isFinite(destinationLng)
        ? {
            name: event.to_name,
            lat: destinationLat,
            lng: destinationLng,
            eventIndexes: [eventIndex]
          }
        : null
    );

    if (Number.isFinite(destinationLat) && Number.isFinite(destinationLng)) {
      setForcedCamera({
        lat: destinationLat,
        lng: destinationLng,
        altitude: 1.22,
        duration: 900
      });
    }
  };

  const handleVisibleIndexChange = (visibleIndex) => {
    const nextEvent = visibleEvents[visibleIndex];
    if (!nextEvent) return;
    setCurrentEventIndex(nextEvent.__sourceIndex);
  };

  const handleGlobeFilterChange = (patch) => {
    setGlobeFilter(prev => {
      const next = {
        ...prev,
        ...patch
      };

      if (patch.dateMode && patch.dateMode !== prev.dateMode) {
        next.dateValue = patch.dateValue || '';
        if (patch.dateMode !== 'range') {
          next.dateFrom = '';
          next.dateTo = '';
        }
      }

      if (patch.dateMode === 'all') {
        next.dateValue = '';
        next.dateFrom = '';
        next.dateTo = '';
      }

      return next;
    });
  };

  const resetGlobeFilter = () => {
    setGlobeFilter({ dateMode: 'all', dateValue: '', dateFrom: '', dateTo: '', places: [] });
  };

  const handleUploadClick = (eventId) => {
    setUploadingEventId(eventId);
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !uploadingEventId) return;

    try {
      const formData = new FormData();
      Array.from(files).forEach(f => formData.append('files', f));
      
      console.log(`DEBUG: Uploading ${files.length} files to event ${uploadingEventId}`);
      await axios.post(`${API_BASE}/events/${uploadingEventId}/media`, formData);
      
      // Refresh events to show new media
      await fetchEvents();
      
      // Reset state
      setUploadingEventId(null);
      e.target.value = ''; // Clear input for next upload
    } catch (err) {
      console.error("Failed to upload media", err);
      alert("미디어 업로드에 실패했습니다.");
    }
  };

  const handleAddSimpleTrip = async (tripData, legFiles) => {
    try {
      const res = await axios.post(`${API_BASE}/events/simple`, tripData);
      const eventIds = res.data.event_ids;
      console.log("DEBUG: Trip created, event IDs:", eventIds);
      
      // Upload media for each leg
      for (let i = 0; i < eventIds.length; i++) {
        const eventId = eventIds[i];
        if (!eventId) {
          console.warn(`DEBUG: Skipping leg ${i} because event mapping failed`);
          continue;
        }
        
        const files = legFiles[i];
        if (files && files.length > 0) {
          console.log(`DEBUG: Uploading ${files.length} files for event ${eventId}`);
          const formData = new FormData();
          Array.from(files).forEach(f => formData.append('files', f));
          await axios.post(`${API_BASE}/events/${eventId}/media`, formData);
          console.log(`DEBUG: Uploaded files for event ${eventId}`);
        }
      }
      
      const updatedEvents = await fetchEvents();
      closeOdysseyModal();
      
      // Set simulation to start of new trip
      if (eventIds.length > 0 && updatedEvents.length > 0) {
          const firstNewEventId = eventIds[0];
          const newIndex = updatedEvents.findIndex(e => e.id === firstNewEventId);
          if (newIndex !== -1) {
              setCurrentEventIndex(newIndex);
              // Optional: Auto-play?
              // setIsPlaying(true); 
          }
      }
    } catch (err) {
      console.error("Failed to create simple trip", err);
    }
  };

  const simulationRecorder = useSimulationRecorder({
    globeRef: globeCaptureRef,
    visibleEvents,
    currentEventIndex,
    isPlaying,
    speed,
    setCurrentEventIndex,
    setIsPlaying,
    setSpeed
  });

  // Playback Loop
  useEffect(() => {
    let timer;
    if (isPlaying && currentVisibleIndex >= 0 && currentVisibleIndex < visibleEvents.length) {
      const current = visibleEvents[currentVisibleIndex];
      timer = setTimeout(() => {
        if (currentVisibleIndex < visibleEvents.length - 1) {
          setCurrentEventIndex(visibleEvents[currentVisibleIndex + 1].__sourceIndex);
        } else {
          setIsPlaying(false);
          // Show panorama from media list if available
          if (!simulationRecorder.isRecording) {
            const pano = current.media_list?.find(m => m.media_type === 'pano_image');
            if (pano) setPanoUrl(pano.url);
          }
        }
      }, 5000 / speed);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentVisibleIndex, speed, simulationRecorder.isRecording, visibleEvents]);

  useEffect(() => {
    if (!isPlaying || activeTransport !== 'starship' || !currentVisibleEvent) {
      setStarshipTelemetry(null);
      return undefined;
    }

    const duration = Math.max(5000, Math.min(activeLegDistance * 0.8, 12000)) / speed;
    const fromLat = Number(currentVisibleEvent.from_lat);
    const fromLng = Number(currentVisibleEvent.from_lng);
    const toLat = Number(currentVisibleEvent.to_lat);
    const toLng = Number(currentVisibleEvent.to_lng);
    let lngDelta = toLng - fromLng;
    if (lngDelta > 180) lngDelta -= 360;
    if (lngDelta < -180) lngDelta += 360;
    const latDelta = toLat - fromLat;
    const headingRadians = Math.atan2(lngDelta, latDelta || 0.0001);
    const startedAt = performance.now();
    let rafId;
    let lastFrame = 0;

    const updateTelemetry = (now) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const arcLift = Math.sin(progress * Math.PI);
      const boostCurve = 1 - Math.pow(1 - Math.min(progress / 0.42, 1), 2);
      const entryCurve = progress > 0.72 ? (progress - 0.72) / 0.28 : 0;
      const throttle = progress < 0.22
        ? 0.92 + arcLift * 0.06
        : progress < 0.42
          ? 0.68 + arcLift * 0.08
          : progress < 0.72
            ? 0.28 + arcLift * 0.06
            : 0.42 + (1 - entryCurve) * 0.18;
      const phase = progress < 0.22 ? 'Boost ring' : progress < 0.42 ? 'Max-Q trim' : progress < 0.72 ? 'Coast core' : 'Entry trim';

      if (now - lastFrame > 80 || progress >= 1) {
        lastFrame = now;
        const currentLat = fromLat + latDelta * progress;
        const currentLng = ((fromLng + lngDelta * progress + 540) % 360) - 180;
        setStarshipTelemetry({
          progress,
          currentLat,
          currentLng,
          headingRadians,
          throttle,
          phase,
          speedKmh: (2200 + activeLegDistance * 0.1 + boostCurve * 5100 - entryCurve * 1700) * speed,
          altitudeKm: 22 + arcLift * 70 + progress * 14,
          lox: Math.max(0.08, 1 - progress * 0.76 - throttle * 0.05),
          ch4: Math.max(0.1, 1 - progress * 0.64 - throttle * 0.04)
        });
      }

      if (progress < 1) rafId = requestAnimationFrame(updateTelemetry);
    };

    rafId = requestAnimationFrame(updateTelemetry);
    return () => cancelAnimationFrame(rafId);
  }, [activeLegDistance, activeTransport, currentVisibleEvent?.id, currentVisibleIndex, isPlaying, speed]);

  const handleDashboardFocus = (lat, lng, altitude = 1000000, duration = 2000) => {
    setForcedCamera({ lat, lng, altitude, duration });
  };

  const getRouteFocusCamera = (event) => {
    if (!event) return null;

    const fromLat = Number(event.from_lat);
    const fromLng = Number(event.from_lng);
    const toLat = Number(event.to_lat);
    const toLng = Number(event.to_lng);

    if (![fromLat, fromLng, toLat, toLng].every(Number.isFinite)) return null;

    let lngDelta = toLng - fromLng;
    if (lngDelta > 180) lngDelta -= 360;
    if (lngDelta < -180) lngDelta += 360;

    const distance = calculateDistance(fromLat, fromLng, toLat, toLng);
    const altitude = distance < 300
      ? 0.48
      : distance < 1200
        ? 0.62
        : distance < 3000
          ? 0.82
          : 1.05;

    return {
      lat: (fromLat + toLat) / 2,
      lng: ((fromLng + lngDelta / 2 + 540) % 360) - 180,
      altitude,
      duration: 900
    };
  };

  const handleCameraModeToggle = () => {
    const nextFreeCameraMode = !freeCameraMode;
    setFreeCameraMode(nextFreeCameraMode);

    if (nextFreeCameraMode) {
      const routeCamera = getRouteFocusCamera(currentVisibleEvent);
      if (routeCamera) setForcedCamera(routeCamera);
    }
  };

  const handleUtilityRailToggle = () => {
    setShowUtilityRail(prev => {
      const next = !prev;
      if (!next) setShowGlobeSettings(false);
      return next;
    });
  };

  useEffect(() => {
    if (!isPlaying) return;

    setShowUtilityRail(false);
    setShowGlobeSettings(false);
    setShowCalendar(false);
    setShowDataManagement(false);
    setShowExportImport(false);
    setShowStats(false);
  }, [isPlaying]);

  const simulationLayoutActive = isPlaying && !simulationRecorder.isRecording;
  const starshipSimulationActive = simulationLayoutActive && activeTransport === 'starship';

  return (
    <div className={`app-container ${simulationLayoutActive ? 'simulation-running' : ''} ${starshipSimulationActive ? 'starship-running' : ''}`}>
       <TravelGlobe
          ref={globeCaptureRef}
          events={visibleEvents}
          currentEventIndex={currentVisibleIndex}
          isPlaying={isPlaying}
          speed={speed}
          vehicleMode={vehicleMode}
          globeVisual={globeVisual}
          recordingActive={simulationRecorder.isRecording}
          recordingViewMode={simulationViewMode}
          freeCameraMode={freeCameraMode}
          onGlobeClick={handleGlobeClick}
          onGlobeContextPick={handleGlobeFavoritePick}
          onMarkerClick={handleMarkerClick}
          onWorldHighlightClick={handleWorldHighlightClick}
          forcedCamera={forcedCamera}
       />

       <GlobeJourneyInspector
          events={visibleEvents}
          currentEventIndex={currentVisibleIndex}
          selectedCity={selectedCity}
          onCityFocus={handleInspectorCityFocus}
          onEventFocus={handleInspectorEventFocus}
          globeFilter={globeFilter}
          filterSummary={globeFilterSummary}
          dateBounds={dateBounds}
          datePresetOptions={datePresetOptions}
          placeOptions={placeScopeOptions}
          onFilterChange={handleGlobeFilterChange}
          onFilterReset={resetGlobeFilter}
          onAddTravel={openBlankOdysseyModal}
        />

       <StarshipTelemetry
          visible={isPlaying && activeTransport === 'starship' && !simulationRecorder.isRecording}
          telemetry={starshipTelemetry}
        />

       {dataError && (
         <div className="data-error-banner glass-panel" role="alert">
           <AlertTriangle size={18} />
           <span>{dataError}</span>
           <button type="button" onClick={fetchEvents} title="Retry data load">
             <RefreshCcw size={16} />
             Retry
           </button>
         </div>
       )}

       <RightRailStack
          activeTransport={activeTransport}
          activeTransportCopy={activeTransportCopy}
          activeLegDistance={activeLegDistance}
          isPlaying={isPlaying}
          simulationLayoutActive={simulationLayoutActive}
          speed={speed}
          showForm={showForm}
          onOpenTravel={openBlankOdysseyModal}
          onCloseTravel={closeOdysseyModal}
          showUtilityRail={showUtilityRail}
          onUtilityRailToggle={handleUtilityRailToggle}
          showCalendar={showCalendar}
          setShowCalendar={setShowCalendar}
          showDataManagement={showDataManagement}
          setShowDataManagement={setShowDataManagement}
          showExportImport={showExportImport}
          setShowExportImport={setShowExportImport}
          showStats={showStats}
          setShowStats={setShowStats}
          showGlobeSettings={showGlobeSettings}
          setShowGlobeSettings={setShowGlobeSettings}
          globeVisual={globeVisual}
          setGlobeVisual={setGlobeVisual}
          referenceLng={Number(currentVisibleEvent?.from_lng)}
          suggestedFavorite={favoriteDraftTarget}
          onSuggestedFavoriteDone={() => setFavoriteDraftTarget(null)}
          onNavigate={(camera) => { setIsPlaying(false); setForcedCamera(camera); }}
          eventCount={visibleEvents.length}
          filterSummary={globeFilterSummary}
          recorder={simulationRecorder}
          viewMode={simulationViewMode}
          onViewModeChange={setSimulationViewMode}
          onStartRecording={simulationRecorder.startRecording}
          onCancelRecording={simulationRecorder.cancelRecording}
          onOpenManager={() => setShowManager(true)}
        />
       
       {showForm && (
         <CreateOdysseyModal 
           onClose={closeOdysseyModal}
           onAddSimpleTrip={handleAddSimpleTrip}
           selectedCoords={selectedCoords}
         />
       )}

       {showStats && (
         <ContinentStats 
            events={events}
            onClose={() => setShowStats(false)}
         />
       )}

       {showManager && (
        <EventManager 
          events={events} 
          onClose={() => setShowManager(false)} 
          onRefresh={fetchEvents}
          onSelectTrip={(trip) => { 
            setSelectedTripId(trip.id); 
            setShowManager(false); 
          }} 
        />
      )}

      {selectedTrip && (
        <TripDashboard 
           trip={selectedTrip}
           onClose={() => { setSelectedTripId(null); setForcedCamera(null); }}
           onRefresh={fetchEvents}
           onFocusLocation={handleDashboardFocus}
        />
      )}
      
      {showDataManagement && (
        <DataManagement 
          events={events}
          onClose={() => setShowDataManagement(false)} 
          onRefresh={fetchEvents} 
        />
      )}

      {showExportImport && (
        <ExportImportModal 
          onClose={() => setShowExportImport(false)} 
          onRefresh={fetchEvents} 
        />
      )}

      {/* Panorama Viewer and Media Carousel */}
      {panoUrl && <PanoramaViewer imageUrl={panoUrl} onClose={() => setPanoUrl(null)} />}
      {carouselData && (
        <MediaCarousel 
          mediaList={carouselData.mediaList} 
          initialIndex={carouselData.index} 
          eventId={carouselData.eventId} 
          onClose={() => setCarouselData(null)} 
        />
      )}

      {showCalendar && (
        <TravelCalendar 
            events={events} 
            onClose={() => setShowCalendar(false)} 
        />
      )}

      {/* Legacy Mini Event Info (Only if needed, hiding for now if Dashboard covers it) */}
      {(showEventInfo && (selectedCity || (currentVisibleIndex >= 0 && currentVisibleEvent))) && (
         <div className="media-preview glass-panel wide-panel" style={{display: 'none'}}>
            {/* Hiding legacy panel to force Dashboard usage */}
         </div>
      )}

      {/* Flight Route Display */}
      {isPlaying && !simulationRecorder.isRecording && visibleEvents.length > 0 && currentVisibleEvent && (
        <div
          key={currentVisibleEvent.id ?? currentVisibleIndex}
          className="flight-route-display"
          role="status"
          aria-live="polite"
        >
          <div className="route">
            {currentVisibleEvent.from_name}
            <span className="arrow">→</span>
            {currentVisibleEvent.to_name}
          </div>
          <div className="date">
            {formatDate(currentVisibleEvent.start_datetime)}
          </div>
        </div>
      )}

      {/* Controls Container */}
      <div className="controls-container glass-panel">
        <div className="journey-beat">
          <span>{currentVisibleIndex >= 0 ? `${currentVisibleIndex + 1} of ${visibleEvents.length}` : 'No route'}</span>
          <strong>
            {currentVisibleEvent
              ? `${currentVisibleEvent.from_name || 'Unknown'} → ${currentVisibleEvent.to_name || 'Unknown'}`
              : 'Add a journey to begin'}
          </strong>
          <small>{currentVisibleEvent ? `${formatDate(currentVisibleEvent.start_datetime)} · ${activeTransportCopy.label}` : 'Your routes will appear here'}</small>
        </div>

        <div className="playback-controls">
          <button onClick={() => handleVisibleIndexChange(Math.max(0, currentVisibleIndex - 1))} disabled={visibleEvents.length === 0}><SkipBack /></button>
          <button className="play-btn" onClick={() => visibleEvents.length > 0 && setIsPlaying(!isPlaying)} disabled={visibleEvents.length === 0}>
            {isPlaying ? <Pause /> : <Play />}
          </button>
          <button onClick={() => handleVisibleIndexChange(Math.min(visibleEvents.length - 1, currentVisibleIndex + 1))} disabled={visibleEvents.length === 0}><SkipForward /></button>
        </div>
        
        <div className="scrubber-container">
          <input 
            type="range" 
            min="0" 
            max={Math.max(0, visibleEvents.length - 1)}
            value={currentVisibleIndex >= 0 ? currentVisibleIndex : 0}
            onChange={(e) => handleVisibleIndexChange(parseInt(e.target.value))}
            disabled={visibleEvents.length === 0}
          />
          {visibleEvents.length > 1 && (
            <div className="scrubber-ticks" aria-hidden="true">
              {visibleEvents.map((event, index) => (
                <span
                  key={event.id ?? index}
                  className={index === currentVisibleIndex ? 'active' : ''}
                  style={{ left: `${(index / (visibleEvents.length - 1)) * 100}%` }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="speed-toggle">
          <label htmlFor="speed-select">SPEED</label>
          <select
            id="speed-select"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
          >
            <option value="0.5">0.5x</option>
            <option value="1">1.0x</option>
            <option value="2">2.0x</option>
            <option value="5">5.0x</option>
          </select>
        </div>

        <div className="vehicle-toggle">
          <label htmlFor="vehicle-select">VEHICLE</label>
          <select
            id="vehicle-select"
            value={vehicleMode}
            onChange={(e) => setVehicleMode(e.target.value)}
          >
            <option value="plane">Plane</option>
            <option value="starship">Starship</option>
            <option value="ship">Ship</option>
            <option value="train">Train</option>
            <option value="ground">Ground</option>
            <option value="ufo">UFO</option>
            <option value="hero">Superhero</option>
            <option value="comet">Comet</option>
          </select>
        </div>

        <button
          className={`camera-toggle ${freeCameraMode ? 'unlocked' : 'locked'}`}
          onClick={handleCameraModeToggle}
          type="button"
          aria-pressed={freeCameraMode}
          title={freeCameraMode ? 'Free view' : 'Auto follow'}
        >
          {freeCameraMode ? <Unlock size={16} /> : <Lock size={16} />}
          <span>{freeCameraMode ? 'FREE VIEW' : 'AUTO'}</span>
        </button>
      </div>

       {/* Hidden file input for uploads */}
       <input 
         type="file"
         ref={fileInputRef}
         style={{ display: 'none' }}
         multiple
         accept="image/*,video/*"
         onChange={handleFileSelect}
       />
    </div>
  );
};

export default App;
