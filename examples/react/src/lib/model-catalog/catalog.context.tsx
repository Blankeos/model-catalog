import { createContext, useContext, useMemo, useState, type ReactNode } from "react"
import type { ListedProvider } from "model-catalog"
import { useFlexSearch } from "../use-flex-search"
import { useCatalogState } from "./use-catalog-state"
import { useProviderConfigs } from "./use-provider-configs"
import { useSelectedChatModel } from "./use-selected-chat-model"
import type { ChatModelValue, ProviderConfig } from "./types"

type CatalogContextValue = {
  catalog: ReturnType<typeof useCatalogState>["catalog"]
  isRefreshing: ReturnType<typeof useCatalogState>["isRefreshing"]
  refreshCatalog: ReturnType<typeof useCatalogState>["refreshCatalog"]
  configuredProviderIds: string[]
  setProviderConfigured: (providerId: string, isConfigured: boolean) => void
  providerSearch: string
  setProviderSearch: (query: string) => void
  providers: ListedProvider[]
  visibleProviders: ListedProvider[]
  providerConfigs: ProviderConfig[]
  enabledProviders: string[]
  enabledCount: number
  selectedModel: ChatModelValue | null
  setSelectedModel: (next: ChatModelValue) => void
}

const CatalogContext = createContext<CatalogContextValue | null>(null)

const providerSearchIndexer = (provider: ListedProvider) => [provider.id, provider.name].join(" ")

export function CatalogProvider(props: {
  initialConfiguredProviderIds?: string[]
  /**
   * Optional backend-owned provider config records. In production this is often
   * the result of an API query that returns safe metadata like `isConfigured`
   * and `isEnabled` while keeping raw API keys server-side.
   */
  providerConfigs?: ProviderConfig[]
  children: ReactNode
}) {
  const { catalog, isRefreshing, refreshCatalog } = useCatalogState()
  const [configuredProviderIds, setConfiguredProviderIds] = useState<string[]>(props.initialConfiguredProviderIds ?? [])
  const [providerSearch, setProviderSearch] = useState("")

  const providers = useMemo(() => catalog.listProviders(), [catalog])
  const visibleProviders = useFlexSearch(providers, providerSearch, { indexerFn: providerSearchIndexer })
  const { providerConfigs, enabledProviders, enabledCount } = useProviderConfigs(
    catalog,
    configuredProviderIds,
    providerSearch,
    props.providerConfigs,
  )
  const { selectedModel, setSelectedModel } = useSelectedChatModel(catalog, enabledProviders)

  const value = useMemo<CatalogContextValue>(
    () => ({
      catalog,
      isRefreshing,
      refreshCatalog,
      configuredProviderIds,
      setProviderConfigured(providerId, isConfigured) {
        setConfiguredProviderIds((current) => {
          const next = new Set(current)
          if (isConfigured) next.add(providerId)
          else next.delete(providerId)
          return [...next]
        })
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
    }),
    [
      catalog,
      configuredProviderIds,
      enabledCount,
      enabledProviders,
      isRefreshing,
      providerConfigs,
      providerSearch,
      providers,
      props.providerConfigs,
      refreshCatalog,
      selectedModel,
      setSelectedModel,
      visibleProviders,
    ],
  )

  return <CatalogContext.Provider value={value}>{props.children}</CatalogContext.Provider>
}

export function useCatalogContext() {
  const context = useContext(CatalogContext)
  if (!context) throw new Error("useCatalogContext must be used within <CatalogProvider>")
  return context
}
