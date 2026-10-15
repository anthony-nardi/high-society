import { describe, expect, it } from "vitest";
import isLocalhost from "./isLocalhost";

describe("isLocalhost", () => {
  it("recognises local dev hostnames", () => {
    expect(isLocalhost("localhost")).toBe(true);
    expect(isLocalhost("127.0.0.1")).toBe(true);
  });

  it("is false for deployed hostnames", () => {
    expect(isLocalhost("high-society-c4ff4.web.app")).toBe(false);
    expect(isLocalhost("localhost.example.com")).toBe(false);
  });
});
