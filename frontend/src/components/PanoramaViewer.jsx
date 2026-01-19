import React, { useEffect, useRef } from 'react';
import { Viewer } from 'photo-sphere-viewer';
import 'photo-sphere-viewer/dist/photo-sphere-viewer.css';

const PanoramaViewer = ({ imageUrl, onClose }) => {
  const viewerRef = useRef();

  useEffect(() => {
    if (!viewerRef.current || !imageUrl) return;

    const viewer = new Viewer({
      container: viewerRef.current,
      panorama: imageUrl,
      loadingTxt: 'CALIBRATING SENSORS...',
      navbar: [
        'zoom',
        'move',
        'download',
        'fullscreen',
        'caption'
      ]
    });

    return () => {
      if (viewer && viewer.destroy) viewer.destroy();
    };
  }, [imageUrl]);

  return (
    <div className="pano-modal-overlay">
      <div className="pano-modal-content">
        <div ref={viewerRef} style={{ width: '100%', height: '100%' }}>
          <div className="pano-loading">ACCESSING SATELLITE FEED...</div>
        </div>
        <button className="close-pano" onClick={onClose}>×</button>
      </div>
    </div>
  );
};

export default PanoramaViewer;
