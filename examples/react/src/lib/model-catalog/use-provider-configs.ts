import { useMemo } from "react"
import type { Catalog } from "model-catalog"
import type { ProviderConfig } from "./types"

export function useProviderConfigs(catalog: Catalog, apiKeys: Record<string, string>, providerSearch: string) {
  const providers = useMemo(() => catalog.listProviders(), [catalog])
  const visibleProviders = useMemo(() => catalog.listProviders({ query: providerSearch }), [catalog, providerSearch])
  const providerConfigs = useMemo<ProviderConfig[]>(
    () =>
      providers.map((provider) => ({
        id: provider.id,
        provider: provider.id,
        providerId: provider.id,
        hasApiKey: Boolean(apiKeys[provider.id]?.trim()),
        isEnabled: true,
      })),
    [apiKeys, providers],
  )
  const enabledProviders = useMemo(
    () => providerConfigs.filter((provider) => provider.hasApiKey).map((provider) => provider.provider),
    [providerConfigs],
  )
  const enabledCount = enabledProviders.length

  return { providers, visibleProviders, providerConfigs, enabledProviders, enabledCount }
}
