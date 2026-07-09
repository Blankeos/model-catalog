import { createMemo, type Accessor } from "solid-js"
import type { Catalog } from "model-catalog"
import type { ProviderConfig } from "./types"

export function useProviderConfigs(
  catalog: Accessor<Catalog>,
  apiKeys: Record<string, string>,
  providerSearch: Accessor<string>,
) {
  const providers = createMemo(() => catalog().listProviders())
  const visibleProviders = createMemo(() => catalog().listProviders({ query: providerSearch() }))
  const providerConfigs = createMemo<ProviderConfig[]>(
    (previous) => {
      const next = providers().map((provider, index) => {
        const hasApiKey = Boolean(apiKeys[provider.id]?.trim())
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
      .filter((provider) => provider.hasApiKey)
      .map((provider) => provider.provider),
  )
  const enabledCount = () => enabledProviders().length

  return { providers, visibleProviders, providerConfigs, enabledProviders, enabledCount }
}
