import { describe, expect, it } from "vitest";
import displayName, { isBotName } from "./displayName";

describe("displayName", () => {
  it("drops the domain from an email address", () => {
    expect(displayName("alice@example.com")).toBe("alice");
  });

  it("renders bots without the hash", () => {
    expect(displayName("Bot #2")).toBe("Bot 2");
    expect(isBotName("Bot #2")).toBe(true);
    expect(isBotName("bob@example.com")).toBe(false);
  });
});
