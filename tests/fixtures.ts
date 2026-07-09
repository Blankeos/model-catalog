import type { CatalogSnapshot } from "../src/index.js"

export const fixtureSnapshot: CatalogSnapshot = {
  schemaVersion: 1,
  generatedAt: "2026-01-01T00:00:00.000Z",
  sources: [{ id: "fixture", name: "Fixture" }],
  generators: [],
  providers: {
    anthropic: {
      id: "anthropic",
      name: "Anthropic",
      logoUrl: "https://models.dev/logos/anthropic.svg",
      models: {
        "claude-sonnet-4": {
          id: "claude-sonnet-4",
          providerId: "anthropic",
          name: "Claude Sonnet 4",
          family: "claude",
          capabilities: ["reasoning", "tool_call", "image_input"],
          modalities: { input: ["text", "image"], output: ["text"] },
          limits: { context: 200_000, output: 64_000 },
        },
        "claude-legacy": {
          id: "claude-legacy",
          providerId: "anthropic",
          name: "Claude Legacy",
          family: "claude",
          capabilities: [],
          modalities: { input: ["text"], output: ["text"] },
          limits: { context: 8_000, output: 4_000 },
          deprecated: true,
        },
      },
    },
    openai: {
      id: "openai",
      name: "OpenAI",
      logoUrl: "https://models.dev/logos/openai.svg",
      models: {
        "gpt-4o": {
          id: "gpt-4o",
          providerId: "openai",
          name: "GPT-4o",
          family: "gpt-4o",
          capabilities: ["tool_call", "image_input"],
          modalities: { input: ["text", "image"], output: ["text"] },
          limits: { context: 128_000, output: 16_000 },
        },
      },
    },
  },
}
