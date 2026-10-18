import { getDatabase, onValue, ref } from "firebase/database";
import { useEffect, useState } from "react";
import type { GameName } from "@games/shared/types";

/*
 * Statistics the server keeps under stats/players: how often each person
 * has played each game and where they finished.
 */

export type GameStats = {
  played?: number;
  wins?: number;
  lastPlayedAt?: number;
  /** Finishing places, 1 to 6 (6 means sixth or worse). */
  places?: { [rank: string]: number };
};

export type RecentResult = {
  game: GameName;
  rank: number;
  seats: number;
  bots: number;
  finishedAt: number;
};

export type PlayerStats = {
  email: string;
  played?: number;
  wins?: number;
  lastPlayedAt?: number;
  games?: { [game in GameName]?: GameStats };
  recent?: { [lobbyUID: string]: RecentResult };
};

/** Emails hold dots, which database keys may not. */
export function statsKey(email: string) {
  return email.replace(/\./g, ",").replace(/[#$[\]/]/g, "_");
}

/** Every tracked player, live. */
export function useAllStats(enabled: boolean) {
  const [players, setPlayers] = useState<PlayerStats[] | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const unsubscribe = onValue(
      ref(getDatabase(), "stats/players"),
      (snapshot) => {
        const value = (snapshot.val() || {}) as { [key: string]: PlayerStats };
        setPlayers(Object.values(value));
      },
      (e) => {
        console.error(e);
        setPlayers([]);
      },
    );
    return () => unsubscribe();
  }, [enabled]);
  return players;
}

export const ORDINAL = (rank: number) =>
  rank === 1 ? "1st" : rank === 2 ? "2nd" : rank === 3 ? "3rd" : `${rank}th`;
