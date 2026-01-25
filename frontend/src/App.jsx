import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TravelGlobe from './components/TravelGlobe';
import CreateOdysseyModal from './components/CreateOdysseyModal';
import EventManager from './components/EventManager';
import PanoramaViewer from './components/PanoramaViewer';
import MediaCarousel from './components/MediaCarousel';
import TravelCalendar from './components/TravelCalendar';
import DataManagement from './components/DataManagement';
import ExportImportModal from './components/ExportImportModal';
import './App.css';
import { Play, Pause, SkipForward, SkipBack, Plane, MapPin, Wind, ArrowUp, Plus, Calendar, Database, Share2 } from 'lucide-react';
import TripDashboard from './components/TripDashboard';
import './components/HUD.css';

const API_BASE = '/api';

const App = () => {
  const [events, setEvents] = useState([]);
  const [trips, setTrips] = useState([]); // Grouped data from backend
  const [currentEventIndex, setCurrentEventIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [panoUrl, setPanoUrl] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [carouselData, setCarouselData] = useState(null); // { mediaList, index }
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [showManager, setShowManager] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showDataManagement, setShowDataManagement] = useState(false);
  const [showExportImport, setShowExportImport] = useState(false);
  const [showEventInfo, setShowEventInfo] = useState(false);
  const [selectedCity, setSelectedCity] = useState(null); // { name, lat, lng }
  const [selectedTripId, setSelectedTripId] = useState(null); 
  const [forcedCamera, setForcedCamera] = useState(null); // { lat, lng, altitude, duration }
  
  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
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
      console.error("Failed to fetch data", err);
      return [];
    }
  };

  // derived selectedTrip is now accurate from the backend's grouped response
  const selectedTrip = React.useMemo(() => {
    if (!selectedTripId || trips.length === 0) return null;
    return trips.find(t => t.id === selectedTripId);
  }, [trips, selectedTripId]);

  
  // Upload related state
  const fileInputRef = React.useRef(null);
  const [uploadingEventId, setUploadingEventId] = useState(null);

  const handleGlobeClick = (lat, lng) => {
    setSelectedCoords({ lat, lng });
    setShowForm(true);
  };

  const handleMarkerClick = (city) => {
    setSelectedCity(city);
    // Find the first event for this city to center on the timeline
    const firstEventIndex = events.findIndex(e => e.to_name === city.name);
    if (firstEventIndex !== -1) setCurrentEventIndex(firstEventIndex);
    // Also set selectedTrip if we can find which trip this event belongs to?
    // For now just show event info
    setShowEventInfo(true);
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
      setShowForm(false);
      
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

  // Playback Loop
  useEffect(() => {
    let timer;
    if (isPlaying && currentEventIndex < events.length) {
      const current = events[currentEventIndex];
      timer = setTimeout(() => {
        if (currentEventIndex < events.length - 1) {
          setCurrentEventIndex(prev => prev + 1);
        } else {
          setIsPlaying(false);
          // Show panorama from media list if available
          const pano = current.media_list?.find(m => m.media_type === 'pano_image');
          if (pano) setPanoUrl(pano.url);
        }
      }, 5000 / speed);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentEventIndex, speed, events]);

  const handleDashboardFocus = (lat, lng, altitude = 1000000, duration = 2000) => {
    setForcedCamera({ lat, lng, altitude, duration });
  };

  return (
    <div className="app-container">
       <TravelGlobe 
          events={events} 
          currentEventIndex={currentEventIndex}
          isPlaying={isPlaying}
          speed={speed}
          onGlobeClick={handleGlobeClick}
          onMarkerClick={handleMarkerClick}
          forcedCamera={forcedCamera} 
       />

       {/* Top Left HUD */}
       <div className="hud-overlay top-left hud-font glass-panel">
         <div className="hud-item primary">
           <Plane size={18} /> <span>STATUS: {isPlaying ? 'CRUISING' : 'READY'}</span>
         </div>
         <div className="hud-item">
           <MapPin size={18} /> <span>POS: {events[currentEventIndex]?.from_name || 'N/A'}</span>
         </div>
         <div className="hud-item">
           <SkipForward size={18} /> <span>DEST: {events[currentEventIndex]?.to_name || 'N/A'}</span>
         </div>
       </div>

       {/* Top Right Menu */}
       <div className="hud-overlay top-right hud-font glass-panel">
         <div className="hud-item">
           <ArrowUp size={18} /> <span>ALT: {isPlaying ? (30000 + Math.floor(Math.random() * 5000)).toLocaleString() : '0'} FT</span>
         </div>
         <div className="hud-item">
           <Wind size={18} /> <span>SPD: {isPlaying ? (800 + Math.floor(Math.random() * 100)) * speed : 0} KM/H</span>
         </div>
         {isPlaying && (
           <div className="hud-item" style={{ fontSize: '12px', border: '1px solid var(--primary)', padding: '2px 5px' }}>
              HDG: {Math.floor(Math.random() * 360)}°
           </div>
         )}
         <button className="add-toggle-btn" onClick={() => setShowForm(!showForm)}>
           <Plus /> {showForm ? 'CLOSE' : 'ADD TRAVEL'}
         </button>
         <button className="log-btn" onClick={() => setShowManager(true)}>
           VIEW JOURNEY LOG
         </button>
         <button 
           className={`neon-btn-icon ${showCalendar ? 'active' : ''}`}
           onClick={() => setShowCalendar(!showCalendar)}
           title="Calendar View"
         >
           <Calendar size={20} />
           <span className="btn-label">CALENDAR</span>
         </button>
         <button 
           className={`neon-btn-icon ${showDataManagement ? 'active' : ''}`}
           onClick={() => setShowDataManagement(!showDataManagement)}
           title="Manage Data"
         >
           <Database size={20} />
           <span className="btn-label">MANAGE</span>
         </button>
         <button 
           className={`neon-btn-icon ${showExportImport ? 'active' : ''}`}
           onClick={() => setShowExportImport(!showExportImport)}
           title="Export/Import Data"
         >
           <Share2 size={20} />
           <span className="btn-label">PORTABILITY</span>
         </button>
       </div>
       
       {showForm && (
         <CreateOdysseyModal 
           onClose={() => setShowForm(false)}
           onAddSimpleTrip={handleAddSimpleTrip}
           selectedCoords={selectedCoords}
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
      {(showEventInfo && (selectedCity || (currentEventIndex >= 0 && events[currentEventIndex]))) && (
         <div className="media-preview glass-panel wide-panel" style={{display: 'none'}}> 
            {/* Hiding legacy panel to force Dashboard usage */}
         </div>
      )}

      {/* Controls Container */}
      <div className="controls-container glass-panel">
        <div className="playback-controls">
          <button onClick={() => setCurrentEventIndex(Math.max(0, currentEventIndex - 1))}><SkipBack /></button>
          <button className="play-btn" onClick={() => setIsPlaying(!isPlaying)}>
            {isPlaying ? <Pause /> : <Play />}
          </button>
          <button onClick={() => setCurrentEventIndex(Math.min(events.length - 1, currentEventIndex + 1))}><SkipForward /></button>
        </div>
        
        <div className="scrubber-container">
          <input 
            type="range" 
            min="0" 
            max={Math.max(0, events.length - 1)} 
            value={currentEventIndex >= 0 ? currentEventIndex : 0} 
            onChange={(e) => setCurrentEventIndex(parseInt(e.target.value))}
          />
        </div>

        <div className="speed-toggle">
          <select value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))}>
            <option value="0.5">0.5x</option>
            <option value="1">1.0x</option>
            <option value="2">2.0x</option>
          </select>
        </div>
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
