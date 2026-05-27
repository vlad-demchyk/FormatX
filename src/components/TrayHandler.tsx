import { getSettings } from "../lib/storage";
import { useTrayClose } from "../app/hooks/useTrayClose";
import { useEffect, useState } from "react";

/**
 * Renders nothing — reads closeToTray setting and activates tray behaviour.
 */
export function TrayHandler() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    void getSettings().then((s) => setEnabled(s.closeToTray));
  }, []);

  useTrayClose(enabled);
  return null;
}
