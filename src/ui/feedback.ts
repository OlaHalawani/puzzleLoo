import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { store } from '../game/storage';

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (!store.settings.sound) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, delay = 0, type: OscillatorType = 'sine', vol = 0.08): void {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

// C major pentatonic, so consecutive flow sounds always fit together.
const NOTES = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.5, 1567.98, 1760.0, 2093.0, 2349.3];

function haptic(kind: 'light' | 'medium' | 'success'): void {
  if (!store.settings.haptics) return;
  if (Capacitor.isNativePlatform()) {
    if (kind === 'success') void Haptics.notification({ type: NotificationType.Success });
    else void Haptics.impact({ style: kind === 'light' ? ImpactStyle.Light : ImpactStyle.Medium });
  } else if ('vibrate' in navigator) {
    navigator.vibrate(kind === 'success' ? [20, 40, 30] : kind === 'light' ? 8 : 15);
  }
}

export const fx = {
  tick(): void {
    haptic('light');
  },
  connect(color: number): void {
    tone(NOTES[color % NOTES.length], 0.25, 0, 'triangle');
    haptic('medium');
  },
  tap(): void {
    tone(660, 0.06, 0, 'sine', 0.04);
  },
  hint(): void {
    tone(880, 0.15);
    tone(1320, 0.2, 0.08);
  },
  win(): void {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.35, i * 0.09, 'triangle', 0.09));
    haptic('success');
  },
  /** Browsers only allow audio after a user gesture; call from the first tap. */
  unlock(): void {
    audio();
  },
};
