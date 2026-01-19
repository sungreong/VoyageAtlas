import React from 'react';
import { X, ZoomIn, Download } from 'lucide-react';

const ImageViewer = ({ url, onClose }) => {
  if (!url) return null;

  return (
    <div className="pano-modal-overlay" onClick={onClose} style={{ cursor: 'zoom-out' }}>
      <div className="image-viewer-content" onClick={e => e.stopPropagation()}>
        <img src={url} alt="Travel Detail" className="enlarged-photo" />
        
        <div className="viewer-controls glass-panel">
          <button onClick={() => window.open(url)} title="Download"><Download size={20} /></button>
          <button onClick={onClose} title="Close"><X size={20} /></button>
        </div>

        <div className="viewer-footer">
          <p>SATELLITE IMAGE ACQUISITION SUCCESSFUL</p>
        </div>
      </div>
    </div>
  );
};

export default ImageViewer;
