import { GameModule } from "./game";
import { GameName } from "./types";
import highSociety from "../high-society/module";
import noThanks from "../no-thanks/module";
import razzia from "../razzia/module";
import familyInc from "../family-inc/module";
import zertz from "../zertz/module";
import yinsh from "../yinsh/module";
import dvonn from "../dvonn/module";
import gipf from "../gipf/module";
import lyngk from "../lyngk/module";
import forSale from "../for-sale/module";
import shangriLa from "../shangri-la/module";
import acquire from "../acquire/module";
import condottiere from "../condottiere/module";
import rideTheRails from "../ride-the-rails/module";
import clans from "../clans/module";
import twixt from "../twixt/module";
import ecosystem from "../ecosystem/module";
import fujiFlush from "../fuji-flush/module";
import tigris from "../tigris/module";
import coralReef from "../coral-reef/module";

/** Every playable game, keyed by the name stored in lobbies and states. */
export const GAMES: { [name in GameName]: GameModule<any> } = {
  "high-society": highSociety,
  "no-thanks": noThanks,
  razzia,
  "family-inc": familyInc,
  zertz,
  yinsh,
  dvonn,
  gipf,
  lyngk,
  "for-sale": forSale,
  "shangri-la": shangriLa,
  acquire,
  condottiere,
  "ride-the-rails": rideTheRails,
  clans,
  twixt,
  ecosystem,
  "fuji-flush": fujiFlush,
  tigris,
  "coral-reef": coralReef,
};

export function getGameModule(name: GameName): GameModule<any> {
  const module = GAMES[name];
  if (!module) throw new Error(`Unknown game name: ${name}`);
  return module;
}
