const rawApiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? '';
const API_BASE = rawApiBase.replace(/\/+$/, '');

export function apiUrl(path: string): string {
  if (!path.startsWith('/')) return `${API_BASE}/${path}`;
  return `${API_BASE}${path}`;
}

