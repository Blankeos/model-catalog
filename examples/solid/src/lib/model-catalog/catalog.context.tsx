import { createContext, createMemo, createSignal, useContext, type Accessor, type JSX } from "solid-js"
import type { ListedProvider } from "model-catalog"
import { createFlexSearch } from "../use-flex-search"
import { useCatalogState } from "./use-catalog-state"
import { useProviderConfigs } from "./use-provider-configs"
import { useSelectedChatModel } from "./use-selected-chat-model"
import type { ChatModelValue, ProviderConfig } from "./types"

type CatalogContextValue = {
  catalog: ReturnType<typeof useCatalogState>["catalog"]
  isRefreshing: ReturnType<typeof useCatalogState>["isRefreshing"]
  refreshCatalog: ReturnType<typeof useCatalogState>["refreshCatalog"]
  apiKeys: Accessor<Record<string, string>>
  setApiKey: (providerId: string, apiKey: string) => void
  providerSearch: Accessor<string>
  setProviderSearch: (query: string) => void
  providers: Accessor<ListedProvider[]>
  visibleProviders: Accessor<ListedProvider[]>
  providerConfigs: Accessor<ProviderConfig[]>
  enabledProviders: Accessor<string[]>
  enabledCount: Accessor<number>
  selectedModel: Accessor<ChatModelValue | null>
  setSelectedModel: (next: ChatModelValue) => void
}

const CatalogContext = createContext<CatalogContextValue>()

export function CatalogProvider(props: {
  initialApiKeys?: Record<string, string>
  /**
   * Optional backend-owned provider config records. In production this is often
   * the result of an API query that returns safe metadata like `hasApiKey` and
   * `isEnabled` while keeping raw API keys server-side.
   */
  providerConfigs?: Accessor<ProviderConfig[] | undefined>
  children: JSX.Element
}) {
  const { catalog, isRefreshing, refreshCatalog } = useCatalogState()
  const [apiKeys, setApiKeys] = createSignal<Record<string, string>>(props.initialApiKeys ?? {})
  const [providerSearch, setProviderSearch] = createSignal("")

  const providerSearchIndexer = (provider: ListedProvider) => [provider.id, provider.name].join(" ")
  const providers = createMemo(() => catalog().listProviders())
  const visibleProviders = createFlexSearch(providers, providerSearch, { indexerFn: providerSearchIndexer })
  const { providerConfigs, enabledProviders, enabledCount } = useProviderConfigs(catalog, apiKeys, providerSearch, props.providerConfigs)
  const { selectedModel, setSelectedModel } = useSelectedChatModel(catalog, enabledProviders)

  const value: CatalogContextValue = {
    catalog,
    isRefreshing,
    refreshCatalog,
    apiKeys,
    setApiKey(providerId, apiKey) {
      setApiKeys((current) => ({ ...current, [providerId]: apiKey }))
    },
    providerSearch,
    setProviderSearch,
    providers,
    visibleProviders,
    providerConfigs,
    enabledProviders,
    enabledCount,
    selectedModel,
    setSelectedModel,
  }

  return <CatalogContext.Provider value={value}>{props.children}</CatalogContext.Provider>
}

export function useCatalogContext() {
  const context = useContext(CatalogContext)
  if (!context) throw new Error("useCatalogContext must be used within <CatalogProvider>")
  return context
}
