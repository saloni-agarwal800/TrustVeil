import type { Lang } from '@trustveil/shared';

export interface Settings {
  lang: Lang;
  showSafe: boolean;
  backendUrl: string;
}

export const DEFAULT_SETTINGS: Settings = {
  lang: 'en',
  showSafe: true,
  backendUrl: 'http://localhost:8787'
};

export interface Stats {
  scanned: number;
  warned: number;
}

export async function getSettings(): Promise<Settings> {
  const { settings } = await chrome.storage.local.get('settings');
  return { ...DEFAULT_SETTINGS, ...(settings ?? {}) };
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const current = await getSettings();
  await chrome.storage.local.set({ settings: { ...current, ...patch } });
}

export async function getStats(): Promise<Stats> {
  const { stats } = await chrome.storage.local.get('stats');
  return { scanned: 0, warned: 0, ...(stats ?? {}) };
}

export async function bumpStats(scanned: number, warned: number): Promise<void> {
  const s = await getStats();
  await chrome.storage.local.set({ stats: { scanned: s.scanned + scanned, warned: s.warned + warned } });
}

export async function resetStats(): Promise<void> {
  await chrome.storage.local.set({ stats: { scanned: 0, warned: 0 } });
}
