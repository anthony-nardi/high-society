import callFunction from "./callFunction";

export type BidOnLootRequest = { lobbyUID: string; amount: string };

export default async function bidOnLoot(request: BidOnLootRequest) {
  await callFunction<BidOnLootRequest>("bidOnLoot", request);
}
