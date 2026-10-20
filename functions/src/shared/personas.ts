/*
 * The bots' personalities. A persona is a name, an avatar and a temper;
 * the temper tunes the judgement of the games that have dials for it
 * (Medici's bidding, PUSH's appetite for one more card), and is only a
 * name elsewhere. This file must stay free of runtime imports: the client
 * bundles it directly.
 */

export type Temper = "CAUTIOUS" | "STEADY" | "RECKLESS";

export type Persona = {
  id: string;
  name: string;
  avatar: string;
  temper: Temper;
  blurb: string;
};

export const PERSONAS: Persona[] = [
  {
    id: "carla",
    name: "Cautious Carla",
    avatar: "🐢",
    temper: "CAUTIOUS",
    blurb: "Never overpays, never pushes her luck, rarely loses her shirt.",
  },
  {
    id: "sam",
    name: "Steady Sam",
    avatar: "🦉",
    temper: "STEADY",
    blurb: "Plays the odds and nothing but the odds.",
  },
  {
    id: "rita",
    name: "Reckless Rita",
    avatar: "🦊",
    temper: "RECKLESS",
    blurb: "One more card, every time. Pays what it takes.",
  },
  {
    id: "tom",
    name: "Timid Tom",
    avatar: "🐭",
    temper: "CAUTIOUS",
    blurb: "Banks early, bids low, sleeps well.",
  },
  {
    id: "bea",
    name: "Bold Bea",
    avatar: "🦁",
    temper: "RECKLESS",
    blurb: "Fortune favours her, she says. Sometimes it does.",
  },
  {
    id: "eddie",
    name: "Even Eddie",
    avatar: "🐼",
    temper: "STEADY",
    blurb: "Unflappable. Takes the sensible line and sticks to it.",
  },
];

export const TEMPER_LABEL: { [t in Temper]: string } = {
  CAUTIOUS: "cautious",
  STEADY: "steady",
  RECKLESS: "reckless",
};

export const personaById = (id: string | undefined) =>
  PERSONAS.find((p) => p.id === id);

/** The temper behind a player, STEADY for anyone without a persona. */
export function temperOf(
  players: { email: string; persona?: string }[],
  email: string,
): Temper {
  const player = players.find((p) => p.email === email);
  return personaById(player?.persona)?.temper ?? "STEADY";
}

/** A persona not yet at the table, chosen at random; any persona once all are taken. */
export function pickPersona(
  taken: (string | undefined)[],
  random: () => number = Math.random,
): Persona {
  const free = PERSONAS.filter((p) => !taken.includes(p.id));
  const pool = free.length ? free : PERSONAS;
  return pool[Math.floor(random() * pool.length)];
}
