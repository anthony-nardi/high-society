import callGameAction from "../../shared/callGameAction";
import type { Colour, Coord } from "../game/types";

export type PlaceMarbleRequest = {
  lobbyUID: string;
  colour: Colour;
  to: Coord;
};

export default async function placeMarble(request: PlaceMarbleRequest) {
  return callGameAction("placeMarble", request);
}
