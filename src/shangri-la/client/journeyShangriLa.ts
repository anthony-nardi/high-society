import callGameAction from "../../shared/callGameAction";

export type journeyShangriLaRequest = {
  lobbyUID: string;
  from: number;
  to: number;
};

export default async function journeyShangriLa(
  request: journeyShangriLaRequest,
) {
  return callGameAction("journeyShangriLa", request);
}
