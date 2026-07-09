import { createMemo, type Accessor } from "solid-js"
import type { Catalog } from "model-catalog"
import type { ProviderConfig } from "./types"

/**
 * Derives provider configuration state for the demo app.
 *
 * In a real app, `sourceProviderConfigs` can come from your backend instead of
 * local API-key inputs, e.g. `const providerConfigsQuery = createResource(...)`.
 * The backend should return safe metadata such as `{ provider, hasApiKey,
 * isEnabled }`, not raw API keys.
 */
export function useProviderConfigs(
  catalog: Accessor<Catalog>,
  apiKeys: Accessor<Record<string, string>>,
  providerSearch: Accessor<string>,
  sourceProviderConfigs?: Accessor<ProviderConfig[] | undefined>,
) {
  const providers = createMemo(() => catalog().listProviders())
  const visibleProviders = createMemo(() => catalog().listProviders({ query: providerSearch() }))
  const providerConfigs = createMemo<ProviderConfig[]>(
    (previous) => {
      const source = sourceProviderConfigs?.()
      if (source) return source

      const keys = apiKeys()
      const next = providers().map((provider, index) => {
        const hasApiKey = Boolean(keys[provider.id]?.trim())
        const current = previous?.[index]
        if (current?.id === provider.id && current.hasApiKey === hasApiKey) return current

        return {
          id: provider.id,
          provider: provider.id,
          providerId: provider.id,
          hasApiKey,
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
      .filter((provider) => provider.isEnabled && provider.hasApiKey)
      .map((provider) => provider.provider),
  )
  const enabledCount = () => enabledProviders().length

  return { providers, visibleProviders, providerConfigs, enabledProviders, enabledCount }
}
