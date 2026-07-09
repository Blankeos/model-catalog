import { createEffect, createMemo, createSignal, type Accessor } from "solid-js"
import type { Catalog } from "model-catalog"
import type { ChatModelValue } from "./types"

export function useSelectedChatModel(catalog: Accessor<Catalog>, enabledProviders: Accessor<string[]>) {
  const availableModels = createMemo(() =>
    catalog().listModels({
      includeProviders: enabledProviders(),
      outputModalities: ["text"],
      excludeDeprecated: true,
      groupBy: "providerId",
    }),
  )
  const firstAvailable = createMemo<ChatModelValue | null>(() => {
    const first = availableModels().groups[0]?.models[0]
    return first ? { provider: first.providerId, modelId: first.modelId } : null
  })
  const [selectedModel, setSelectedModel] = createSignal<ChatModelValue | null>(firstAvailable())
  const selectedProvider = createMemo(() => selectedModel()?.provider ?? null)

  createEffect(() => {
    const provider = selectedProvider()
    if (!provider) {
      const fallback = firstAvailable()
      if (!fallback) return
      setSelectedModel(fallback)
      return
    }
    if (!enabledProviders().includes(provider)) setSelectedModel(firstAvailable())
  })

  return { selectedModel, setSelectedModel }
}
