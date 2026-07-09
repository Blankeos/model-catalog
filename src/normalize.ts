import { CATALOG_SCHEMA_VERSION, type CatalogSnapshot, type JsonValue, type Model, type ModelCapability, type ModelInput, type Modality, type Provider, type ProviderInput, type ReasoningOption } from "./types.js"

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
  if (input.metadata !== undefined) provider.metadata = cloneJsonObject(input.metadata)

  if (Array.isArray(input.models)) {
    for (const model of input.models) {
      const normalized = normalizeModel(model, provider.id)
      provider.models[normalized.id] = normalized
    }
  } else if (input.models) {
    for (const [modelId, model] of Object.entries(input.models)) {
      const normalized = normalizeModel({ ...model, id: model.id ?? modelId }, provider.id)
      provider.models[normalized.id] = normalized
    }
  }

  return provider
}

export function normalizeModel(input: ModelInput, providerId: string): Model {
  const model: Model = {
    id: normalizeModelId(input.id, providerId),
    name: input.name ?? input.id,
    attachment: input.attachment ?? false,
    reasoning: input.reasoning ?? false,
    reasoning_options: normalizeReasoningOptions(input.reasoning_options),
    tool_call: input.tool_call ?? false,
    structured_output: input.structured_output ?? false,
    temperature: input.temperature ?? false,
    open_weights: input.open_weights ?? false,
  }

  const modalities = normalizeModalities(input.modalities)
  const limit = normalizeLimit(input.limit)
  const cost = normalizeCost(input.cost)
  const provider = normalizeJsonObject(input.provider) as Model["provider"] | undefined
  const interleaved = normalizeJsonObject(input.interleaved)
  const experimental = normalizeJsonObject(input.experimental)

  if (input.description !== undefined) model.description = input.description
  if (input.family !== undefined) model.family = input.family
  if (input.knowledge !== undefined) model.knowledge = input.knowledge
  if (input.release_date !== undefined) model.release_date = input.release_date
  if (input.last_updated !== undefined) model.last_updated = input.last_updated
  if (modalities !== undefined) model.modalities = modalities
  if (limit !== undefined) model.limit = limit
  if (cost !== undefined) model.cost = cost
  if (provider !== undefined) model.provider = provider
  if (interleaved !== undefined) model.interleaved = interleaved
  if (experimental !== undefined) model.experimental = experimental
  if (input.status !== undefined) model.status = input.status
  if (input.metadata !== undefined) model.metadata = cloneJsonObject(input.metadata)

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
    providers: Object.fromEntries(Object.entries(snapshot.providers).map(([providerId, provider]) => [providerId, cloneProvider(provider)])),
  }
}

export function cloneProvider(provider: Provider): Provider {
  return {
    ...provider,
    env: provider.env ? [...provider.env] : undefined,
    metadata: provider.metadata ? cloneJsonObject(provider.metadata) : undefined,
    models: Object.fromEntries(Object.entries(provider.models).map(([modelId, model]) => [modelId, cloneModel(model)])),
  }
}

export function cloneModel(model: Model): Model {
  return {
    ...model,
    reasoning_options: model.reasoning_options.map(cloneReasoningOption),
    modalities: model.modalities
      ? {
          input: model.modalities.input ? [...model.modalities.input] : undefined,
          output: model.modalities.output ? [...model.modalities.output] : undefined,
        }
      : undefined,
    limit: model.limit ? { ...model.limit } : undefined,
    cost: model.cost ? cloneJsonObject(model.cost) : undefined,
    provider: model.provider ? cloneJsonObject(model.provider) : undefined,
    interleaved: model.interleaved ? cloneJsonObject(model.interleaved) : undefined,
    experimental: model.experimental ? cloneJsonObject(model.experimental) : undefined,
    metadata: model.metadata ? cloneJsonObject(model.metadata) : undefined,
  }
}

export function sortedProviders(providers: Record<string, Provider>): Provider[] {
  return Object.values(providers).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
}

export function sortedModels(providers: Record<string, Provider>): Model[] {
  return sortedProviders(providers).flatMap((provider) => Object.values(provider.models).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)))
}

export function modelCapabilities(model: Model): ModelCapability[] {
  const out = new Set<ModelCapability>()
  if (model.attachment) out.add("attachment")
  if (model.reasoning) out.add("reasoning")
  if (model.tool_call) out.add("tool_call")
  if (model.temperature) out.add("temperature")
  if (model.structured_output) out.add("structured_output")
  if (model.open_weights) out.add("open_weights")
  if (model.modalities?.input?.includes("image")) out.add("image_input")
  if (model.modalities?.output?.includes("image")) out.add("image_output")
  if (model.modalities?.input?.includes("audio")) out.add("audio_input")
  if (model.modalities?.output?.includes("audio")) out.add("audio_output")
  if (model.modalities?.input?.includes("video")) out.add("video_input")
  if (model.modalities?.input?.includes("pdf")) out.add("pdf_input")
  if (model.modalities?.output?.includes("embedding")) out.add("embedding")
  return [...out].sort()
}

export function hasAllCapabilities(model: Model, capabilities: readonly ModelCapability[] | undefined): boolean {
  if (!capabilities || capabilities.length === 0) return true
  const set = new Set(modelCapabilities(model))
  return capabilities.every((capability) => set.has(capability))
}

export function hasModalities(modelModalities: readonly Modality[] | undefined, required: readonly Modality[] | undefined): boolean {
  if (!required || required.length === 0) return true
  if (!modelModalities || modelModalities.length === 0) return false
  const set = new Set(modelModalities)
  return required.every((modality) => set.has(modality))
}

export function normalizeReasoningOptions(value: unknown): ReasoningOption[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return []
    const raw = item as Record<string, unknown>
    const type = readString(raw.type)
    if (!type) return []
    const option: ReasoningOption = { type }
    for (const [key, nested] of Object.entries(raw)) {
      if (key === "type") continue
      if (key === "values") {
        const values = readStringArray(nested)
        if (values) option.values = values
        continue
      }
      const json = toJsonValue(nested)
      if (json !== undefined) option[key] = json
    }
    return [option]
  })
}

function normalizeModalities(value: unknown): Model["modalities"] | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined
  const raw = value as Record<string, unknown>
  const input = readStringArray(raw.input)
  const output = readStringArray(raw.output)
  if (!input && !output) return undefined
  return { input, output }
}

function normalizeLimit(value: unknown): Model["limit"] | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined
  const out: NonNullable<Model["limit"]> = {}
  for (const [key, nested] of Object.entries(value)) {
    if (typeof nested === "number" && Number.isFinite(nested)) out[key] = nested
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function normalizeCost(value: unknown): Model["cost"] | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined
  const out: NonNullable<Model["cost"]> = {}
  for (const [key, nested] of Object.entries(value)) {
    const json = toJsonValue(nested)
    if (json !== undefined) out[key] = json
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function normalizeJsonObject(value: unknown): Record<string, JsonValue> | undefined {
  const json = toJsonValue(value)
  return json && typeof json === "object" && !Array.isArray(json) ? json : undefined
}

function cloneReasoningOption(option: ReasoningOption): ReasoningOption {
  return cloneJsonObject(option)
}

function cloneJsonObject<T extends Record<string, JsonValue | undefined>>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined
}

function readStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : undefined
}

function toJsonValue(value: unknown): JsonValue | undefined {
  if (value === null) return null
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value
  if (Array.isArray(value)) return value.map(toJsonValue).filter((item): item is JsonValue => item !== undefined)
  if (typeof value === "object" && value) {
    const out: Record<string, JsonValue> = {}
    for (const [key, nested] of Object.entries(value)) {
      const json = toJsonValue(nested)
      if (json !== undefined) out[key] = json
    }
    return out
  }
  return undefined
}
