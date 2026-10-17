import {
  Arrival,
  Colour,
  Master,
  ShangriLaGameState,
  ShangriLaPlayerState,
  Village,
} from "../types";
import { LogEntry, Notification, PlayerInLobby } from "../../shared/types";
import type { ActionResult } from "../../shared/game";
import {
  bridgesFor,
  hasBridge,
  MASTERS,
  neighbours,
  RED_VILLAGE,
  VILLAGES,
} from "./board";

/*
 * Pure rules for The Bridges of Shangri-La: everything here mutates the
 * state it is given and never touches the database.
 */

export const TILES_PER_DISCIPLINE = 6;
export const STUDENTS_PER_TURN = 2;
const COLOURS: Colour[] = ["RED", "BLUE", "YELLOW", "VIOLET"];

export const label = (type: Master) => type.toLowerCase().replace("_", "-");

export function appendLog(gameState: ShangriLaGameState, entry: LogEntry) {
  gameState.private.log = [...(gameState.private.log || []), entry];
}

export function publishLog(gameState: ShangriLaGameState) {
  gameState.public.log = gameState.private.log || [];
}

function announce(
  gameState: ShangriLaGameState,
  title: string,
  message?: string,
) {
  const notification: Notification = { timestamp: Date.now(), title };
  if (message) notification.message = message;
  gameState.public.notification = notification;
  appendLog(gameState, notification);
}

export function playerByEmail(
  gameState: ShangriLaGameState,
  email: string | undefined,
) {
  return gameState.public.players.find((p) => p.email === email);
}

export function getActivePlayer(gameState: ShangriLaGameState) {
  return playerByEmail(gameState, gameState.public.activePlayer);
}

export function isGameOver(gameState: ShangriLaGameState) {
  return gameState.public.status === "GAME_OVER";
}

export function buildShangriLaGameState(
  lobbyUID: string,
  players: PlayerInLobby[],
  random: () => number = Math.random,
): ShangriLaGameState {
  const seats = players.slice(0, 4);
  const playersMetadata: ShangriLaPlayerState[] = seats.map((player, i) => ({
    email: player.email,
    lastActionAt: 0,
    colour: COLOURS[i],
    supply: Object.fromEntries(
      MASTERS.map((m) => [m, TILES_PER_DISCIPLINE]),
    ) as ShangriLaPlayerState["supply"],
    isBot: !!player.isBot,
  }));
  const starter = playersMetadata[Math.floor(random() * seats.length)];
  const villages: Village[] = VILLAGES.map((_, id) => ({ id }));
  if (seats.length <= 3)
    villages[RED_VILLAGE] = { id: RED_VILLAGE, stone: true };

  return {
    public: {
      id: lobbyUID,
      game: "shangri-la",
      players: playersMetadata,
      activePlayer: starter.email,
      startAt: Date.now().toString(),
      status: "IN_PROGRESS",
      phase: "SETUP",
      villages,
      bridges: bridgesFor(seats.length),
      turn: 1,
      passes: 0,
    },
    private: {
      log: [
        {
          timestamp: Date.now(),
          title: `Game started. ${starter.email} places the first master.`,
        },
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const villageAt = (gameState: ShangriLaGameState, index: number) =>
  gameState.public.villages[index];

export function spaceAt(
  gameState: ShangriLaGameState,
  village: number,
  type: Master,
) {
  return villageAt(gameState, village)?.spaces?.[type];
}

/** Masters plus students in a village, every colour. */
export function strengthOf(village: Village) {
  return Object.values(village.spaces || {}).reduce(
    (s, space) => s + 1 + (space.student ? 1 : 0),
    0,
  );
}

export function mastersIn(village: Village) {
  return Object.keys(village.spaces || {}).length;
}

export function tilesOf(village: Village, email: string) {
  return Object.values(village.spaces || {})
    .filter((s) => s.owner === email)
    .reduce((n, s) => n + 1 + (s.student ? 1 : 0), 0);
}

export function mastersOf(village: Village, email: string) {
  return Object.values(village.spaces || {}).filter((s) => s.owner === email)
    .length;
}

export function hasStudentOf(village: Village, email: string) {
  return Object.values(village.spaces || {}).some(
    (s) => s.owner === email && s.student,
  );
}

export function setupLimits(playerCount: number) {
  return playerCount <= 3
    ? { perColour: 1, total: 2 }
    : { perColour: 2, total: 3 };
}

/** Every (village, discipline) a player may place a master on right now. */
export function placements(
  gameState: ShangriLaGameState,
  email: string,
): [number, Master][] {
  const player = playerByEmail(gameState, email);
  if (!player) return [];
  const out: [number, Master][] = [];
  const setup = gameState.public.phase === "SETUP";
  const limits = setupLimits(gameState.public.players.length);
  gameState.public.villages.forEach((village, index) => {
    if (village.stone) return;
    if (setup) {
      if (tilesOf(village, email) >= limits.perColour) return;
      if (strengthOf(village) >= limits.total) return;
    } else if (mastersOf(village, email) === 0) {
      return;
    }
    for (const type of MASTERS) {
      if (village.spaces?.[type]) continue;
      if (player.supply[type] <= 0) continue;
      if (setup && (player.placed || []).includes(type)) continue;
      out.push([index, type]);
    }
  });
  return out;
}

/** Every (village, discipline) where a player's master could take a student. */
export function recruitable(
  gameState: ShangriLaGameState,
  email: string,
): [number, Master][] {
  const player = playerByEmail(gameState, email);
  if (!player) return [];
  const out: [number, Master][] = [];
  gameState.public.villages.forEach((village, index) => {
    if (village.stone) return;
    for (const type of MASTERS) {
      const space = village.spaces?.[type];
      if (space?.owner === email && !space.student && player.supply[type] > 0)
        out.push([index, type]);
    }
  });
  return out;
}

/** Every (from, to) journey a player may start. */
export function journeys(
  gameState: ShangriLaGameState,
  email: string,
): [number, number][] {
  const bridges = gameState.public.bridges || [];
  const out: [number, number][] = [];
  gameState.public.villages.forEach((village, index) => {
    if (village.stone || !hasStudentOf(village, email)) return;
    for (const to of neighbours(bridges, index)) out.push([index, to]);
  });
  return out;
}

export function hasAnyAction(gameState: ShangriLaGameState, email: string) {
  if (gameState.public.phase === "SETUP")
    return placements(gameState, email).length > 0;
  return (
    placements(gameState, email).length > 0 ||
    recruitable(gameState, email).length > 0 ||
    journeys(gameState, email).length > 0
  );
}

export function scoreOf(gameState: ShangriLaGameState, email: string) {
  let masters = 0;
  let villages = 0;
  for (const village of gameState.public.villages) {
    const n = mastersOf(village, email);
    masters += n;
    if (n > 0) villages += 1;
  }
  return { masters, villages };
}

// ---------------------------------------------------------------------------
// Turn flow
// ---------------------------------------------------------------------------

const fail = (reason: string): ActionResult => ({ ok: false, reason });

function finish(gameState: ShangriLaGameState, why: string) {
  const scores = new Map(
    gameState.public.players.map((p) => [p.email, scoreOf(gameState, p.email)]),
  );
  const at = (email: string) =>
    scores.get(email) as { masters: number; villages: number };
  gameState.public.scores = gameState.public.players.map((p) => ({
    email: p.email,
    ...at(p.email),
  }));
  gameState.public.status = "GAME_OVER";
  const ranked = [...gameState.public.players].sort(
    (a, b) =>
      at(b.email).masters - at(a.email).masters ||
      at(b.email).villages - at(a.email).villages,
  );
  const best = ranked[0];
  const ties = ranked.filter(
    (p) =>
      at(p.email).masters === at(best.email).masters &&
      at(p.email).villages === at(best.email).villages,
  );
  if (ties.length === 1) gameState.public.winner = best.email;
  else gameState.public.draw = true;
  announce(
    gameState,
    ties.length === 1
      ? `${best.email} wins!`
      : `${ties.map((p) => p.email).join(" and ")} share the win.`,
    `${why} ${best.email} has ${at(best.email).masters} masters in ${at(best.email).villages} villages.`,
  );
  publishLog(gameState);
}

function nextPlayer(gameState: ShangriLaGameState) {
  const players = gameState.public.players;
  const i = players.findIndex((p) => p.email === gameState.public.activePlayer);
  gameState.public.activePlayer = players[(i + 1) % players.length].email;
}

/** After an action: on to the next player, skipping anyone with nothing to do. */
function endTurn(gameState: ShangriLaGameState) {
  gameState.public.passes = 0;
  gameState.public.turn += 1;
  for (let step = 0; step < gameState.public.players.length; step++) {
    nextPlayer(gameState);
    const player = getActivePlayer(gameState) as ShangriLaPlayerState;
    if (hasAnyAction(gameState, player.email)) return;
    gameState.public.passes += 1;
    announce(gameState, `${player.email} has nothing to do and passes.`);
  }
  finish(gameState, "Nobody can act any more.");
}

/** Setup: one master of each discipline, under the placement limits. */
export function placeSetupMaster(
  gameState: ShangriLaGameState,
  village: number,
  type: Master,
): ActionResult {
  if (isGameOver(gameState)) return fail("The game is over.");
  if (gameState.public.phase !== "SETUP") return fail("The setup is over.");
  const player = getActivePlayer(gameState);
  if (!player) return fail("Active player not found.");
  if (
    !placements(gameState, player.email).some(
      ([v, t]) => v === village && t === type,
    )
  )
    return fail(
      "Each setup master must be a new discipline, on an empty matching space, within the village limits.",
    );

  const target = gameState.public.villages[village];
  target.spaces = { ...(target.spaces || {}), [type]: { owner: player.email } };
  player.supply[type] -= 1;
  player.placed = [...(player.placed || []), type];
  player.lastActionAt = Date.now();
  gameState.public.lastMove = {
    type: "setup",
    email: player.email,
    village,
    types: [type],
  };
  announce(
    gameState,
    `${player.email} places a ${label(type)} master in ${VILLAGES[village].name}.`,
  );

  const done = gameState.public.players.every(
    (p) => (p.placed || []).length === MASTERS.length,
  );
  if (done) {
    gameState.public.phase = "PLAY";
    const starter = gameState.public.players.find(
      (p) => (p.placed || [])[0] !== undefined,
    );
    gameState.public.activePlayer = (starter ?? player).email;
    // The player who placed first also opens the play.
    const first = gameState.private.log?.[0]?.title.match(
      /^Game started\. (.+) places/,
    );
    if (first && playerByEmail(gameState, first[1]))
      gameState.public.activePlayer = first[1];
    gameState.public.turn = 1;
    announce(
      gameState,
      "All masters are placed. Place, recruit, or send the students on a journey.",
    );
    return { ok: true };
  }
  nextPlayer(gameState);
  gameState.public.turn += 1;
  return { ok: true };
}

/** Place one master from supply on an empty matching space where you already have a master. */
export function placeMaster(
  gameState: ShangriLaGameState,
  village: number,
  type: Master,
): ActionResult {
  if (isGameOver(gameState)) return fail("The game is over.");
  if (gameState.public.phase !== "PLAY") return fail("Finish the setup first.");
  const player = getActivePlayer(gameState);
  if (!player) return fail("Active player not found.");
  if (
    !placements(gameState, player.email).some(
      ([v, t]) => v === village && t === type,
    )
  )
    return fail(
      "A master goes on an empty matching space in a village where you already have one.",
    );

  const target = gameState.public.villages[village];
  target.spaces = { ...(target.spaces || {}), [type]: { owner: player.email } };
  player.supply[type] -= 1;
  player.lastActionAt = Date.now();
  gameState.public.lastMove = {
    type: "place",
    email: player.email,
    village,
    types: [type],
  };
  announce(
    gameState,
    `${player.email} places a ${label(type)} master in ${VILLAGES[village].name}.`,
  );
  endTurn(gameState);
  return { ok: true };
}

/** Put up to two students from supply on your own masters without one. */
export function recruit(
  gameState: ShangriLaGameState,
  picks: [number, Master][],
): ActionResult {
  if (isGameOver(gameState)) return fail("The game is over.");
  if (gameState.public.phase !== "PLAY") return fail("Finish the setup first.");
  const player = getActivePlayer(gameState);
  if (!player) return fail("Active player not found.");
  if (!picks.length || picks.length > STUDENTS_PER_TURN)
    return fail("Recruit one or two students.");
  const allowed = recruitable(gameState, player.email);
  const keys = new Set<string>();
  for (const [village, type] of picks) {
    const key = `${village}:${type}`;
    if (keys.has(key)) return fail("Pick two different masters.");
    keys.add(key);
    if (!allowed.some(([v, t]) => v === village && t === type))
      return fail("Students go on your own masters that have none yet.");
  }
  const perType = picks.reduce(
    (m, [, t]) => ({ ...m, [t]: (m[t] || 0) + 1 }),
    {} as { [t: string]: number },
  );
  for (const [type, n] of Object.entries(perType)) {
    if (player.supply[type as Master] < n)
      return fail(`You have no more ${label(type as Master)} tiles.`);
  }

  for (const [village, type] of picks) {
    const target = gameState.public.villages[village];
    target.spaces = {
      ...(target.spaces || {}),
      [type]: {
        ...(target.spaces?.[type] as { owner: string }),
        student: true,
      },
    };
    player.supply[type] -= 1;
  }
  player.lastActionAt = Date.now();
  gameState.public.lastMove = {
    type: "recruit",
    email: player.email,
    village: picks[0][0],
    types: picks.map(([, t]) => t),
  };
  announce(
    gameState,
    `${player.email} recruits ${picks.map(([v, t]) => `a ${label(t)} student in ${VILLAGES[v].name}`).join(" and ")}.`,
  );
  endTurn(gameState);
  return { ok: true };
}

/** Send every student in a village over one bridge; the bridge breaks behind them. */
export function journey(
  gameState: ShangriLaGameState,
  from: number,
  to: number,
): ActionResult {
  if (isGameOver(gameState)) return fail("The game is over.");
  if (gameState.public.phase !== "PLAY") return fail("Finish the setup first.");
  const player = getActivePlayer(gameState);
  if (!player) return fail("Active player not found.");
  const bridges = gameState.public.bridges || [];
  if (!hasBridge(bridges, from, to)) return fail("There is no bridge there.");
  const origin = gameState.public.villages[from];
  const destination = gameState.public.villages[to];
  if (origin.stone || destination.stone)
    return fail("That village is at peace.");
  if (!hasStudentOf(origin, player.email))
    return fail(
      "You need a student of your own in the village to start a journey.",
    );

  // Strength is judged before anyone moves: tiles, then masters, then the destination.
  const stronger =
    strengthOf(origin) > strengthOf(destination) ||
    (strengthOf(origin) === strengthOf(destination) &&
      mastersIn(origin) > mastersIn(destination));

  const arrivals: Arrival[] = [];
  const originSpaces = { ...(origin.spaces || {}) };
  const destSpaces = { ...(destination.spaces || {}) };
  for (const type of MASTERS) {
    const space = originSpaces[type];
    if (!space?.student) continue;
    originSpaces[type] = { owner: space.owner };
    const there = destSpaces[type];
    const owner = space.owner;
    const traveller = playerByEmail(gameState, owner) as ShangriLaPlayerState;
    if (!there) {
      destSpaces[type] = { owner };
      arrivals.push({ type, owner, outcome: "master" });
    } else if (!stronger) {
      traveller.supply[type] += 1;
      arrivals.push({ type, owner, outcome: "returned" });
    } else if (there.owner === owner) {
      if (there.student) {
        traveller.supply[type] += 1;
        arrivals.push({ type, owner, outcome: "returned" });
      } else {
        destSpaces[type] = { owner, student: true };
        arrivals.push({ type, owner, outcome: "student" });
      }
    } else {
      const rival = playerByEmail(
        gameState,
        there.owner,
      ) as ShangriLaPlayerState;
      rival.supply[type] += 1 + (there.student ? 1 : 0);
      destSpaces[type] = { owner };
      arrivals.push({ type, owner, outcome: "displaced" });
    }
  }
  origin.spaces = originSpaces;
  destination.spaces = destSpaces;

  const remaining = bridges.filter(
    ([a, b]) => !((a === from && b === to) || (a === to && b === from)),
  );
  gameState.public.bridges = remaining;
  const stones: number[] = [];
  for (const index of [from, to]) {
    if (neighbours(remaining, index).length === 0) {
      gameState.public.villages[index].stone = true;
      stones.push(index);
    }
  }
  player.lastActionAt = Date.now();
  gameState.public.lastMove = {
    type: "journey",
    email: player.email,
    village: from,
    to,
    arrivals,
    ...(stones.length ? { stones } : {}),
  };
  const became = arrivals.filter(
    (a) => a.outcome === "master" || a.outcome === "displaced",
  ).length;
  announce(
    gameState,
    `${player.email} sends the students of ${VILLAGES[from].name} to ${VILLAGES[to].name}${stronger ? "" : " from the weaker village"}: ${arrivals.length} travel, ${became} become masters. The bridge breaks.${stones.length ? ` A Stone of the Wise Men settles on ${stones.map((s) => VILLAGES[s].name).join(" and ")}.` : ""}`,
  );

  if (remaining.length === 0) {
    finish(gameState, "The last bridge is gone.");
    return { ok: true };
  }
  endTurn(gameState);
  return { ok: true };
}
