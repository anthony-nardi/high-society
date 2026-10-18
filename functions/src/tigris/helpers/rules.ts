import {
  Colour,
  Conflict,
  Dynasty,
  Result,
  TigrisGameState,
  TigrisPlayerState,
} from "../types";
import { LogEntry, Notification, PlayerInLobby } from "../../shared/types";
import type { ActionResult } from "../../shared/game";
import {
  ACTIONS_PER_TURN,
  BoardView,
  CATASTROPHES,
  COLOURS,
  canPlaceLeader,
  canPlaceTile,
  compareSpheres,
  components,
  finalSpheres,
  HAND_SIZE,
  inBounds,
  isBorder,
  kingdomsAround,
  label,
  LEADER_NAME,
  MONUMENT_PAIRS,
  neighbours,
  parse,
  POINT_NAME,
  SHEDU,
  squareCells,
  squaresAt,
  supporters,
  templesAdjacent,
  TILE_COUNTS,
  TILE_NAME,
  tileAt,
} from "./board";

/*
 * Pure rules for Tigris & Euphrates after the 2015 Fantasy Flight rulebook:
 * two actions a turn, revolts fought with temples, wars fought with
 * supporters, monuments on 2x2 squares, treasures to traders, and the
 * lowest sphere decides the winner. Everything mutates the state it is
 * given; nothing touches the database.
 */

const DYNASTIES: Dynasty[] = ["ARCHER", "BULL", "LION", "POT"];

export function appendLog(gameState: TigrisGameState, entry: LogEntry) {
  gameState.private.log = [...(gameState.private.log || []), entry];
}

export function publishLog(gameState: TigrisGameState) {
  gameState.public.log = gameState.private.log || [];
}

function announce(gameState: TigrisGameState, title: string, message?: string) {
  const notification: Notification = { timestamp: Date.now(), title };
  if (message) notification.message = message;
  gameState.public.notification = notification;
  appendLog(gameState, notification);
}

const log = (gameState: TigrisGameState, title: string) =>
  appendLog(gameState, { timestamp: Date.now(), title });

export function playerByEmail(
  gameState: TigrisGameState,
  email: string | undefined,
) {
  return gameState.public.players.find((p) => p.email === email);
}

export function getActivePlayer(gameState: TigrisGameState) {
  return playerByEmail(gameState, gameState.public.activePlayer);
}

export function getTurnPlayer(gameState: TigrisGameState) {
  return playerByEmail(gameState, gameState.public.turnPlayer);
}

export function isGameOver(gameState: TigrisGameState) {
  return gameState.public.status === "GAME_OVER";
}

function shuffled<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const list = (names: string[]) =>
  names.length <= 1
    ? names.join("")
    : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const colourIndex = (c: Colour) => COLOURS.indexOf(c);
const sortHand = (hand: Colour[]) =>
  [...hand].sort((a, b) => colourIndex(a) - colourIndex(b));

export function buildTigrisGameState(
  lobbyUID: string,
  players: PlayerInLobby[],
  random: () => number = Math.random,
): TigrisGameState {
  const seats = players.slice(0, 4);
  const box: Colour[] = [];
  for (const colour of COLOURS) {
    const n = TILE_COUNTS[colour] - (colour === "RED" ? SHEDU.length : 0);
    for (let i = 0; i < n; i++) box.push(colour);
  }
  const bag = shuffled(box, random);
  const playersMetadata: TigrisPlayerState[] = seats.map((player, i) => ({
    email: player.email,
    lastActionAt: 0,
    isBot: !!player.isBot,
    dynasty: DYNASTIES[i],
    hand: sortHand(bag.splice(0, HAND_SIZE)),
    catastrophes: CATASTROPHES,
    points: { RED: 0, BLUE: 0, GREEN: 0, BLACK: 0 },
    treasures: 0,
  }));
  const starter = playersMetadata[Math.floor(random() * seats.length)];
  const tiles: TigrisGameState["public"]["tiles"] = {};
  for (const cell of SHEDU) tiles[cell] = { colour: "RED", treasure: true };

  return {
    public: {
      id: lobbyUID,
      game: "tigris",
      players: playersMetadata,
      activePlayer: starter.email,
      turnPlayer: starter.email,
      startAt: Date.now().toString(),
      status: "IN_PROGRESS",
      phase: "ACTION",
      actionsLeft: ACTIONS_PER_TURN,
      turn: 0,
      tiles,
      monumentsLeft: MONUMENT_PAIRS.map((p) => [...p] as [Colour, Colour]),
      bagCount: bag.length,
    },
    private: {
      bag,
      log: [
        {
          timestamp: Date.now(),
          title: `Game started: ten temples with treasures on the Shedu spaces, six tiles each. ${starter.email} plays first.`,
        },
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// Small mutations
// ---------------------------------------------------------------------------

const pub = (gameState: TigrisGameState) => gameState.public;

function setTile(
  gameState: TigrisGameState,
  cell: string,
  tile: NonNullable<TigrisGameState["public"]["tiles"]>[string],
) {
  gameState.public.tiles = { ...(gameState.public.tiles || {}), [cell]: tile };
}

function removeTile(gameState: TigrisGameState, cell: string) {
  const tiles = { ...(gameState.public.tiles || {}) };
  delete tiles[cell];
  if (Object.keys(tiles).length) gameState.public.tiles = tiles;
  else delete gameState.public.tiles;
}

function setLeader(
  gameState: TigrisGameState,
  cell: string,
  leader: { email: string; colour: Colour },
) {
  gameState.public.leaders = {
    ...(gameState.public.leaders || {}),
    [cell]: leader,
  };
}

function removeLeader(gameState: TigrisGameState, cell: string) {
  const leaders = { ...(gameState.public.leaders || {}) };
  delete leaders[cell];
  if (Object.keys(leaders).length) gameState.public.leaders = leaders;
  else delete gameState.public.leaders;
}

/** Where a player's leader of a colour stands, if on the board. */
export function leaderCellOf(
  board: BoardView,
  email: string,
  colour: Colour,
): string | undefined {
  for (const [cell, l] of Object.entries(board.leaders || {}))
    if (l.email === email && l.colour === colour) return cell;
  return undefined;
}

export function countInHand(player: TigrisPlayerState, colour: Colour) {
  return (player.hand || []).filter((c) => c === colour).length;
}

function takeFromHand(player: TigrisPlayerState, colour: Colour, n = 1) {
  const hand = [...(player.hand || [])];
  for (let i = 0; i < n; i++) {
    const at = hand.indexOf(colour);
    if (at === -1) break;
    hand.splice(at, 1);
  }
  if (hand.length) player.hand = hand;
  else delete player.hand;
}

/** Draws up to n tiles; short when the bag ran out, which ends the game. */
function draw(gameState: TigrisGameState, n: number) {
  const bag = gameState.private.bag || [];
  const drawn = bag.splice(0, n);
  if (bag.length) gameState.private.bag = bag;
  else delete gameState.private.bag;
  gameState.public.bagCount = bag.length;
  return { drawn, short: n - drawn.length };
}

function gain(
  gameState: TigrisGameState,
  email: string,
  colour: Colour,
  n: number,
) {
  const player = playerByEmail(gameState, email);
  if (!player || n <= 0) return;
  player.points = {
    ...player.points,
    [colour]: (player.points[colour] || 0) + n,
  };
}

function nextSeat(gameState: TigrisGameState, email: string) {
  const players = gameState.public.players;
  const i = players.findIndex((p) => p.email === email);
  return players[(i + 1) % players.length];
}

/** Leaders with no faceup temple beside them go back to their players. */
function withdrawOrphans(gameState: TigrisGameState) {
  for (const [cell, leader] of Object.entries(pub(gameState).leaders || {})) {
    if (templesAdjacent(pub(gameState), cell) > 0) continue;
    removeLeader(gameState, cell);
    log(
      gameState,
      `${leader.email}'s ${LEADER_NAME[leader.colour]} is withdrawn: no temple beside it.`,
    );
  }
}

function treasuresOnBoard(gameState: TigrisGameState) {
  return Object.values(pub(gameState).tiles || {}).filter((t) => t.treasure)
    .length;
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

function actionGuard(
  gameState: TigrisGameState,
): { ok: true; player: TigrisPlayerState } | { ok: false; reason: string } {
  if (isGameOver(gameState)) return { ok: false, reason: "The game is over." };
  if (pub(gameState).phase !== "ACTION")
    return { ok: false, reason: "Something must be resolved first." };
  const player = getTurnPlayer(gameState);
  if (!player || player.email !== pub(gameState).activePlayer)
    return { ok: false, reason: "It is not your turn." };
  return { ok: true, player };
}

const isColour = (c: unknown): c is Colour =>
  typeof c === "string" && (COLOURS as string[]).includes(c);

const validCell = (cell: unknown): cell is string => {
  if (typeof cell !== "string" || !/^\d+_\d+$/.test(cell)) return false;
  const [r, c] = parse(cell);
  return inBounds(r, c);
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export function placeTile(
  gameState: TigrisGameState,
  cell: string,
  colour: Colour,
): ActionResult {
  const guard = actionGuard(gameState);
  if (!guard.ok) return guard;
  const player = guard.player;
  if (!isColour(colour) || !validCell(cell))
    return { ok: false, reason: "Choose a tile and a space." };
  if (countInHand(player, colour) === 0)
    return { ok: false, reason: `You hold no ${TILE_NAME[colour]}.` };
  const board = pub(gameState);
  const found = components(board);
  const legal = canPlaceTile(board, cell, colour, found);
  if (!legal.ok) return legal;
  const kingdoms = kingdomsAround(board, cell, found);

  takeFromHand(player, colour);
  setTile(gameState, cell, { colour });
  player.lastActionAt = Date.now();
  const action: NonNullable<TigrisGameState["public"]["lastAction"]> = {
    email: player.email,
    type: "TILE",
    cell,
    colour,
    turn: board.turn,
  };
  board.lastAction = action;

  let title = `${player.email} places a ${TILE_NAME[colour]} at ${label(cell)}`;
  if (kingdoms.length === 2) {
    board.unification = cell;
    title += ", uniting two kingdoms";
  } else if (kingdoms.length === 1) {
    const k = kingdoms[0];
    const taker =
      k.leaders.find((l) => l.colour === colour) ??
      k.leaders.find((l) => l.colour === "BLACK");
    if (taker) {
      gain(gameState, taker.email, colour, 1);
      action.points = 1;
      action.pointsTo = taker.email;
      title +=
        taker.email === player.email
          ? ` and gains a ${POINT_NAME[colour]}`
          : `: ${taker.email} gains a ${POINT_NAME[colour]}`;
    }
  }
  announce(gameState, `${title}.`);
  board.pending = { cell };
  continueAction(gameState);
  return { ok: true };
}

export function positionLeader(
  gameState: TigrisGameState,
  colour: Colour,
  cell: string,
): ActionResult {
  const guard = actionGuard(gameState);
  if (!guard.ok) return guard;
  const player = guard.player;
  if (!isColour(colour) || !validCell(cell))
    return { ok: false, reason: "Choose a leader and a space." };
  const board = pub(gameState);
  const current = leaderCellOf(board, player.email, colour);
  if (current === cell)
    return { ok: false, reason: "That leader already stands there." };
  // Judge the move with the leader lifted off the board.
  const view: BoardView = {
    tiles: board.tiles,
    leaders: { ...(board.leaders || {}) },
    blocked: board.blocked,
  };
  if (current && view.leaders) delete view.leaders[current];
  const legal = canPlaceLeader(view, cell);
  if (!legal.ok) return legal;

  if (current) removeLeader(gameState, current);
  setLeader(gameState, cell, { email: player.email, colour });
  player.lastActionAt = Date.now();
  board.lastAction = {
    email: player.email,
    type: "LEADER",
    cell,
    colour,
    turn: board.turn,
  };
  const verb = current ? "moves" : "positions";
  announce(
    gameState,
    `${player.email} ${verb} the ${LEADER_NAME[colour]} to ${label(cell)}.`,
  );

  const found = components(board);
  const comp = found.comps[found.at[cell]];
  const rival = comp.leaders.find(
    (l) => l.colour === colour && l.cell !== cell,
  );
  board.pending = {};
  if (rival) {
    board.conflict = {
      kind: "REVOLT",
      colour,
      attacker: player.email,
      defender: rival.email,
      attackerCell: cell,
      defenderCell: rival.cell,
      attackerBase: templesAdjacent(board, cell),
      defenderBase: templesAdjacent(board, rival.cell),
      stage: "ATTACKER",
    };
    board.phase = "CONFLICT";
    board.activePlayer = player.email;
    announce(
      gameState,
      `A revolt breaks out: ${player.email}'s ${LEADER_NAME[colour]} challenges ${rival.email}'s.`,
    );
    return { ok: true };
  }
  continueAction(gameState);
  return { ok: true };
}

export function withdrawLeader(
  gameState: TigrisGameState,
  colour: Colour,
): ActionResult {
  const guard = actionGuard(gameState);
  if (!guard.ok) return guard;
  const player = guard.player;
  if (!isColour(colour)) return { ok: false, reason: "Choose a leader." };
  const current = leaderCellOf(pub(gameState), player.email, colour);
  if (!current)
    return { ok: false, reason: "That leader is not on the board." };
  removeLeader(gameState, current);
  player.lastActionAt = Date.now();
  pub(gameState).lastAction = {
    email: player.email,
    type: "WITHDRAW",
    cell: current,
    colour,
    turn: pub(gameState).turn,
  };
  announce(
    gameState,
    `${player.email} withdraws the ${LEADER_NAME[colour]} from ${label(current)}.`,
  );
  pub(gameState).pending = {};
  continueAction(gameState);
  return { ok: true };
}

export function playCatastrophe(
  gameState: TigrisGameState,
  cell: string,
): ActionResult {
  const guard = actionGuard(gameState);
  if (!guard.ok) return guard;
  const player = guard.player;
  if (!validCell(cell)) return { ok: false, reason: "Choose a space." };
  if (player.catastrophes <= 0)
    return { ok: false, reason: "You have no catastrophe tiles left." };
  const board = pub(gameState);
  if ((board.blocked || []).includes(cell))
    return { ok: false, reason: "That space is already destroyed." };
  if (board.leaders?.[cell])
    return { ok: false, reason: "A catastrophe cannot be played on a leader." };
  const tile = tileAt(board, cell);
  if (tile?.treasure)
    return { ok: false, reason: "A catastrophe cannot destroy a treasure." };
  if (tile?.down)
    return { ok: false, reason: "A catastrophe cannot destroy a monument." };

  if (tile) removeTile(gameState, cell);
  board.blocked = [...(board.blocked || []), cell];
  player.catastrophes -= 1;
  player.lastActionAt = Date.now();
  board.lastAction = {
    email: player.email,
    type: "CATASTROPHE",
    cell,
    ...(tile ? { colour: tile.colour } : {}),
    turn: board.turn,
  };
  announce(
    gameState,
    `${player.email} plays a catastrophe at ${label(cell)}${
      tile ? `, destroying a ${TILE_NAME[tile.colour]}` : ""
    }.`,
  );
  withdrawOrphans(gameState);
  board.pending = {};
  continueAction(gameState);
  return { ok: true };
}

export function replaceTiles(
  gameState: TigrisGameState,
  indexes: number[],
): ActionResult {
  const guard = actionGuard(gameState);
  if (!guard.ok) return guard;
  const player = guard.player;
  const hand = player.hand || [];
  const chosen = [...new Set(indexes)].filter(
    (i) => Number.isInteger(i) && i >= 0 && i < hand.length,
  );
  if (!chosen.length || chosen.length !== indexes.length)
    return { ok: false, reason: "Choose which tiles to replace." };
  const kept = hand.filter((_, i) => !chosen.includes(i));
  const { drawn, short } = draw(gameState, chosen.length);
  const next = sortHand([...kept, ...drawn]);
  if (next.length) player.hand = next;
  else delete player.hand;
  player.lastActionAt = Date.now();
  pub(gameState).lastAction = {
    email: player.email,
    type: "REPLACE",
    turn: pub(gameState).turn,
  };
  announce(
    gameState,
    `${player.email} replaces ${plural(chosen.length, "tile")}.`,
  );
  if (short > 0) {
    finish(gameState, "The bag is empty.");
    return { ok: true };
  }
  pub(gameState).pending = {};
  continueAction(gameState);
  return { ok: true };
}

export function endTurn(gameState: TigrisGameState): ActionResult {
  const guard = actionGuard(gameState);
  if (!guard.ok) return guard;
  guard.player.lastActionAt = Date.now();
  if (pub(gameState).actionsLeft >= ACTIONS_PER_TURN)
    log(gameState, `${guard.player.email} passes the turn.`);
  endOfTurn(gameState);
  return { ok: true };
}

export function commitTiles(
  gameState: TigrisGameState,
  email: string,
  count: number,
): ActionResult {
  if (isGameOver(gameState)) return { ok: false, reason: "The game is over." };
  const board = pub(gameState);
  const c = board.conflict;
  if (board.phase !== "CONFLICT" || !c)
    return { ok: false, reason: "There is no conflict to commit to." };
  const expected = c.stage === "ATTACKER" ? c.attacker : c.defender;
  if (email !== expected || board.activePlayer !== email)
    return { ok: false, reason: "It is not your commitment to make." };
  const player = playerByEmail(gameState, email);
  if (!player) return { ok: false, reason: "Player not found." };
  const available = countInHand(player, c.colour);
  if (!Number.isInteger(count) || count < 0 || count > available)
    return {
      ok: false,
      reason: `You can commit up to ${plural(available, TILE_NAME[c.colour])}.`,
    };
  takeFromHand(player, c.colour, count);
  player.lastActionAt = Date.now();
  log(
    gameState,
    count
      ? `${email} commits ${plural(count, TILE_NAME[c.colour])}.`
      : `${email} commits nothing.`,
  );
  if (c.stage === "ATTACKER") {
    c.attackerCommit = count;
    c.stage = "DEFENDER";
    board.activePlayer = c.defender;
    board.notification = {
      timestamp: Date.now(),
      title: count
        ? `${email} commits ${plural(count, TILE_NAME[c.colour])}.`
        : `${email} commits nothing.`,
    };
    return { ok: true };
  }
  c.defenderCommit = count;
  resolveConflict(gameState);
  return { ok: true };
}

export function chooseWar(
  gameState: TigrisGameState,
  colour: Colour,
): ActionResult {
  if (isGameOver(gameState)) return { ok: false, reason: "The game is over." };
  const board = pub(gameState);
  if (
    board.phase !== "WAR_CHOICE" ||
    !(board.warChoices || []).includes(colour)
  )
    return { ok: false, reason: "That war is not on offer." };
  startWar(gameState, colour);
  return { ok: true };
}

export function buildMonument(
  gameState: TigrisGameState,
  square: string,
  colours: [Colour, Colour],
): ActionResult {
  if (isGameOver(gameState)) return { ok: false, reason: "The game is over." };
  const board = pub(gameState);
  const offer = board.monumentOffer;
  if (board.phase !== "MONUMENT" || !offer)
    return { ok: false, reason: "There is no monument to build." };
  if (!offer.squares.includes(square))
    return { ok: false, reason: "That square is not complete." };
  if (
    !Array.isArray(colours) ||
    colours.length !== 2 ||
    !isColour(colours[0]) ||
    !isColour(colours[1])
  )
    return { ok: false, reason: "Choose a monument." };
  const pairIndex = (board.monumentsLeft || []).findIndex(
    (p) =>
      (p[0] === colours[0] && p[1] === colours[1]) ||
      (p[0] === colours[1] && p[1] === colours[0]),
  );
  if (pairIndex === -1)
    return { ok: false, reason: "That monument is already built." };
  const pair = (board.monumentsLeft || [])[pairIndex];
  if (!pair.includes(offer.colour))
    return {
      ok: false,
      reason: `The monument must be partly ${offer.colour.toLowerCase()}.`,
    };
  const player = getTurnPlayer(gameState);
  for (const cell of squareCells(square)) {
    const tile = tileAt(board, cell);
    if (!tile) return { ok: false, reason: "That square is not complete." };
    setTile(gameState, cell, { ...tile, down: true });
  }
  board.monuments = [
    ...(board.monuments || []),
    { cell: square, colours: pair },
  ];
  const left = (board.monumentsLeft || []).filter((_, i) => i !== pairIndex);
  if (left.length) board.monumentsLeft = left;
  else delete board.monumentsLeft;
  delete board.monumentOffer;
  board.lastAction = {
    email: player?.email ?? board.turnPlayer,
    type: "MONUMENT",
    cell: square,
    colour: offer.colour,
    turn: board.turn,
  };
  announce(
    gameState,
    `${board.turnPlayer} builds a ${pair[0].toLowerCase()} and ${pair[1].toLowerCase()} monument at ${label(square)}.`,
  );
  withdrawOrphans(gameState);
  continueAction(gameState);
  return { ok: true };
}

export function skipMonument(gameState: TigrisGameState): ActionResult {
  if (isGameOver(gameState)) return { ok: false, reason: "The game is over." };
  const board = pub(gameState);
  if (board.phase !== "MONUMENT")
    return { ok: false, reason: "There is no monument to skip." };
  delete board.monumentOffer;
  log(gameState, `${board.turnPlayer} leaves the square as it is.`);
  continueAction(gameState);
  return { ok: true };
}

export function takeTreasure(
  gameState: TigrisGameState,
  email: string,
  cell: string,
): ActionResult {
  if (isGameOver(gameState)) return { ok: false, reason: "The game is over." };
  const board = pub(gameState);
  const offer = board.treasureOffer;
  if (board.phase !== "TREASURE" || !offer)
    return { ok: false, reason: "There is no treasure to take." };
  if (offer.owner !== email || board.activePlayer !== email)
    return { ok: false, reason: "That treasure is not yours to take." };
  if (!offer.cells.includes(cell))
    return { ok: false, reason: "That treasure is not on offer." };
  grabTreasure(gameState, email, cell);
  delete board.treasureOffer;
  continueAction(gameState);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Conflicts
// ---------------------------------------------------------------------------

function startWar(gameState: TigrisGameState, colour: Colour) {
  const board = pub(gameState);
  const uniting = board.unification as string;
  const found = components(board);
  const comp = found.comps[found.at[uniting]];
  const pair = comp.leaders.filter((l) => l.colour === colour);
  if (pair.length < 2) {
    delete board.warChoices;
    continueAction(gameState);
    return;
  }
  // The turn player attacks if involved; otherwise the next player around who is.
  let attacker = pair.find((l) => l.email === board.turnPlayer);
  if (!attacker) {
    let seat = nextSeat(gameState, board.turnPlayer);
    for (let i = 0; i < board.players.length && !attacker; i++) {
      attacker = pair.find((l) => l.email === seat.email);
      seat = nextSeat(gameState, seat.email);
    }
  }
  const a = attacker ?? pair[0];
  const d = pair.find((l) => l !== a) as (typeof pair)[number];
  board.conflict = {
    kind: "WAR",
    colour,
    attacker: a.email,
    defender: d.email,
    attackerCell: a.cell,
    defenderCell: d.cell,
    attackerBase: supporters(board, a.cell, colour, uniting).length,
    defenderBase: supporters(board, d.cell, colour, uniting).length,
    stage: "ATTACKER",
  };
  delete board.warChoices;
  board.phase = "CONFLICT";
  board.activePlayer = a.email;
  announce(
    gameState,
    `War breaks out between the ${LEADER_NAME[colour]}s: ${a.email} attacks ${d.email}.`,
  );
}

function resolveConflict(gameState: TigrisGameState) {
  const board = pub(gameState);
  const c = board.conflict as Conflict;
  const aStrength = c.attackerBase + (c.attackerCommit || 0);
  const dStrength = c.defenderBase + (c.defenderCommit || 0);
  const attackerWins = aStrength > dStrength;
  const winner = attackerWins ? c.attacker : c.defender;
  const loser = attackerWins ? c.defender : c.attacker;
  const loserCell = attackerWins ? c.defenderCell : c.attackerCell;

  let removed = 0;
  const removedCells: string[] = [];
  if (c.kind === "WAR") {
    const doomed = supporters(board, loserCell, c.colour, board.unification);
    removeLeader(gameState, loserCell);
    for (const cell of doomed) {
      const tile = tileAt(board, cell);
      if (!tile) continue;
      if (c.colour === "RED") {
        // Temples with a treasure or another leader beside them stand.
        const sheltered =
          tile.treasure ||
          neighbours(cell).some((n) => {
            const l = board.leaders?.[n];
            return !!l && l.colour !== "RED";
          });
        if (sheltered) continue;
      }
      removeTile(gameState, cell);
      removed += 1;
      removedCells.push(cell);
    }
  } else {
    removeLeader(gameState, loserCell);
  }
  const gained = c.kind === "WAR" ? 1 + removed : 1;
  gain(gameState, winner, c.colour, gained);
  board.lastConflict = {
    ...c,
    winner,
    loser,
    winnerCell: attackerWins ? c.attackerCell : c.defenderCell,
    loserCell,
    removed,
    gained,
    turn: board.turn,
    ...(removedCells.length ? { removedCells } : {}),
  };
  delete board.conflict;
  announce(
    gameState,
    `${winner} wins the ${c.kind === "WAR" ? "war" : "revolt"} ${aStrength} to ${dStrength}: ${loser} withdraws the ${LEADER_NAME[c.colour]}${
      removed ? ` and loses ${plural(removed, TILE_NAME[c.colour])}` : ""
    }. ${winner} gains ${plural(gained, POINT_NAME[c.colour])}.`,
  );
  withdrawOrphans(gameState);
  continueAction(gameState);
}

// ---------------------------------------------------------------------------
// The rest of an action: wars, monument, treasures, then the next action
// ---------------------------------------------------------------------------

function grabTreasure(gameState: TigrisGameState, email: string, cell: string) {
  const board = pub(gameState);
  const tile = tileAt(board, cell);
  if (!tile?.treasure) return;
  const { treasure: _gone, ...rest } = tile;
  void _gone;
  setTile(gameState, cell, rest);
  const player = playerByEmail(gameState, email);
  if (player) player.treasures += 1;
  board.lastAction = {
    email,
    type: "TREASURE",
    cell,
    turn: board.turn,
  };
  announce(gameState, `${email} takes the treasure at ${label(cell)}.`);
}

/** A kingdom with several treasures and a trader hands them over, one by one. */
function distributeTreasures(gameState: TigrisGameState): boolean {
  const board = pub(gameState);
  for (let guard = 0; guard < 20; guard++) {
    const found = components(board);
    let acted = false;
    for (const comp of found.comps) {
      const trader = comp.leaders.find((l) => l.colour === "GREEN");
      if (!trader) continue;
      const treasures = comp.cells.filter(
        (cell) => tileAt(board, cell)?.treasure,
      );
      if (treasures.length < 2) continue;
      const border = treasures.filter(isBorder);
      if (border.length) {
        grabTreasure(gameState, trader.email, border[0]);
        acted = true;
        break;
      }
      board.phase = "TREASURE";
      board.activePlayer = trader.email;
      board.treasureOffer = { cells: treasures, owner: trader.email };
      return true;
    }
    if (!acted) return false;
  }
  return false;
}

export function continueAction(gameState: TigrisGameState) {
  const board = pub(gameState);
  if (isGameOver(gameState)) return;

  if (board.unification) {
    const found = components(board);
    const comp = found.comps[found.at[board.unification]];
    const pairs = comp
      ? COLOURS.filter(
          (colour) =>
            comp.leaders.filter((l) => l.colour === colour).length > 1,
        )
      : [];
    if (pairs.length === 1) {
      startWar(gameState, pairs[0]);
      return;
    }
    if (pairs.length > 1) {
      board.phase = "WAR_CHOICE";
      board.activePlayer = board.turnPlayer;
      board.warChoices = pairs;
      return;
    }
    delete board.unification;
  }

  if (board.pending?.cell && !board.pending.monumentChecked) {
    board.pending.monumentChecked = true;
    const tile = tileAt(board, board.pending.cell);
    if (tile && !tile.down) {
      const squares = squaresAt(board, board.pending.cell);
      const available = (board.monumentsLeft || []).some((p) =>
        p.includes(tile.colour),
      );
      if (squares.length && available) {
        board.phase = "MONUMENT";
        board.activePlayer = board.turnPlayer;
        board.monumentOffer = { squares, colour: tile.colour };
        return;
      }
    }
  }

  if (distributeTreasures(gameState)) return;

  delete board.pending;
  delete board.treasureOffer;
  board.phase = "ACTION";
  board.activePlayer = board.turnPlayer;
  board.actionsLeft -= 1;
  if (board.actionsLeft <= 0) endOfTurn(gameState);
}

function endOfTurn(gameState: TigrisGameState) {
  const board = pub(gameState);
  const player = getTurnPlayer(gameState);
  if (!player) return;

  // Monuments pay their matching leaders.
  const found = components(board);
  const earned: string[] = [];
  for (const [cell, leader] of Object.entries(board.leaders || {})) {
    if (leader.email !== player.email) continue;
    const id = found.at[cell];
    for (const m of board.monuments || []) {
      if (found.at[m.cell] !== id || !m.colours.includes(leader.colour))
        continue;
      gain(gameState, player.email, leader.colour, 1);
      earned.push(POINT_NAME[leader.colour]);
    }
  }
  if (earned.length)
    log(
      gameState,
      `${player.email}'s monuments pay ${list(earned.map((e) => `a ${e}`))}.`,
    );

  // Everyone refills; an empty bag ends the game.
  const order = [player, ...board.players.filter((p) => p !== player)];
  for (const p of order) {
    const need = HAND_SIZE - (p.hand || []).length;
    if (need <= 0) continue;
    const { drawn, short } = draw(gameState, need);
    const hand = sortHand([...(p.hand || []), ...drawn]);
    if (hand.length) p.hand = hand;
    if (short > 0) {
      finish(gameState, "The bag is empty.");
      return;
    }
  }

  if (treasuresOnBoard(gameState) <= 2) {
    finish(gameState, "Only two treasures remain.");
    return;
  }

  const next = nextSeat(gameState, player.email);
  board.turnPlayer = next.email;
  board.activePlayer = next.email;
  board.actionsLeft = ACTIONS_PER_TURN;
  board.phase = "ACTION";
  board.turn += 1;
}

// ---------------------------------------------------------------------------
// The end
// ---------------------------------------------------------------------------

export function resultsOf(gameState: TigrisGameState): Result[] {
  return gameState.public.players
    .map((p) => ({
      email: p.email,
      spheres: finalSpheres(p.points, p.treasures),
      treasures: p.treasures,
    }))
    .sort((a, b) => compareSpheres(b.spheres, a.spheres));
}

function finish(gameState: TigrisGameState, why: string) {
  const board = pub(gameState);
  board.status = "GAME_OVER";
  board.phase = "ACTION";
  delete board.conflict;
  delete board.monumentOffer;
  delete board.treasureOffer;
  delete board.pending;
  delete board.unification;
  delete board.warChoices;
  const results = resultsOf(gameState);
  board.results = results;
  const best = results[0];
  const winners = results.filter(
    (r) => compareSpheres(r.spheres, best.spheres) === 0,
  );
  board.winners = winners.map((w) => w.email);
  if (winners.length === 1) board.winner = best.email;
  announce(
    gameState,
    winners.length === 1
      ? `Game over: ${best.email} wins with a lowest sphere of ${best.spheres[0]}.`
      : `Game over: ${list(winners.map((w) => w.email))} share the win.`,
    why,
  );
  publishLog(gameState);
}
