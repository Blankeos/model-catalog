import { useEffect, useMemo, useState } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { type Catalog, type ListedModel } from "model-catalog"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { cn } from "../lib/utils"

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
  providerConfigs?: ProviderConfig[]
  title?: string
  iconOnly?: boolean
  className?: string
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

export function ChatModelSelector(props: ChatModelSelectorProps) {
  const providerConfigs = useProviderConfigs(props.catalog, props.providerConfigs)
  const enabledProviders = useMemo(
    () => providerConfigs.filter((provider) => provider.isEnabled && provider.hasApiKey).map((provider) => provider.provider),
    [providerConfigs],
  )

  const { isFavorite, toggleFavorite } = useFavoriteModels(props.favoritesStorageKey ?? "model-catalog:favorites")
  const { lastModel, setLastModel } = useLastChatModel(props.lastModelStorageKey ?? "model-catalog:last-chat-model")
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [providerFilter, setProviderFilter] = useState<Set<string>>(() => new Set())
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSearch("")
      setProviderFilter(new Set())
    }
    setOpen(nextOpen)
  }

  const allModels = useMemo(() => {
    const grouped = props.catalog.listModels({
      includeProviders: enabledProviders,
      outputModalities: ["text"],
      excludeDeprecated: true,
      groupBy: "providerId",
    })

    return sortPreferredModels(
      grouped.groups.flatMap((group) => group.models).filter(isTextOnlyChatModel).map(toTextModelOption),
      isFavorite,
      lastModel,
    )
  }, [props.catalog, enabledProviders, isFavorite, lastModel])

  const filteredProviderIds = useMemo(() => {
    if (providerFilter.size === 0) return enabledProviders
    return enabledProviders.filter((provider) => providerFilter.has(provider))
  }, [enabledProviders, providerFilter])

  const matchedModels = useMemo(() => {
    const grouped = props.catalog.listModels({
      includeProviders: filteredProviderIds,
      outputModalities: ["text"],
      excludeDeprecated: true,
      query: search,
      groupBy: "providerId",
    })

    return sortPreferredModels(
      grouped.groups.flatMap((group) => group.models).filter(isTextOnlyChatModel).map(toTextModelOption),
      isFavorite,
      lastModel,
    )
  }, [props.catalog, filteredProviderIds, search, isFavorite, lastModel])

  const virtualizer = useVirtualizer({
    count: matchedModels.length,
    getScrollElement: () => scrollEl,
    estimateSize: () => 44,
    overscan: 6,
  })

  useEffect(() => {
    if (!open || !props.value) return
    const index = matchedModels.findIndex(
      (model) => model.provider === props.value?.provider && model.modelId === props.value?.modelId,
    )
    if (index >= 0) window.setTimeout(() => virtualizer.scrollToIndex(index, { align: "center" }), 0)
  }, [matchedModels, open, props.value, virtualizer])

  const currentLabel = useMemo(() => {
    if (!props.value) return null
    return allModels.find((model) => model.provider === props.value?.provider && model.modelId === props.value?.modelId) ?? null
  }, [allModels, props.value])

  const allProviders = useMemo(() => {
    const seen = new Map<string, ProviderFacetOption>()
    for (const model of allModels) {
      if (seen.has(model.provider)) continue
      seen.set(model.provider, {
        value: model.provider,
        label: model.providerName,
        icon: model.providerLogoUrl,
      })
    }
    return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label) || a.value.localeCompare(b.value))
  }, [allModels])

  const onSelect = (model: TextModelOption) => {
    const next = { provider: model.provider, modelId: model.modelId }
    props.onChange(next)
    setLastModel(next)
    handleOpenChange(false)
  }

  return (
    <div className={cn("inline-block", props.className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 transition-colors hover:bg-zinc-50",
              "max-w-[16rem]",
              props.iconOnly && "h-8 w-8 justify-center p-0",
            )}
            aria-haspopup="listbox"
            title={currentLabel?.name ?? "Select model"}
          >
            {currentLabel ? (
              <>
                <ProviderMark
                  providerId={currentLabel.provider}
                  providerName={currentLabel.providerName}
                  logoUrl={currentLabel.providerLogoUrl}
                  size="sm"
                />
                {!props.iconOnly ? <span className="min-w-0 truncate">{currentLabel.name}</span> : null}
              </>
            ) : (
              <span className="text-zinc-500">Select model...</span>
            )}
            {!props.iconOnly ? <ChevronDownIcon className="h-3 w-3 shrink-0 text-zinc-500" /> : null}
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="end"
          role="dialog"
          aria-label={props.title ?? "Select chat model"}
          className="w-72 overflow-hidden rounded-2xl bg-white/95 p-0 shadow-xl ring-1 ring-zinc-200/50 backdrop-blur"
        >
          {props.title ? (
            <div className="px-3 pb-1 pt-3 text-[10px] font-bold tracking-wide text-zinc-500 uppercase">{props.title}</div>
          ) : null}

          {allModels.length > 0 ? (
            <div>
              <div className="flex items-center gap-2 border-b border-zinc-100 px-2 py-2">
                <input
                  className="min-w-0 flex-1 border-0 bg-transparent px-1 py-1.5 text-[13px] text-zinc-900 outline-none placeholder:text-zinc-400"
                  placeholder="Search models..."
                  value={search}
                  onChange={(event) => setSearch(event.currentTarget.value)}
                />
                <ProviderFacetFilter options={allProviders} selected={providerFilter} onChange={setProviderFilter} />
              </div>

              <div ref={setScrollEl} className="max-h-72 overflow-auto p-1.5" role="listbox" aria-label="Available chat models">
                {matchedModels.length === 0 ? (
                  <div className="py-6 text-center text-sm text-zinc-500">No models found.</div>
                ) : null}

                <div
                  style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: "100%",
                    position: "relative",
                  }}
                >
                  {virtualizer.getVirtualItems().map((virtualItem) => {
                    const model = matchedModels[virtualItem.index]
                    if (!model) return null
                    const selected = props.value?.provider === model.provider && props.value?.modelId === model.modelId
                    const favorite = isFavorite(model.provider, model.modelId)

                    return (
                      <div
                        key={virtualItem.key}
                        role="option"
                        tabIndex={0}
                        aria-selected={selected}
                        data-value={model.value}
                        onClick={() => onSelect(model)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault()
                            onSelect(model)
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
                        className={cn(
                          "flex cursor-pointer items-center rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-zinc-50",
                          selected && "bg-zinc-50",
                        )}
                      >
                        <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                          <span className="min-w-0 truncate">{model.name}</span>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <ProviderMark
                              providerId={model.provider}
                              providerName={model.providerName}
                              logoUrl={model.providerLogoUrl}
                              size="md"
                            />
                            <button
                              type="button"
                              className={cn(
                                "flex h-5 w-5 items-center justify-center rounded transition-colors hover:bg-zinc-200",
                                favorite ? "text-amber-500" : "text-zinc-300 hover:text-zinc-700",
                              )}
                              aria-label={favorite ? "Unfavorite model" : "Favorite model"}
                              aria-pressed={favorite}
                              onPointerDown={(event) => event.stopPropagation()}
                              onClick={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                toggleFavorite(model.provider, model.modelId)
                              }}
                            >
                              <StarIcon filled={favorite} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="px-3 py-3 text-xs text-zinc-500">
              No text models. Add an API key in{" "}
              <a href={props.settingsHref ?? "/settings"} className="text-zinc-900 underline">
                Settings
              </a>
              .
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}

function ProviderFacetFilter(props: {
  options: ProviderFacetOption[]
  selected: Set<string>
  onChange: (next: Set<string>) => void
}) {
  const selectedCount = props.selected.size

  const toggle = (providerId: string) => {
    const next = new Set(props.selected)
    if (next.has(providerId)) next.delete(providerId)
    else next.add(providerId)
    props.onChange(next)
  }

  const clear = () => props.onChange(new Set<string>())

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-zinc-100 px-2 py-1.5 text-[11px] font-semibold text-zinc-600 select-none hover:bg-zinc-200"
        >
          Providers
          {selectedCount > 0 ? (
            <span className="inline-flex min-w-[1rem] justify-center rounded-full bg-zinc-900 px-1 text-[10px] text-white">
              {selectedCount}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" side="bottom" className="z-[60] max-h-64 w-56 overflow-auto rounded-xl p-1.5 shadow-lg">
        <div className="flex items-center justify-between px-1.5 pb-1.5 text-[11px] font-bold text-zinc-500">
          <span>Filter by provider</span>
          <button type="button" onClick={clear} disabled={selectedCount === 0} className="text-zinc-500 underline disabled:opacity-40">
            Clear
          </button>
        </div>
        {props.options.map((option) => (
          <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-[13px] hover:bg-zinc-50">
            <input type="checkbox" checked={props.selected.has(option.value)} onChange={() => toggle(option.value)} className="m-0" />
            <ProviderMark providerId={option.value} providerName={option.label} logoUrl={option.icon} size="sm" />
            <span>{option.label}</span>
          </label>
        ))}
      </PopoverContent>
    </Popover>
  )
}

function ProviderMark(props: { providerId: string; providerName: string; logoUrl?: string; size: "sm" | "md" }) {
  if (props.logoUrl) {
    return (
      <img
        src={props.logoUrl}
        alt={props.providerName}
        className={cn("h-3.5 w-3.5 shrink-0 rounded-sm object-contain", props.size === "md" && "h-4 w-4 opacity-80")}
      />
    )
  }

  return (
    <span
      className={cn(
        "inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-sm bg-zinc-100 text-[8px] font-bold tracking-tight text-zinc-600",
        props.size === "md" && "h-4 min-w-4 text-[9px]",
      )}
      title={props.providerName}
    >
      {providerInitials(props.providerName)}
    </span>
  )
}

function useProviderConfigs(catalog: Catalog, source: ProviderConfig[] | undefined) {
  return useMemo<ProviderConfig[]>(() => {
    if (source) return source

    return catalog.listProviders().map((provider) => ({
      id: provider.id,
      provider: provider.id,
      providerId: provider.id,
      hasApiKey: true,
      isEnabled: true,
    }))
  }, [catalog, source])
}

function useFavoriteModels(storageKey: string) {
  const [favorites, setFavorites] = useState<ReadonlySet<string>>(() => new Set(readJson<string[]>(storageKey, [])))

  useEffect(() => {
    writeJson(storageKey, [...favorites])
  }, [favorites, storageKey])

  const isFavorite = useMemo(() => (provider: string, modelId: string) => favorites.has(modelKey(provider, modelId)), [favorites])
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
  const [lastModel, setLastModelState] = useState<ChatModelValue | null>(() => readJson<ChatModelValue | null>(storageKey, null))

  const setLastModel = (next: ChatModelValue) => {
    setLastModelState(next)
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

function ChevronDownIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={props.className}>
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function StarIcon(props: { filled: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={props.filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
    >
      <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  )
}
