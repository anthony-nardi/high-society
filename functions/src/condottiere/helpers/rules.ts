import {
  Card,
  CondottiereGameState,
  CondottierePlayerState,
  Season,
} from "../types";
import { LogEntry, Notification, PlayerInLobby } from "../../shared/types";
import type { ActionResult } from "../../shared/game";
import {
  fullDeck,
  isMercenary,
  largestConnected,
  mercenaryValue,
  REGIONS,
} from "./board";

/*
 * Pure rules for Condottiere (Fantasy Flight edition): everything here
 * mutates the state it is given and never touches the database.
 */

export const HAND_SIZE = 10;

export const label = (card: Card) =>
  isMercenary(card)
    ? `mercenary ${mercenaryValue(card)}`
    : card.charAt(0) + card.slice(1).toLowerCase();

export function appendLog(gameState: CondottiereGameState, entry: LogEntry) {
  gameState.private.log = [...(gameState.private.log || []), entry];
}

export function publishLog(gameState: CondottiereGameState) {
  gameState.public.log = gameState.private.log || [];
}

function announce(
  gameState: CondottiereGameState,
  title: string,
  message?: string,
) {
  const notification: Notification = { timestamp: Date.now(), title };
  if (message) notification.message = message;
  gameState.public.notification = notification;
  appendLog(gameState, notification);
}

export function playerByEmail(
  gameState: CondottiereGameState,
  email: string | undefined,
) {
  return gameState.public.players.find((p) => p.email === email);
}

export function getActivePlayer(gameState: CondottiereGameState) {
  return playerByEmail(gameState, gameState.public.activePlayer);
}

export function isGameOver(gameState: CondottiereGameState) {
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

export function winConditions(playerCount: number) {
  return playerCount >= 4
    ? { total: 5, adjacent: 3 }
    : { total: 6, adjacent: 4 };
}

export function buildCondottiereGameState(
  lobbyUID: string,
  players: PlayerInLobby[],
  random: () => number = Math.random,
): CondottiereGameState {
  const seats = players.slice(0, 6);
  const deck = shuffled(fullDeck(), random);
  const playersMetadata: CondottierePlayerState[] = seats.map((player) => ({
    email: player.email,
    lastActionAt: 0,
    hand: deck.splice(0, HAND_SIZE),
    isBot: !!player.isBot,
  }));
  const starter = playersMetadata[Math.floor(random() * seats.length)];
  const wins = winConditions(seats.length);

  return {
    public: {
      id: lobbyUID,
      game: "condottiere",
      players: playersMetadata,
      activePlayer: starter.email,
      startAt: Date.now().toString(),
      status: "IN_PROGRESS",
      phase: "CHOOSE",
      condottiere: starter.email,
      deckCount: deck.length,
      winTotal: wins.total,
      winAdjacent: wins.adjacent,
      turn: 1,
    },
    private: {
      deck,
      log: [
        {
          timestamp: Date.now(),
          title: `Game started. ${starter.email} holds the Condottiere and chooses the first battlefield.`,
        },
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function controllerOf(gameState: CondottiereGameState, region: number) {
  return gameState.public.players.find((p) =>
    (p.regions || []).includes(region),
  )?.email;
}

/** Regions a battle may be fought over: unclaimed and not under the Pope. */
export function battlefields(gameState: CondottiereGameState): number[] {
  return REGIONS.map((_, i) => i).filter(
    (r) => !controllerOf(gameState, r) && gameState.public.pope !== r,
  );
}

/** Regions the Pope may be sent to: unclaimed and not the current battlefield. */
export function popeTargets(gameState: CondottiereGameState): number[] {
  return REGIONS.map((_, i) => i).filter(
    (r) => !controllerOf(gameState, r) && gameState.public.battlefield !== r,
  );
}

/** A line's strength under the season in force. */
export function strengthOf(
  line: Card[] | undefined,
  season: Season | undefined,
) {
  const cards = line || [];
  const drummer = cards.includes("DRUMMER");
  const mercenaries = cards.filter(isMercenary).map((c) => {
    const printed = season === "WINTER" ? 1 : mercenaryValue(c);
    return drummer ? printed * 2 : printed;
  });
  let total = mercenaries.reduce((s, v) => s + v, 0);
  if (season === "SPRING" && mercenaries.length) {
    const top = Math.max(...mercenaries);
    total += 3 * mercenaries.filter((v) => v === top).length;
  }
  total += cards.filter((c) => c === "HEROINE").length * 10;
  total += cards.filter((c) => c === "COURTESAN").length;
  return total;
}

export function totals(gameState: CondottiereGameState) {
  return gameState.public.players.map((p) => ({
    email: p.email,
    strength: strengthOf(p.line, gameState.public.season),
  }));
}

export function hasWon(
  gameState: CondottiereGameState,
  player: CondottierePlayerState,
) {
  const regions = player.regions || [];
  return (
    regions.length >= gameState.public.winTotal ||
    largestConnected(regions) >= gameState.public.winAdjacent
  );
}

// ---------------------------------------------------------------------------
// Turn flow
// ---------------------------------------------------------------------------

const fail = (reason: string): ActionResult => ({ ok: false, reason });

function finish(
  gameState: CondottiereGameState,
  winner: CondottierePlayerState | null,
  why: string,
) {
  gameState.public.status = "GAME_OVER";
  if (winner) gameState.public.winner = winner.email;
  else gameState.public.draw = true;
  announce(
    gameState,
    winner ? `${winner.email} wins!` : "The game ends with no winner.",
    why,
  );
  publishLog(gameState);
}

function nextIndex(gameState: CondottiereGameState, email: string) {
  const players = gameState.public.players;
  return (players.findIndex((p) => p.email === email) + 1) % players.length;
}

function discard(gameState: CondottiereGameState, cards: Card[]) {
  gameState.private.discard = [...(gameState.private.discard || []), ...cards];
}

/** Hand the turn to the next player still in the battle, or resolve it. */
function advance(gameState: CondottiereGameState) {
  const players = gameState.public.players;
  let i = nextIndex(gameState, gameState.public.activePlayer);
  for (let step = 0; step < players.length; step++) {
    const p = players[i];
    if (!p.passed) {
      if ((p.hand || []).length === 0) {
        p.passed = true;
        appendLog(gameState, {
          timestamp: Date.now(),
          title: `${p.email} has no cards and passes.`,
        });
      } else {
        gameState.public.activePlayer = p.email;
        return;
      }
    }
    i = (i + 1) % players.length;
  }
  resolveBattle(gameState);
}

/** Deal everyone a fresh hand of ten plus one per region held, from a reshuffled deck. */
function redeal(gameState: CondottiereGameState) {
  const pool = [
    ...(gameState.private.deck || []),
    ...(gameState.private.discard || []),
  ];
  for (const p of gameState.public.players) {
    pool.push(...(p.hand || []));
    delete p.hand;
  }
  // The shuffle uses Math.random: a redeal is new chance, as the shuffle at the table would be.
  const deck = shuffled(pool, Math.random);
  gameState.private.discard = [];
  for (const p of gameState.public.players) {
    const n = HAND_SIZE + (p.regions || []).length;
    p.hand = deck.splice(0, n);
  }
  gameState.private.deck = deck;
  gameState.public.deckCount = deck.length;
  gameState.public.lastMove = {
    type: "redeal",
    email: gameState.public.condottiere,
  };
  appendLog(gameState, {
    timestamp: Date.now(),
    title:
      "New hands are dealt: ten cards each, plus one for every region held.",
  });
}

function resolveBattle(gameState: CondottiereGameState) {
  const region = gameState.public.battlefield as number;
  const result = totals(gameState);
  const top = Math.max(...result.map((t) => t.strength));
  const leaders = result.filter((t) => t.strength === top && top > 0);
  const winner =
    leaders.length === 1
      ? playerByEmail(gameState, leaders[0].email)
      : undefined;

  // Courtesans decide who chooses next; otherwise the winner, if any.
  const courtesans = gameState.public.players.map((p) => ({
    email: p.email,
    n: (p.line || []).filter((c) => c === "COURTESAN").length,
  }));
  const mostCourtesans = Math.max(...courtesans.map((c) => c.n));
  const courtesanLeaders = courtesans.filter(
    (c) => c.n === mostCourtesans && mostCourtesans > 0,
  );
  if (courtesanLeaders.length === 1)
    gameState.public.condottiere = courtesanLeaders[0].email;
  else if (winner) gameState.public.condottiere = winner.email;

  let played = 0;
  for (const p of gameState.public.players) {
    played += (p.line || []).length;
    discard(gameState, p.line || []);
    delete p.line;
    delete p.passed;
  }
  gameState.public.lastBattle = {
    region,
    totals: result,
    ...(winner ? { winner: winner.email } : {}),
  };
  if (winner) {
    winner.regions = [...(winner.regions || []), region].sort((a, b) => a - b);
    announce(
      gameState,
      `${winner.email} wins ${REGIONS[region].name} with ${top}. ${gameState.public.condottiere} holds the Condottiere.`,
    );
    if (hasWon(gameState, winner)) {
      finish(
        gameState,
        winner,
        `${winner.regions.length} regions, ${largestConnected(winner.regions)} of them adjacent.`,
      );
      return;
    }
  } else {
    announce(
      gameState,
      top > 0
        ? `The battle for ${REGIONS[region].name} is a draw at ${top}: nobody takes it.`
        : `Nobody fought for ${REGIONS[region].name}.`,
    );
  }

  delete gameState.public.battlefield;
  delete gameState.public.season;

  // Fresh hands once no more than one player has cards, or when nobody fought at all.
  const withCards = gameState.public.players.filter(
    (p) => (p.hand || []).length > 0,
  ).length;
  if (withCards <= 1 || played === 0) redeal(gameState);

  if (battlefields(gameState).length === 0) {
    const ranked = [...gameState.public.players].sort(
      (a, b) => (b.regions || []).length - (a.regions || []).length,
    );
    const best = (ranked[0].regions || []).length;
    const ties = ranked.filter((p) => (p.regions || []).length === best);
    finish(
      gameState,
      ties.length === 1 ? ranked[0] : null,
      "Every region is claimed.",
    );
    return;
  }
  gameState.public.phase = "CHOOSE";
  gameState.public.activePlayer = gameState.public.condottiere;
  gameState.public.turn += 1;
}

/** The Condottiere picks where the next battle is fought and leads it. */
export function chooseBattlefield(
  gameState: CondottiereGameState,
  region: number,
): ActionResult {
  if (isGameOver(gameState)) return fail("The game is over.");
  if (gameState.public.phase !== "CHOOSE")
    return fail("A battle is under way.");
  const player = getActivePlayer(gameState);
  if (!player) return fail("Active player not found.");
  if (!battlefields(gameState).includes(region))
    return fail("Choose an unclaimed region where the Pope is not.");

  gameState.public.battlefield = region;
  gameState.public.phase = "BATTLE";
  delete gameState.public.season;
  for (const p of gameState.public.players) {
    delete p.line;
    delete p.passed;
  }
  player.lastActionAt = Date.now();
  gameState.public.lastMove = { type: "choose", email: player.email, region };
  announce(
    gameState,
    `${player.email} calls the armies to ${REGIONS[region].name}.`,
  );
  // The chooser leads; anyone without cards sits it out.
  if ((player.hand || []).length === 0) {
    player.passed = true;
    advance(gameState);
  }
  return { ok: true };
}

/** Play a card from your hand into your line. Scarecrows name a mercenary, Bishops a region for the Pope. */
export function playCard(
  gameState: CondottiereGameState,
  index: number,
  target?: number,
): ActionResult {
  if (isGameOver(gameState)) return fail("The game is over.");
  if (gameState.public.phase !== "BATTLE")
    return fail("No battle is under way.");
  const player = getActivePlayer(gameState);
  if (!player) return fail("Active player not found.");
  if (player.passed) return fail("You have passed this battle.");
  const hand = player.hand || [];
  const card = hand[index];
  if (!card) return fail("That card is not in your hand.");

  if (card === "SCARECROW") {
    const line = player.line || [];
    if (target === undefined || !isMercenary(line[target] ?? "DRUMMER"))
      return fail(
        "A Scarecrow takes back one of your mercenaries: choose which.",
      );
  }
  if (
    card === "BISHOP" &&
    target !== undefined &&
    !popeTargets(gameState).includes(target)
  )
    return fail(
      "The Pope goes to an unclaimed region other than the battlefield.",
    );

  player.hand = hand.filter((_, i) => i !== index);
  player.lastActionAt = Date.now();
  gameState.public.lastMove = { type: "play", email: player.email, card };
  let note = `${player.email} plays ${label(card)}.`;

  switch (card) {
    case "SCARECROW": {
      const line = [...(player.line || [])];
      const [back] = line.splice(target as number, 1);
      player.line = line;
      player.hand = [...player.hand, back];
      discard(gameState, ["SCARECROW"]);
      note = `${player.email} plays a Scarecrow and takes back a ${label(back)}.`;
      break;
    }
    case "WINTER":
    case "SPRING": {
      const other: Season = card === "WINTER" ? "SPRING" : "WINTER";
      for (const p of gameState.public.players) {
        const gone = (p.line || []).filter((c) => c === other);
        if (gone.length) {
          discard(gameState, gone);
          p.line = (p.line || []).filter((c) => c !== other);
        }
      }
      gameState.public.season = card;
      player.line = [...(player.line || []), card];
      note = `${player.email} plays ${label(card)}: ${card === "WINTER" ? "every mercenary counts 1" : "the strongest mercenaries gain 3"}.`;
      break;
    }
    case "BISHOP": {
      let top = 0;
      for (const p of gameState.public.players)
        for (const c of p.line || []) top = Math.max(top, mercenaryValue(c));
      let gone = 0;
      if (top > 0) {
        for (const p of gameState.public.players) {
          const removed = (p.line || []).filter(
            (c) => mercenaryValue(c) === top,
          );
          gone += removed.length;
          discard(gameState, removed);
          p.line = (p.line || []).filter((c) => mercenaryValue(c) !== top);
        }
      }
      player.line = [...(player.line || []), card];
      if (target !== undefined) gameState.public.pope = target;
      note = `${player.email} plays a Bishop${gone ? `: every mercenary ${top} is discarded` : ""}${target !== undefined ? `, and the Pope moves to ${REGIONS[target].name}` : ""}.`;
      break;
    }
    case "SURRENDER": {
      player.line = [...(player.line || []), card];
      announce(
        gameState,
        `${player.email} plays Surrender: the battle ends now.`,
      );
      resolveBattle(gameState);
      return { ok: true };
    }
    default:
      player.line = [...(player.line || []), card];
  }
  announce(gameState, note);
  advance(gameState);
  return { ok: true };
}

/** Sit out the rest of this battle. */
export function pass(gameState: CondottiereGameState): ActionResult {
  if (isGameOver(gameState)) return fail("The game is over.");
  if (gameState.public.phase !== "BATTLE")
    return fail("No battle is under way.");
  const player = getActivePlayer(gameState);
  if (!player) return fail("Active player not found.");
  if (player.passed) return fail("You have already passed.");
  player.passed = true;
  player.lastActionAt = Date.now();
  gameState.public.lastMove = { type: "pass", email: player.email };
  announce(gameState, `${player.email} passes.`);
  advance(gameState);
  return { ok: true };
}
