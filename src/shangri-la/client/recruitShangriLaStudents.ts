import callGameAction from "../../shared/callGameAction";
import type { Master } from "../game/types";

export type recruitShangriLaStudentsRequest = {
  lobbyUID: string;
  picks: [number, Master][];
};

export default async function recruitShangriLaStudents(
  request: recruitShangriLaStudentsRequest,
) {
  return callGameAction("recruitShangriLaStudents", request);
}
