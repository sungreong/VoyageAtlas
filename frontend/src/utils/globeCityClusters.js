const normalizePlaceKey = (name) => String(name || '').trim().toLowerCase();

const getCoordinateKey = (lat, lng) => {
  const numericLat = Number(lat);
  const numericLng = Number(lng);

  if (!Number.isFinite(numericLat) || !Number.isFinite(numericLng)) return '';
  return `${numericLat.toFixed(4)},${numericLng.toFixed(4)}`;
};

const getClusterKey = (name, lat, lng) => {
  const nameKey = normalizePlaceKey(name);
  if (nameKey) return `name:${nameKey}`;

  const coordKey = getCoordinateKey(lat, lng);
  return coordKey ? `coord:${coordKey}` : '';
};

export const buildVisitedCityClusters = (events) => {
  const clusters = new Map();

  const addEndpoint = (event, role, name, lat, lng) => {
    const numericLat = Number(lat);
    const numericLng = Number(lng);
    if (!Number.isFinite(numericLat) || !Number.isFinite(numericLng)) return;

    const key = getClusterKey(name, numericLat, numericLng);
    if (!key) return;

    if (!clusters.has(key)) {
      clusters.set(key, {
        name: name || 'Unknown',
        lat: numericLat,
        lng: numericLng,
        arrivals: 0,
        departures: 0,
        eventsById: new Map()
      });
    }

    const cluster = clusters.get(key);
    if (role === 'arrival') cluster.arrivals += 1;
    if (role === 'departure') cluster.departures += 1;
    cluster.eventsById.set(event.id ?? `${role}-${cluster.eventsById.size}`, event);
  };

  (Array.isArray(events) ? events : []).forEach((event) => {
    addEndpoint(event, 'departure', event.from_name, event.from_lat, event.from_lng);
    addEndpoint(event, 'arrival', event.to_name, event.to_lat, event.to_lng);
  });

  return Array.from(clusters.values()).map((cluster) => {
    const endpointCount = Math.max(cluster.arrivals, cluster.departures);

    return {
      name: cluster.name,
      lat: cluster.lat,
      lng: cluster.lng,
      arrivals: cluster.arrivals,
      departures: cluster.departures,
      count: endpointCount || cluster.eventsById.size,
      visitCount: cluster.arrivals + cluster.departures,
      events: Array.from(cluster.eventsById.values())
    };
  });
};
