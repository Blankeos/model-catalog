import { createRoot } from "react-dom/client"
import { ChatModelSelector } from "./components/chat-model-selector"
import { Button } from "./components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card"
import { Input } from "./components/ui/input"
import { Badge } from "./components/ui/badge"
import { CatalogProvider, useCatalogContext } from "./lib/model-catalog"
import "./styles.css"

const initialConfiguredProviderIds = ["openai", "anthropic"]

const maskedApiKey = "••••••••••••••••"

function App() {
  return (
    <CatalogProvider initialConfiguredProviderIds={initialConfiguredProviderIds}>
      <CatalogDemo />
    </CatalogProvider>
  )
}

function CatalogDemo() {
  const {
    catalog,
    isRefreshing,
    refreshCatalog,
    configuredProviderIds,
    setProviderConfigured,
    providerSearch,
    setProviderSearch,
    visibleProviders,
    providerConfigs,
    enabledCount,
    selectedModel,
    setSelectedModel,
  } = useCatalogContext()

  return (
    <main className="mx-auto w-full max-w-2xl py-10">
      {/* Header */}
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900">ChatModelSelector</h1>
          <p className="mt-0.5 text-sm text-zinc-500">Add provider API keys to change available models.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refreshCatalog()} disabled={isRefreshing}>
          {isRefreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </header>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Provider config + search */}
        <Card className="flex max-h-[360px] flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Provider Config</CardTitle>
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
            <div className="-mr-1 flex-1 space-y-2 overflow-y-auto pr-1">
              {visibleProviders.map((provider) => {
                const isConfigured = configuredProviderIds.includes(provider.id)
                return (
                  <div key={provider.id} className="rounded-lg border border-zinc-200 p-2">
                    <label className="mb-1.5 flex min-w-0 items-center gap-1.5 text-xs font-medium text-zinc-700">
                      {provider.logoUrl ? (
                        <img src={provider.logoUrl} alt="" className="h-4 w-4 shrink-0 rounded-sm object-contain" />
                      ) : (
                        <span className="grid h-4 w-4 shrink-0 place-items-center rounded-sm bg-zinc-100 text-[8px] font-bold uppercase text-zinc-500">
                          {provider.name.slice(0, 1)}
                        </span>
                      )}
                      <span className="truncate">{provider.name}</span>
                    </label>
                    <Input
                      type="password"
                      value={isConfigured ? maskedApiKey : ""}
                      onChange={(event) => setProviderConfigured(provider.id, event.currentTarget.value.trim().length > 0)}
                      placeholder="API key"
                      aria-label={`${provider.name} API key`}
                    />
                  </div>
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

createRoot(document.getElementById("root")!).render(<App />)
