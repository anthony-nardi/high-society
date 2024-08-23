import { getFunctions, httpsCallable } from "firebase/functions";

export type InitiateAuctionRequest = {
  lobbyUID: string;
};

export default async function initiateAuction(
  initiateAuctionRequest: InitiateAuctionRequest
) {
  const functions = getFunctions();
  const initiateAuctionApi = httpsCallable<InitiateAuctionRequest, void>(
    functions,
    "initiateAuction"
  );

  try {
    await initiateAuctionApi(initiateAuctionRequest);
  } catch (e) {
    console.error(e);
  }
}
