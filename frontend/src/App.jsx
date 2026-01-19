import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TravelGlobe from './components/TravelGlobe';
import SimpleEventForm from './components/SimpleEventForm';
import EventManager from './components/EventManager';
import PanoramaViewer from './components/PanoramaViewer';
import MediaCarousel from './components/MediaCarousel';
import TravelCalendar from './components/TravelCalendar';
import DataManagement from './components/DataManagement';
import './App.css';
import { Play, Pause, SkipForward, SkipBack, Plane, MapPin, Wind, ArrowUp, Plus, Calendar, Database } from 'lucide-react';

const API_BASE = '/api';

const App = () => {
  const [events, setEvents] = useState([]);
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
  const [showEventInfo, setShowEventInfo] = useState(false);
  const [selectedCity, setSelectedCity] = useState(null); // { name, lat, lng }

  useEffect(() => {
    fetchEvents();
  }, []);


  const fetchEvents = async () => {
    try {
      const res = await axios.get(`${API_BASE}/events/`);
      console.log("DEBUG: Fetched events:", res.data);
      setEvents(res.data);
      if (res.data.length > 0 && currentEventIndex === -1) setCurrentEventIndex(0);
    } catch (err) {
      console.error("Failed to fetch events", err);
    }
  };

  const handleGlobeClick = (lat, lng) => {
    setSelectedCoords({ lat, lng });
    setShowForm(true);
  };

  const handleMarkerClick = (city) => {
    setSelectedCity(city);
    setShowEventInfo(true);
    // Find the first event for this city to center on the timeline
    const firstEventIndex = events.findIndex(e => e.to_name === city.name);
    if (firstEventIndex !== -1) setCurrentEventIndex(firstEventIndex);
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
      
      fetchEvents();
      setShowForm(false);
    } catch (err) {
      console.error("Failed to create simple trip", err);
    }
  };

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

  return (
    <div className="app-container">
      <TravelGlobe 
        events={events} 
        currentEventIndex={currentEventIndex} 
        isPlaying={isPlaying} 
        onGlobeClick={handleGlobeClick}
        onMarkerClick={handleMarkerClick}
        speed={speed}
      />

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
      </div>

      {showDataManagement && (
        <DataManagement 
          events={events}
          onClose={() => setShowDataManagement(false)} 
          onRefresh={fetchEvents} 
        />
      )}

      {showForm && (
        <SimpleEventForm onAddSimpleTrip={handleAddSimpleTrip} onClose={() => setShowForm(false)} />
      )}

      {showManager && (
        <EventManager 
          events={events} 
          onClose={() => setShowManager(false)} 
          onRefresh={fetchEvents} 
        />
      )}

      {(showEventInfo && (selectedCity || (currentEventIndex >= 0 && events[currentEventIndex]))) && (
        <div className="media-preview glass-panel wide-panel">
          <div className="panel-header">
            <h3>{selectedCity ? selectedCity.name : events[currentEventIndex].to_name}</h3>
            <button className="close-mini-btn" onClick={() => setShowEventInfo(false)}>×</button>
          </div>

          <div className="timeline-container">
            {events.filter(e => e.to_name === (selectedCity ? selectedCity.name : events[currentEventIndex].to_name)).map((visit, vIdx) => (
              <div key={vIdx} className={`timeline-visit ${events[currentEventIndex]?.id === visit.id ? 'active' : ''}`}>
                <div className="visit-info" onClick={() => setCurrentEventIndex(events.findIndex(e => e.id === visit.id))}>
                  <div className="visit-date">
                    <Calendar size={12} /> {new Date(visit.start_datetime).toLocaleDateString()}
                  </div>
                  <div className="visit-title">{visit.title}</div>
                </div>
                
                <div className="media-gallery mini-gallery">
                  {visit.media_list?.map((media, mIdx) => (
                    <div key={mIdx} className="media-thumb" onClick={() => media.media_type === 'pano_image' ? setPanoUrl(media.url) : setCarouselData({ mediaList: visit.media_list, index: mIdx })}>
                      <img 
                        src={media.url} 
                        alt="Visit scene" 
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/150?text=DATA+UNREACHABLE';
                          e.target.classList.add('broken');
                        }}
                      />
                      {media.media_type === 'pano_image' && <span className="pano-badge">360°</span>}
                      {media.media_type === 'video' && <span className="pano-badge video-badge">VIDEO</span>}
                    </div>
                  ))}
                  {(!visit.media_list || visit.media_list.length === 0) && <div className="no-media">NO DATA DETECTED</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
    </div>
  );
};

export default App;
