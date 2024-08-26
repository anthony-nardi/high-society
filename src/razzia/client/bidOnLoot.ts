import { getFunctions, httpsCallable } from "firebase/functions";

export type BidOnLootRequest = {
  lobbyUID: string;
  amount: string;
};

export default async function bidOnLoot(bidOnLootRequest: BidOnLootRequest) {
  const functions = getFunctions();
  const bidOnLootApi = httpsCallable<BidOnLootRequest, void>(
    functions,
    "bidOnLoot"
  );

  try {
    await bidOnLootApi(bidOnLootRequest);
  } catch (e) {
    console.error(e);
  }
}
