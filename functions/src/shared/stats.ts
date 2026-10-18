import { getDatabase, ServerValue } from "firebase-admin/database";
import { logger } from "firebase-functions/v2";
import { GameModule } from "./game";
import { GenericGameState } from "./types";

/*
 * Player statistics: how often each person has played each game and where
 * they finished. Written once when a game ends, under stats/players, keyed
 * by a database-safe form of the email. Bots are not tracked.
 */

export type Standing = { email: string; score: number };

/** Emails hold dots, which database keys may not. */
export function statsKey(email: string) {
  return email.replace(/\./g, ",").replace(/[#$[\]/]/g, "_");
}

/**
 * Final placements, ties sharing a rank: from the module's standings when
 * it has them, otherwise the winner first and everyone else second.
 */
export function placements<State extends GenericGameState>(
  module: GameModule<State>,
  state: State,
): { email: string; rank: number; score: number }[] {
  const pub = state.public as GenericGameState["public"] & {
    winner?: string;
    draw?: boolean;
  };
  const standings: Standing[] = module.standings
    ? module.standings(state)
    : pub.players.map((p) => ({
        email: p.email,
        score: pub.draw || pub.winner === p.email ? 1 : 0,
      }));
  // Anyone the standings leave out comes last.
  for (const p of pub.players)
    if (!standings.some((s) => s.email === p.email))
      standings.push({ email: p.email, score: Number.NEGATIVE_INFINITY });
  const sorted = [...standings].sort((a, b) => b.score - a.score);
  let rank = 0;
  return sorted.map((s, i) => {
    if (i === 0 || s.score !== sorted[i - 1].score) rank = i + 1;
    return { email: s.email, rank, score: s.score };
  });
}

/** Records a finished game for every human at the table, once. */
export async function recordGameStats<State extends GenericGameState>(
  module: GameModule<State>,
  state: State,
) {
  if (state.public.status !== "GAME_OVER") return;
  const priv = state.private as { statsRecorded?: boolean };
  if (priv.statsRecorded) return;
  priv.statsRecorded = true;

  const places = placements(module, state);
  const humans = state.public.players.filter((p) => !p.isBot);
  const seats = state.public.players.length;
  const bots = seats - humans.length;
  const finishedAt = Date.now();
  const updates: { [path: string]: unknown } = {};
  const inc = ServerValue.increment(1);

  for (const player of humans) {
    const place = places.find((p) => p.email === player.email);
    if (!place) continue;
    const base = `stats/players/${statsKey(player.email)}`;
    updates[`${base}/email`] = player.email;
    updates[`${base}/played`] = inc;
    updates[`${base}/lastPlayedAt`] = finishedAt;
    if (place.rank === 1) updates[`${base}/wins`] = inc;
    const game = `${base}/games/${module.name}`;
    updates[`${game}/played`] = inc;
    updates[`${game}/lastPlayedAt`] = finishedAt;
    if (place.rank === 1) updates[`${game}/wins`] = inc;
    updates[`${game}/places/${Math.min(place.rank, 6)}`] = inc;
    updates[`${base}/recent/${state.public.id}`] = {
      game: module.name,
      rank: place.rank,
      seats,
      bots,
      finishedAt,
    };
  }
  updates[`stats/games/${module.name}/played`] = inc;

  try {
    await getDatabase().ref().update(updates);
  } catch (e) {
    logger.error(`Could not record stats for ${state.public.id}`, e);
  }
}
