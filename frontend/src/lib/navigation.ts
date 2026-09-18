import type { Screen } from '@/types';

export const EXPLORE_PATH = '/jelajah';

export function parseScreen(value: string | null): Screen {
  return value === 'report' || value === 'dashboard' || value === 'profile' ? value : 'map';
}

export function screenHref(screen: Screen, currentSearch = ''): string {
  const query = new URLSearchParams(currentSearch);
  if (screen === 'map') query.delete('screen');
  else query.set('screen', screen);
  return `${EXPLORE_PATH}${query.size ? `?${query}` : ''}`;
}
