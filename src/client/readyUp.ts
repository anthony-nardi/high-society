import { getFunctions, httpsCallable } from "firebase/functions";

export type ReadyUpRequest = {
  email: string;
  lobbyUID: number;
};

export default async function readyUp(readyUpRequest: ReadyUpRequest) {
  const functions = getFunctions();

  const readyUpApi = httpsCallable<ReadyUpRequest, void>(functions, "readyup");

  await readyUpApi(readyUpRequest);
}
