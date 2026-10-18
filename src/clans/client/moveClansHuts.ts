import callGameAction from "../../shared/callGameAction";

export type moveClansHutsRequest = {
  lobbyUID: string;
  from: number;
  to: number;
};

export default async function moveClansHuts(request: moveClansHutsRequest) {
  return callGameAction("moveClansHuts", request);
}
