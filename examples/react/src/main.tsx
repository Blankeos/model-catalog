import { useEffect, useMemo, useState } from "react"
import { createRoot } from "react-dom/client"
import { createCatalog, refreshSnapshot, type Catalog, type CatalogSnapshot } from "model-catalog"
import fallbackSnapshot from "../../catalog-snapshot.json"
import { ChatModelSelector, type ChatModelValue, type ProviderConfig } from "./components/chat-model-selector"
import { Button } from "./components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card"
import { Input } from "./components/ui/input"
import { Badge } from "./components/ui/badge"
import { cn } from "./lib/utils"
import "./styles.css"

const snapshotStorageKey = "model-catalog:example:snapshot"
const cachedSnapshot = readSnapshot()
const initialCatalog = createCatalog(cachedSnapshot ?? (fallbackSnapshot as CatalogSnapshot))
const initialKeys: Record<string, string> = {
  openai: "sk-fake-openai",
  anthropic: "sk-fake-anthropic",
}

function App() {
  const [catalog, setCatalog] = useState<Catalog>(initialCatalog)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [apiKeys, setApiKeys] = useState<Record<string, string>>(initialKeys)
  const [providerSearch, setProviderSearch] = useState("")

  const refreshCatalog = async () => {
    setIsRefreshing(true)
    try {
      const snapshot = await refreshSnapshot()
      writeSnapshot(snapshot)
      setCatalog(createCatalog(snapshot))
    } catch {
      // Keep the cached snapshot available when the network is offline.
    } finally {
      setIsRefreshing(false)
    }
  }

  const providers = useMemo(() => catalog.listProviders(), [catalog])
  const visibleProviders = useMemo(() => {
    const query = normalizeSearch(providerSearch)
    if (!query) return providers
    const tokens = query.split(/\s+/)

    return providers.filter((provider) => {
      const haystack = `${provider.id} ${provider.name} ${provider.provider.api ?? ""} ${provider.provider.doc ?? ""}`.toLowerCase()
      return tokens.every((token) => haystack.includes(token))
    })
  }, [providerSearch, providers])
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

  const updateApiKey = (providerId: string, value: string) => {
    setApiKeys((current) => ({ ...current, [providerId]: value }))
  }

  const enabledCount = enabledProviders.length

  return (
    <main className="mx-auto w-full max-w-2xl py-10">
      {/* Header */}
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900">ChatModelSelector</h1>
          <p className="mt-0.5 text-sm text-zinc-500">Enter fake keys to change available models.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refreshCatalog()} disabled={isRefreshing}>
          {isRefreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </header>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Provider keys + search */}
        <Card className="flex max-h-[360px] flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Provider Keys</CardTitle>
              <Badge variant="secondary">{enabledCount} enabled</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
            <Input
              value={providerSearch}
              onChange={(event) => setProviderSearch(event.currentTarget.value)}
              placeholder="Search providers..."
              aria-label="Search providers"
            />
            <div className="-mr-1 flex-1 space-y-1 overflow-y-auto pr-1">
              {visibleProviders.map((provider) => {
                const hasKey = Boolean(apiKeys[provider.id]?.trim())
                return (
                  <label key={provider.id} className="flex items-center gap-2">
                    <span className="flex w-28 shrink-0 items-center gap-1.5 text-xs text-zinc-600">
                      {provider.logoUrl ? (
                        <img src={provider.logoUrl} alt="" className="h-4 w-4 shrink-0 rounded-sm object-contain" />
                      ) : (
                        <span className="grid h-4 w-4 shrink-0 place-items-center rounded-sm bg-zinc-100 text-[8px] font-bold uppercase text-zinc-500">
                          {provider.name.slice(0, 1)}
                        </span>
                      )}
                      <span className="truncate">{provider.name}</span>
                    </span>
                    <Input
                      value={apiKeys[provider.id] ?? ""}
                      onChange={(event) => updateApiKey(provider.id, event.currentTarget.value)}
                      placeholder="fake key"
                      aria-label={`${provider.name} fake API key`}
                      className={cn("flex-1", hasKey && "border-zinc-300")}
                    />
                  </label>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Model selector + output */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Model</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3">
            <div>
              <ChatModelSelector
                catalog={catalog}
                value={selectedModel}
                onChange={setSelectedModel}
                providerConfigs={providerConfigs}
                title="Models"
              />
            </div>
            <pre className="mt-auto overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 text-xs text-zinc-700">
              {JSON.stringify(selectedModel, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function readSnapshot() {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(snapshotStorageKey)
  if (!raw) return null
  try {
    return JSON.parse(raw) as CatalogSnapshot
  } catch {
    return null
  }
}

function writeSnapshot(snapshot: CatalogSnapshot) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(snapshotStorageKey, JSON.stringify(snapshot))
}

function normalizeSearch(value: string) {
  return value.toLowerCase().trim()
}

createRoot(document.getElementById("root")!).render(<App />)
