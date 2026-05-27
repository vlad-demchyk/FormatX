// Desktop-only: global hotkeys handled in Tauri with global-shortcut plugin.
// Web has no hotkey functionality.
export function useHotkey(_props: { onTrigger: () => void }): void {
  // Noop for web
}

