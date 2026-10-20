import { personaById } from "@games/shared/personas";

/** Bots are stored as "Bot #n"; humans as their email address. */
export function isBotName(email: string) {
  return /^Bot #\d+$/.test(email);
}

/** The bots at the table and their personas, so a log line can name them. */
const personas = new Map<string, string>();

/** Remembers which persona each bot at the table has. Call with any player list. */
export function registerPersonas(
  players: { email: string; persona?: string }[] | undefined | null,
) {
  for (const p of players || []) {
    if (p.persona) personas.set(p.email, p.persona);
  }
}

/** The persona behind a bot, if it has one. */
export function personaOf(email: string) {
  return personaById(personas.get(email));
}

/** A bot's avatar, a plain robot without a persona; nothing for a human. */
export function avatarOf(email: string) {
  if (!isBotName(email)) return null;
  return personaOf(email)?.avatar ?? "🤖";
}

/** Short name for the table: the bot's persona, "Bot 2" without one, or the part of the email before the @. */
export default function displayName(email: string) {
  if (isBotName(email)) {
    return personaOf(email)?.name ?? email.replace("#", "");
  }
  return email.split("@")[0];
}
