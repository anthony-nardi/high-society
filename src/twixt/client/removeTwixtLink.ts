import callGameAction from "../../shared/callGameAction";
import type { Link } from "../game/types";

export type removeTwixtLinkRequest = { lobbyUID: string; link: Link };

export default async function removeTwixtLink(request: removeTwixtLinkRequest) {
  return callGameAction("removeTwixtLink", request);
}
