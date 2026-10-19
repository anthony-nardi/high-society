import { appendFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildCondottiereGameState,
  chooseBattlefield,
  isGameOver,
  pass,
  playCard,
} from "../rules";
import { takeBotTurn } from "../bot";
import { chooseRegion } from "../botSearch";
import { isMercenary, mercenaryValue } from "../board";

/*
 * A scripted opener plays its biggest mercenary once a battle and then
 * passes: a strategy the first bots let win every time. Run with ARENA=1;
 * the figures go to exploit.log.
 */
describe.skipIf(!process.env.ARENA)("arena", () => {
  it("measures a one-card opener against four bots", () => {
    let wins = 0;
    let regions = 0;
    let plays = 0;
    let passes = 0;
    const games = 12;
    for (let g = 0; g < games; g++) {
      const state = buildCondottiereGameState(
        "x",
        ["human", "Bot #1", "Bot #2", "Bot #3", "Bot #4"].map((email) => ({
          email,
          ready: true,
          joinedAt: "0",
          isBot: email !== "human",
          gameName: "condottiere" as const,
        })),
      );
      let steps = 0;
      while (!isGameOver(state) && steps++ < 3000) {
        const active = state.public.activePlayer;
        if (active !== "human") {
          takeBotTurn(state);
          const m = state.public.lastMove;
          if (m?.type === "play") plays++;
          else if (m?.type === "pass") passes++;
          continue;
        }
        const me = state.public.players[0];
        if (state.public.phase === "CHOOSE") {
          chooseBattlefield(state, chooseRegion(state, "human"));
          continue;
        }
        const hand = me.hand || [];
        if ((me.line || []).length === 0) {
          let best = -1;
          hand.forEach((c, i) => {
            if (
              isMercenary(c) &&
              (best < 0 || mercenaryValue(c) > mercenaryValue(hand[best]))
            )
              best = i;
          });
          if (best >= 0 && playCard(state, best).ok) continue;
        }
        pass(state);
      }
      if (state.public.winner === "human") wins++;
      regions += (state.public.players[0].regions || []).length;
    }
    appendFileSync(
      "exploit.log",
      `opener won ${wins} of ${games}, ${(regions / games).toFixed(1)} regions a game; bots played ${plays} passed ${passes}` +
        String.fromCharCode(10),
    );
    expect(true).toBe(true);
  });
});
