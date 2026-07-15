import type { Book, DocumentDetail, VersionDetail, VersionSummary } from '../contracts'

export const DEMO_STORAGE_KEY = 'branchwrite_demo_v2'

export interface DemoState {
  schemaVersion: 2
  books: Record<string, Book>
  documents: Record<string, DocumentDetail>
  versions: Record<string, VersionDetail>
}

export interface DemoMutation<T> { value: T; changed: boolean }

export function emptyState(): DemoState {
  return { schemaVersion: 2, books: {}, documents: {}, versions: {} }
}

export function loadState(): DemoState {
  const raw = localStorage.getItem(DEMO_STORAGE_KEY)
  if (!raw) return emptyState()
  try {
    const parsed = JSON.parse(raw) as Partial<DemoState>
    if (parsed.schemaVersion !== 2 || !isRecord(parsed.books)
      || !isRecord(parsed.documents) || !isRecord(parsed.versions)) return emptyState()
    return parsed as DemoState
  } catch {
    return emptyState()
  }
}

export function commitState(state: DemoState) {
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state))
}

export function clone<T>(value: T): T {
  return value === undefined ? value : structuredClone(value)
}

export function nextTimestamp(previous: number) {
  return Math.max(Date.now(), previous + 1)
}

export function summary(detail: VersionDetail): VersionSummary {
  const result = { ...detail } as Partial<VersionDetail>
  delete result.content
  return result as VersionSummary
}

export function versionList(state: DemoState, documentId: string) {
  return Object.values(state.versions)
    .filter((version) => version.documentId === documentId)
    .sort((a, b) => b.sequence - a.sequence || a.id.localeCompare(b.id))
}

export function changed<T>(value: T): DemoMutation<T> { return { value, changed: true } }
export function unchanged<T>(value: T): DemoMutation<T> { return { value, changed: false } }

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
