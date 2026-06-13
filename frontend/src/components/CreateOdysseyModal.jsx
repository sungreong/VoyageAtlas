import React, { useEffect, useState, useRef } from 'react';
import { X, Calendar, MapPin, Plus, Camera, ArrowRight, Plane, Globe, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import apiClient from '../api/client';
import './CreateOdysseyModal.layout.css';
import './CreateOdysseyModal.form.css';
import './CreateOdysseyModal.itinerary.css'; 

const FREQUENT_CITIES = ['서울', '제주', '부산', '인천', '강릉', '여수', '도쿄', '오사카', '후쿠오카', '방콕', '다낭', '싱가포르'];

// City Coordinates for Distance Calculation
const CITY_COORDINATES = {
    '서울': { lat: 37.5665, lng: 126.9780 },
    'seoul': { lat: 37.5665, lng: 126.9780 },
    '인천': { lat: 37.4563, lng: 126.7052 },
    'incheon': { lat: 37.4563, lng: 126.7052 },
    '부산': { lat: 35.1796, lng: 129.0756 },
    'busan': { lat: 35.1796, lng: 129.0756 },
    '제주': { lat: 33.4996, lng: 126.5312 },
    '제주도': { lat: 33.4996, lng: 126.5312 },
    '제주시': { lat: 33.4996, lng: 126.5312 },
    'jeju': { lat: 33.4996, lng: 126.5312 },
    'jeju-do': { lat: 33.4996, lng: 126.5312 },
    'jeju city': { lat: 33.4996, lng: 126.5312 },
    '강릉': { lat: 37.7519, lng: 128.8761 },
    'gangneung': { lat: 37.7519, lng: 128.8761 },
    '여수': { lat: 34.7604, lng: 127.6622 },
    'yeosu': { lat: 34.7604, lng: 127.6622 },
    'tokyo': { lat: 35.6762, lng: 139.6503 },
    '도쿄': { lat: 35.6762, lng: 139.6503 },
    'osaka': { lat: 34.6937, lng: 135.5023 },
    '오사카': { lat: 34.6937, lng: 135.5023 },
    '후쿠오카': { lat: 33.5904, lng: 130.4017 },
    'fukuoka': { lat: 33.5904, lng: 130.4017 },
    'new york': { lat: 40.7128, lng: -74.0060 },
    '뉴욕': { lat: 40.7128, lng: -74.0060 },
    'paris': { lat: 48.8566, lng: 2.3522 },
    '파리': { lat: 48.8566, lng: 2.3522 },
    'london': { lat: 51.5074, lng: -0.1278 },
    '런던': { lat: 51.5074, lng: -0.1278 },
    'bangkok': { lat: 13.7563, lng: 100.5018 },
    '방콕': { lat: 13.7563, lng: 100.5018 },
    '다낭': { lat: 16.0544, lng: 108.2022 },
    'da nang': { lat: 16.0544, lng: 108.2022 },
    'singapore': { lat: 1.3521, lng: 103.8198 },
    '싱가포르': { lat: 1.3521, lng: 103.8198 },
    'san francisco': { lat: 37.7749, lng: -122.4194 },
    'los angeles': { lat: 34.0522, lng: -118.2437 },
    'beijing': { lat: 39.9042, lng: 116.4074 },
    'shanghai': { lat: 31.2304, lng: 121.4737 },
    'sydney': { lat: -33.8688, lng: 151.2093 },
    'hong kong': { lat: 22.3193, lng: 114.1694 },
    'dubai': { lat: 25.2048, lng: 55.2708 },
    'toronto': { lat: 43.6510, lng: -79.3470 },
    'berlin': { lat: 52.5200, lng: 13.4050 },
    'rome': { lat: 41.9028, lng: 12.4964 },
    'moscow': { lat: 55.7558, lng: 37.6173 },
    'mumbai': { lat: 19.0760, lng: 72.8777 }
};

const createManualLocation = () => ({ lat: '', lng: '', expanded: false });
const createManualLocationFromCoords = (coords) => ({
    lat: Number(coords.lat).toFixed(6),
    lng: Number(coords.lng).toFixed(6),
    expanded: false
});
const createSelectedLocationLabel = (coords) => `선택한 위치 (${Number(coords.lat).toFixed(3)}, ${Number(coords.lng).toFixed(3)})`;

const getKnownCityCoords = (city) => {
    if (!city) return null;
    return CITY_COORDINATES[city.trim().toLowerCase()] || null;
};

const isValidLat = (value) => value !== '' && !Number.isNaN(Number(value)) && Number(value) >= -90 && Number(value) <= 90;
const isValidLng = (value) => value !== '' && !Number.isNaN(Number(value)) && Number(value) >= -180 && Number(value) <= 180;

const getManualCoords = (manualLocation) => {
    if (!manualLocation || !isValidLat(manualLocation.lat) || !isValidLng(manualLocation.lng)) return null;
    return { lat: Number(manualLocation.lat), lng: Number(manualLocation.lng) };
};

const resolveLocation = (city, manualLocation) => {
    const trimmedCity = city.trim();
    const knownCoords = getKnownCityCoords(trimmedCity);
    if (knownCoords) {
        return { status: 'valid', source: 'known', label: trimmedCity, coords: knownCoords };
    }

    const manualCoords = getManualCoords(manualLocation);
    if (trimmedCity && manualCoords) {
        return { status: 'valid', source: 'manual', label: trimmedCity, coords: manualCoords };
    }

    if (trimmedCity) {
        return { status: 'invalid', source: 'missing', label: trimmedCity, coords: null };
    }

    return { status: 'idle', source: 'empty', label: '', coords: null };
};

const calculateDistanceByCoords = (c1, c2) => {
    if (!c1 || !c2) return null;
    const R = 6371; // km
    const dLat = (c2.lat - c1.lat) * Math.PI / 180;
    const dLon = (c2.lng - c1.lng) * Math.PI / 180;
    const lat1 = c1.lat * Math.PI / 180;
    const lat2 = c2.lat * Math.PI / 180;

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return Math.round(R * c);
};

const LocationField = ({
    value,
    onChange,
    manualLocation,
    onManualChange,
    dropdownId,
    placeholder,
    hint,
    icon = <MapPin size={16} className="input-field-icon" />,
    inputClassName = 'hud-input'
}) => {
    const resolved = resolveLocation(value, manualLocation);
    const showManualFields = manualLocation.expanded || resolved.status === 'invalid' || resolved.source === 'manual';

    const updateManual = (field, fieldValue) => {
        onManualChange({ ...manualLocation, [field]: fieldValue });
    };

    const closeDropdown = () => {
        const dropdown = document.getElementById(dropdownId);
        if (dropdown) dropdown.style.display = 'none';
    };

    const selectCity = (city) => {
        onChange(city);
        onManualChange(createManualLocation());
        closeDropdown();
    };

    return (
        <div className="location-field">
            <div className="hud-input-wrapper dropdown-container" onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                    closeDropdown();
                }
            }}>
                {icon}
                <input
                    type="text"
                    placeholder={placeholder}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    onFocus={() => {
                        const dropdown = document.getElementById(dropdownId);
                        if (dropdown) dropdown.style.display = 'flex';
                    }}
                    className={`${inputClassName} location-input-${resolved.status}`}
                />

                {resolved.status === 'valid' && (
                    <div className={`input-status-icon ${resolved.source}`}>
                        <CheckCircle size={14} />
                    </div>
                )}
                {resolved.status === 'invalid' && (
                    <div className="input-status-icon invalid">
                        <XCircle size={14} />
                    </div>
                )}

                <div id={dropdownId} className="city-chips floating-chips">
                    <span className="city-chip-hint">{hint}</span>
                    {FREQUENT_CITIES.map(city => (
                        <button
                            key={city}
                            type="button"
                            className="city-chip"
                            onClick={() => selectCity(city)}
                        >
                            {city}
                        </button>
                    ))}
                </div>
            </div>

            {resolved.status === 'valid' && (
                <div className={`location-confirm-chip ${resolved.source}`}>
                    <CheckCircle size={12} />
                    <span>{resolved.label}</span>
                    <small>
                        {resolved.source === 'manual' ? '직접 좌표' : '등록 가능'} · {resolved.coords.lat.toFixed(4)}, {resolved.coords.lng.toFixed(4)}
                    </small>
                </div>
            )}

            {resolved.status === 'invalid' && (
                <div className="location-warning-chip">
                    <XCircle size={12} />
                    <span>아직 위치를 확인하지 못했어요. 이름을 고치거나 좌표로 확정하세요.</span>
                </div>
            )}

            <button
                type="button"
                className="manual-location-toggle"
                onClick={() => onManualChange({ ...manualLocation, expanded: !manualLocation.expanded })}
            >
                {showManualFields ? '좌표 입력 닫기' : '이름/좌표로 직접 등록'}
            </button>

            {showManualFields && (
                <div className="manual-location-panel">
                    <input
                        type="number"
                        step="0.0001"
                        min="-90"
                        max="90"
                        placeholder="위도"
                        value={manualLocation.lat}
                        onChange={e => updateManual('lat', e.target.value)}
                        className={`manual-coordinate-input ${manualLocation.lat && !isValidLat(manualLocation.lat) ? 'invalid' : ''}`}
                    />
                    <input
                        type="number"
                        step="0.0001"
                        min="-180"
                        max="180"
                        placeholder="경도"
                        value={manualLocation.lng}
                        onChange={e => updateManual('lng', e.target.value)}
                        className={`manual-coordinate-input ${manualLocation.lng && !isValidLng(manualLocation.lng) ? 'invalid' : ''}`}
                    />
                </div>
            )}
        </div>
    );
};

const validateDate = (dateStr) => {
    // Basic regex for YYYY-MM-DD
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateStr) return true; // Allow empty initially (or handle required elsewhere)
    return regex.test(dateStr);
};

const CreateOdysseyModal = ({ onClose, onAddSimpleTrip, selectedCoords }) => {
  const [tripType, setTripType] = useState('round'); // 'one-way' | 'round'
  const [startCity, setStartCity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(''); // New: Explicit End Date for Round Trip
  const [tripTitle, setTripTitle] = useState('');
  const [formError, setFormError] = useState('');
  const [selectedLocationStatus, setSelectedLocationStatus] = useState({ state: 'idle', message: '' });
  const [startManualLocation, setStartManualLocation] = useState(createManualLocation());
  
  // Leg structure: { id: 1, destination: '', date: '', media: [] }
  const [legs, setLegs] = useState([
    { id: 1, destination: '', date: '', media: [], manualLocation: createManualLocation() }
  ]);

  useEffect(() => {
    if (!selectedCoords) {
      setSelectedLocationStatus({ state: 'idle', message: '' });
      return undefined;
    }

    const lat = Number(selectedCoords.lat);
    const lng = Number(selectedCoords.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;

    const fallbackLabel = createSelectedLocationLabel({ lat, lng });
    const manualLocation = createManualLocationFromCoords({ lat, lng });
    const controller = new AbortController();

    setSelectedLocationStatus({
      state: 'loading',
      message: `선택한 좌표를 가장 가까운 지역으로 확인 중입니다 · ${lat.toFixed(4)}, ${lng.toFixed(4)}`
    });

    setLegs(prev => prev.map((leg, index) => (
      index === 0
        ? { ...leg, destination: fallbackLabel, manualLocation }
        : leg
    )));

    apiClient.get('/geocode', {
      params: { lat, lng },
      signal: controller.signal
    })
      .then(({ data }) => {
        const locationName = data?.name || data?.city || fallbackLabel;
        const mappedLat = Number(data?.lat);
        const mappedLng = Number(data?.lng);
        const mappedManualLocation = Number.isFinite(mappedLat) && Number.isFinite(mappedLng)
          ? createManualLocationFromCoords({ lat: mappedLat, lng: mappedLng })
          : manualLocation;

        setLegs(prev => prev.map((leg, index) => (
          index === 0
            ? { ...leg, destination: locationName, manualLocation: mappedManualLocation }
            : leg
        )));

        const distanceCopy = data?.source === 'nearest_known' && data?.distance_km
          ? ` · 알려진 도시 기준 약 ${Math.round(data.distance_km).toLocaleString()} km`
          : '';
        const representativeCopy = data?.source === 'country_representative'
          ? ' · 대표 도시 좌표로 매핑'
          : '';

        setSelectedLocationStatus({
          state: 'success',
          message: `지도에서 선택한 위치를 도착지로 설정했습니다: ${locationName}${representativeCopy}${distanceCopy}`
        });
      })
      .catch(error => {
        if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') return;
        setSelectedLocationStatus({
          state: 'error',
          message: `지역명 확인은 실패했지만 선택한 좌표는 도착지로 저장됩니다: ${lat.toFixed(4)}, ${lng.toFixed(4)}`
        });
      });

    return () => controller.abort();
  }, [selectedCoords]);

  const fileInputRefs = useRef({});
  const startDatePickerRef = useRef(null);
  const endDatePickerRef = useRef(null);
  const legDatePickerRefs = useRef({});

  const handleAddLeg = () => {
    const newId = legs.length > 0 ? Math.max(...legs.map(l => l.id)) + 1 : 1;
    setLegs([...legs, { id: newId, destination: '', date: '', media: [], manualLocation: createManualLocation() }]);
  };

  const handleRemoveLeg = (id) => {
    if (legs.length <= 1) return;
    setLegs(legs.filter(l => l.id !== id));
  };

  const updateLeg = (id, field, value) => {
    setLegs(legs.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const updateLegManualLocation = (id, manualLocation) => {
    setLegs(legs.map(l => l.id === id ? { ...l, manualLocation } : l));
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
    setFormError('');
    const startLocation = resolveLocation(startCity, startManualLocation);
    // Validation
    if (!startCity || !startDate || !tripTitle) {
      setFormError("여행 이름, 출발 도시, 출발일을 입력해 주세요.");
      return;
    }
    if (startLocation.status !== 'valid') {
      setFormError("출발 도시를 확인할 수 없어요. 추천 도시를 선택하거나 좌표를 직접 입력해 주세요.");
      return;
    }
    
    if (!validateDate(startDate)) {
       setFormError("출발일은 YYYY-MM-DD 형식으로 입력해 주세요.");
       return;
    }
    if (tripType === 'round' && endDate && !validateDate(endDate)) {
        setFormError("돌아오는 날은 YYYY-MM-DD 형식으로 입력해 주세요.");
        return;
    }
    if (tripType === 'round' && !endDate) {
        setFormError("왕복 여행은 돌아오는 날을 입력해 주세요.");
        return;
    }
    if (tripType === 'round' && endDate < startDate) {
        setFormError("돌아오는 날은 출발일보다 빠를 수 없습니다.");
        return;
    }

    for (let leg of legs) {
      const legLocation = resolveLocation(leg.destination, leg.manualLocation);
      if (!leg.destination || !leg.date) {
        setFormError("모든 경유지의 도시와 이동일을 입력해 주세요.");
        return;
      }
      if (legLocation.status !== 'valid') {
        setFormError(`${leg.id}번째 경유지의 위치를 확인할 수 없어요. 추천 도시를 선택하거나 좌표를 직접 입력해 주세요.`);
        return;
      }
      if (!validateDate(leg.date)) {
         setFormError(`${leg.id}번째 경유지의 이동일은 YYYY-MM-DD 형식으로 입력해 주세요.`);
         return;
      }
      if (leg.date < startDate) {
         setFormError(`${leg.id}번째 경유지의 이동일은 출발일보다 빠를 수 없습니다.`);
         return;
      }
      if (tripType === 'round' && leg.date > endDate) {
         setFormError(`${leg.id}번째 경유지의 이동일은 돌아오는 날보다 늦을 수 없습니다.`);
         return;
      }
    }

    for (let i = 1; i < legs.length; i += 1) {
      if (legs[i].date < legs[i - 1].date) {
        setFormError("이동 경로의 날짜는 위에서 아래로 빠른 순서여야 합니다.");
        return;
      }
    }

    let submittedLegs = legs.map((l, index) => {
        let legDate = new Date(l.date);
        const legLocation = resolveLocation(l.destination, l.manualLocation);
        // Default time logic: 12:00 + index
        legDate.setHours(12 + index, 0, 0, 0); 
        
        return {
            city_name: l.destination,
            arrival_date: legDate.toISOString(),
            lat: legLocation.coords.lat,
            lng: legLocation.coords.lng
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
                arrival_date: returnDate.toISOString(),
                lat: startLocation.coords.lat,
                lng: startLocation.coords.lng
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
      start_lat: startLocation.coords.lat,
      start_lng: startLocation.coords.lng,
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
            <h2>새 여행 만들기</h2>
            <span className="sub-header">도시를 입력하면 지구본 위에 여정이 그려집니다</span>
          </div>
          <button className="close-btn-ghost" onClick={onClose}><X /></button>
        </div>

        {/* 1. Mission Title (Top Priority) */}
        <div className="mission-title-wrapper">
             <input 
                type="text" 
                placeholder="여행 이름 (예: 제주 가족 여행)" 
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
                <label className="section-label"><Globe size={14}/> 여행 방식</label>
                <div className="trip-type-toggle">
                    <button 
                    className={`toggle-btn ${tripType === 'one-way' ? 'active' : ''}`}
                    onClick={() => setTripType('one-way')}
                    >
                    편도
                    </button>
                    <button 
                    className={`toggle-btn ${tripType === 'round' ? 'active' : ''}`}
                    onClick={() => setTripType('round')}
                    >
                    왕복
                    </button>
                </div>
            </div>

            {/* Origin Station */}
            <div className="config-group" style={{flex: 1.5}}>
                <label className="section-label"><MapPin size={14}/> 출발 도시</label>
                <LocationField
                    value={startCity}
                    onChange={setStartCity}
                    manualLocation={startManualLocation}
                    onManualChange={setStartManualLocation}
                    dropdownId="city-chips-dropdown"
                    placeholder="예: 서울, 제주, Jeju"
                    hint="추천 도시를 선택하거나, 원하는 위치는 이름과 좌표로 직접 등록하세요."
                />
            </div>

            {/* Dates */}
            <div className="config-group" style={{flex: 1.5}}>
                 <label className="section-label"><Calendar size={14}/> 여행 기간</label>
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
                            placeholder="출발일"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="hud-input date-typing-input"
                        />
                        {!validateDate(startDate) && startDate.length > 0 && (
                            <div className="validation-warning">
                                <AlertCircle size={12}/> YYYY-MM-DD 형식
                            </div>
                        )}
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
                                    placeholder="돌아오는 날"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    className="hud-input date-typing-input"
                                />
                                {!validateDate(endDate) && endDate.length > 0 && (
                                    <div className="validation-warning">
                                        <AlertCircle size={12}/> YYYY-MM-DD 형식
                                    </div>
                                )}
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
            <Plane size={16} className="section-icon" /> 이동 경로 / 경유지
        </div>

        {selectedLocationStatus.state !== 'idle' && (
            <div className={`selected-location-notice ${selectedLocationStatus.state}`}>
                {selectedLocationStatus.state === 'success' ? <CheckCircle size={14} /> : <MapPin size={14} />}
                <span>{selectedLocationStatus.message}</span>
            </div>
        )}

        <div className="legs-container">
            {legs.map((leg, index) => (
              <div key={leg.id} className="leg-row">
                 <div className="leg-index">{index + 1}</div>
                 
                 {/* Destination */}
                 <div className="leg-destination">
                    <LocationField
                        value={leg.destination}
                        onChange={value => updateLeg(leg.id, 'destination', value)}
                        manualLocation={leg.manualLocation}
                        onManualChange={manualLocation => updateLegManualLocation(leg.id, manualLocation)}
                        dropdownId={`leg-dropdown-${leg.id}`}
                        placeholder="도착 도시 (예: 제주)"
                        hint="국내 도시도 바로 입력할 수 있고, 목록에 없으면 좌표로 직접 확정할 수 있어요."
                        icon={<Plane size={14} className="input-field-icon plane-field-icon" />}
                        inputClassName="hud-input glass-input"
                    />

                    {(() => {
                        const prevLocation = index === 0
                            ? resolveLocation(startCity, startManualLocation)
                            : resolveLocation(legs[index - 1].destination, legs[index - 1].manualLocation);
                        const currentLocation = resolveLocation(leg.destination, leg.manualLocation);
                        const dist = calculateDistanceByCoords(prevLocation.coords, currentLocation.coords);

                        if (dist !== null) {
                            return (
                                <div className="distance-badge inline-distance-badge">
                                    {dist.toLocaleString()} km
                                </div>
                            );
                        }
                        return null;
                    })()}
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
                           placeholder="이동일"
                           value={leg.date}
                           onChange={e => updateLeg(leg.id, 'date', e.target.value)}
                           className="hud-input glass-input date-typing-input"
                           style={{paddingLeft: '38px', fontSize: '0.85rem'}}
                        />
                        {!validateDate(leg.date) && leg.date.length > 0 && (
                            <div className="validation-warning">
                                <AlertCircle size={12}/> 날짜 형식 확인
                            </div>
                        )}
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
                    <span>{leg.media && leg.media.length > 0 ? `${leg.media.length}개` : '사진'}</span>
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
                     <button className="remove-leg-btn" onClick={() => handleRemoveLeg(leg.id)} title="경유지 삭제">
                         <X size={16}/>
                     </button>
                 )}
              </div>
            ))}
             <button className="add-leg-btn" onClick={handleAddLeg}>
                <Plus size={14} style={{marginRight: '5px'}}/> 경유지 추가
            </button>
        </div>

        {formError && (
            <div className="form-error-message">
                <AlertCircle size={14} />
                {formError}
            </div>
        )}

        {/* Footer */}
        <button className="initialize-btn" onClick={handleSubmit}>
            여행 경로 만들기
        </button>

      </div>
    </div>
  );
};

export default CreateOdysseyModal;

