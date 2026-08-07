"use client";

// Synthesized via the Web Audio API — zero asset weight, nothing to license.
// Browsers require a user gesture before an AudioContext can produce sound.
// We register global window interaction listeners to auto-unlock AudioContext on first tap/click.
let ctx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!ctx) {
    ctx = new AudioContextClass();
  }
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
  return ctx;
}

// Auto-unlock AudioContext on first user gesture anywhere on the page
if (typeof window !== "undefined") {
  const unlock = () => {
    const audioCtx = getAudioContext();
    if (audioCtx && audioCtx.state === "suspended") {
      void audioCtx.resume();
    }
    const events = ["click", "touchstart", "pointerdown", "keydown"];
    events.forEach((evt) => window.removeEventListener(evt, unlock));
  };
  const events = ["click", "touchstart", "pointerdown", "keydown"];
  events.forEach((evt) => window.addEventListener(evt, unlock, { passive: true }));
}

/**
 * Plays a pleasant 2-note ascending notification chime.
 */
export function playNotificationChime(volume = 0.25) {
  try {
    const audioCtx = getAudioContext();
    if (!audioCtx) return;

    if (audioCtx.state === "suspended") {
      void audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const notes = [
      { freq: 880, start: 0, duration: 0.15 },
      { freq: 1318.51, start: 0.12, duration: 0.28 },
    ];

    for (const note of notes) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(note.freq, now + note.start);

      // Smooth gain envelope to prevent clicking artifacts
      gain.gain.setValueAtTime(0, now + note.start);
      gain.gain.linearRampToValueAtTime(volume, now + note.start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now + note.start);
      osc.stop(now + note.start + note.duration + 0.03);
    }
  } catch (err) {
    console.error("Failed to play notification chime:", err);
  }
}

const SOUND_PREF_KEY = "dashboard-sound-enabled";

export function isNotificationSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(SOUND_PREF_KEY) !== "0";
}

export function setNotificationSoundEnabled(enabled: boolean) {
  window.localStorage.setItem(SOUND_PREF_KEY, enabled ? "1" : "0");
}
