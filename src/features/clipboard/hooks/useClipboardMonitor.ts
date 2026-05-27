// Desktop-only: clipboard monitoring is handled in the Tauri app.
// Web has no clipboard history monitoring.
export function useClipboardMonitor(): { entries: never[]; latestEntry: null; refresh: () => void } {
  return { entries: [], latestEntry: null, refresh: () => {} };
}
