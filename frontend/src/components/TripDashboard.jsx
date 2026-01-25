import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Calendar, MapPin, Camera, Plane, Clock, Plus, ArrowRight, Moon, Grid, List as ListIcon, Share2, DollarSign, Activity, Edit } from 'lucide-react';
import axios from 'axios';
import './TripDashboard.css'; 
import './Gallery.css';
import '../App.css'; 
import TripPreparation from './TripPreparation';
import TripOverview from './TripOverview';
import TripGallery from './TripGallery';
import TripJourney from './TripJourney';

const API_BASE = '/api';

// --- Helper: Calculate Trip Stats ---
const useTripStats = (trip) => {
  return useMemo(() => {
    if (!trip || !trip.events || trip.events.length === 0) return null;
    
    const events = trip.events;
    const start = new Date(events[0].start_datetime);
    const end = new Date(events[events.length - 1].start_datetime); // Approximate
    const durationMs = end - start;
    const days = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60 * 24)));
    
    const cities = new Set(events.map(e => e.to_name));
    cities.add(events[0].from_name);
    
    // Calculate total distance (Simple Haversine sum would be better, but count legs for now)
    const legCount = events.length;
    
    return {
      days,
      cityCount: cities.size,
      legCount,
      startDate: start,
      endDate: end
    };
  }, [trip]);
};

const TripDashboard = ({ trip, onClose, onRefresh, onFocusLocation }) => {
  const [activeTab, setActiveTab] = useState('prep'); // 'prep' | 'overview' | 'feed' | 'gallery'
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | CityName
  const [heroImage, setHeroImage] = useState(null);
  const [showUploadPicker, setShowUploadPicker] = useState(false);
  
  const stats = useTripStats(trip);
  const fileInputRef = useRef(null);
  const [uploadingEventId, setUploadingEventId] = useState(null);

  // --- Derive Data for Feed & Gallery ---
  const { feedItems, allMedia, cities, stayEvents } = useMemo(() => {
    if (!trip || !trip.events) return { feedItems: [], allMedia: [], cities: [], stayEvents: [] };

    const items = [];
    const media = [];
    const citySet = new Set();
    const stays = [];
    
    const events = trip.events;
    
    events.forEach((e, i) => {
      // 1. Add Transit
      items.push({ type: 'transit', data: e, id: `transit-${e.id}`, city: e.to_name });
      citySet.add(e.to_name);

      if (e.media_list) {
         e.media_list.forEach(m => {
            media.push({ ...m, eventId: e.id, city: e.to_name, date: e.start_datetime });
         });
      }

      // 2. Add Stay
      const nextE = events[i+1];
      let stayDuration = 1;
      let endDate = null;
      if (nextE) {
        const start = new Date(e.start_datetime);
        const nextStart = new Date(nextE.start_datetime);
        const diff = Math.max(0, nextStart - start);
        stayDuration = Math.ceil(diff / (1000 * 60 * 60 * 24));
        endDate = nextStart;
      }
      
      const stayItem = { 
        type: 'stay', 
        data: e, 
        duration: stayDuration, 
        endDate,
        id: `stay-${e.id}`,
        city: e.to_name,
        media: e.media_list || []
      };
      items.push(stayItem);
      stays.push(stayItem);
    });
    
    return { feedItems: items, allMedia: media, cities: Array.from(citySet), stayEvents: stays };
  }, [trip]);

  useEffect(() => {
    if (allMedia.length > 0 && !heroImage) {
        setHeroImage(allMedia[0].url);
    }
  }, [allMedia, heroImage]);

  const filteredFeed = activeFilter === 'ALL' 
    ? feedItems 
    : feedItems.filter(item => item.city === activeFilter || item.type === 'transit'); 
    
  const filteredMedia = activeFilter === 'ALL'
    ? allMedia
    : allMedia.filter(m => m.city === activeFilter);

  const handleUploadClick = (eventId) => {
    setUploadingEventId(eventId);
    setShowUploadPicker(false);
    setTimeout(() => fileInputRef.current?.click(), 100);
  };

  const handleFileSelect = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !uploadingEventId) return;
    try {
      const formData = new FormData();
      Array.from(files).forEach(f => formData.append('files', f));
      await axios.post(`${API_BASE}/events/${uploadingEventId}/media`, formData);
      onRefresh(); 
      setUploadingEventId(null);
      e.target.value = '';
    } catch (err) {
      console.error("Upload failed", err);
      alert("Upload failed");
    }
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({ note: '', cost: '' });
  const [prepItems, setPrepItems] = useState([]); // Preparation items from relational DB
  
  // Sync data on refresh or trip change
  useEffect(() => {
    if (trip) {
        setEditValues({
            note: trip.note || "",
            cost: trip.cost != null ? trip.cost.toString() : (stats?.totalCost || '0')
        });
        fetchPrepItems();
    }
  }, [trip, stats?.totalCost]);

  const fetchPrepItems = async () => {
    try {
        const res = await axios.get(`${API_BASE}/events/trips/${trip.id}/preparations`);
        setPrepItems(res.data);
    } catch (err) {
        console.error("Failed to fetch prep items", err);
    }
  };

  const handleTogglePrep = async (item) => {
      try {
          await axios.patch(`${API_BASE}/events/preparations/${item.id}`, {
              is_checked: !item.is_checked
          });
          fetchPrepItems(); // Silent refresh
      } catch (err) {
          console.error("Failed to toggle item", err);
      }
  };

  const handleAddPrep = async (itemName, category = 'Packing') => {
      if (!itemName.trim()) return;
      try {
          await axios.post(`${API_BASE}/events/trips/${trip.id}/preparations`, {
              item_name: itemName,
              category: category,
              is_checked: false
          });
          fetchPrepItems();
      } catch (err) {
          console.error("Add failed", err);
      }
  };

  const handleDeletePrep = async (id) => {
      try {
          await axios.delete(`${API_BASE}/events/preparations/${id}`);
          fetchPrepItems();
      } catch (err) {
          console.error("Delete failed", err);
      }
  };


  const handleSaveOverview = async () => {
      try {
          await axios.patch(`${API_BASE}/events/trips/${trip.id}`, {
              note: editValues.note,
              cost: parseFloat(editValues.cost || 0)
          });
          setIsEditing(false);
          onRefresh(); // Trigger App-level re-fetch to update derived 'selectedTrip'
      } catch (err) {
          console.error("Failed to save trip details", err);
          alert("Failed to save changes.");
      }
  };

  // --- Render Gallery: Masonry Layout ---


  return (
    <div className="trip-dashboard-overlay">
       <div className="trip-dashboard-container">
          {/* ... Hero & Tabs (Unchanged) ... */}
          <div className="dashboard-hero compact" style={{backgroundImage: heroImage ? `url(${heroImage})` : 'none'}}>
             <div className="hero-overlay-gradient"></div>
             <button className="close-dashboard-btn" onClick={onClose}><X /></button>
             
             <div className="hero-content compact-layout">
                <h1 className="trip-title small">{trip.title}</h1>
                <div className="trip-period small">
                   <span className="status-badge small">COMPLETED</span>
                   <span className="divider">|</span>
                   <Calendar size={14} /> 
                   <span>
                      {stats?.startDate.toLocaleDateString(undefined, {year:'numeric', month:'short', day:'numeric'})} 
                      {' - '} 
                      {stats?.endDate.toLocaleDateString(undefined, {year:'numeric', month:'short', day:'numeric'})}
                   </span>
                </div>
             </div>
          </div>

          <div className="dashboard-nav-bar glass-panel">
              <div className="nav-tabs center-tabs">
                  <button className={`nav-tab ${activeTab === 'prep' ? 'active' : ''}`} onClick={() => setActiveTab('prep')}>
                     <Plus size={16}/> PREPARATION
                  </button>
                 <button className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
                    <Activity size={16}/> OVERVIEW
                 </button>
                 <button className={`nav-tab ${activeTab === 'feed' ? 'active' : ''}`} onClick={() => setActiveTab('feed')}>
                    <ListIcon size={16}/> JOURNEY
                 </button>
                 <button className={`nav-tab ${activeTab === 'gallery' ? 'active' : ''}`} onClick={() => setActiveTab('gallery')}>
                    <Grid size={16}/> GALLERY
                 </button>
              </div>
              {/* Filters ... */}
              {activeTab !== 'overview' && (
                  <div className="nav-filters">
                     <button 
                        className={`filter-chip ${activeFilter === 'ALL' ? 'active' : ''}`}
                        onClick={() => { setActiveFilter('ALL'); onFocusLocation(null); }}
                     >
                        ALL
                     </button>
                     {cities.map(c => (
                        <button 
                           key={c} 
                           className={`filter-chip ${activeFilter === c ? 'active' : ''}`}
                           onClick={() => { 
                               setActiveFilter(c); 
                               const event = trip.events.find(e => e.to_name === c);
                               if (event) onFocusLocation(event.to_lat, event.to_lng);
                           }}
                        >
                           {c}
                        </button>
                     ))}
                  </div>
              )}
          </div>

          <div className="dashboard-content">
              {activeTab === 'prep' && (
                  <TripPreparation 
                      items={prepItems} 
                      onToggle={handleTogglePrep} 
                      onAdd={handleAddPrep} 
                      onDelete={handleDeletePrep} 
                  />
              )}
              {activeTab === 'overview' && (
                  <TripOverview
                      trip={trip}
                      stats={stats}
                      mediaCount={allMedia.length}
                      prepItems={prepItems}
                      cities={cities}
                      isEditing={isEditing}
                      editValues={editValues}
                      setEditValues={setEditValues}
                      setIsEditing={setIsEditing}
                      onSave={handleSaveOverview}
                  />
              )}
              {activeTab === 'feed' && (
                  <TripJourney 
                      feedItems={filteredFeed} 
                      onUploadClick={handleUploadClick} 
                      trip={trip}
                  />
              )}
              {activeTab === 'gallery' && (
                  <TripGallery 
                      media={filteredMedia} 
                      activeFilter={activeFilter} 
                      onImageClick={(url) => setHeroImage(url)} 
                  />
              )}
          </div>
          
          <button className="fab-upload" onClick={() => setShowUploadPicker(!showUploadPicker)}>
             {showUploadPicker ? <X size={24}/> : <Plus size={24}/>}
          </button>
          
          {showUploadPicker && (
             <div className="upload-picker-menu glass-panel">
                <h4>Upload Destination</h4>
                {/* QUICK UPLOAD OPTION */}
                <button className="picker-item highlight" onClick={() => handleUploadClick(trip.events[0]?.id)}>
                    <Plus size={14} color="var(--primary)"/> Quick Upload (General)
                </button>
                <div className="picker-divider"></div>
                {stayEvents.map(stay => (
                   <button key={stay.id} className="picker-item" onClick={() => handleUploadClick(stay.data.id)}>
                      <MapPin size={14}/> {stay.city}
                   </button>
                ))}
             </div>
          )}
          
          <input 
             type="file" 
             ref={fileInputRef} 
             style={{display: 'none'}} 
             multiple 
             accept="image/*,video/*"
             onChange={handleFileSelect}
          />
       </div>
    </div>
  );
};

export default TripDashboard;
