import { describe, expect, it } from "vitest"
import { matchesQuery, tokenizeQuery } from "../src/index.js"

describe("search", () => {
  it("tokenizes and matches all query tokens case-insensitively", () => {
    expect(tokenizeQuery("  Claude   Tools ")).toEqual(["claude", "tools"])
    expect(matchesQuery(["Claude Sonnet", "tool_call reasoning"], "claude tools")).toBe(false)
    expect(matchesQuery(["Claude Sonnet", "tool call reasoning"], "claude tool")).toBe(true)
  })
})
