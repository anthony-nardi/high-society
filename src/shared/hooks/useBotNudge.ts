import { useEffect } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { isBotName } from "../utils/displayName";

type NudgeableState = {
  status: string;
  activePlayer: string;
  players: { email: string; isBot?: boolean }[];
  notification?: { timestamp: number };
};

/** How long a bot may sit on its turn before the client asks the server to move it. */
export const BOT_STALL_MS = 8000;

/**
 * Bots normally move inside the request that handed them the turn. If that
 * chain was cut short (a timeout, a game that started on a bot's turn), the
 * bot would wait forever, so after a quiet spell any viewer asks the server
 * to let the bots play on. The server ignores the call if it is not a bot's
 * turn, so several viewers asking at once is harmless.
 */
export default function useBotNudge(
  lobbyId: number | null,
  gameState: NudgeableState | null,
) {
  const active = gameState?.players.find(
    (p) => p.email === gameState.activePlayer,
  );
  const botToMove =
    !!gameState &&
    gameState.status === "IN_PROGRESS" &&
    !!active &&
    (active.isBot || isBotName(active.email));
  const stamp = gameState?.notification?.timestamp ?? 0;

  useEffect(() => {
    if (!botToMove || !lobbyId) return;
    const timer = window.setTimeout(() => {
      const playBots = httpsCallable<{ lobbyUID: string }, void>(
        getFunctions(),
        "playbots",
        { timeout: 300_000 },
      );
      playBots({ lobbyUID: String(lobbyId) }).catch((e) => console.log(e));
    }, BOT_STALL_MS);
    return () => window.clearTimeout(timer);
    // Any change to the state restarts the clock.
  }, [botToMove, lobbyId, stamp, gameState?.activePlayer]);
}
