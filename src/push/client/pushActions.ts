import callGameAction from "../../shared/callGameAction";

export type LobbyRequest = { lobbyUID: string };
export type ColumnRequest = { lobbyUID: string; column: number };
export type ColourRequest = { lobbyUID: string; colour: string };

/** Turns the top card of the deck over. */
export async function drawPushCard(request: LobbyRequest) {
  return callGameAction("drawPushCard", request);
}

/** Puts the card just turned over into a column, or starts a new one. */
export async function placePushCard(request: ColumnRequest) {
  return callGameAction("placePushCard", request);
}

/** Takes a column into the zone: stopping, or choosing after someone else's turn. */
export async function takePushColumn(request: ColumnRequest) {
  return callGameAction("takePushColumn", request);
}

/** Protects every card of one colour instead of pushing. */
export async function bankPushColour(request: ColourRequest) {
  return callGameAction("bankPushColour", request);
}
