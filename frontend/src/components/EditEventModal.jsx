import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, MapPin, AlignLeft, Plane, TrainFront, Car, Ship } from 'lucide-react';

const TRANSPORT_OPTIONS = [
  { value: 'plane', label: '비행기', Icon: Plane },
  { value: 'train', label: '기차', Icon: TrainFront },
  { value: 'car', label: '자동차', Icon: Car },
  { value: 'ship', label: '배', Icon: Ship }
];

const EditEventModal = ({ event, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    start_datetime: '',
    from_name: '',
    from_lat: '',
    from_lng: '',
    to_name: '',
    to_lat: '',
    to_lng: '',
    transport: 'plane',
    note: ''
  });

  useEffect(() => {
    if (event) {
      // Format datetime for input[type="datetime-local"] (YYYY-MM-DDTHH:mm)
      let formattedDate = '';
      if (event.start_datetime) {
        const dateObj = new Date(event.start_datetime);
        // Adjust to local ISO string for input
        const offset = dateObj.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(dateObj - offset)).toISOString().slice(0, 16);
        formattedDate = localISOTime;
      }

      setFormData({
        title: event.title || '',
        start_datetime: formattedDate,
        from_name: event.from_name || '',
        from_lat: event.from_lat || 0,
        from_lng: event.from_lng || 0,
        to_name: event.to_name || '',
        to_lat: event.to_lat || 0,
        to_lng: event.to_lng || 0,
        transport: event.transport || 'plane',
        note: event.note || ''
      });
    }
  }, [event]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Re-format date to ISO string if needed by backend, or let backend handle standard ISO
    // Input gives 'YYYY-MM-DDTHH:mm', which is a valid partial ISO string.
    onSave({ ...event, ...formData });
  };

  return (
    <div className="modal-overlay">
      <div className="neon-card glass-panel modal-content" style={{ maxWidth: '600px', width: '90%' }}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(0, 255, 238, 0.3)', paddingBottom: '0.5rem' }}>
          <h2 className="neon-text" style={{ margin: 0 }}>구간 편집</h2>
          <button className="icon-btn-secondary" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="edit-event-form">
          <div className="form-group">
            <label className="neon-label"><AlignLeft size={16} /> 구간 이름</label>
            <input 
              type="text" 
              name="title" 
              value={formData.title} 
              onChange={handleChange} 
              className="neon-input" 
              required 
            />
          </div>

          <div className="form-group">
            <label className="neon-label"><Calendar size={16} /> 이동 날짜와 시간</label>
            <input 
              type="datetime-local" 
              name="start_datetime" 
              value={formData.start_datetime} 
              onChange={handleChange} 
              className="neon-input" 
              required 
            />
          </div>

          <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="neon-label"><MapPin size={16} /> 출발 도시</label>
              <input 
                type="text" 
                name="from_name" 
                value={formData.from_name} 
                onChange={handleChange} 
                className="neon-input" 
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
               <label className="neon-label"><MapPin size={16} /> 도착 도시</label>
              <input 
                type="text" 
                name="to_name" 
                value={formData.to_name} 
                onChange={handleChange} 
                className="neon-input" 
              />
            </div>
          </div>

          <div className="form-group">
            <label className="neon-label"><Plane size={16} /> 이동수단</label>
            <div className="transport-segment" role="radiogroup" aria-label="이동수단">
              {TRANSPORT_OPTIONS.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  className={`transport-option ${formData.transport === value ? 'active' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, transport: value }))}
                  aria-pressed={formData.transport === value}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <p className="field-helper">이 값은 지도 구간, 통계, 내보내기 데이터에 함께 저장됩니다.</p>
          </div>

          <div className="form-group">
            <label className="neon-label"><AlignLeft size={16} /> 메모</label>
            <textarea 
              name="note" 
              value={formData.note} 
              onChange={handleChange} 
              className="neon-input" 
              rows={4}
            />
          </div>

          <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="neon-btn secondary" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="neon-btn primary">
              <Save size={18} style={{ marginRight: '8px' }} />
              변경사항 저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditEventModal;
