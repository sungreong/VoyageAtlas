import React, { useMemo } from 'react';
import { X, Globe } from 'lucide-react';
import './ContinentStats.css';
import { getContinent } from '../utils/continentUtils';

const ContinentStats = ({ events, onClose }) => {
    
    const stats = useMemo(() => {
        if (!events || events.length === 0) return [];

        const continentCounts = {};
        const visitedCities = new Set();

        events.forEach(event => {
            // Check 'to_name' (Destination)
            const cityKey = `${event.to_name}-${event.to_lat}-${event.to_lng}`;
            
            if (!visitedCities.has(cityKey)) {
                visitedCities.add(cityKey);
                
                const continent = getContinent(event.to_lat, event.to_lng);
                continentCounts[continent] = (continentCounts[continent] || 0) + 1;
            }
        });

        // Also check 'from_name' of the very first event? 
        // Typically we care about destinations. But if I started in Seoul, it counts as a place I've been.
        // Let's include the start of the first event if simpler.
        // For now, let's stick to destinations (legs completed).

        // Sort by count descending
        return Object.entries(continentCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

    }, [events]);

    return (
        <div className="continent-stats-panel">
            <div className="stats-header">
                <h2>Continent Stats</h2>
                <button className="close-stats-btn" onClick={onClose}>
                    <X size={20} />
                </button>
            </div>
            
            <div className="stats-list">
                {stats.length > 0 ? (
                    stats.map((stat, index) => (
                        <div key={stat.name} className="stat-row animate" style={{animationDelay: `${index * 0.1}s`}}>
                            <span className="continent-name">
                                {stat.name}
                            </span>
                            <span className="dots-leader"></span>
                            <span className="visit-count">{stat.count}</span>
                        </div>
                    ))
                ) : (
                    <div className="no-data">No travel data available</div>
                )}
            </div>
        </div>
    );
};

export default ContinentStats;
