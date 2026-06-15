import React, { useEffect, useState } from 'react';
import { ChevronDown, Download, Gauge, Loader2, RotateCcw, Square, Video } from 'lucide-react';
import './SimulationExportPanel.css';

const EXPORT_SPEEDS = [0.5, 1, 2, 4];
const EXPORT_VIEW_MODES = [
  { value: 'globe', label: 'Globe' },
  { value: 'aerial', label: 'Aerial' }
];

const formatBytes = (value) => {
  const bytes = Number(value) || 0;
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let size = bytes / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
};

const SimulationExportPanel = ({
  eventCount,
  filterSummary,
  recorder,
  viewMode,
  onViewModeChange,
  onStart,
  onCancel
}) => {
  const [exportSpeed, setExportSpeed] = useState(1);
  const [collapsed, setCollapsed] = useState(true);
  const isRecording = recorder.status === 'recording' || recorder.status === 'saving';
  const isComplete = recorder.status === 'complete';
  const isError = recorder.status === 'error';
  const canExport = eventCount > 0 && !isRecording;
  const scopeLabel = filterSummary?.isFiltered ? 'Filtered scope' : 'Full journey';
  const needsAttention = isRecording || isComplete || isError;
  const expanded = !collapsed || isRecording;

  useEffect(() => {
    if (needsAttention) setCollapsed(false);
  }, [needsAttention]);

  return (
    <section className={`simulation-export-panel glass-panel ${expanded ? 'expanded' : 'collapsed'}`} aria-label="Simulation video export">
      <button
        type="button"
        className="simulation-export-summary"
        onClick={() => setCollapsed(prev => !prev)}
        aria-expanded={expanded}
        title={expanded ? 'Hide simulation export controls' : 'Show simulation export controls'}
      >
        <span className="export-kicker">
          <Video size={13} />
          Simulation export
        </span>
        <strong>{scopeLabel}</strong>
        <small>{eventCount} visible leg{eventCount === 1 ? '' : 's'} · {filterSummary?.dateLabel || 'All dates'}</small>
        <ChevronDown size={15} className="export-chevron" />
      </button>

      {expanded && (
        <>
          <div className="simulation-export-actions">
            <label className="export-speed-control" htmlFor="simulation-export-speed">
              <Gauge size={14} />
              <select
                id="simulation-export-speed"
                value={exportSpeed}
                disabled={isRecording}
                onChange={(event) => setExportSpeed(Number(event.target.value))}
              >
                {EXPORT_SPEEDS.map(value => (
                  <option key={value} value={value}>{value}x</option>
                ))}
              </select>
            </label>

            <label className="export-view-control" htmlFor="simulation-export-view">
              <Video size={14} />
              <select
                id="simulation-export-view"
                value={viewMode}
                disabled={isRecording}
                onChange={(event) => onViewModeChange(event.target.value)}
              >
                {EXPORT_VIEW_MODES.map(mode => (
                  <option key={mode.value} value={mode.value}>{mode.label}</option>
                ))}
              </select>
            </label>

            {isRecording ? (
              <button
                type="button"
                className="export-stop-btn"
                onClick={onCancel}
                title="Stop recording"
              >
                {recorder.status === 'saving' ? <Loader2 size={15} className="spin" /> : <Square size={14} />}
                <span>{recorder.status === 'saving' ? 'Saving' : 'Stop'}</span>
              </button>
            ) : isComplete && recorder.downloadUrl ? (
              <>
                <button
                  type="button"
                  className="export-download-btn"
                  onClick={recorder.downloadRecording}
                  title="Download recorded simulation"
                >
                  <Download size={15} />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  className="export-record-again-btn"
                  onClick={() => onStart(exportSpeed)}
                  disabled={!canExport}
                  title="Record again"
                >
                  <RotateCcw size={14} />
                  <span>Again</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                className="export-start-btn"
                onClick={() => onStart(exportSpeed)}
                disabled={!canExport}
                title="Record visible simulation"
              >
                <Download size={15} />
                <span>Record</span>
              </button>
            )}
          </div>

          {(isRecording || isComplete || isError || recorder.message) && (
            <div className={`export-status ${recorder.status}`}>
              <span>{recorder.message || 'Ready to record.'}</span>
              {isComplete && recorder.fileName && (
                <strong>{recorder.fileName} · {formatBytes(recorder.fileSize)}</strong>
              )}
              <div className="export-progress" aria-hidden="true">
                <i style={{ transform: `scaleX(${recorder.progress || 0})` }} />
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default SimulationExportPanel;
