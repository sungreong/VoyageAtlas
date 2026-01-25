import React, { useState, useRef } from 'react';
import { X, Calendar, MapPin, Camera, Plane, Clock, Plus, ArrowRight, Moon } from 'lucide-react';
import axios from 'axios';
import './TripDetailModal.css';
import '../App.css'; 

const API_BASE = '/api';

const TripDetailModal = ({ trip, onClose, onRefresh, onViewMedia }) => {
  const [activeTab, setActiveTab] = useState('journal'); // 'journal'
  const fileInputRef = useRef(null);
  const [uploadingEventId, setUploadingEventId] = useState(null);

  // --- Logic: Transform Events into "Travel Journal" (Transits & Stays) ---
  const timelineItems = [];
  const events = trip.events;

  for (let i = 0; i < events.length; i++) {
    const currentEvent = events[i];
    const nextEvent = events[i + 1];

    // 1. Transit Item (The Flight/Move itself)
    timelineItems.push({
      type: 'transit',
      data: currentEvent,
      id: `transit-${currentEvent.id}`
    });

    // 2. Stay Item (The time spent at the destination)
    // If there is a next event, Stay Duration = Next Event Start - Current Event Start (approx arrival)
    // Note: We use StartDatetime of events.
    // Ideally: Arrival Time at B -> Departure Time from B.
    // Our model has `start_datetime` (Departure from Origin).
    // Arrival at Dest = Start + Flight Duration (approx). 
    // Departure from Dest = Next Event Start.
    
    // Simplification: Stay starts at "Arrival Date" (approx same day as flight for short haul)
    // Stay ends at Next Event Start.
    
    if (nextEvent) {
       const arrivalDate = new Date(currentEvent.start_datetime);
       const departureDate = new Date(nextEvent.start_datetime);
       const diffTime = Math.abs(departureDate - arrivalDate);
       const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
       
       timelineItems.push({
         type: 'stay',
         location: currentEvent.to_name,
         startDate: arrivalDate,
         endDate: departureDate,
         durationNights: diffDays, 
         media: currentEvent.media_list || [], // Associate media uploaded to the "Arrival Leg" with this Stay
         eventId: currentEvent.id, // ID to upload media to
         id: `stay-${currentEvent.id}`
       });
    } else {
       // Last Event Destination - Is it the end of trip (Home) or a final stay?
       // Use logic: If Destination == Start City of Trip, it's "Home Coming".
       // If distinct, it's a final stay (indefinite?).
       // Let's assume it's "Trip Completed" marker if return to start.
       // Or "Arrived at Destination" if one way.
       
       // For "Journal" feel, let's add a "Final Destination" card.
       timelineItems.push({
         type: 'stay',
         location: currentEvent.to_name,
         startDate: new Date(currentEvent.start_datetime),
         endDate: null,
         durationNights: null,
         isFinal: true,
         media: currentEvent.media_list || [],
         eventId: currentEvent.id,
         id: `stay-final-${currentEvent.id}`
       });
    }
  }

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
      
      await axios.post(`${API_BASE}/events/${uploadingEventId}/media`, formData);
      onRefresh(); 
      e.target.value = '';
      setUploadingEventId(null);
    } catch (err) {
      console.error("Upload failed", err);
      alert("Upload failed");
    }
  };

  return (
    <div className="odyssey-overlay">
      <div className="trip-detail-modal glass-panel journal-mode">
        {/* Header */}
        <div className="detail-header">
          <div className="detail-title-block">
            <h1>{trip.title}</h1>
            <div className="detail-meta">
              <span><Calendar size={14}/> {new Date(trip.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <button className="close-btn-ghost" onClick={onClose}><X /></button>
        </div>

        <div className="detail-content journal-container">
            {/* Start Marker */}
            <div className="journal-start-node">
                <div className="node-dot start"></div>
                <span>Trip Started from <strong>{trip.events[0]?.from_name}</strong></span>
            </div>

            {timelineItems.map((item, idx) => (
                <div key={item.id} className={`journal-item ${item.type}`}>
                    
                    {item.type === 'transit' && (
                        <div className="transit-connector-row">
                             <div className="timeline-spine"></div>
                             <div className="transit-chip glass-panel">
                                <Plane size={12} className="plane-icon"/> 
                                <span>Flight to <strong>{item.data.to_name}</strong></span>
                                <span className="transit-date">{new Date(item.data.start_datetime).toLocaleDateString()}</span>
                             </div>
                        </div>
                    )}

                    {item.type === 'stay' && (
                        <div className="stay-card-row">
                             <div className="timeline-spine"></div>
                             <div className="stay-card glass-panel selected">
                                <div className="stay-header">
                                    <div className="location-info">
                                        <h2>{item.location}</h2>
                                        <div className="stay-meta">
                                            {item.durationNights && (
                                                <span className="nights-badge"><Moon size={12}/> {item.durationNights} Nights</span>
                                            )}
                                            {item.startDate && <span className="stay-date">{item.startDate.toLocaleDateString()}</span>}
                                            {item.endDate && <span className="stay-date"> — {item.endDate.toLocaleDateString()}</span>}
                                        </div>
                                    </div>
                                    <button className="add-memories-btn" onClick={() => handleUploadClick(item.eventId)}>
                                        <Plus size={14}/> Add Memories
                                    </button>
                                </div>
                                
                                {/* Gallery for this location */}
                                <div className="stay-gallery">
                                    {item.media.length === 0 ? (
                                        <div className="empty-gallery-placeholder" onClick={() => handleUploadClick(item.eventId)}>
                                            <Camera size={24} opacity={0.5}/>
                                            <span>Document your stay in {item.location}</span>
                                        </div>
                                    ) : (
                                        <div className="journal-media-grid">
                                            {item.media.map((m, mIdx) => (
                                                <div key={m.id} className="journal-media-thumb" onClick={() => onViewMedia(item.media, mIdx)}>
                                                    <img src={m.url} loading="lazy"/>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                             </div>
                        </div>
                    )}
                </div>
            ))}
            
            {/* End Marker */}
            <div className="journal-end-node">
                <div className="node-dot end"></div>
                <span>End of Journey</span>
            </div>
        </div>

        {/* Hidden Input */}
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

export default TripDetailModal;
