import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X, Calendar as CalIcon, MapPin } from 'lucide-react';

const TravelCalendar = ({ events, onClose, onSelectDate }) => {
  const [viewMode, setViewMode] = useState('year'); // 'year' or 'month'
  const [currentDate, setCurrentDate] = useState(new Date());

  // Group events by Trip ID to find ranges
  const trips = useMemo(() => {
    const tripMap = {};
    events.forEach(ev => {
      if (!ev.trip_id) return;
      if (!tripMap[ev.trip_id]) {
        tripMap[ev.trip_id] = { id: ev.trip_id, events: [], start: null, end: null, title: ev.title };
      }
      tripMap[ev.trip_id].events.push(ev);
    });

    Object.values(tripMap).forEach(trip => {
      trip.events.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
      trip.start = new Date(trip.events[0].start_datetime);
      trip.end = new Date(trip.events[trip.events.length - 1].start_datetime);
      // Determine if Round Trip or One Way
      // Simple heuristic: range > 1 day?
    });
    return Object.values(tripMap);
  }, [events]);

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const isDateInTrip = (date, trip) => {
    const d = new Date(date).setHours(0,0,0,0);
    const s = new Date(trip.start).setHours(0,0,0,0);
    const e = new Date(trip.end).setHours(0,0,0,0);
    return d >= s && d <= e;
  };

  const getDayStatus = (year, month, day) => {
    const d = new Date(year, month, day);
    const dateStr = d.toDateString();
    
    // Check if any event falls on this day
    const dayEvents = events.filter(e => new Date(e.start_datetime).toDateString() === dateStr);
    
    // Check if inside any trip range
    const activeTrip = trips.find(t => isDateInTrip(d, t));
    
    let status = '';
    if (dayEvents.length > 0) status = 'event-day';
    else if (activeTrip) status = 'trip-range';
    
    return { status, events: dayEvents, trip: activeTrip };
  };

  const renderMonthGrid = (year, month, isMini = false) => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    // Empty cells for padding
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="cal-day empty" />);
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const { status, trip } = getDayStatus(year, month, i);
        days.push(
            <div 
                key={i} 
                className={`cal-day ${status} ${trip ? 'in-trip' : ''}`}
                onClick={(e) => {
                    e.stopPropagation();
                    if(!isMini) {
                        // Select date logic
                    } else {
                        setCurrentDate(new Date(year, month, 1));
                        setViewMode('month');
                    }
                }}
            >
                {i}
                {!isMini && status === 'event-day' && <div className="event-dot" />}
            </div>
        );
    }

    return (
      <div className={`month-grid ${isMini ? 'mini' : ''}`}>
        <div className="month-name">
            {new Date(year, month).toLocaleString('default', { month: 'long' })} {isMini ? '' : year}
        </div>
        <div className="weekdays">
            <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
        </div>
        <div className="days-container">
            {days}
        </div>
      </div>
    );
  };

  const renderYearView = () => {
    const year = currentDate.getFullYear();
    const months = [];
    for (let i = 0; i < 12; i++) {
        months.push(
            <div key={i} className="year-month-cell">
                {renderMonthGrid(year, i, true)}
            </div>
        );
    }
    return (
        <div className="year-view-container">
            <div className="year-header">
                <button onClick={() => setCurrentDate(new Date(year - 1, 0, 1))}><ChevronLeft /></button>
                <h2>{year}</h2>
                <button onClick={() => setCurrentDate(new Date(year + 1, 0, 1))}><ChevronRight /></button>
            </div>
            <div className="year-grid">
                {months}
            </div>
        </div>
    );
  };

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    return (
        <div className="month-view-container">
             <div className="month-header">
                <button onClick={() => setViewMode('year')}>Back to Year</button>
                <div className="nav-controls">
                    <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))}><ChevronLeft /></button>
                    <h2>{new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                    <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))}><ChevronRight /></button>
                </div>
            </div>
            <div className="large-month-body">
                {renderMonthGrid(year, month, false)}
            </div>
            
            {/* Trip Details List for this Month */}
            <div className="month-events-list">
                <h3>Travels in {new Date(year, month).toLocaleString('default', { month: 'long' })}</h3>
                {events
                    .filter(e => {
                        const d = new Date(e.start_datetime);
                        return d.getFullYear() === year && d.getMonth() === month;
                    })
                    .sort((a,b) => new Date(a.start_datetime) - new Date(b.start_datetime))
                    .map(ev => (
                        <div key={ev.id} className="event-list-item">
                            <span className="ev-date">{new Date(ev.start_datetime).getDate()}</span>
                            <span className="ev-loc">{ev.to_name}</span>
                            <span className="ev-title">{ev.title}</span>
                        </div>
                    ))
                }
            </div>
        </div>
    );
  };

  return (
    <div className="calendar-overlay anime-fade-in" onClick={onClose}>
        <div className="calendar-container glass-panel" onClick={e => e.stopPropagation()}>
            <button className="close-cal-btn" onClick={onClose}><X /></button>
            {viewMode === 'year' ? renderYearView() : renderMonthView()}
        </div>
    </div>
  );
};

export default TravelCalendar;
