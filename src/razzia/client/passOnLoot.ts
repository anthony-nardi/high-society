import callFunction from "./callFunction";

export type PassOnLootRequest = { lobbyUID: string };

export default async function passOnLoot(request: PassOnLootRequest) {
  await callFunction<PassOnLootRequest>("passOnLoot", request);
}
