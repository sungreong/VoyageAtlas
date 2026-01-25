import React, { useState } from 'react';
import axios from 'axios';
import { X, Edit2, Trash2, Calendar, Map, Film } from 'lucide-react';
import './DataManagement.css';
import EditEventModal from './EditEventModal';

const DataManagement = ({ events = [], onClose, onRefresh }) => {
  const [editingEvent, setEditingEvent] = useState(null);

  const handleDelete = async (eventId) => {
    if (window.confirm("Are you sure you want to delete this event? This action will remove all associated media.")) {
      try {
        await axios.delete(`/api/events/${eventId}`);
        onRefresh(); // Refresh parent list
      } catch (err) {
        console.error("Failed to delete event", err);
        alert("Failed to delete event.");
      }
    }
  };

  const handleSave = async (updatedEvent) => {
    try {
      const { id, title, start_datetime, from_name, to_name, note } = updatedEvent;
      // Construct payload with only editable fields to avoid schema issues
      const payload = {
        title,
        start_datetime,
        from_name,
        to_name,
        note
      };
      
      await axios.patch(`/api/events/${id}`, payload);
      setEditingEvent(null);
      onRefresh(); // Refresh parent list
    } catch (err) {
      console.error("Failed to update event", err);
      alert("Failed to update event.");
    }
  };

  // Helper to format date
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="data-management-overlay">
      <div className="data-management-container glass-panel">
        <div className="dm-header">
          <h2 className="neon-text-lg">VOYAGE DATA LOGS</h2>
          <button className="icon-btn-secondary" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="dm-table-wrapper custom-scrollbar">
          <table className="neon-table">
            <thead>
              <tr>
                <th>TRIP ID</th>
                <th>ID</th>
                <th>ROUTE</th>
                <th>DATE & TIME</th>
                <th>MEDIA</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="mono-font">{event.trip_id}</td>
                  <td className="mono-font">#{event.id}</td>
                  <td>
                    <div className="route-cell">
                      <span className="city-name">{event.from_name}</span>
                      <span className="arrow">→</span>
                      <span className="city-name">{event.to_name}</span>
                    </div>
                    <div className="event-title-sub">{event.title}</div>
                  </td>
                  <td className="mono-font">{formatDate(event.start_datetime)}</td>
                  <td>
                    <div className="media-badge">
                      <Film size={14} />
                      <span>{event.media_list ? event.media_list.length : 0}</span>
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="action-btn edit" 
                        onClick={() => setEditingEvent(event)}
                        title="Edit Event"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        className="action-btn delete" 
                        onClick={() => handleDelete(event.id)}
                        title="Delete Event"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                    NO DATA LOGS FOUND
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingEvent && (
        <EditEventModal 
          event={editingEvent} 
          onSave={handleSave} 
          onClose={() => setEditingEvent(null)} 
        />
      )}
    </div>
  );
};

export default DataManagement;
