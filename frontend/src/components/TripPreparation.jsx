import React, { useState } from 'react';
import { Calendar, Activity, X, FileText, Briefcase, CreditCard, CheckSquare, Plus, CheckCircle, Circle } from 'lucide-react';
import './TripPreparation.css';

const TripPreparation = ({ items, onToggle, onAdd, onDelete }) => {
    // Define categories with their specific metadata (icons, labels, colors)
    const categoryConfig = {
        'Documents': { icon: FileText, label: 'DOCUMENTS', color: '#00f2ff' }, // Cyan
        'Packing': { icon: Briefcase, label: 'PACKING', color: '#bd00ff' },   // Purple
        'Finance': { icon: CreditCard, label: 'FINANCE', color: '#00ff9d' },  // Green
        'Tasks': { icon: CheckSquare, label: 'TASKS', color: '#ffbd00' }      // Orange
    };
    
    const categories = Object.keys(categoryConfig);
    
    // Calculate overall readiness
    const totalItems = items.length;
    const completedItems = items.filter(i => i.is_checked).length;
    const readiness = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return (
        <div className="preparation-tab-content">
            {/* HUD / Status Bar */}
            <div className="prep-status-bar">
                <div className="status-info">
                   <div className="status-label">PRE-FLIGHT READINESS</div>
                   <div className="status-value">{readiness}% <span className="status-sub">SYSTEM STATUS</span></div>
                </div>
                <div className="status-visualizer">
                    <div className="status-track">
                        <div className="status-fill" style={{width: `${readiness}%`}}></div>
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="prep-grid-v2">
                {categories.map(cat => {
                    const CatIcon = categoryConfig[cat].icon;
                    const catItems = items.filter(i => i.category === cat);
                    const catTotal = catItems.length;
                    const catDone = catItems.filter(i => i.is_checked).length;
                    const catProgress = catTotal > 0 ? (catDone / catTotal) * 100 : 0;
                    
                    return (
                        <div key={cat} className="prep-module glass-panel" style={{'--accent-color': categoryConfig[cat].color}}>
                            {/* Background Icon Watermark */}
                            <div className="module-bg-icon">
                                <CatIcon size={120} strokeWidth={1} />
                            </div>

                            <div className="module-header">
                                <div className="module-title">
                                    <CatIcon size={18} className="title-icon"/>
                                    <h3>{categoryConfig[cat].label}</h3>
                                </div>
                                <div className="module-stats">
                                    <span>{catDone}/{catTotal}</span>
                                </div>
                            </div>

                            {/* Mini Progress Line for Category */}
                            <div className="module-progress-line">
                                <div className="line-fill" style={{width: `${catProgress}%`}}></div>
                            </div>
                            
                            <div className="module-content">
                                {catItems.length > 0 ? (
                                    <div className="prep-items-list-v2">
                                        {catItems.map(item => (
                                            <div key={item.id} className={`prep-item-v2 ${item.is_checked ? 'checked' : ''}`}>
                                                <div className="check-trigger" onClick={() => onToggle(item)}>
                                                    {item.is_checked 
                                                        ? <CheckCircle size={18} className="check-icon on"/> 
                                                        : <Circle size={18} className="check-icon off"/>
                                                    }
                                                </div>
                                                <span className="item-name">{item.item_name}</span>
                                                <button className="delete-btn-v2" onClick={() => onDelete(item.id)}>
                                                    <X size={14}/>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-module-state">
                                        <span>No items initialized</span>
                                    </div>
                                )}
                            </div>

                            <div className="module-footer">
                                <div className="add-input-wrapper">
                                    <Plus size={16} className="add-icon"/>
                                    <input 
                                        type="text" 
                                        placeholder="Add item..." 
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && e.target.value.trim()) {
                                                onAdd(e.target.value, cat);
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TripPreparation;
