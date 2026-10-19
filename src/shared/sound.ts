/*
 * Small synthesised sound set shared by all games, with a persisted mute.
 * Everything is generated with the Web Audio API, so there are no files to
 * load and nothing plays until the player has interacted with the page.
 */

export type SoundKind =
  | "turn"
  | "card"
  | "chip"
  | "bid"
  | "pass"
  | "win"
  | "alarm"
  | "fanfare"
  | "stonePlace"
  | "stoneLift"
  | "stoneSlide"
  | "stoneJump"
  | "stoneFlip"
  | "stoneClatter"
  | "stoneScore"
  | "train"
  | "merger"
  | "flush"
  | "clash"
  | "drum"
  | "wind"
  | "chime"
  | "bell"
  | "flourish"
  | "rustle"
  | "steel"
  | "surrender";

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
  /** For tones: slide the pitch to this many Hz over the note (a knock). */
  glideTo?: number;
  /** For noise: centre of the band-pass filter (default 1800) and its Q. */
  noiseFrequency?: number;
  noiseQ?: number;
};

// ----------------------------------------------------------------- stones
// A stone on a wooden board: a short, dull knock (a low tone that drops in
// pitch almost at once) with a bright, very brief grain of noise on top.
const knock = (at: number, pitch = 190, volume = 1): Note[] => [
  {
    frequency: pitch * 2.2,
    at,
    length: 0.09,
    type: "sine",
    volume: 1.3 * volume,
    glideTo: pitch,
  },
  {
    frequency: 0,
    at,
    length: 0.025,
    volume: 0.6 * volume,
    noiseFrequency: 3200,
    noiseQ: 1.2,
  },
];
// Picking a stone up: a faint, higher-pitched grain as it leaves the wood.
const lift = (at: number, volume = 1): Note[] => [
  {
    frequency: 0,
    at,
    length: 0.07,
    volume: 0.45 * volume,
    noiseFrequency: 4200,
    noiseQ: 2,
  },
  {
    frequency: 900,
    at,
    length: 0.04,
    type: "triangle",
    volume: 0.25 * volume,
    glideTo: 1400,
  },
];
// A stone dragged across the board.
const slide = (at: number, length: number): Note[] => [
  { frequency: 0, at, length, volume: 0.35, noiseFrequency: 1100, noiseQ: 0.7 },
];

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
  // A stone set down.
  stonePlace: knock(0),
  // A stone picked up.
  stoneLift: lift(0),
  // Lifted, dragged along the board, set down.
  stoneSlide: [...lift(0, 0.7), ...slide(0.05, 0.22), ...knock(0.3, 180)],
  // Lifted, a hop, and a clack as it lands on the far side.
  stoneJump: [...lift(0), ...knock(0.26, 230, 1.1), ...knock(0.31, 170, 0.6)],
  // A slide that turns markers over as it goes: little clicks along the way.
  stoneFlip: [
    ...lift(0, 0.7),
    ...slide(0.05, 0.28),
    { frequency: 1800, at: 0.12, length: 0.03, type: "square", volume: 0.2 },
    { frequency: 1600, at: 0.2, length: 0.03, type: "square", volume: 0.2 },
    { frequency: 1900, at: 0.28, length: 0.03, type: "square", volume: 0.2 },
    ...knock(0.36, 180),
  ],
  // Several stones gathered up one after another.
  stoneClatter: [
    ...lift(0),
    ...knock(0.04, 260, 0.5),
    ...lift(0.11, 0.8),
    ...knock(0.15, 240, 0.5),
    ...lift(0.21, 0.9),
    ...knock(0.26, 220, 0.5),
    ...lift(0.32, 0.7),
    ...knock(0.36, 250, 0.5),
    ...lift(0.42, 0.8),
  ],
  // A hotel chain swallowed: a low fall, a beat, then a bright rising chord.
  merger: [
    {
      frequency: 330,
      at: 0,
      length: 0.35,
      type: "sawtooth",
      volume: 0.45,
      glideTo: 165,
    },
    {
      frequency: 0,
      at: 0.3,
      length: 0.08,
      volume: 0.5,
      noiseFrequency: 900,
      noiseQ: 0.8,
    },
    { frequency: 392, at: 0.5, length: 0.14, type: "triangle", volume: 0.6 },
    {
      frequency: 493.88,
      at: 0.62,
      length: 0.14,
      type: "triangle",
      volume: 0.6,
    },
    {
      frequency: 587.33,
      at: 0.74,
      length: 0.16,
      type: "triangle",
      volume: 0.6,
    },
    {
      frequency: 783.99,
      at: 0.88,
      length: 0.45,
      type: "triangle",
      volume: 0.7,
    },
    { frequency: 987.77, at: 0.88, length: 0.45, type: "sine", volume: 0.4 },
  ],
  // A passenger carried: a few chugs, then a steam whistle chord that bends up.
  // Water down the drain: a falling gurgle.
  flush: [
    {
      frequency: 520,
      at: 0,
      length: 0.32,
      type: "sine",
      volume: 0.4,
      glideTo: 90,
    },
    {
      frequency: 0,
      at: 0.05,
      length: 0.22,
      volume: 0.3,
      noiseFrequency: 900,
      noiseQ: 0.6,
    },
    {
      frequency: 300,
      at: 0.2,
      length: 0.18,
      type: "sine",
      volume: 0.3,
      glideTo: 60,
    },
  ],
  // Swords meet: two metallic bursts and a ringing edge.
  clash: [
    {
      frequency: 0,
      at: 0,
      length: 0.07,
      volume: 0.55,
      noiseFrequency: 3400,
      noiseQ: 2.5,
    },
    {
      frequency: 1760,
      at: 0.02,
      length: 0.28,
      type: "triangle",
      volume: 0.22,
      glideTo: 1320,
    },
    {
      frequency: 0,
      at: 0.17,
      length: 0.09,
      volume: 0.45,
      noiseFrequency: 2600,
      noiseQ: 2.5,
    },
    {
      frequency: 220,
      at: 0.17,
      length: 0.3,
      type: "sawtooth",
      volume: 0.2,
      glideTo: 110,
    },
  ],
  // A drum roll: five quick taps.
  drum: [
    {
      frequency: 0,
      at: 0,
      length: 0.06,
      volume: 0.5,
      noiseFrequency: 180,
      noiseQ: 1.2,
    },
    {
      frequency: 0,
      at: 0.09,
      length: 0.06,
      volume: 0.5,
      noiseFrequency: 180,
      noiseQ: 1.2,
    },
    {
      frequency: 0,
      at: 0.18,
      length: 0.06,
      volume: 0.55,
      noiseFrequency: 180,
      noiseQ: 1.2,
    },
    {
      frequency: 0,
      at: 0.27,
      length: 0.06,
      volume: 0.6,
      noiseFrequency: 180,
      noiseQ: 1.2,
    },
    {
      frequency: 0,
      at: 0.36,
      length: 0.14,
      volume: 0.7,
      noiseFrequency: 140,
      noiseQ: 1,
    },
  ],
  // Winter: a gust that falls away.
  wind: [
    {
      frequency: 0,
      at: 0,
      length: 0.7,
      volume: 0.35,
      noiseFrequency: 600,
      noiseQ: 0.3,
    },
    {
      frequency: 330,
      at: 0.05,
      length: 0.6,
      type: "sine",
      volume: 0.15,
      glideTo: 180,
    },
  ],
  // Spring: three rising chimes.
  chime: [
    { frequency: 1046.5, at: 0, length: 0.25, type: "sine" },
    { frequency: 1318.5, at: 0.12, length: 0.3, type: "sine" },
    { frequency: 1568, at: 0.24, length: 0.45, type: "sine", volume: 0.6 },
  ],
  // The Bishop: a low church bell.
  bell: [
    { frequency: 196, at: 0, length: 0.9, type: "triangle", volume: 0.5 },
    { frequency: 392, at: 0.02, length: 0.6, type: "sine", volume: 0.25 },
    { frequency: 587.3, at: 0.04, length: 0.4, type: "sine", volume: 0.12 },
  ],
  // The Heroine: a short trumpet flourish.
  flourish: [
    { frequency: 659.25, at: 0, length: 0.1, type: "square", volume: 0.3 },
    { frequency: 880, at: 0.09, length: 0.1, type: "square", volume: 0.3 },
    { frequency: 1174.7, at: 0.18, length: 0.32, type: "square", volume: 0.35 },
  ],
  // The Scarecrow: straw rustling.
  rustle: [
    {
      frequency: 0,
      at: 0,
      length: 0.12,
      volume: 0.35,
      noiseFrequency: 2400,
      noiseQ: 0.8,
    },
    {
      frequency: 0,
      at: 0.14,
      length: 0.1,
      volume: 0.25,
      noiseFrequency: 3000,
      noiseQ: 0.8,
    },
  ],
  // The call to arms: blades ring twice over a thud.
  steel: [
    {
      frequency: 90,
      at: 0,
      length: 0.3,
      type: "sine",
      volume: 0.5,
      glideTo: 40,
    },
    {
      frequency: 0,
      at: 0,
      length: 0.05,
      volume: 0.6,
      noiseFrequency: 4200,
      noiseQ: 6,
    },
    {
      frequency: 2960,
      at: 0.01,
      length: 0.5,
      type: "triangle",
      volume: 0.25,
      glideTo: 2700,
    },
    {
      frequency: 0,
      at: 0.14,
      length: 0.05,
      volume: 0.5,
      noiseFrequency: 3600,
      noiseQ: 6,
    },
    {
      frequency: 2200,
      at: 0.15,
      length: 0.5,
      type: "triangle",
      volume: 0.2,
      glideTo: 2000,
    },
    {
      frequency: 0,
      at: 0.3,
      length: 0.04,
      volume: 0.4,
      noiseFrequency: 4800,
      noiseQ: 6,
    },
    {
      frequency: 3300,
      at: 0.31,
      length: 0.6,
      type: "triangle",
      volume: 0.18,
      glideTo: 3000,
    },
  ],
  // A surrender: a horn falling away, then the drum.
  surrender: [
    {
      frequency: 440,
      at: 0,
      length: 0.5,
      type: "sawtooth",
      volume: 0.35,
      glideTo: 220,
    },
    {
      frequency: 330,
      at: 0.45,
      length: 0.7,
      type: "sawtooth",
      volume: 0.3,
      glideTo: 110,
    },
    {
      frequency: 0,
      at: 1.05,
      length: 0.25,
      volume: 0.7,
      noiseFrequency: 110,
      noiseQ: 1,
    },
  ],
  train: [
    {
      frequency: 0,
      at: 0,
      length: 0.06,
      volume: 0.5,
      noiseFrequency: 500,
      noiseQ: 0.8,
    },
    {
      frequency: 0,
      at: 0.12,
      length: 0.06,
      volume: 0.5,
      noiseFrequency: 500,
      noiseQ: 0.8,
    },
    {
      frequency: 0,
      at: 0.22,
      length: 0.06,
      volume: 0.55,
      noiseFrequency: 550,
      noiseQ: 0.8,
    },
    {
      frequency: 0,
      at: 0.3,
      length: 0.06,
      volume: 0.55,
      noiseFrequency: 550,
      noiseQ: 0.8,
    },
    {
      frequency: 392,
      at: 0.36,
      length: 0.55,
      type: "triangle",
      volume: 0.55,
      glideTo: 415,
    },
    {
      frequency: 493.88,
      at: 0.36,
      length: 0.55,
      type: "triangle",
      volume: 0.5,
      glideTo: 523.25,
    },
    {
      frequency: 622.25,
      at: 0.36,
      length: 0.55,
      type: "sine",
      volume: 0.45,
      glideTo: 659.25,
    },
    {
      frequency: 0,
      at: 0.36,
      length: 0.5,
      volume: 0.25,
      noiseFrequency: 2400,
      noiseQ: 0.5,
    },
  ],
  // A ring lifted off for keeps, with a small chord behind it.
  stoneScore: [
    ...lift(0, 1.2),
    { frequency: 523.25, at: 0.08, length: 0.1 },
    { frequency: 659.25, at: 0.16, length: 0.1 },
    { frequency: 783.99, at: 0.24, length: 0.22 },
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
        // A decaying noise burst, band-passed to give it a material.
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
        filter.frequency.value = note.noiseFrequency ?? 1800;
        if (note.noiseQ !== undefined) filter.Q.value = note.noiseQ;
        source.connect(filter);
        filter.connect(gain);
        source.start(now + note.at);
        source.stop(now + note.at + note.length);
      } else {
        const oscillator = ctx.createOscillator();
        oscillator.type = note.type ?? "sine";
        oscillator.frequency.setValueAtTime(note.frequency, now + note.at);
        if (note.glideTo !== undefined) {
          oscillator.frequency.exponentialRampToValueAtTime(
            note.glideTo,
            now + note.at + note.length,
          );
        }
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
  if (/game over|round \d is over|final| wins!$|game is a draw/.test(text))
    return "fanfare";
  if (
    /police raid|receives -5|receives 1\/2|receives -\b|misfortune/.test(text)
  )
    return "alarm";
  if (/busted/.test(text)) return "alarm";
  // ZÈRTZ and YINSH: stones on wood.
  if (/jumps .* and captures/.test(text)) return "stoneJump";
  if (/isolates|removes a row|lost contact|takes a row/.test(text))
    return "stoneClatter";
  if (/removes a ring|stack of five is complete: /.test(text))
    return "stoneScore";
  if (/moves a stack|pushes a \w+ piece/.test(text)) return "stoneSlide";
  if (/claims \w+\.$/.test(text)) return "bid";
  if (/removes ring/.test(text)) return "stoneLift";
  if (/moves a ring .* and flips/.test(text)) return "stoneFlip";
  if (/moves a ring/.test(text)) return "stoneSlide";
  if (/places a [\w-]+ (ring|marble|piece|master)/.test(text))
    return "stonePlace";
  if (/sends the students/.test(text)) return "stoneSlide";
  if (/ and flushes /.test(text)) return "flush";
  if (/^\S+ plays a \d+/.test(text)) return "card";
  if (/pushes a \d+ through/.test(text)) return "win";
  if (/wins the (war|revolt)/.test(text)) return "win";
  if (/war breaks out|revolt breaks out/.test(text)) return "clash";
  if (/plays a catastrophe/.test(text)) return "alarm";
  if (/builds a \w+ and \w+ monument/.test(text)) return "fanfare";
  if (/takes the treasure/.test(text)) return "chip";
  if (/places a (temple|farm|market|settlement)/.test(text))
    return "stonePlace";
  if (/(positions|moves) the (king|priest|farmer|trader)/.test(text))
    return "stoneSlide";
  if (/withdraws the (king|priest|farmer|trader)/.test(text))
    return "stoneLift";
  if (/commits (\d+ |nothing)/.test(text)) return "bid";
  if (/replaces \d+ tiles?\./.test(text)) return "card";
  if (/turns over (cloth|spice|grain|dye|fur|gold) \d+/.test(text))
    return "card";
  if (/offers the lot/.test(text)) return "chip";
  if (/^nobody bids/.test(text)) return "pass";
  if (/fills the hold for nothing/.test(text)) return "card";
  if (/^day \d is scored/.test(text)) return "fanfare";
  if (/takes over/.test(text)) return "merger";
  if (/calls the end/.test(text)) return "fanfare";
  if (/calls the armies/.test(text)) return "steel";
  if (/plays drummer/.test(text)) return "drum";
  if (/plays winter/.test(text)) return "wind";
  if (/plays spring/.test(text)) return "chime";
  if (/plays a bishop/.test(text)) return "bell";
  if (/plays heroine/.test(text)) return "flourish";
  if (/plays a scarecrow/.test(text)) return "rustle";
  if (/plays surrender/.test(text)) return "surrender";
  if (/^\S+ plays (mercenary|courtesan)/.test(text)) return "card";
  if (/ wins \w+ with \d/.test(text)) return "win";
  if (/carries a passenger/.test(text)) return "train";
  if (/lays \w+ track/.test(text)) return "stonePlace";
  if (/takes a \w+ share/.test(text)) return "card";
  if (/has nowhere to build|has no passenger to carry/.test(text))
    return "pass";
  if (/^round \d begins/.test(text)) return "turn";
  if (/is razed/.test(text)) return "alarm";
  if (/^pick \d+ placed/.test(text)) return "card";
  if (/^round 2 begins: ten new cards/.test(text)) return "turn";
  if (/pegs [a-x]\d+ and links/.test(text)) return "stoneSlide";
  if (/pegs [a-x]\d+/.test(text)) return "stonePlace";
  if (/swaps sides/.test(text)) return "alarm";
  if (/removes the link/.test(text)) return "stoneLift";
  if (/founds (a village|\d+ villages)/.test(text)) return "win";
  if (/moves \d+ huts? into/.test(text)) return "stoneSlide";
  if (/^\S+ plays \d+[a-i]/.test(text)) return "chip";
  if (/founds \w+ with|bonuses:/.test(text)) return "win";
  if (/ buys \d/.test(text)) return "card";
  if (/recruits/.test(text)) return "chip";
  if (/^sold:|cheques .* are on offer|has chosen/.test(text)) return "card";
  if (/won|has taken|used a thief|steals|banks|wins/.test(text)) return "win";
  if (/drew a \d/.test(text)) return "chip";
  if (/placed a chip/.test(text)) return "chip";
  if (/bid|called an auction/.test(text)) return "bid";
  if (/passed|passes/.test(text)) return "pass";
  if (/revealed|was revealed/.test(text)) return "card";
  return null;
}
