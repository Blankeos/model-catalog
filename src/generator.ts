import type { CatalogGenerator, GeneratorContext, Logger, ModelInput, MutableCatalog, ProviderInput } from "./types.js"
import { normalizeModel, normalizeModelId, normalizeProvider } from "./normalize.js"

export function defineGenerator(generator: CatalogGenerator): CatalogGenerator {
  return generator
}

export function createGeneratorContext(options: {
  catalog: MutableCatalog
  fetch: typeof fetch
  logger?: Logger
}): GeneratorContext {
  const logger = options.logger ?? {}

  function ensureProvider(providerId: string) {
    const provider = options.catalog.providers[providerId]
    if (!provider) throw new Error(`Provider '${providerId}' does not exist.`)
    return provider
  }

  return {
    catalog: options.catalog,
    fetch: options.fetch,
    logger,
    addProvider(providerInput: ProviderInput) {
      const provider = normalizeProvider(providerInput)
      const existing = options.catalog.providers[provider.id]
      options.catalog.providers[provider.id] = existing
        ? {
            ...existing,
            ...provider,
            models: { ...existing.models, ...provider.models },
          }
        : provider
    },
    addModel(providerId: string, modelInput: ModelInput) {
      const provider = ensureProvider(providerId)
      const model = normalizeModel(modelInput, providerId)
      provider.models[model.id] = model
    },
    updateProvider(providerId: string, patch: Partial<ProviderInput>) {
      const provider = ensureProvider(providerId)
      const models = patch.models ? normalizeProvider({ id: providerId, models: patch.models }).models : undefined
      options.catalog.providers[providerId] = {
        ...provider,
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.api !== undefined ? { api: patch.api } : {}),
        ...(patch.doc !== undefined ? { doc: patch.doc } : {}),
        ...(patch.env !== undefined ? { env: [...patch.env] } : {}),
        ...(patch.npm !== undefined ? { npm: patch.npm } : {}),
        ...(patch.logoUrl !== undefined ? { logoUrl: patch.logoUrl } : {}),
        ...(patch.metadata !== undefined ? { metadata: { ...(provider.metadata ?? {}), ...patch.metadata } } : {}),
        models: models ? { ...provider.models, ...models } : provider.models,
      }
    },
    updateModel(providerId: string, modelId: string, patch: Partial<ModelInput>) {
      const provider = ensureProvider(providerId)
      const localModelId = normalizeModelId(modelId, providerId)
      const existing = provider.models[localModelId] ?? provider.models[modelId]
      if (!existing) throw new Error(`Model '${modelId}' does not exist for provider '${providerId}'.`)
      const merged = normalizeModel(
        {
          ...existing,
          ...patch,
          id: patch.id ?? existing.id,
          name: patch.name ?? existing.name,
          providerId,
          capabilities: patch.capabilities ?? existing.capabilities,
          features: patch.features ?? existing.features,
          modalities: patch.modalities ?? existing.modalities,
          limits: patch.limits ?? existing.limits,
          pricing: patch.pricing ?? existing.pricing,
          metadata: patch.metadata ? { ...(existing.metadata ?? {}), ...patch.metadata } : existing.metadata,
        },
        providerId
      )
      delete provider.models[existing.id]
      provider.models[merged.id] = merged
    },
    removeProvider(providerId: string) {
      delete options.catalog.providers[providerId]
    },
    removeModel(providerId: string, modelId: string) {
      const provider = ensureProvider(providerId)
      const localModelId = normalizeModelId(modelId, providerId)
      delete provider.models[localModelId]
      delete provider.models[modelId]
    },
  }
}

export function openAICompatibleProvider(input: {
  id: string
  name: string
  baseUrl?: string
  api?: string
  doc?: string
  env?: string[]
  npm?: string
  logoUrl?: string
  models: ModelInput[] | Record<string, ModelInput>
}): CatalogGenerator {
  return defineGenerator({
    id: input.id,
    name: input.name,
    generate(ctx) {
      ctx.addProvider({
        id: input.id,
        name: input.name,
        api: input.api ?? input.baseUrl,
        doc: input.doc,
        env: input.env,
        npm: input.npm ?? "@ai-sdk/openai-compatible",
        logoUrl: input.logoUrl,
        metadata: input.baseUrl ? { baseUrl: input.baseUrl, compatibility: "openai" } : { compatibility: "openai" },
        models: input.models,
      })
    },
  })
}
