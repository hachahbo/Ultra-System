// WebAudio "new order" chime — no binary asset. Autoplay policies require a
// user gesture before an AudioContext can produce sound, so this is only
// ever created/resumed from a click handler (the sound toggle in the
// kitchen view), never on mount.
let ctx: AudioContext | null = null;

export function ensureAudioUnlocked(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
  }
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
  return ctx;
}

export function isAudioUnlocked(): boolean {
  return ctx !== null && ctx.state === "running";
}

/** Two-tone rising chime, ~350ms. No-op if the context was never unlocked. */
export function playNewOrderBeep() {
  if (!ctx || ctx.state !== "running") return;

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  gain.connect(ctx.destination);

  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.linearRampToValueAtTime(1320, now + 0.18);
  osc.connect(gain);
  osc.start(now);
  osc.stop(now + 0.36);
}
