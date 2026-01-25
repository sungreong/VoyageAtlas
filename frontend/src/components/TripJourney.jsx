import React from 'react';
import { Plane, Moon, Plus, Camera } from 'lucide-react';

const TripJourney = ({ feedItems, onUploadClick, trip }) => {
   return (
      <div className="feed-stream">
         {/* ... System Start ... */}
         <div className="feed-node system">
            <div className="node-line"></div>
            <div className="node-dot start"></div>
            <div className="node-content">
               <span>Trip Started from <strong>{trip?.events[0]?.from_name}</strong></span>
            </div>
         </div>
         {/* Items */}
         {feedItems.map((item, idx) => (
            <React.Fragment key={item.id}>
               {item.type === 'transit' ? (
                  <div className="feed-node transit">
                     <div className="node-line"></div>
                     <div className="transit-card glass-panel">
                        <div className="transit-icon"><Plane size={16}/></div>
                        <div className="transit-info">
                           <span className="transit-route">Flight to {item.data.to_name}</span>
                           <span className="transit-meta">{new Date(item.data.start_datetime).toLocaleDateString()}</span>
                        </div>
                     </div>
                  </div>
               ) : (
                  <div className="feed-node stay">
                     <div className="node-line"></div>
                     <div className="stay-card glass-panel">
                        <div className="stay-header">
                           <div>
                              <h2>{item.city}</h2>
                              <div className="stay-meta">
                                 <span className="nights-badge"><Moon size={12}/> {item.duration} Nights</span>
                                 <span>{new Date(item.data.start_datetime).toLocaleDateString()} — {item.endDate ? item.endDate.toLocaleDateString() : 'End'}</span>
                              </div>
                           </div>
                           <button className="add-memories-btn" onClick={() => onUploadClick(item.data.id)}>
                              <Plus size={14}/> Add
                           </button>
                        </div>
                        <div className="stay-gallery-grid">
                           {item.media.map((m, mIdx) => (
                              <div key={m.id} className="stay-media-thumb">
                                 <img src={m.url} loading="lazy" alt="Stay memory" />
                              </div>
                           ))}
                           {item.media.length === 0 && (
                              <div className="empty-stay-placeholder" onClick={() => onUploadClick(item.data.id)}>
                                 <Camera size={20}/>
                                 <span>Add photos for {item.city}</span>
                              </div>
                           )}
                        </div>
                        <div className="stay-note-input">
                           <input type="text" placeholder={`Write a note about ${item.city}...`} />
                        </div>
                     </div>
                  </div>
               )}
            </React.Fragment>
         ))}
         <div className="feed-node end"><div className="node-dot end"></div><div className="node-content"><span>Trip Completed</span></div></div>
      </div>
   );
};

export default TripJourney;
