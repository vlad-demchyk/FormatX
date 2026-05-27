import { useCallback, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * Hook: закриття вікна в трей (приховування), а не повне завершення.
 * На десктопі Tauri перехоплює close-requested і ховає вікно.
 * У веб-режимі — нічого не робить.
 * Якщо enabled=false — не перехоплює close.
 */
export function useTrayClose(enabled: boolean) {
  const hideToTray = useCallback(async () => {
    if (!enabled) return;
    try {
      const win = getCurrentWindow();
      await win.hide();
    } catch {
      // Not in Tauri — do nothing
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    let unlisten: (() => void) | undefined;

    async function setup() {
      try {
        const win = getCurrentWindow();
        unlisten = await win.onCloseRequested(async (event) => {
          event.preventDefault();
          await win.hide();
        });
      } catch {
        // Not in Tauri — ignore
      }
    }

    void setup();

    return () => {
      unlisten?.();
    };
  }, [enabled]);

  return { hideToTray };
}
