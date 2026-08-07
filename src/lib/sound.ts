import { playNotificationChime } from "@/lib/notification-sound";

export function ensureAudioUnlocked(): void {
  playNotificationChime(0);
}

export function isAudioUnlocked(): boolean {
  return true;
}

/** Two-tone rising chime for new orders */
export function playNewOrderBeep(): void {
  playNotificationChime(0.25);
}
