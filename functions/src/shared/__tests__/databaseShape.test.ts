import { describe, expect, it } from "vitest";
import {
  buildAcquireGameState,
  buyStock,
  declareEnd,
  dispose,
  placeTile,
} from "../../acquire/helpers/rules";
import {
  buildForSaleGameState,
  pass,
  sell,
} from "../../for-sale/helpers/rules";
import {
  buildShangriLaGameState,
  journey,
} from "../../shangri-la/helpers/rules";
import { buildLyngkGameState, moveStack } from "../../lyngk/helpers/rules";
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

/** Keys the database refuses: empty, or holding . # $ / [ ]. */
function badKeys(value: unknown, path = ""): string[] {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value))
    return value.flatMap((v, i) => badKeys(v, `${path}[${i}]`));
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) => {
    const here = `${path}.${k}`;
    const bad = !k || /[.#$/[\]]/.test(k) ? [here] : [];
    return [...bad, ...badKeys(v, here)];
  });
}

describe("with real email addresses", () => {
  const human = "anthony.gt@example.com";

  it("Acquire ends without an email as a key", () => {
    const state = buildAcquireGameState(
      "l",
      lobby("acquire", human, "Bot #1"),
      () => 0,
    );
    state.public.board = {};
    for (let c = 1; c <= 11; c++) state.public.board[`${c}A`] = "TOWER";
    state.public.chains.TOWER.size = 11;
    state.public.players[0].stocks = { TOWER: 2 };
    state.public.players[0].tiles = ["5E"];
    expect(badKeys(state)).toEqual([]);
    expect(declareEnd(state).ok).toBe(true);
    state.public.phase = "BUY";
    expect(buyStock(state, {}).ok).toBe(true);
    expect(state.public.status).toBe("GAME_OVER");
    expect(badKeys(state)).toEqual([]);
    expect(state.public.scores?.[0]).toEqual({
      email: human,
      money: state.public.players[0].money,
    });
  });

  it("For Sale sells a round and ends without an email as a key", () => {
    const state = buildForSaleGameState(
      "l",
      lobby("for-sale", human, "Bot #1", "Bot #2"),
      () => 0,
    );
    state.public.phase = "SELLING";
    state.private.chequeDeck = [];
    state.public.cheques = [0, 8, 15];
    state.public.players[0].properties = [30];
    state.public.players[1].properties = [20];
    state.public.players[2].properties = [9];
    for (const p of state.public.players)
      expect(sell(state, p.email, (p.properties as number[])[0]).ok).toBe(true);
    expect(state.public.status).toBe("GAME_OVER");
    expect(state.public.players[0].cheques).toEqual([15]);
    expect(badKeys(state)).toEqual([]);
  });

  it("Shangri-La and LYNGK end without an email as a key", () => {
    const shangri = buildShangriLaGameState(
      "l",
      lobby("shangri-la", human, "Bot #1", "Bot #2"),
      () => 0,
    );
    shangri.public.phase = "PLAY";
    shangri.public.villages[0].spaces = {
      HEALER: { owner: human, student: true },
    };
    shangri.public.villages[1].spaces = { PRIEST: { owner: "Bot #1" } };
    shangri.public.bridges = [[0, 1]];
    shangri.public.activePlayer = human;
    expect(journey(shangri, 0, 1).ok).toBe(true);
    expect(shangri.public.status).toBe("GAME_OVER");
    expect(badKeys(shangri)).toEqual([]);

    const lyngk = buildLyngkGameState(
      "l",
      lobby("lyngk" as never, human, "Bot #1"),
      () => 0,
    );
    lyngk.public.stacks = { "0,4": ["RED"], "1,4": ["BLUE"] };
    lyngk.public.players[0].colours = ["RED"];
    lyngk.public.players[1].colours = ["BLUE"];
    lyngk.public.activePlayer = human;
    expect(moveStack(lyngk, ["0,4", "1,4"]).ok).toBe(true);
    expect(lyngk.public.status).toBe("GAME_OVER");
    expect(badKeys(lyngk)).toEqual([]);
  });
});
