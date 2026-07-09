# model-catalog: first plan

## What this library is

`model-catalog` is a frameworkless, storage-agnostic toolkit for compiling AI model metadata into a portable catalog and listing/filtering models.

It is not an LLM SDK. It does not call chat/completions APIs. It does not own app storage. It does not try to be a database adapter layer.

The core loop is:

```txt
Refresh:
  models.dev + built-in generators + user generators
  -> CatalogSnapshot

Use:
  CatalogSnapshot
  -> catalog.listModels, filters)

List:
  CatalogSnapshot + provider filters + query
  -> ModelList
```

## Primary goals

1. Make it easy to consume `models.dev` data.
2. Support custom providers and custom generators for model data that `models.dev` does not cover.
3. Produce a stable `CatalogSnapshot` that apps can store anywhere.
4. Provide plain, UI-agnostic model lists that apps can render however they want.
5. Keep the core frameworkless and storage-agnostic.
6. Add a tiny CLI as convenience, not as the core abstraction.

## Non-goals

- No chat/completion client SDK.
- No provider credential flows.
- No database adapters.
- No framework-specific packages in v1.
- No mandatory storage abstraction.
- No React/Solid/Vue/Svelte components in v1.
- No attempt to hide where data is stored.

Apps should be able to do:

```ts
const snapshot = await refreshSnapshot({ generators });
await saveSnapshotWherever(snapshot);

const catalog = createCatalog(snapshot);
const models = catalog.listModels({
  includeProviders: ["anthropic", "openai"],
  query: "claude tools",
  groupBy: "providerId",
});
```

## Package name

Working package name:

```txt
model-catalog
```

Possible public imports:

```ts
import {
  refreshSnapshot,
  createCatalog,
  defineGenerator,
} from "model-catalog";
```

Optional CLI binary:

```bash
model-catalog refresh --out ./model-catalog.json
model-catalog generate --out ./src/model-catalog.generated.ts
model-catalog inspect ./model-catalog.json
model-catalog list ./model-catalog.json
```

## Core concepts

### 1. CatalogSnapshot

A serializable JSON object containing providers, models, metadata, schema version, and generation details.

```ts
type CatalogSnapshot = {
  schemaVersion: number;
  generatedAt: string;
  sources: SourceMetadata[];
  generators: GeneratorMetadata[];
  providers: Record<string, Provider>;
};
```

Provider records should include `logoUrl` when known. For providers sourced from models.dev, default it to `https://models.dev/logos/{provider}.svg` so app UIs can use icons directly from the final snapshot without rebuilding provider/logo maps.

This is the main output of `refreshSnapshot()`.

The app owns where it stores this:

- database
- file
- localStorage
- IndexedDB
- API endpoint
- embedded static JSON
- generated TypeScript module

### 2. Catalog

Create a lightweight query wrapper around a `CatalogSnapshot`.

```ts
const catalog = createCatalog(snapshot);
const models = catalog.listModels({
  includeProviders: ["anthropic"],
  query: "claude tools",
});
```

`createCatalog()` and `catalog.listModels()` should not fetch, save, or mutate storage.

### 3. App-owned provider filtering

The core package should not model provider credentials or provider configuration. Apps that want to show only configured providers should derive provider IDs themselves and pass them to `catalog.listModels({ includeProviders })`.

### 4. Model listing

`catalog.listModels()` is the primary convenience API. It returns plain enriched model records, not a UI-specific selector shape.

```ts
const models = catalog.listModels({
  includeProviders: ["anthropic", "openai"],
  query: "claude tools",
});
```

`includeProviders` is useful when an app already knows which providers should appear, such as providers configured by the current user. It should stay app-owned; the library should not require secrets or own provider credential flows.

Example item shape:

```ts
type ListedModel = {
  key: string;
  providerId: string;
  providerName: string;
  modelId: string;
  name: string;
  description?: string;
  family?: string;
  capabilities: ModelCapability[];
  context?: number;
  deprecated?: boolean;
};
```

Possible options:

```ts
type ListModelsOptions = {
  includeProviders?: string[];
  excludeProviders?: string[];
  includeModels?: string[];
  excludeModels?: string[];
  require?: ModelCapability[];
  minContext?: number;
  excludeDeprecated?: boolean;
  query?: string;
  groupBy?: "providerId";
};
```

### 5. Grouping

Grouping should be supported as data shaping, not as a selector-view abstraction.

```ts
const grouped = catalog.listModels({
  includeProviders: ["anthropic", "openai"],
  groupBy: "providerId",
});
```

Possible shape:

```ts
type GroupedModelList = {
  groups: Array<{
    key: string;
    providerId: string;
    providerName: string;
    models: ListedModel[];
  }>;
};
```

For v1, only `groupBy: "providerId"` is necessary. Other grouping modes can wait.

### 6. Search/filtering

Search should be a small built-in filter over listed model data, not a fuzzy search engine and not UI state management.

```ts
const results = catalog.listModels({
  includeProviders: ["anthropic", "openai"],
  query: "claude tools",
});
```

Search should match:

- provider name
- provider id
- model name
- model id
- family
- capabilities

## Refresh pipeline

### Main API

```ts
const snapshot = await refreshSnapshot({
  generators: [
    myCustomGenerator,
  ],
});
```

`refreshSnapshot()` should:

1. Fetch `models.dev` data.
2. Normalize it into the internal schema.
3. Apply built-in generators.
4. Apply user generators.
5. Return a serializable `CatalogSnapshot`.

It should not save to disk, save to a database, read provider config, or build UI state.

### Source of truth

`models.dev` is the default source.

It can be implicit in v1:

```ts
await refreshSnapshot({ generators });
```

Or explicit if needed:

```ts
await refreshSnapshot({
  source: modelsDevSource(),
  generators,
});
```

Prefer simple v1 API, but keep room for future multiple sources.

## Generator API

Generators add, modify, or remove providers/models during refresh.

```ts
const myGenerator = defineGenerator({
  id: "my-company",
  async generate(ctx) {
    ctx.addProvider({
      id: "company",
      name: "Company Gateway",
      models: {
        fast: {
          id: "fast",
          name: "Fast",
          capabilities: {
            toolCall: true,
            reasoning: false,
          },
          limits: {
            context: 128_000,
            output: 8_000,
          },
        },
      },
    });
  },
});
```

Possible context:

```ts
type GeneratorContext = {
  catalog: MutableCatalog;
  fetch: typeof fetch;
  logger: Logger;
  addProvider(provider: ProviderInput): void;
  addModel(providerId: string, model: ModelInput): void;
  updateProvider(providerId: string, patch: Partial<ProviderInput>): void;
  updateModel(providerId: string, modelId: string, patch: Partial<ModelInput>): void;
  removeProvider(providerId: string): void;
  removeModel(providerId: string, modelId: string): void;
};
```

### Built-in generators

Start small.

Potential built-ins:

- catalog patches for known missing providers/models
- OpenAI-compatible provider helper
- provider alias helper
- model family normalization helper

Avoid local runtime generators in the first pass unless necessary. For example, Ollama depends on machine-local state, so it may be better as a user generator recipe rather than a default built-in.

### OpenAI-compatible helper

This is likely very useful.

```ts
const myGateway = openAICompatibleProvider({
  id: "company-gateway",
  name: "Company Gateway",
  baseUrl: "https://api.company.com/v1",
  models: [
    {
      id: "fast",
      name: "Fast",
      capabilities: { toolCall: true },
      limits: { context: 128_000 },
    },
  ],
});
```

This helper can return a generator.

## Tiny CLI

The CLI is optional convenience. It should be a thin wrapper over the pure API.

### Commands

#### `refresh`

Writes a JSON snapshot to a file.

```bash
model-catalog refresh --out ./model-catalog.json
```

With config:

```bash
model-catalog refresh --config ./model-catalog.config.ts --out ./model-catalog.json
```

#### `generate`

Writes a TypeScript module containing a static catalog snapshot.

```bash
model-catalog generate --out ./src/model-catalog.generated.ts
```

Generated usage:

```ts
import { catalog } from "./model-catalog.generated";
```

#### `inspect`

Prints summary information.

```bash
model-catalog inspect ./model-catalog.json
```

Output ideas:

```txt
Providers: 18
Models: 340
Generated: 2026-07-09T...
Schema: 1
Generators:
  - models.dev
  - commandcode
  - custom-company
```

#### `list`

Lists models from a snapshot.

```bash
model-catalog list ./model-catalog.json
model-catalog list ./model-catalog.json --provider anthropic
model-catalog list ./model-catalog.json --reasoning --tools
```

### Config file

Optional config for custom generators.

```ts
// model-catalog.config.ts
import {
  defineConfig,
} from "model-catalog";
import { myCompanyGenerator } from "./my-company-generator";

export default defineConfig({
  generators: [
    myCompanyGenerator,
  ],
});
```

The config should not contain storage details unless the CLI specifically needs an `--out` path. Keep output explicit in CLI args.

## Common app recipes

### 1. Fullstack server-owned app

```txt
server refreshes catalog
server stores snapshot in DB/file/cache
server stores real provider credentials
server computes model list or returns catalog + safe provider state
client renders/searches models
```

Server computes models:

```ts
const includeProviders = await getEnabledProviderIdsForUser(user.id);
const models = catalog.listModels({
  includeProviders,
  groupBy: "providerId",
});

return Response.json(models);
```

### 2. CLI app

```txt
CLI refreshes catalog
CLI stores snapshot wherever the app wants
CLI stores provider config locally
CLI lists models locally
```

```ts
const snapshot = await refreshSnapshot();
await writeFile(catalogPath, JSON.stringify(snapshot, null, 2));

const includeProviders = await loadEnabledProviderIds();
const models = catalog.listModels({
  includeProviders,
  groupBy: "providerId",
});
```

### 3. Local-only browser/app

```txt
browser/app refreshes catalog on first online run
browser/app stores snapshot locally
browser/app stores local provider config
browser/app lists models locally
```

```ts
const snapshot = await refreshSnapshot();
localStorage.setItem("model-catalog", JSON.stringify(snapshot));

const includeProviders = JSON.parse(localStorage.getItem("enabled-providers") ?? "[]");
const models = catalog.listModels({
  includeProviders,
});
```

### 4. Server-generated, client-owned local app

```txt
server periodically generates catalog snapshot
client downloads snapshot
client stores snapshot locally
client stores provider config locally
client lists models locally
```

```ts
const snapshot = await fetch("/model-catalog.json").then((r) => r.json());
localStorage.setItem("model-catalog", JSON.stringify(snapshot));

const includeProviders = loadEnabledProviderIds();
const models = catalog.listModels({
  includeProviders,
});
```

## Suggested v1 API surface

```ts
// refresh
refreshSnapshot(options?: RefreshSnapshotOptions): Promise<CatalogSnapshot>;
defineGenerator(generator: CatalogGenerator): CatalogGenerator;
defineConfig(config: ModelCatalogConfig): ModelCatalogConfig;

// catalog
createCatalog(snapshot: CatalogSnapshot): Catalog;

catalog.getProvider(providerId: string): Provider | undefined;
catalog.getModel(providerId: string, modelId: string): Model | undefined;
catalog.listProviders(options?: ListProvidersOptions): ListedProvider[];
catalog.listModels(options?: ListModelsOptions): ListedModel[] | GroupedModelList;
```

## Suggested initial files

```txt
src/
  index.ts
  refresh.ts
  models-dev.ts
  generator.ts
  list.ts
  search.ts
  types.ts
  config.ts
  cli.ts
```

Tests:

```txt
tests/
  refresh.test.ts
  generator.test.ts
  list.test.ts
  search.test.ts
```

## Implementation phases

### Phase 1: Core types and catalog wrapper

- Define provider/model/catalog snapshot types.
- Implement `createCatalog(snapshot)`.
- Add `catalog.getModel()`, `catalog.getProvider()`, `catalog.listModels()`, and `catalog.listProviders()`.
- Add unit tests for catalog-driven listing.

### Phase 2: models.dev refresh

- Implement `modelsDevSource()` or internal models.dev fetcher.
- Normalize models.dev provider/model shape.
- Implement `refreshSnapshot()` returning `CatalogSnapshot`.
- Include schema version and generation metadata.
- Add unit tests with fixture data.

### Phase 3: Generator system

- Implement `defineGenerator()`.
- Implement mutable catalog context.
- Allow add/update/remove provider/model.
- `refreshSnapshot()` runs the baseline catalog by default: `models.dev` plus `catalog_extensions.json`.
- Add tests for custom generators.

### Phase 4: Listing filters

- Keep provider config app-owned.
- Support provider/model include and exclude filters.
- Support capability, modality, context, deprecated, and query filters.
- Add tests for listing filters.

### Phase 5: Model listing

- Implement `catalog.listModels()` and `catalog.listProviders()`.
- Support `includeProviders`, `excludeProviders`, capability, modality, context, deprecated, and query filters.
- Support `groupBy: "providerId"`.
- Add tests for flat and grouped list shapes.

### Phase 6: Search filtering

- Add `query` support to `catalog.listModels()`.
- Search model/provider names, ids, families, and capabilities.
- Keep it pure and fast.
- Add tests for search behavior.

### Phase 7: Tiny CLI

- Add `model-catalog refresh --out`.
- Add `model-catalog generate --out`.
- Add `model-catalog inspect`.
- Add `model-catalog list` if still useful.
- CLI should call the same core functions.

### Phase 8: UI examples

Examples should live in a separate top-level folder and should not be part of the published package surface.

```txt
examples/
  solid/
    chat-model-selector.tsx
```

The first example should be SolidJS and should replicate `/Users/carlo/Desktop/Projects/ai-studio/src/components/chat/chat-model-selector.tsx` as closely as possible while consuming `model-catalog` APIs instead of owning catalog normalization itself. It should be self-contained and compile-ready, not pseudocode.

The Solid example should keep the same component contract and UX ideas:

- loading or importing a generated catalog snapshot
- deriving configured providers from app-owned provider config state
- calling `catalog.listModels({ includeProviders, query, groupBy: "providerId" })`
- filtering to text-only chat models where appropriate
- `ChatModelSelector` component
- selected value shape: `{ provider: string; modelId: string } | null`
- `onChange(next)` callback
- optional `title`, `iconOnly`, and `class` props if still useful
- popover trigger with selected-model display
- command/search input
- provider facet filtering
- virtualized model list
- app-owned favorites/recent/last-model state
- provider icons when present in catalog metadata
- empty state that points users to provider/API-key settings

Because people use examples as references, the file should include small local implementations for app-owned pieces instead of importing from ai-studio:

- minimal popover behavior
- minimal command/search shell
- minimal provider facet filter
- minimal provider-config hook/mock boundary
- minimal favorites state
- minimal last-selected-model state
- minimal provider icon map or text fallback
- minimal `cn()` helper

The example may depend on normal public packages such as `solid-js` and `@tanstack/solid-virtual`, but it must not depend on ai-studio path aliases or private app components. A user should be able to copy `examples/solid/chat-model-selector.tsx` into a Solid app, provide a snapshot, and compile with only ordinary dependency installation.

Important boundary: examples may be opinionated and may replicate real app UX exactly; core should remain unopinionated and should not absorb favorites, recents, Solid state, virtualizers, popovers, command menus, or settings flows.

## Design rules

1. Storage is app-owned.
2. Auth secrets are app-owned.
3. The library owns data contracts and transformations.
4. Listing APIs should only need catalog/filter inputs, never secrets.
5. The CLI is convenience only.
6. Framework adapters should wait until core is stable; examples are allowed earlier because they are not package API.
7. Keep generated snapshots serializable and schema-versioned.
9. Do not make `refreshSnapshot()` responsible for persistence.
10. Do not make users adopt a specific runtime.

## Open questions

1. Should `models.dev` be implicit in `refreshSnapshot()` or passed as `source: modelsDevSource()`?
2. What should the first schema version include exactly?
3. Which opt-in generators should ship first beyond the baseline catalog?
4. How much should `Model` preserve raw `models.dev` fields versus normalized fields?
5. Should `generate` output a raw snapshot or a ready-to-use `catalog` export?
6. Should local/runtime providers like Ollama be built-in generators, recipes, or separate package later?

## Current recommendation on open questions

1. Make `models.dev` implicit for v1 simplicity, but keep an internal source boundary.
2. Keep schema v1 close to models.dev plus normalized convenience fields.
3. Keep the baseline implicit (`models.dev` + `catalog_extensions.json`) and require named opt-in generators for latency/runtime sources.
4. Preserve raw data under `raw?: unknown` only if useful, but avoid leaking unstable shape everywhere.
5. `generate` should output a snapshot module:

   ```ts
   export const snapshot = { ... };
   export default snapshot;
   ```

6. Keep Ollama/local runtime generators out of default v1.
7. Start provider-level. Add model-level provider config later if real use cases appear.
