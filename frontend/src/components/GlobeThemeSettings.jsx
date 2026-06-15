import React from 'react';
import { Crosshair, Flag, Landmark, Map, MapPin, Moon, Palette, RadioTower, Route, Settings2, Sun } from 'lucide-react';
import {
  GLOBE_THEME_PRESETS,
  MARKER_STYLE_PROFILES,
  ROUTE_STYLE_PROFILES
} from '../config/globeThemes';
import { WORLD_LIFE_LIST_DESTINATIONS } from '../config/worldHighlights';
import './GlobeThemeSettings.css';

const THEME_ICONS = {
  midnight: Moon,
  daybreak: Sun,
  atlas: Map,
  harbor: Palette
};

const MARKER_STYLE_ICONS = {
  halo: Crosshair,
  pinpoint: MapPin,
  flag: Flag,
  landmark: Landmark,
  radar: RadioTower
};

const GlobeThemeSettings = ({ open, value, onChange, onOpenChange }) => {
  const patchVisual = (patch) => onChange({ ...value, ...patch });
  const highlightMax = WORLD_LIFE_LIST_DESTINATIONS.length;
  const highlightLimit = Math.min(
    highlightMax,
    Math.max(1, Number(value.worldHighlightLimit || highlightMax))
  );
  const countryLimit = Math.min(20, Math.max(1, Number(value.worldHighlightCountryLimit || 5)));
  const highlightsEnabled = value.showWorldHighlights !== false;
  const highlightMode = value.worldHighlightMode || 'global';

  return (
    <div className="globe-theme-control">
      <button
        type="button"
        className={`theme-toggle-btn ${open ? 'active' : ''}`}
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        title="Globe visual settings"
      >
        <Settings2 size={18} />
        <span>GLOBE THEME</span>
      </button>

      {open && (
        <section className="globe-theme-panel glass-panel" aria-label="Globe visual settings">
          <div className="theme-panel-heading">
            <span>VISUAL MODE</span>
            <strong>Choose how routes sit on the globe</strong>
          </div>

          <div className="theme-grid" role="list">
            {GLOBE_THEME_PRESETS.map(theme => {
              const Icon = THEME_ICONS[theme.id] || Palette;
              return (
                <button
                  key={theme.id}
                  type="button"
                  className={`theme-card ${value.themeId === theme.id ? 'active' : ''}`}
                  onClick={() => patchVisual({ themeId: theme.id })}
                  role="listitem"
                >
                  <Icon size={17} />
                  <span>{theme.label}</span>
                  <small>{theme.caption}</small>
                </button>
              );
            })}
          </div>

          <div className="theme-setting-row">
            <label htmlFor="route-style-select">
              <Route size={15} />
              Route shape
            </label>
            <select
              id="route-style-select"
              value={value.routeStyleId}
              onChange={(event) => patchVisual({ routeStyleId: event.target.value })}
            >
              {ROUTE_STYLE_PROFILES.map(style => (
                <option key={style.id} value={style.id}>{style.label}</option>
              ))}
            </select>
          </div>

          <div className="theme-marker-section">
            <div className="theme-marker-heading">
              <Crosshair size={15} />
              <span>Visited marker</span>
            </div>
            <div
              className="marker-style-grid"
              role="radiogroup"
              aria-label="Visited place marker style"
            >
              {MARKER_STYLE_PROFILES.map(style => (
                <button
                  key={style.id}
                  type="button"
                  className={`marker-style-card ${value.markerStyleId === style.id ? 'active' : ''}`}
                  onClick={() => patchVisual({ markerStyleId: style.id })}
                  role="radio"
                  aria-checked={value.markerStyleId === style.id}
                >
                  {(() => {
                    const Icon = MARKER_STYLE_ICONS[style.id] || MapPin;
                    return (
                      <span className={`marker-preview marker-preview-${style.markerShape || style.id}`}>
                        <Icon size={16} />
                      </span>
                    );
                  })()}
                  <span>{style.label}</span>
                  <small>{style.caption}</small>
                </button>
              ))}
            </div>
          </div>

          <label className="theme-switch-row">
            <span>
              <MapPin size={15} />
              Life list signals
            </span>
            <input
              type="checkbox"
              checked={highlightsEnabled}
              onChange={(event) => patchVisual({ showWorldHighlights: event.target.checked })}
            />
            <i aria-hidden="true" />
          </label>

          <div className={`theme-range-row ${!highlightsEnabled ? 'disabled' : ''}`}>
            <div className="highlight-mode-buttons" role="group" aria-label="Recommended destination filter">
              <button
                type="button"
                className={highlightMode === 'global' ? 'active' : ''}
                disabled={!highlightsEnabled}
                onClick={() => patchVisual({ worldHighlightMode: 'global' })}
              >
                Global Top
              </button>
              <button
                type="button"
                className={highlightMode === 'country-top' ? 'active' : ''}
                disabled={!highlightsEnabled}
                onClick={() => patchVisual({ worldHighlightMode: 'country-top' })}
              >
                Country Top
              </button>
            </div>

            <div className="range-row-heading">
              <span>{highlightMode === 'country-top' ? '나라별 Top N' : '추천 여행지'}</span>
              <strong>
                {highlightsEnabled
                  ? highlightMode === 'country-top'
                    ? `${countryLimit} each`
                    : `${highlightLimit} / ${highlightMax}`
                  : 'Hidden'}
              </strong>
            </div>
            <input
              type="range"
              min="1"
              max={highlightMode === 'country-top' ? 20 : highlightMax}
              step="1"
              value={highlightMode === 'country-top' ? countryLimit : highlightLimit}
              disabled={!highlightsEnabled}
              onChange={(event) => patchVisual(
                highlightMode === 'country-top'
                  ? { worldHighlightCountryLimit: Number(event.target.value) }
                  : { worldHighlightLimit: Number(event.target.value) }
              )}
              aria-label="Recommended destination count"
            />
          </div>

          <div className="theme-style-notes">
            <RadioTower size={15} />
            <span>
              {ROUTE_STYLE_PROFILES.find(style => style.id === value.routeStyleId)?.caption}
              {' / '}
              {MARKER_STYLE_PROFILES.find(style => style.id === value.markerStyleId)?.caption}
            </span>
          </div>
        </section>
      )}
    </div>
  );
};

export default GlobeThemeSettings;
