import { isTauri } from '@tauri-apps/api/core'
import { DemoPersistenceGateway } from './demo/gateway'
import type { PersistenceGateway } from './gateway'
import { TauriPersistenceGateway } from './tauriGateway'

export type PersistenceMode = 'desktop' | 'demo'

interface PersistenceFactories {
  createDesktop: () => PersistenceGateway
  createDemo: () => PersistenceGateway
}

let activeGateway: PersistenceGateway | null = null
let activeMode: PersistenceMode | null = null

export async function initializePersistence(
  factories?: PersistenceFactories,
): Promise<{ gateway: PersistenceGateway; mode: PersistenceMode }> {
  const desktop = isTauri()
  let gateway: PersistenceGateway
  let mode: PersistenceMode

  if (desktop) {
    gateway = factories?.createDesktop() ?? new TauriPersistenceGateway()
    await gateway.listBooks()
    mode = 'desktop'
  } else {
    gateway = factories?.createDemo() ?? new DemoPersistenceGateway()
    mode = 'demo'
  }
  activeGateway = gateway
  activeMode = mode
  return { gateway, mode }
}

export function getPersistenceGateway(): PersistenceGateway {
  if (!activeGateway) throw new Error('Persistence is not initialized')
  return activeGateway
}

export function getPersistenceMode(): PersistenceMode | null {
  return activeMode
}
