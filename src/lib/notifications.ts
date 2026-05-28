/**
 * Сповіщення для FormatX (веб-версія).
 * Використовує Browser Notification API.
 * Поважає налаштування користувача (notificationsEnabled).
 */

import { getSettings } from "./db";

/**
 * Запитує дозвіл на сповіщення (для браузера).
 * Викликати один раз при старті додатку.
 */
export function requestNotificationPermission(): void {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    void Notification.requestPermission();
  }
}

/**
 * Показує сповіщення через Browser Notification API.
 * Якщо notificationsEnabled = false — нічого не показує.
 */
export async function showNotification(title: string, body: string): Promise<void> {
  try {
    const settings = await getSettings();
    if (!settings.notificationsEnabled) return;
  } catch {
    // If settings fail, still try to notify
  }

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

