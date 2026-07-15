import type { CreateVersionInput, VersionDetail } from '../contracts'
import { getDocument } from './documents'
import { fail, nextSequence, validateOperationId, validateRevision, validateText } from './errors'
import { contentMetadata } from './metadata'
import type { DemoState } from './state'
import { changed, nextTimestamp, unchanged, versionList } from './state'

export function findOperation(state: DemoState, operationId: string) {
  return Object.values(state.versions).find((version) => version.operationId === operationId)
}

export async function createVersion(state: DemoState, input: CreateVersionInput) {
  validateOperationId(input.operationId)
  const existing = findOperation(state, input.operationId)
  if (existing) {
    if (existing.origin !== 'manual' || existing.documentId !== input.documentId
      || existing.content !== input.content || existing.message !== input.message) fail('conflict')
    return unchanged(existing)
  }
  validateText(input.message)
  const current = getDocument(state, input.documentId)
  validateRevision(input.expectedRevision)
  if (current.revision !== input.expectedRevision) fail('conflict')
  const sequence = nextSequence(current.versionSequence, 1)
  const version: VersionDetail = {
    id: crypto.randomUUID(),
    operationId: input.operationId,
    documentId: input.documentId,
    sequence,
    parentVersionId: versionList(state, input.documentId)[0]?.id ?? null,
    restoredFromVersionId: null,
    message: input.message,
    origin: 'manual',
    ...await contentMetadata(input.content),
    createdAtMs: nextTimestamp(current.updatedAtMs),
    content: input.content,
  }
  state.versions[version.id] = version
  state.documents[current.id] = {
    ...current,
    content: version.content,
    contentHash: version.contentHash,
    wordCount: version.wordCount,
    characterCount: version.characterCount,
    revision: current.revision + 1,
    versionSequence: sequence,
    updatedAtMs: version.createdAtMs,
  }
  return changed(version)
}
