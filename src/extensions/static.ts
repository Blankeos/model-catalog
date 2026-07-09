import catalogExtensions from "./catalog_extensions.json" with { type: "json" }
import { normalizeModelsDevResponse } from "../models-dev.js"
import type { ProviderInput, StaticCatalogGenerator } from "../types.js"

export const catalogExtensionProviders = normalizeModelsDevResponse(catalogExtensions)

/**
 * Static JSON extension generator.
 *
 * Use this pattern for small, hand-maintained providers/models that are missing
 * from models.dev and do not need network discovery or a custom JS builder.
 */

export function catalogExtensionsGenerator(): StaticCatalogGenerator {
  return staticProvidersGenerator({
    id: "catalog-extensions",
    name: "Catalog extensions",
    providers: Object.values(catalogExtensionProviders),
  })
}

export function staticProvidersGenerator(input: {
  id: string
  name?: string
  providers: ProviderInput[] | Record<string, ProviderInput>
}): StaticCatalogGenerator {
  return {
    id: input.id,
    name: input.name,
    kind: "static",
    generate(ctx) {
      const providers = Array.isArray(input.providers) ? input.providers : Object.values(input.providers)
      for (const provider of providers) ctx.addProvider(provider)
    },
  }
}
