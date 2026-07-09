# model-catalog

A tiny JS/TS library and CLI for building AI model catalogs and listing/filtering models.

Fetch [models.dev](https://models.dev/) once. Add custom generators. Store the snapshot anywhere. Render the model list your app wants.

## Why

- Powered by `models.dev`.
- Supports custom providers/generators for models that `models.dev` does not cover.
- Lists and filters models from catalog data with one core API: `catalog.listModels()`.
- Storage-agnostic: database, file, localStorage, API route, static JSON, generated TypeScript.
- Frameworkless core with copyable examples instead of framework adapters.

## Install

```bash
npm install model-catalog
```

## Quick start

```ts
import { createCatalog, refreshSnapshot } from "model-catalog";

const snapshot = await refreshSnapshot();

const catalog = createCatalog(snapshot);
const models = catalog.listModels({
  includeProviders: ["anthropic"],
  query: "claude tools",
  groupBy: "providerId",
});

console.log(models.groups[0]?.models[0]?.providerLogoUrl);
```

> `refreshSnapshot` is never a fast operation so make sure to persist `snapshot` somewhere (i.e. database, redis, a json file on a non-ephemeral deployment, indexedDB, localStorage) before using it with `createCatalog`.

## App-owned provider filtering

The package does not model provider credentials or provider configuration. If your app only wants to show providers that the current user configured, derive those provider IDs in your app and pass them to `includeProviders`.

```ts
const enabledProviders = providerConfigs
  .filter((provider) => provider.isEnabled && provider.hasApiKey)
  .map((provider) => provider.provider);

const catalog = createCatalog(snapshot);
const models = catalog.listModels({
  includeProviders: enabledProviders,
  require: ["tool_call"],
  minContext: 128_000,
  excludeDeprecated: true,
});
```

## Custom generators

Generators run during `refreshSnapshot()` and receive a tiny context with `ctx.addProvider()`, `ctx.addModel()`, `ctx.updateProvider()`, and `ctx.updateModel()`.

There are three useful patterns:

1. **Static JSON / static objects** for small catalog extensions.
2. **API-backed generators** that fetch from a remote endpoint and add plain provider/model records.
3. **Runtime generators** that inspect the current machine, such as a local CLI. Runtime generators are Node/machine-only and should not be used in browser bundles.

### Add models to an existing provider

If models.dev already has the provider and you only want to add or patch models, call `ctx.addProvider()` with the same provider id and only the models you care about. Existing provider data is preserved; model ids you define are added, and matching model ids are overwritten by your generator.

This is the same shape as the built-in `catalog_extensions.json` entry for xAI Composer 2.5.

```ts
import { defineGenerator, refreshSnapshot } from "model-catalog";

const xaiComposer = defineGenerator({
  id: "xai-composer-extension",
  kind: "static",
  generate(ctx) {
    ctx.addProvider({
      id: "xai",
      name: "xAI",
      models: [
        {
          id: "grok-composer-2.5-fast",
          name: "Composer 2.5",
          family: "grok-build",
          capabilities: ["tool_call", "structured_output", "temperature"],
          modalities: { input: ["text", "pdf"], output: ["text"] },
          limits: { context: 256_000, output: 256_000 },
          pricing: { input: 0.5, output: 2.5, cacheRead: 0.2 },
        },
      ],
    });
  },
});

const snapshot = await refreshSnapshot({ generators: [xaiComposer] });
```

### Add a completely new provider

For a provider that is not in models.dev, add the provider record and its models directly.

```ts
import { defineGenerator, refreshSnapshot } from "model-catalog";

const companyGateway = defineGenerator({
  id: "company-gateway",
  kind: "static",
  generate(ctx) {
    ctx.addProvider({
      id: "company",
      name: "Company Gateway",
      logoUrl: "https://example.com/company.svg",
      models: [
        {
          id: "fast",
          name: "Fast",
          capabilities: ["tool_call"],
          modalities: { input: ["text"], output: ["text"] },
          limits: { context: 128_000 },
        },
      ],
    });
  },
});

const snapshot = await refreshSnapshot({ generators: [companyGateway] });
```

### API-backed generator

For providers with a remote model endpoint, put the fetch/parsing logic in your generator. `model-catalog` does not need to know the provider's API URL shape; your generator just converts the response into provider/model records.

```ts
import { defineGenerator } from "model-catalog";

const remoteModels = defineGenerator({
  id: "remote-company-models",
  kind: "api",
  async generate(ctx) {
    const response = await ctx.fetch("https://api.company.test/v1/models");
    const payload = await response.json();

    ctx.addProvider({
      id: "company",
      name: "Company",
      api: "https://api.company.test/v1",
      npm: "@ai-sdk/openai-compatible",
      models: payload.data.map((model: { id: string; name?: string }) => ({
        id: model.id,
        name: model.name ?? model.id,
        capabilities: ["tool_call", "temperature"],
        modalities: { input: ["text"], output: ["text"] },
      })),
    });
  },
});
```

### Built-in generators

`refreshSnapshot()` already has the baseline catalog by default:

- `models.dev`
- `catalog_extensions.json`, package-maintained patches for things models.dev does not cover yet

There are also a few opt-in built-in generators:

```ts
import {
  commandCodeGenerator,
  ollamaCliGenerator,
  refreshSnapshot,
} from "model-catalog";

const snapshot = await refreshSnapshot({
  generators: [
    commandCodeGenerator(), // remote API-backed generator; opt-in latency
    ollamaCliGenerator(), // local CLI generator; opt-in machine state
  ],
});
```

- [x] commandCodeGenerator - for [commandcode.ai](https://commandcode.ai) since they're pretty much ignoring this [models.dev request](https://github.com/anomalyco/models.dev/issues/3086) and [opencode request](https://github.com/anomalyco/opencode/issues/26338).
- [x] ollamaCliGenerator() - runs `ollama ls` to get a personalized model list based on the user's config. It only works in Node.js on machines where the Ollama CLI is installed. Never run it in the browser; browser code cannot execute local CLIs.

## CLI

```bash
model-catalog refresh --out ./model-catalog.json
model-catalog generate --out ./src/model-catalog.generated.ts
model-catalog inspect ./model-catalog.json
model-catalog list ./model-catalog.json --provider anthropic --query claude --tools
```

## Examples

The core package does not export UI components. A self-contained, compile-ready Solid example lives at:

```txt
examples/solid/chat-model-selector.tsx
```

It shows how to achieve a great model-selector UX by consuming `catalog.listModels()`

## What this library is not

- A chat/completions SDK.
- A replacement for Vercel AI SDK or provider SDKs.
- Provider credential flows or secret storage.
- A database/storage adapter layer.
- A required model-selector UI abstraction.
- A replacement for models.dev. It is powered by it.

## License

MIT
