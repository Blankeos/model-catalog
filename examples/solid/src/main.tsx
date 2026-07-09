import { createEffect, createMemo, createSignal, For, Show } from "solid-js"
import { render } from "solid-js/web"
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
  const [catalog, setCatalog] = createSignal<Catalog>(initialCatalog)
  const [isRefreshing, setIsRefreshing] = createSignal(false)
  const [apiKeys, setApiKeys] = createSignal<Record<string, string>>(initialKeys)
  const [providerSearch, setProviderSearch] = createSignal("")

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

  const providers = createMemo(() => catalog().listProviders())
  const visibleProviders = createMemo(() => catalog().listProviders({ query: providerSearch() }))
  const providerConfigs = createMemo<ProviderConfig[]>(() =>
    providers().map((provider) => ({
      id: provider.id,
      provider: provider.id,
      providerId: provider.id,
      hasApiKey: Boolean(apiKeys()[provider.id]?.trim()),
      isEnabled: true,
    })),
  )
  const enabledProviders = createMemo(() =>
    providerConfigs()
      .filter((provider) => provider.hasApiKey)
      .map((provider) => provider.provider),
  )
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

  createEffect(() => {
    const selected = selectedModel()
    const fallback = firstAvailable()
    if (!selected && fallback) {
      setSelectedModel(fallback)
      return
    }
    if (selected && !enabledProviders().includes(selected.provider)) setSelectedModel(fallback)
  })

  const updateApiKey = (providerId: string, value: string) => {
    setApiKeys((current) => ({ ...current, [providerId]: value }))
  }

  const enabledCount = () => enabledProviders().length

  return (
    <main class="mx-auto w-full max-w-2xl py-10">
      {/* Header */}
      <header class="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 class="text-lg font-semibold tracking-tight text-zinc-900">ChatModelSelector</h1>
          <p class="mt-0.5 text-sm text-zinc-500">Enter fake keys to change available models.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refreshCatalog()} disabled={isRefreshing()}>
          {isRefreshing() ? "Refreshing…" : "Refresh"}
        </Button>
      </header>

      {/* Two-column layout */}
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Provider keys + search */}
        <Card class="flex max-h-[360px] flex-col">
          <CardHeader>
            <div class="flex items-center justify-between">
              <CardTitle>Provider Keys</CardTitle>
              <Badge variant="secondary">{enabledCount()} enabled</Badge>
            </div>
          </CardHeader>
          <CardContent class="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
            <Input
              value={providerSearch()}
              onInput={(event) => setProviderSearch(event.currentTarget.value)}
              placeholder="Search providers..."
              aria-label="Search providers"
            />
            <div class="-mr-1 flex-1 space-y-1 overflow-y-auto pr-1">
              <For each={visibleProviders()}>
                {(provider) => {
                  const hasKey = () => Boolean(apiKeys()[provider.id]?.trim())
                  return (
                    <label class="flex items-center gap-2">
                      <span class="flex w-28 shrink-0 items-center gap-1.5 text-xs text-zinc-600">
                        <Show
                          when={provider.logoUrl}
                          fallback={
                            <span class="grid h-4 w-4 shrink-0 place-items-center rounded-sm bg-zinc-100 text-[8px] font-bold uppercase text-zinc-500">
                              {provider.name.slice(0, 1)}
                            </span>
                          }
                        >
                          <img src={provider.logoUrl} alt="" class="h-4 w-4 shrink-0 rounded-sm object-contain" />
                        </Show>
                        <span class="truncate">{provider.name}</span>
                      </span>
                      <Input
                        value={apiKeys()[provider.id] ?? ""}
                        onInput={(event) => updateApiKey(provider.id, event.currentTarget.value)}
                        placeholder="fake key"
                        aria-label={`${provider.name} fake API key`}
                        class={cn("flex-1", hasKey() && "border-zinc-300")}
                      />
                    </label>
                  )
                }}
              </For>
            </div>
          </CardContent>
        </Card>

        {/* Model selector + output */}
        <Card class="flex flex-col">
          <CardHeader>
            <CardTitle>Model</CardTitle>
          </CardHeader>
          <CardContent class="flex flex-1 flex-col gap-3">
            <div>
              <ChatModelSelector
                catalog={catalog()}
                value={selectedModel()}
                onChange={setSelectedModel}
                providerConfigs={providerConfigs}
                title="Models"
              />
            </div>
            <pre class="mt-auto overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 text-xs text-zinc-700">
              {JSON.stringify(selectedModel(), null, 2)}
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

render(() => <App />, document.getElementById("root")!)
