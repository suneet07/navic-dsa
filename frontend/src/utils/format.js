export const distance = meters => (meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`);

export const duration = seconds => {
  if (seconds === 0) return '0 min';
  const minutes = Math.max(1, Math.round(seconds / 60));
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} hr ${minutes % 60} min`;
};

export const milliseconds = ms => (ms < 1 ? '<1 ms' : ms < 1000 ? `${ms.toFixed(1)} ms` : `${(ms / 1000).toFixed(2)} s`);

export const count = n => Number(n || 0).toLocaleString();
