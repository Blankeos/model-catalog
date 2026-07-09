import { describe, expect, it, vi } from "vitest"
import { defineGenerator, modelsDevLogoUrl, normalizeModelsDevResponse, refreshSnapshot } from "../src/index.js"

describe("models.dev normalization and refresh", () => {
  it("adds models.dev logo URLs to providers", () => {
    const providers = normalizeModelsDevResponse({
      anthropic: {
        name: "Anthropic",
        models: {
          "claude-sonnet-4": {
            id: "claude-sonnet-4",
            name: "Claude Sonnet 4",
            reasoning: true,
            reasoning_options: [{ type: "effort", values: ["low", 2, "medium", null, "high"] }],
            tool_call: true,
            modalities: { input: ["text", "image"], output: ["text"] },
            limit: { context: 200000, output: 64000 },
            cost: { input: 3, output: 15 },
          },
        },
      },
    })

    expect(modelsDevLogoUrl("anthropic")).toBe("https://models.dev/logos/anthropic.svg")
    expect(providers.anthropic?.logoUrl).toBeUndefined()
    expect(providers.anthropic?.models["claude-sonnet-4"]).toMatchObject({ reasoning: true, tool_call: true, attachment: false })
    expect(providers.anthropic?.models["claude-sonnet-4"]?.reasoning_options).toEqual([{ type: "effort", values: ["low", "medium", "high"] }])
  })

  it("refreshes from source and applies generators", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ openai: { name: "OpenAI", models: {} } }) })) as unknown as typeof fetch
    const snapshot = await refreshSnapshot({
      fetch: fetchMock,
      now: () => new Date("2026-01-01T00:00:00.000Z"),
      generators: [
        defineGenerator({
          id: "custom",
          generate(ctx) {
            ctx.addProvider({ id: "company", name: "Company", models: [{ id: "fast", name: "Fast", tool_call: true }] })
            ctx.addModel("openai", { id: "gpt-custom", name: "GPT Custom", reasoning: true, reasoning_options: [{ type: "effort", values: ["low", "high"] }] })
          },
        }),
      ],
    })

    expect(snapshot.schemaVersion).toBe(1)
    expect(snapshot.providers.openai?.logoUrl).toBeUndefined()
    expect(snapshot.providers.company?.models.fast?.name).toBe("Fast")
    expect(snapshot.providers.openai?.models["gpt-custom"]?.reasoning_options).toEqual([{ type: "effort", values: ["low", "high"] }])
    expect(snapshot.generators.map((g) => g.id)).toEqual(["catalog-extensions", "custom"])
  })
})
