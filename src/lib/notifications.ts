/**
 * Сповіщення для FormatX.
 * На десктопі Tauri — нативне сповіщення ОС (Windows Toast).
 * У браузері — через Browser Notification API.
 * Поважає налаштування користувача (notificationsEnabled).
 */

import { getSettings } from "./storage";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * Запитує дозвіл на сповіщення (для браузера).
 * Викликати один раз при старті додатку.
 */
export function requestNotificationPermission(): void {
  if (isTauri()) return;
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    void Notification.requestPermission();
  }
}

/**
 * Показує нативне сповіщення ОС (Windows Toast / Browser Notification).
 * Якщо notificationsEnabled = false — нічого не показує.
 */
export async function showNotification(title: string, body: string): Promise<void> {
  try {
    const settings = await getSettings();
    if (!settings.notificationsEnabled) return;
  } catch {
    // If settings fail, still try to notify
  }

  if (isTauri()) {
    // Tauri native notification (Windows Toast)
    try {
      const { sendNotification } = await import("@tauri-apps/plugin-notification");
      sendNotification({ title, body });
    } catch {
      // Tauri plugin not available — fall through to browser API
    }
    return;
  }

  // Browser Notification API
  if (!("Notification" in window)) return;

  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: "/favicon.svg" });
  } else if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      new Notification(title, { body, icon: "/favicon.svg" });
    }
  }
}

