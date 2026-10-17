import { Colour, Master, ShangriLaGameState, Village } from "./types";

/*
 * Client-side copy of the map and the rule queries the table needs. Keep
 * in step with functions/src/shangri-la/helpers.
 */

export const MASTERS: Master[] = [
  "RAINMAKER",
  "PRIEST",
  "YETI_WHISPERER",
  "ASTROLOGER",
  "DRAGONBREEDER",
  "HEALER",
  "FIREKEEPER",
];

export const MASTER_LABEL: { [m in Master]: string } = {
  RAINMAKER: "Rainmaker",
  PRIEST: "Priest",
  YETI_WHISPERER: "Yeti-whisperer",
  ASTROLOGER: "Astrologer",
  DRAGONBREEDER: "Dragonbreeder",
  HEALER: "Healer",
  FIREKEEPER: "Firekeeper",
};

/** One-letter marks for the tiny village slots. */
export const MASTER_MARK: { [m in Master]: string } = {
  RAINMAKER: "R",
  PRIEST: "P",
  YETI_WHISPERER: "Y",
  ASTROLOGER: "A",
  DRAGONBREEDER: "D",
  HEALER: "H",
  FIREKEEPER: "F",
};

export const COLOUR_FILL: { [c in Colour]: string } = {
  RED: "#d9342b",
  BLUE: "#2f6fd6",
  YELLOW: "#e8c23a",
  VIOLET: "#8e5ad6",
};

export type VillageInfo = { name: string; x: number; y: number };

export const VILLAGES: VillageInfo[] = [
  { name: "Tashi", x: 50, y: 8 },
  { name: "Nyima", x: 28, y: 22 },
  { name: "Dawa", x: 72, y: 22 },
  { name: "Pema", x: 10, y: 40 },
  { name: "Dorje", x: 37, y: 38 },
  { name: "Sonam", x: 63, y: 38 },
  { name: "Karma", x: 91, y: 40 },
  { name: "Norbu", x: 22, y: 58 },
  { name: "Rinchen", x: 50, y: 56 },
  { name: "Lhamo", x: 78, y: 58 },
  { name: "Yeshe", x: 32, y: 77 },
  { name: "Tenzin", x: 68, y: 77 },
  { name: "Dechen", x: 50, y: 93 },
];

export const ALL_BRIDGES: [number, number][] = [
  [0, 1],
  [0, 2],
  [1, 3],
  [1, 4],
  [2, 5],
  [2, 6],
  [3, 4],
  [4, 5],
  [5, 6],
  [3, 7],
  [4, 7],
  [4, 8],
  [5, 8],
  [5, 9],
  [6, 9],
  [7, 8],
  [7, 10],
  [8, 10],
  [8, 11],
  [9, 11],
  [10, 11],
  [10, 12],
  [11, 12],
];

export function neighbours(
  bridges: [number, number][],
  village: number,
): number[] {
  return bridges
    .filter(([a, b]) => a === village || b === village)
    .map(([a, b]) => (a === village ? b : a));
}

export function hasBridge(bridges: [number, number][], a: number, b: number) {
  return bridges.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

export const strengthOf = (village: Village) =>
  Object.values(village.spaces || {}).reduce(
    (s, space) => s + 1 + (space.student ? 1 : 0),
    0,
  );
export const mastersIn = (village: Village) =>
  Object.keys(village.spaces || {}).length;
export const mastersOf = (village: Village, email: string) =>
  Object.values(village.spaces || {}).filter((s) => s.owner === email).length;
export const tilesOf = (village: Village, email: string) =>
  Object.values(village.spaces || {})
    .filter((s) => s.owner === email)
    .reduce((n, s) => n + 1 + (s.student ? 1 : 0), 0);
export const hasStudentOf = (village: Village, email: string) =>
  Object.values(village.spaces || {}).some(
    (s) => s.owner === email && s.student,
  );

export const setupLimits = (players: number) =>
  players <= 3 ? { perColour: 1, total: 2 } : { perColour: 2, total: 3 };

export function placements(
  state: ShangriLaGameState,
  email: string,
): [number, Master][] {
  const player = state.players.find((p) => p.email === email);
  if (!player) return [];
  const out: [number, Master][] = [];
  const setup = state.phase === "SETUP";
  const limits = setupLimits(state.players.length);
  state.villages.forEach((village, index) => {
    if (village.stone) return;
    if (setup) {
      if (tilesOf(village, email) >= limits.perColour) return;
      if (strengthOf(village) >= limits.total) return;
    } else if (mastersOf(village, email) === 0) return;
    for (const type of MASTERS) {
      if (village.spaces?.[type]) continue;
      if (player.supply[type] <= 0) continue;
      if (setup && (player.placed || []).includes(type)) continue;
      out.push([index, type]);
    }
  });
  return out;
}

export function recruitable(
  state: ShangriLaGameState,
  email: string,
): [number, Master][] {
  const player = state.players.find((p) => p.email === email);
  if (!player) return [];
  const out: [number, Master][] = [];
  state.villages.forEach((village, index) => {
    if (village.stone) return;
    for (const type of MASTERS) {
      const space = village.spaces?.[type];
      if (space?.owner === email && !space.student && player.supply[type] > 0)
        out.push([index, type]);
    }
  });
  return out;
}

export function journeys(
  state: ShangriLaGameState,
  email: string,
): [number, number][] {
  const out: [number, number][] = [];
  state.villages.forEach((village, index) => {
    if (village.stone || !hasStudentOf(village, email)) return;
    for (const to of neighbours(state.bridges || [], index))
      out.push([index, to]);
  });
  return out;
}

/** Which side a journey would count as stronger, judged as the rules do. */
export function originIsStronger(
  state: ShangriLaGameState,
  from: number,
  to: number,
) {
  const a = state.villages[from];
  const b = state.villages[to];
  return (
    strengthOf(a) > strengthOf(b) ||
    (strengthOf(a) === strengthOf(b) && mastersIn(a) > mastersIn(b))
  );
}

export function scoreOf(state: ShangriLaGameState, email: string) {
  let masters = 0;
  let villages = 0;
  let students = 0;
  for (const village of state.villages) {
    const n = mastersOf(village, email);
    masters += n;
    if (n > 0) villages += 1;
    students += Object.values(village.spaces || {}).filter(
      (s) => s.owner === email && s.student,
    ).length;
  }
  return { masters, villages, students };
}
