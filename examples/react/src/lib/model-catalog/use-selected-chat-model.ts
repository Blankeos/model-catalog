import { useEffect, useMemo, useState } from "react"
import type { Catalog } from "model-catalog"
import type { ChatModelValue } from "./types"

export function useSelectedChatModel(catalog: Catalog, enabledProviders: string[]) {
  const availableModels = useMemo(
    () =>
      catalog.listModels({
        includeProviders: enabledProviders,
        outputModalities: ["text"],
        excludeDeprecated: true,
        groupBy: "providerId",
      }),
    [catalog, enabledProviders],
  )
  const firstAvailable = availableModels.groups[0]?.models[0]
  const firstAvailableValue = firstAvailable ? { provider: firstAvailable.providerId, modelId: firstAvailable.modelId } : null
  const [selectedModel, setSelectedModel] = useState<ChatModelValue | null>(firstAvailableValue)

  useEffect(() => {
    if (!selectedModel && firstAvailableValue) {
      setSelectedModel(firstAvailableValue)
      return
    }
    if (!selectedModel || enabledProviders.includes(selectedModel.provider)) return
    setSelectedModel(firstAvailableValue)
  }, [enabledProviders, firstAvailableValue, selectedModel])

  return { selectedModel, setSelectedModel }
}
