import React, { useState } from 'react';
import { Download, Gauge, Loader2, Square, Video } from 'lucide-react';
import './SimulationExportPanel.css';

const EXPORT_SPEEDS = [0.5, 1, 2, 4];

const SimulationExportPanel = ({
  eventCount,
  filterSummary,
  recorder,
  onStart,
  onCancel
}) => {
  const [exportSpeed, setExportSpeed] = useState(1);
  const isRecording = recorder.status === 'recording' || recorder.status === 'saving';
  const isComplete = recorder.status === 'complete';
  const isError = recorder.status === 'error';
  const canExport = eventCount > 0 && !isRecording;
  const scopeLabel = filterSummary?.isFiltered ? 'Filtered scope' : 'Full journey';

  return (
    <section className="simulation-export-panel glass-panel" aria-label="Simulation video export">
      <div className="simulation-export-copy">
        <span className="export-kicker">
          <Video size={13} />
          Simulation export
        </span>
        <strong>{scopeLabel}</strong>
        <small>{eventCount} visible leg{eventCount === 1 ? '' : 's'} · {filterSummary?.dateLabel || 'All dates'}</small>
      </div>

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
          <div className="export-progress" aria-hidden="true">
            <i style={{ transform: `scaleX(${recorder.progress || 0})` }} />
          </div>
        </div>
      )}
    </section>
  );
};

export default SimulationExportPanel;
