import React, { useState } from 'react';
import { Calendar, Activity, X } from 'lucide-react';

const TripPreparation = ({ items, onToggle, onAdd, onDelete }) => {
    const categories = ['Documents', 'Packing', 'Finance', 'Tasks'];
    const readiness = items.length > 0 
        ? Math.round((items.filter(i => i.is_checked).length / items.length) * 100) 
        : 0;

    return (
        <div className="preparation-tab-content">
            <div className="prep-readiness-hud glass-panel">
                <div className="hud-label">PRE-FLIGHT READINESS</div>
                <div className="progress-bar-wrap">
                    <div className="progress-fill" style={{width: `${readiness}%`}}></div>
                    {readiness > 0 && <span className="percent">{readiness}% Complete</span>}
                </div>
            </div>

            <div className="prep-grid">
                {categories.map(cat => (
                    <div key={cat} className="prep-category-card glass-panel">
                        <div className="category-header">
                           <h3>{cat.toUpperCase()}</h3>
                           <span className="count-badge">{items.filter(i => i.category === cat).length}</span>
                        </div>
                        
                        <div className="prep-items-list">
                            {items.filter(i => i.category === cat).map(item => (
                                <div key={item.id} className={`prep-item ${item.is_checked ? 'checked' : ''}`}>
                                    <div className="check-box" onClick={() => onToggle(item)}>
                                        {item.is_checked && <Activity size={14}/>}
                                    </div>
                                    <span className="name">{item.item_name}</span>
                                    <button className="delete-mini" onClick={() => onDelete(item.id)}>
                                        <X size={14}/>
                                    </button>
                                 </div>
                            ))}
                            {items.filter(i => i.category === cat).length === 0 && (
                                <div className="empty-category-hint">
                                    Ready to be filled
                                </div>
                            )}
                        </div>
                        <div className="prep-add-row">
                            <input 
                                type="text" 
                                placeholder={`+ New ${cat} item...`} 
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.target.value.trim()) {
                                        onAdd(e.target.value, cat);
                                        e.target.value = '';
                                    }
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>
            
            {items.length === 0 && (
                <div className="prep-empty-state-hero glass-panel">
                    <div className="hero-icon"><Calendar size={48} opacity={0.2}/></div>
                    <h2>The journey begins with preparation.</h2>
                    <p>Start adding documents, packing lists, and financial tasks to ensure a smooth trip.</p>
                </div>
            )}
        </div>
    );
};

export default TripPreparation;
