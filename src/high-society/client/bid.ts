import { getFunctions, httpsCallable } from "firebase/functions";

export type BidRequest = {
  lobbyUID: number;
  bid: string[];
};

export default async function bid(bidRequest: BidRequest) {
  const functions = getFunctions();
  const bidApi = httpsCallable<BidRequest, void>(functions, "bid");

  try {
    await bidApi(bidRequest);
  } catch (e) {
    console.error(e);
  }
}
