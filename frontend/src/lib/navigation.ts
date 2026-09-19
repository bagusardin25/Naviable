import type { Screen } from '@/types';

export const EXPLORE_PATH = '/jelajah';

export function parseScreen(value: string | null): Screen {
  return value === 'report' || value === 'add' || value === 'review' || value === 'dashboard' || value === 'profile' ? value : 'map';
}

export function placeHref(id: string, screen: Screen = 'map'): string {
  const query = new URLSearchParams({ place: id });
  return screenHref(screen, query.toString());
}

// Only our known explore route is an allowed login destination.
export function safeReturnTo(value: string | null): string {
  if (!value || !/^\/jelajah(?:\?|$)/.test(value) || /[\\\r\n]/.test(value)) return EXPLORE_PATH;
  const url = new URL(value, 'https://naviable.invalid');
  const query = new URLSearchParams();
  const place = url.searchParams.get('place');
  if (place && /^[a-zA-Z0-9_-]{1,120}$/.test(place)) query.set('place', place);
  return screenHref(parseScreen(url.searchParams.get('screen')), query.toString());
}
export function loginHref(destination: string): string {
  return `/login?next=${encodeURIComponent(safeReturnTo(destination))}`;
}
export function contributionLabel(screen: Screen): string {
  return screen === 'add' ? 'menambahkan lokasi baru' : screen === 'report' ? 'melaporkan perubahan kondisi' : screen === 'review' ? 'menulis review pengalaman' : 'melihat kontribusi Anda';
}

export function screenHref(screen: Screen, currentSearch = ''): string {
  const query = new URLSearchParams(currentSearch);
  if (screen === 'map') query.delete('screen');
  else query.set('screen', screen);
  return `${EXPLORE_PATH}${query.size ? `?${query}` : ''}`;
}
