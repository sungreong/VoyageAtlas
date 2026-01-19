import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { X, ChevronLeft, ChevronRight, Maximize2, Download, Expand, Trash2, Plus, Edit3, Save } from 'lucide-react';

const MediaCarousel = ({ mediaList, initialIndex = 0, onClose, eventId }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [localMediaList, setLocalMediaList] = useState(mediaList || []);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (mediaList) {
        setLocalMediaList(mediaList);
    }
  }, [mediaList]);

  if (!localMediaList || localMediaList.length === 0 && !isEditMode) return null;

  const handlePrev = (e) => {
    if (e) e.stopPropagation();
    if (localMediaList.length === 0) return;
    setCurrentIndex((prev) => (prev === 0 ? localMediaList.length - 1 : prev - 1));
    setDragOffset(0);
  };

  const handleNext = (e) => {
    if (e) e.stopPropagation();
    if (localMediaList.length === 0) return;
    setCurrentIndex((prev) => (prev === localMediaList.length - 1 ? 0 : prev + 1));
    setDragOffset(0);
  };

  const onDragStart = (e) => {
    if (isZoomed || isEditMode) return;
    setIsDragging(true);
    setStartX(e.pageX || (e.touches && e.touches[0].pageX));
  };

  const onDragMove = (e) => {
    if (!isDragging) return;
    const currentX = e.pageX || (e.touches && e.touches[0].pageX);
    const diff = currentX - startX;
    setDragOffset(diff);
  };

  const onDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragOffset > 100) handlePrev();
    else if (dragOffset < -100) handleNext();
    setDragOffset(0);
  };

  const handleDelete = async (e, mediaId) => {
    e.stopPropagation();
    if (!window.confirm("Permanently delete this media?")) return;
    
    try {
      await axios.delete(`/api/events/media/${mediaId}`);
      const newList = localMediaList.filter(m => m.id !== mediaId);
      setLocalMediaList(newList);
      if (currentIndex >= newList.length) {
          setCurrentIndex(Math.max(0, newList.length - 1));
      }
    } catch (err) {
      // Detailed error for debugging
      const errorMsg = err.response 
        ? `Server Error: ${err.response.status} ${err.response.data?.detail || ''}` 
        : `Network/Client Error: ${err.message}`;
      alert(`Failed to delete: ${errorMsg}`);
      console.error(err);
    }
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Robust ID resolution: 
    // 1. passed prop `eventId` (best)
    // 2. event_id from current media item (if list not empty)
    const targetEventId = eventId || (localMediaList.length > 0 ? localMediaList[0].event_id : null);
    
    if (!targetEventId) {
      alert("Cannot determine Event ID for upload. Please upload from the main timeline first.");
      return;
    }

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
    }

    try {
      const res = await axios.post(`/api/events/${targetEventId}/media`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // Backend now returns the list of new media objects
      const newMediaItems = res.data;
      
      // Update local list immediately (Optimistic UI + Actual Data)
      const updatedList = [...localMediaList, ...newMediaItems];
      setLocalMediaList(updatedList);
      
      // If we are showing "NO MEDIA", now we have some.
      // Update index to show the first new item if we were empty?
      if (localMediaList.length === 0 && newMediaItems.length > 0) {
        setCurrentIndex(0);
      } else {
        // Or jump to the first new item?
        setCurrentIndex(localMediaList.length);
      }
      
      alert("Media uploaded successfully!");
      // We do NOT close the carousel, so user sees the new item immediately.
      // We might want to trigger a background refresh for the parent (App.jsx) 
      // so when user eventually closes, the thumbnails are ready.
      // We can use a prop `onUpdate` if available, or just rely on next open.
      
    } catch (err) {
       const errorMsg = err.response 
        ? `Server Error: ${err.response.status} ${err.response.data?.detail || ''}` 
        : `Network/Client Error: ${err.message}`;
      alert(`Upload failed: ${errorMsg}`);
      console.error(err);
    }
  };

  const renderMedia = (media, index, isFull = false) => {
    const isActive = index === currentIndex;
    const mediaCls = isFull ? "zoom-media" : "carousel-media";
    if (media.media_type === 'video') {
      return (
        <div key={media.id || index} className={isFull ? "" : `carousel-item ${isActive ? 'active' : ''}`} onClick={() => !isFull && !isEditMode && setCurrentIndex(index)}>
          <video 
            src={media.url} 
            className={mediaCls}
            autoPlay={isActive || isFull}
            muted={!isFull}
            controls={isFull}
            loop
            onClick={(e) => { if(!isActive && !isFull) e.stopPropagation(); }}
          />
          {isEditMode && !isFull && (
            <button className="delete-overlay-btn" onClick={(e) => handleDelete(e, media.id)}>
                <Trash2 size={20} />
            </button>
          )}
        </div>
      );
    }
    return (
      <div key={media.id || index} className={isFull ? "" : `carousel-item ${isActive ? 'active' : ''}`} onClick={() => !isFull && !isEditMode && setCurrentIndex(index)}>
        <img 
          src={media.url} 
          alt="Travel Detail" 
          className={mediaCls} 
          onDragStart={(e) => e.preventDefault()}
        />
        {isEditMode && !isFull && (
            <button className="delete-overlay-btn" onClick={(e) => handleDelete(e, media.id)}>
                <Trash2 size={20} />
            </button>
        )}
      </div>
    );
  };

  const itemWidth = 320; 
  const trackOffset = -currentIndex * itemWidth + dragOffset;
  const displayIndex = localMediaList.length > 0 ? currentIndex + 1 : 0;

  return (
    <div className="pano-modal-overlay" onClick={onClose}>
      <div className="carousel-container-strip glass-panel" onClick={e => e.stopPropagation()}>
        <div className="carousel-header">
          <div className="carousel-status hud-font">
            <Maximize2 size={14} /> MULTI-ITEM DATA STREAM | {displayIndex} / {localMediaList.length}
          </div>
          <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
             <button 
               className={`carousel-edit ${isEditMode ? 'active' : ''}`} 
               onClick={() => setIsEditMode(!isEditMode)}
               title={isEditMode ? "Save & Exit Edit Mode" : "Enter Edit Mode"}
               style={{background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center'}}
             >
               {isEditMode ? <Save size={20} /> : <Edit3 size={20} />}
             </button>
             <button className="carousel-close" onClick={onClose}><X size={20} /></button>
          </div>
        </div>

        <div 
          className="carousel-viewport"
          onMouseDown={onDragStart}
          onMouseMove={onDragMove}
          onMouseUp={onDragEnd}
          onMouseLeave={onDragEnd}
          onTouchStart={onDragStart}
          onTouchMove={onDragMove}
          onTouchEnd={onDragEnd}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          {localMediaList.length > 0 ? (
            <div 
                className="carousel-track" 
                style={{ 
                transform: `translateX(calc(50% - ${itemWidth / 2}px + ${trackOffset}px))`,
                transition: isDragging ? 'none' : 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)'
                }}
            >
                {localMediaList.map((media, idx) => renderMedia(media, idx))}
            </div>
          ) : (
            <div style={{width: '100%', textAlign: 'center', color: 'var(--primary)', opacity: 0.7}}>
                NO MEDIA AVAILABLE
            </div>
          )}

          <button className="carousel-nav-btn prev" onClick={handlePrev}>
            <ChevronLeft size={40} />
          </button>
          <button className="carousel-nav-btn next" onClick={handleNext}>
            <ChevronRight size={40} />
          </button>

          {isEditMode && (
             <div className="add-media-overlay" style={{
               position: 'absolute', bottom: '20px', right: '20px', zIndex: 50
             }}>
               <input 
                 type="file" 
                 multiple 
                 ref={fileInputRef} 
                 style={{display: 'none'}} 
                 onChange={handleFileUpload}
                 accept="image/*,video/*"
               />
               <button 
                 className="add-media-btn" 
                 onClick={() => fileInputRef.current.click()}
                 title="Add New Media"
                 style={{
                   background: 'var(--primary)', color: '#000', border: 'none', 
                   borderRadius: '50%', width: '50px', height: '50px', 
                   display: 'flex', alignItems: 'center', justifyContent: 'center',
                   cursor: 'pointer', boxShadow: '0 0 15px var(--primary)'
                 }}
               >
                 <Plus size={28} />
               </button>
             </div>
          )}
        </div>

        <div className="carousel-info-bar glass-panel">
          <div className="media-metadata hud-font">
            {localMediaList[currentIndex] ? (
               <>
                 FILE_ID: {localMediaList[currentIndex].id || 'S001'} | 
                 TYPE: {localMediaList[currentIndex].media_type.toUpperCase()} | 
                 COORD_LOCK: {localMediaList[currentIndex].event_id}
               </>
            ) : "NO SELECTION"}
          </div>
          <div className="carousel-actions">
            <button onClick={() => setIsZoomed(true)} title="Expand View" disabled={localMediaList.length === 0}>
              <Expand size={18} />
            </button>
            <button onClick={() => {
              if (localMediaList[currentIndex]) {
                const a = document.createElement('a');
                a.href = localMediaList[currentIndex].url;
                a.download = `media_voyage_${localMediaList[currentIndex].id || 'file'}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }
            }} title="Download" disabled={localMediaList.length === 0}>
              <Download size={18} />
            </button>
          </div>
        </div>

        <div className="carousel-pagination">
          {localMediaList.map((_, idx) => (
            <div 
              key={idx} 
              className={`pagination-dot ${idx === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(idx)}
            />
          ))}
        </div>
      </div>

      {isZoomed && localMediaList[currentIndex] && (
        <div className="zoom-overlay" onClick={() => setIsZoomed(false)}>
          <div className="zoom-content" onClick={e => e.stopPropagation()}>
            <button className="zoom-close-btn" onClick={() => setIsZoomed(false)}><X size={32} /></button>
            {renderMedia(localMediaList[currentIndex], currentIndex, true)}
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaCarousel;
