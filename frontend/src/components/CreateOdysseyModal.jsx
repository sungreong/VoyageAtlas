import React, { useState, useRef } from 'react';
import { X, Calendar, MapPin, Plus, Camera, ArrowRight, Plane, Globe, Trash2 } from 'lucide-react';
import './CreateOdysseyModal.layout.css';
import './CreateOdysseyModal.form.css';
import './CreateOdysseyModal.itinerary.css'; 

// Aesthetic constants
const HUD_CYAN = '#00f3ff';
const HUD_DARK = 'rgba(10, 20, 30, 0.95)';

const FREQUENT_CITIES = ['Seoul', 'Tokyo', 'Osaka', 'New York', 'Paris', 'London', 'Bangkok', 'Singapore'];

const CreateOdysseyModal = ({ onClose, onAddSimpleTrip }) => {
  const [tripType, setTripType] = useState('round'); // 'one-way' | 'round'
  const [startCity, setStartCity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(''); // New: Explicit End Date for Round Trip
  const [tripTitle, setTripTitle] = useState('');
  
  // Leg structure: { id: 1, destination: '', date: '', media: [] }
  const [legs, setLegs] = useState([
    { id: 1, destination: '', date: '', media: [] }
  ]);

  const fileInputRefs = useRef({});
  const startDatePickerRef = useRef(null);
  const endDatePickerRef = useRef(null);
  const legDatePickerRefs = useRef({});

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

  const triggerPicker = (ref) => {
    if (ref.current) {
      if (typeof ref.current.showPicker === 'function') {
        ref.current.showPicker();
      } else {
        ref.current.click();
      }
    }
  };

  const triggerLegPicker = (id) => {
     const el = document.getElementById(`leg-picker-${id}`);
     if (el) {
        if (typeof el.showPicker === 'function') el.showPicker();
        else el.click();
     }
  };

  const handleSubmit = () => {
    // Validation
    if (!startCity || !startDate || !tripTitle) {
      alert("Please fill in all required fields (Title, Start City, Start Date)");
      return;
    }
    for (let leg of legs) {
      if (!leg.destination || !leg.date) {
        alert("Please complete all itinerary legs");
        return;
      }
    }

    let submittedLegs = legs.map((l, index) => {
        let legDate = new Date(l.date);
        // Default time logic: 12:00 + index
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
            // If explicit End Date is provided, use that. Otherwise +1 day.
            let returnDate;
            if (endDate) {
                returnDate = new Date(endDate);
                returnDate.setHours(14, 0, 0, 0); // Afternoon return
            } else {
                returnDate = new Date(lastLeg.date);
                returnDate.setDate(returnDate.getDate() + 1);
                returnDate.setHours(10, 0, 0, 0); 
            }
            
            submittedLegs.push({
                city_name: startCity,
                arrival_date: returnDate.toISOString()
            });
        }
    }
    
    let tripStart = new Date(startDate);
    tripStart.setHours(9, 0, 0, 0); 
    // If start date matches first leg date, ensure tripStart is slightly earlier or same?
    // Usually Trip Start == Arrival at First Destination is impossible (unless very short flight).
    // But for "Simple Trip", Start Date is usually "Departure from Home".

    const tripData = {
      title: tripTitle,
      start_city: startCity,
      start_date: tripStart.toISOString(),
      legs: submittedLegs 
    };

    const mediaFiles = legs.map(l => l.media); 
    onAddSimpleTrip(tripData, mediaFiles);
  };

  return (
    <div className="odyssey-overlay">
      <div className="odyssey-modal hud-container">
        
        {/* Header */}
        <div className="odyssey-header">
          <div className="header-titles">
            <h2>CREATE NEW ODYSSEY</h2>
            <span className="sub-header">SIMPLIFIED FLIGHT PLANNING SYSTEM</span>
          </div>
          <button className="close-btn-ghost" onClick={onClose}><X /></button>
        </div>

        {/* 1. Mission Title (Top Priority) */}
        <div className="mission-title-wrapper">
             <input 
                type="text" 
                placeholder="ENTER MISSION TITLE..." 
                value={tripTitle}
                onChange={e => setTripTitle(e.target.value)}
                className="hud-input title-input"
                autoFocus
              />
        </div>

        {/* 2. Configuration Bar */}
        <div className="config-bar">
            
            {/* Type Selector */}
            <div className="config-group narrow">
                <label className="section-label"><Globe size={14}/> FLIGHT MODE</label>
                <div className="trip-type-toggle">
                    <button 
                    className={`toggle-btn ${tripType === 'one-way' ? 'active' : ''}`}
                    onClick={() => setTripType('one-way')}
                    >
                    ONE WAY
                    </button>
                    <button 
                    className={`toggle-btn ${tripType === 'round' ? 'active' : ''}`}
                    onClick={() => setTripType('round')}
                    >
                    ROUND TRIP
                    </button>
                </div>
            </div>

            {/* Origin Station */}
            <div className="config-group" style={{flex: 1.5}}>
                <label className="section-label"><MapPin size={14}/> ORIGIN STATION</label>
                <div className="hud-input-wrapper dropdown-container" onBlur={(e) => {
                    // Check if the new focus target is inside this container
                    if (!e.currentTarget.contains(e.relatedTarget)) {
                        document.getElementById('city-chips-dropdown').style.display = 'none';
                    }
                }}>
                    <MapPin size={16} className="input-field-icon" />
                    <input 
                        type="text" 
                        placeholder="Start City (e.g. Seoul)" 
                        value={startCity}
                        onChange={e => setStartCity(e.target.value)}
                        onFocus={() => {
                            const dropdown = document.getElementById('city-chips-dropdown');
                            if(dropdown) dropdown.style.display = 'flex';
                        }}
                        className="hud-input"
                    />
                    
                    {/* Floating Chips Dropdown */}
                    <div id="city-chips-dropdown" className="city-chips floating-chips">
                        {FREQUENT_CITIES.map(city => (
                            <button 
                                key={city} 
                                className="city-chip" 
                                onClick={() => {
                                    setStartCity(city);
                                    document.getElementById('city-chips-dropdown').style.display = 'none';
                                }}
                            >
                                {city}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Dates */}
            <div className="config-group" style={{flex: 1.5}}>
                 <label className="section-label"><Calendar size={14}/> MISSION TIMELINE</label>
                 <div className="date-group">
                    {/* Start Date */}
                    <div className="date-input-wrapper">
                        <Calendar 
                            size={16} 
                            className="input-field-icon clickable-icon" 
                            onClick={() => triggerPicker(startDatePickerRef)}
                        />
                        <input 
                            type="text" 
                            placeholder="Start Date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="hud-input date-typing-input"
                        />
                        <input 
                            type="date"
                            ref={startDatePickerRef}
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="hidden-date-picker"
                        />
                    </div>
                    
                    {/* Return Date (Conditional) */}
                    {tripType === 'round' && (
                        <>
                            <span style={{alignSelf:'center', color:'#00f3ff', opacity:0.5}}><ArrowRight size={14}/></span>
                            <div className="date-input-wrapper">
                                <Calendar 
                                    size={16} 
                                    className="input-field-icon clickable-icon" 
                                    onClick={() => triggerPicker(endDatePickerRef)}
                                />
                                <input 
                                    type="text" 
                                    placeholder="Return Date"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    className="hud-input date-typing-input"
                                />
                                <input 
                                    type="date"
                                    ref={endDatePickerRef}
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    className="hidden-date-picker"
                                />
                            </div>
                        </>
                    )}
                 </div>
            </div>
        </div>

        {/* 3. Itinerary / Legs */}
        <div className="section-label" style={{marginTop: '10px'}}>
            <Plane size={16} className="section-icon" /> FLIGHT PATH / WAYPOINTS
        </div>

        <div className="legs-container">
            {legs.map((leg, index) => (
              <div key={leg.id} className="leg-row">
                 <div className="leg-index">{index + 1}</div>
                 
                 {/* Destination */}
                 <div className="leg-destination">
                    <div className="hud-input-wrapper dropdown-container" onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget)) {
                            const el = document.getElementById(`leg-dropdown-${leg.id}`);
                            if(el) el.style.display = 'none';
                        }
                    }}>
                        <Plane size={14} className="input-field-icon" style={{transform:'rotate(90deg)'}}/>
                        <input 
                            type="text" 
                            placeholder="Destination City" 
                            value={leg.destination}
                            onChange={e => updateLeg(leg.id, 'destination', e.target.value)}
                            onFocus={() => {
                                const el = document.getElementById(`leg-dropdown-${leg.id}`);
                                if(el) el.style.display = 'flex';
                            }}
                            className="hud-input glass-input"
                        />
                        
                        {/* Floating Chips Dropdown for Leg */}
                        <div id={`leg-dropdown-${leg.id}`} className="city-chips floating-chips">
                            {FREQUENT_CITIES.map(city => (
                                <button 
                                    key={city} 
                                    className="city-chip" 
                                    onClick={() => {
                                        updateLeg(leg.id, 'destination', city);
                                        const el = document.getElementById(`leg-dropdown-${leg.id}`);
                                        if(el) el.style.display = 'none';
                                    }}
                                >
                                    {city}
                                </button>
                            ))}
                        </div>
                    </div>
                 </div>

                 {/* Arrival Date */}
                 <div className="leg-date">
                    <div className="date-input-wrapper" style={{height:'42px'}}>
                        <Calendar 
                           size={14} 
                           className="input-field-icon clickable-icon" 
                           onClick={() => triggerLegPicker(leg.id)}
                        />
                        <input 
                           type="text"
                           placeholder="Arrival Date"
                           value={leg.date}
                           onChange={e => updateLeg(leg.id, 'date', e.target.value)}
                           className="hud-input glass-input date-typing-input"
                           style={{paddingLeft: '38px', fontSize: '0.85rem'}}
                        />
                        <input 
                           type="date"
                           id={`leg-picker-${leg.id}`}
                           value={leg.date}
                           onChange={e => updateLeg(leg.id, 'date', e.target.value)}
                           className="hidden-date-picker"
                        />
                    </div>
                 </div>

                 {/* Media Action */}
                 <button 
                    className={`media-btn ${leg.media && leg.media.length > 0 ? 'has-media' : ''}`} 
                    onClick={() => handleFileClick(leg.id)}
                 >
                    <Camera size={14} /> 
                    <span>{leg.media && leg.media.length > 0 ? `${leg.media.length} Att.` : 'Media'}</span>
                 </button>
                 <input 
                    type="file" 
                    multiple 
                    ref={el => fileInputRefs.current[leg.id] = el}
                    style={{display:'none'}}
                    onChange={(e) => handleFileChange(leg.id, e)}
                 />

                 {/* Remove */}
                 {legs.length > 1 && (
                     <button className="remove-leg-btn" onClick={() => handleRemoveLeg(leg.id)} title="Remove Waypoint">
                         <X size={16}/>
                     </button>
                 )}
              </div>
            ))}
             <button className="add-leg-btn" onClick={handleAddLeg}>
                <Plus size={14} style={{marginRight: '5px'}}/> ADD WAYPOINT
            </button>
        </div>


        {/* Footer */}
        <button className="initialize-btn" onClick={handleSubmit}>
            INITIALIZE FLIGHT PATH
        </button>

      </div>
    </div>
  );
};

export default CreateOdysseyModal;

