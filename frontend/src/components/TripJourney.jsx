import React from 'react';
import { Plane, Moon, Plus, Camera, MapPin } from 'lucide-react';
import './TripJourney.css';

const TripJourney = ({ feedItems, onUploadClick, trip }) => {
   const formatDate = value => value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Open';
   const stopCount = feedItems.filter(item => item.type === 'stay').length;

   return (
      <div className="journey-tab-content">
         <div className="tab-context-row journey-context">
            <div>
               <span className="tab-kicker">JOURNEY</span>
               <h2>Stops and memories</h2>
            </div>
            <p>{stopCount} mapped stops, ordered by the path drawn on the globe.</p>
         </div>

      <div className="feed-stream">
         <div className="feed-node system">
            <div className="node-line"></div>
            <div className="node-dot start"></div>
            <div className="node-content">
               <span>Trip Started from <strong>{trip?.events[0]?.from_name}</strong></span>
            </div>
         </div>
         {feedItems.map((item, idx) => (
            <React.Fragment key={item.id}>
               {item.type === 'transit' ? (
                  <div className="feed-node transit">
                     <div className="node-line"></div>
                     <div className="transit-card glass-panel">
                        <div className="transit-icon"><Plane size={16}/></div>
                        <div className="transit-info">
                           <span className="transit-route">{item.data.from_name} to {item.data.to_name}</span>
                           <span className="transit-meta">{formatDate(item.data.start_datetime)}</span>
                        </div>
                     </div>
                  </div>
               ) : (
                  <div className="feed-node stay">
                     <div className="node-line"></div>
                     <div className="stay-card glass-panel">
                        <div className="stay-header">
                           <div className="stay-heading">
                              <span className="stop-index">STOP {Math.ceil(idx / 2) + 1}</span>
                              <h2>{item.city}</h2>
                              <div className="stay-meta">
                                 <span className="nights-badge"><Moon size={12}/> {item.duration} Nights</span>
                                 <span>{formatDate(item.data.start_datetime)} - {item.endDate ? formatDate(item.endDate) : 'End'}</span>
                              </div>
                           </div>
                           <button className="add-memories-btn" type="button" onClick={() => onUploadClick(item.data.id)}>
                              <Plus size={14}/> Memory
                           </button>
                        </div>
                        <div className="stay-gallery-grid">
                           {item.media.slice(0, 6).map((m) => (
                              <div key={m.id} className="stay-media-thumb">
                                 <img src={m.url} loading="lazy" alt={`${item.city} memory`} />
                              </div>
                           ))}
                           {item.media.length > 6 && (
                              <div className="stay-media-more">+{item.media.length - 6}</div>
                           )}
                           {item.media.length === 0 && (
                              <button className="empty-stay-placeholder" type="button" onClick={() => onUploadClick(item.data.id)}>
                                 <Camera size={20}/>
                                 <span>Add photos for {item.city}</span>
                              </button>
                           )}
                        </div>
                        <div className="stay-footnote">
                           <MapPin size={14} />
                           <span>Media added here appears in both this stop and the Gallery tab.</span>
                        </div>
                     </div>
                  </div>
               )}
            </React.Fragment>
         ))}
         <div className="feed-node end"><div className="node-dot end"></div><div className="node-content"><span>Trip Completed</span></div></div>
      </div>
      </div>
   );
};

export default TripJourney;
