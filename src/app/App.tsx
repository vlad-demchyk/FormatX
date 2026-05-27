import { useEffect } from "react";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { StorageProvider } from "./providers/StorageProvider";
import { I18nProvider } from "./providers/I18nProvider";
import { ThemeProvider } from "./providers/ThemeProvider";
import { ShellLayout } from "../components/ShellLayout";
import { BootError } from "../components/BootError";
import { TrayHandler } from "../components/TrayHandler";
import { requestNotificationPermission } from "../lib/notifications";

export function App() {
  useEffect(() => {
    requestNotificationPermission();
  }, []);
  return (
    <ErrorBoundary fallback={<BootError />}>
      <StorageProvider>
        <ThemeProvider>
          <I18nProvider>
            <TrayHandler />
            <ShellLayout />
          </I18nProvider>
        </ThemeProvider>
      </StorageProvider>
    </ErrorBoundary>
  );
}
