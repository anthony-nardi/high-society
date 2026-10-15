import { describe, expect, it } from "vitest";
import getLobbyIdFromURL from "./getLobbyIdFromURL";

describe("getLobbyIdFromURL", () => {
  it("reads the numeric lobby id from the URL hash", () => {
    window.location.hash = "#1720000000000";
    expect(getLobbyIdFromURL()).toBe(1720000000000);
  });

  it("ignores anything that is not a digit", () => {
    window.location.hash = "#lobby-42";
    expect(getLobbyIdFromURL()).toBe(42);
  });

  it("is 0 when there is no hash", () => {
    window.location.hash = "";
    expect(getLobbyIdFromURL()).toBe(0);
  });
});
