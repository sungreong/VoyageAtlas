import React from 'react';
import { Calendar, MapPin, Camera, DollarSign, Edit } from 'lucide-react';
import './TripOverview.css';

const TripOverview = ({ 
    trip, 
    stats, 
    mediaCount, 
    prepItems, 
    cities, 
    isEditing, 
    editValues, 
    setEditValues, 
    setIsEditing, 
    onSave 
}) => {
    const checkedCount = prepItems.filter(i => i.is_checked).length;
    const totalPrep = prepItems.length;

    return (
      <div className="overview-tab-content">
         <div className="overview-stats-row">
            <div className="stat-card-compact">
               <div className="stat-icon-small"><Calendar size={20}/></div>
               <div className="stat-info-compact">
                  <span className="val">{stats?.days}</span>
                  <span className="lbl">Days</span>
               </div>
            </div>
            <div className="stat-card-compact">
               <div className="stat-icon-small"><MapPin size={20}/></div>
               <div className="stat-info-compact">
                  <span className="val">{stats?.cityCount}</span>
                  <span className="lbl">Cities</span>
               </div>
            </div>
            <div className="stat-card-compact">
               <div className="stat-icon-small"><Camera size={20}/></div>
               <div className="stat-info-compact">
                  <span className="val">{mediaCount}</span>
                  <span className="lbl">Photos</span>
               </div>
            </div>
            <div className="stat-card-compact cost-highlight">
               <div className="stat-icon-small"><DollarSign size={20}/></div>
               <div className="stat-info-compact">
                  {isEditing ? (
                       <input 
                          type="number" 
                          className="cost-field-simple"
                          value={editValues.cost}
                          onChange={e => setEditValues({...editValues, cost: e.target.value})}
                       />
                  ) : (
                      <span className="val">${parseFloat(editValues.cost || 0).toLocaleString()}</span>
                  )}
                  <span className="lbl">Budget</span>
               </div>
            </div>
         </div>

         <div className="overview-grid-main">
           {/* Primary: Trip Reflection */}
           <div className="overview-main-column">
              <div className="overview-card glass-panel reflection-box-v2">
                 <div className="card-header-with-action">
                    <h2 className="premium-header">Trip Reflection</h2>
                    {!isEditing && (
                        <button className="edit-icon-btn" onClick={() => setIsEditing(true)}>
                           <Edit size={16}/>
                        </button>
                    )}
                 </div>
                 
                 <div className="reflection-display">
                    {isEditing ? (
                        <textarea 
                           className="reflection-editor"
                           value={editValues.note}
                           placeholder="Describe your journey... The sights, the sounds, the feelings."
                           onChange={e => setEditValues({...editValues, note: e.target.value})}
                        />
                    ) : (
                        <div className="reflection-text-wrapper">
                           <p className={!editValues.note ? "empty-reflection" : "rich-reflection"}>
                              {editValues.note || "Every journey tells a story. Click the edit icon to share your reflections on this adventure."}
                           </p>
                        </div>
                    )}
                 </div>

                 {isEditing && (
                    <div className="editor-controls">
                       <button className="save-btn primary" onClick={onSave}>SAVE NOTES</button>
                       <button className="cancel-btn" onClick={() => setIsEditing(false)}>DISCARD</button>
                    </div>
                 )}
              </div>
           </div>

           {/* Sidebar: Stats & Route */}
           <div className="overview-sidebar">
               {/* Preparation Summary Snapshot */}
               <div className="overview-card glass-panel prep-summary-snapshot">
                  <h3 className="sidebar-label">PREPARATION</h3>
                  <div className="sidebar-content-wrap">
                     <div className="sidebar-stats-row">
                        <span className="stat-label">{checkedCount}/{totalPrep} Items Ready</span>
                        <span className="stat-val">{totalPrep > 0 ? Math.round((checkedCount/totalPrep)*100) : 0}%</span>
                     </div>
                     <div className="progress-bar-wrap thin">
                        <div className="progress-fill" style={{width: `${totalPrep > 0 ? (checkedCount/totalPrep)*100 : 0}%`}}></div>
                     </div>
                  </div>
               </div>

              <div className="overview-card glass-panel route-card-v2">
                 <h3 className="sidebar-label">YOUR ROUTE</h3>
                 <div className="compact-route-list">
                    <div className="route-stop start">
                       <div className="stop-marker"></div>
                       <span>{trip.events[0]?.from_name}</span>
                    </div>
                    {cities.map((city, idx) => (
                       <React.Fragment key={city}>
                          <div className="route-link-line"></div>
                          <div className="route-stop">
                             <div className="stop-marker active"></div>
                             <span>{city}</span>
                          </div>
                       </React.Fragment>
                    ))}
                 </div>
              </div>
            </div>
         </div>
      </div>
    );
};

export default TripOverview;
