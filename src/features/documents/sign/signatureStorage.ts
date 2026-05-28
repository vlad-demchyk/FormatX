import { SIGNATURE_KEY } from "./types";

export function loadSavedSignature(): string | null {
  try {
    return localStorage.getItem(SIGNATURE_KEY);
  } catch {
    return null;
  }
}

export function saveSignature(dataUrl: string): void {
  try {
    localStorage.setItem(SIGNATURE_KEY, dataUrl);
  } catch {
    /* quota exceeded */
  }
}

export function deleteSavedSignature(): void {
  try {
    localStorage.removeItem(SIGNATURE_KEY);
  } catch {
    /* ignore */
  }
}
