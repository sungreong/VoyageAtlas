import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Calendar, MapPin, Camera, Plane, Clock, Plus, ArrowRight, Moon, Grid, List as ListIcon, Share2, DollarSign, Activity, Edit } from 'lucide-react';
import axios from 'axios';
import './TripDashboard.css'; 
import '../App.css'; 

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

  // --- Render Preparation Logic ---
  const renderPreparation = () => {
    const categories = ['Documents', 'Packing', 'Finance', 'Tasks'];
    const readiness = prepItems.length > 0 
        ? Math.round((prepItems.filter(i => i.is_checked).length / prepItems.length) * 100) 
        : 0;

    return (
        <div className="preparation-tab-content">
            <div className="prep-readiness-hud glass-panel">
                <div className="hud-label">PRE-FLIGHT READINESS</div>
                <div className="progress-bar-wrap">
                    <div className="progress-fill" style={{width: `${readiness}%`}}></div>
                    {readiness > 0 && <span className="percent">{readiness}% Complete</span>}
                </div>
            </div>

            <div className="prep-grid">
                {categories.map(cat => (
                    <div key={cat} className="prep-category-card glass-panel">
                        <div className="category-header">
                           <h3>{cat.toUpperCase()}</h3>
                           <span className="count-badge">{prepItems.filter(i => i.category === cat).length}</span>
                        </div>
                        
                        <div className="prep-items-list">
                            {prepItems.filter(i => i.category === cat).map(item => (
                                <div key={item.id} className={`prep-item ${item.is_checked ? 'checked' : ''}`}>
                                    <div className="check-box" onClick={() => handleTogglePrep(item)}>
                                        {item.is_checked && <Activity size={14}/>}
                                    </div>
                                    <span className="name">{item.item_name}</span>
                                    <button className="delete-mini" onClick={() => handleDeletePrep(item.id)}>
                                        <X size={14}/>
                                    </button>
                                 </div>
                            ))}
                            {prepItems.filter(i => i.category === cat).length === 0 && (
                                <div className="empty-category-hint">
                                    Ready to be filled
                                </div>
                            )}
                        </div>
                        <div className="prep-add-row">
                            <input 
                                type="text" 
                                placeholder={`+ New ${cat} item...`} 
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.target.value.trim()) {
                                        handleAddPrep(e.target.value, cat);
                                        e.target.value = '';
                                    }
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>
            
            {prepItems.length === 0 && (
                <div className="prep-empty-state-hero glass-panel">
                    <div className="hero-icon"><Calendar size={48} opacity={0.2}/></div>
                    <h2>The journey begins with preparation.</h2>
                    <p>Start adding documents, packing lists, and financial tasks to ensure a smooth trip.</p>
                </div>
            )}
        </div>
    );
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
  const renderGallery = () => (
    <div className="gallery-tab-content">
       <div className="gallery-filter-bar">
          <button 
            className={`filter-pill ${activeFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveFilter('ALL')}
          >
            All Memories
          </button>
          {cities.map(c => (
            <button 
              key={c}
              className={`filter-pill ${activeFilter === c ? 'active' : ''}`}
              onClick={() => setActiveFilter(c)}
            >
              {c}
            </button>
          ))}
       </div>

       {filteredMedia.length === 0 ? (
          <div className="empty-state glass-panel">
             <Camera size={48} opacity={0.3}/>
             <p>No memories captured here yet.</p>
          </div>
       ) : (
          <div className="masonry-grid">
             {/* Simple Masonry: 3 Columns logic */}
             {[0, 1, 2].map(colIdx => (
                <div key={colIdx} className="masonry-column">
                   {filteredMedia.filter((_, i) => i % 3 === colIdx).map(m => (
                      <div key={m.id} className="masonry-item glass-panel" onClick={() => setHeroImage(m.url)}>
                         <img src={m.url} alt="Travel memory" loading="lazy" />
                         <div className="masonry-overlay">
                            <span className="masonry-city">{m.city}</span>
                         </div>
                      </div>
                   ))}
                </div>
             ))}
          </div>
       )}
    </div>
  );

  // Render Overview Logic
  const renderOverview = () => {
    const checkedCount = prepItems.filter(i => i.is_checked).length;
    const totalPrep = prepItems.length;

    return (
      <div className="overview-tab-content">
         <div className="overview-stats-row">
            <div className="stat-card-compact">
               <div className="stat-icon-small"><Calendar size={20}/></div>
               <div className="stat-info-compact">
                  <span className="val">{stats?.days}</span>
                  <span className="lbl">Days</span>
               </div>
            </div>
            <div className="stat-card-compact">
               <div className="stat-icon-small"><MapPin size={20}/></div>
               <div className="stat-info-compact">
                  <span className="val">{stats?.cityCount}</span>
                  <span className="lbl">Cities</span>
               </div>
            </div>
            <div className="stat-card-compact">
               <div className="stat-icon-small"><Camera size={20}/></div>
               <div className="stat-info-compact">
                  <span className="val">{allMedia.length}</span>
                  <span className="lbl">Photos</span>
               </div>
            </div>
            <div className="stat-card-compact cost-highlight">
               <div className="stat-icon-small"><DollarSign size={20}/></div>
               <div className="stat-info-compact">
                  {isEditing ? (
                      <input 
                         type="number" 
                         className="cost-field-simple"
                         style={{width: '80px', fontSize: '1.2rem'}}
                         value={editValues.cost}
                         onChange={e => setEditValues({...editValues, cost: e.target.value})}
                      />
                  ) : (
                      <span className="val">${parseFloat(editValues.cost || 0).toLocaleString()}</span>
                  )}
                  <span className="lbl">Budget</span>
               </div>
            </div>
         </div>

         <div className="overview-grid-main">
           {/* Primary: Trip Reflection */}
           <div className="overview-main-column">
              <div className="overview-card glass-panel reflection-box-v2">
                 <div className="card-header-with-action">
                    <h2 className="premium-header">Trip Reflection</h2>
                    {!isEditing && (
                        <button className="edit-icon-btn" onClick={() => setIsEditing(true)}>
                           <Edit size={16}/>
                        </button>
                    )}
                 </div>
                 
                 <div className="reflection-display">
                    {isEditing ? (
                        <textarea 
                           className="reflection-editor"
                           value={editValues.note}
                           placeholder="Describe your journey... The sights, the sounds, the feelings."
                           onChange={e => setEditValues({...editValues, note: e.target.value})}
                        />
                    ) : (
                        <div className="reflection-text-wrapper">
                           <p className={!editValues.note ? "empty-reflection" : "rich-reflection"}>
                              {editValues.note || "Every journey tells a story. Click the edit icon to share your reflections on this adventure."}
                           </p>
                        </div>
                    )}
                 </div>

                 {isEditing && (
                    <div className="editor-controls">
                       <button className="save-btn primary" onClick={handleSaveOverview}>SAVE NOTES</button>
                       <button className="cancel-btn" onClick={() => setIsEditing(false)}>DISCARD</button>
                    </div>
                 )}
              </div>
           </div>

           {/* Sidebar: Stats & Route */}
           <div className="overview-sidebar">
               {/* Preparation Summary Snapshot */}
               <div className="overview-card glass-panel prep-summary-snapshot" style={{padding: '25px', marginBottom: '30px'}}>
                  <h3 className="sidebar-label">PREPARATION</h3>
                  <div style={{marginTop: '15px'}}>
                     <div style={{display:'flex', justifyContent:'space-between', marginBottom: '8px'}}>
                        <span style={{fontSize:'0.7rem', color: 'var(--text-muted)'}}>{checkedCount}/{totalPrep} Items Ready</span>
                        <span style={{fontSize:'0.7rem', color: 'var(--primary)'}}>{totalPrep > 0 ? Math.round((checkedCount/totalPrep)*100) : 0}%</span>
                     </div>
                     <div className="progress-bar-wrap" style={{height:'3.5px'}}>
                        <div className="progress-fill" style={{width: `${totalPrep > 0 ? (checkedCount/totalPrep)*100 : 0}%`}}></div>
                     </div>
                  </div>
               </div>

              <div className="overview-card glass-panel route-card-v2">
                 <h3 className="sidebar-label">YOUR ROUTE</h3>
                 <div className="compact-route-list">
                    <div className="route-stop start">
                       <div className="stop-marker"></div>
                       <span>{trip.events[0]?.from_name}</span>
                    </div>
                    {cities.map((city, idx) => (
                       <React.Fragment key={city}>
                          <div className="route-link-line"></div>
                          <div className="route-stop">
                             <div className="stop-marker active"></div>
                             <span>{city}</span>
                          </div>
                       </React.Fragment>
                    ))}
                 </div>
              </div>
            </div>
         </div>
      </div>
    );
  };

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
              {activeTab === 'prep' && renderPreparation()}
              {activeTab === 'overview' && renderOverview()}
              {activeTab === 'feed' && (
                 <div className="feed-stream">
                    {/* ... System Start ... */}
                    <div className="feed-node system">
                       <div className="node-line"></div>
                       <div className="node-dot start"></div>
                       <div className="node-content">
                          <span>Trip Started from <strong>{trip.events[0]?.from_name}</strong></span>
                       </div>
                    </div>
                    {/* Items */}
                    {filteredFeed.map((item, idx) => (
                       <React.Fragment key={item.id}>
                          {item.type === 'transit' ? (
                             <div className="feed-node transit">
                                <div className="node-line"></div>
                                <div className="transit-card glass-panel">
                                   <div className="transit-icon"><Plane size={16}/></div>
                                   <div className="transit-info">
                                      <span className="transit-route">Flight to {item.data.to_name}</span>
                                      <span className="transit-meta">{new Date(item.data.start_datetime).toLocaleDateString()}</span>
                                   </div>
                                </div>
                             </div>
                          ) : (
                             <div className="feed-node stay">
                                <div className="node-line"></div>
                                <div className="stay-card glass-panel">
                                   <div className="stay-header">
                                      <div>
                                         <h2>{item.city}</h2>
                                         <div className="stay-meta">
                                            <span className="nights-badge"><Moon size={12}/> {item.duration} Nights</span>
                                            <span>{new Date(item.data.start_datetime).toLocaleDateString()} — {item.endDate ? item.endDate.toLocaleDateString() : 'End'}</span>
                                         </div>
                                      </div>
                                      <button className="add-memories-btn" onClick={() => handleUploadClick(item.data.id)}>
                                         <Plus size={14}/> Add
                                      </button>
                                   </div>
                                   <div className="stay-gallery-grid">
                                      {item.media.map((m, mIdx) => (
                                         <div key={m.id} className="stay-media-thumb">
                                            <img src={m.url} loading="lazy" />
                                         </div>
                                      ))}
                                      {item.media.length === 0 && (
                                         <div className="empty-stay-placeholder" onClick={() => handleUploadClick(item.data.id)}>
                                            <Camera size={20}/>
                                            <span>Add photos for {item.city}</span>
                                         </div>
                                      )}
                                   </div>
                                   <div className="stay-note-input">
                                      <input type="text" placeholder={`Write a note about ${item.city}...`} />
                                   </div>
                                </div>
                             </div>
                          )}
                       </React.Fragment>
                    ))}
                    <div className="feed-node end"><div className="node-dot end"></div><div className="node-content"><span>Trip Completed</span></div></div>
                 </div>
              )}
              {activeTab === 'gallery' && (
                 <div className="unified-gallery">
                    {filteredMedia.length === 0 ? (
                       <div className="empty-state">
                          <Camera size={48} opacity={0.3}/>
                          <p>No photos found for {activeFilter === 'ALL' ? 'this trip' : activeFilter}.</p>
                       </div>
                    ) : (
                       <div className="masonry-grid">
                          {filteredMedia.map(m => (
                             <div key={m.id} className="masonry-item">
                                <img src={m.url} loading="lazy" />
                                <div className="masonry-overlay">
                                   <span className="loc-tag"><MapPin size={10}/> {m.city}</span>
                                </div>
                             </div>
                          ))}
                       </div>
                    )}
                 </div>
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
