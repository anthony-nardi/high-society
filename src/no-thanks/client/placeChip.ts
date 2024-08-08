import { getFunctions, httpsCallable } from "firebase/functions";

export type PlaceChipRequest = {
  lobbyUID: number;
};

export default async function placeChip(placeChipRequest: PlaceChipRequest) {
  const functions = getFunctions();
  const placeChipOnActiveCardApi = httpsCallable<PlaceChipRequest, void>(
    functions,
    "placeChipOnActiveCard"
  );

  try {
    await placeChipOnActiveCardApi(placeChipRequest);
  } catch (e) {
    console.error(e);
  }
}
