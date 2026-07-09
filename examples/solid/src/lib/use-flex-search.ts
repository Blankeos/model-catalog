import FlexSearch, { type Index as FlexSearchIndex } from "flexsearch"
import { createEffect, createMemo, createSignal, on } from "solid-js"

/**
 * Reactive FlexSearch index over a Solid accessor of items. Rebuilds the
 * index whenever `data()` changes. Returns a `search(query)` accessor that
 * yields the matched items in index order; an empty/whitespace query yields
 * all items (when `returnAllOnEmpty` is true, the default).
 */
export function createFlexSearchIndex<T>(
  data: () => T[],
  options: {
    indexerFn: (item: T) => string
    returnAllOnEmpty?: boolean
  }
) {
  const returnAllOnEmpty = options.returnAllOnEmpty ?? true
  const [index, setIndex] = createSignal<FlexSearchIndex | null>(null)

  createEffect(
    on(data, (items) => {
      const idx = new FlexSearch.Index({ tokenize: "full" })
      items.forEach((item, i) => {
        idx.add(i, options.indexerFn(item))
      })
      setIndex(idx)
    })
  )

  function search(query: string): T[] {
    const items = data()
    const q = query.trim()
    if (!q) return returnAllOnEmpty ? items : []
    const idx = index()
    if (!idx) return returnAllOnEmpty ? items : []
    const results = idx.search(q, { limit: items.length })
    const out: T[] = []
    for (const i of results) out.push(items[i as number])
    return out
  }

  return { search }
}

/** Convenience: a memo'd search result for a reactive query. */
export function createFlexSearch<T>(
  data: () => T[],
  query: () => string,
  options: { indexerFn: (item: T) => string; returnAllOnEmpty?: boolean }
) {
  const { search } = createFlexSearchIndex(data, options)
  return createMemo(() => search(query()))
}
