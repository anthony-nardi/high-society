import { GameName } from "./types";

/**
 * Facts about each game that both the server and the client need. This file
 * must stay free of runtime imports: the client bundles it directly.
 */
export type GameInfo = {
  name: GameName;
  title: string;
  minPlayers: number;
  maxPlayers: number;
  /** Client route. */
  route: string;
};

export const GAME_INFO: { [name in GameName]: GameInfo } = {
  "high-society": {
    name: "high-society",
    title: "High Society",
    minPlayers: 3,
    maxPlayers: 5,
    route: "/high-society",
  },
  "no-thanks": {
    name: "no-thanks",
    title: "No Thanks!",
    minPlayers: 3,
    maxPlayers: 7,
    route: "/no-thanks",
  },
  razzia: {
    name: "razzia",
    title: "Razzia!",
    minPlayers: 3,
    maxPlayers: 5,
    route: "/razzia",
  },
  "family-inc": {
    name: "family-inc",
    title: "Family Inc.",
    minPlayers: 2,
    maxPlayers: 7,
    route: "/family-inc",
  },
  zertz: {
    name: "zertz",
    title: "ZÈRTZ",
    minPlayers: 2,
    maxPlayers: 2,
    route: "/zertz",
  },
  yinsh: {
    name: "yinsh",
    title: "YINSH",
    minPlayers: 2,
    maxPlayers: 2,
    route: "/yinsh",
  },
  dvonn: {
    name: "dvonn",
    title: "DVONN",
    minPlayers: 2,
    maxPlayers: 2,
    route: "/dvonn",
  },
  gipf: {
    name: "gipf",
    title: "GIPF",
    minPlayers: 2,
    maxPlayers: 2,
    route: "/gipf",
  },
  lyngk: {
    name: "lyngk",
    title: "LYNGK",
    minPlayers: 2,
    maxPlayers: 2,
    route: "/lyngk",
  },
  "for-sale": {
    name: "for-sale",
    title: "For Sale",
    minPlayers: 3,
    maxPlayers: 6,
    route: "/for-sale",
  },
  "shangri-la": {
    name: "shangri-la",
    title: "The Bridges of Shangri-La",
    minPlayers: 3,
    maxPlayers: 4,
    route: "/shangri-la",
  },
  acquire: {
    name: "acquire",
    title: "Acquire",
    minPlayers: 2,
    maxPlayers: 6,
    route: "/acquire",
  },
  condottiere: {
    name: "condottiere",
    title: "Condottiere",
    minPlayers: 2,
    maxPlayers: 6,
    route: "/condottiere",
  },
};

export const GAME_NAMES = Object.keys(GAME_INFO) as GameName[];
