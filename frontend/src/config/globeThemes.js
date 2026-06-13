const IMG_BASE = '//unpkg.com/three-globe/example/img';

export const GLOBE_THEME_PRESETS = [
  {
    id: 'midnight',
    label: 'Midnight',
    caption: 'High contrast night routes',
    globeImageUrl: `${IMG_BASE}/earth-dark.jpg`,
    bumpImageUrl: `${IMG_BASE}/earth-topology.png`,
    backgroundImageUrl: `${IMG_BASE}/night-sky.png`,
    atmosphereColor: '#6be7ff',
    atmosphereAltitude: 0.16,
    sunIntensity: 1.65,
    ambientIntensity: 0.24,
    labelFill: 'rgba(6, 18, 24, 0.68)',
    activeLabelFill: 'rgba(83, 57, 22, 0.84)',
    labelStroke: 'rgba(158, 207, 198, 0.42)',
    activeLabelStroke: 'rgba(255, 226, 168, 0.9)',
    labelText: 'rgba(234, 246, 242, 0.84)',
    activeLabelText: '#fff7df',
    marker: '#9ecfc6',
    activeMarker: '#ffe2a8',
    routes: {
      plane: { active: ['#9ecfc6', '#ffe2a8'], inactive: ['158, 207, 198', '220, 236, 184'] },
      ship: { active: ['#6be7ff', '#b9ddd3'], inactive: ['107, 231, 255', '185, 221, 211'] },
      starship: { active: ['#f7fbff', '#6be7ff'], inactive: ['247, 251, 255', '107, 231, 255'] },
      ground: { active: ['#dcecb8', '#ffe2a8'], inactive: ['220, 236, 184', '255, 226, 168'] }
    }
  },
  {
    id: 'daybreak',
    label: 'Daybreak',
    caption: 'Bright earth, softer overlays',
    globeImageUrl: `${IMG_BASE}/earth-day.jpg`,
    bumpImageUrl: `${IMG_BASE}/earth-topology.png`,
    backgroundImageUrl: null,
    atmosphereColor: '#8ec7ff',
    atmosphereAltitude: 0.11,
    sunIntensity: 2.35,
    ambientIntensity: 0.72,
    labelFill: 'rgba(17, 37, 45, 0.7)',
    activeLabelFill: 'rgba(88, 48, 21, 0.82)',
    labelStroke: 'rgba(55, 112, 128, 0.48)',
    activeLabelStroke: 'rgba(255, 190, 102, 0.92)',
    labelText: '#f4fbf7',
    activeLabelText: '#fff5d7',
    marker: '#1c8da0',
    activeMarker: '#ffbe66',
    routes: {
      plane: { active: ['#147f93', '#ffb65d'], inactive: ['20, 127, 147', '255, 182, 93'] },
      ship: { active: ['#0a93b8', '#55b39f'], inactive: ['10, 147, 184', '85, 179, 159'] },
      starship: { active: ['#f6fbff', '#1d8ec2'], inactive: ['246, 251, 255', '29, 142, 194'] },
      ground: { active: ['#5a9b53', '#d99a3d'], inactive: ['90, 155, 83', '217, 154, 61'] }
    }
  },
  {
    id: 'atlas',
    label: 'Blue Atlas',
    caption: 'Classic satellite blue',
    globeImageUrl: `${IMG_BASE}/earth-blue-marble.jpg`,
    bumpImageUrl: `${IMG_BASE}/earth-topology.png`,
    backgroundImageUrl: `${IMG_BASE}/night-sky.png`,
    atmosphereColor: '#00f2ff',
    atmosphereAltitude: 0.14,
    sunIntensity: 2,
    ambientIntensity: 0.28,
    labelFill: 'rgba(5, 22, 36, 0.66)',
    activeLabelFill: 'rgba(70, 46, 20, 0.84)',
    labelStroke: 'rgba(126, 214, 226, 0.44)',
    activeLabelStroke: 'rgba(255, 226, 168, 0.9)',
    labelText: 'rgba(235, 250, 252, 0.9)',
    activeLabelText: '#fff7df',
    marker: '#7ed6e2',
    activeMarker: '#ffe2a8',
    routes: {
      plane: { active: ['#7ed6e2', '#ffe2a8'], inactive: ['126, 214, 226', '220, 236, 184'] },
      ship: { active: ['#6be7ff', '#b9ddd3'], inactive: ['107, 231, 255', '185, 221, 211'] },
      starship: { active: ['#f7fbff', '#6be7ff'], inactive: ['247, 251, 255', '107, 231, 255'] },
      ground: { active: ['#dcecb8', '#ffe2a8'], inactive: ['220, 236, 184', '255, 226, 168'] }
    }
  },
  {
    id: 'harbor',
    label: 'Harbor',
    caption: 'Water-forward travel map',
    globeImageUrl: `${IMG_BASE}/earth-water.png`,
    bumpImageUrl: `${IMG_BASE}/earth-topology.png`,
    backgroundImageUrl: `${IMG_BASE}/night-sky.png`,
    atmosphereColor: '#7adbc8',
    atmosphereAltitude: 0.13,
    sunIntensity: 1.9,
    ambientIntensity: 0.36,
    labelFill: 'rgba(8, 30, 34, 0.7)',
    activeLabelFill: 'rgba(53, 65, 27, 0.84)',
    labelStroke: 'rgba(122, 219, 200, 0.44)',
    activeLabelStroke: 'rgba(226, 235, 151, 0.9)',
    labelText: '#edf9f3',
    activeLabelText: '#fbffd7',
    marker: '#7adbc8',
    activeMarker: '#e2eb97',
    routes: {
      plane: { active: ['#7adbc8', '#e2eb97'], inactive: ['122, 219, 200', '226, 235, 151'] },
      ship: { active: ['#9be8ff', '#7adbc8'], inactive: ['155, 232, 255', '122, 219, 200'] },
      starship: { active: ['#f4fff9', '#9be8ff'], inactive: ['244, 255, 249', '155, 232, 255'] },
      ground: { active: ['#b4d56c', '#f0c06a'], inactive: ['180, 213, 108', '240, 192, 106'] }
    }
  }
];

export const ROUTE_STYLE_PROFILES = [
  {
    id: 'legible',
    label: 'Legible dash',
    caption: 'Thin, short segments around the traveler',
    activeDashLength: 0.12,
    activeDashGap: 0.5,
    inactiveDashLengthScale: 0.82,
    inactiveDashGapScale: 1.18,
    activeStrokeScale: 0.5,
    inactiveStrokeScale: 0.72,
    dashTimeScale: 1.18,
    altitudeScale: 1.08,
    vehicleLift: 0.1
  },
  {
    id: 'ribbon',
    label: 'Route ribbon',
    caption: 'Cinematic but still lighter than before',
    activeDashLength: 0.64,
    activeDashGap: 0.08,
    inactiveDashLengthScale: 1.35,
    inactiveDashGapScale: 0.72,
    activeStrokeScale: 1.18,
    inactiveStrokeScale: 1.12,
    dashTimeScale: 0.92,
    altitudeScale: 1,
    vehicleLift: 0.085
  },
  {
    id: 'pulse',
    label: 'Signal pulse',
    caption: 'Small fast pulses for dense routes',
    activeDashLength: 0.055,
    activeDashGap: 0.68,
    inactiveDashLengthScale: 0.5,
    inactiveDashGapScale: 1.34,
    activeStrokeScale: 0.72,
    inactiveStrokeScale: 0.58,
    dashTimeScale: 0.5,
    altitudeScale: 1.12,
    vehicleLift: 0.11
  }
];

export const MARKER_STYLE_PROFILES = [
  {
    id: 'halo',
    label: 'City halo',
    caption: 'Clear selected-city rings',
    ringRadiusScale: 1,
    inactiveRingScale: 1,
    ringSpeedScale: 1,
    labelScale: 1
  },
  {
    id: 'pinpoint',
    label: 'Pinpoint',
    caption: 'Smaller labels, less overlap',
    ringRadiusScale: 0.72,
    inactiveRingScale: 0.62,
    ringSpeedScale: 0.86,
    labelScale: 0.88
  },
  {
    id: 'radar',
    label: 'Radar',
    caption: 'Bigger destination pulse',
    ringRadiusScale: 1.22,
    inactiveRingScale: 0.9,
    ringSpeedScale: 1.18,
    labelScale: 1
  }
];

export const DEFAULT_GLOBE_VISUAL = {
  themeId: 'atlas',
  routeStyleId: 'legible',
  markerStyleId: 'pinpoint',
  showWorldHighlights: true,
  worldHighlightMode: 'global',
  worldHighlightLimit: 999,
  worldHighlightCountryLimit: 5
};

export const getGlobeTheme = (themeId) =>
  GLOBE_THEME_PRESETS.find(theme => theme.id === themeId) || GLOBE_THEME_PRESETS[0];

export const getRouteStyle = (routeStyleId) =>
  ROUTE_STYLE_PROFILES.find(style => style.id === routeStyleId) || ROUTE_STYLE_PROFILES[0];

export const getMarkerStyle = (markerStyleId) =>
  MARKER_STYLE_PROFILES.find(style => style.id === markerStyleId) || MARKER_STYLE_PROFILES[0];
