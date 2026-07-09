import { CATALOG_SCHEMA_VERSION, type CatalogSnapshot, type Model, type ModelCapability, type ModelInput, type Modality, type Provider, type ProviderInput } from "./types.js"

export function normalizeProvider(input: ProviderInput): Provider {
  const provider: Provider = {
    id: input.id,
    name: input.name ?? input.id,
    models: {},
  }

  if (input.api !== undefined) provider.api = input.api
  if (input.doc !== undefined) provider.doc = input.doc
  if (input.env !== undefined) provider.env = [...input.env]
  if (input.npm !== undefined) provider.npm = input.npm
  if (input.logoUrl !== undefined) provider.logoUrl = input.logoUrl
  if (input.metadata !== undefined) provider.metadata = { ...input.metadata }

  if (Array.isArray(input.models)) {
    for (const model of input.models) {
      provider.models[model.id] = normalizeModel(model, provider.id)
    }
  } else if (input.models) {
    for (const [modelId, model] of Object.entries(input.models)) {
      provider.models[modelId] = normalizeModel({ ...model, id: model.id ?? modelId }, provider.id)
    }
  }

  return provider
}

export function normalizeModel(input: ModelInput, providerId: string): Model {
  const capabilities = normalizeCapabilities(input)
  const model: Model = {
    id: normalizeModelId(input.id, providerId),
    name: input.name ?? input.id,
    providerId,
    capabilities,
  }

  if (input.description !== undefined) model.description = input.description
  if (input.family !== undefined) model.family = input.family
  if (input.modalities !== undefined) {
    model.modalities = {
      input: input.modalities.input ? [...input.modalities.input] : undefined,
      output: input.modalities.output ? [...input.modalities.output] : undefined,
    }
  }
  if (input.features !== undefined) model.features = { ...input.features }
  if (input.limits !== undefined) model.limits = { ...input.limits }
  if (input.pricing !== undefined) model.pricing = { ...input.pricing }
  if (input.knowledgeCutoff !== undefined) model.knowledgeCutoff = input.knowledgeCutoff
  if (input.releaseDate !== undefined) model.releaseDate = input.releaseDate
  if (input.lastUpdated !== undefined) model.lastUpdated = input.lastUpdated
  if (input.deprecated !== undefined) model.deprecated = input.deprecated
  if (input.status !== undefined) model.status = input.status
  if (input.metadata !== undefined) model.metadata = { ...input.metadata }
  if (input.raw !== undefined) model.raw = input.raw

  return model
}

export function normalizeModelId(id: string, providerId: string): string {
  const prefix = `${providerId}/`
  return id.startsWith(prefix) ? id.slice(prefix.length) : id
}

export function modelKey(providerId: string, modelId: string): string {
  return `${providerId}/${normalizeModelId(modelId, providerId)}`
}

export function cloneSnapshot(snapshot: CatalogSnapshot): CatalogSnapshot {
  return {
    schemaVersion: snapshot.schemaVersion ?? CATALOG_SCHEMA_VERSION,
    generatedAt: snapshot.generatedAt,
    sources: snapshot.sources.map((source) => ({ ...source })),
    generators: snapshot.generators.map((generator) => ({ ...generator })),
    providers: Object.fromEntries(
      Object.entries(snapshot.providers).map(([providerId, provider]) => [providerId, cloneProvider(provider)])
    ),
  }
}

export function cloneProvider(provider: Provider): Provider {
  return {
    ...provider,
    env: provider.env ? [...provider.env] : undefined,
    metadata: provider.metadata ? { ...provider.metadata } : undefined,
    models: Object.fromEntries(Object.entries(provider.models).map(([modelId, model]) => [modelId, cloneModel(model)])),
  }
}

export function cloneModel(model: Model): Model {
  return {
    ...model,
    capabilities: [...model.capabilities],
    modalities: model.modalities
      ? {
          input: model.modalities.input ? [...model.modalities.input] : undefined,
          output: model.modalities.output ? [...model.modalities.output] : undefined,
        }
      : undefined,
    features: model.features ? { ...model.features } : undefined,
    limits: model.limits ? { ...model.limits } : undefined,
    pricing: model.pricing ? { ...model.pricing } : undefined,
    metadata: model.metadata ? { ...model.metadata } : undefined,
  }
}

export function sortedProviders(providers: Record<string, Provider>): Provider[] {
  return Object.values(providers).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
}

export function sortedModels(providers: Record<string, Provider>): Model[] {
  return sortedProviders(providers).flatMap((provider) =>
    Object.values(provider.models).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
  )
}

export function hasAllCapabilities(model: Model, capabilities: readonly ModelCapability[] | undefined): boolean {
  if (!capabilities || capabilities.length === 0) return true
  const set = new Set(model.capabilities)
  return capabilities.every((capability) => set.has(capability))
}

export function hasModalities(modelModalities: readonly Modality[] | undefined, required: readonly Modality[] | undefined): boolean {
  if (!required || required.length === 0) return true
  if (!modelModalities || modelModalities.length === 0) return false
  const set = new Set(modelModalities)
  return required.every((modality) => set.has(modality))
}

function normalizeCapabilities(input: ModelInput): ModelCapability[] {
  const out = new Set<ModelCapability>()

  if (Array.isArray(input.capabilities)) {
    for (const capability of input.capabilities) out.add(capability)
  } else if (input.capabilities) {
    for (const [capability, enabled] of Object.entries(input.capabilities)) {
      if (enabled) out.add(capability)
    }
  }

  if (input.features) {
    if (input.features.attachment) out.add("attachment")
    if (input.features.reasoning) out.add("reasoning")
    if (input.features.toolCall) out.add("tool_call")
    if (input.features.temperature) out.add("temperature")
    if (input.features.structuredOutput) out.add("structured_output")
    if (input.features.openWeights) out.add("open_weights")
  }

  if (input.modalities?.input?.includes("image")) out.add("image_input")
  if (input.modalities?.output?.includes("image")) out.add("image_output")
  if (input.modalities?.input?.includes("audio")) out.add("audio_input")
  if (input.modalities?.output?.includes("audio")) out.add("audio_output")
  if (input.modalities?.input?.includes("video")) out.add("video_input")
  if (input.modalities?.input?.includes("pdf")) out.add("pdf_input")
  if (input.modalities?.output?.includes("embedding")) out.add("embedding")

  return [...out].sort()
}
