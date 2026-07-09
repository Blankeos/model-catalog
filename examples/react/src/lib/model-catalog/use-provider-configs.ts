import { useMemo } from "react"
import type { Catalog } from "model-catalog"
import type { ProviderConfig } from "./types"

/**
 * Derives provider configuration state for the demo app.
 *
 * In a real app, `sourceProviderConfigs` can come from your backend instead of
 * local demo state, e.g. `const { data } = useQuery(api.providerConfigs.list)`.
 * The backend should return safe metadata such as `{ providerId, isConfigured,
 * isEnabled }`, not raw API keys or other secrets.
 */
export function useProviderConfigs(
  catalog: Catalog,
  configuredProviderIds: readonly string[],
  providerSearch: string,
  sourceProviderConfigs?: ProviderConfig[],
) {
  const providers = useMemo(() => catalog.listProviders(), [catalog])
  const visibleProviders = useMemo(() => catalog.listProviders({ query: providerSearch }), [catalog, providerSearch])
  const configuredProviders = useMemo(() => new Set(configuredProviderIds), [configuredProviderIds])

  const providerConfigs = useMemo<ProviderConfig[]>(
    () =>
      sourceProviderConfigs ??
      providers.map((provider) => ({
        id: provider.id,
        provider: provider.id,
        providerId: provider.id,
        isConfigured: configuredProviders.has(provider.id),
        isEnabled: true,
      })),
    [configuredProviders, providers, sourceProviderConfigs],
  )
  const enabledProviders = useMemo(
    () => providerConfigs.filter((provider) => provider.isEnabled && provider.isConfigured).map((provider) => provider.providerId),
    [providerConfigs],
  )
  const enabledCount = enabledProviders.length

  return { providers, visibleProviders, providerConfigs, enabledProviders, enabledCount }
}
