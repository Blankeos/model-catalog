import { useCallback, useState } from "react"
import { type CatalogSnapshot, createCatalog, refreshSnapshot, type Catalog } from "model-catalog"
import fallbackSnapshot from "../../../../catalog-snapshot.json"
import { readSnapshot, writeSnapshot } from "./snapshot-storage"

function initialCatalog() {
  return createCatalog(readSnapshot() ?? fallbackSnapshot as CatalogSnapshot)
}

export function useCatalogState() {
  const [catalog, setCatalog] = useState<Catalog>(() => initialCatalog())
  const [isRefreshing, setIsRefreshing] = useState(false)

  const refreshCatalog = useCallback(async () => {
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
  }, [])

  return { catalog, isRefreshing, refreshCatalog }
}
