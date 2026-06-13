import React, { useState } from 'react';
import { Plus, Trash2, Camera, MapPin, Calendar, X } from 'lucide-react';

const SimpleEventForm = ({ onAddSimpleTrip, onClose }) => {
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>새 여행 만들기</h3>
        <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>
          <X size={20} />
        </button>
      </div>
      <p style={{ fontSize: '10px', opacity: 0.7, marginBottom: '15px' }}>도시를 입력하면 지구본 위에 여정이 그려집니다</p>
      
      <div className="form-section">
        <label><MapPin size={12}/> 출발</label>
        <div className="trip-type-toggle">
          <button type="button" className={!isRoundTrip ? 'active' : ''} onClick={() => setIsRoundTrip(false)}>편도</button>
          <button type="button" className={isRoundTrip ? 'active' : ''} onClick={() => setIsRoundTrip(true)}>왕복</button>
        </div>
        <input type="text" placeholder="출발 도시 (예: 서울, 제주)" value={startCity} onChange={e => setStartCity(e.target.value)} required />
        <div className="date-group">
          <div className="field">
            <span>출발일</span>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
          </div>
          {isRoundTrip && (
            <div className="field">
              <span>돌아오는 날</span>
              <input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} required />
            </div>
          )}
        </div>
      </div>

      <div className="form-section">
        <label><Calendar size={12}/> 이동 경로</label>
        {legs.map((leg, index) => (
          <div key={index} className="leg-item glass-panel">
            <div className="leg-header">
              <span>{index + 1}번째 경유지</span>
              {legs.length > 1 && <button type="button" onClick={() => removeLeg(index)}><Trash2 size={14}/></button>}
            </div>
            <input 
              type="text" 
              placeholder="도착 도시 (예: 제주)" 
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
                 <Camera size={14} /> {leg.files.length > 0 ? `사진 ${leg.files.length}개` : '사진 추가'}
                 <input type="file" multiple hidden onChange={e => handleFileChange(index, e.target.files)} />
               </label>
            </div>
          </div>
        ))}
        <button type="button" className="add-leg-btn" onClick={addLeg}><Plus size={14}/> 경유지 추가</button>
      </div>

      <input 
        type="text" 
        className="trip-title-input"
        placeholder="여행 이름 (예: 제주 가족 여행)" 
        value={title} 
        onChange={e => setTitle(e.target.value)} 
        required 
      />

      <button type="submit" className="pano-btn">여행 경로 만들기</button>
    </form>
  );
};

export default SimpleEventForm;
