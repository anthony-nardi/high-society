/*
 * Small synthesised sound set shared by all games, with a persisted mute.
 * Everything is generated with the Web Audio API, so there are no files to
 * load and nothing plays until the player has interacted with the page.
 */

export type SoundKind =
  "turn" | "card" | "chip" | "bid" | "pass" | "win" | "alarm" | "fanfare";

const MUTE_KEY = "sound:muted";
const MUTE_EVENT = "sound:mute-changed";

export function isMuted() {
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean) {
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    // Private mode or blocked storage: the toggle still works for this page.
  }
  window.dispatchEvent(new CustomEvent(MUTE_EVENT, { detail: muted }));
}

export function onMuteChange(listener: (muted: boolean) => void) {
  const handler = (event: Event) =>
    listener((event as CustomEvent<boolean>).detail);
  window.addEventListener(MUTE_EVENT, handler);
  return () => window.removeEventListener(MUTE_EVENT, handler);
}

let context: AudioContext | null = null;

function getContext() {
  if (context) return context;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  context = new Ctor();
  return context;
}

type Note = {
  /** Hz, or 0 for a noise burst. */
  frequency: number;
  /** Seconds after the sound starts. */
  at: number;
  /** Seconds. */
  length: number;
  type?: OscillatorType;
  volume?: number;
};

const SOUNDS: { [kind in SoundKind]: Note[] } = {
  // Two rising notes: it is your turn.
  turn: [
    { frequency: 523.25, at: 0, length: 0.18 },
    { frequency: 783.99, at: 0.14, length: 0.22 },
  ],
  // A soft flick for a card hitting the table.
  card: [{ frequency: 0, at: 0, length: 0.06, volume: 0.5 }],
  // A short click for a chip.
  chip: [
    { frequency: 1400, at: 0, length: 0.04, type: "square", volume: 0.35 },
  ],
  // A single confident tone for a bid.
  bid: [{ frequency: 659.25, at: 0, length: 0.12, type: "triangle" }],
  // A low, quiet tone for a pass.
  pass: [{ frequency: 261.63, at: 0, length: 0.1, type: "sine", volume: 0.5 }],
  // A quick arpeggio for winning an auction or taking a card.
  win: [
    { frequency: 523.25, at: 0, length: 0.1 },
    { frequency: 659.25, at: 0.08, length: 0.1 },
    { frequency: 783.99, at: 0.16, length: 0.18 },
  ],
  // Two-tone siren for police raids and misfortune.
  alarm: [
    { frequency: 440, at: 0, length: 0.16, type: "sawtooth", volume: 0.5 },
    { frequency: 349.23, at: 0.16, length: 0.2, type: "sawtooth", volume: 0.5 },
  ],
  // End of round or game.
  fanfare: [
    { frequency: 392, at: 0, length: 0.14 },
    { frequency: 523.25, at: 0.14, length: 0.14 },
    { frequency: 659.25, at: 0.28, length: 0.14 },
    { frequency: 783.99, at: 0.42, length: 0.4 },
  ],
};

const MASTER_VOLUME = 0.07;

/** Plays a sound unless muted. Never throws. */
export function playSound(kind: SoundKind) {
  if (isMuted()) return;
  try {
    const ctx = getContext();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;

    for (const note of SOUNDS[kind]) {
      const gain = ctx.createGain();
      const volume = MASTER_VOLUME * (note.volume ?? 1);
      gain.gain.setValueAtTime(0, now + note.at);
      gain.gain.linearRampToValueAtTime(volume, now + note.at + 0.01);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + note.at + note.length,
      );
      gain.connect(ctx.destination);

      if (note.frequency === 0) {
        // Noise burst for the card flick.
        const buffer = ctx.createBuffer(
          1,
          Math.ceil(ctx.sampleRate * note.length),
          ctx.sampleRate,
        );
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++)
          data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 1800;
        source.connect(filter);
        filter.connect(gain);
        source.start(now + note.at);
        source.stop(now + note.at + note.length);
      } else {
        const oscillator = ctx.createOscillator();
        oscillator.type = note.type ?? "sine";
        oscillator.frequency.value = note.frequency;
        oscillator.connect(gain);
        oscillator.start(now + note.at);
        oscillator.stop(now + note.at + note.length + 0.02);
      }
    }
  } catch (e) {
    console.log(e);
  }
}

/** Maps a server notification title to a sound, or null for silence. */
export function soundForEvent(title: string): SoundKind | null {
  const text = title.toLowerCase();
  if (/game over|round \d is over|final/.test(text)) return "fanfare";
  if (
    /police raid|receives -5|receives 1\/2|receives -\b|misfortune/.test(text)
  )
    return "alarm";
  if (/busted/.test(text)) return "alarm";
  if (/captures|isolates/.test(text)) return "win";
  if (/places a \w+ marble/.test(text)) return "chip";
  if (/removes ring/.test(text)) return "card";
  if (/won|has taken|used a thief|steals|banks|wins/.test(text)) return "win";
  if (/drew a \d/.test(text)) return "chip";
  if (/placed a chip/.test(text)) return "chip";
  if (/bid|called an auction/.test(text)) return "bid";
  if (/passed|passes/.test(text)) return "pass";
  if (/revealed|was revealed/.test(text)) return "card";
  return null;
}
