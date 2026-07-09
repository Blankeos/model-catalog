import type { Model, ModelInput, Provider, ProviderInput, RefreshSource } from "./types.js"
import { normalizeModel, normalizeProvider, normalizeReasoningOptions } from "./normalize.js"

export const MODELS_DEV_API_URL = "https://models.dev/api.json"
export const MODELS_DEV_LOGO_BASE_URL = "https://models.dev/logos"

export function modelsDevSource(url = MODELS_DEV_API_URL): RefreshSource {
  return {
    id: "models.dev",
    name: "models.dev",
    url,
    async fetch(fetchImpl) {
      const response = await fetchImpl(url)
      if (!response.ok) throw new Error(`Failed to fetch models.dev catalog: ${response.status} ${response.statusText}`)
      return response.json()
    },
  }
}

export function modelsDevLogoUrl(providerId: string): string {
  return `${MODELS_DEV_LOGO_BASE_URL}/${providerId}.svg`
}

export function normalizeModelsDevResponse(raw: unknown): Record<string, Provider> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("models.dev response must be an object keyed by provider id.")
  }

  const providers: Record<string, Provider> = {}
  for (const [providerId, providerRaw] of Object.entries(raw as Record<string, unknown>)) {
    if (!providerRaw || typeof providerRaw !== "object" || Array.isArray(providerRaw)) continue
    providers[providerId] = normalizeModelsDevProvider(providerId, providerRaw as Record<string, unknown>)
  }
  return providers
}

function normalizeModelsDevProvider(providerId: string, raw: Record<string, unknown>): Provider {
  const modelsRaw = readRecord(raw.models) ?? {}
  const input: ProviderInput = {
    id: readString(raw.id) ?? providerId,
    name: readString(raw.name) ?? titleize(providerId),
    api: readString(raw.api),
    doc: readString(raw.doc),
    env: readStringArray(raw.env),
    npm: readString(raw.npm),
    models: {},
  }

  const provider = normalizeProvider(input)
  provider.models = {}

  for (const [modelId, modelRaw] of Object.entries(modelsRaw)) {
    if (!modelRaw || typeof modelRaw !== "object" || Array.isArray(modelRaw)) continue
    const model = normalizeModelsDevModel(modelId, provider.id, modelRaw as Record<string, unknown>)
    provider.models[model.id] = model
  }

  return provider
}

function normalizeModelsDevModel(modelId: string, providerId: string, raw: Record<string, unknown>): Model {
  const input: ModelInput = {
    id: readString(raw.id) ?? modelId,
    name: readString(raw.name) ?? modelId,
    description: readString(raw.description),
    family: readString(raw.family),
    attachment: readBoolean(raw.attachment),
    reasoning: readBoolean(raw.reasoning),
    reasoning_options: normalizeReasoningOptions(raw.reasoning_options),
    tool_call: readBoolean(raw.tool_call),
    structured_output: readBoolean(raw.structured_output),
    temperature: readBoolean(raw.temperature),
    knowledge: readString(raw.knowledge),
    release_date: readString(raw.release_date),
    last_updated: readString(raw.last_updated),
    modalities: normalizeModalities(raw.modalities),
    open_weights: readBoolean(raw.open_weights),
    limit: readRecord(raw.limit) as ModelInput["limit"],
    cost: readRecord(raw.cost) as ModelInput["cost"],
    provider: readRecord(raw.provider) as ModelInput["provider"],
    interleaved: readRecord(raw.interleaved),
    experimental: readRecord(raw.experimental),
    status: readString(raw.status) as ModelInput["status"],
    metadata: {},
  }

  for (const [key, value] of Object.entries(raw)) {
    if (MODELS_DEV_MODEL_KEYS.has(key)) continue
    const json = toJsonValue(value)
    if (json !== undefined) input.metadata![key] = json
  }

  const model = normalizeModel(input, providerId)
  if (Object.keys(model.metadata ?? {}).length === 0) delete model.metadata
  return model
}

const MODELS_DEV_MODEL_KEYS = new Set([
  "id",
  "name",
  "description",
  "family",
  "attachment",
  "reasoning",
  "reasoning_options",
  "tool_call",
  "structured_output",
  "temperature",
  "knowledge",
  "release_date",
  "last_updated",
  "modalities",
  "open_weights",
  "limit",
  "cost",
  "provider",
  "interleaved",
  "experimental",
  "status",
])

function normalizeModalities(value: unknown): ModelInput["modalities"] | undefined {
  const raw = readRecord(value)
  if (!raw) return undefined
  return {
    input: readStringArray(raw.input),
    output: readStringArray(raw.output),
  }
}

function readRecord(value: unknown): Record<string, import("./types.js").JsonValue> | undefined {
  const json = toJsonValue(value)
  return json && typeof json === "object" && !Array.isArray(json) ? json : undefined
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined
}

function readStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : undefined
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined
}

function titleize(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ")
}

function toJsonValue(value: unknown): import("./types.js").JsonValue | undefined {
  if (value === null) return null
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value
  if (Array.isArray(value)) return value.map(toJsonValue).filter((item): item is import("./types.js").JsonValue => item !== undefined)
  if (typeof value === "object" && value) {
    const out: Record<string, import("./types.js").JsonValue> = {}
    for (const [key, nested] of Object.entries(value)) {
      const json = toJsonValue(nested)
      if (json !== undefined) out[key] = json
    }
    return out
  }
  return undefined
}
