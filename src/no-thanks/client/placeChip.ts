import { getFunctions, httpsCallable } from "firebase/functions";

export type PlaceChipRequest = {
  lobbyUID: number;
};

export default async function placeChip(placeChipRequest: PlaceChipRequest) {
  const functions = getFunctions();
  const placeChipApi = httpsCallable<PlaceChipRequest, void>(
    functions,
    "placechip"
  );

  try {
    await placeChipApi(placeChipRequest);
  } catch (e) {
    console.error(e);
  }
}
