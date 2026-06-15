export const formatRouteDate = (dateValue) => {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
};

export const calculateSunPosition = (date) => {
  const now = date || new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const day = Math.floor(diff / oneDay);
  const lat = 23.44 * Math.sin(2 * Math.PI * (day - 81) / 365);
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
  const lng = (12 - utcHours) * 15;

  return { lat, lng };
};
