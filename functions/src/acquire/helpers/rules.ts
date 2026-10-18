import {
  AcquireGameState,
  AcquirePlayerState,
  Chain,
  ChainState,
  Mode,
  Score,
  Tile,
} from "../types";
import {
  LobbyOptions,
  LogEntry,
  Notification,
  PlayerInLobby,
} from "../../shared/types";
import type { ActionResult } from "../../shared/game";
import {
  ALL_TILES,
  bonusLevels,
  CHAINS,
  compareTiles,
  isTile,
  neighbours,
  parseTile,
  priceOf,
} from "./board";

/*
 * Pure rules for Acquire: everything here mutates the state it is given and
 * never touches the database.
 */

export const STOCK_PER_CHAIN = 25;
export const SAFE_SIZE = 11;
export const END_SIZE = 41;
export const HAND_SIZE = 6;
export const STARTING_MONEY = 6000;
export const MAX_BUY = 3;

/**
 * In a two-player game the stock market is a third shareholder holding a
 * random number of shares at every payout. Its bonuses stay in the bank.
 */
export const MARKET = "the stock market";

let marketRandom: () => number = Math.random;
/** Tests pin the stock market's draw. */
export function setMarketRandom(random: () => number) {
  marketRandom = random;
}

export const money = (n: number) => `$${n.toLocaleString("en-US")}`;
export const label = (chain: Chain) =>
  chain.charAt(0) + chain.slice(1).toLowerCase();

export function appendLog(gameState: AcquireGameState, entry: LogEntry) {
  gameState.private.log = [...(gameState.private.log || []), entry];
}

export function publishLog(gameState: AcquireGameState) {
  gameState.public.log = gameState.private.log || [];
}

function announce(
  gameState: AcquireGameState,
  title: string,
  message?: string,
) {
  const notification: Notification = { timestamp: Date.now(), title };
  if (message) notification.message = message;
  gameState.public.notification = notification;
  appendLog(gameState, notification);
}

export function playerByEmail(
  gameState: AcquireGameState,
  email: string | undefined,
) {
  return gameState.public.players.find((p) => p.email === email);
}

export function getActivePlayer(gameState: AcquireGameState) {
  return playerByEmail(gameState, gameState.public.activePlayer);
}

export function getTurnPlayer(gameState: AcquireGameState) {
  return playerByEmail(gameState, gameState.public.turnPlayer);
}

export function isGameOver(gameState: AcquireGameState) {
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

export function modeFor(playerCount: number, options: LobbyOptions = {}): Mode {
  // The rulebook plays two-player games with the Classic card.
  if (playerCount <= 2) return "CLASSIC";
  return options.mode === "CLASSIC" ? "CLASSIC" : "TYCOON";
}

export function buildAcquireGameState(
  lobbyUID: string,
  players: PlayerInLobby[],
  random: () => number = Math.random,
  options: LobbyOptions = {},
): AcquireGameState {
  const seats = players.slice(0, 6);
  const bag = shuffled(ALL_TILES, random);
  // Each player draws a tile onto the board; the one nearest 1A plays first.
  const starts = seats.map((player) => ({
    email: player.email,
    tile: bag.shift() as Tile,
  }));
  const playersMetadata: AcquirePlayerState[] = seats.map((player) => ({
    email: player.email,
    lastActionAt: 0,
    money: STARTING_MONEY,
    tiles: bag.splice(0, HAND_SIZE).sort(compareTiles),
    isBot: !!player.isBot,
  }));
  const first = [...starts].sort((a, b) => compareTiles(a.tile, b.tile))[0];
  const starter = playersMetadata.find(
    (p) => p.email === first.email,
  ) as AcquirePlayerState;
  const board = Object.fromEntries(
    starts.map((s) => [s.tile, "NONE" as const]),
  ) as { [tile: Tile]: Chain | "NONE" };
  const chains = Object.fromEntries(
    CHAINS.map((c) => [c, { size: 0, stockLeft: STOCK_PER_CHAIN }]),
  ) as { [chain in Chain]: ChainState };
  const mode = modeFor(seats.length, options);

  const state: AcquireGameState = {
    public: {
      id: lobbyUID,
      game: "acquire",
      players: playersMetadata,
      activePlayer: starter.email,
      turnPlayer: starter.email,
      startAt: Date.now().toString(),
      status: "IN_PROGRESS",
      phase: "PLACE",
      mode,
      board,
      chains,
      bought: 0,
      bagCount: bag.length,
      turn: 1,
    },
    private: {
      bag,
      log: [
        {
          timestamp: Date.now(),
          title: `Game started in ${mode === "TYCOON" ? "Tycoon" : "Classic"} Mode with ${money(STARTING_MONEY)} each. Starting tiles: ${starts.map((s) => `${s.email} ${s.tile}`).join(", ")}. ${starter.email} is nearest 1A and plays first.`,
        },
      ],
    },
  };
  skipIfStuck(state);
  return state;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const chainOf = (gameState: AcquireGameState, tile: Tile) =>
  gameState.public.board?.[tile];
export const isActive = (gameState: AcquireGameState, chain: Chain) =>
  gameState.public.chains[chain].size > 0;
export const isSafe = (gameState: AcquireGameState, chain: Chain) =>
  gameState.public.chains[chain].size >= SAFE_SIZE;
export const currentPrice = (gameState: AcquireGameState, chain: Chain) =>
  priceOf(chain, gameState.public.chains[chain].size);
export const stockOf = (player: AcquirePlayerState, chain: Chain) =>
  player.stocks?.[chain] ?? 0;

export function activeChains(gameState: AcquireGameState) {
  return CHAINS.filter((c) => isActive(gameState, c));
}

export function availableChains(gameState: AcquireGameState) {
  return CHAINS.filter((c) => !isActive(gameState, c));
}

export type Placement =
  | { kind: "lone" }
  | { kind: "found" }
  | { kind: "extend"; chain: Chain }
  | { kind: "merge"; chains: Chain[]; survivors: Chain[] }
  /** Would found an eighth chain: unplayable for now. */
  | { kind: "blocked" }
  /** Would merge two safe chains: unplayable for good. */
  | { kind: "dead" };

/** What playing a tile would do. */
export function analyse(gameState: AcquireGameState, tile: Tile): Placement {
  const around = neighbours(tile).map((t) => chainOf(gameState, t));
  const chains = [
    ...new Set(around.filter((c): c is Chain => !!c && c !== "NONE")),
  ];
  const loose = around.some((c) => c === "NONE");
  if (chains.length === 0) {
    if (!loose) return { kind: "lone" };
    return availableChains(gameState).length
      ? { kind: "found" }
      : { kind: "blocked" };
  }
  if (chains.length === 1) return { kind: "extend", chain: chains[0] };
  if (chains.filter((c) => isSafe(gameState, c)).length >= 2)
    return { kind: "dead" };
  const largest = Math.max(
    ...chains.map((c) => gameState.public.chains[c].size),
  );
  const survivors = chains.filter(
    (c) => gameState.public.chains[c].size === largest,
  );
  return { kind: "merge", chains, survivors };
}

export function isPlayable(gameState: AcquireGameState, tile: Tile) {
  if (!isTile(tile) || chainOf(gameState, tile)) return false;
  const kind = analyse(gameState, tile).kind;
  return kind !== "blocked" && kind !== "dead";
}

export function playableTiles(
  gameState: AcquireGameState,
  player: AcquirePlayerState,
) {
  return (player.tiles || []).filter((t) => isPlayable(gameState, t));
}

/** A player may call the end of the game. */
export function canDeclare(gameState: AcquireGameState) {
  const active = activeChains(gameState);
  if (!active.length) return false;
  return (
    active.some((c) => gameState.public.chains[c].size >= END_SIZE) ||
    active.every((c) => isSafe(gameState, c))
  );
}

const roundUp = (n: number) => Math.ceil(n / 100) * 100;

/** In a two-player game, how many shares the stock market holds: a tile's number. */
function marketShares(gameState: AcquireGameState) {
  const bag = gameState.private.bag || [];
  const pool = bag.length ? bag : ALL_TILES;
  const tile = pool[Math.floor(marketRandom() * pool.length)];
  return { tile, shares: parseTile(tile)[0] };
}

/**
 * Bonuses for a chain at its current price: [email, amount][], following
 * the stockholder info card for the game's mode. With two players the
 * stock market competes under the name MARKET; its share is not paid.
 */
export function bonuses(
  gameState: AcquireGameState,
  chain: Chain,
): [string, number][] {
  const price = currentPrice(gameState, chain);
  const levels = bonusLevels(price, gameState.public.mode);
  const holders = gameState.public.players
    .map((p) => [p.email, stockOf(p, chain)] as [string, number])
    .filter(([, n]) => n > 0);
  if (!holders.length) return [];
  if (gameState.public.players.length === 2)
    holders.push([MARKET, marketShares(gameState).shares]);
  holders.sort((a, b) => b[1] - a[1]);

  // Rank the holders: everyone with the top count, then the next count, and so on.
  const ranks: string[][] = [];
  for (const [email, n] of holders) {
    const last = ranks[ranks.length - 1];
    if (last && stockOf2(holders, last[0]) === n) last.push(email);
    else ranks.push([email]);
  }
  const { primary, secondary, tertiary } = levels;
  const out: [string, number][] = [];
  const pay = (emails: string[], total: number) => {
    const each = roundUp(total / emails.length);
    for (const email of emails) out.push([email, each]);
  };

  if (holders.length === 1) {
    // A sole holder takes the primary plus the secondary (Classic) or tertiary (Tycoon).
    out.push([holders[0][0], primary + (tertiary ?? secondary)]);
    return out.filter(([email]) => email !== MARKET);
  }
  if (tertiary === undefined) {
    // Classic: a tie for first shares primary plus secondary and ends it there.
    if (ranks[0].length > 1) pay(ranks[0], primary + secondary);
    else {
      out.push([ranks[0][0], primary]);
      pay(ranks[1], secondary);
    }
    return out.filter(([email]) => email !== MARKET);
  }
  // Tycoon: a tertiary too, unless only two players hold the chain.
  const third = holders.length >= 3 ? tertiary : 0;
  if (ranks[0].length > 1) {
    pay(ranks[0], primary + secondary);
    if (ranks[1] && third && ranks[0].length === 2) pay(ranks[1], third);
  } else {
    out.push([ranks[0][0], primary]);
    if (ranks[1].length > 1) pay(ranks[1], secondary + third);
    else {
      out.push([ranks[1][0], secondary]);
      if (ranks[2] && third) pay(ranks[2], third);
    }
  }
  return out.filter(([email]) => email !== MARKET);
}

function stockOf2(holders: [string, number][], email: string) {
  return holders.find(([e]) => e === email)?.[1] ?? 0;
}

export function netWorth(
  gameState: AcquireGameState,
  player: AcquirePlayerState,
) {
  return (
    player.money +
    CHAINS.reduce(
      (s, c) => s + stockOf(player, c) * currentPrice(gameState, c),
      0,
    )
  );
}

// ---------------------------------------------------------------------------
// Turn flow
// ---------------------------------------------------------------------------

const fail = (reason: string): ActionResult => ({ ok: false, reason });

function payBonuses(gameState: AcquireGameState, chain: Chain) {
  const paid = bonuses(gameState, chain);
  for (const [email, amount] of paid) {
    const player = playerByEmail(gameState, email) as AcquirePlayerState;
    player.money += amount;
  }
  return paid;
}

function finish(gameState: AcquireGameState, why: string) {
  const scores: Score[] = gameState.public.players.map((p) => ({
    email: p.email,
    money: p.money,
    cashBefore: p.money,
  }));
  const scoreOf = (email: string) =>
    scores.find((s) => s.email === email) as Score;
  for (const chain of activeChains(gameState)) {
    for (const [email, amount] of payBonuses(gameState, chain)) {
      const score = scoreOf(email);
      score.bonuses = [...(score.bonuses || []), { chain, amount }];
    }
    const price = currentPrice(gameState, chain);
    for (const p of gameState.public.players) {
      const n = stockOf(p, chain);
      if (n) {
        p.money += n * price;
        gameState.public.chains[chain].stockLeft += n;
        p.stocks = { ...(p.stocks || {}), [chain]: 0 };
        const score = scoreOf(p.email);
        score.sales = [
          ...(score.sales || []),
          { chain, shares: n, price, amount: n * price },
        ];
      }
    }
  }
  for (const score of scores)
    score.money = (
      playerByEmail(gameState, score.email) as AcquirePlayerState
    ).money;
  gameState.public.scores = scores;
  gameState.public.status = "GAME_OVER";
  delete gameState.public.merger;
  const ranked = [...gameState.public.players].sort(
    (a, b) => b.money - a.money,
  );
  const best = ranked[0];
  const ties = ranked.filter((p) => p.money === best.money);
  if (ties.length === 1) gameState.public.winner = best.email;
  announce(
    gameState,
    ties.length === 1
      ? `${best.email} wins!`
      : `${ties.map((p) => p.email).join(" and ")} share the win.`,
    `${why} ${best.email} finishes with ${money(best.money)}.`,
  );
  publishLog(gameState);
}

function nextIndex(gameState: AcquireGameState, email: string) {
  const players = gameState.public.players;
  return (players.findIndex((p) => p.email === email) + 1) % players.length;
}

/** The turn player cannot play a tile: skip straight to buying. */
function skipIfStuck(gameState: AcquireGameState) {
  const player = getTurnPlayer(gameState);
  if (!player || gameState.public.phase !== "PLACE") return;
  if (playableTiles(gameState, player).length === 0) {
    gameState.public.phase = "BUY";
    gameState.public.lastMove = { type: "skip", email: player.email };
    announce(
      gameState,
      `${player.email} has no playable tile and skips to buying.`,
    );
  }
}

function drawTiles(gameState: AcquireGameState, player: AcquirePlayerState) {
  const hand = [...(player.tiles || [])];
  // Tiles that can never be played go back for new ones.
  for (let i = hand.length - 1; i >= 0; i--) {
    if (analyse(gameState, hand[i]).kind === "dead") hand.splice(i, 1);
  }
  const bag = gameState.private.bag || [];
  while (hand.length < HAND_SIZE && bag.length) {
    hand.push(bag.shift() as Tile);
  }
  gameState.private.bag = bag;
  player.tiles = hand.sort(compareTiles);
  gameState.public.bagCount = bag.length;
}

function endTurn(gameState: AcquireGameState) {
  const player = getTurnPlayer(gameState) as AcquirePlayerState;
  drawTiles(gameState, player);
  gameState.public.bought = 0;
  delete gameState.public.merger;

  // The end was called this turn: it finishes now that the turn is over.
  if (gameState.public.declaredBy) {
    finish(gameState, `${gameState.public.declaredBy} called the end.`);
    return;
  }

  // Nothing left to play anywhere: the game cannot go on.
  if (
    (gameState.private.bag || []).length === 0 &&
    gameState.public.players.every(
      (p) => playableTiles(gameState, p).length === 0,
    )
  ) {
    finish(gameState, "No tiles can be played.");
    return;
  }

  const next = gameState.public.players[nextIndex(gameState, player.email)];
  gameState.public.turnPlayer = next.email;
  gameState.public.activePlayer = next.email;
  gameState.public.phase = "PLACE";
  gameState.public.turn += 1;
  skipIfStuck(gameState);
}

function absorbLoose(gameState: AcquireGameState, tile: Tile, chain: Chain) {
  const board = gameState.public.board || {};
  const queue = [tile];
  let added = 0;
  while (queue.length) {
    const current = queue.pop() as Tile;
    for (const n of neighbours(current)) {
      if (board[n] === "NONE") {
        board[n] = chain;
        added += 1;
        queue.push(n);
      }
    }
  }
  gameState.public.board = board;
  return added;
}

function setTile(
  gameState: AcquireGameState,
  tile: Tile,
  value: Chain | "NONE",
) {
  gameState.public.board = { ...(gameState.public.board || {}), [tile]: value };
}

function removeFromHand(player: AcquirePlayerState, tile: Tile) {
  player.tiles = (player.tiles || []).filter((t) => t !== tile);
}

function toBuying(gameState: AcquireGameState) {
  gameState.public.phase = "BUY";
  gameState.public.activePlayer = gameState.public.turnPlayer;
}

/** Play a tile from your hand. */
export function placeTile(
  gameState: AcquireGameState,
  tile: Tile,
): ActionResult {
  if (isGameOver(gameState)) return fail("The game is over.");
  if (gameState.public.phase !== "PLACE")
    return fail("It is not time to play a tile.");
  const player = getActivePlayer(gameState);
  if (!player) return fail("Active player not found.");
  if (!(player.tiles || []).includes(tile))
    return fail("That tile is not in your hand.");
  const placement = analyse(gameState, tile);
  if (placement.kind === "blocked")
    return fail(
      "All seven chains are on the board; that tile cannot found another.",
    );
  if (placement.kind === "dead")
    return fail(
      "That tile would merge two safe chains and can never be played.",
    );

  removeFromHand(player, tile);
  player.lastActionAt = Date.now();
  gameState.public.lastMove = { type: "tile", email: player.email, tile };

  if (placement.kind === "lone") {
    setTile(gameState, tile, "NONE");
    announce(gameState, `${player.email} plays ${tile}.`);
    toBuying(gameState);
    return { ok: true };
  }
  if (placement.kind === "found") {
    setTile(gameState, tile, "NONE");
    gameState.public.phase = "FOUND";
    gameState.public.merger = { tile, defunct: [] };
    announce(gameState, `${player.email} plays ${tile} and founds a chain.`);
    return { ok: true };
  }
  if (placement.kind === "extend") {
    setTile(gameState, tile, placement.chain);
    const added = 1 + absorbLoose(gameState, tile, placement.chain);
    gameState.public.chains[placement.chain].size += added;
    announce(
      gameState,
      `${player.email} plays ${tile}: ${label(placement.chain)} grows to ${gameState.public.chains[placement.chain].size}.`,
    );
    toBuying(gameState);
    return { ok: true };
  }

  // A merger.
  gameState.public.merger = { tile, defunct: [] };
  if (placement.survivors.length > 1) {
    gameState.public.phase = "SURVIVOR";
    gameState.public.merger.candidates = placement.survivors;
    announce(
      gameState,
      `${player.email} plays ${tile}: ${placement.chains.map(label).join(", ")} merge. ${player.email} chooses which survives.`,
    );
    return { ok: true };
  }
  startMerger(gameState, placement.survivors[0], placement.chains);
  return { ok: true };
}

function startMerger(
  gameState: AcquireGameState,
  survivor: Chain,
  chains: Chain[],
) {
  const merger = gameState.public.merger as NonNullable<
    AcquireGameState["public"]["merger"]
  >;
  merger.survivor = survivor;
  merger.defunct = chains
    .filter((c) => c !== survivor)
    .sort(
      (a, b) =>
        gameState.public.chains[b].size - gameState.public.chains[a].size,
    );
  delete merger.candidates;
  const player = getTurnPlayer(gameState) as AcquirePlayerState;
  gameState.public.lastMove = {
    type: "merge",
    email: player.email,
    tile: merger.tile,
    chain: survivor,
  };
  announce(
    gameState,
    `${label(survivor)} takes over ${(merger.defunct || []).map(label).join(" and ")}.`,
  );
  nextDefunct(gameState);
}

/** Settle the next absorbed chain: pay its bonuses, then let each holder decide. */
function nextDefunct(gameState: AcquireGameState) {
  const merger = gameState.public.merger as NonNullable<
    AcquireGameState["public"]["merger"]
  >;
  const chain = merger.defunct?.shift();
  if (!chain) {
    completeMerger(gameState);
    return;
  }
  merger.current = chain;
  merger.price = currentPrice(gameState, chain);
  const paid = payBonuses(gameState, chain);
  if (paid.length) {
    appendLog(gameState, {
      timestamp: Date.now(),
      title: `${label(chain)} bonuses: ${paid.map(([e, n]) => `${e} ${money(n)}`).join(", ")}.`,
    });
  }
  const players = gameState.public.players;
  const start = players.findIndex(
    (p) => p.email === gameState.public.turnPlayer,
  );
  const queue: string[] = [];
  for (let i = 0; i < players.length; i++) {
    const p = players[(start + i) % players.length];
    if (stockOf(p, chain) > 0) queue.push(p.email);
  }
  merger.queue = queue;
  if (!queue.length) {
    nextDefunct(gameState);
    return;
  }
  gameState.public.phase = "DISPOSE";
  gameState.public.activePlayer = queue[0];
  gameState.public.notification = {
    timestamp: Date.now(),
    title: `${queue[0]} decides what to do with ${stockOf(playerByEmail(gameState, queue[0]) as AcquirePlayerState, chain)} ${label(chain)} shares.`,
  };
}

function completeMerger(gameState: AcquireGameState) {
  const merger = gameState.public.merger as NonNullable<
    AcquireGameState["public"]["merger"]
  >;
  const survivor = merger.survivor as Chain;
  const board = { ...(gameState.public.board || {}) };
  let size = gameState.public.chains[survivor].size;
  // Every chain that was absorbed is now empty; its tiles join the survivor.
  const absorbed = new Set<Chain>();
  for (const chain of CHAINS) {
    if (
      chain !== survivor &&
      gameState.public.chains[chain].size > 0 &&
      isAbsorbedBy(gameState, chain)
    )
      absorbed.add(chain);
  }
  for (const [tile, chain] of Object.entries(board)) {
    if (absorbed.has(chain as Chain)) {
      board[tile] = survivor;
      size += 1;
    }
  }
  board[merger.tile] = survivor;
  size += 1;
  gameState.public.board = board;
  for (const chain of absorbed) gameState.public.chains[chain].size = 0;
  gameState.public.chains[survivor].size = size;
  size += absorbLoose(gameState, merger.tile, survivor);
  gameState.public.chains[survivor].size = size;
  delete gameState.public.merger;
  announce(gameState, `${label(survivor)} now has ${size} tiles.`);
  toBuying(gameState);
}

/** During a merger, the chains being absorbed are those adjacent to the tile other than the survivor. */
function isAbsorbedBy(gameState: AcquireGameState, chain: Chain) {
  const merger = gameState.public.merger;
  if (!merger) return false;
  return neighbours(merger.tile).some((t) => chainOf(gameState, t) === chain);
}

/** Found: pick the chain for the tile just played. */
export function foundChain(
  gameState: AcquireGameState,
  chain: Chain,
): ActionResult {
  if (isGameOver(gameState)) return fail("The game is over.");
  if (gameState.public.phase !== "FOUND" || !gameState.public.merger)
    return fail("There is no chain to found.");
  const player = getActivePlayer(gameState);
  if (!player) return fail("Active player not found.");
  if (!CHAINS.includes(chain) || isActive(gameState, chain))
    return fail("That chain is already on the board.");

  const tile = gameState.public.merger.tile;
  setTile(gameState, tile, chain);
  const size = 1 + absorbLoose(gameState, tile, chain);
  gameState.public.chains[chain].size = size;
  let founderNote = "takes a founder's share";
  if (gameState.public.chains[chain].stockLeft > 0) {
    gameState.public.chains[chain].stockLeft -= 1;
    player.stocks = {
      ...(player.stocks || {}),
      [chain]: stockOf(player, chain) + 1,
    };
  } else {
    // No stock left: the founder's bonus is paid in cash at today's price.
    const cash = priceOf(chain, size);
    player.money += cash;
    founderNote = `is paid ${money(cash)} as the stock is all taken`;
  }
  player.lastActionAt = Date.now();
  gameState.public.lastMove = {
    type: "found",
    email: player.email,
    tile,
    chain,
  };
  delete gameState.public.merger;
  announce(
    gameState,
    `${player.email} founds ${label(chain)} with ${size} tiles and ${founderNote}.`,
  );
  toBuying(gameState);
  return { ok: true };
}

/** Merger with tied largest chains: the turn player picks the survivor. */
export function chooseSurvivor(
  gameState: AcquireGameState,
  chain: Chain,
): ActionResult {
  if (isGameOver(gameState)) return fail("The game is over.");
  const merger = gameState.public.merger;
  if (gameState.public.phase !== "SURVIVOR" || !merger?.candidates)
    return fail("There is no survivor to choose.");
  if (!merger.candidates.includes(chain))
    return fail("That chain is not among the largest.");
  const all = [
    ...new Set(
      neighbours(merger.tile)
        .map((t) => chainOf(gameState, t))
        .filter((c): c is Chain => !!c && c !== "NONE"),
    ),
  ];
  startMerger(gameState, chain, all);
  return { ok: true };
}

/** A shareholder settles their shares in the chain being absorbed. */
export function dispose(
  gameState: AcquireGameState,
  email: string,
  sell: number,
  trade: number,
): ActionResult {
  if (isGameOver(gameState)) return fail("The game is over.");
  const merger = gameState.public.merger;
  if (
    gameState.public.phase !== "DISPOSE" ||
    !merger?.current ||
    !merger.survivor
  )
    return fail("There is nothing to settle.");
  if (gameState.public.activePlayer !== email)
    return fail("It is not your turn to settle.");
  const player = playerByEmail(gameState, email);
  if (!player) return fail("Player not found.");
  const held = stockOf(player, merger.current);
  if (
    !Number.isInteger(sell) ||
    !Number.isInteger(trade) ||
    sell < 0 ||
    trade < 0
  )
    return fail("Whole numbers of shares, please.");
  if (sell + trade > held) return fail(`You only hold ${held} shares.`);
  if (trade % 2 !== 0) return fail("Shares trade two for one.");
  const survivorStock = gameState.public.chains[merger.survivor].stockLeft;
  if (trade / 2 > survivorStock)
    return fail(
      `Only ${survivorStock} ${label(merger.survivor)} shares are left to trade for.`,
    );

  const price = merger.price ?? currentPrice(gameState, merger.current);
  player.money += sell * price;
  player.stocks = {
    ...(player.stocks || {}),
    [merger.current]: held - sell - trade,
    [merger.survivor]: stockOf(player, merger.survivor) + trade / 2,
  };
  gameState.public.chains[merger.current].stockLeft += sell + trade;
  gameState.public.chains[merger.survivor].stockLeft -= trade / 2;
  player.lastActionAt = Date.now();
  gameState.public.lastMove = { type: "dispose", email, chain: merger.current };
  const kept = held - sell - trade;
  announce(
    gameState,
    `${email} ${[sell ? `sells ${sell}` : "", trade ? `trades ${trade} for ${trade / 2} ${label(merger.survivor)}` : "", kept ? `keeps ${kept}` : ""].filter(Boolean).join(", ")} ${label(merger.current)}.`,
  );

  merger.queue = (merger.queue || []).slice(1);
  if (merger.queue.length) {
    gameState.public.activePlayer = merger.queue[0];
    return { ok: true };
  }
  nextDefunct(gameState);
  return { ok: true };
}

/** Buy up to three shares in all, then the turn ends. */
export function buyStock(
  gameState: AcquireGameState,
  purchases: { [chain in Chain]?: number },
): ActionResult {
  if (isGameOver(gameState)) return fail("The game is over.");
  if (gameState.public.phase !== "BUY") return fail("It is not time to buy.");
  const player = getActivePlayer(gameState);
  if (!player) return fail("Active player not found.");
  let total = 0;
  let cost = 0;
  for (const [chain, n] of Object.entries(purchases) as [Chain, number][]) {
    if (!n) continue;
    if (!Number.isInteger(n) || n < 0)
      return fail("Whole numbers of shares, please.");
    if (!CHAINS.includes(chain) || !isActive(gameState, chain))
      return fail(`${chain} is not on the board.`);
    if (n > gameState.public.chains[chain].stockLeft)
      return fail(
        `Only ${gameState.public.chains[chain].stockLeft} ${label(chain)} shares are left.`,
      );
    total += n;
    cost += n * currentPrice(gameState, chain);
  }
  if (total + gameState.public.bought > MAX_BUY)
    return fail("Three shares a turn at most.");
  if (cost > player.money)
    return fail(`That costs ${money(cost)}; you have ${money(player.money)}.`);

  for (const [chain, n] of Object.entries(purchases) as [Chain, number][]) {
    if (!n) continue;
    player.stocks = {
      ...(player.stocks || {}),
      [chain]: stockOf(player, chain) + n,
    };
    gameState.public.chains[chain].stockLeft -= n;
  }
  player.money -= cost;
  gameState.public.bought += total;
  player.lastActionAt = Date.now();
  gameState.public.lastMove = { type: "buy", email: player.email };
  if (total) {
    announce(
      gameState,
      `${player.email} buys ${(Object.entries(purchases) as [Chain, number][])
        .filter(([, n]) => n)
        .map(([c, n]) => `${n} ${label(c)}`)
        .join(", ")} for ${money(cost)}.`,
    );
  } else {
    appendLog(gameState, {
      timestamp: Date.now(),
      title: `${player.email} buys nothing.`,
    });
  }
  endTurn(gameState);
  return { ok: true };
}

/** Call the end of the game, when a chain has 41 tiles or every chain is safe. */
export function declareEnd(gameState: AcquireGameState): ActionResult {
  if (isGameOver(gameState)) return fail("The game is over.");
  const player = getActivePlayer(gameState);
  if (!player) return fail("Active player not found.");
  if (gameState.public.activePlayer !== gameState.public.turnPlayer)
    return fail("Only the turn player may call the end.");
  if (gameState.public.phase !== "PLACE" && gameState.public.phase !== "BUY")
    return fail("Finish the merger first.");
  if (!canDeclare(gameState))
    return fail(
      "The end can be called once a chain has 41 tiles or every chain is safe.",
    );
  if (gameState.public.declaredBy)
    return fail("The end has already been called.");
  gameState.public.declaredBy = player.email;
  gameState.public.lastMove = { type: "declare", email: player.email };
  announce(
    gameState,
    `${player.email} calls the end of the game.`,
    "The game ends when this turn does.",
  );
  return { ok: true };
}
