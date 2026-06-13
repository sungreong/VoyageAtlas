import React from 'react';
import { Camera, MapPin, Image } from 'lucide-react';
import './Gallery.css'; // Ensure local CSS is used

const TripGallery = ({ media, activeFilter, onImageClick }) => {
    const scopeLabel = activeFilter === 'ALL' ? 'all stops' : activeFilter;

    return (
        <div className="unified-gallery">
            <div className="tab-context-row gallery-context">
                <div>
                    <span className="tab-kicker">GALLERY</span>
                    <h2>Visual travel log</h2>
                </div>
                <p>{media.length} memories shown for {scopeLabel}.</p>
            </div>

            {media.length === 0 ? (
                <div className="empty-state">
                    <Camera size={42}/>
                    <strong>No memories here yet</strong>
                    <p>Add photos from the Journey tab to make this route feel alive.</p>
                </div>
            ) : (
                <div className="masonry-grid">
                    {media.map(m => (
                        <button key={m.id} type="button" className="masonry-item" onClick={() => onImageClick && onImageClick(m.url)}>
                            <img src={m.url} loading="lazy" alt={m.city || "Travel memory"} />
                            <div className="masonry-overlay">
                                <span className="loc-tag"><MapPin size={10}/> {m.city}</span>
                                <span className="media-type-tag"><Image size={10}/> Memory</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TripGallery;
