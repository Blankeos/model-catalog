import { describe, expect, it } from "vitest"
import {
  catalogExtensionsGenerator,
  commandCodeProviderFromModels,
  createCatalog,
  createGeneratorContext,
  ollamaProviderFromModels,
  parseOllamaLsOutput,
} from "../src/index.js"
import type { CatalogSnapshot } from "../src/index.js"

function emptySnapshot(): CatalogSnapshot {
  return {
    schemaVersion: 1,
    generatedAt: "2026-01-01T00:00:00.000Z",
    sources: [],
    generators: [],
    providers: {},
  }
}

describe("builtin extension generators", () => {
  it("adds static catalog_extensions.json providers", () => {
    const snapshot = emptySnapshot()
    const ctx = createGeneratorContext({ catalog: snapshot, fetch })

    catalogExtensionsGenerator().generate(ctx)

    const model = createCatalog(snapshot).getModel("xai", "grok-composer-2.5-fast")
    expect(model).toMatchObject({
      name: "Composer 2.5",
      family: "grok-build",
      tool_call: true,
      structured_output: true,
      temperature: true,
      limit: { context: 256000, output: 256000 },
    })
  })

  it("maps Command Code API models into provider records", () => {
    const provider = commandCodeProviderFromModels([
      { id: "deepseek/deepseek-v4-flash", name: "DeepSeek V4 Flash", context_length: 1_000_000 },
      { id: " ", name: "Empty" },
    ])

    expect(provider.id).toBe("commandcode")
    expect(provider.models).toHaveLength(1)
    expect(provider.models?.[0]).toMatchObject({
      id: "deepseek/deepseek-v4-flash",
      family: "deepseek",
      reasoning: true,
      tool_call: true,
      temperature: true,
      limit: { context: 1_000_000, output: 8192 },
    })
  })

  it("parses Ollama CLI output and builds a runtime provider", () => {
    const models = parseOllamaLsOutput("NAME ID SIZE MODIFIED\nllama3.2:latest a80 2GB now\nqwen2.5-coder:7b abc 4GB now\n")
    const provider = ollamaProviderFromModels(models)

    expect(models.map((model) => model.id)).toEqual(["llama3.2:latest", "qwen2.5-coder:7b"])
    expect(provider).toMatchObject({
      id: "ollama",
      metadata: { generatorType: "runtime-cli", runtimeOnly: true },
    })
    expect(provider.models).toHaveLength(2)
  })
})
