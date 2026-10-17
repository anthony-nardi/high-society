import { appendFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GAMES } from "../registry";
import { GAME_INFO, GAME_NAMES } from "../gameInfo";
import { GameName, GenericGameState, PlayerInLobby } from "../types";
import { GameModule } from "../game";

/*
 * Simulation: every game is played to the end many times with random legal
 * moves found by fuzzing the actions with random payloads, falling back to
 * the bot when the fuzzer finds nothing. After every step the state is
 * passed through the same stripping the database applies, and invariants
 * are checked: no undefined or NaN, no illegal keys, a sane active player,
 * actions never throw, and a rejected action leaves the state untouched.
 */

type State = GenericGameState & {
  public: GenericGameState["public"] & Record<string, unknown>;
  private: Record<string, unknown>;
};

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}

const lobby = (
  game: GameName,
  count: number,
  humans: number,
): PlayerInLobby[] =>
  Array.from({ length: count }, (_, i) => ({
    email: i < humans ? `human${i}.name@example.com` : `Bot #${i}`,
    ready: true,
    joinedAt: "0",
    isBot: i >= humans,
    gameName: game,
  }));

/** What the database hands back: no empty arrays or objects. */
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

/** Problems the database would refuse or that no state should ever hold. */
function problems(value: unknown, path = ""): string[] {
  if (value === undefined) return [`${path} is undefined`];
  if (typeof value === "number" && !Number.isFinite(value))
    return [`${path} is ${value}`];
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value))
    return value.flatMap((v, i) => problems(v, `${path}[${i}]`));
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) => {
    const here = `${path}.${k}`;
    const bad = !k || /[.#$/[\]]/.test(k) ? [`${here} has an illegal key`] : [];
    return [...bad, ...problems(v, here)];
  });
}

/** Every string and number the state mentions, as raw material for payloads. */
function harvest(
  value: unknown,
  strings: Set<string>,
  numbers: Set<number>,
  depth = 0,
) {
  if (depth > 6) return;
  if (typeof value === "string" && value.length < 20) strings.add(value);
  else if (
    typeof value === "number" &&
    Number.isInteger(value) &&
    Math.abs(value) < 200
  )
    numbers.add(value);
  else if (Array.isArray(value))
    value.forEach((v) => harvest(v, strings, numbers, depth + 1));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (/^-?\d+,-?\d+$/.test(k) || /^\d+[A-I]$/.test(k)) strings.add(k);
      harvest(v, strings, numbers, depth + 1);
    }
  }
}

const KEYS = [
  "coord",
  "from",
  "to",
  "village",
  "type",
  "picks",
  "path",
  "colour",
  "chain",
  "tile",
  "sell",
  "trade",
  "purchases",
  "amount",
  "property",
  "region",
  "index",
  "target",
  "cards",
  "bid",
  "cardIndex",
  "moneyCards",
  "indexes",
  "action",
  "color",
];
const WORDS = [
  "RED",
  "BLUE",
  "GREEN",
  "BLACK",
  "IVORY",
  "WHITE",
  "JOKER",
  "LUXOR",
  "TOWER",
  "AMERICAN",
  "FESTIVAL",
  "WORLDWIDE",
  "CONTINENTAL",
  "IMPERIAL",
  "RAINMAKER",
  "PRIEST",
  "YETI_WHISPERER",
  "ASTROLOGER",
  "DRAGONBREEDER",
  "HEALER",
  "FIREKEEPER",
];

function randomPayload(
  state: State,
  random: () => number,
): Record<string, unknown> {
  const strings = new Set<string>(WORDS);
  const numbers = new Set<number>([0, 1, 2, 3, 4, 5, 6, 10]);
  harvest(state.public, strings, numbers);
  // Grid coordinates and board tiles the games use, whether or not the state mentions them yet.
  for (let i = 0; i < 8; i++)
    strings.add(`${Math.floor(random() * 13)},${Math.floor(random() * 11)}`);
  for (let i = 0; i < 4; i++)
    strings.add(
      `${1 + Math.floor(random() * 12)}${"ABCDEFGHI"[Math.floor(random() * 9)]}`,
    );
  const S = [...strings];
  const N = [...numbers];
  const pick = <T>(xs: T[]) => xs[Math.floor(random() * xs.length)];
  const value = (): unknown => {
    const r = random();
    if (r < 0.4) return pick(S);
    if (r < 0.75) return pick(N);
    if (r < 0.85) return [pick(S), pick(S)];
    if (r < 0.92)
      return [
        [pick(N), pick(S)],
        [pick(N), pick(S)],
      ];
    if (r < 0.97) return { [pick(S)]: pick(N) };
    return [pick(N), pick(N), pick(N)];
  };
  const payload: Record<string, unknown> = {
    callerEmail: state.public.activePlayer,
  };
  const n = 1 + Math.floor(random() * 3);
  for (let i = 0; i < n; i++) payload[pick(KEYS)] = value();
  return payload;
}

const SUMMARY_LOG = process.env.SIMULATION_LOG || "simulation-summary.log";

type Finding = { game: GameName; seed: number; step: number; message: string };

type Loose = Record<string, any>;

/**
 * Quantities a game can never create or lose: compared against their
 * values at the start of the game after every step.
 */
function conserved(game: GameName, state: State): number[] {
  const pub = state.public as Loose;
  const priv = state.private as Loose;
  const players = pub.players as Loose[];
  const sum = (xs: number[]) => xs.reduce((s, n) => s + n, 0);
  const len = (x: unknown) => (Array.isArray(x) ? x.length : 0);
  switch (game) {
    case "condottiere":
      return [
        len(priv.deck) +
          len(priv.discard) +
          sum(players.map((p) => len(p.hand) + len(p.line))),
      ];
    case "acquire":
      return Object.entries(pub.chains as Loose).map(
        ([chain, c]) =>
          (c as Loose).stockLeft +
          sum(players.map((p) => (p.stocks?.[chain] as number) || 0)),
      );
    case "for-sale":
      return [
        len(priv.propertyDeck) +
          len(pub.onOffer) +
          sum(players.map((p) => len(p.properties))) +
          sum(players.map((p) => len(p.cheques))),
        len(priv.chequeDeck) +
          len(pub.cheques) +
          sum(players.map((p) => len(p.cheques))),
      ];
    case "lyngk":
      return [
        sum(Object.values((pub.stacks || {}) as Loose).map((s) => len(s))) +
          5 * sum(players.map((p) => p.scored as number)),
      ];
    case "gipf":
      return players.map((p, i) => {
        const onBoard = Object.values((pub.pieces || {}) as Loose).filter(
          (s) => s === p.side,
        ).length;
        const captured = players[1 - i]?.captured ?? 0;
        return (p.reserve as number) + onBoard + captured;
      });
    case "yinsh":
      return [
        len(Object.keys((pub.markers || {}) as Loose)) + (pub.pool as number),
        pub.phase === "PLACE_RINGS"
          ? 10
          : len(Object.keys((pub.rings || {}) as Loose)) +
            sum(players.map((p) => p.scored as number)),
      ];
    case "zertz": {
      const count = (c: Loose | undefined) =>
        c ? (c.WHITE || 0) + (c.GRAY || 0) + (c.BLACK || 0) : 0;
      return [
        count(pub.pool) +
          len(Object.keys((pub.marbles || {}) as Loose)) +
          sum(players.map((p) => count(p.captured))),
      ];
    }
    case "shangri-la":
      return players.map((p) => {
        const onBoard = (pub.villages as Loose[]).reduce(
          (n, v) =>
            n +
            Object.values((v.spaces || {}) as Loose)
              .filter((s) => (s as Loose).owner === p.email)
              .reduce((m, s) => m + 1 + ((s as Loose).student ? 1 : 0), 0),
          0,
        );
        return onBoard + sum(Object.values(p.supply as Loose) as number[]);
      });
    case "no-thanks":
      return [
        sum(players.map((p) => (p.chips as number) || 0)) +
          ((pub.chipsPlaced as number) || 0),
      ];
    default:
      return [];
  }
}

function simulate(
  game: GameName,
  seed: number,
  maxSteps: number,
  findings: Finding[],
) {
  const module = GAMES[game] as unknown as GameModule<State>;
  const random = rng(seed);
  const info = GAME_INFO[game];
  const count =
    info.minPlayers +
    Math.floor(random() * (info.maxPlayers - info.minPlayers + 1));
  const humans = Math.min(count - 1, 1 + Math.floor(random() * 2));
  let state = module.createState("sim", lobby(game, count, humans)) as State;
  const actions = Object.entries(module.actions);
  const report = (step: number, message: string) =>
    findings.push({ game, seed, step, message });
  let botTurns = 0;
  let randomMoves = 0;
  let steps = 0;
  const baseline = conserved(game, state);

  for (let step = 0; step < maxSteps; step++) {
    if (module.isGameOver(state)) break;
    steps = step + 1;
    const before = JSON.stringify(state);

    // Fuzz: random payloads against every action. Rejections must leave the state alone; nothing may throw.
    let played = false;
    for (let attempt = 0; attempt < 24 && !played; attempt++) {
      const [name, action] = actions[Math.floor(random() * actions.length)];
      const payload = randomPayload(state, random);
      const copy = JSON.parse(before) as State;
      let result: { ok: boolean; reason?: string };
      try {
        result = action(copy, payload) as { ok: boolean; reason?: string };
      } catch (e) {
        report(
          step,
          `${name} threw on ${JSON.stringify(payload)}: ${(e as Error).message}`,
        );
        continue;
      }
      if (!result || typeof result.ok !== "boolean") {
        report(step, `${name} returned ${JSON.stringify(result)}`);
        continue;
      }
      if (!result.ok) {
        if (JSON.stringify(copy) !== before)
          report(
            step,
            `${name} rejected (${result.reason}) but changed the state`,
          );
        continue;
      }
      // A legal move found by chance: that is the move.
      state = copy;
      played = true;
      randomMoves++;
    }
    if (!played) {
      const active = state.public.players.find(
        (p) => p.email === state.public.activePlayer,
      );
      if (!active) {
        report(
          step,
          `active player ${state.public.activePlayer} is not at the table`,
        );
        break;
      }
      // Lend the bot's judgement to a human too, so the game keeps moving.
      const wasBot = active.isBot;
      active.isBot = true;
      try {
        module.botTurn(state);
      } catch (e) {
        report(step, `botTurn threw: ${(e as Error).message}`);
        break;
      }
      active.isBot = wasBot;
      botTurns++;
      if (JSON.stringify(state) === before) {
        report(
          step,
          `no progress: the fuzzer found nothing and the bot made no move (phase ${String(state.public.phase)})`,
        );
        break;
      }
    }

    // Persist and reload, as the real game does between every move.
    const issues = problems(state);
    if (issues.length) {
      report(step, `invalid state: ${issues.slice(0, 3).join("; ")}`);
      break;
    }
    state = roundTrip(state);
    const now = conserved(game, state);
    if (now.some((n, i) => n !== baseline[i])) {
      report(
        step,
        `something was created or lost: ${JSON.stringify(now)} was ${JSON.stringify(baseline)}`,
      );
      break;
    }
    if (
      !state.public.players.some((p) => p.email === state.public.activePlayer)
    ) {
      report(
        step,
        `active player ${state.public.activePlayer} is not at the table`,
      );
      break;
    }
    if (
      state.public.status !== "IN_PROGRESS" &&
      state.public.status !== "GAME_OVER"
    ) {
      report(step, `status is ${state.public.status}`);
      break;
    }
  }
  if (!module.isGameOver(state))
    report(
      maxSteps,
      `did not finish within ${maxSteps} steps (${botTurns} bot turns)`,
    );
  // Summaries go to a file: the runner swallows console output.
  const summary = [
    `${game} seed ${seed}: ${count} players (${humans} human)`,
    `${steps} steps`,
    `${randomMoves} random moves`,
    `${botTurns} bot turns`,
    module.isGameOver(state) ? "finished" : "unfinished",
  ].join(", ");
  appendFileSync(SUMMARY_LOG, summary + String.fromCharCode(10));
  return state;
}

describe("simulation", () => {
  const seeds = [5, 101];
  for (const game of GAME_NAMES) {
    it(`plays ${game} to the end with random legal moves and fuzzed actions`, () => {
      const findings: Finding[] = [];
      for (const seed of seeds) simulate(game, seed, 4000, findings);
      expect(
        findings.map((f) => `seed ${f.seed} step ${f.step}: ${f.message}`),
      ).toEqual([]);
    }, 600_000);
  }
});
