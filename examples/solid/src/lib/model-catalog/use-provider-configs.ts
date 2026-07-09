import { createMemo, type Accessor } from "solid-js"
import type { Catalog } from "model-catalog"
import type { ProviderConfig } from "./types"

/**
 * Derives provider configuration state for the demo app.
 *
 * In a real app, `sourceProviderConfigs` can come from your backend instead of
 * local demo state, e.g. `const providerConfigsQuery = createResource(...)`.
 * The backend should return safe metadata such as `{ providerId, isConfigured,
 * isEnabled }`, not raw API keys or other secrets.
 */
export function useProviderConfigs(
  catalog: Accessor<Catalog>,
  configuredProviderIds: Accessor<readonly string[]>,
  providerSearch: Accessor<string>,
  sourceProviderConfigs?: Accessor<ProviderConfig[] | undefined>,
) {
  const providers = createMemo(() => catalog().listProviders())
  const visibleProviders = createMemo(() => catalog().listProviders({ query: providerSearch() }))
  const providerConfigs = createMemo<ProviderConfig[]>(
    (previous) => {
      const source = sourceProviderConfigs?.()
      if (source) return source

      const configuredProviders = new Set(configuredProviderIds())
      const next = providers().map((provider, index) => {
        const isConfigured = configuredProviders.has(provider.id)
        const current = previous?.[index]
        if (current?.id === provider.id && current.isConfigured === isConfigured) return current

        return {
          id: provider.id,
          provider: provider.id,
          providerId: provider.id,
          isConfigured,
          isEnabled: true,
        }
      })

      if (previous && previous.length === next.length && next.every((provider, index) => provider === previous[index])) return previous
      return next
    },
    [],
  )
  const enabledProviders = createMemo(() =>
    providerConfigs()
      .filter((provider) => provider.isEnabled && provider.isConfigured)
      .map((provider) => provider.providerId),
  )
  const enabledCount = () => enabledProviders().length

  return { providers, visibleProviders, providerConfigs, enabledProviders, enabledCount }
}
