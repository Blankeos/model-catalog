import { describe, expect, it } from "vitest"
import { createCatalog } from "../src/index.js"
import { fixtureSnapshot } from "./fixtures.js"

describe("catalog", () => {
  it("lists flat enriched models", () => {
    const catalog = createCatalog(fixtureSnapshot)
    const models = catalog.listModels({ includeProviders: ["anthropic"], excludeDeprecated: true })

    expect(models).toHaveLength(1)
    expect(models[0]).toMatchObject({
      key: "anthropic/claude-sonnet-4",
      providerId: "anthropic",
      providerLogoUrl: "https://models.dev/logos/anthropic.svg",
      modelId: "claude-sonnet-4",
      name: "Claude Sonnet 4",
    })
  })

  it("filters models by query, capabilities, modalities, and context", () => {
    const catalog = createCatalog(fixtureSnapshot)
    const models = catalog.listModels({
      query: "claude tools",
      toolCall: true,
      outputModalities: ["text"],
      minContext: 128_000,
    })

    expect(models.map((m) => m.key)).toEqual(["anthropic/claude-sonnet-4"])
  })

  it("groups models by provider id", () => {
    const catalog = createCatalog(fixtureSnapshot)
    const grouped = catalog.listModels({ groupBy: "providerId", excludeDeprecated: true })

    expect(grouped.groups).toHaveLength(2)
    expect(grouped.groups[0]?.providerId).toBe("anthropic")
    expect(grouped.groups[0]?.providerLogoUrl).toBe("https://models.dev/logos/anthropic.svg")
    expect(grouped.groups[0]?.models.map((m) => m.modelId)).toEqual(["claude-sonnet-4"])
  })

  it("lists providers and looks up provider/model records", () => {
    const catalog = createCatalog(fixtureSnapshot)

    expect(catalog.getProvider("anthropic")?.logoUrl).toBe("https://models.dev/logos/anthropic.svg")
    expect(catalog.getModel("anthropic", "claude-sonnet-4")?.name).toBe("Claude Sonnet 4")
    expect(catalog.getModel("anthropic", "anthropic/claude-sonnet-4")?.name).toBe("Claude Sonnet 4")
    expect(catalog.listProviders({ query: "open" }).map((p) => p.id)).toEqual(["openai"])
  })
})
