import { onRequest } from "firebase-functions/v2/https";
import { getDatabase } from "firebase-admin/database";
import { GAME_INFO, GAME_NAMES } from "./gameInfo";
import { GameName } from "./types";

/*
 * A public, read-only view of the statistics for the landing page, which
 * has no sign-in. Players appear under the same short name the tables
 * show (the part of the email before the @), never the full address.
 */

type Stored = {
  email: string;
  played?: number;
  wins?: number;
  lastPlayedAt?: number;
  games?: {
    [game: string]: {
      played?: number;
      wins?: number;
      places?: { [rank: string]: number };
      lastPlayedAt?: number;
    };
  };
};

export type LeaderboardRow = {
  name: string;
  played: number;
  wins: number;
  places: number[];
  lastPlayedAt: number;
};

export type Leaderboard = {
  generatedAt: number;
  overall: LeaderboardRow[];
  games: {
    name: GameName;
    title: string;
    played: number;
    rows: LeaderboardRow[];
  }[];
};

const shortName = (email: string) => email.split("@")[0];

export function buildLeaderboard(
  players: Stored[],
  totals: { [game: string]: { played?: number } } = {},
): Leaderboard {
  const byWins = (a: LeaderboardRow, b: LeaderboardRow) =>
    b.wins - a.wins || b.played - a.played || a.name.localeCompare(b.name);
  const overall = players
    .filter((p) => (p.played ?? 0) > 0)
    .map((p) => ({
      name: shortName(p.email),
      played: p.played ?? 0,
      wins: p.wins ?? 0,
      places: [],
      lastPlayedAt: p.lastPlayedAt ?? 0,
    }))
    .sort(byWins);
  const games = GAME_NAMES.map((name) => ({
    name,
    title: GAME_INFO[name].title,
    played: totals[name]?.played ?? 0,
    rows: players
      .filter((p) => (p.games?.[name]?.played ?? 0) > 0)
      .map((p) => {
        const g = p.games?.[name] || {};
        return {
          name: shortName(p.email),
          played: g.played ?? 0,
          wins: g.wins ?? 0,
          places: [1, 2, 3, 4, 5, 6].map((r) => g.places?.[String(r)] ?? 0),
          lastPlayedAt: g.lastPlayedAt ?? 0,
        };
      })
      .sort(byWins),
  })).filter((g) => g.rows.length > 0);
  return { generatedAt: Date.now(), overall, games };
}

export const leaderboard = onRequest(
  { cors: true, timeoutSeconds: 30 },
  async (request, response) => {
    const db = getDatabase();
    const [playersSnapshot, gamesSnapshot] = await Promise.all([
      db.ref("stats/players").get(),
      db.ref("stats/games").get(),
    ]);
    const players = Object.values(
      (playersSnapshot.val() || {}) as { [key: string]: Stored },
    );
    const totals = (gamesSnapshot.val() || {}) as {
      [game: string]: { played?: number };
    };
    response.set("Cache-Control", "public, max-age=60, s-maxage=120");
    response.json(buildLeaderboard(players, totals));
  },
);
