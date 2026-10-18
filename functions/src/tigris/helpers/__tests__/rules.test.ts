import { describe, expect, it } from "vitest";
import { PlayerInLobby } from "../../../shared/types";
import { Colour, TigrisGameState } from "../../types";
import {
  buildMonument,
  buildTigrisGameState,
  chooseWar,
  commitTiles,
  endTurn,
  placeTile,
  playCatastrophe,
  positionLeader,
  replaceTiles,
  takeTreasure,
  withdrawLeader,
} from "../rules";
import {
  BORDER,
  canPlaceLeader,
  canPlaceTile,
  compareSpheres,
  components,
  finalSpheres,
  isRiver,
  label,
  RIVER,
  SHEDU,
} from "../board";

const lobby = (...emails: string[]): PlayerInLobby[] =>
  emails.map((email) => ({
    email,
    ready: true,
    joinedAt: "0",
    isBot: email.startsWith("Bot"),
    gameName: "tigris",
  }));

/** Deterministic deal: a starts. */
const fresh = (...emails: string[]) =>
  buildTigrisGameState("lobby", lobby(...emails), () => 0);

const seat = (state: TigrisGameState, email: string) =>
  state.public.players.find((p) => p.email === email)!;

const put = (
  state: TigrisGameState,
  cell: string,
  colour: Colour,
  extra: { treasure?: boolean; down?: boolean } = {},
) => {
  state.public.tiles = {
    ...(state.public.tiles || {}),
    [cell]: { colour, ...extra },
  };
};
const stand = (
  state: TigrisGameState,
  cell: string,
  email: string,
  colour: Colour,
) => {
  state.public.leaders = {
    ...(state.public.leaders || {}),
    [cell]: { email, colour },
  };
};
const hand = (state: TigrisGameState, email: string, tiles: Colour[]) => {
  seat(state, email).hand = tiles;
};

describe("the board", () => {
  it("has the standard rivers, Shedu spaces and border treasures", () => {
    expect(RIVER).toHaveLength(41);
    expect(SHEDU).toHaveLength(10);
    expect(BORDER.every((b) => SHEDU.includes(b))).toBe(true);
    expect(SHEDU.some(isRiver)).toBe(false);
    expect(label("0_0")).toBe("A1");
    expect(label("10_15")).toBe("P11");
  });

  it("deals six tiles and starts ten temples with treasures", () => {
    const state = fresh("a", "b");
    expect(state.public.bagCount).toBe(153 - 10 - 12);
    expect(state.public.players.map((p) => p.hand?.length)).toEqual([6, 6]);
    expect(
      Object.values(state.public.tiles || {}).filter((t) => t.treasure),
    ).toHaveLength(10);
    expect(state.public.players.map((p) => p.dynasty)).toEqual([
      "ARCHER",
      "BULL",
    ]);
    expect(state.public.actionsLeft).toBe(2);
  });
});

describe("placing tiles and leaders", () => {
  it("pays the matching leader, or the king, and nothing for uniting", () => {
    const state = fresh("a", "b");
    hand(state, "a", ["GREEN", "GREEN", "BLACK", "RED", "RED", "BLUE"]);
    expect(positionLeader(state, "BLACK", "1_2").ok).toBe(true); // beside the temple at B2
    expect(placeTile(state, "1_3", "GREEN").ok).toBe(true);
    expect(seat(state, "a").points.GREEN).toBe(1); // the king collects
    // Two actions: b's turn.
    expect(state.public.turnPlayer).toBe("b");
    expect(seat(state, "a").hand).toHaveLength(6);
  });

  it("refuses farms on land, others on the river, and leaders off temples", () => {
    const state = fresh("a", "b");
    hand(state, "a", ["BLUE", "RED", "RED", "RED", "RED", "RED"]);
    expect(placeTile(state, "1_2", "BLUE").ok).toBe(false);
    expect(placeTile(state, "3_1", "RED").ok).toBe(false); // (1,3) is river
    expect(canPlaceTile(state.public, "3_1", "BLUE").ok).toBe(true);
    expect(positionLeader(state, "RED", "5_5").ok).toBe(false);
    expect(canPlaceLeader(state.public, "3_1").ok).toBe(false);
    expect(positionLeader(state, "RED", "0_1").ok).toBe(true);
  });

  it("will not let a leader or a third kingdom be united", () => {
    const state = fresh("a", "b");
    put(state, "9_0", "RED");
    stand(state, "9_1", "a", "BLACK");
    put(state, "9_4", "RED");
    stand(state, "9_3", "b", "RED");
    // A leader at 9_2 would touch both kingdoms.
    expect(canPlaceLeader(state.public, "9_2").ok).toBe(false);
    put(state, "8_2", "RED");
    stand(state, "7_2", "b", "GREEN");
    // A tile at 9_2 would unite three kingdoms.
    expect(canPlaceTile(state.public, "9_2", "GREEN").ok).toBe(false);
  });
});

describe("revolts", () => {
  it("are fought with temples beside the leaders, the defender winning ties", () => {
    const state = fresh("a", "b");
    hand(state, "a", ["RED", "BLUE", "BLUE", "BLUE", "BLUE", "BLUE"]);
    hand(state, "b", ["RED", "RED", "BLUE", "BLUE", "BLUE", "BLUE"]);
    expect(positionLeader(state, "RED", "0_1").ok).toBe(true); // a's priest by B2
    endTurn(state);
    expect(state.public.turnPlayer).toBe("b");
    expect(positionLeader(state, "RED", "2_1").ok).toBe(true); // b's priest, same temple
    expect(state.public.phase).toBe("CONFLICT");
    expect(state.public.conflict).toMatchObject({
      kind: "REVOLT",
      attacker: "b",
      defender: "a",
      attackerBase: 1,
      defenderBase: 1,
      stage: "ATTACKER",
    });
    expect(state.public.activePlayer).toBe("b");
    expect(commitTiles(state, "a", 1).ok).toBe(false);
    expect(commitTiles(state, "b", 3).ok).toBe(false);
    expect(commitTiles(state, "b", 1).ok).toBe(true);
    expect(state.public.activePlayer).toBe("a");
    expect(commitTiles(state, "a", 1).ok).toBe(true); // 2 to 2: the defender holds
    expect(state.public.lastConflict?.winner).toBe("a");
    expect(state.public.leaders?.["2_1"]).toBeUndefined();
    expect(state.public.leaders?.["0_1"]).toMatchObject({ email: "a" });
    expect(seat(state, "a").points.RED).toBe(1);
    expect(seat(state, "a").hand).toEqual([
      "BLUE",
      "BLUE",
      "BLUE",
      "BLUE",
      "BLUE",
    ]);
    expect(seat(state, "b").hand).toEqual([
      "RED",
      "BLUE",
      "BLUE",
      "BLUE",
      "BLUE",
    ]);
    expect(state.public.phase).toBe("ACTION");
    expect(state.public.activePlayer).toBe("b");
    expect(state.public.actionsLeft).toBe(1);
  });
});

describe("wars", () => {
  /** Two kingdoms on row ten with a gap at 9_3. */
  function twoKingdoms(colour: Colour) {
    const state = fresh("a", "b");
    put(state, "9_0", "RED");
    stand(state, "9_1", "a", colour);
    put(state, "9_2", colour);
    put(state, "9_4", "RED");
    stand(state, "9_6", "b", colour);
    put(state, "9_7", colour);
    put(state, "9_8", colour);
    return state;
  }

  it("counts supporters on each side, removes the loser's and pays the winner", () => {
    const state = twoKingdoms("BLACK");
    hand(state, "a", ["BLACK", "BLACK", "BLACK", "BLUE", "BLUE", "BLUE"]);
    hand(state, "b", ["BLUE", "BLUE", "BLUE", "BLUE", "BLUE", "BLUE"]);
    expect(placeTile(state, "9_3", "BLACK").ok).toBe(true);
    expect(seat(state, "a").points.BLACK).toBe(0); // no point for uniting
    expect(state.public.unification).toBe("9_3");
    expect(state.public.conflict).toMatchObject({
      kind: "WAR",
      colour: "BLACK",
      attacker: "a",
      defender: "b",
      attackerBase: 1,
      defenderBase: 2,
    });
    expect(commitTiles(state, "a", 2).ok).toBe(true);
    expect(commitTiles(state, "b", 0).ok).toBe(true);
    expect(state.public.lastConflict).toMatchObject({
      winner: "a",
      loser: "b",
      removed: 2,
      gained: 3,
    });
    expect(seat(state, "a").points.BLACK).toBe(3);
    expect(state.public.tiles?.["9_7"]).toBeUndefined();
    expect(state.public.tiles?.["9_8"]).toBeUndefined();
    expect(state.public.tiles?.["9_3"]).toBeDefined(); // the uniting tile stays
    expect(state.public.leaders?.["9_6"]).toBeUndefined();
    expect(state.public.unification).toBeUndefined();
    expect(state.public.phase).toBe("ACTION");
    expect(state.public.actionsLeft).toBe(1);
  });

  it("spares temples with treasures when priests fight", () => {
    const state = twoKingdoms("RED");
    put(state, "9_5", "RED", { treasure: true }); // the Shedu temple sits in b's kingdom
    hand(state, "a", ["RED", "RED", "RED", "RED", "BLUE", "BLUE"]);
    hand(state, "b", ["BLUE", "BLUE", "BLUE", "BLUE", "BLUE", "BLUE"]);
    expect(placeTile(state, "9_3", "RED").ok).toBe(true);
    // b's supporters: 9_4, 9_5, 9_7, 9_8 (temples linked to the priest).
    expect(state.public.conflict?.defenderBase).toBe(4);
    expect(state.public.conflict?.attackerBase).toBe(2); // 9_0 and 9_2
    expect(commitTiles(state, "a", 3).ok).toBe(true); // 5 to 4
    expect(commitTiles(state, "b", 0).ok).toBe(true);
    expect(state.public.lastConflict?.winner).toBe("a");
    expect(state.public.tiles?.["9_5"]?.treasure).toBe(true);
    expect(state.public.lastConflict?.removed).toBe(3);
    expect(seat(state, "a").points.RED).toBe(4);
  });

  it("lets the uniting player order several wars and stops when kingdoms split", () => {
    const state = twoKingdoms("BLACK");
    stand(state, "8_1", "a", "GREEN");
    stand(state, "8_4", "b", "GREEN");
    put(state, "8_0", "RED");
    hand(state, "a", ["BLACK", "BLACK", "BLACK", "GREEN", "GREEN", "GREEN"]);
    hand(state, "b", ["BLUE", "BLUE", "BLUE", "BLUE", "BLUE", "BLUE"]);
    expect(placeTile(state, "9_3", "BLACK").ok).toBe(true);
    expect(state.public.phase).toBe("WAR_CHOICE");
    expect(state.public.warChoices?.sort()).toEqual(["BLACK", "GREEN"]);
    expect(chooseWar(state, "BLACK").ok).toBe(true);
    expect(commitTiles(state, "a", 2).ok).toBe(true);
    expect(commitTiles(state, "b", 0).ok).toBe(true);
    // b's settlements are gone, yet the kingdoms stay linked through the temple at 9_4: the traders still fight.
    expect(state.public.phase).toBe("CONFLICT");
    expect(state.public.conflict?.colour).toBe("GREEN");
  });
});

describe("monuments", () => {
  it("are offered for a completed square, flip the tiles and pay each turn", () => {
    const state = fresh("a", "b");
    put(state, "9_0", "BLACK");
    put(state, "10_0", "BLACK");
    put(state, "10_1", "BLACK");
    put(state, "10_3", "RED");
    stand(state, "10_2", "a", "BLACK");
    hand(state, "a", ["BLACK", "BLUE", "BLUE", "BLUE", "BLUE", "BLUE"]);
    expect(placeTile(state, "9_1", "BLACK").ok).toBe(true);
    expect(seat(state, "a").points.BLACK).toBe(1);
    expect(state.public.phase).toBe("MONUMENT");
    expect(state.public.monumentOffer).toEqual({
      squares: ["9_0"],
      colour: "BLACK",
    });
    expect(buildMonument(state, "9_0", ["RED", "BLUE"]).ok).toBe(false);
    expect(buildMonument(state, "9_0", ["GREEN", "BLACK"]).ok).toBe(true);
    expect(state.public.tiles?.["9_0"]?.down).toBe(true);
    expect(state.public.monuments).toEqual([
      { cell: "9_0", colours: ["BLACK", "GREEN"] },
    ]);
    expect(state.public.monumentsLeft).toHaveLength(5);
    expect(state.public.phase).toBe("ACTION");
    expect(endTurn(state).ok).toBe(true);
    expect(seat(state, "a").points.BLACK).toBe(2); // the king beside its monument
    expect(state.public.turnPlayer).toBe("b");
  });

  it("withdraw leaders whose only temple is flipped", () => {
    const state = fresh("a", "b");
    put(state, "9_0", "RED");
    put(state, "10_0", "RED");
    put(state, "10_1", "RED");
    stand(state, "10_2", "a", "GREEN");
    stand(state, "8_0", "b", "BLUE");
    hand(state, "a", ["RED", "BLUE", "BLUE", "BLUE", "BLUE", "BLUE"]);
    expect(placeTile(state, "9_1", "RED").ok).toBe(true);
    expect(state.public.phase).toBe("MONUMENT");
    expect(buildMonument(state, "9_0", ["RED", "BLUE"]).ok).toBe(true);
    expect(state.public.leaders?.["10_2"]).toBeUndefined();
    expect(state.public.leaders?.["8_0"]).toBeUndefined();
  });
});

describe("treasures and catastrophes", () => {
  it("go to the trader, border spaces first, leaving one behind", () => {
    const state = fresh("a", "b");
    put(state, "9_8", "RED", { treasure: true });
    put(state, "9_9", "RED", { treasure: true });
    expect(positionLeader(state, "GREEN", "10_8").ok).toBe(true);
    expect(state.public.phase).toBe("TREASURE");
    expect(state.public.treasureOffer?.owner).toBe("a");
    expect([...(state.public.treasureOffer?.cells || [])].sort()).toEqual([
      "9_8",
      "9_9",
    ]);
    expect(takeTreasure(state, "a", "9_9").ok).toBe(true);
    expect(seat(state, "a").treasures).toBe(1);
    expect(state.public.tiles?.["9_8"]?.treasure).toBe(true);
    expect(state.public.phase).toBe("ACTION");
    // A border treasure is taken without a choice.
    put(state, "7_2", "RED", { treasure: true }); // beside the Shedu temple at B8
    expect(positionLeader(state, "GREEN", "8_1").ok).toBe(true);
    expect(seat(state, "a").treasures).toBe(2);
    expect(state.public.tiles?.["7_1"]?.treasure).toBeUndefined();
    expect(state.public.tiles?.["7_2"]?.treasure).toBe(true);
  });

  it("end the game when two remain at the end of a turn", () => {
    const state = fresh("a", "b");
    for (const [cell, tile] of Object.entries(state.public.tiles || {}))
      if (cell !== "1_1" && cell !== "7_1") delete tile.treasure;
    seat(state, "a").points = { RED: 3, BLUE: 4, GREEN: 5, BLACK: 6 };
    seat(state, "b").points = { RED: 4, BLUE: 4, GREEN: 4, BLACK: 9 };
    seat(state, "b").treasures = 1;
    expect(endTurn(state).ok).toBe(true);
    expect(state.public.status).toBe("GAME_OVER");
    // b's treasure lifts a 4 to 5: lowest 4 beats a's 3.
    expect(state.public.winner).toBe("b");
    expect(state.public.results?.[0].spheres).toEqual([4, 4, 5, 9]);
    expect(finalSpheres({ RED: 1, BLUE: 1, GREEN: 5, BLACK: 5 }, 3)).toEqual([
      2, 3, 5, 5,
    ]);
    expect(compareSpheres([3, 9, 9, 9], [3, 8, 9, 9])).toBeGreaterThan(0);
  });

  it("destroy a tile, block the space and strand leaders", () => {
    const state = fresh("a", "b");
    put(state, "9_0", "RED");
    stand(state, "9_1", "b", "BLACK");
    expect(playCatastrophe(state, "1_1").ok).toBe(false); // a treasure
    expect(playCatastrophe(state, "9_1").ok).toBe(false); // a leader
    expect(playCatastrophe(state, "9_0").ok).toBe(true);
    expect(state.public.blocked).toEqual(["9_0"]);
    expect(state.public.tiles?.["9_0"]).toBeUndefined();
    expect(state.public.leaders?.["9_1"]).toBeUndefined();
    expect(seat(state, "a").catastrophes).toBe(1);
    expect(canPlaceTile(state.public, "9_0", "RED").ok).toBe(false);
  });

  it("replace tiles from the bag and withdraw leaders on request", () => {
    const state = fresh("a", "b");
    hand(state, "a", ["RED", "RED", "RED", "RED", "RED", "RED"]);
    const bag = state.public.bagCount;
    expect(replaceTiles(state, [0, 0]).ok).toBe(false);
    expect(replaceTiles(state, [0, 1, 2]).ok).toBe(true);
    expect(seat(state, "a").hand).toHaveLength(6);
    expect(state.public.bagCount).toBe(bag - 3);
    expect(state.public.actionsLeft).toBe(1);
    expect(withdrawLeader(state, "RED").ok).toBe(false);
    stand(state, "0_1", "a", "RED");
    expect(withdrawLeader(state, "RED").ok).toBe(true);
    expect(state.public.leaders).toBeUndefined();
    expect(state.public.turnPlayer).toBe("b");
    expect(components(state.public).comps).toHaveLength(10);
  });
});
