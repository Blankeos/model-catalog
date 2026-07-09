import { createVirtualizer } from "@tanstack/solid-virtual"
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  on,
  Show,
  type Accessor,
} from "solid-js"
import { type Catalog, type ListedModel } from "model-catalog"
import type { ChatModelValue, ProviderConfig } from "../lib/model-catalog"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { IconChevronDown, IconStar } from "./icons"
import { cn } from "../lib/utils"

export type { ChatModelValue, ProviderConfig }

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

type ThinkingOption = {
  value: string
  label: string
}

export function ChatModelSelector(props: ChatModelSelectorProps) {
  const providerConfigs = useProviderConfigs(() => props.catalog, () => props.providerConfigs)
  const enabledProviders = createMemo(() =>
    providerConfigs()
      .filter((provider) => provider.isEnabled && provider.hasApiKey)
      .map((provider) => provider.provider),
  )

  const { isFavorite, toggleFavorite } = useFavoriteModels(props.favoritesStorageKey ?? "model-catalog:favorites")
  const { lastModel, setLastModel } = useLastChatModel(props.lastModelStorageKey ?? "model-catalog:last-chat-model")
  const [open, setOpen] = createSignal(false)
  const [search, setSearch] = createSignal("")
  const [providerFilter, setProviderFilter] = createSignal<Set<string>>(new Set())
  const [scrollEl, setScrollEl] = createSignal<HTMLDivElement | null>(null)

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSearch("")
      setProviderFilter(new Set<string>())
    }
    setOpen(nextOpen)
  }

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
      lastModel(),
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
      lastModel(),
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
      const value = selectedModelIdentity()
      if (!value) return
      const index = matchedModels().findIndex((model) => model.provider === value.provider && model.modelId === value.modelId)
      if (index >= 0) window.setTimeout(() => virtualizer.scrollToIndex(index, { align: "center" }), 0)
    }),
  )

  const selectedModelIdentity = createMemo<{ provider: string; modelId: string } | null>((previous) => {
    const value = props.value
    if (!value) return null
    if (previous?.provider === value.provider && previous.modelId === value.modelId) return previous
    return { provider: value.provider, modelId: value.modelId }
  })

  const currentLabel = createMemo(() => {
    const value = selectedModelIdentity()
    if (!value) return null
    return allModels().find((model) => model.provider === value.provider && model.modelId === value.modelId) ?? null
  })
  const thinkingOptions = createMemo(() => effortOptions(currentLabel()?.listed.reasoningOptions))
  const thinkingValues = createMemo(() => thinkingOptions().map((option) => option.value))
  const thinkingLabelByValue = createMemo(() => new Map(thinkingOptions().map((option) => [option.value, option.label])))
  const selectedThinking = createMemo(() => {
    const options = thinkingOptions()
    return options.some((option) => option.value === props.value?.thinking) ? props.value?.thinking : options[0]?.value
  })

  const allProviders = createMemo(() => {
    const seen = new Map<string, ProviderFacetOption>()
    for (const model of allModels()) {
      if (seen.has(model.provider)) continue
      seen.set(model.provider, {
        value: model.provider,
        label: model.providerName,
        icon: model.providerLogoUrl,
      })
    }
    return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label) || a.value.localeCompare(b.value))
  })

  const onSelect = (model: TextModelOption) => {
    const next = { provider: model.provider, modelId: model.modelId, thinking: effortOptions(model.listed.reasoningOptions)[0]?.value }
    props.onChange(next)
    setLastModel(next)
    handleOpenChange(false)
  }

  const onThinkingChange = (thinking: string) => {
    if (!props.value) return
    const next = { ...props.value, thinking }
    props.onChange(next)
    setLastModel(next)
  }

  return (
    <div class={cn("inline-block", props.class)}>
      <div class="flex items-center gap-1.5">
      <Popover open={open()} onOpenChange={handleOpenChange} placement="top-end">
        <PopoverTrigger
          class={cn(
            "flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 transition-colors hover:bg-zinc-50",
            "max-w-[16rem]",
            props.iconOnly && "h-8 w-8 justify-center p-0",
          )}
          aria-haspopup="listbox"
          title={currentLabel()?.name ?? "Select model"}
        >
          <Show when={currentLabel()} fallback={<span class="text-zinc-500">Select model...</span>}>
            {(model) => (
              <>
                <ProviderMark providerId={model().provider} providerName={model().providerName} logoUrl={model().providerLogoUrl} size="sm" />
                <Show when={!props.iconOnly}>
                  <span class="min-w-0 truncate">{model().name}</span>
                </Show>
              </>
            )}
          </Show>
          <Show when={!props.iconOnly}>
            <IconChevronDown class="h-3 w-3 shrink-0 text-zinc-500" />
          </Show>
        </PopoverTrigger>

        <Show when={open()}>
          <PopoverContent
            role="dialog"
            aria-label={props.title ?? "Select chat model"}
            class="w-72 overflow-hidden rounded-2xl bg-white/95 p-0 shadow-xl ring-1 ring-zinc-200/50 backdrop-blur"
          >
            <Show when={props.title}>
              <div class="px-3 pb-1 pt-3 text-[10px] font-bold tracking-wide text-zinc-500 uppercase">{props.title}</div>
            </Show>

            <Show
              when={allModels().length > 0}
              fallback={
                <div class="px-3 py-3 text-xs text-zinc-500">
                  No text models. Add an API key in{" "}
                  <a href={props.settingsHref ?? "/settings"} class="text-zinc-900 underline">
                    Settings
                  </a>
                  .
                </div>
              }
            >
              <div>
                <div class="flex items-center gap-2 border-b border-zinc-100 px-2 py-2">
                  <input
                    class="min-w-0 flex-1 border-0 bg-transparent px-1 py-1.5 text-[13px] text-zinc-900 outline-none placeholder:text-zinc-400"
                    placeholder="Search models..."
                    value={search()}
                    onInput={(event) => setSearch(event.currentTarget.value)}
                  />
                  <ProviderFacetFilter options={allProviders()} selected={providerFilter()} onChange={setProviderFilter} />
                </div>

                <div ref={setScrollEl} class="max-h-72 overflow-auto p-1.5" role="listbox" aria-label="Available chat models">
                  <Show when={matchedModels().length === 0}>
                    <div class="py-6 text-center text-sm text-zinc-500">No models found.</div>
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
                        const selected = () => selectedModelIdentity()?.provider === model()?.provider && selectedModelIdentity()?.modelId === model()?.modelId
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
                                class={cn(
                                  "flex cursor-pointer items-center rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-zinc-50",
                                  selected() && "bg-zinc-50",
                                )}
                              >
                                <div class="flex min-w-0 flex-1 items-center justify-between gap-2">
                                  <span class="min-w-0 truncate">{item().name}</span>
                                  <div class="flex shrink-0 items-center gap-1.5">
                                    <ProviderMark providerId={item().provider} providerName={item().providerName} logoUrl={item().providerLogoUrl} size="md" />
                                    <button
                                      type="button"
                                      class={cn(
                                        "flex h-5 w-5 items-center justify-center rounded transition-colors hover:bg-zinc-200",
                                        favorite() ? "text-amber-500" : "text-zinc-300 hover:text-zinc-700",
                                      )}
                                      aria-label={favorite() ? "Unfavorite model" : "Favorite model"}
                                      aria-pressed={favorite()}
                                      onPointerDown={(event) => event.stopPropagation()}
                                      onClick={(event) => {
                                        event.preventDefault()
                                        event.stopPropagation()
                                        toggleFavorite(item().provider, item().modelId)
                                      }}
                                    >
                                      <IconStar filled={favorite()} class="h-3.5 w-3.5" />
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
          </PopoverContent>
        </Show>
      </Popover>
      <Show when={thinkingOptions().length > 0}>
        <Select<string>
          options={thinkingValues()}
          value={selectedThinking() ?? null}
          onChange={(value) => {
            if (!value || value === selectedThinking()) return
            onThinkingChange(value)
          }}
          itemComponent={(props) => <SelectItem item={props.item}>{thinkingLabelByValue().get(props.item.rawValue) ?? props.item.rawValue}</SelectItem>}
        >
          <SelectTrigger aria-label="Thinking">
            <span class="text-zinc-600">Thinking</span>
            <SelectValue<string>>
              {(state) => {
                const value = state.selectedOption()
                return value ? thinkingLabelByValue().get(value) ?? value : null
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent />
        </Select>
      </Show>
      </div>
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
    <Popover placement="bottom-end">
      <PopoverTrigger class="inline-flex cursor-pointer items-center gap-1 rounded-md bg-zinc-100 px-2 py-1.5 text-[11px] font-semibold text-zinc-600 select-none hover:bg-zinc-200">
          Providers
          <Show when={selectedCount() > 0}>
            <span class="inline-flex min-w-[1rem] justify-center rounded-full bg-zinc-900 px-1 text-[10px] text-white">
              {selectedCount()}
            </span>
          </Show>
      </PopoverTrigger>
      <PopoverContent class="z-[60] max-h-64 w-56 overflow-auto rounded-xl p-1.5 shadow-lg">
        <div class="flex items-center justify-between px-1.5 pb-1.5 text-[11px] font-bold text-zinc-500">
          <span>Filter by provider</span>
          <button type="button" onClick={clear} disabled={selectedCount() === 0} class="text-zinc-500 underline disabled:opacity-40">
            Clear
          </button>
        </div>
        <For each={props.options}>
          {(option) => (
            <label class="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-[13px] hover:bg-zinc-50">
              <input type="checkbox" checked={props.selected.has(option.value)} onChange={() => toggle(option.value)} class="m-0" />
              <ProviderMark providerId={option.value} providerName={option.label} logoUrl={option.icon} size="sm" />
              <span>{option.label}</span>
            </label>
          )}
        </For>
      </PopoverContent>
    </Popover>
  )
}

function ProviderMark(props: { providerId: string; providerName: string; logoUrl?: string; size: "sm" | "md" }) {
  const icon = createMemo(() => props.logoUrl)
  return (
    <Show
      when={icon()}
      fallback={
        <span
          class={cn(
            "inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-sm bg-zinc-100 text-[8px] font-bold tracking-tight text-zinc-600",
            props.size === "md" && "h-4 min-w-4 text-[9px]",
          )}
          title={props.providerName}
        >
          {providerInitials(props.providerName)}
        </span>
      }
    >
      {(src) => (
        <img
          src={src()}
          alt={props.providerName}
          class={cn("h-3.5 w-3.5 shrink-0 rounded-sm object-contain", props.size === "md" && "h-4 w-4 opacity-80")}
        />
      )}
    </Show>
  )
}

function useProviderConfigs(catalog: Accessor<Catalog>, source: Accessor<ProviderConfig[] | Accessor<ProviderConfig[]> | undefined>) {
  return createMemo<ProviderConfig[]>(() => {
    const provided = source()
    if (typeof provided === "function") return provided()
    if (provided) return provided

    return catalog()
      .listProviders()
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
  const initialFavorites = readJson<string[]>(storageKey, [])
  const [favorites, setFavorites] = createSignal<ReadonlySet<string>>(new Set(initialFavorites))
  let hasMounted = false

  createEffect(() => {
    const next = [...favorites()]
    if (!hasMounted) {
      hasMounted = true
      if (arraysEqual(next, initialFavorites)) return
    }
    deferStorageWrite(() => writeJson(storageKey, next))
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
    deferStorageWrite(() => writeJson(storageKey, next))
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

function effortOptions(reasoningOptions: ListedModel["reasoningOptions"] | undefined): ThinkingOption[] {
  const effort = reasoningOptions?.find((option) => option.type.toLowerCase() === "effort")
  return (effort?.values ?? []).map((value) => ({ value, label: labelizeThinking(value) }))
}

function labelizeThinking(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function sortPreferredModels(
  models: TextModelOption[],
  isFavorite: (provider: string, modelId: string) => boolean,
  lastModel: ChatModelValue | null,
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

function deferStorageWrite(write: () => void) {
  if (typeof window === "undefined") return
  window.setTimeout(write, 0)
}

function arraysEqual(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

