import callFunction from "./callFunction";

export type RevealCardRequest = { lobbyUID: string };

export default async function revealCard(request: RevealCardRequest) {
  await callFunction<RevealCardRequest>("revealCard", request);
}
