import { describe, it, expect } from "vitest";
import { normalizeUsername, validateUsername } from "./username.js";

describe("normalizeUsername", () => {
  it("lowercases and trims", () => {
    expect(normalizeUsername("  Marina  ")).toBe("marina");
  });

  it("strips a leading @", () => {
    expect(normalizeUsername("@rafa_s")).toBe("rafa_s");
  });

  it("strips only leading @, not @ in the middle", () => {
    expect(normalizeUsername("@@rafa")).toBe("rafa");
  });

  it("discards invalid characters, including internal spaces", () => {
    expect(normalizeUsername("ra fa! #1")).toBe("rafa1");
  });

  it("truncates to 20 characters", () => {
    expect(normalizeUsername("a".repeat(30))).toBe("a".repeat(20));
  });

  it("returns empty string for empty/undefined input", () => {
    expect(normalizeUsername()).toBe("");
    expect(normalizeUsername("")).toBe("");
  });

  it("makes 'Marina' and 'marina' collide, by design", () => {
    expect(normalizeUsername("Marina")).toBe(normalizeUsername("marina"));
  });
});

describe("validateUsername", () => {
  it("accepts 3-20 chars of lowercase letters, digits, _ and .", () => {
    expect(validateUsername("rafa_s.99")).toBe(true);
  });

  it("rejects usernames shorter than 3 chars", () => {
    expect(validateUsername("ab")).toBe(false);
  });

  it("rejects usernames longer than 20 chars", () => {
    expect(validateUsername("a".repeat(21))).toBe(false);
  });

  it("rejects uppercase letters (normalize first)", () => {
    expect(validateUsername("Rafa")).toBe(false);
  });

  it("rejects disallowed characters", () => {
    expect(validateUsername("rafa s")).toBe(false);
    expect(validateUsername("rafa@x")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(validateUsername("")).toBe(false);
  });
});
