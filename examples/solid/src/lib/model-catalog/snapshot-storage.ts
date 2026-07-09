import type { CatalogSnapshot } from "model-catalog"

const snapshotStorageKey = "model-catalog:example:snapshot"

export function readSnapshot(): CatalogSnapshot | null {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(snapshotStorageKey)
  if (!raw) return null
  try {
    return JSON.parse(raw) as CatalogSnapshot
  } catch {
    return null
  }
}

export function writeSnapshot(snapshot: CatalogSnapshot) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(snapshotStorageKey, JSON.stringify(snapshot))
}
