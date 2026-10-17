import callGameAction from "../../shared/callGameAction";

export type DrawChipRequest = { lobbyUID: string };

export default async function drawChip(request: DrawChipRequest) {
  await callGameAction("drawChip", request);
}
