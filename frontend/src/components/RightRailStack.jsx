import React from 'react';
import {
  ArrowUp,
  BookOpen,
  Calendar,
  ChevronDown,
  Database,
  Globe,
  Plus,
  Share2,
  SlidersHorizontal,
  Wind
} from 'lucide-react';
import ContinentNavigator from './ContinentNavigator';
import GlobeThemeSettings from './GlobeThemeSettings';
import SimulationExportPanel from './SimulationExportPanel';
import { formatDistance } from '../utils';

const RightRailStack = ({
  activeTransport,
  activeTransportCopy,
  activeLegDistance,
  isPlaying,
  simulationLayoutActive,
  speed,
  showForm,
  onOpenTravel,
  onCloseTravel,
  showUtilityRail,
  onUtilityRailToggle,
  showCalendar,
  setShowCalendar,
  showDataManagement,
  setShowDataManagement,
  showExportImport,
  setShowExportImport,
  showStats,
  setShowStats,
  showGlobeSettings,
  setShowGlobeSettings,
  globeVisual,
  setGlobeVisual,
  referenceLng,
  suggestedFavorite,
  onSuggestedFavoriteDone,
  onNavigate,
  eventCount,
  filterSummary,
  recorder,
  viewMode,
  onViewModeChange,
  onStartRecording,
  onCancelRecording,
  onOpenManager
}) => (
  <aside className={`right-rail-stack ${showGlobeSettings ? 'theme-open' : ''} ${simulationLayoutActive ? 'simulation-compact' : ''}`} aria-label="Globe command rail">
    <div className={`hud-overlay top-right hud-font glass-panel ${showUtilityRail ? 'tools-open' : ''} ${showGlobeSettings ? 'theme-open' : ''}`}>
      <div className={`route-status-card ${activeTransport}`}>
        <span>{activeTransportCopy.status}</span>
        <strong>{activeTransportCopy.label}</strong>
        <small>{formatDistance(activeLegDistance)} km leg</small>
      </div>

      {isPlaying && activeTransport === 'plane' && (
        <>
          <div className="hud-item compact">
            <ArrowUp size={16} /> <span>{activeTransportCopy.metricA}: 32,000 ft</span>
          </div>
          <div className="hud-item compact">
            <Wind size={16} /> <span>{activeTransportCopy.metricB}: {Math.round(840 * speed)} km/h</span>
          </div>
        </>
      )}

      {isPlaying && activeTransport === 'ship' && (
        <>
          <div className="hud-item compact">
            <ArrowUp size={16} /> <span>{activeTransportCopy.metricA}</span>
          </div>
          <div className="hud-item compact">
            <Wind size={16} /> <span>{activeTransportCopy.metricB}: {Math.max(18, Math.round(32 * speed))} km/h</span>
          </div>
        </>
      )}

      <button
        className="add-toggle-btn"
        title={showForm ? 'Close travel form' : 'Add travel'}
        onClick={showForm ? onCloseTravel : onOpenTravel}
      >
        <Plus />
        <span className="btn-label">{showForm ? 'CLOSE' : 'ADD TRAVEL'}</span>
      </button>

      <button className="log-btn" title="View journey log" onClick={onOpenManager}>
        <BookOpen size={17} />
        <span className="btn-label">VIEW JOURNEY LOG</span>
      </button>

      <button
        className={`utility-drawer-toggle ${showUtilityRail ? 'active' : ''}`}
        onClick={onUtilityRailToggle}
        aria-expanded={showUtilityRail}
        title="Show globe tools"
      >
        <SlidersHorizontal size={18} />
        <span>TOOLS</span>
        <ChevronDown size={16} className="drawer-chevron" />
      </button>

      {showUtilityRail && (
        <div className="utility-drawer">
          <button
            className={`neon-btn-icon ${showCalendar ? 'active' : ''}`}
            onClick={() => setShowCalendar(!showCalendar)}
            title="Calendar View"
          >
            <Calendar size={20} />
            <span className="btn-label">CALENDAR</span>
          </button>
          <button
            className={`neon-btn-icon ${showDataManagement ? 'active' : ''}`}
            onClick={() => setShowDataManagement(!showDataManagement)}
            title="Manage Data"
          >
            <Database size={20} />
            <span className="btn-label">MANAGE</span>
          </button>
          <button
            className={`neon-btn-icon ${showExportImport ? 'active' : ''}`}
            onClick={() => setShowExportImport(!showExportImport)}
            title="Export/Import Data"
          >
            <Share2 size={20} />
            <span className="btn-label">PORTABILITY</span>
          </button>
          <button
            className={`neon-btn-icon ${showStats ? 'active' : ''}`}
            onClick={() => setShowStats(!showStats)}
            title="Travel Statistics"
          >
            <Globe size={20} />
            <span className="btn-label">STATS</span>
          </button>
          <GlobeThemeSettings
            open={showGlobeSettings}
            value={globeVisual}
            onChange={setGlobeVisual}
            onOpenChange={setShowGlobeSettings}
          />
        </div>
      )}
    </div>

    <ContinentNavigator
      referenceLng={referenceLng}
      suggestedFavorite={suggestedFavorite}
      onSuggestedFavoriteDone={onSuggestedFavoriteDone}
      onNavigate={onNavigate}
    />

    <SimulationExportPanel
      eventCount={eventCount}
      filterSummary={filterSummary}
      recorder={recorder}
      viewMode={viewMode}
      onViewModeChange={onViewModeChange}
      onStart={onStartRecording}
      onCancel={onCancelRecording}
    />
  </aside>
);

export default RightRailStack;
