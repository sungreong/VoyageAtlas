import React from 'react';
import { X, FileText, Briefcase, CreditCard, CheckSquare, Plus, CheckCircle, Circle } from 'lucide-react';
import './TripPreparation.css';

const TripPreparation = ({ items, onToggle, onAdd, onDelete }) => {
    const categoryConfig = {
        'Documents': { icon: FileText, label: 'DOCUMENTS', title: 'Tickets, visa, insurance', empty: 'Add your first required document.', placeholder: 'Passport, e-ticket, insurance...', color: '#38e8ff' },
        'Packing': { icon: Briefcase, label: 'PACKING', title: 'Bags and essentials', empty: 'Start a packing list for this route.', placeholder: 'Adapter, rain shell, charger...', color: '#b66cff' },
        'Finance': { icon: CreditCard, label: 'FINANCE', title: 'Budget and payments', empty: 'Track cash, cards, and bookings.', placeholder: 'Hotel deposit, local cash...', color: '#36f5a4' },
        'Tasks': { icon: CheckSquare, label: 'TASKS', title: 'Before you depart', empty: 'Queue the next thing to handle.', placeholder: 'Check in online, book transfer...', color: '#ffd166' }
    };
    
    const categories = Object.keys(categoryConfig);
    
    const totalItems = items.length;
    const completedItems = items.filter(i => i.is_checked).length;
    const readiness = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    const readinessLabel = totalItems === 0
        ? 'Build a checklist to prepare this odyssey.'
        : `${completedItems} of ${totalItems} items ready`;

    return (
        <div className="preparation-tab-content">
            <div className="tab-context-row prep-context">
                <div>
                    <span className="tab-kicker">PREPARATION</span>
                    <h2>Launch checklist</h2>
                </div>
                <p>Keep the practical work close to the trip, then let the globe stay focused on the route.</p>
            </div>

            <div className="prep-status-bar">
                <div className="status-info">
                   <div className="status-label">PRE-FLIGHT READINESS</div>
                   <div className="status-value">{readiness}% <span className="status-sub">SYSTEM STATUS</span></div>
                   <span className="status-note">{readinessLabel}</span>
                </div>
                <div className="status-visualizer">
                    <div className="status-track">
                        <div className="status-fill" style={{width: `${readiness}%`}}></div>
                    </div>
                </div>
            </div>

            <div className="prep-grid-v2">
                {categories.map(cat => {
                    const CatIcon = categoryConfig[cat].icon;
                    const config = categoryConfig[cat];
                    const catItems = items.filter(i => i.category === cat);
                    const catTotal = catItems.length;
                    const catDone = catItems.filter(i => i.is_checked).length;
                    const catProgress = catTotal > 0 ? (catDone / catTotal) * 100 : 0;
                    
                    return (
                        <div key={cat} className="prep-module glass-panel" style={{'--accent-color': config.color}}>
                            <div className="module-bg-icon">
                                <CatIcon size={120} strokeWidth={1} />
                            </div>

                            <div className="module-header">
                                <div className="module-title">
                                    <CatIcon size={18} className="title-icon"/>
                                    <div>
                                        <h3>{config.label}</h3>
                                        <span>{config.title}</span>
                                    </div>
                                </div>
                                <div className="module-stats">
                                    <span>{catDone}/{catTotal}</span>
                                </div>
                            </div>

                            <div className="module-progress-line">
                                <div className="line-fill" style={{width: `${catProgress}%`}}></div>
                            </div>
                            
                            <div className="module-content">
                                {catItems.length > 0 ? (
                                    <div className="prep-items-list-v2">
                                        {catItems.map(item => (
                                            <div key={item.id} className={`prep-item-v2 ${item.is_checked ? 'checked' : ''}`}>
                                                <button className="check-trigger" type="button" aria-label={`Toggle ${item.item_name}`} onClick={() => onToggle(item)}>
                                                    {item.is_checked 
                                                        ? <CheckCircle size={18} className="check-icon on"/> 
                                                        : <Circle size={18} className="check-icon off"/>
                                                    }
                                                </button>
                                                <span className="item-name">{item.item_name}</span>
                                                <button className="delete-btn-v2" type="button" aria-label={`Delete ${item.item_name}`} onClick={() => onDelete(item.id)}>
                                                    <X size={14}/>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-module-state">
                                        <CatIcon size={24} />
                                        <span>{config.empty}</span>
                                    </div>
                                )}
                            </div>

                            <div className="module-footer">
                                <div className="add-input-wrapper">
                                    <Plus size={16} className="add-icon"/>
                                    <input 
                                        type="text" 
                                        aria-label={`Add ${config.label.toLowerCase()} item`}
                                        placeholder={config.placeholder}
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
