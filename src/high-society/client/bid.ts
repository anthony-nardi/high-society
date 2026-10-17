import callGameAction from "../../shared/callGameAction";

export type BidRequest = {
  lobbyUID: number;
  bid: string[];
};

export default async function bid(request: BidRequest) {
  await callGameAction("bid", request);
}
