import type { CatalogSnapshot, GroupedListModelsOptions, GroupedModelList, ListedModel, ListedProvider, ListModelsOptions, ListProvidersOptions, Model, Provider } from "./types.js"
import { hasAllCapabilities, hasModalities, modelCapabilities, modelKey, sortedProviders } from "./normalize.js"
import { capabilitySearchTerms, matchesQuery } from "./search.js"
import { modelsDevLogoUrl } from "./models-dev.js"

export function listCatalogProviders(snapshot: CatalogSnapshot, options: ListProvidersOptions = {}): ListedProvider[] {
  const includeProviders = options.includeProviders ? new Set(options.includeProviders) : undefined
  const excludeProviders = new Set(options.excludeProviders ?? [])

  return sortedProviders(snapshot.providers)
    .filter((provider) => {
      if (includeProviders && !includeProviders.has(provider.id)) return false
      if (excludeProviders.has(provider.id)) return false
      if (options.query && !matchesQuery([provider.id, provider.name, provider.api, provider.doc], options.query)) return false
      return true
    })
    .map((provider) => ({
      id: provider.id,
      name: provider.name,
      logoUrl: provider.logoUrl ?? modelsDevLogoUrl(provider.id),
      modelCount: Object.keys(provider.models).length,
      provider,
    }))
}

export function listCatalogModels(snapshot: CatalogSnapshot, options?: ListModelsOptions): ListedModel[]
export function listCatalogModels(snapshot: CatalogSnapshot, options: GroupedListModelsOptions): GroupedModelList
export function listCatalogModels(snapshot: CatalogSnapshot, options: ListModelsOptions | GroupedListModelsOptions = {}): ListedModel[] | GroupedModelList {
  const includeProviders = options.includeProviders ? new Set(options.includeProviders) : undefined
  const excludeProviders = new Set(options.excludeProviders ?? [])
  const includeModels = options.includeModels ? new Set(options.includeModels) : undefined
  const excludeModels = new Set(options.excludeModels ?? [])

  const listed: ListedModel[] = []

  for (const provider of sortedProviders(snapshot.providers)) {
    if (includeProviders && !includeProviders.has(provider.id)) continue
    if (excludeProviders.has(provider.id)) continue

    for (const model of Object.values(provider.models)) {
      const key = modelKey(provider.id, model.id)
      if (options.providerId && provider.id !== options.providerId) continue
      if (options.providerIds && !options.providerIds.includes(provider.id)) continue
      if (includeModels && !includeModels.has(key) && !includeModels.has(model.id)) continue
      if (excludeModels.has(key) || excludeModels.has(model.id)) continue
      if (!hasAllCapabilities(model, requiredCapabilities(options))) continue
      if (!hasModalities(model.modalities?.input, options.inputModalities)) continue
      if (!hasModalities(model.modalities?.output, options.outputModalities)) continue
      if (options.minContext !== undefined && (model.limit?.context ?? 0) < options.minContext) continue
      if (options.excludeDeprecated && model.status === "deprecated") continue
      if (options.query && !matchesListedQuery(provider, model, options.query)) continue

      listed.push(toListedModel(provider, model))
    }
  }

  listed.sort(compareListedModels)

  if (options.groupBy === "providerId") {
    const groups = new Map<string, GroupedModelList["groups"][number]>()
    for (const item of listed) {
      let group = groups.get(item.providerId)
      if (!group) {
        group = {
          key: item.providerId,
          providerId: item.providerId,
          providerName: item.providerName,
          providerLogoUrl: item.providerLogoUrl,
          models: [],
        }
        groups.set(item.providerId, group)
      }
      group.models.push(item)
    }
    return { groups: [...groups.values()].sort((a, b) => a.providerName.localeCompare(b.providerName) || a.providerId.localeCompare(b.providerId)) }
  }

  return listed
}

function toListedModel(provider: Provider, model: Model): ListedModel {
  const key = modelKey(provider.id, model.id)
  const capabilities = modelCapabilities(model)
  const providerLogoUrl = provider.logoUrl ?? modelsDevLogoUrl(provider.id)
  const item: ListedModel = {
    key,
    value: key,
    providerId: provider.id,
    providerName: provider.name,
    modelId: model.id,
    name: model.name,
    capabilities,
    reasoningOptions: model.reasoning_options.map((option) => ({ ...option, values: option.values ? [...option.values] : undefined })),
    provider,
    model,
  }
  if (providerLogoUrl !== undefined) item.providerLogoUrl = providerLogoUrl
  if (model.description !== undefined) item.description = model.description
  if (model.family !== undefined) item.family = model.family
  if (model.modalities !== undefined) item.modalities = model.modalities
  if (model.limit?.context !== undefined) item.context = model.limit.context
  if (model.limit?.output !== undefined) item.outputLimit = model.limit.output
  if (model.status === "deprecated") item.deprecated = true
  return item
}

function matchesListedQuery(provider: Provider, model: Model, query: string): boolean {
  return matchesQuery(
    [
      provider.id,
      provider.name,
      model.id,
      modelKey(provider.id, model.id),
      model.name,
      model.description,
      model.family,
      ...capabilitySearchTerms(modelCapabilities(model)),
      ...(model.modalities?.input ?? []),
      ...(model.modalities?.output ?? []),
    ],
    query
  )
}

function compareListedModels(a: ListedModel, b: ListedModel): number {
  return a.providerName.localeCompare(b.providerName) || a.providerId.localeCompare(b.providerId) || a.name.localeCompare(b.name) || a.modelId.localeCompare(b.modelId)
}

function requiredCapabilities(options: ListModelsOptions | GroupedListModelsOptions): NonNullable<ListModelsOptions["require"]> {
  const required = new Set(options.require ?? [])
  if (options.reasoning) required.add("reasoning")
  if (options.toolCall) required.add("tool_call")
  if (options.attachment) required.add("attachment")
  if (options.temperature) required.add("temperature")
  if (options.structuredOutput) required.add("structured_output")
  if (options.openWeights) required.add("open_weights")
  return [...required]
}
