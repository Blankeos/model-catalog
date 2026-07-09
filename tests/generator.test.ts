import { describe, expect, it } from "vitest"
import { createCatalog, defineGenerator, openAICompatibleProvider } from "../src/index.js"
import { createGeneratorContext } from "../src/generator.js"

describe("generator context", () => {
  it("adds, updates, and removes providers and models", () => {
    const snapshot = {
      schemaVersion: 1,
      generatedAt: "2026-01-01T00:00:00.000Z",
      sources: [],
      generators: [],
      providers: {},
    }
    const ctx = createGeneratorContext({ catalog: snapshot, fetch })

    ctx.addProvider({ id: "gateway", name: "Gateway", models: [{ id: "fast", name: "Fast" }] })
    ctx.updateProvider("gateway", { logoUrl: "https://example.com/logo.svg" })
    ctx.updateModel("gateway", "fast", { reasoning: true, reasoning_options: [{ type: "effort", values: ["low", "high"] }], limit: { context: 128000 } })
    ctx.addModel("gateway", { id: "cheap", name: "Cheap" })
    ctx.removeModel("gateway", "cheap")

    const models = createCatalog(snapshot).listModels()
    expect(snapshot.providers.gateway?.logoUrl).toBe("https://example.com/logo.svg")
    expect(snapshot.providers.gateway?.models.fast).toMatchObject({ reasoning: true, limit: { context: 128000 } })
    expect(snapshot.providers.gateway?.models.fast?.reasoning_options).toEqual([{ type: "effort", values: ["low", "high"] }])
    expect(models.map((model) => model.key)).toEqual(["gateway/fast"])
  })

  it("creates OpenAI-compatible provider generators", async () => {
    const snapshot = {
      schemaVersion: 1,
      generatedAt: "2026-01-01T00:00:00.000Z",
      sources: [],
      generators: [],
      providers: {},
    }
    const ctx = createGeneratorContext({ catalog: snapshot, fetch })
    const generator = openAICompatibleProvider({ id: "company", name: "Company", baseUrl: "https://api.company.test/v1", models: [{ id: "fast" }] })

    await generator.generate(ctx)

    expect(snapshot.providers.company?.npm).toBe("@ai-sdk/openai-compatible")
    expect(snapshot.providers.company?.metadata?.baseUrl).toBe("https://api.company.test/v1")
  })

  it("defineGenerator returns the same generator", () => {
    const generator = { id: "noop", generate() {} }
    expect(defineGenerator(generator)).toBe(generator)
  })
})
