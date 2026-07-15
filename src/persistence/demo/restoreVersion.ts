import type { RestoreVersionInput, VersionDetail } from '../contracts'
import { findOperation } from './createVersion'
import { getDocument } from './documents'
import { fail, nextSequence, validateOperationId, validateRevision } from './errors'
import type { DemoState } from './state'
import { changed, nextTimestamp, summary, unchanged, versionList } from './state'

export function restoreVersion(state: DemoState, input: RestoreVersionInput) {
  validateOperationId(input.operationId)
  const existing = findOperation(state, input.operationId)
  if (existing) {
    if (existing.origin !== 'restore' || existing.documentId !== input.documentId
      || existing.restoredFromVersionId !== input.targetVersionId) fail('conflict')
    const safety = existing.parentVersionId ? state.versions[existing.parentVersionId] : null
    if (!safety) fail('validation')
    return unchanged({
      alreadyCurrent: false,
      safetyVersion: summary(safety),
      restoredVersion: summary(existing),
    })
  }
  const current = getDocument(state, input.documentId)
  validateRevision(input.expectedRevision)
  if (current.revision !== input.expectedRevision) fail('conflict')
  const target = state.versions[input.targetVersionId]
  if (!target || target.documentId !== input.documentId) fail('notFound')
  if (target.content === current.content) {
    return unchanged({ alreadyCurrent: true, safetyVersion: null, restoredVersion: null })
  }
  const safetySequence = nextSequence(current.versionSequence, 1)
  const restoreSequence = nextSequence(current.versionSequence, 2)
  const timestamp = nextTimestamp(current.updatedAtMs)
  const safety: VersionDetail = {
    id: crypto.randomUUID(), operationId: crypto.randomUUID(), documentId: current.id,
    sequence: safetySequence,
    parentVersionId: versionList(state, current.id)[0]?.id ?? null,
    restoredFromVersionId: null,
    message: 'Restore safety snapshot', origin: 'restoreSafety',
    contentHash: current.contentHash, wordCount: current.wordCount,
    characterCount: current.characterCount, createdAtMs: timestamp, content: current.content,
  }
  const restored: VersionDetail = {
    id: crypto.randomUUID(), operationId: input.operationId, documentId: current.id,
    sequence: restoreSequence, parentVersionId: safety.id,
    restoredFromVersionId: target.id,
    message: `Restored: ${target.message}`, origin: 'restore',
    contentHash: target.contentHash, wordCount: target.wordCount,
    characterCount: target.characterCount, createdAtMs: timestamp, content: target.content,
  }
  state.versions[safety.id] = safety
  state.versions[restored.id] = restored
  state.documents[current.id] = {
    ...current, content: restored.content, contentHash: restored.contentHash,
    wordCount: restored.wordCount, characterCount: restored.characterCount,
    revision: current.revision + 1, versionSequence: restoreSequence, updatedAtMs: timestamp,
  }
  return changed({
    alreadyCurrent: false,
    safetyVersion: summary(safety),
    restoredVersion: summary(restored),
  })
}
