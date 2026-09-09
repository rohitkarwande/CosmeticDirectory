export const getApiBaseUrl = (): string => {
  const customBase = import.meta.env.VITE_API_BASE_URL;
  if (customBase) return customBase;
  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  return isLocal ? 'http://localhost:5000' : '';
};
