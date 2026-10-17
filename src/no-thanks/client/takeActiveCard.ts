import callGameAction from "../../shared/callGameAction";

export type TakeActiveCardRequest = {
  lobbyUID: number;
};

export default async function takeActiveCard(request: TakeActiveCardRequest) {
  await callGameAction("takeActiveCard", request);
}
