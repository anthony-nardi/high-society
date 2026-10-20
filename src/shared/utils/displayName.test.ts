import { describe, expect, it } from "vitest";
import displayName, {
  avatarOf,
  isBotName,
  registerPersonas,
} from "./displayName";

describe("displayName", () => {
  it("drops the domain from an email address", () => {
    expect(displayName("alice@example.com")).toBe("alice");
  });

  it("renders bots without the hash", () => {
    expect(displayName("Bot #2")).toBe("Bot 2");
    expect(isBotName("Bot #2")).toBe(true);
    expect(isBotName("bob@example.com")).toBe(false);
  });

  it("names a bot by its persona once it is registered", () => {
    expect(displayName("Bot #7")).toBe("Bot 7");
    expect(avatarOf("Bot #7")).toBe("🤖");
    registerPersonas([{ email: "Bot #7", persona: "carla" }]);
    expect(displayName("Bot #7")).toBe("Cautious Carla");
    expect(avatarOf("Bot #7")).toBe("🐢");
    expect(avatarOf("alice@example.com")).toBeNull();
  });
});
