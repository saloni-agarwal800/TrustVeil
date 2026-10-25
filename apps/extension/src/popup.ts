import type { Lang } from '@trustveil/shared';
import { getSettings, getStats, resetStats, saveSettings } from './storage';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

async function load(): Promise<void> {
  const [settings, stats] = await Promise.all([getSettings(), getStats()]);
  $('scanned').textContent = String(stats.scanned);
  $('warned').textContent = String(stats.warned);
  $<HTMLSelectElement>('lang').value = settings.lang;
  $<HTMLInputElement>('showSafe').checked = settings.showSafe;
  $<HTMLInputElement>('backend').value = settings.backendUrl;
}

$('lang').addEventListener('change', (e) => {
  void saveSettings({ lang: (e.target as HTMLSelectElement).value as Lang });
});
$('showSafe').addEventListener('change', (e) => {
  void saveSettings({ showSafe: (e.target as HTMLInputElement).checked });
});
$('backend').addEventListener('change', (e) => {
  void saveSettings({ backendUrl: (e.target as HTMLInputElement).value.trim() });
});
$('reset').addEventListener('click', async () => {
  await resetStats();
  await load();
});

void load();
