import type { ApiCatalogGenerator, Modality, ModelCapability, ModelInput, ProviderInput } from "../types.js"

export const COMMANDCODE_PROVIDER_ID = "commandcode"
export const COMMANDCODE_PROVIDER_NAME = "Command Code"
export const COMMANDCODE_BASE_URL = "https://api.commandcode.ai/provider/v1"
export const COMMANDCODE_MODELS_URL = `${COMMANDCODE_BASE_URL}/models`
export const COMMANDCODE_DOC_URL = "https://commandcode.ai/docs/provider-api"
export const COMMANDCODE_NPM_PACKAGE = "@ai-sdk/openai-compatible"
export const COMMANDCODE_ANTHROPIC_NPM_PACKAGE = "@ai-sdk/anthropic"
export const COMMANDCODE_API_KEY_ENV = "CMD_API_KEY"

const DEFAULT_OUTPUT_LIMIT = 8_192

export type CommandCodeModel = {
  id: string
  name?: string
  context_length?: number
  capabilities?: string[]
  modalities?: {
    input?: Modality[]
    output?: Modality[]
  }
}

export type CommandCodeModelsResponse = {
  data: CommandCodeModel[]
}

export type CommandCodeGeneratorOptions = {
  strict?: boolean
}

/**
 * API-backed generator for Command Code.
 *
 * Source: https://api.commandcode.ai/provider/v1/models
 *
 * This is the "remote/API generator" pattern: the generator owns whatever
 * fetch/parsing logic it needs and then adds plain provider/model records.
 */
export function commandCodeGenerator(options: CommandCodeGeneratorOptions = {}): ApiCatalogGenerator {
  return {
    id: COMMANDCODE_PROVIDER_ID,
    name: COMMANDCODE_PROVIDER_NAME,
    kind: "api",
    async generate(ctx) {
      if (ctx.catalog.providers[COMMANDCODE_PROVIDER_ID]) return

      try {
        const response = await ctx.fetch(COMMANDCODE_MODELS_URL)
        if (!response.ok) throw new Error(`CommandCode models API returned ${response.status} ${response.statusText}`)

        const payload = (await response.json()) as CommandCodeModelsResponse
        ctx.addProvider(commandCodeProviderFromModels(Array.isArray(payload.data) ? payload.data : []))
      } catch (error) {
        if (options.strict) throw error
        ctx.logger.warn?.(`Skipped CommandCode model discovery: ${error instanceof Error ? error.message : String(error)}`)
      }
    },
  }
}

export function commandCodeProviderFromModels(models: CommandCodeModel[]): ProviderInput {
  return {
    id: COMMANDCODE_PROVIDER_ID,
    name: COMMANDCODE_PROVIDER_NAME,
    api: COMMANDCODE_BASE_URL,
    doc: COMMANDCODE_DOC_URL,
    env: [COMMANDCODE_API_KEY_ENV],
    npm: COMMANDCODE_NPM_PACKAGE,
    metadata: { generatorType: "api" },
    models: models
      .filter((model) => model.id.trim().length > 0)
      .map((model) => commandCodeModelInput(model)),
  }
}

function commandCodeModelInput(model: CommandCodeModel): ModelInput {
  const id = model.id.trim()
  const name = model.name?.trim() || id
  const inputModalities = supportsImageInput(id, model.capabilities ?? [], model.modalities) ? ["text", "image"] : ["text"]
  const capabilities = new Set<ModelCapability>(["tool_call", "temperature"])

  if (supportsReasoningEffort(id, name)) capabilities.add("reasoning")
  if (inputModalities.includes("image")) capabilities.add("attachment")
  if (inputModalities.includes("image")) capabilities.add("image_input")

  return {
    id,
    name,
    family: modelFamily(id),
    capabilities: [...capabilities].sort(),
    modalities: {
      input: inputModalities,
      output: model.modalities?.output ?? ["text"],
    },
    limits: model.context_length ? { context: model.context_length, output: DEFAULT_OUTPUT_LIMIT } : undefined,
    metadata: isAnthropicModel(id)
      ? {
          transport: {
            npm: COMMANDCODE_ANTHROPIC_NPM_PACKAGE,
            api: COMMANDCODE_BASE_URL,
          },
        }
      : undefined,
    raw: model,
  }
}

function supportsImageInput(modelId: string, capabilities: readonly string[], modalities: CommandCodeModel["modalities"]): boolean {
  if (modalities?.input?.includes("image")) return true
  if (capabilities.some((capability) => ["image", "vision"].includes(capability.toLowerCase()))) return true
  return knownVisionModel(modelId)
}

function knownVisionModel(modelId: string): boolean {
  const normalized = modelId.trim().toLowerCase()
  return [
    "moonshotai/kimi-k2.7-code",
    "moonshotai/kimi-k2.7-code-highspeed",
    "moonshotai/kimi-k2.6",
    "moonshotai/kimi-k2.5",
    "minimaxai/minimax-m3",
    "xiaomi/mimo-v2.5",
    "qwen/qwen3.6-plus",
    "qwen/qwen3.7-plus",
    "stepfun/step-3.7-flash",
    "claude-sonnet-5",
    "claude-sonnet-4-6",
    "claude-fable-5",
    "claude-opus-4-8",
    "claude-opus-4-7",
    "claude-haiku-4-5",
    "claude-haiku-4-5-20251001",
    "gpt-5.5",
    "gpt-5.4",
    "gpt-5.3-codex",
    "gpt-5.4-mini",
    "google/gemini-3.5-flash",
    "google/gemini-3.1-flash-lite",
    "sakana/fugu-ultra",
  ].includes(normalized)
}

function modelFamily(modelId: string): string {
  const normalized = modelId.trim()
  const familySource = normalized.split("/").at(-1) || normalized
  return familySource.split(/[.\-_]/)[0]?.trim().toLowerCase() || familySource.toLowerCase()
}

function isAnthropicModel(modelId: string): boolean {
  return modelId.toLowerCase().includes("claude")
}

function supportsReasoningEffort(modelId: string, modelName: string): boolean {
  const haystack = `${modelId.toLowerCase()} ${modelName.toLowerCase()}`
  return [
    "deepseek-v4-pro",
    "deepseek v4 pro",
    "deepseek-v4-flash",
    "deepseek v4 flash",
    "claude-sonnet-4-6",
    "claude-sonnet-4.6",
    "claude sonnet 4.6",
    "claude-fable-5",
    "claude fable 5",
    "claude-opus-4-6",
    "claude-opus-4.6",
    "claude opus 4.6",
    "claude-opus-4-7",
    "claude-opus-4.7",
    "claude opus 4.7",
    "gpt-5.5",
    "gpt 5.5",
    "gpt-5.4",
    "gpt 5.4",
    "gpt-5.3-codex",
    "gpt 5.3 codex",
    "gemini-3.5-flash",
    "gemini 3.5 flash",
    "gemini-3.1-flash-lite",
    "gemini 3.1 flash lite",
  ].some((needle) => haystack.includes(needle))
}
