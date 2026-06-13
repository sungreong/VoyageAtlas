import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Compass,
  Globe2,
  MapPinned,
  Route,
  TrendingUp,
  X
} from 'lucide-react';
import './ContinentStats.css';
import { getContinent } from '../utils/continentUtils';

const PERIOD_LABELS = {
  year: 'Year',
  quarter: 'Quarter',
  month: 'Month'
};

const safeDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const getPlaceKey = (name, lat, lng) => {
  const latKey = Number.isFinite(Number(lat)) ? Number(lat).toFixed(3) : 'x';
  const lngKey = Number.isFinite(Number(lng)) ? Number(lng).toFixed(3) : 'x';
  return `${name || 'Unknown'}-${latKey}-${lngKey}`;
};

const addToMap = (map, key, amount = 1) => {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + amount);
};

const getTopEntry = (map) => {
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1])[0] || null;
};

const mapToRanking = (map, limit = 5) => {
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
};

const formatShortDate = (date) => {
  if (!date) return 'n/a';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const getPeriodKey = (date, mode) => {
  const year = date.getFullYear();
  const month = date.getMonth();

  if (mode === 'year') {
    return {
      sortKey: `${year}`,
      label: `${year}`,
      sublabel: 'annual record'
    };
  }

  if (mode === 'quarter') {
    const quarter = Math.floor(month / 3) + 1;
    return {
      sortKey: `${year}-${quarter}`,
      label: `${year} Q${quarter}`,
      sublabel: `${quarter === 1 ? 'Jan-Mar' : quarter === 2 ? 'Apr-Jun' : quarter === 3 ? 'Jul-Sep' : 'Oct-Dec'}`
    };
  }

  return {
    sortKey: `${year}-${String(month + 1).padStart(2, '0')}`,
    label: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
    sublabel: 'monthly pace'
  };
};

const buildMonthScope = (events) => {
  const months = [];

  (Array.isArray(events) ? events : []).forEach((event) => {
    const date = safeDate(event.start_datetime);
    if (!date) return;

    const year = String(date.getFullYear());
    const month = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    months.push(month);
  });

  const sortedMonths = Array.from(new Set(months)).sort();
  const min = sortedMonths[0] || '';
  const max = sortedMonths[sortedMonths.length - 1] || '';
  const options = [];

  if (min && max) {
    const [startYear, startMonth] = min.split('-').map(Number);
    const [endYear, endMonth] = max.split('-').map(Number);
    const cursor = new Date(startYear, startMonth - 1, 1);
    const end = new Date(endYear, endMonth - 1, 1);

    while (cursor <= end) {
      const year = cursor.getFullYear();
      const month = String(cursor.getMonth() + 1).padStart(2, '0');
      options.push(`${year}-${month}`);
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  return {
    min,
    max,
    options
  };
};

const filterEventsByMonthRange = (events, fromMonth, toMonth) => {
  return (Array.isArray(events) ? events : []).filter((event) => {
    const date = safeDate(event.start_datetime);
    if (!date) return false;

    const year = String(date.getFullYear());
    const month = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (fromMonth && month < fromMonth) return false;
    if (toMonth && month > toMonth) return false;
    return true;
  });
};

const formatMonthLabel = (monthValue) => {
  if (!monthValue) return 'Open';
  const [year, month] = monthValue.split('-').map(Number);
  if (!year || !month) return monthValue;
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
};

const getYearFromMonth = (monthValue) => monthValue?.slice(0, 4) || '';

const formatMonthGroupLabel = (date) => {
  if (!date) return 'Undated';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
};

const groupTravelLogsByMonth = (logs) => {
  const groups = new Map();

  logs.forEach((log) => {
    const key = log.date
      ? `${log.date.getFullYear()}-${String(log.date.getMonth() + 1).padStart(2, '0')}`
      : 'undated';

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: formatMonthGroupLabel(log.date),
        logs: []
      });
    }

    groups.get(key).logs.push(log);
  });

  return Array.from(groups.values()).sort((a, b) => b.key.localeCompare(a.key));
};

const groupDestinationsByRegion = (destinations) => {
  const groups = new Map();

  destinations.forEach((destination) => {
    const region = destination.continent || 'Unknown region';
    if (!groups.has(region)) {
      groups.set(region, []);
    }
    groups.get(region).push(destination);
  });

  return Array.from(groups.entries())
    .map(([region, items]) => ({ region, items }))
    .sort((a, b) => b.items.length - a.items.length || a.region.localeCompare(b.region));
};

const buildTravelStats = (events, periodMode) => {
  const sourceEvents = Array.isArray(events) ? events : [];
  const legs = sourceEvents
    .map((event) => {
      const date = safeDate(event.start_datetime);

      return {
        ...event,
        date,
        routeLabel: `${event.from_name || 'Unknown'} -> ${event.to_name || 'Unknown'}`
      };
    })
    .sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date - b.date;
    });

  const places = new Map();
  const continentCounts = new Map();
  const routeCounts = new Map();
  const destinationCounts = new Map();
  const destinationDetails = new Map();
  const departureCounts = new Map();
  const placeTouchCounts = new Map();
  const transportCounts = new Map();
  const periodMap = new Map();
  const tripIds = new Set();
  const today = new Date();
  const recentCutoff = new Date(today);
  recentCutoff.setDate(today.getDate() - 90);

  let recentLegs = 0;
  const recentPlaces = new Set();

  // Places visited are counted from both departure and arrival endpoints.
  // This answers "where did I go in this range?" instead of only "where did I arrive?"
  const recordVisitedPlace = (event, placeName, lat, lng, relatedEndpointNames) => {
    const name = placeName || 'Unknown';
    if (!destinationDetails.has(name)) {
      destinationDetails.set(name, {
        name,
        continent: getContinent(lat, lng) || 'Unknown region',
        count: 0,
        years: new Set(),
        origins: new Map(),
        routes: new Map(),
        firstDate: null,
        lastDate: null
      });
    }

    const destination = destinationDetails.get(name);
    destination.count += 1;
    addToMap(destination.routes, event.routeLabel);
    relatedEndpointNames.forEach((endpointName) => {
      if (endpointName && endpointName !== name) {
        addToMap(destination.origins, endpointName);
      }
    });
    if (event.date) {
      destination.years.add(String(event.date.getFullYear()));
      if (!destination.firstDate || event.date < destination.firstDate) {
        destination.firstDate = event.date;
      }
      if (!destination.lastDate || event.date > destination.lastDate) {
        destination.lastDate = event.date;
      }
    }
  };

  legs.forEach((event, index) => {
    const tripKey = event.trip_id ?? `event-${event.id ?? index}`;
    tripIds.add(tripKey);
    addToMap(routeCounts, event.routeLabel);
    addToMap(transportCounts, event.transport || 'unknown');
    addToMap(departureCounts, event.from_name || 'Unknown');
    addToMap(destinationCounts, event.to_name || 'Unknown');
    addToMap(placeTouchCounts, event.from_name || 'Unknown');
    addToMap(placeTouchCounts, event.to_name || 'Unknown');
    const eventPlaces = new Map();
    [
      { name: event.from_name || 'Unknown', lat: event.from_lat, lng: event.from_lng },
      { name: event.to_name || 'Unknown', lat: event.to_lat, lng: event.to_lng }
    ].forEach((place) => {
      if (!eventPlaces.has(place.name)) {
        eventPlaces.set(place.name, place);
      }
    });
    eventPlaces.forEach((place) => {
      recordVisitedPlace(event, place.name, place.lat, place.lng, Array.from(eventPlaces.keys()));
    });

    [
      { name: event.from_name, lat: event.from_lat, lng: event.from_lng },
      { name: event.to_name, lat: event.to_lat, lng: event.to_lng }
    ].forEach((place) => {
      const key = getPlaceKey(place.name, place.lat, place.lng);
      if (!places.has(key)) {
        const continent = getContinent(place.lat, place.lng);
        places.set(key, { ...place, continent });
        addToMap(continentCounts, continent);
      }
    });

    if (event.date && event.date >= recentCutoff) {
      recentLegs += 1;
      recentPlaces.add(getPlaceKey(event.to_name, event.to_lat, event.to_lng));
    }

    if (!event.date) return;

    const period = getPeriodKey(event.date, periodMode);
    if (!periodMap.has(period.sortKey)) {
      periodMap.set(period.sortKey, {
        ...period,
        legs: 0,
        arrivals: 0,
        places: new Set(),
        trips: new Set(),
        destinations: new Map(),
        transports: new Map()
      });
    }

    const bucket = periodMap.get(period.sortKey);
    bucket.legs += 1;
    bucket.arrivals += 1;
    bucket.trips.add(tripKey);
    bucket.places.add(getPlaceKey(event.from_name, event.from_lat, event.from_lng));
    bucket.places.add(getPlaceKey(event.to_name, event.to_lat, event.to_lng));
    addToMap(bucket.destinations, event.to_name || 'Unknown');
    addToMap(bucket.transports, event.transport || 'unknown');
  });

  const periods = Array.from(periodMap.values())
    .map((period) => {
      const topDestination = getTopEntry(period.destinations);
      return {
        ...period,
        places: period.places.size,
        trips: period.trips.size,
        topDestination: topDestination?.[0] || 'n/a',
        topDestinationCount: topDestination?.[1] || 0,
        topTransport: getTopEntry(period.transports)?.[0] || 'n/a'
      };
    })
    .sort((a, b) => b.sortKey.localeCompare(a.sortKey));

  const busiestPeriod = [...periods].sort((a, b) => b.trips - a.trips || b.arrivals - a.arrivals)[0] || null;
  const topContinent = getTopEntry(continentCounts);
  const topRoute = getTopEntry(routeCounts);
  const topDestinations = Array.from(destinationDetails.values())
    .map((destination) => ({
      ...destination,
      years: Array.from(destination.years).sort((a, b) => b.localeCompare(a)),
      topOrigin: getTopEntry(destination.origins)?.[0] || 'n/a',
      topRoute: getTopEntry(destination.routes)?.[0] || 'n/a'
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 12);
  const topDestination = topDestinations[0] || null;
  const topDeparture = getTopEntry(departureCounts);
  const topPlace = getTopEntry(placeTouchCounts);
  const topTransport = getTopEntry(transportCounts);
  const firstDate = legs.find((event) => event.date)?.date || null;
  const lastDate = [...legs].reverse().find((event) => event.date)?.date || null;

  return {
    legs,
    tripCount: tripIds.size,
    uniquePlaces: places.size,
    activePeriods: periods.length,
    periods,
    busiestPeriod,
    recentLegs,
    recentPlaces: recentPlaces.size,
    firstDate,
    lastDate,
    topContinent: topContinent ? { name: topContinent[0], count: topContinent[1] } : null,
    topRoute: topRoute ? { name: topRoute[0], count: topRoute[1] } : null,
    topDestination,
    topDeparture: topDeparture ? { name: topDeparture[0], count: topDeparture[1] } : null,
    topPlace: topPlace ? { name: topPlace[0], count: topPlace[1] } : null,
    topTransport: topTransport ? { name: topTransport[0], count: topTransport[1] } : null,
    continents: mapToRanking(continentCounts, 6),
    topDestinations,
    topDepartures: mapToRanking(departureCounts, 5),
    topPlaces: mapToRanking(placeTouchCounts, 5),
    topRoutes: mapToRanking(routeCounts, 4),
    travelLogs: legs
      .map((event) => ({
        id: event.id,
        date: event.date,
        from: event.from_name || 'Unknown',
        to: event.to_name || 'Unknown',
        transport: event.transport || 'unknown'
      }))
      .sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return b.date - a.date;
      })
  };
};

const ContinentStats = ({ events, onClose }) => {
  const [periodMode, setPeriodMode] = useState('year');
  const monthScope = useMemo(() => buildMonthScope(events), [events]);
  const [fromMonth, setFromMonth] = useState('');
  const [toMonth, setToMonth] = useState('');
  const defaultRangeApplied = useRef(false);
  const latestYear = getYearFromMonth(monthScope.max);
  const latestYearStart = latestYear ? `${latestYear}-01` : '';
  const normalizedFromMonth = fromMonth && toMonth && fromMonth > toMonth ? toMonth : fromMonth;
  const normalizedToMonth = fromMonth && toMonth && fromMonth > toMonth ? fromMonth : toMonth;
  const filteredEvents = useMemo(
    () => filterEventsByMonthRange(events, normalizedFromMonth, normalizedToMonth),
    [events, normalizedFromMonth, normalizedToMonth]
  );
  const stats = useMemo(() => buildTravelStats(filteredEvents, periodMode), [filteredEvents, periodMode]);
  const travelLogGroups = useMemo(() => groupTravelLogsByMonth(stats.travelLogs), [stats.travelLogs]);
  const destinationGroups = useMemo(() => groupDestinationsByRegion(stats.topDestinations), [stats.topDestinations]);
  const repeatedRoutes = stats.topRoutes.filter((route) => route.count > 1);
  const missingCoordinateCount = filteredEvents.filter((event) => (
    !Number.isFinite(Number(event.from_lat))
    || !Number.isFinite(Number(event.from_lng))
    || !Number.isFinite(Number(event.to_lat))
    || !Number.isFinite(Number(event.to_lng))
  )).length;
  const selectedScopeLabel = normalizedFromMonth || normalizedToMonth
    ? `${formatMonthLabel(normalizedFromMonth || monthScope.min)} - ${formatMonthLabel(normalizedToMonth || monthScope.max)}`
    : 'All dates';
  const clearMonthRange = () => {
    setFromMonth('');
    setToMonth('');
  };
  const selectLatestYear = () => {
    if (!latestYearStart || !monthScope.max) return;
    setFromMonth(latestYearStart);
    setToMonth(monthScope.max);
  };

  useEffect(() => {
    if (defaultRangeApplied.current || !latestYearStart || !monthScope.max) return;
    defaultRangeApplied.current = true;
    setFromMonth(latestYearStart);
    setToMonth(monthScope.max);
  }, [latestYearStart, monthScope.max]);

  const rangeSummary = [
    `${selectedScopeLabel}: ${stats.tripCount} trips, ${stats.legs.length} travel logs, ${stats.topDestinations.length} visited places.`,
    stats.topContinent && `Main region is ${stats.topContinent.name}.`,
    stats.busiestPeriod && `Busiest ${periodMode} is ${stats.busiestPeriod.label}.`
  ].filter(Boolean).join(' ');

  return (
    <div className="travel-stats-overlay" role="presentation" onClick={onClose}>
      <section
        className="travel-stats-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="travel-stats-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="travel-stats-header">
          <div>
            <span className="stats-kicker"><Globe2 size={16} /> Travel intelligence</span>
            <h2 id="travel-stats-title">Journey Stats</h2>
            <p>
              See where you go most often, which years were busiest, and the places that define your travel pattern.
            </p>
          </div>
          <button className="close-stats-btn" type="button" onClick={onClose} aria-label="Close travel stats">
            <X size={22} />
          </button>
        </header>

        {!events || events.length === 0 ? (
          <div className="stats-empty-state">
            <MapPinned size={42} />
            <strong>No travel data yet</strong>
            <span>Add an Odyssey from the globe to start building your personal travel analytics.</span>
          </div>
        ) : (
          <div className="travel-stats-content">
            <div className="stats-toolbar">
              <div>
                <span>Month range</span>
                <strong>{selectedScopeLabel}</strong>
              </div>
              <div className="stats-range-controls">
                <label>
                  <span>From</span>
                  <select
                    value={fromMonth}
                    onChange={(event) => setFromMonth(event.target.value)}
                  >
                    <option value="">First log</option>
                    {monthScope.options.map((month) => (
                      <option key={`from-${month}`} value={month}>
                        {formatMonthLabel(month)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>To</span>
                  <select
                    value={toMonth}
                    onChange={(event) => setToMonth(event.target.value)}
                  >
                    <option value="">Last log</option>
                    {monthScope.options.map((month) => (
                      <option key={`to-${month}`} value={month}>
                        {formatMonthLabel(month)}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" onClick={selectLatestYear}>{latestYear || 'This year'}</button>
                <button type="button" onClick={clearMonthRange}>All</button>
              </div>
            </div>

            {stats.legs.length === 0 ? (
              <div className="stats-empty-state scoped-empty">
                <MapPinned size={42} />
                <strong>No travel data in this scope</strong>
                <span>Pick a different date scope to compare your travel pattern.</span>
              </div>
            ) : (
              <>
            <section className="stats-range-summary" aria-label="Selected range summary">
              <p>{rangeSummary}</p>
              <div>
                <span><strong>{stats.tripCount}</strong> trips</span>
                <span><strong>{stats.legs.length}</strong> travel logs</span>
                <span><strong>{stats.topDestinations.length}</strong> visited places</span>
                <span><strong>{stats.uniquePlaces}</strong> mapped places</span>
              </div>
            </section>

            <section className="stats-destination-panel">
              <div className="stats-section-heading compact">
                <div>
                  <span><MapPinned size={15} /> Places visited in this range</span>
                  <h3>{stats.topDestinations.length} visited places found</h3>
                </div>
              </div>
              <div className="stats-destination-grid">
                {destinationGroups.map((group) => (
                  <section className="destination-region-group" key={group.region}>
                    <h4>{group.region}<span>{group.items.length}</span></h4>
                    <div>
                      {group.items.map((city) => {
                        const rank = stats.topDestinations.findIndex((item) => item.name === city.name) + 1;
                        return (
                          <article className="destination-card" key={city.name}>
                            <div className="destination-rank">#{rank}</div>
                            <div className="destination-main">
                              <strong>{city.name}</strong>
                              <span>{city.years.length ? city.years.join(', ') : 'n/a'}</span>
                            </div>
                            <div className="destination-meta">
                              <span>{city.count} visit{city.count > 1 ? 's' : ''}</span>
                              <span>{formatShortDate(city.firstDate)} - {formatShortDate(city.lastDate)}</span>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </section>

            <div className="stats-flow-grid">
              <section className="journey-flow-panel">
                <div className="stats-section-heading compact">
                  <div>
                    <span><Route size={15} /> Travel logs in range</span>
                    <h3>Grouped by month</h3>
                  </div>
                </div>
                <div className="journey-flow-list">
                  {travelLogGroups.map((group) => (
                    <div className="journey-month-group" key={group.key}>
                      <h4>
                        {group.label}
                        <span>{group.logs.length} log{group.logs.length > 1 ? 's' : ''}</span>
                      </h4>
                      {group.logs.map((log, index) => (
                        <article className="journey-flow-row" key={log.id ?? `${log.from}-${log.to}-${index}`}>
                          <time>{formatShortDate(log.date)}</time>
                          <div>
                            <span>{log.from}</span>
                            <strong>{log.to}</strong>
                          </div>
                          <small>{log.transport}</small>
                        </article>
                      ))}
                    </div>
                  ))}
                </div>
              </section>

              <aside className="stats-utility-panel">
                <section>
                  <div className="stats-section-heading compact">
                    <span><BarChart3 size={15} /> Activity by {PERIOD_LABELS[periodMode].toLowerCase()}</span>
                  </div>
                  <div className="period-toggle" role="tablist" aria-label="Stats period">
                    {Object.entries(PERIOD_LABELS).map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        className={periodMode === mode ? 'active' : ''}
                        onClick={() => setPeriodMode(mode)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="activity-list">
                    {stats.periods.slice(0, 6).map((period) => (
                      <div className="activity-row" key={period.sortKey}>
                        <strong>{period.label}</strong>
                        <span>{period.trips} trips / {period.arrivals} logs</span>
                        <small>Top stop: {period.topDestination}</small>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="stats-section-heading compact">
                    <span><Compass size={15} /> Regions</span>
                  </div>
                  <div className="continent-list">
                    {stats.continents.map((continent) => (
                      <div key={continent.name} className="continent-row">
                        <span>{continent.name}</span>
                        <strong>{continent.count}</strong>
                      </div>
                    ))}
                  </div>
                </section>

                {repeatedRoutes.length > 0 && (
                  <section>
                    <div className="stats-section-heading compact">
                      <span><Route size={15} /> Repeated routes</span>
                    </div>
                    <div className="mini-ranking">
                      {repeatedRoutes.map((route) => (
                        <div key={route.name}>
                          <span>{route.name}</span>
                          <strong>{route.count}x</strong>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <section>
                  <div className="stats-section-heading compact">
                    <span><TrendingUp size={15} /> Record signals</span>
                  </div>
                  <ul className="insight-list">
                    <li>{stats.recentLegs} logs in the last 90 days.</li>
                    <li>{stats.recentPlaces} destinations visited recently.</li>
                    {missingCoordinateCount > 0 && <li>{missingCoordinateCount} logs need coordinates for globe accuracy.</li>}
                    {stats.topDestination && <li>{stats.topDestination.name} appears most often in this range.</li>}
                  </ul>
                </section>
              </aside>
            </div>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default ContinentStats;
