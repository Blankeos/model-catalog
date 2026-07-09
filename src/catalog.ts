import type { Catalog, CatalogSnapshot, GroupedListModelsOptions, GroupedModelList, ListedModel, ListedProvider, ListModelsOptions, ListProvidersOptions, Model, Provider } from "./types.js"
import { cloneSnapshot, normalizeModelId } from "./normalize.js"
import { listCatalogModels, listCatalogProviders } from "./list.js"

export function createCatalog(snapshot: CatalogSnapshot): Catalog {
  const normalized = cloneSnapshot(snapshot)

  function listModels(options?: ListModelsOptions): ListedModel[]
  function listModels(options: GroupedListModelsOptions): GroupedModelList
  function listModels(options?: ListModelsOptions | GroupedListModelsOptions): ListedModel[] | GroupedModelList {
    if (options?.groupBy === "providerId") return listCatalogModels(normalized, options)
    return listCatalogModels(normalized, options)
  }

  return {
    snapshot: normalized,
    getProvider(providerId: string): Provider | undefined {
      return normalized.providers[providerId]
    },
    getModel(providerId: string, modelId: string): Model | undefined {
      const provider = normalized.providers[providerId]
      if (!provider) return undefined
      const localId = normalizeModelId(modelId, providerId)
      return provider.models[localId] ?? provider.models[modelId]
    },
    listProviders(options?: ListProvidersOptions): ListedProvider[] {
      return listCatalogProviders(normalized, options)
    },
    listModels,
  }
}
