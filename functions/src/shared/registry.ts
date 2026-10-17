import { GameModule } from "./game";
import { GameName } from "./types";
import highSociety from "../high-society/module";
import noThanks from "../no-thanks/module";
import razzia from "../razzia/module";
import familyInc from "../family-inc/module";

/** Every playable game, keyed by the name stored in lobbies and states. */
export const GAMES: { [name in GameName]: GameModule<any> } = {
  "high-society": highSociety,
  "no-thanks": noThanks,
  razzia,
  "family-inc": familyInc,
};

export function getGameModule(name: GameName): GameModule<any> {
  const module = GAMES[name];
  if (!module) throw new Error(`Unknown game name: ${name}`);
  return module;
}
