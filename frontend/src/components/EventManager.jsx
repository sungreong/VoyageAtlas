import React, { useState, useEffect } from 'react';
import { Trash2, X, Image as ImageIcon, MapPin, ChevronDown, ChevronRight, Calendar, ArrowUpDown, Globe } from 'lucide-react';
import axios from 'axios';
import './EventManager.css';
import { calculateDistance, formatDistance } from '../utils';

const API_BASE = '/api';

const EventManager = ({ events: propEvents, onClose, onRefresh, onSelectTrip }) => {
  // We ignore propEvents for the main list and fetch grouped data
  const [trips, setTrips] = useState([]);
  const [sortMode, setSortMode] = useState('date_desc'); // date_desc, date_asc, created_desc

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

  // Helper to get trip start date
  const getTripDate = (trip) => {
    if (trip.events && trip.events.length > 0) {
        return new Date(trip.events[0].start_datetime);
    }
    return new Date(trip.created_at); // Fallback
  };

  const getTripTotalDistance = (trip) => {
      if (!trip.events) return 0;
      let total = 0;
      trip.events.forEach(ev => {
          total += calculateDistance(ev.from_lat, ev.from_lng, ev.to_lat, ev.to_lng);
      });
      return total;
  };

  const sortedTrips = [...trips].sort((a, b) => {
      if (sortMode === 'created_desc') {
          return new Date(b.created_at) - new Date(a.created_at);
      }
      if (sortMode === 'date_desc') {
          return getTripDate(b) - getTripDate(a);
      }
      if (sortMode === 'date_asc') {
          return getTripDate(a) - getTripDate(b);
      }
      return 0;
  });

  const toggleSort = () => {
      const modes = ['date_desc', 'date_asc', 'created_desc'];
      const nextIndex = (modes.indexOf(sortMode) + 1) % modes.length;
      setSortMode(modes[nextIndex]);
  };

  const getSortLabel = () => {
      switch(sortMode) {
          case 'date_desc': return 'Latest Travel';
          case 'date_asc': return 'Oldest Travel';
          case 'created_desc': return 'Recently Created';
          default: return 'Sort';
      }
  };

  return (
    <div className="manager-overlay glass-panel">
      <div className="manager-header">
        <h2>JOURNEY LOG</h2>
        <div className="manager-actions">
          <button className="sort-btn" onClick={toggleSort} title="Change Sort Order">
            <ArrowUpDown size={14} style={{marginRight: 6}}/>
            {getSortLabel()}
          </button>
          <div className="divider-vertical"></div>
          <button className="delete-all-btn" onClick={handleDeleteAll}>DELETE ALL</button>
          <button className="close-btn" onClick={onClose}><X /></button>
        </div>
      </div>
      
      <div className="event-list">
        {sortedTrips.length === 0 && <p className="empty-msg">No journey logs found. Start by adding a travel!</p>}
        
        {sortedTrips.map((trip) => (
          <div key={trip.id} className="trip-group-container hover-effect" onClick={() => onSelectTrip(trip)}>
            <div className="trip-header">
              <div className="trip-title-section">
                <ChevronRight size={16} />
                <span className="trip-title">{trip.title || `Trip #${trip.id}`}</span>
                <span className="trip-date">
                   <Calendar size={12} style={{marginRight: 4}}/>
                   {getTripDate(trip).toLocaleDateString()}
                </span>
                <span className="trip-badges">
                    <span className="trip-badge">{trip.events.length} LEGS</span>
                    <span className="trip-distance-badge">
                        <Globe size={10} style={{marginRight:3}}/>
                        {formatDistance(getTripTotalDistance(trip))} KM
                    </span>
                </span>
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
