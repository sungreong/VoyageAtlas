import React, { useState } from 'react';
import axios from 'axios';
import { Download, Upload, X, Calendar, FileJson, CheckCircle2, AlertCircle } from 'lucide-react';

const API_BASE = '/api';

const ExportImportModal = ({ onClose, onRefresh }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState(null); // { text, type }
  const [dragActive, setDragActive] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setMessage(null);
      
      let url = `${API_BASE}/events/export`;
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', new Date(startDate).toISOString());
      if (endDate) params.append('end_date', new Date(endDate).toISOString());
      
      if (params.toString()) url += `?${params.toString()}`;
      
      const res = await axios.get(url);
      const dataStr = JSON.stringify(res.data, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `voyage_atlas_export_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      setMessage({ text: 'Export complete!', type: 'success' });
    } catch (err) {
      console.error("Export failed", err);
      setMessage({ text: 'Export failed. Please try again.', type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (file) => {
    if (!file) return;
    
    try {
      setIsImporting(true);
      setMessage(null);
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const json = JSON.parse(e.target.result);
          const res = await axios.post(`${API_BASE}/events/import`, json);
          setMessage({ 
            text: `Import successful! Added ${res.data.imported_trips} trips and ${res.data.imported_events} events.`, 
            type: 'success' 
          });
          if (onRefresh) onRefresh();
        } catch (err) {
          console.error("Import API failed", err);
          setMessage({ text: 'Invalid JSON format or server error.', type: 'error' });
        } finally {
          setIsImporting(false);
        }
      };
      reader.readAsText(file);
    } catch (err) {
      console.error("File reading failed", err);
      setMessage({ text: 'Failed to read file.', type: 'error' });
      setIsImporting(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImport(e.dataTransfer.files[0]);
    }
  };

  const onFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleImport(e.target.files[0]);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content export-import-modal">
        <div className="dm-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div className="neon-icon-glow">
              <FileJson size={32} color="var(--neon-cyan)" />
            </div>
            <h2>DATA PORTABILITY</h2>
          </div>
          <button className="icon-btn-secondary" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="export-import-grid">
          {/* EXPORT SECTION */}
          <div className="portability-section">
            <div className="section-label">
              <Download size={18} /> <span>EXPORT DATA</span>
            </div>
            <p className="section-desc">Download your travel logs as a portable JSON file.</p>
            
            <div className="export-controls">
                <div className="form-group">
                  <label className="neon-label"><Calendar size={14} /> SELECT PERIOD</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input 
                      type="date" 
                      className="neon-input compact" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)}
                      placeholder="Start"
                    />
                    <input 
                      type="date" 
                      className="neon-input compact" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)}
                      placeholder="End"
                    />
                  </div>
                </div>
                
                <button 
                  className="neon-btn primary wide-btn" 
                  onClick={handleExport}
                  disabled={isExporting}
                >
                  {isExporting ? 'PREPARING...' : 'DOWNLOAD JSON'}
                </button>
            </div>
          </div>

          <div className="v-divider"></div>

          {/* IMPORT SECTION */}
          <div className="portability-section">
            <div className="section-label">
              <Upload size={18} /> <span>IMPORT DATA</span>
            </div>
            <p className="section-desc">Restore or merge travel data from a JSON file.</p>
            
            <div 
              className={`import-dropzone ${dragActive ? 'active' : ''} ${isImporting ? 'loading' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input 
                type="file" 
                id="file-upload" 
                className="hidden-file-input" 
                accept=".json" 
                onChange={onFileChange} 
              />
              <label htmlFor="file-upload" className="dropzone-label">
                <div className="upload-icon">
                  <Upload size={40} />
                </div>
                <div className="upload-text">
                  {isImporting ? 'PROCESSING...' : 'DRAG & DROP OR CLICK TO SELECT'}
                </div>
              </label>
            </div>
          </div>
        </div>

        {message && (
          <div className={`status-message ${message.type}`}>
            {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{message.text}</span>
          </div>
        )}
        
        <div className="modal-actions" style={{ marginTop: '30px' }}>
          <button className="neon-btn secondary" onClick={onClose}>CLOSE</button>
        </div>
      </div>
    </div>
  );
};

export default ExportImportModal;
