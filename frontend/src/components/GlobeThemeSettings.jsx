import React from 'react';
import { Crosshair, Map, Moon, Palette, RadioTower, Route, Settings2, Sun } from 'lucide-react';
import {
  GLOBE_THEME_PRESETS,
  MARKER_STYLE_PROFILES,
  ROUTE_STYLE_PROFILES
} from '../config/globeThemes';
import './GlobeThemeSettings.css';

const THEME_ICONS = {
  midnight: Moon,
  daybreak: Sun,
  atlas: Map,
  harbor: Palette
};

const GlobeThemeSettings = ({ open, value, onChange, onOpenChange }) => {
  const patchVisual = (patch) => onChange({ ...value, ...patch });

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

          <div className="theme-setting-row">
            <label htmlFor="marker-style-select">
              <Crosshair size={15} />
              Selected city
            </label>
            <select
              id="marker-style-select"
              value={value.markerStyleId}
              onChange={(event) => patchVisual({ markerStyleId: event.target.value })}
            >
              {MARKER_STYLE_PROFILES.map(style => (
                <option key={style.id} value={style.id}>{style.label}</option>
              ))}
            </select>
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
