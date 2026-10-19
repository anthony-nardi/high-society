import callGameAction from "../../shared/callGameAction";

export type flipSavannaPreyRequest = {
  lobbyUID: string;
  /** The cells of the gazelles and zebras the lions flip, one per hunting lion. */
  cells: string[];
};

export default async function flipSavannaPrey(request: flipSavannaPreyRequest) {
  return callGameAction("flipSavannaPrey", request);
}
