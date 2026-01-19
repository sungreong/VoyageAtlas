import React, { useState, useEffect } from 'react';

const EventForm = ({ onAddEvent, initialData }) => {
  const [formData, setFormData] = useState({
    title: '',
    from_name: '',
    to_name: '',
    from_lat: initialData?.from_lat || '',
    from_lng: initialData?.from_lng || '',
    to_lat: initialData?.to_lat || '',
    to_lng: initialData?.to_lng || '',
    start_datetime: '',
  });
  const [selectedFiles, setSelectedFiles] = useState([]);

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onAddEvent({
      ...formData,
      from_lat: parseFloat(formData.from_lat),
      from_lng: parseFloat(formData.from_lng),
      to_lat: parseFloat(formData.to_lat),
      to_lng: parseFloat(formData.to_lng),
      start_datetime: new Date(formData.start_datetime).toISOString()
    }, selectedFiles); // Pass files separately
    
    setFormData({
      title: '', from_name: '', to_name: '',
      from_lat: '', from_lng: '', to_lat: '', to_lng: '',
      start_datetime: ''
    });
    setSelectedFiles([]);
  };

  return (
    <form className="event-form glass-panel" onSubmit={handleSubmit}>
      <h3>ADD NEW TRAVEL</h3>
      <input type="text" placeholder="Trip Title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
      <div className="form-row">
        <input type="text" placeholder="From (ICN)" value={formData.from_name} onChange={e => setFormData({...formData, from_name: e.target.value})} />
        <input type="text" placeholder="To (NRT)" value={formData.to_name} onChange={e => setFormData({...formData, to_name: e.target.value})} />
      </div>
      <div className="form-row">
        <input type="number" step="any" placeholder="From Lat" value={formData.from_lat} onChange={e => setFormData({...formData, from_lat: e.target.value})} required />
        <input type="number" step="any" placeholder="From Lng" value={formData.from_lng} onChange={e => setFormData({...formData, from_lng: e.target.value})} required />
      </div>
      <div className="form-row">
        <input type="number" step="any" placeholder="To Lat" value={formData.to_lat} onChange={e => setFormData({...formData, to_lat: e.target.value})} required />
        <input type="number" step="any" placeholder="To Lng" value={formData.to_lng} onChange={e => setFormData({...formData, to_lng: e.target.value})} required />
      </div>
      <input type="datetime-local" value={formData.start_datetime} onChange={e => setFormData({...formData, start_datetime: e.target.value})} required />
      
      <div className="file-input-container">
        <label>Upload Media (Images/Panoramas):</label>
        <input type="file" multiple accept="image/*" onChange={e => setSelectedFiles([...e.target.files])} />
        {selectedFiles.length > 0 && <span className="file-count">{selectedFiles.length} files selected</span>}
      </div>

      <button type="submit" className="pano-btn">ADD EVENT</button>
    </form>
  );
};

export default EventForm;
