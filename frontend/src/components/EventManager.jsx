import React from 'react';
import { Trash2, X, Image as ImageIcon, MapPin } from 'lucide-react';
import axios from 'axios';

const API_BASE = '/api';

const EventManager = ({ events, onClose, onRefresh }) => {
  const handleDeleteEvent = async (id) => {
    if (!window.confirm("Are you sure you want to delete this event?")) return;
    try {
      await axios.delete(`${API_BASE}/events/${id}`);
      onRefresh();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("WARNING: This will delete ALL travel data. Continue?")) return;
    try {
      await axios.delete(`${API_BASE}/events/all/clear`);
      onRefresh();
      onClose();
    } catch (err) {
      console.error("Bulk delete failed", err);
    }
  };

  const handleDeleteMedia = async (mediaId) => {
    try {
      await axios.delete(`${API_BASE}/events/media/${mediaId}`);
      onRefresh();
    } catch (err) {
      console.error("Media delete failed", err);
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
        {events.length === 0 && <p className="empty-msg">No journey logs found. Start by adding a travel!</p>}
        {events.map((event) => (
          <div key={event.id} className="event-item glass-panel">
            <div className="event-info">
              <h4>{event.title}</h4>
              <p><MapPin size={14} /> {event.from_name} → {event.to_name}</p>
              <div className="event-media-list">
                {event.media_list?.map(m => (
                  <div key={m.id} className="media-chip">
                    <ImageIcon size={14} />
                    <button className="del-media" onClick={() => handleDeleteMedia(m.id)}>×</button>
                  </div>
                ))}
              </div>
            </div>
            <button className="del-event-btn" onClick={() => handleDeleteEvent(event.id)}>
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventManager;
