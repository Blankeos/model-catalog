import { createVirtualizer } from "@tanstack/solid-virtual"
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  on,
  onCleanup,
  onMount,
  Show,
  type Accessor,
  type JSX,
} from "solid-js"
import { type Catalog, type ListedModel } from "model-catalog"

export type ChatModelValue = {
  provider: string
  modelId: string
}

export type ProviderConfig = {
  id: string
  provider: string
  providerId: string | null
  hasApiKey: boolean
  isEnabled: boolean
}

export type ChatModelSelectorProps = {
  catalog: Catalog
  value: ChatModelValue | null
  onChange: (next: ChatModelValue) => void
  providerConfigs?: ProviderConfig[] | Accessor<ProviderConfig[]>
  title?: string
  iconOnly?: boolean
  class?: string
  settingsHref?: string
  favoritesStorageKey?: string
  lastModelStorageKey?: string
}

type TextModelOption = {
  value: string
  provider: string
  modelId: string
  name: string
  providerName: string
  providerLogoUrl?: string
  listed: ListedModel
}

type ProviderFacetOption = {
  value: string
  label: string
  icon?: string
}

const PROVIDER_ICON_OVERRIDES: Record<string, string> = {
  // Keep app-owned overrides here if your app hosts its own icons.
  // The model-catalog snapshot already includes models.dev logo URLs as provider.logoUrl.
}

export function ChatModelSelector(props: ChatModelSelectorProps) {
  const providerConfigs = useProviderConfigs(() => props.catalog, () => props.providerConfigs)
  const enabledProviders = createMemo(() =>
    providerConfigs()
      .filter((provider) => provider.isEnabled && provider.hasApiKey)
      .map((provider) => provider.provider)
  )

  const { isFavorite, toggleFavorite } = useFavoriteModels(props.favoritesStorageKey ?? "model-catalog:favorites")
  const { lastModel, setLastModel } = useLastChatModel(props.lastModelStorageKey ?? "model-catalog:last-chat-model")
  const [open, setOpen] = createSignal(false)
  const [search, setSearch] = createSignal("")
  const [providerFilter, setProviderFilter] = createSignal<Set<string>>(new Set())
  const [scrollEl, setScrollEl] = createSignal<HTMLDivElement | null>(null)
  let popoverRoot: HTMLDivElement | undefined

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSearch("")
      setProviderFilter(new Set<string>())
    }
    setOpen(nextOpen)
  }

  onMount(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!open()) return
      const target = event.target
      if (target instanceof Node && popoverRoot?.contains(target)) return
      handleOpenChange(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleOpenChange(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    onCleanup(() => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    })
  })

  const allModels = createMemo(() => {
    const grouped = props.catalog.listModels({
      includeProviders: enabledProviders(),
      outputModalities: ["text"],
      excludeDeprecated: true,
      groupBy: "providerId",
    })

    return sortPreferredModels(
      grouped.groups.flatMap((group) => group.models).filter(isTextOnlyChatModel).map(toTextModelOption),
      isFavorite,
      lastModel()
    )
  })

  const filteredProviderIds = createMemo(() => {
    const selected = providerFilter()
    if (selected.size === 0) return enabledProviders()
    return enabledProviders().filter((provider) => selected.has(provider))
  })

  const matchedModels = createMemo(() => {
    const grouped = props.catalog.listModels({
      includeProviders: filteredProviderIds(),
      outputModalities: ["text"],
      excludeDeprecated: true,
      query: search(),
      groupBy: "providerId",
    })

    return sortPreferredModels(
      grouped.groups.flatMap((group) => group.models).filter(isTextOnlyChatModel).map(toTextModelOption),
      isFavorite,
      lastModel()
    )
  })

  const virtualizer = createVirtualizer({
    get count() {
      return matchedModels().length
    },
    getScrollElement: () => scrollEl(),
    estimateSize: () => 44,
    overscan: 6,
  })

  createEffect(
    on(open, (isOpen) => {
      if (!isOpen) return
      const value = props.value
      if (!value) return
      const index = matchedModels().findIndex((model) => model.provider === value.provider && model.modelId === value.modelId)
      if (index >= 0) window.setTimeout(() => virtualizer.scrollToIndex(index, { align: "center" }), 0)
    })
  )

  const currentLabel = createMemo(() => {
    const value = props.value
    if (!value) return null
    return allModels().find((model) => model.provider === value.provider && model.modelId === value.modelId) ?? null
  })

  const allProviders = createMemo(() => {
    const seen = new Map<string, ProviderFacetOption>()
    for (const model of allModels()) {
      if (seen.has(model.provider)) continue
      seen.set(model.provider, {
        value: model.provider,
        label: model.providerName,
        icon: providerIcon(model.provider, model.providerLogoUrl),
      })
    }
    return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label) || a.value.localeCompare(b.value))
  })

  const onSelect = (model: TextModelOption) => {
    const next = { provider: model.provider, modelId: model.modelId }
    props.onChange(next)
    setLastModel(next)
    handleOpenChange(false)
  }

  return (
    <div ref={popoverRoot} class={cn("mc-selector", props.iconOnly && "mc-selector--icon-only", props.class)}>
      <ModelSelectorStyles />
      <button
        type="button"
        class="mc-trigger"
        aria-haspopup="listbox"
        aria-expanded={open()}
        title={currentLabel()?.name ?? "Select model"}
        onClick={() => handleOpenChange(!open())}
      >
        <Show when={currentLabel()} fallback={<span class="mc-trigger-placeholder">Select model...</span>}>
          {(model) => (
            <>
              <ProviderMark providerId={model().provider} providerName={model().providerName} logoUrl={model().providerLogoUrl} size="sm" />
              <Show when={!props.iconOnly}>
                <span class="mc-trigger-label">{model().name}</span>
              </Show>
            </>
          )}
        </Show>
        <Show when={!props.iconOnly}>
          <ChevronDownIcon class="mc-chevron" />
        </Show>
      </button>

      <Show when={open()}>
        <div class="mc-popover" role="dialog" aria-label={props.title ?? "Select chat model"}>
          <Show when={props.title}>
            <div class="mc-title">{props.title}</div>
          </Show>

          <Show
            when={allModels().length > 0}
            fallback={
              <div class="mc-empty">
                No text models. Add an API key in{" "}
                <a href={props.settingsHref ?? "/settings"}>Settings</a>.
              </div>
            }
          >
            <div class="mc-command">
              <div class="mc-search-row">
                <input
                  class="mc-search-input"
                  placeholder="Search models..."
                  value={search()}
                  onInput={(event) => setSearch(event.currentTarget.value)}
                />
                <ProviderFacetFilter options={allProviders()} selected={providerFilter()} onChange={setProviderFilter} />
              </div>

              <div ref={setScrollEl} class="mc-list" role="listbox" aria-label="Available chat models">
                <Show when={matchedModels().length === 0}>
                  <div class="mc-empty mc-empty--center">No models found.</div>
                </Show>

                <div
                  style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: "100%",
                    position: "relative",
                  }}
                >
                  <For each={virtualizer.getVirtualItems()}>
                    {(virtualItem) => {
                      const model = () => matchedModels()[virtualItem.index]
                      const selected = () => props.value?.provider === model()?.provider && props.value?.modelId === model()?.modelId
                      const favorite = () => {
                        const item = model()
                        return item ? isFavorite(item.provider, item.modelId) : false
                      }

                      return (
                        <Show when={model()}>
                          {(item) => (
                            <div
                              role="option"
                              tabIndex={0}
                              aria-selected={selected()}
                              data-value={item().value}
                              onClick={() => onSelect(item())}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault()
                                  onSelect(item())
                                }
                              }}
                              style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: `${virtualItem.size}px`,
                                transform: `translateY(${virtualItem.start}px)`,
                              }}
                              class={cn("mc-option", selected() && "mc-option--selected")}
                            >
                              <div class="mc-option-main">
                                <span class="mc-option-name">{item().name}</span>
                                <div class="mc-option-meta">
                                  <ProviderMark providerId={item().provider} providerName={item().providerName} logoUrl={item().providerLogoUrl} size="md" />
                                  <button
                                    type="button"
                                    class={cn("mc-favorite", favorite() && "mc-favorite--active")}
                                    aria-label={favorite() ? "Unfavorite model" : "Favorite model"}
                                    aria-pressed={favorite()}
                                    onPointerDown={(event) => event.stopPropagation()}
                                    onClick={(event) => {
                                      event.preventDefault()
                                      event.stopPropagation()
                                      toggleFavorite(item().provider, item().modelId)
                                    }}
                                  >
                                    <StarIcon filled={favorite()} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </Show>
                      )
                    }}
                  </For>
                </div>
              </div>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  )
}

function ProviderFacetFilter(props: {
  options: ProviderFacetOption[]
  selected: Set<string>
  onChange: (next: Set<string>) => void
}) {
  const selectedCount = createMemo(() => props.selected.size)

  const toggle = (providerId: string) => {
    const next = new Set(props.selected)
    if (next.has(providerId)) next.delete(providerId)
    else next.add(providerId)
    props.onChange(next)
  }

  const clear = () => props.onChange(new Set<string>())

  return (
    <details class="mc-facet">
      <summary class="mc-facet-trigger" title="Filter by provider">
        Providers
        <Show when={selectedCount() > 0}>
          <span class="mc-facet-count">{selectedCount()}</span>
        </Show>
      </summary>
      <div class="mc-facet-menu">
        <div class="mc-facet-header">
          <span>Filter by provider</span>
          <button type="button" onClick={clear} disabled={selectedCount() === 0}>
            Clear
          </button>
        </div>
        <For each={props.options}>
          {(option) => (
            <label class="mc-facet-option">
              <input type="checkbox" checked={props.selected.has(option.value)} onChange={() => toggle(option.value)} />
              <ProviderMark providerId={option.value} providerName={option.label} logoUrl={option.icon} size="sm" />
              <span>{option.label}</span>
            </label>
          )}
        </For>
      </div>
    </details>
  )
}

function ProviderMark(props: { providerId: string; providerName: string; logoUrl?: string; size: "sm" | "md" }) {
  const icon = createMemo(() => providerIcon(props.providerId, props.logoUrl))
  return (
    <Show
      when={icon()}
      fallback={
        <span class={cn("mc-provider-fallback", props.size === "md" && "mc-provider-fallback--md")} title={props.providerName}>
          {providerInitials(props.providerName)}
        </span>
      }
    >
      {(src) => <img src={src()} alt={props.providerName} class={cn("mc-provider-icon", props.size === "md" && "mc-provider-icon--md")} />}
    </Show>
  )
}

function useProviderConfigs(catalog: Accessor<Catalog>, source: Accessor<ProviderConfig[] | Accessor<ProviderConfig[]> | undefined>) {
  return createMemo<ProviderConfig[]>(() => {
    const provided = source()
    if (typeof provided === "function") return provided()
    if (provided) return provided

    // Demo/default boundary: in a real app, pass providerConfigs from your own API/query state.
    return catalog().listProviders()
      .map((provider) => ({
      id: provider.id,
      provider: provider.id,
      providerId: provider.id,
      hasApiKey: true,
      isEnabled: true,
    }))
  })
}

function useFavoriteModels(storageKey: string) {
  const [favorites, setFavorites] = createSignal<ReadonlySet<string>>(new Set(readJson<string[]>(storageKey, [])))

  createEffect(() => {
    writeJson(storageKey, [...favorites()])
  })

  const isFavorite = (provider: string, modelId: string) => favorites().has(modelKey(provider, modelId))
  const toggleFavorite = (provider: string, modelId: string) => {
    const key = modelKey(provider, modelId)
    setFavorites((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return { isFavorite, toggleFavorite }
}

function useLastChatModel(storageKey: string) {
  const [lastModel, setLastModelSignal] = createSignal<ChatModelValue | null>(readJson<ChatModelValue | null>(storageKey, null))

  const setLastModel = (next: ChatModelValue) => {
    setLastModelSignal(next)
    writeJson(storageKey, next)
  }

  return { lastModel, setLastModel }
}

function isTextOnlyChatModel(model: ListedModel) {
  const outputs = model.modalities?.output ?? model.model.modalities?.output ?? []
  return outputs.includes("text") && outputs.every((output) => output === "text")
}

function toTextModelOption(model: ListedModel): TextModelOption {
  return {
    value: model.value,
    provider: model.providerId,
    modelId: model.modelId,
    name: model.name,
    providerName: model.providerName,
    providerLogoUrl: model.providerLogoUrl,
    listed: model,
  }
}

function sortPreferredModels(
  models: TextModelOption[],
  isFavorite: (provider: string, modelId: string) => boolean,
  lastModel: ChatModelValue | null
) {
  return [...models].sort((a, b) => {
    const favoriteDelta = Number(isFavorite(b.provider, b.modelId)) - Number(isFavorite(a.provider, a.modelId))
    if (favoriteDelta !== 0) return favoriteDelta

    const aIsLast = lastModel?.provider === a.provider && lastModel.modelId === a.modelId
    const bIsLast = lastModel?.provider === b.provider && lastModel.modelId === b.modelId
    const lastDelta = Number(bIsLast) - Number(aIsLast)
    if (lastDelta !== 0) return lastDelta

    return a.providerName.localeCompare(b.providerName) || a.name.localeCompare(b.name) || a.modelId.localeCompare(b.modelId)
  })
}

function providerIcon(providerId: string, logoUrl?: string) {
  return PROVIDER_ICON_OVERRIDES[providerId] ?? logoUrl
}

function providerInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

function modelKey(provider: string, modelId: string) {
  return `${provider}/${modelId}`
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  const raw = window.localStorage.getItem(key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function ChevronDownIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class={props.class}>
      <path
        fill-rule="evenodd"
        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
        clip-rule="evenodd"
      />
    </svg>
  )
}

function StarIcon(props: { filled: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={props.filled ? "currentColor" : "none"} stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mc-star">
      <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  )
}

function ModelSelectorStyles() {
  return <style>{modelSelectorCss}</style>
}

const modelSelectorCss = `
.mc-selector {
  position: relative;
  display: inline-block;
  color: rgb(24 24 27);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.mc-trigger {
  display: flex;
  max-width: 16rem;
  align-items: center;
  gap: 0.375rem;
  border: 1px solid rgb(228 228 231);
  border-radius: 0.5rem;
  background: rgb(255 255 255);
  padding: 0.375rem 0.625rem;
  color: inherit;
  font-size: 0.75rem;
  line-height: 1rem;
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease;
}
.mc-trigger:hover,
.mc-trigger[aria-expanded="true"] {
  background: rgb(244 244 245);
}
.mc-selector--icon-only .mc-trigger {
  height: 2rem;
  width: 2rem;
  justify-content: center;
  padding: 0;
}
.mc-trigger-placeholder {
  color: rgb(113 113 122);
  white-space: nowrap;
}
.mc-trigger-label,
.mc-option-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mc-chevron {
  height: 0.75rem;
  width: 0.75rem;
  flex: none;
  color: rgb(113 113 122);
}
.mc-popover {
  position: absolute;
  right: 0;
  bottom: calc(100% + 0.5rem);
  z-index: 50;
  width: 18rem;
  overflow: hidden;
  border: 1px solid rgb(228 228 231);
  border-radius: 1rem;
  background: color-mix(in srgb, white 96%, transparent);
  box-shadow: 0 24px 70px rgba(24, 24, 27, 0.18), 0 8px 20px rgba(24, 24, 27, 0.08);
  backdrop-filter: blur(12px);
}
.mc-title {
  padding: 0.75rem 0.75rem 0.25rem;
  color: rgb(113 113 122);
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.mc-command {
  background: transparent;
}
.mc-search-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-bottom: 1px solid rgb(244 244 245);
  padding: 0.5rem;
}
.mc-search-input {
  min-width: 0;
  flex: 1;
  border: 0;
  background: transparent;
  padding: 0.375rem 0.25rem;
  color: inherit;
  font-size: 0.8125rem;
  outline: none;
}
.mc-search-input::placeholder {
  color: rgb(161 161 170);
}
.mc-list {
  max-height: 18rem;
  overflow: auto;
  padding: 0.375rem;
}
.mc-option {
  display: flex;
  cursor: pointer;
  align-items: center;
  border-radius: 0.625rem;
  padding: 0.5rem 0.625rem;
  font-size: 0.875rem;
  transition: background 120ms ease;
}
.mc-option:hover,
.mc-option:focus-visible {
  background: rgb(244 244 245);
  outline: none;
}
.mc-option--selected {
  background: rgb(244 244 245);
}
.mc-option-main {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.mc-option-meta {
  display: flex;
  flex: none;
  align-items: center;
  gap: 0.375rem;
}
.mc-provider-icon {
  height: 0.875rem;
  width: 0.875rem;
  flex: none;
  border-radius: 0.1875rem;
  object-fit: contain;
}
.mc-provider-icon--md {
  height: 1rem;
  width: 1rem;
  opacity: 0.82;
}
.mc-provider-fallback {
  display: inline-flex;
  height: 0.875rem;
  min-width: 0.875rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.1875rem;
  background: rgb(244 244 245);
  color: rgb(82 82 91);
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.mc-provider-fallback--md {
  height: 1rem;
  min-width: 1rem;
  font-size: 0.55rem;
}
.mc-favorite {
  display: inline-flex;
  height: 1.25rem;
  width: 1.25rem;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 0.25rem;
  background: transparent;
  color: rgb(161 161 170);
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}
.mc-favorite:hover {
  background: rgb(228 228 231);
  color: rgb(39 39 42);
}
.mc-favorite--active {
  color: rgb(245 158 11);
}
.mc-star {
  height: 0.875rem;
  width: 0.875rem;
}
.mc-empty {
  padding: 0.75rem;
  color: rgb(113 113 122);
  font-size: 0.75rem;
}
.mc-empty a {
  color: rgb(24 24 27);
  text-decoration: underline;
}
.mc-empty--center {
  padding: 1.5rem 0.75rem;
  text-align: center;
  font-size: 0.875rem;
}
.mc-facet {
  position: relative;
  flex: none;
}
.mc-facet-trigger {
  display: inline-flex;
  list-style: none;
  cursor: pointer;
  align-items: center;
  gap: 0.25rem;
  border-radius: 0.5rem;
  background: rgb(244 244 245);
  padding: 0.375rem 0.5rem;
  color: rgb(82 82 91);
  font-size: 0.6875rem;
  font-weight: 600;
  user-select: none;
}
.mc-facet-trigger::-webkit-details-marker {
  display: none;
}
.mc-facet-count {
  display: inline-flex;
  min-width: 1rem;
  justify-content: center;
  border-radius: 999px;
  background: rgb(24 24 27);
  padding: 0 0.25rem;
  color: white;
  font-size: 0.625rem;
}
.mc-facet-menu {
  position: absolute;
  top: calc(100% + 0.375rem);
  right: 0;
  z-index: 60;
  width: 14rem;
  max-height: 16rem;
  overflow: auto;
  border: 1px solid rgb(228 228 231);
  border-radius: 0.75rem;
  background: white;
  padding: 0.375rem;
  box-shadow: 0 18px 50px rgba(24, 24, 27, 0.14);
}
.mc-facet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.375rem 0.375rem 0.5rem;
  color: rgb(113 113 122);
  font-size: 0.6875rem;
  font-weight: 700;
}
.mc-facet-header button {
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  text-decoration: underline;
}
.mc-facet-header button:disabled {
  cursor: default;
  opacity: 0.4;
}
.mc-facet-option {
  display: flex;
  cursor: pointer;
  align-items: center;
  gap: 0.5rem;
  border-radius: 0.5rem;
  padding: 0.375rem;
  font-size: 0.8125rem;
}
.mc-facet-option:hover {
  background: rgb(244 244 245);
}
.mc-facet-option input {
  margin: 0;
}
`
