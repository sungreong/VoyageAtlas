import React from 'react';
import { Plane, Moon, Plus, Camera, MapPin, ArrowRight } from 'lucide-react';
import './TripJourney.css';

const TripJourney = ({ feedItems, onUploadClick, trip }) => {
   const formatDate = value => value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Open';
   const stopCount = feedItems.filter(item => item.type === 'stay').length;
   const legCount = feedItems.filter(item => item.type === 'transit').length;
   const mediaCount = feedItems.reduce((sum, item) => sum + (item.media?.length || item.data?.media_list?.length || 0), 0);
   let transitIndex = 0;
   let stopIndex = 0;
   const ledgerItems = feedItems.map(item => {
      if (item.type === 'transit') {
         transitIndex += 1;
         return { ...item, displayIndex: transitIndex };
      }
      stopIndex += 1;
      return { ...item, displayIndex: stopIndex };
   });

   return (
      <div className="journey-tab-content">
         <div className="tab-context-row journey-context">
            <div>
               <span className="tab-kicker">JOURNEY</span>
               <h2>Stops and memories</h2>
            </div>
            <p>{stopCount} mapped stops, ordered by the path drawn on the globe.</p>
         </div>

         <div className="journey-summary-strip">
            <div>
               <span>START</span>
               <strong>{trip?.events[0]?.from_name || '-'}</strong>
            </div>
            <div>
               <span>LEGS</span>
               <strong>{legCount}</strong>
            </div>
            <div>
               <span>STOPS</span>
               <strong>{stopCount}</strong>
            </div>
            <div>
               <span>MEDIA</span>
               <strong>{mediaCount}</strong>
            </div>
         </div>

         <div className="journey-ledger">
            <div className="journey-ledger-head">
               <span>SEQ</span>
               <span>ROUTE / STOP</span>
               <span>DATE</span>
               <span>MEMORY</span>
            </div>

            {ledgerItems.map((item) => (
               <React.Fragment key={item.id}>
               {item.type === 'transit' ? (
                  <div className="journey-ledger-row transit">
                     <span className="ledger-index">L{String(item.displayIndex).padStart(2, '0')}</span>
                     <div className="ledger-main">
                        <div className="ledger-route">
                           <Plane size={15}/>
                           <strong>{item.data.from_name}</strong>
                           <ArrowRight size={13}/>
                           <strong>{item.data.to_name}</strong>
                        </div>
                        <span className="ledger-subline">Travel leg on the globe route</span>
                     </div>
                     <span className="ledger-date">{formatDate(item.data.start_datetime)}</span>
                     <span className="ledger-memory muted">Transit</span>
                  </div>
               ) : (
                  <div className="journey-ledger-row stay">
                     <span className="ledger-index">S{String(item.displayIndex).padStart(2, '0')}</span>
                     <div className="ledger-main">
                        <div className="ledger-route">
                           <MapPin size={15}/>
                           <strong>{item.city}</strong>
                           <span className="nights-badge compact"><Moon size={12}/> {item.duration} nights</span>
                        </div>
                        <span className="ledger-subline">Stay window: {formatDate(item.data.start_datetime)} - {item.endDate ? formatDate(item.endDate) : 'End'}</span>
                     </div>
                     <span className="ledger-date">{formatDate(item.data.start_datetime)}</span>
                     <div className="ledger-memory">
                        <div className="memory-preview-strip">
                           {item.media.slice(0, 4).map((m) => (
                              <span key={m.id} className="memory-thumb">
                                 <img src={m.url} loading="lazy" alt={`${item.city} memory`} />
                              </span>
                           ))}
                           {item.media.length > 4 && <span className="memory-more">+{item.media.length - 4}</span>}
                           {item.media.length === 0 && <span className="memory-empty"><Camera size={13}/> No media</span>}
                        </div>
                        <button className="add-memories-btn compact" type="button" onClick={() => onUploadClick(item.data.id)}>
                           <Plus size={13}/> Add
                        </button>
                     </div>
                  </div>
               )}
               </React.Fragment>
            ))}

            <div className="journey-ledger-row complete">
               <span className="ledger-index">END</span>
               <div className="ledger-main">
                  <div className="ledger-route">
                     <Camera size={15}/>
                     <strong>Trip Completed</strong>
                  </div>
               </div>
               <span className="ledger-date">-</span>
               <span className="ledger-memory muted">Archived</span>
            </div>
         </div>
      </div>
   );
};

export default TripJourney;
