import React, { useState } from 'react';
import { Plus, Trash2, Camera, MapPin, Calendar } from 'lucide-react';

const SimpleEventForm = ({ onAddSimpleTrip }) => {
  const [title, setTitle] = useState('');
  const [startCity, setStartCity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [returnDate, setReturnDate] = useState('');
  const [legs, setLegs] = useState([{ city_name: '', arrival_date: '', files: [] }]);

  const addLeg = () => {
    setLegs([...legs, { city_name: '', arrival_date: '', files: [] }]);
  };

  const removeLeg = (index) => {
    setLegs(legs.filter((_, i) => i !== index));
  };

  const updateLeg = (index, field, value) => {
    const newLegs = [...legs];
    newLegs[index][field] = value;
    setLegs(newLegs);
  };

  const handleFileChange = (index, files) => {
    const newLegs = [...legs];
    newLegs[index].files = [...files];
    setLegs(newLegs);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const finalLegs = [...legs];
    let returnFiles = [];
    
    if (isRoundTrip && returnDate) {
      finalLegs.push({ 
        city_name: startCity, 
        arrival_date: returnDate,
        files: [] 
      });
    }

    onAddSimpleTrip({
      title,
      start_city: startCity,
      start_date: new Date(startDate).toISOString(),
      legs: finalLegs.map(l => ({
        city_name: l.city_name,
        arrival_date: new Date(l.arrival_date).toISOString()
      }))
    }, finalLegs.map(l => l.files));
  };

  return (
    <form className="event-form glass-panel simple-itinerary" onSubmit={handleSubmit} style={{ width: '400px', maxHeight: '80vh', overflowY: 'auto' }}>
      <h3>CREATE NEW ODYSSEY</h3>
      <p style={{ fontSize: '10px', opacity: 0.7, marginBottom: '15px' }}>SIMPLIFIED FLIGHT PLANNING SYSTEM</p>
      
      <div className="form-section">
        <label><MapPin size={12}/> DEPARTURE</label>
        <div className="trip-type-toggle">
          <button type="button" className={!isRoundTrip ? 'active' : ''} onClick={() => setIsRoundTrip(false)}>ONE WAY</button>
          <button type="button" className={isRoundTrip ? 'active' : ''} onClick={() => setIsRoundTrip(true)}>ROUND TRIP</button>
        </div>
        <input type="text" placeholder="Start City (e.g. Seoul)" value={startCity} onChange={e => setStartCity(e.target.value)} required />
        <div className="date-group">
          <div className="field">
            <span>START</span>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
          </div>
          {isRoundTrip && (
            <div className="field">
              <span>RETURN</span>
              <input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} required />
            </div>
          )}
        </div>
      </div>

      <div className="form-section">
        <label><Calendar size={12}/> ITINERARY LEGS</label>
        {legs.map((leg, index) => (
          <div key={index} className="leg-item glass-panel">
            <div className="leg-header">
              <span>LEG #{index + 1}</span>
              {legs.length > 1 && <button type="button" onClick={() => removeLeg(index)}><Trash2 size={14}/></button>}
            </div>
            <input 
              type="text" 
              placeholder="Destination City" 
              value={leg.city_name} 
              onChange={e => updateLeg(index, 'city_name', e.target.value)} 
              required 
            />
            <input 
              type="date" 
              value={leg.arrival_date} 
              onChange={e => updateLeg(index, 'arrival_date', e.target.value)} 
              required 
            />
            <div className="leg-media">
               <label className="file-label">
                 <Camera size={14} /> {leg.files.length > 0 ? `${leg.files.length} PHOTOS` : 'ADD PHOTOS'}
                 <input type="file" multiple hidden onChange={e => handleFileChange(index, e.target.files)} />
               </label>
            </div>
          </div>
        ))}
        <button type="button" className="add-leg-btn" onClick={addLeg}><Plus size={14}/> ADD STOP</button>
      </div>

      <input 
        type="text" 
        className="trip-title-input"
        placeholder="Trip Title (e.g. 2024 Europe Tour)" 
        value={title} 
        onChange={e => setTitle(e.target.value)} 
        required 
      />

      <button type="submit" className="pano-btn">INITIALIZE FLIGHT PATH</button>
    </form>
  );
};

export default SimpleEventForm;
