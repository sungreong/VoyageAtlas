import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Crosshair,
  Filter,
  MapPinned,
  Route,
  RotateCcw,
  X
} from 'lucide-react';
import './GlobeJourneyInspector.css';

const hasValidCoords = (lat, lng) => Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));

const formatShortDate = (dateString) => {
  if (!dateString) return 'Unknown date';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return 'Invalid date';
  }
};

const formatDistanceValue = (value) => {
  const numeric = Number(value) || 0;
  return Math.round(numeric).toLocaleString();
};

const getTransportLabel = (transport) => {
  const key = String(transport || 'plane').toLowerCase();
  const labels = {
    plane: 'Flight',
    flight: 'Flight',
    ship: 'Sea',
    boat: 'Sea',
    ferry: 'Sea',
    cruise: 'Sea',
    train: 'Rail',
    rail: 'Rail',
    car: 'Road',
    bus: 'Road',
    ground: 'Road'
  };
  return labels[key] || 'Travel';
};

const GlobeJourneyInspector = ({
  events,
  currentEventIndex,
  selectedCity,
  isPlaying,
  onCityFocus,
  onEventFocus,
  globeFilter = { dateFrom: '', dateTo: '', places: [] },
  filterSummary = { isFiltered: false, dateLabel: 'All dates', placeLabel: 'All places', visibleLegs: 0, totalLegs: 0 },
  dateBounds = { min: '', max: '' },
  datePresetOptions = [{ value: 'all', label: 'All dates' }, { value: 'range', label: 'Custom range' }],
  placeOptions = [],
  onFilterChange,
  onFilterReset,
  onAddTravel
}) => {
  const [activeView, setActiveView] = useState('timeline');
  const [placePickerOpen, setPlacePickerOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const currentEvent = events[currentEventIndex] || null;
  const selectedPlaceCount = globeFilter.places?.length || 0;
  const dateMode = globeFilter.dateMode || 'all';
  const rawSelectedDatePreset = ['year', 'half', 'quarter', 'month'].includes(dateMode)
    ? `${dateMode}:${globeFilter.dateValue || ''}`
    : dateMode;
  const selectedDatePreset = datePresetOptions.some(option => option.value === rawSelectedDatePreset)
    ? rawSelectedDatePreset
    : 'all';
  const selectedDateOption = datePresetOptions.find(option => option.value === selectedDatePreset) || datePresetOptions[0];
  const groupedDateOptions = useMemo(() => {
    return datePresetOptions.reduce((groups, option) => {
      const group = option.group || 'Date';
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(option);
      return groups;
    }, new Map());
  }, [datePresetOptions]);

  const toggleFilterPlace = (placeName) => {
    const currentPlaces = globeFilter.places || [];
    const nextPlaces = currentPlaces.includes(placeName)
      ? currentPlaces.filter(name => name !== placeName)
      : [...currentPlaces, placeName];

    onFilterChange?.({ places: nextPlaces });
  };

  const handleDatePresetChange = (value) => {
    if (value === 'all') {
      onFilterChange?.({ dateMode: value, dateValue: '' });
      setDatePickerOpen(false);
      return;
    }

    if (value === 'range') {
      onFilterChange?.({
        dateMode: 'range',
        dateValue: '',
        dateFrom: globeFilter.dateFrom || dateBounds.min,
        dateTo: globeFilter.dateTo || dateBounds.max
      });
      setDatePickerOpen(false);
      return;
    }

    const [mode, dateValue] = value.split(':');
    onFilterChange?.({ dateMode: mode, dateValue });
    setDatePickerOpen(false);
  };

  const handleDateFromChange = (value) => {
    const patch = { dateMode: 'range', dateValue: '', dateFrom: value };
    if (value && globeFilter.dateTo && value > globeFilter.dateTo) {
      patch.dateTo = value;
    }
    onFilterChange?.(patch);
  };

  const handleDateToChange = (value) => {
    const patch = { dateMode: 'range', dateValue: '', dateTo: value };
    if (value && globeFilter.dateFrom && value < globeFilter.dateFrom) {
      patch.dateFrom = value;
    }
    onFilterChange?.(patch);
  };

  const mapSummary = useMemo(() => {
    const cityMap = new Map();
    const coordinateIssues = [];

    const addCity = (name, lat, lng, eventIndex, role) => {
      if (!name) return;
      const key = name.trim().toLowerCase();
      const valid = hasValidCoords(lat, lng);

      if (!valid) {
        coordinateIssues.push({ name, eventIndex, role });
      }

      if (!cityMap.has(key)) {
        cityMap.set(key, {
          name,
          lat,
          lng,
          valid,
          arrivals: 0,
          departures: 0,
          eventIndexes: new Set()
        });
      }

      const city = cityMap.get(key);
      city.valid = city.valid && valid;
      if (role === 'arrival') city.arrivals += 1;
      if (role === 'departure') city.departures += 1;
      city.eventIndexes.add(eventIndex);
    };

    events.forEach((event, index) => {
      addCity(event.from_name, event.from_lat, event.from_lng, index, 'departure');
      addCity(event.to_name, event.to_lat, event.to_lng, index, 'arrival');
    });

    const cities = Array.from(cityMap.values())
      .map(city => ({
        ...city,
        eventIndexes: Array.from(city.eventIndexes),
        visitCount: city.arrivals + city.departures
      }))
      .sort((a, b) => {
        if (a.valid !== b.valid) return a.valid ? -1 : 1;
        if (b.visitCount !== a.visitCount) return b.visitCount - a.visitCount;
        return a.name.localeCompare(b.name);
      });

    return {
      cities,
      coordinateIssues,
      repeatCities: cities.filter(city => city.visitCount > 2)
    };
  }, [events]);

  const journeyTimeline = useMemo(() => {
    const sortedEvents = events
      .map((event, index) => ({ event, index }))
      .sort((a, b) => new Date(a.event.start_datetime || 0) - new Date(b.event.start_datetime || 0));

    const groups = [];
    let cursor = 0;

    while (cursor < sortedEvents.length) {
      const current = sortedEvents[cursor];
      const next = sortedEvents[cursor + 1];
      const isRoundTrip = next &&
        current.event.from_name === next.event.to_name &&
        current.event.to_name === next.event.from_name;

      if (isRoundTrip) {
        groups.push({
          type: 'roundtrip',
          key: `${current.index}-${next.index}`,
          indexes: [current.index, next.index],
          from: current.event.from_name,
          to: current.event.to_name,
          startDate: current.event.start_datetime,
          endDate: next.event.start_datetime,
          legs: [current, next]
        });
        cursor += 2;
      } else {
        groups.push({
          type: 'single',
          key: `${current.index}`,
          indexes: [current.index],
          from: current.event.from_name,
          to: current.event.to_name,
          startDate: current.event.start_datetime,
          endDate: null,
          legs: [current]
        });
        cursor += 1;
      }
    }

    return groups;
  }, [events]);

  const activeCityName = selectedCity?.name || currentEvent?.to_name || '';

  return (
    <aside className="globe-inspector glass-panel" aria-label="Journey scope">
      <div className="inspector-header">
        <div>
          <span className="eyebrow">Journey scope</span>
          <h2>Route command</h2>
        </div>
        <div className={`map-status ${mapSummary.coordinateIssues.length ? 'warning' : 'ready'}`}>
          {mapSummary.coordinateIssues.length ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
          <span>{mapSummary.coordinateIssues.length ? 'Review' : 'Mapped'}</span>
        </div>
      </div>

      <section className="scope-filter" aria-label="Globe scope filter">
        <div className="section-title scope-title">
          <span>
            <Filter size={13} />
            Globe scope
          </span>
          <small>{filterSummary.visibleLegs} / {filterSummary.totalLegs} legs</small>
        </div>

        <div className="scope-control-row">
          <button
            type="button"
            className="date-filter-trigger"
            aria-expanded={datePickerOpen}
            onClick={() => {
              setDatePickerOpen(open => !open);
              setPlacePickerOpen(false);
            }}
          >
            <CalendarDays size={14} />
            <span>{selectedDateOption?.label || 'All dates'}</span>
            <ChevronDown size={13} />
          </button>

          <button
            type="button"
            className="place-picker-trigger"
            aria-expanded={placePickerOpen}
            onClick={() => {
              setPlacePickerOpen(open => !open);
              setDatePickerOpen(false);
            }}
          >
            <MapPinned size={14} />
            <span>{selectedPlaceCount ? `${selectedPlaceCount} places` : 'All places'}</span>
          </button>

          {filterSummary.isFiltered && (
            <button
              type="button"
              className="scope-reset-btn"
              onClick={onFilterReset}
              title="Clear filters"
              aria-label="Clear filters"
            >
              <X size={14} />
              <span>Clear</span>
            </button>
          )}
        </div>

        {datePickerOpen && (
          <div className="date-filter-menu">
            {Array.from(groupedDateOptions.entries()).map(([group, options]) => (
              <div className="date-filter-group" key={group}>
                <span className="date-filter-group-title">{group}</span>
                <div className="date-filter-options">
                  {options.map(option => (
                    <button
                      type="button"
                      key={option.value}
                      className={option.value === selectedDatePreset ? 'active' : ''}
                      onClick={() => handleDatePresetChange(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {dateMode === 'range' && (
          <div className="date-range-controls">
            <div className="date-range-header">
              <span>Active period</span>
              <strong>{filterSummary.dateLabel}</strong>
            </div>
            <div className="date-range-fields">
              <label>
                <span>Start</span>
                <input
                  type="date"
                  value={globeFilter.dateFrom || ''}
                  min={dateBounds.min}
                  max={globeFilter.dateTo || dateBounds.max}
                  onChange={(event) => handleDateFromChange(event.target.value)}
                />
              </label>
              <label>
                <span>End</span>
                <input
                  type="date"
                  value={globeFilter.dateTo || ''}
                  min={globeFilter.dateFrom || dateBounds.min}
                  max={dateBounds.max}
                  onChange={(event) => handleDateToChange(event.target.value)}
                />
              </label>
            </div>
          </div>
        )}

        {placePickerOpen && (
          <div className="place-picker-menu">
            <button
              type="button"
              className="place-picker-all"
              onClick={() => onFilterChange?.({ places: [] })}
            >
              All places
            </button>
            <div className="place-picker-options">
              {placeOptions.map(option => (
                <label key={option.value} className="place-picker-option">
                  <input
                    type="checkbox"
                    checked={(globeFilter.places || []).includes(option.value)}
                    onChange={() => toggleFilterPlace(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </section>

      {events.length === 0 ? (
        <div className="empty-map-state">
          <MapPinned size={24} />
          <p>{filterSummary.totalLegs > 0 ? 'No journey matches this scope.' : 'No odyssey yet.'}</p>
          {filterSummary.totalLegs > 0 ? (
            <button type="button" onClick={onFilterReset}>Clear filters</button>
          ) : (
            <button type="button" onClick={onAddTravel}>Add travel</button>
          )}
        </div>
      ) : (
        <>
          <section className="active-leg-panel" aria-label="Current route">
            <div className="leg-meta">
              <span>{isPlaying ? 'Now playing' : 'Selected leg'}</span>
              <strong>{currentEventIndex + 1} / {events.length}</strong>
            </div>
            <div className="leg-route">
              <span>{currentEvent?.from_name || 'Unknown'}</span>
              <Route size={17} />
              <span>{currentEvent?.to_name || 'Unknown'}</span>
            </div>
            <div className="leg-detail-row">
              <span>{formatShortDate(currentEvent?.start_datetime)}</span>
              <strong>{formatDistanceValue(filterSummary.activeLegDistance)} km</strong>
            </div>
          </section>

          <div className="inspector-tabs" role="tablist" aria-label="Journey inspector view">
            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'places'}
              className={activeView === 'places' ? 'active' : ''}
              onClick={() => setActiveView('places')}
            >
              <MapPinned size={14} />
              Places
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'timeline'}
              className={activeView === 'timeline' ? 'active' : ''}
              onClick={() => setActiveView('timeline')}
            >
              <CalendarDays size={14} />
              Timeline
            </button>
          </div>

          <div className="coverage-grid" aria-label="Map summary">
            <div>
              <span>{formatDistanceValue(filterSummary.distance)}</span>
              <p>{filterSummary.isFiltered ? 'Filtered km' : 'Total km'}</p>
            </div>
            <div>
              <span>{mapSummary.cities.length}</span>
              <p>Places</p>
            </div>
            <div>
              <span>{events.length}</span>
              <p>Legs</p>
            </div>
            <div>
              <span>{mapSummary.repeatCities.length}</span>
              <p>Repeats</p>
            </div>
          </div>

          {activeView === 'places' ? (
            <section className="place-check-list" aria-label="Mapped places">
              <div className="section-title">
                <span>Visible places</span>
                <small>{mapSummary.cities.filter(city => city.valid).length} placed</small>
              </div>
              <div className="place-list-scroll">
                {mapSummary.cities.map(city => {
                  const isActive = city.name === activeCityName;
                  const isCurrentOrigin = currentEvent?.from_name === city.name;
                  const isCurrentDestination = currentEvent?.to_name === city.name;

                  return (
                    <button
                      type="button"
                      key={city.name}
                      className={[
                        'place-row',
                        isActive ? 'active' : '',
                        isCurrentOrigin ? 'origin' : '',
                        isCurrentDestination ? 'destination' : '',
                        city.valid ? '' : 'invalid'
                      ].filter(Boolean).join(' ')}
                      onClick={() => city.valid && onCityFocus(city)}
                      disabled={!city.valid}
                      title={city.valid ? `Focus ${city.name}` : `${city.name} has missing coordinates`}
                    >
                      <span className="place-dot" />
                      <span className="place-name">{city.name}</span>
                      {city.visitCount > 2 && (
                        <span className="repeat-chip">
                          <RotateCcw size={12} />
                          {city.visitCount}
                        </span>
                      )}
                      <Crosshair size={15} className="focus-icon" />
                    </button>
                  );
                })}
              </div>
            </section>
          ) : (
            <section className="journey-timeline" aria-label="Chronological journey">
              <div className="section-title">
                <span>Date sequence</span>
                <small>{journeyTimeline.length} groups</small>
              </div>
              <div className="timeline-scroll">
                {journeyTimeline.map(group => {
                  const isActive = group.indexes.includes(currentEventIndex);
                  return (
                    <button
                      type="button"
                      key={group.key}
                      className={`timeline-row ${group.type} ${isActive ? 'active' : ''}`}
                      onClick={() => onEventFocus?.(group.indexes[0])}
                    >
                      <span className="timeline-rail" />
                      <span className="timeline-main">
                        <span className="timeline-topline">
                          <span className="timeline-route">
                            <strong>{group.from || 'Unknown'}</strong>
                            <Route size={14} />
                            <strong>{group.to || 'Unknown'}</strong>
                          </span>
                          <span className="timeline-date">
                            {formatShortDate(group.startDate)}
                            {group.endDate && <small>{formatShortDate(group.endDate)}</small>}
                          </span>
                        </span>
                        <span className="timeline-subline">
                          <span className={`transport-chip ${group.legs[0]?.event?.transport || 'plane'}`}>
                            {getTransportLabel(group.legs[0]?.event?.transport)}
                          </span>
                          {group.type === 'roundtrip' && (
                            <span className="roundtrip-chip">
                              <RotateCcw size={12} />
                              Round
                            </span>
                          )}
                        </span>
                        {group.type === 'roundtrip' && (
                          <span className="timeline-return">
                            Return · {group.to || 'Unknown'} → {group.from || 'Unknown'}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </aside>
  );
};

export default GlobeJourneyInspector;
