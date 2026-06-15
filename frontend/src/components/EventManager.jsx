import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, X, Calendar, ArrowUpDown, Globe, Route, ArrowRight } from 'lucide-react';
import axios from 'axios';
import './EventManager.css';
import { calculateDistance, formatDistance } from '../utils';
import { API_BASE } from '../api/client';

const EventManager = ({ onClose, onRefresh, onSelectTrip }) => {
  // We ignore propEvents for the main list and fetch grouped data
  const [trips, setTrips] = useState([]);
  const [sortKey, setSortKey] = useState('start');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    if (typeof window === 'undefined') return 8;
    if (window.innerHeight <= 760) return 6;
    if (window.innerHeight <= 920) return 8;
    return 10;
  });

  useEffect(() => {
    fetchTrips();
  }, []);

  useEffect(() => {
    const syncPageSize = () => {
      const nextSize = window.innerHeight <= 760 ? 6 : window.innerHeight <= 920 ? 8 : 10;
      setPageSize(nextSize);
    };

    syncPageSize();
    window.addEventListener('resize', syncPageSize);
    return () => window.removeEventListener('resize', syncPageSize);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [sortKey, sortDirection, trips.length, pageSize]);

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

  const handleDeleteTrip = async (e, tripId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this trip and all its events?")) return;
    try {
        await axios.delete(`${API_BASE}/events/trips/${tripId}`);
        setTrips(trips.filter(t => t.id !== tripId));
        onRefresh();
    } catch (err) {
        console.error("Failed to delete trip", err);
        alert("Failed to delete trip. Please try again.");
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

  const getTripEndDate = (trip) => {
    if (trip.events && trip.events.length > 0) {
      return new Date(trip.events[trip.events.length - 1].start_datetime);
    }
    return new Date(trip.created_at);
  };

  const getTripRoute = (trip) => {
    if (!trip.events || trip.events.length === 0) return 'No route yet';
    const first = trip.events[0];
    const last = trip.events[trip.events.length - 1];
    return `${first.from_name} -> ${last.to_name}`;
  };

  const formatDate = (value) => {
    const date = new Date(value);
    return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.`;
  };

  const formatDateRange = (trip) => {
    const start = getTripDate(trip);
    const end = getTripEndDate(trip);
    if (start.toDateString() === end.toDateString()) return formatDate(start);
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  const sortedTrips = useMemo(() => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...trips].sort((a, b) => {
      let aValue;
      let bValue;

      switch (sortKey) {
        case 'created':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'title':
          return direction * (a.title || '').localeCompare(b.title || '');
        case 'legs':
          aValue = a.events?.length || 0;
          bValue = b.events?.length || 0;
          break;
        case 'distance':
          aValue = getTripTotalDistance(a);
          bValue = getTripTotalDistance(b);
          break;
        case 'start':
        default:
          aValue = getTripDate(a).getTime();
          bValue = getTripDate(b).getTime();
          break;
      }

      if (aValue === bValue) {
        return new Date(b.created_at) - new Date(a.created_at);
      }
      return direction * (aValue - bValue);
    });
  }, [trips, sortKey, sortDirection]);

  const tripCount = sortedTrips.length;
  const legCount = sortedTrips.reduce((sum, trip) => sum + (trip.events?.length || 0), 0);
  const totalPages = Math.max(1, Math.ceil(sortedTrips.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const paginatedTrips = sortedTrips.slice(pageStart, pageStart + pageSize);
  const pageLabelStart = sortedTrips.length === 0 ? 0 : pageStart + 1;
  const pageLabelEnd = Math.min(pageStart + pageSize, sortedTrips.length);

  return (
    <div className="manager-overlay glass-panel">
      <div className="manager-header">
        <div className="manager-title-block">
          <h2>JOURNEY LOG</h2>
          <span>{tripCount} odysseys / {legCount} legs</span>
        </div>
        <div className="manager-actions">
          <label className="sort-field" title="Sort journey log">
            <ArrowUpDown size={14} />
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
              <option value="start">Travel date</option>
              <option value="created">Created date</option>
              <option value="distance">Distance</option>
              <option value="legs">Leg count</option>
              <option value="title">Title</option>
            </select>
          </label>
          <button
            className="sort-direction-btn"
            onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
            title="Toggle sort direction"
          >
            {sortDirection === 'asc' ? 'ASC' : 'DESC'}
          </button>
          <div className="divider-vertical"></div>
          <button className="delete-all-btn" onClick={handleDeleteAll}>DELETE ALL</button>
          <button className="close-btn" onClick={onClose}><X /></button>
        </div>
      </div>
      
      <div className="manager-table">
        <div className="manager-table-head" aria-hidden="true">
          <span>No</span>
          <span>Odyssey</span>
          <span>Route</span>
          <span>Period</span>
          <span>Legs</span>
          <span>Distance</span>
          <span>Actions</span>
        </div>

        <div className="event-list">
          {sortedTrips.length === 0 && <p className="empty-msg">No journey logs found. Start by adding a travel!</p>}

          {paginatedTrips.map((trip, index) => (
            <div key={trip.id} className="manager-table-row" onClick={() => onSelectTrip(trip)}>
              <span className="manager-cell index">{String(pageStart + index + 1).padStart(2, '0')}</span>
              <span className="manager-cell title" title={trip.title || `Trip #${trip.id}`}>
                {trip.title || `Trip #${trip.id}`}
              </span>
              <span className="manager-cell route" title={getTripRoute(trip)}>
                <Route size={13} />
                {getTripRoute(trip)}
              </span>
              <span className="manager-cell period">
                <Calendar size={12} />
                {formatDateRange(trip)}
              </span>
              <span className="manager-cell legs">{trip.events.length} LEGS</span>
              <span className="manager-cell distance">
                <Globe size={10} />
                {formatDistance(getTripTotalDistance(trip))} KM
              </span>
              <div className="manager-cell actions">
                <button
                  className="open-trip-btn"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTrip(trip);
                  }}
                  title="Open trip"
                >
                  <ArrowRight size={16} />
                </button>
                <button
                  className="delete-trip-btn"
                  type="button"
                  onClick={(e) => handleDeleteTrip(e, trip.id)}
                  title="Delete Trip"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {sortedTrips.length > pageSize && (
        <div className="manager-pagination" aria-label="Journey log pagination">
          <span className="page-range">{pageLabelStart}-{pageLabelEnd} / {sortedTrips.length}</span>
          <div className="page-controls">
            <button
              type="button"
              onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
              disabled={safePage === 1}
            >
              PREV
            </button>
            <span>{safePage} / {totalPages}</span>
            <button
              type="button"
              onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
              disabled={safePage === totalPages}
            >
              NEXT
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventManager;
