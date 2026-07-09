import FlexSearch, { type Index as FlexSearchIndex } from "flexsearch"
import { useCallback, useEffect, useMemo, useState } from "react"

/**
 * Reactive FlexSearch index over an array of items. Rebuilds the index whenever
 * `data` changes. Returns a `search(query)` function that yields matched items
 * in index order; an empty/whitespace query yields all items when
 * `returnAllOnEmpty` is true, the default.
 */
export function useFlexSearchIndex<T>(
  data: T[],
  options: {
    indexerFn: (item: T) => string
    returnAllOnEmpty?: boolean
  },
) {
  const returnAllOnEmpty = options.returnAllOnEmpty ?? true
  const [index, setIndex] = useState<FlexSearchIndex | null>(null)

  useEffect(() => {
    const idx = new FlexSearch.Index({ tokenize: "full" })
    data.forEach((item, i) => {
      idx.add(i, options.indexerFn(item))
    })
    setIndex(idx)
  }, [data, options.indexerFn])

  const search = useCallback(
    (query: string): T[] => {
      const q = query.trim()
      if (!q) return returnAllOnEmpty ? data : []
      if (!index) return returnAllOnEmpty ? data : []

      const results = index.search(q, { limit: data.length })
      const out: T[] = []
      for (const i of results) {
        const item = data[i as number]
        if (item !== undefined) out.push(item)
      }
      return out
    },
    [data, index, returnAllOnEmpty],
  )

  return { search }
}

/** Convenience: a memo'd search result for a reactive query. */
export function useFlexSearch<T>(
  data: T[],
  query: string,
  options: { indexerFn: (item: T) => string; returnAllOnEmpty?: boolean },
) {
  const { search } = useFlexSearchIndex(data, options)
  return useMemo(() => search(query), [query, search])
}
