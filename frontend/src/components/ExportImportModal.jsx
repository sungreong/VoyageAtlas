import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Download, Upload, X, FileJson, CheckCircle2, AlertCircle,
  FileSpreadsheet, Settings, MapPin, Calendar, Plane, CheckSquare, Square, Globe,
  Clipboard, Check
} from 'lucide-react';
import { API_BASE } from '../api/client';
import './DataManagement.css';
import './ExportImportModal.css';

const toInputDate = (iso) => iso ? new Date(iso).toISOString().split('T')[0] : '';
const fmtDisplay  = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
};

const IMPORT_SAMPLE = {
  version: '2.0',
  trips: [
    {
      trip_title: 'Seoul to Jeju Odyssey',
      routes: [
        {
          title: 'Flight to Jeju',
          from: 'Seoul',
          to: 'Jeju',
          from_lat: 37.5665,
          from_lng: 126.9780,
          to_lat: 33.4996,
          to_lng: 126.5312,
          date: '2026-06-06T09:00:00',
          transport: 'plane',
          note: 'Morning departure'
        }
      ]
    }
  ]
};

const IMPORT_SAMPLE_TEXT = JSON.stringify(IMPORT_SAMPLE, null, 2);

const IMPORT_RULES = [
  'trips 배열이 반드시 필요합니다.',
  '여행 이름은 trip_title 또는 title 로 입력합니다.',
  '이동 기록은 routes 또는 events 배열에 넣습니다.',
  '각 이동 기록에는 출발/도착 도시, 좌표, 날짜가 필요합니다.',
  '날짜는 2026-06-06T09:00:00 같은 ISO 형식을 사용합니다.'
];

const ExportImportModal = ({ onClose, onRefresh }) => {
  // ── All trips from backend ──────────────────────────────────
  const [allTrips, setAllTrips]       = useState([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(true);

  // ── Date filter (upper section) ─────────────────────────────
  // Empty = no filter (show all)
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd,   setFilterEnd]   = useState('');

  // ── Per-trip exclusion (lower section) ──────────────────────
  // Stores IDs that the user manually UNCHECKED from the filtered list
  const [excludedIds, setExcludedIds] = useState(new Set());

  // ── Export options ──────────────────────────────────────────
  const [exportFormat, setExportFormat] = useState('json');
  const [detailLevel,  setDetailLevel]  = useState('basic');
  const [isExporting,  setIsExporting]  = useState(false);

  // ── Import ──────────────────────────────────────────────────
  const [isImporting, setIsImporting] = useState(false);
  const [dragActive,  setDragActive]  = useState(false);
  const [copyState, setCopyState] = useState('idle');

  const [message, setMessage] = useState(null);

  // ── Load all trips on mount ─────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        setIsLoadingTrips(true);
        const res = await axios.get(`${API_BASE}/events/trips/summary`);
        setAllTrips(res.data);
      } catch (err) {
        console.error('Failed to load trips', err);
      } finally {
        setIsLoadingTrips(false);
      }
    };
    load();
  }, []);

  // ── Filtered trips (by date range) ─────────────────────────
  // Date filter: trips that overlap with [filterStart, filterEnd]
  const filteredTrips = useMemo(() => {
    if (!filterStart && !filterEnd) return allTrips;
    const s = filterStart ? new Date(filterStart) : null;
    const e = filterEnd   ? new Date(filterEnd)   : null;
    return allTrips.filter(t => {
      const tStart = t.start_date ? new Date(t.start_date) : null;
      const tEnd   = t.end_date   ? new Date(t.end_date)   : null;
      if (!tStart && !tEnd) return false;
      if (s && tEnd   && tEnd   < s) return false;
      if (e && tStart && tStart > e) return false;
      return true;
    });
  }, [allTrips, filterStart, filterEnd]);

  // Reset exclusions when filter changes
  useEffect(() => {
    setExcludedIds(new Set());
  }, [filterStart, filterEnd]);

  // ── Selected trips = filtered minus manually excluded ───────
  const selectedTrips = useMemo(
    () => filteredTrips.filter(t => !excludedIds.has(t.id)),
    [filteredTrips, excludedIds]
  );

  const allFilteredSelected = excludedIds.size === 0;

  const toggleTrip = (id) => {
    setExcludedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      // Exclude all filtered
      setExcludedIds(new Set(filteredTrips.map(t => t.id)));
    } else {
      // Include all filtered
      setExcludedIds(new Set());
    }
  };

  // ── Export ──────────────────────────────────────────────────
  const handleExport = async () => {
    if (selectedTrips.length === 0) {
      setMessage({ text: '내보낼 여행이 없습니다. 선택을 확인하세요.', type: 'error' });
      return;
    }
    try {
      setIsExporting(true);
      setMessage(null);

      const params = new URLSearchParams();
      params.append('format', exportFormat);
      params.append('detail_level', detailLevel);

      // Prefer trip_ids when specific trips selected; fallback to date if all
      if (selectedTrips.length < allTrips.length) {
        params.append('trip_ids', selectedTrips.map(t => t.id).join(','));
      } else if (filterStart || filterEnd) {
        if (filterStart) params.append('start_date', new Date(filterStart).toISOString());
        if (filterEnd)   params.append('end_date',   new Date(filterEnd).toISOString());
      }
      // else: no filter → export all

      const url = `${API_BASE}/events/export/enhanced?${params.toString()}`;
      const res = await axios.get(url, { responseType: 'blob' });

      const cd = res.headers['content-disposition'];
      let filename = `voyage_atlas_export_${detailLevel}_${new Date().toISOString().split('T')[0]}.${exportFormat === 'json' ? 'json' : 'xlsx'}`;
      if (cd) {
        const m = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (m?.[1]) filename = m[1].replace(/['"]/g, '');
      }

      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      Object.assign(document.createElement('a'), { href: blobUrl, download: filename }).click();
      window.URL.revokeObjectURL(blobUrl);

      setMessage({
        text: `${exportFormat.toUpperCase()} 내보내기 완료! (${selectedTrips.length}개 여행, ${detailLevel} 모드)`,
        type: 'success'
      });
    } catch (err) {
      console.error('Export failed', err);
      setMessage({ text: '내보내기 실패. 다시 시도해주세요.', type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  // ── Import ──────────────────────────────────────────────────
  const handleImport = async (file) => {
    if (!file) return;
    try {
      setIsImporting(true);
      setMessage(null);
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const json = JSON.parse(e.target.result);
          const res = await axios.post(`${API_BASE}/events/import`, json);
          setMessage({
            text: `Import 성공! ${res.data.imported_trips}개 여행, ${res.data.imported_events}개 이벤트 추가됨.`,
            type: 'success'
          });
          if (onRefresh) onRefresh();
        } catch (err) {
          const detail = err?.response?.data?.detail;
          setMessage({
            text: detail || 'JSON 구조를 확인해주세요. 샘플 형식과 필수 필드를 맞추면 가져올 수 있습니다.',
            type: 'error'
          });
        } finally {
          setIsImporting(false);
        }
      };
      reader.readAsText(file);
    } catch {
      setMessage({ text: '파일 읽기 실패.', type: 'error' });
      setIsImporting(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleImport(e.dataTransfer.files[0]);
  };

  const handleCopySample = async () => {
    let copied = false;
    try {
      if (window.navigator?.clipboard?.writeText) {
        await window.navigator.clipboard.writeText(IMPORT_SAMPLE_TEXT);
        copied = true;
      }
    } catch {
      copied = false;
    }

    if (!copied) {
      try {
        const copyListener = (event) => {
          event.clipboardData.setData('text/plain', IMPORT_SAMPLE_TEXT);
          event.preventDefault();
        };
        document.addEventListener('copy', copyListener);
        copied = document.execCommand('copy');
        document.removeEventListener('copy', copyListener);
      } catch {
        copied = false;
      }
    }

    if (!copied) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = IMPORT_SAMPLE_TEXT;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        copied = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch {
        copied = false;
      }
    }

    if (copied) {
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 1800);
    } else {
      setMessage({ text: '샘플 복사에 실패했습니다. 코드 블록을 직접 선택해서 복사해주세요.', type: 'error' });
    }
  };

  const handleDownloadSample = () => {
    const blob = new Blob([IMPORT_SAMPLE_TEXT], { type: 'application/json' });
    const blobUrl = window.URL.createObjectURL(blob);
    const link = Object.assign(document.createElement('a'), {
      href: blobUrl,
      download: 'voyage_atlas_import_sample.json'
    });
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 0);
  };

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="modal-overlay">
      <div className="modal-content export-import-modal">

        {/* Header */}
        <div className="dm-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div className="neon-icon-glow">
              <FileJson size={32} color="var(--neon-cyan)" />
            </div>
            <h2>DATA PORTABILITY</h2>
          </div>
          <button className="icon-btn-secondary" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="export-import-grid">

          {/* ── LEFT: EXPORT ───────────────────────────── */}
          <div className="portability-section">
            <div className="section-label">
              <Download size={18} /> <span>EXPORT DATA</span>
            </div>

            {/* ① Date Filter — TOP */}
            <div className="epm-sub-label">
              <Calendar size={12} /> 기간 필터 <span style={{opacity:0.5, fontSize:'0.65rem', marginLeft: 4}}>(비워두면 전체)</span>
            </div>
            <div className="epm-date-panel">
              <div className="epm-date-hint-row">
                <span className="epm-date-hint">
                  {filterStart || filterEnd
                    ? `📅 ${fmtDisplay(filterStart) || '시작'} ~ ${fmtDisplay(filterEnd) || '종료'} 기간의 여행만 표시합니다.`
                    : '📌 날짜를 설정하면 해당 기간 여행만 목록에 표시됩니다.'}
                </span>
                {(filterStart || filterEnd) && (
                  <button
                    className="epm-clear-btn"
                    onClick={() => { setFilterStart(''); setFilterEnd(''); }}
                    title="필터 초기화"
                  >✕</button>
                )}
              </div>
              <div className="epm-date-row">
                <div className="epm-date-field">
                  <label className="epm-date-label">시작일</label>
                  <input
                    type="date"
                    className="epm-date-input"
                    value={filterStart}
                    max={filterEnd || undefined}
                    onChange={e => setFilterStart(e.target.value)}
                  />
                </div>
                <div className="epm-date-sep">~</div>
                <div className="epm-date-field">
                  <label className="epm-date-label">종료일</label>
                  <input
                    type="date"
                    className="epm-date-input"
                    value={filterEnd}
                    min={filterStart || undefined}
                    onChange={e => setFilterEnd(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* ② Trip Selection — filtered, deselect to exclude */}
            <div className="export-sub-label" style={{ marginTop: 2 }}>
              <Plane size={12} /> 여행 선택
              <span style={{ marginLeft: 'auto', fontSize: '0.68rem', opacity: 0.55 }}>
                클릭으로 개별 제외 가능
              </span>
            </div>
            <div className="trip-selection-panel">
              {/* Select All row */}
              <div className="trip-select-all-row" onClick={toggleSelectAll}>
                <div className="trip-checkbox">
                  {allFilteredSelected
                    ? <CheckSquare size={18} color="var(--neon-cyan)" />
                    : <Square size={18} color="var(--text-muted)" />
                  }
                </div>
                <span className="trip-select-all-label">
                  {allFilteredSelected ? '전체 선택 해제' : '전체 선택'}
                </span>
                <span className="trip-count-badge">
                  {selectedTrips.length} / {filteredTrips.length}
                </span>
              </div>

              {/* Cards */}
              <div className="trip-cards-list">
                {isLoadingTrips ? (
                  <div className="trip-loading">
                    <Globe size={24} className="spinning" />
                    <span>여행 목록 불러오는 중...</span>
                  </div>
                ) : filteredTrips.length === 0 ? (
                  <div className="trip-empty">
                    <Plane size={24} />
                    <span>
                      {allTrips.length === 0
                        ? '여행 기록이 없습니다.'
                        : '해당 기간에 여행이 없습니다.'}
                    </span>
                  </div>
                ) : (
                  filteredTrips.map(trip => {
                    const included = !excludedIds.has(trip.id);
                    return (
                      <div
                        key={trip.id}
                        className={`trip-card-select ${included ? 'selected' : 'excluded'}`}
                        onClick={() => toggleTrip(trip.id)}
                      >
                        <div className="trip-card-check">
                          {included
                            ? <CheckSquare size={16} color="var(--neon-cyan)" />
                            : <Square size={16} color="var(--text-muted)" />
                          }
                        </div>
                        <div className="trip-card-info">
                          <div className="trip-card-title" style={{ opacity: included ? 1 : 0.4 }}>
                            <Plane size={12} style={{ marginRight: 4, opacity: 0.7 }} />
                            {trip.title}
                          </div>
                          <div className="trip-card-meta">
                            <span className="trip-card-dates" style={{ opacity: included ? 1 : 0.4 }}>
                              <Calendar size={11} />
                              {fmtDisplay(trip.start_date)}
                              {trip.end_date && trip.end_date !== trip.start_date
                                ? ` ~ ${fmtDisplay(trip.end_date)}`
                                : ''}
                            </span>
                          </div>
                          {included && trip.destinations?.length > 0 && (
                            <div className="trip-card-destinations">
                              {trip.destinations.slice(0, 5).map((d, i) => (
                                <span key={i} className="dest-tag">
                                  <MapPin size={9} />{d}
                                </span>
                              ))}
                              {trip.destinations.length > 5 && (
                                <span className="dest-tag more">+{trip.destinations.length - 5}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ③ Export Options */}
            <div className="export-controls">
              <div className="form-group">
                <label className="neon-label"><FileJson size={14} /> EXPORT FORMAT</label>
                <div className="format-toggle">
                  <button className={`format-btn ${exportFormat === 'json' ? 'active' : ''}`}
                    onClick={() => setExportFormat('json')} type="button">
                    <FileJson size={16} /> JSON
                  </button>
                  <button className={`format-btn ${exportFormat === 'excel' ? 'active' : ''}`}
                    onClick={() => setExportFormat('excel')} type="button">
                    <FileSpreadsheet size={16} /> EXCEL
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="neon-label"><Settings size={14} /> DETAIL LEVEL</label>
                <div className="detail-toggle">
                  <button className={`detail-btn ${detailLevel === 'basic' ? 'active' : ''}`}
                    onClick={() => setDetailLevel('basic')} type="button">
                    BASIC <span className="detail-hint">Routes only</span>
                  </button>
                  <button className={`detail-btn ${detailLevel === 'detailed' ? 'active' : ''}`}
                    onClick={() => setDetailLevel('detailed')} type="button">
                    DETAILED <span className="detail-hint">Full metadata</span>
                  </button>
                </div>
              </div>

              <button
                className="neon-btn primary wide-btn"
                onClick={handleExport}
                disabled={isExporting || selectedTrips.length === 0}
              >
                {isExporting
                  ? 'PREPARING...'
                  : `DOWNLOAD ${exportFormat.toUpperCase()} (${selectedTrips.length}개 여행)`}
              </button>
            </div>
          </div>

          <div className="v-divider"></div>

          {/* ── RIGHT: IMPORT ───────────────────────────── */}
          <div className="portability-section">
            <div className="section-label">
              <Upload size={18} /> <span>IMPORT DATA</span>
            </div>
            <p className="section-desc">샘플 구조에 맞춘 JSON 파일을 올리면 여행과 이동 기록을 병합합니다.</p>

            <div className="epm-import-guide">
              <div className="epm-guide-header">
                <div>
                  <span className="epm-guide-kicker">JSON TEMPLATE</span>
                  <h3>복사해서 바로 시작하세요</h3>
                </div>
                <button
                  type="button"
                  className={`epm-copy-btn ${copyState === 'copied' ? 'copied' : ''}`}
                  onClick={handleCopySample}
                >
                  {copyState === 'copied' ? <Check size={14} /> : <Clipboard size={14} />}
                  <span>{copyState === 'copied' ? 'COPIED' : 'COPY'}</span>
                </button>
                <button
                  type="button"
                  className="epm-copy-btn"
                  onClick={handleDownloadSample}
                >
                  <Download size={14} />
                  <span>SAMPLE</span>
                </button>
              </div>

              <ul className="epm-rule-list">
                {IMPORT_RULES.map(rule => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>

              <pre className="epm-sample-code" aria-label="Import JSON sample">
                <code>{IMPORT_SAMPLE_TEXT}</code>
              </pre>
            </div>

            <div
              className={`import-dropzone ${dragActive ? 'active' : ''} ${isImporting ? 'loading' : ''}`}
              onDragEnter={handleDrag} onDragLeave={handleDrag}
              onDragOver={handleDrag} onDrop={handleDrop}
            >
              <input type="file" id="file-upload" className="hidden-file-input" accept=".json"
                onChange={e => { if (e.target.files?.[0]) handleImport(e.target.files[0]); }} />
              <label htmlFor="file-upload" className="dropzone-label">
                <div className="upload-icon"><Upload size={40} /></div>
                <div className="upload-text">
                  {isImporting ? 'PROCESSING...' : 'DRAG & DROP OR CLICK TO SELECT'}
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Status */}
        {message && (
          <div className={`status-message ${message.type}`}>
            {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{message.text}</span>
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: '24px' }}>
          <button className="neon-btn secondary" onClick={onClose}>CLOSE</button>
        </div>
      </div>
    </div>
  );
};

export default ExportImportModal;
