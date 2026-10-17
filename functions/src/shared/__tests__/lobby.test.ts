import { describe, expect, it } from "vitest";
import { isLobbyReady } from "../helpers";
import { PlayerInLobby } from "../types";

const player = (
  email: string,
  ready: boolean,
  gameName: PlayerInLobby["gameName"] = "yinsh",
): PlayerInLobby => ({
  email,
  ready,
  joinedAt: "0",
  isBot: email.startsWith("Bot"),
  gameName,
});

describe("isLobbyReady", () => {
  it("starts a two-player game once a ready human adds a bot", () => {
    expect(isLobbyReady([player("a", true)])).toBe(false);
    expect(isLobbyReady([player("a", true), player("Bot #1", true)])).toBe(
      true,
    );
  });

  it("waits for every human", () => {
    expect(isLobbyReady([player("a", true), player("b", false)])).toBe(false);
  });

  it("respects each game's minimum", () => {
    const hs = [
      player("a", true, "high-society"),
      player("Bot #1", true, "high-society"),
    ];
    expect(isLobbyReady(hs)).toBe(false);
    expect(isLobbyReady([...hs, player("Bot #2", true, "high-society")])).toBe(
      true,
    );
  });

  it("is false for an empty lobby", () => {
    expect(isLobbyReady([])).toBe(false);
  });
});
