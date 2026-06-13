import {
  WORLD_LIFE_LIST_DESTINATIONS,
  getBilingualDestinationLabel,
  getDestinationSignature,
  normalizeDestinationName,
  sortDestinationsByVisitDemand
} from '../config/worldHighlights.js';

export const buildVisitedDestinationIndex = (events) => {
  const names = new Set();
  const coords = new Set();

  events.forEach(event => {
    [
      { name: event.from_name, lat: event.from_lat, lng: event.from_lng },
      { name: event.to_name, lat: event.to_lat, lng: event.to_lng }
    ].forEach(place => {
      const normalizedName = normalizeDestinationName(place.name);
      if (normalizedName) names.add(normalizedName);
      const signature = getDestinationSignature(place.lat, place.lng);
      if (signature) coords.add(signature);
    });
  });

  return { names, coords };
};

export const getWorldHighlightMarkers = ({
  isFlightFocusMode,
  markerStyle,
  visualConfig,
  visitedDestinationIndex
}) => {
  if (visualConfig.showWorldHighlights === false) return [];

  const highlightMode = visualConfig.worldHighlightMode || 'global';
  const requestedLimit = Number(visualConfig.worldHighlightLimit);
  const highlightLimit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(requestedLimit, WORLD_LIFE_LIST_DESTINATIONS.length))
    : WORLD_LIFE_LIST_DESTINATIONS.length;
  const requestedCountryLimit = Number(visualConfig.worldHighlightCountryLimit);
  const countryLimit = Number.isFinite(requestedCountryLimit)
    ? Math.max(1, Math.min(requestedCountryLimit, 20))
    : 5;

  const filteredDestinations = WORLD_LIFE_LIST_DESTINATIONS
    .filter(destination => {
      const signature = getDestinationSignature(destination.lat, destination.lng);
      const destinationNames = [destination.name, ...(destination.aliases || [])]
        .map(normalizeDestinationName)
        .filter(Boolean);

      return !visitedDestinationIndex.coords.has(signature) &&
        !destinationNames.some(name => visitedDestinationIndex.names.has(name));
    })
    .sort(sortDestinationsByVisitDemand);

  const visibleDestinations = highlightMode === 'country-top'
    ? Array.from(
        filteredDestinations.reduce((groups, destination) => {
          const country = destination.region || 'Global';
          if (!groups.has(country)) groups.set(country, []);
          const group = groups.get(country);
          if (group.length < countryLimit) group.push(destination);
          return groups;
        }, new Map()).values()
      )
        .flat()
        .sort(sortDestinationsByVisitDemand)
    : filteredDestinations.slice(0, highlightLimit);

  return visibleDestinations
    .map(destination => {
      const label = getBilingualDestinationLabel(destination);
      return {
        ...destination,
        type: 'world-highlight',
        label,
        active: false,
        focusMode: isFlightFocusMode,
        visualKey: `world-highlight:${visualConfig.themeId}:${markerStyle.labelScale}:${isFlightFocusMode}:${destination.id}:${label}`
      };
    });
};
