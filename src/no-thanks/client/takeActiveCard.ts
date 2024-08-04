import { getFunctions, httpsCallable } from "firebase/functions";

export type TakeActiveCardRequest = {
  lobbyUID: number;
};

export default async function takeActiveCard(
  takeActiveCardRequest: TakeActiveCardRequest
) {
  const functions = getFunctions();
  const takeActiveCardApi = httpsCallable<TakeActiveCardRequest, void>(
    functions,
    "takeActiveCard"
  );

  try {
    await takeActiveCardApi(takeActiveCardRequest);
  } catch (e) {
    console.error(e);
  }
}
