import type { Model, ModelCapability, ModelInput, Provider, ProviderInput, RefreshSource } from "./types.js"
import { normalizeModel, normalizeProvider } from "./normalize.js"

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
  const modelsRaw = raw.models && typeof raw.models === "object" && !Array.isArray(raw.models) ? (raw.models as Record<string, unknown>) : {}
  const input: ProviderInput = {
    id: readString(raw.id) ?? providerId,
    name: readString(raw.name) ?? titleize(providerId),
    api: readString(raw.api),
    doc: readString(raw.doc),
    env: readStringArray(raw.env),
    npm: readString(raw.npm),
    logoUrl: readString(raw.logoUrl) ?? readString(raw.logo_url) ?? readString(raw.icon) ?? modelsDevLogoUrl(providerId),
    metadata: {},
    models: {},
  }

  for (const key of ["id", "name", "api", "doc", "env", "npm", "models", "logoUrl", "logo_url", "icon"]) {
    // omitted from metadata
    void key
  }

  for (const [key, value] of Object.entries(raw)) {
    if (["id", "name", "api", "doc", "env", "npm", "models", "logoUrl", "logo_url", "icon"].includes(key)) continue
    const json = toJsonValue(value)
    if (json !== undefined) input.metadata![key] = json
  }

  const provider = normalizeProvider(input)
  provider.models = {}

  for (const [modelId, modelRaw] of Object.entries(modelsRaw)) {
    if (!modelRaw || typeof modelRaw !== "object" || Array.isArray(modelRaw)) continue
    const model = normalizeModelsDevModel(modelId, provider.id, modelRaw as Record<string, unknown>)
    provider.models[model.id] = model
  }

  if (Object.keys(provider.metadata ?? {}).length === 0) delete provider.metadata

  return provider
}

function normalizeModelsDevModel(modelId: string, providerId: string, raw: Record<string, unknown>): Model {
  const inputModalities = readStringArray((raw.modalities as Record<string, unknown> | undefined)?.input)
  const outputModalities = readStringArray((raw.modalities as Record<string, unknown> | undefined)?.output)
  const features = {
    attachment: readBoolean(raw.attachment),
    reasoning: readBoolean(raw.reasoning),
    toolCall: readBoolean(raw.tool_call),
    temperature: readBoolean(raw.temperature),
    structuredOutput: readBoolean(raw.structured_output),
    openWeights: readBoolean(raw.open_weights),
  }
  const input: ModelInput = {
    id: readString(raw.id) ?? modelId,
    name: readString(raw.name) ?? modelId,
    providerId,
    description: readString(raw.description),
    family: readString(raw.family),
    modalities: {
      input: inputModalities,
      output: outputModalities,
    },
    capabilities: modelCapabilitiesFromRaw(raw, features, inputModalities, outputModalities),
    features,
    limits: {
      context: readNumber((raw.limit as Record<string, unknown> | undefined)?.context) ?? readNumber((raw.limits as Record<string, unknown> | undefined)?.context),
      output: readNumber((raw.limit as Record<string, unknown> | undefined)?.output) ?? readNumber((raw.limits as Record<string, unknown> | undefined)?.output),
    },
    pricing: {
      input: readNumber((raw.cost as Record<string, unknown> | undefined)?.input) ?? readNumber((raw.pricing as Record<string, unknown> | undefined)?.input),
      output: readNumber((raw.cost as Record<string, unknown> | undefined)?.output) ?? readNumber((raw.pricing as Record<string, unknown> | undefined)?.output),
      cacheRead: readNumber((raw.cost as Record<string, unknown> | undefined)?.cache_read) ?? readNumber((raw.pricing as Record<string, unknown> | undefined)?.cacheRead),
      cacheWrite: readNumber((raw.cost as Record<string, unknown> | undefined)?.cache_write) ?? readNumber((raw.pricing as Record<string, unknown> | undefined)?.cacheWrite),
    },
    knowledgeCutoff: readString(raw.knowledge),
    releaseDate: readString(raw.release_date),
    lastUpdated: readString(raw.last_updated),
    deprecated: readBoolean(raw.deprecated) || readString(raw.status) === "deprecated",
    status: readString(raw.status) as ModelInput["status"],
    metadata: {},
    raw,
  }

  for (const [key, value] of Object.entries(raw)) {
    if (
      [
        "id",
        "name",
        "description",
        "family",
        "modalities",
        "attachment",
        "reasoning",
        "reasoning_options",
        "tool_call",
        "temperature",
        "structured_output",
        "open_weights",
        "knowledge",
        "release_date",
        "last_updated",
        "deprecated",
        "status",
        "limit",
        "limits",
        "cost",
        "pricing",
      ].includes(key)
    ) {
      continue
    }
    const json = toJsonValue(value)
    if (json !== undefined) input.metadata![key] = json
  }

  const model = normalizeModel(input, providerId)
  if (Object.keys(model.metadata ?? {}).length === 0) delete model.metadata
  return model
}

function modelCapabilitiesFromRaw(
  raw: Record<string, unknown>,
  features: NonNullable<ModelInput["features"]>,
  inputModalities: string[] | undefined,
  outputModalities: string[] | undefined
): ModelCapability[] {
  const out = new Set<ModelCapability>()
  if (features.attachment) out.add("attachment")
  if (features.reasoning) out.add("reasoning")
  if (features.toolCall) out.add("tool_call")
  if (features.temperature) out.add("temperature")
  if (features.structuredOutput) out.add("structured_output")
  if (features.openWeights) out.add("open_weights")
  if (readBoolean(raw.batch)) out.add("batch")
  if (inputModalities?.includes("image")) out.add("image_input")
  if (outputModalities?.includes("image")) out.add("image_output")
  if (inputModalities?.includes("audio")) out.add("audio_input")
  if (outputModalities?.includes("audio")) out.add("audio_output")
  if (inputModalities?.includes("video")) out.add("video_input")
  if (inputModalities?.includes("pdf")) out.add("pdf_input")
  if (outputModalities?.includes("embedding")) out.add("embedding")
  return [...out].sort()
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined
}

function readStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : undefined
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
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
  if (Array.isArray(value)) {
    const items = value.map(toJsonValue).filter((item): item is import("./types.js").JsonValue => item !== undefined)
    return items
  }
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
