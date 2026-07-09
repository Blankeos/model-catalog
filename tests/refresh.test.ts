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
            tool_call: true,
            modalities: { input: ["text", "image"], output: ["text"] },
            limit: { context: 200000, output: 64000 },
            cost: { input: 3, output: 15 },
          },
        },
      },
    })

    expect(modelsDevLogoUrl("anthropic")).toBe("https://models.dev/logos/anthropic.svg")
    expect(providers.anthropic?.logoUrl).toBe("https://models.dev/logos/anthropic.svg")
    expect(providers.anthropic?.models["claude-sonnet-4"]?.capabilities).toEqual(expect.arrayContaining(["reasoning", "tool_call", "image_input"]))
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
            ctx.addProvider({ id: "company", name: "Company", models: [{ id: "fast", name: "Fast", capabilities: ["tool_call"] }] })
            ctx.addModel("openai", { id: "gpt-custom", name: "GPT Custom", capabilities: ["reasoning"] })
          },
        }),
      ],
    })

    expect(snapshot.schemaVersion).toBe(1)
    expect(snapshot.providers.openai?.logoUrl).toBe("https://models.dev/logos/openai.svg")
    expect(snapshot.providers.company?.models.fast?.name).toBe("Fast")
    expect(snapshot.providers.openai?.models["gpt-custom"]?.capabilities).toContain("reasoning")
    expect(snapshot.generators.map((g) => g.id)).toEqual(["catalog-extensions", "custom"])
  })
})
