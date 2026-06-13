import React, { useMemo, useState } from 'react';
import axios from 'axios';
import {
  X, Edit2, Trash2, Calendar, Film, ChevronDown, ChevronRight,
  Route, Repeat2, Gauge, Search, RotateCcw, ArrowLeftRight, CornerDownLeft
} from 'lucide-react';
import './DataManagement.css';
import EditEventModal from './EditEventModal';
import { API_BASE } from '../api/client';
import { calculateDistance, formatDistance } from '../utils';

const TRANSPORT_LABELS = {
  plane: '비행기',
  train: '기차',
  car: '자동차',
  ship: '배',
  bus: '버스'
};

const DataManagement = ({ events = [], onClose, onRefresh }) => {
  const [editingEvent, setEditingEvent] = useState(null);
  const [collapsedTripIds, setCollapsedTripIds] = useState(new Set());
  const [sortMode, setSortMode] = useState('date_desc');
  const [tripTypeFilter, setTripTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [managerNotice, setManagerNotice] = useState('');

  const handleDelete = async (eventId) => {
    if (window.confirm("Are you sure you want to delete this event? This action will remove all associated media.")) {
      try {
        await axios.delete(`${API_BASE}/events/${eventId}`);
        onRefresh(); // Refresh parent list
      } catch (err) {
        console.error("Failed to delete event", err);
        alert("Failed to delete event.");
      }
    }
  };

  const handleSave = async (updatedEvent) => {
    try {
      const { id, title, start_datetime, from_name, to_name, transport, note } = updatedEvent;
      // Construct payload with only editable fields to avoid schema issues
      const payload = {
        title,
        start_datetime,
        from_name,
        to_name,
        transport,
        note
      };
      
      await axios.patch(`${API_BASE}/events/${id}`, payload);
      setEditingEvent(null);
      onRefresh(); // Refresh parent list
    } catch (err) {
      console.error("Failed to update event", err);
      alert("Failed to update event.");
    }
  };

  // Helper to format date
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString();
  };

  const formatShortDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString();
  };

  const formatTransport = (transport) => TRANSPORT_LABELS[transport] || transport || '이동수단 미지정';
  const normalizeCity = (city) => (city || '').trim().toLowerCase();
  const toTime = (dateStr) => {
    const time = dateStr ? new Date(dateStr).getTime() : 0;
    return Number.isNaN(time) ? 0 : time;
  };
  const toTripNumber = (tripId) => {
    const value = Number(tripId);
    return Number.isFinite(value) ? value : -1;
  };
  const formatEventTitle = (title, toName) => {
    if (!title) return '';

    const flightMatch = title.match(/^Flight to\s+(.+)$/i);
    if (flightMatch) return `${flightMatch[1]}행 비행`;

    const visitMatch = title.match(/^Visit to\s+(.+)$/i);
    if (visitMatch) return `${visitMatch[1]} 방문`;

    if (title === `Flight to ${toName}`) return `${toName}행 비행`;
    return title;
  };

  const baseTripGroups = useMemo(() => {
    const grouped = new Map();

    events.forEach((event) => {
      const key = event.trip_id ?? 'unassigned';
      if (!grouped.has(key)) {
        grouped.set(key, {
          id: key,
          label: event.trip_id ? `여행 ${event.trip_id}` : '미분류 여행',
          events: []
        });
      }
      grouped.get(key).events.push(event);
    });

    return Array.from(grouped.values())
      .map((trip) => {
        const orderedEvents = [...trip.events].sort((a, b) => {
          return new Date(a.start_datetime || 0) - new Date(b.start_datetime || 0);
        });
        const firstEvent = orderedEvents[0];
        const lastEvent = orderedEvents[orderedEvents.length - 1];
        const origin = firstEvent?.from_name || 'Unknown';
        const finalStop = lastEvent?.to_name || 'Unknown';
        const isRoundTrip = orderedEvents.length > 1 && normalizeCity(origin) === normalizeCity(finalStop);
        const destinationStops = orderedEvents
          .map((event) => event.to_name)
          .filter((city) => city && normalizeCity(city) !== normalizeCity(origin));
        const uniqueStops = [...new Set(destinationStops)];
        const primaryStops = uniqueStops.slice(0, 2).join(' · ');
        const hiddenStopCount = Math.max(uniqueStops.length - 2, 0);
        const routeSummary = isRoundTrip && primaryStops
          ? `${origin} ↔ ${primaryStops}${hiddenStopCount ? ` +${hiddenStopCount}` : ''}`
          : `${origin} → ${finalStop}`;
        const mediaCount = orderedEvents.reduce((sum, event) => sum + (event.media_list?.length || 0), 0);
        const distance = orderedEvents.reduce((sum, event) => (
          sum + calculateDistance(event.from_lat, event.from_lng, event.to_lat, event.to_lng)
        ), 0);

        return {
          ...trip,
          events: orderedEvents,
          firstEvent,
          lastEvent,
          routeSummary,
          isRoundTrip,
          mediaCount,
          distance
        };
      })
  }, [events]);

  const tripGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const startTime = dateStart ? new Date(`${dateStart}T00:00:00`).getTime() : null;
    const endTime = dateEnd ? new Date(`${dateEnd}T23:59:59`).getTime() : null;

    return baseTripGroups
      .filter((trip) => {
        if (tripTypeFilter === 'round' && !trip.isRoundTrip) return false;
        if (tripTypeFilter === 'one_way' && trip.isRoundTrip) return false;
        if (tripTypeFilter === 'media' && trip.mediaCount === 0) return false;

        const tripStartTime = toTime(trip.firstEvent?.start_datetime);
        const tripEndTime = toTime(trip.lastEvent?.start_datetime) || tripStartTime;
        if (startTime && tripEndTime < startTime) return false;
        if (endTime && tripStartTime > endTime) return false;

        if (!query) return true;

        const searchable = [
          trip.label,
          trip.routeSummary,
          ...trip.events.flatMap((event) => [
            event.id,
            event.title,
            formatEventTitle(event.title, event.to_name),
            event.from_name,
            event.to_name,
            formatTransport(event.transport),
            event.trip_id
          ])
        ].join(' ').toLowerCase();

        return searchable.includes(query);
      })
      .sort((a, b) => {
        switch (sortMode) {
          case 'date_asc':
            return toTime(a.firstEvent?.start_datetime) - toTime(b.firstEvent?.start_datetime);
          case 'end_desc':
            return toTime(b.lastEvent?.start_datetime) - toTime(a.lastEvent?.start_datetime);
          case 'trip_id_asc':
            return toTripNumber(a.id) - toTripNumber(b.id);
          case 'trip_id_desc':
            return toTripNumber(b.id) - toTripNumber(a.id);
          case 'legs_desc':
            return b.events.length - a.events.length;
          case 'media_desc':
            return b.mediaCount - a.mediaCount;
          case 'distance_desc':
            return b.distance - a.distance;
          case 'route_asc':
            return a.routeSummary.localeCompare(b.routeSummary);
          case 'date_desc':
          default:
            return toTime(b.firstEvent?.start_datetime) - toTime(a.firstEvent?.start_datetime);
        }
      });
  }, [baseTripGroups, dateEnd, dateStart, searchQuery, sortMode, tripTypeFilter]);

  const hasActiveFilters = searchQuery || dateStart || dateEnd || tripTypeFilter !== 'all' || sortMode !== 'date_desc';

  const resetControls = () => {
    setSortMode('date_desc');
    setTripTypeFilter('all');
    setSearchQuery('');
    setDateStart('');
    setDateEnd('');
  };

  const toggleTrip = (tripId) => {
    setCollapsedTripIds((prev) => {
      const next = new Set(prev);
      next.has(tripId) ? next.delete(tripId) : next.add(tripId);
      return next;
    });
  };

  const handleToggleTripType = async (trip) => {
    if (!trip.firstEvent || !trip.lastEvent || trip.id === 'unassigned') return;

    try {
      setManagerNotice('');

      if (trip.isRoundTrip) {
        if (trip.events.length <= 1) return;
        const confirmed = window.confirm('마지막 복귀 구간을 삭제하고 이 여행을 편도로 변경할까요?');
        if (!confirmed) return;

        await axios.delete(`${API_BASE}/events/${trip.lastEvent.id}`);
        setManagerNotice(`${trip.routeSummary} 여행을 편도로 변경했습니다.`);
      } else {
        const confirmed = window.confirm('마지막 도착지에서 출발 도시로 돌아오는 구간을 추가해 왕복으로 변경할까요?');
        if (!confirmed) return;

        const returnDate = new Date(trip.lastEvent.start_datetime || Date.now());
        if (Number.isNaN(returnDate.getTime())) {
          returnDate.setTime(Date.now());
        }
        returnDate.setDate(returnDate.getDate() + 1);

        await axios.post(`${API_BASE}/events/`, {
          trip_id: trip.firstEvent.trip_id,
          start_datetime: returnDate.toISOString(),
          from_name: trip.lastEvent.to_name,
          to_name: trip.firstEvent.from_name,
          from_lat: trip.lastEvent.to_lat,
          from_lng: trip.lastEvent.to_lng,
          to_lat: trip.firstEvent.from_lat,
          to_lng: trip.firstEvent.from_lng,
          transport: trip.lastEvent.transport || 'plane',
          title: `${trip.firstEvent.from_name} 복귀`
        });
        setManagerNotice(`${trip.routeSummary} 여행에 복귀 구간을 추가했습니다.`);
      }

      onRefresh();
    } catch (err) {
      console.error("Failed to update trip type", err);
      setManagerNotice('여행 방식을 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  return (
    <div className="data-management-overlay">
      <div className="data-management-container glass-panel">
        <div className="dm-header">
          <h2 className="neon-text-lg">여행 데이터 로그</h2>
          <button className="icon-btn-secondary" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="dm-control-panel">
          <label className="dm-search-field">
            <Search size={16} />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="도시, 경로, 이벤트 검색"
            />
          </label>

          <label className="dm-select-field">
            <span>정렬</span>
            <select value={sortMode} onChange={(e) => setSortMode(e.target.value)}>
              <option value="date_desc">날짜: 최신순</option>
              <option value="date_asc">날짜: 오래된순</option>
              <option value="end_desc">복귀일: 최신순</option>
              <option value="trip_id_desc">여행 번호: 높은순</option>
              <option value="trip_id_asc">여행 번호: 낮은순</option>
              <option value="legs_desc">구간 많은순</option>
              <option value="media_desc">미디어 많은순</option>
              <option value="distance_desc">거리 긴순</option>
              <option value="route_asc">경로 가나다순</option>
            </select>
          </label>

          <div className="dm-filter-tabs" aria-label="Trip filters">
            <button
              type="button"
              className={tripTypeFilter === 'all' ? 'active' : ''}
              onClick={() => setTripTypeFilter('all')}
            >
              전체
            </button>
            <button
              type="button"
              className={tripTypeFilter === 'round' ? 'active' : ''}
              onClick={() => setTripTypeFilter('round')}
            >
              왕복
            </button>
            <button
              type="button"
              className={tripTypeFilter === 'one_way' ? 'active' : ''}
              onClick={() => setTripTypeFilter('one_way')}
            >
              편도
            </button>
            <button
              type="button"
              className={tripTypeFilter === 'media' ? 'active' : ''}
              onClick={() => setTripTypeFilter('media')}
            >
              미디어
            </button>
          </div>

          <div className="dm-date-range">
            <label>
              <span>시작</span>
              <input
                type="date"
                value={dateStart}
                max={dateEnd || undefined}
                onChange={(e) => setDateStart(e.target.value)}
              />
            </label>
            <label>
              <span>종료</span>
              <input
                type="date"
                value={dateEnd}
                min={dateStart || undefined}
                onChange={(e) => setDateEnd(e.target.value)}
              />
            </label>
          </div>

          <div className="dm-result-meta">
            <span>{tripGroups.length} / {baseTripGroups.length} 여행</span>
            {hasActiveFilters && (
              <button type="button" onClick={resetControls} title="필터 초기화">
                <RotateCcw size={14} />
                초기화
              </button>
            )}
          </div>
        </div>

        {managerNotice && (
          <div className="dm-manager-notice">
            {managerNotice}
            <button type="button" onClick={() => setManagerNotice('')}>닫기</button>
          </div>
        )}

        <div className="dm-table-wrapper custom-scrollbar">
          <div className="dm-trip-list">
            {tripGroups.map((trip) => {
              const isCollapsed = collapsedTripIds.has(trip.id);

              return (
                <section
                  key={trip.id}
                  className={`dm-trip-group ${trip.isRoundTrip ? 'round-trip' : ''}`}
                >
                  <button
                    type="button"
                    className="dm-trip-summary"
                    onClick={() => toggleTrip(trip.id)}
                    aria-expanded={!isCollapsed}
                  >
                    <div className="dm-trip-main">
                      <span className="dm-trip-toggle">
                        {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                      </span>
                      <div className="dm-trip-title-block">
                        <div className="dm-trip-kicker">{trip.label}</div>
                        <div className="dm-trip-route">
                          <Route size={16} />
                          <span>{trip.routeSummary}</span>
                        </div>
                      </div>
                    </div>

                    <div className="dm-trip-meta">
                      {trip.isRoundTrip && (
                        <span className="dm-trip-badge round">
                          <Repeat2 size={13} />
                          왕복
                        </span>
                      )}
                      <span className="dm-trip-badge">{trip.events.length}개 구간</span>
                      <span className="dm-trip-badge">
                        <Calendar size={13} />
                        {formatShortDate(trip.firstEvent?.start_datetime)}
                        {trip.lastEvent?.start_datetime !== trip.firstEvent?.start_datetime
                          ? ` - ${formatShortDate(trip.lastEvent?.start_datetime)}`
                          : ''}
                      </span>
                      <span className="dm-trip-badge">
                        <Film size={13} />
                        {trip.mediaCount}
                      </span>
                      <span className="dm-trip-badge">
                        <Gauge size={13} />
                        {formatDistance(trip.distance)} km
                      </span>
                    </div>
                  </button>

                  <div className="dm-trip-management">
                    <div className="dm-management-copy">
                      <span>여행 방식</span>
                      <strong>{trip.isRoundTrip ? '왕복 여정' : '편도 여정'}</strong>
                      <small>
                        {trip.isRoundTrip
                          ? '마지막 복귀 구간까지 포함해 관리됩니다.'
                          : '복귀 구간을 추가하면 왕복으로 전환됩니다.'}
                      </small>
                    </div>
                    <button
                      type="button"
                      className="dm-trip-type-action"
                      onClick={() => handleToggleTripType(trip)}
                      disabled={!trip.firstEvent || !trip.lastEvent || trip.id === 'unassigned'}
                      title={trip.isRoundTrip ? '복귀 구간을 삭제해 편도로 변경' : '출발지로 돌아오는 구간 추가'}
                    >
                      {trip.isRoundTrip ? <CornerDownLeft size={15} /> : <ArrowLeftRight size={15} />}
                      {trip.isRoundTrip ? '편도로 변경' : '왕복으로 변경'}
                    </button>
                  </div>

                  {!isCollapsed && (
                    <div className="dm-leg-list" role="table" aria-label={`${trip.label} legs`}>
                      <div className="dm-leg-head" role="row">
                        <span>구간</span>
                        <span>경로</span>
                        <span>날짜와 시간</span>
                        <span>미디어</span>
                        <span>관리</span>
                      </div>

                      {trip.events.map((event, index) => (
                        <div className="dm-leg-row" role="row" key={event.id}>
                          <div className="dm-leg-id mono-font" role="cell">
                            <span>#{event.id}</span>
                            <small>구간 {index + 1}</small>
                          </div>
                          <div role="cell">
                            <div className="route-cell">
                              <span className="city-name">{event.from_name}</span>
                              <span className="arrow">→</span>
                              <span className="city-name">{event.to_name}</span>
                            </div>
                            <div className="event-title-sub">
                              {formatEventTitle(event.title, event.to_name)}
                              <span className="dm-transport-chip">{formatTransport(event.transport)}</span>
                            </div>
                          </div>
                          <div className="mono-font dm-leg-date" role="cell">{formatDate(event.start_datetime)}</div>
                          <div role="cell">
                            <div className="media-badge">
                              <Film size={14} />
                              <span>{event.media_list ? event.media_list.length : 0}</span>
                            </div>
                          </div>
                          <div role="cell">
                            <div className="action-buttons">
                              <button
                                className="action-btn edit"
                                onClick={() => setEditingEvent(event)}
                                title="이벤트 수정"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                className="action-btn delete"
                                onClick={() => handleDelete(event.id)}
                                title="이벤트 삭제"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}

            {events.length === 0 && (
              <div className="dm-empty-state">
                여행 데이터가 없습니다
              </div>
            )}

            {events.length > 0 && tripGroups.length === 0 && (
              <div className="dm-empty-state">
                조건에 맞는 여행이 없습니다
              </div>
            )}
          </div>
        </div>
      </div>

      {editingEvent && (
        <EditEventModal 
          event={editingEvent} 
          onSave={handleSave} 
          onClose={() => setEditingEvent(null)} 
        />
      )}
    </div>
  );
};

export default DataManagement;
