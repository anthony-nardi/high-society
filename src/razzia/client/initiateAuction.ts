import callFunction from "./callFunction";

export type InitiateAuctionRequest = { lobbyUID: string };

export default async function initiateAuction(request: InitiateAuctionRequest) {
  await callFunction<InitiateAuctionRequest>("initiateAuction", request);
}
