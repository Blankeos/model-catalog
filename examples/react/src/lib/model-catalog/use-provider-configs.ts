import { useMemo } from "react"
import type { Catalog } from "model-catalog"
import type { ProviderConfig } from "./types"

/**
 * Derives provider configuration state for the demo app.
 *
 * In a real app, `sourceProviderConfigs` can come from your backend instead of
 * local API-key inputs, e.g. `const { data } = useQuery(api.providerConfigs.list)`.
 * The backend should return safe metadata such as `{ provider, hasApiKey,
 * isEnabled }`, not raw API keys.
 */
export function useProviderConfigs(
  catalog: Catalog,
  apiKeys: Record<string, string>,
  providerSearch: string,
  sourceProviderConfigs?: ProviderConfig[],
) {
  const providers = useMemo(() => catalog.listProviders(), [catalog])
  const visibleProviders = useMemo(() => catalog.listProviders({ query: providerSearch }), [catalog, providerSearch])

  const providerConfigs = useMemo<ProviderConfig[]>(
    () =>
      sourceProviderConfigs ??
      providers.map((provider) => ({
        id: provider.id,
        provider: provider.id,
        providerId: provider.id,
        hasApiKey: Boolean(apiKeys[provider.id]?.trim()),
        isEnabled: true,
      })),
    [apiKeys, providers, sourceProviderConfigs],
  )
  const enabledProviders = useMemo(
    () => providerConfigs.filter((provider) => provider.isEnabled && provider.hasApiKey).map((provider) => provider.provider),
    [providerConfigs],
  )
  const enabledCount = enabledProviders.length

  return { providers, visibleProviders, providerConfigs, enabledProviders, enabledCount }
}
