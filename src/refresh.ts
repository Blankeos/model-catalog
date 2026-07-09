import { createGeneratorContext } from "./generator.js"
import { catalogExtensionsGenerator } from "./extensions/static.js"
import { modelsDevSource, normalizeModelsDevResponse } from "./models-dev.js"
import { CATALOG_SCHEMA_VERSION, type CatalogSnapshot, type RefreshSnapshotOptions } from "./types.js"

export async function refreshSnapshot(options: RefreshSnapshotOptions = {}): Promise<CatalogSnapshot> {
  const fetchImpl = options.fetch ?? globalThis.fetch
  if (!fetchImpl) throw new Error("refreshSnapshot requires a fetch implementation.")

  const now = options.now ?? (() => new Date())
  const generatedAt = now().toISOString()
  const source = options.source ?? modelsDevSource()
  const raw = await source.fetch(fetchImpl)
  const providers = normalizeModelsDevResponse(raw)
  const snapshot: CatalogSnapshot = {
    schemaVersion: CATALOG_SCHEMA_VERSION,
    generatedAt,
    sources: [
      {
        id: source.id,
        name: source.name ?? source.id,
        url: source.url,
        fetchedAt: generatedAt,
      },
    ],
    generators: [],
    providers,
  }

  const ctx = createGeneratorContext({
    catalog: { providers: snapshot.providers },
    fetch: fetchImpl,
    logger: options.logger,
  })

  for (const generator of [catalogExtensionsGenerator(), ...(options.generators ?? [])]) {
    await generator.generate(ctx)
    snapshot.generators.push({ id: generator.id, name: generator.name, ranAt: now().toISOString() })
  }

  return snapshot
}
