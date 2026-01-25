import React from 'react';
import { Camera, MapPin } from 'lucide-react';
import './Gallery.css'; // Ensure local CSS is used

const TripGallery = ({ media, activeFilter, onImageClick }) => {
    return (
        <div className="unified-gallery">
            {media.length === 0 ? (
                <div className="empty-state">
                    <Camera size={48} opacity={0.3}/>
                    <p>No photos found for {activeFilter === 'ALL' ? 'this trip' : activeFilter}.</p>
                </div>
            ) : (
                <div className="masonry-grid">
                    {media.map(m => (
                        <div key={m.id} className="masonry-item" onClick={() => onImageClick && onImageClick(m.url)}>
                            <img src={m.url} loading="lazy" alt={m.city || "Travel memory"} />
                            <div className="masonry-overlay">
                                <span className="loc-tag"><MapPin size={10}/> {m.city}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TripGallery;
