import callGameAction from "../../shared/callGameAction";

export type PlaceChipRequest = {
  lobbyUID: number;
};

export default async function placeChip(request: PlaceChipRequest) {
  await callGameAction("placeChipOnActiveCard", request);
}
