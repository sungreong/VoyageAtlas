import React, { useState, useEffect } from 'react';
import { Trash2, X, Image as ImageIcon, MapPin, ChevronDown, ChevronRight, Calendar } from 'lucide-react';
import axios from 'axios';

const API_BASE = '/api';

const EventManager = ({ events: propEvents, onClose, onRefresh, onSelectTrip }) => {
  // We ignore propEvents for the main list and fetch grouped data
  const [trips, setTrips] = useState([]);
  // const [expandedTrips, setExpandedTrips] = useState({}); // No longer expanding inline

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      const res = await axios.get(`${API_BASE}/events/trips`);
      setTrips(res.data);
    } catch (err) {
      console.error("Failed to fetch trips", err);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("WARNING: This will delete ALL travel data (All Trips). Continue?")) return;
    try {
      await axios.delete(`${API_BASE}/events/all/clear`);
      fetchTrips();
      onRefresh();
      onClose();
    } catch (err) {
      console.error("Bulk delete failed", err);
    }
  };

  return (
    <div className="manager-overlay glass-panel">
      <div className="manager-header">
        <h2>JOURNEY LOG</h2>
        <div className="manager-actions">
          <button className="delete-all-btn" onClick={handleDeleteAll}>DELETE ALL</button>
          <button className="close-btn" onClick={onClose}><X /></button>
        </div>
      </div>
      
      <div className="event-list">
        {trips.length === 0 && <p className="empty-msg">No journey logs found. Start by adding a travel!</p>}
        
        {trips.map((trip) => (
          <div key={trip.id} className="trip-group-container hover-effect" onClick={() => onSelectTrip(trip)}>
            <div className="trip-header">
              <div className="trip-title-section">
                <ChevronRight size={16} />
                <span className="trip-title">{trip.title || `Trip #${trip.id}`}</span>
                <span className="trip-date">
                   <Calendar size={12} style={{marginRight: 4}}/>
                   {new Date(trip.created_at).toLocaleDateString()}
                </span>
                <span className="trip-badge">{trip.events.length} LEGS</span>
              </div>
            </div>
            {/* We no longer show inline expanded events details here. 
                User must click to open the TripDetailModal. */}
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventManager;
