import { describe, expect, it } from "vitest";
import {
  buildAcquireGameState,
  dispose,
  placeTile,
} from "../../acquire/helpers/rules";
import {
  buildForSaleGameState,
  pass,
  sell,
} from "../../for-sale/helpers/rules";
import { buildShangriLaGameState } from "../../shangri-la/helpers/rules";
import { Chain } from "../../acquire/types";

/*
 * The Realtime Database drops empty arrays and empty objects on save. These
 * tests feed the rules the shape they will really see after a round trip.
 */

const lobby = (
  game: "acquire" | "for-sale" | "shangri-la",
  ...emails: string[]
) =>
  emails.map((email) => ({
    email,
    ready: true,
    joinedAt: "0",
    isBot: email.startsWith("Bot"),
    gameName: game,
  }));

/** Deep-copy the way the database returns it: no empty arrays or objects. */
function roundTrip<T>(value: T): T {
  const strip = (v: unknown): unknown => {
    if (Array.isArray(v)) {
      const out = v.map(strip).filter((x) => x !== undefined);
      return out.length ? out : undefined;
    }
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
        const s = strip(x);
        if (s !== undefined) out[k] = s;
      }
      return Object.keys(out).length ? out : undefined;
    }
    return v;
  };
  return strip(value) as T;
}

describe("after a database round trip", () => {
  it("Acquire finishes a merger whose defunct list was emptied", () => {
    const state = buildAcquireGameState(
      "l",
      lobby("acquire", "a", "Bot #1"),
      () => 0,
    );
    state.public.board = {
      "1A": "LUXOR",
      "2A": "LUXOR",
      "3A": "LUXOR",
      "5A": "TOWER",
      "6A": "TOWER",
    };
    state.public.chains.LUXOR.size = 3;
    state.public.chains.TOWER.size = 2;
    state.public.players[1].stocks = { TOWER: 2 };
    state.public.players[0].tiles = ["4A", "9I"];
    expect(placeTile(state, "4A").ok).toBe(true);
    expect(state.public.phase).toBe("DISPOSE");
    expect(state.public.activePlayer).toBe("Bot #1");
    const saved = roundTrip(state);
    expect(saved.public.merger?.defunct).toBeUndefined();
    expect(dispose(saved, "Bot #1", 2, 0).ok).toBe(true);
    expect(saved.public.phase).toBe("BUY");
    expect(saved.public.chains.LUXOR.size).toBe(6);
  });

  it("Acquire draws from an emptied bag without crashing", () => {
    const state = buildAcquireGameState(
      "l",
      lobby("acquire", "a", "Bot #1"),
      () => 0,
    );
    state.private.bag = [];
    const saved = roundTrip(state);
    expect(saved.private.bag).toBeUndefined();
    saved.public.players[0].tiles = ["5E", "6E"];
    expect(placeTile(saved, "5E").ok).toBe(true);
    expect(saved.public.phase).toBe("BUY");
  });

  it("For Sale moves to selling and ends with emptied decks", () => {
    const state = buildForSaleGameState(
      "l",
      lobby("for-sale", "a", "b", "c"),
      () => 0,
    );
    state.private.propertyDeck = [];
    state.public.onOffer = [1, 2, 3];
    let saved = roundTrip(state);
    expect(saved.private.propertyDeck).toBeUndefined();
    expect(pass(saved).ok).toBe(true);
    expect(pass(saved).ok).toBe(true);
    expect(saved.public.phase).toBe("SELLING");
    // Now empty the cheque deck and finish the last selling round.
    saved.private.chequeDeck = [];
    saved = roundTrip(saved);
    for (const p of saved.public.players) {
      expect(sell(saved, p.email, (p.properties as number[])[0]).ok).toBe(true);
    }
    expect(saved.public.status).toBe("GAME_OVER");
  });

  it("Shangri-La keeps all thirteen villages as an array", () => {
    const state = buildShangriLaGameState(
      "l",
      lobby("shangri-la", "a", "b", "c"),
      () => 0,
    );
    const saved = roundTrip(state);
    expect(Array.isArray(saved.public.villages)).toBe(true);
    expect(saved.public.villages).toHaveLength(13);
    expect(saved.public.villages.every((v, i) => v.id === i)).toBe(true);
  });

  it("Acquire chains survive as a full map", () => {
    const state = buildAcquireGameState(
      "l",
      lobby("acquire", "a", "Bot #1"),
      () => 0,
    );
    const saved = roundTrip(state);
    expect(Object.keys(saved.public.chains)).toHaveLength(7);
    expect(
      (["LUXOR"] as Chain[]).every(
        (c) => saved.public.chains[c].stockLeft === 25,
      ),
    ).toBe(true);
  });
});
