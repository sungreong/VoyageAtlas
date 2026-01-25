import React, { useState, useRef } from 'react';
import { X, Calendar, MapPin, Plus, Camera, ArrowRight, Plane, Globe } from 'lucide-react';
import '../App.css'; 

// Aesthetic constants
const HUD_CYAN = '#00f3ff';
const HUD_DARK = 'rgba(10, 20, 30, 0.95)';

const CreateOdysseyModal = ({ onClose, onAddSimpleTrip }) => {
  const [tripType, setTripType] = useState('round'); // 'one-way' | 'round'
  const [startCity, setStartCity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [tripTitle, setTripTitle] = useState('');
  
  // Legs management
  // For Round Trip, we initially have 1 destination, but logic will handle return.
  // For Multi-City, we add more legs.
  // Start simple: Just list of legs.
  // Leg structure: { id: 1, destination: '', date: '', media: [] }
  const [legs, setLegs] = useState([
    { id: 1, destination: '', date: '', media: [] }
  ]);

  const fileInputRefs = useRef({});

  const handleAddLeg = () => {
    const newId = legs.length > 0 ? Math.max(...legs.map(l => l.id)) + 1 : 1;
    setLegs([...legs, { id: newId, destination: '', date: '', media: [] }]);
  };

  const handleRemoveLeg = (id) => {
    if (legs.length <= 1) return;
    setLegs(legs.filter(l => l.id !== id));
  };

  const updateLeg = (id, field, value) => {
    setLegs(legs.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const handleFileClick = (legId) => {
    if (fileInputRefs.current[legId]) {
      fileInputRefs.current[legId].click();
    }
  };

  const handleFileChange = (legId, e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      updateLeg(legId, 'media', files);
    }
  };

  const handleSubmit = () => {
    // Validation
    if (!startCity || !startDate || !tripTitle) {
      alert("Please fill in all required fields (Start City, Start Date, Trip Title)");
      return;
    }
    for (let leg of legs) {
      if (!leg.destination || !leg.date) {
        alert("Please complete all itinerary legs");
        return;
      }
    }

    // Construct payload
    // If Round Trip, we might need to auto-generate the return leg if the user expects it.
    // However, the UI pattern usually implies:
    // Round Trip -> Leg 1: Outbound (Dest X), Leg 2: Return (Dest StartCity).
    // Let's assume the user manually adds stops or we conform to the UI provided:
    // The UI image shows "One Way" / "Round Trip" tabs. 
    // If "Round Trip" selected, typically you pick Destination and Return Date.
    
    let dbLegs = [];
    
    if (tripType === 'round' && legs.length === 1) {
        // Special Case: Round Trip with 1 leg filled = Auto-create return leg? 
        // Or does the UI change to show 2 inputs?
        // Let's assume standard behavior:
        // Leg 1: Start -> Dest
        // Leg 2: Dest -> Start
        
        // However, to keep it flexible based on the user's "Multi-leg" request:
        // Let's just treat everything as explicit legs.
        // If "Round Trip" is selected, we could just pre-fill the return leg or enforce it.
        // For now, let's trust the explicit "Legs" list.
        
        // Wait, if it's "Round Trip" mode in a simplied UI, usually you enter "Dest" and "Return Date".
        // Let's implement that specific logic if needed.
        // BUT, the user said "rount trip 과 같이 오고 가고가...".
        // So let's act as if "Round Trip" just ensures the final destination is the start city.
    }

    // Base date object to increment
    let baseTime = new Date(startDate); 

    let submittedLegs = legs.map((l, index) => {
        // If user provided a specific date for the leg, use it.
        // BUT we need to ensure time progression if dates are same.
        // Let's assume user inputs "Date". We default time to 10:00 AM for first leg?
        // Or if it's the same date as previous, add offset.
        
        let legDate = new Date(l.date);
        // If it's the very first leg and matches start date, set a specific start time (e.g. 10:00)
        // If subsequent legs have same date, add hours to ensure order.
        
        // Simpler approach for "Simplified Flight Planning":
        // Just enforce order by adding (Index * 6 hours) to the base start date 
        // IF the user dates are all the same or invalid. 
        // But user provided dates. let's respect them but add time offset.
        
        // Fix: Ensure legDate has a time component that puts it AFTER the previous leg.
        // For now, let's just add {index} hours to the start_date if dates match, 
        // or just rely on the fact that legs are ordered in the array.
        // Backend sorts by Date. So if dates are identical, sort is unstable.
        // We MUST add time.
        
        // Let's set the time of the legDate to 12:00 + index
        legDate.setHours(12 + index, 0, 0, 0); 
        
        return {
            city_name: l.destination,
            arrival_date: legDate.toISOString()
        };
    });

    // Auto-append return leg if Round Trip is selected
    if (tripType === 'round') {
        const lastLeg = legs[legs.length - 1];
        if (lastLeg.destination.toLowerCase() !== startCity.toLowerCase()) {
            // Create return date: Last leg date + 1 day? Or same day + 4 hours?
            // User complained about "Simulation stops".
            // Let's add 1 day for return to be safe and clear.
            
            let lastDate = new Date(lastLeg.date);
            lastDate.setDate(lastDate.getDate() + 1); // Next day return
            lastDate.setHours(10, 0, 0, 0); // Morning
            
            submittedLegs.push({
                city_name: startCity,
                arrival_date: lastDate.toISOString()
            });
        }
    }
    
    // Also ensure the Trip Start Date has a defined time
    let tripStart = new Date(startDate);
    tripStart.setHours(9, 0, 0, 0); // Start at 9 AM

    const tripData = {
      title: tripTitle,
      start_city: startCity,
      start_date: tripStart.toISOString(),
      legs: submittedLegs // Already formatted in previous steps
    };


    const mediaFiles = legs.map(l => l.media); 
    onAddSimpleTrip(tripData, mediaFiles);
  };

  return (
    <div className="odyssey-overlay">
      <div className="odyssey-modal hud-container">
        <div className="odyssey-header">
          <div className="header-titles">
            <h2>CREATE NEW ODYSSEY</h2>
            <span className="sub-header">SIMPLIFIED FLIGHT PLANNING SYSTEM</span>
          </div>
          <button className="close-btn-ghost" onClick={onClose}><X /></button>
        </div>

        <div className="odyssey-content">
          {/* Departure Section */}
          <div className="section-label">
            <MapPin size={14} /> DEPARTURE
          </div>
          
          <div className="trip-type-toggle">
            <button 
              className={`toggle-btn ${tripType === 'one-way' ? 'active' : ''}`}
              onClick={() => setTripType('one-way')}
            >
              ONE WAY
            </button>
            <button 
              className={`toggle-btn ${tripType === 'round' ? 'active' : ''}`}
              onClick={() => {
                setTripType('round');
                // If switching to round trip, maybe ensure we have room for return?
                // Just keeping it simple for now.
              }}
            >
              ROUND TRIP
            </button>
          </div>

          <div className="input-group">
            <input 
              type="text" 
              placeholder="Start City (e.g. Seoul)" 
              value={startCity}
              onChange={e => setStartCity(e.target.value)}
              className="hud-input"
            />
          </div>
          <div className="input-group">
             <label className="input-label">START</label>
             <div className="date-input-wrapper">
                <input 
                  type="date" 
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="hud-input"
                />
                <Calendar className="input-icon" size={16}/>
             </div>
          </div>

          {/* Legs Section */}
          <div className="section-label" style={{marginTop: '20px'}}>
            <Calendar size={14} /> ITINERARY LEGS
          </div>

          <div className="legs-container">
            {legs.map((leg, index) => (
              <div key={leg.id} className="leg-card">
                <div className="leg-header">
                  <span className="leg-badge">LEG #{index + 1}</span>
                  {legs.length > 1 && (
                     <button className="remove-leg-btn" onClick={() => handleRemoveLeg(leg.id)}><X size={12}/></button>
                  )}
                </div>
                
                <div className="leg-inputs">
                  <div className="input-row">
                    <input 
                      type="text" 
                      placeholder="Destination City" 
                      value={leg.destination}
                      onChange={e => updateLeg(leg.id, 'destination', e.target.value)}
                      className="hud-input glass-input"
                    />
                    <div className="date-input-mini">
                        <input 
                        type="date"
                        value={leg.date}
                        onChange={e => updateLeg(leg.id, 'date', e.target.value)}
                        className="hud-input glass-input"
                        />
                    </div>
                  </div>
                  
                  <div className="leg-actions">
                    <button className="add-photo-btn" onClick={() => handleFileClick(leg.id)}>
                      <Camera size={14} /> {leg.media && leg.media.length > 0 ? `${leg.media.length} FILES SELECTED` : 'ADD PHOTOS'}
                    </button>
                    <input 
                      type="file" 
                      multiple 
                      ref={el => fileInputRefs.current[leg.id] = el}
                      style={{display:'none'}}
                      onChange={(e) => handleFileChange(leg.id, e)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button className="add-stop-btn" onClick={handleAddLeg}>
            <Plus size={16} /> ADD STOP
          </button>

          {/* Footer - Trip Title */}
          <div className="footer-section">
             <input 
              type="text" 
              placeholder="Trip Title (e.g. 2024 Europe Tour)" 
              value={tripTitle}
              onChange={e => setTripTitle(e.target.value)}
              className="hud-input title-input"
            />
          </div>
          
          <button className="initialize-btn" onClick={handleSubmit}>
            INITIALIZE FLIGHT PATH
          </button>

        </div>
      </div>
    </div>
  );
};

export default CreateOdysseyModal;
