export const CATALOG_SCHEMA_VERSION = 1

export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

export type Modality =
  | "text"
  | "image"
  | "audio"
  | "video"
  | "pdf"
  | "embedding"
  | "unknown"
  | (string & {})

export type ModelCapability =
  | "attachment"
  | "reasoning"
  | "tool_call"
  | "temperature"
  | "structured_output"
  | "embedding"
  | "open_weights"
  | "batch"
  | "image_input"
  | "image_output"
  | "audio_input"
  | "audio_output"
  | "video_input"
  | "pdf_input"
  | (string & {})

export type Provider = {
  id: string
  name: string
  api?: string
  doc?: string
  env?: string[]
  npm?: string
  logoUrl?: string
  metadata?: Record<string, JsonValue>
  models: Record<string, Model>
}

export type Model = {
  id: string
  name: string
  providerId: string
  description?: string
  family?: string
  modalities?: {
    input?: Modality[]
    output?: Modality[]
  }
  capabilities: ModelCapability[]
  features?: {
    attachment?: boolean
    reasoning?: boolean
    toolCall?: boolean
    temperature?: boolean
    structuredOutput?: boolean
    openWeights?: boolean
    [key: string]: boolean | undefined
  }
  limits?: {
    context?: number
    output?: number
  }
  pricing?: {
    input?: number
    output?: number
    cacheRead?: number
    cacheWrite?: number
    [key: string]: number | undefined
  }
  knowledgeCutoff?: string
  releaseDate?: string
  lastUpdated?: string
  deprecated?: boolean
  status?: "active" | "deprecated" | "preview" | "unknown" | (string & {})
  metadata?: Record<string, JsonValue>
  raw?: unknown
}

export type SourceMetadata = {
  id: string
  name: string
  url?: string
  fetchedAt?: string
}

export type GeneratorMetadata = {
  id: string
  name?: string
  ranAt: string
}

export type CatalogSnapshot = {
  schemaVersion: number
  generatedAt: string
  sources: SourceMetadata[]
  generators: GeneratorMetadata[]
  providers: Record<string, Provider>
}

export type Catalog = {
  snapshot: CatalogSnapshot
  getProvider(providerId: string): Provider | undefined
  getModel(providerId: string, modelId: string): Model | undefined
  listProviders(options?: ListProvidersOptions): ListedProvider[]
  listModels(options?: ListModelsOptions): ListedModel[]
  listModels(options: GroupedListModelsOptions): GroupedModelList
}

export type ProviderInput = {
  id: string
  name?: string
  api?: string
  doc?: string
  env?: string[]
  npm?: string
  logoUrl?: string
  metadata?: Record<string, JsonValue>
  models?: Record<string, ModelInput> | ModelInput[]
}

export type ModelInput = {
  id: string
  name?: string
  providerId?: string
  description?: string
  family?: string
  modalities?: {
    input?: Modality[]
    output?: Modality[]
  }
  capabilities?: ModelCapability[] | Partial<Record<ModelCapability, boolean>>
  features?: Model["features"]
  limits?: Model["limits"]
  pricing?: Model["pricing"]
  knowledgeCutoff?: string
  releaseDate?: string
  lastUpdated?: string
  deprecated?: boolean
  status?: Model["status"]
  metadata?: Record<string, JsonValue>
  raw?: unknown
}

export type ListProvidersOptions = {
  includeProviders?: string[]
  excludeProviders?: string[]
  query?: string
}

export type ListedProvider = {
  id: string
  name: string
  logoUrl?: string
  modelCount: number
  provider: Provider
}

export type ListedModel = {
  key: string
  value: string
  providerId: string
  providerName: string
  providerLogoUrl?: string
  modelId: string
  name: string
  description?: string
  family?: string
  capabilities: ModelCapability[]
  modalities?: Model["modalities"]
  context?: number
  outputLimit?: number
  deprecated?: boolean
  provider: Provider
  model: Model
}

export type GroupedModelList = {
  groups: Array<{
    key: string
    providerId: string
    providerName: string
    providerLogoUrl?: string
    models: ListedModel[]
  }>
}

export type ListModelsBaseOptions = {
  includeProviders?: string[]
  excludeProviders?: string[]
  includeModels?: string[]
  excludeModels?: string[]
  providerId?: string
  providerIds?: string[]
  require?: ModelCapability[]
  reasoning?: boolean
  toolCall?: boolean
  attachment?: boolean
  temperature?: boolean
  structuredOutput?: boolean
  openWeights?: boolean
  minContext?: number
  excludeDeprecated?: boolean
  inputModalities?: Modality[]
  outputModalities?: Modality[]
  query?: string
}

export type ListModelsOptions = ListModelsBaseOptions & {
  groupBy?: undefined
}

export type GroupedListModelsOptions = ListModelsBaseOptions & {
  groupBy: "providerId"
}

export type AnyListModelsOptions = ListModelsOptions | GroupedListModelsOptions

export type Logger = {
  debug?: (...args: unknown[]) => void
  info?: (...args: unknown[]) => void
  warn?: (...args: unknown[]) => void
  error?: (...args: unknown[]) => void
}

export type MutableCatalog = {
  providers: Record<string, Provider>
}

export type GeneratorContext = {
  catalog: MutableCatalog
  fetch: typeof fetch
  logger: Logger
  addProvider(provider: ProviderInput): void
  addModel(providerId: string, model: ModelInput): void
  updateProvider(providerId: string, patch: Partial<ProviderInput>): void
  updateModel(providerId: string, modelId: string, patch: Partial<ModelInput>): void
  removeProvider(providerId: string): void
  removeModel(providerId: string, modelId: string): void
}

export type CatalogGeneratorKind = "static" | "api" | "runtime"

export type CatalogGenerator = {
  id: string
  name?: string
  kind?: CatalogGeneratorKind
  generate(ctx: GeneratorContext): void | Promise<void>
}

export type StaticCatalogGenerator = CatalogGenerator & { kind: "static" }
export type ApiCatalogGenerator = CatalogGenerator & { kind: "api" }
export type RuntimeCatalogGenerator = CatalogGenerator & { kind: "runtime" }

export type RefreshSource = {
  id: string
  name?: string
  url?: string
  fetch(fetchImpl: typeof fetch): Promise<unknown>
}

export type RefreshSnapshotOptions = {
  source?: RefreshSource
  generators?: CatalogGenerator[]
  fetch?: typeof fetch
  logger?: Logger
  now?: () => Date
}

export type ModelCatalogConfig = {
  generators?: CatalogGenerator[]
  source?: RefreshSource
}
