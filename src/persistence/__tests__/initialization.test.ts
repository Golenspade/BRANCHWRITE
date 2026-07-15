import { beforeEach, describe, expect, it, vi } from 'vitest'
import { initializePersistence } from '../initialization'
import type { PersistenceGateway } from '../gateway'
import { TauriPersistenceGateway } from '../tauriGateway'

const { isTauri } = vi.hoisted(() => ({ isTauri: vi.fn() }))

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), isTauri }))

function gateway(listBooks = vi.fn().mockResolvedValue([])) {
  const value: PersistenceGateway = new TauriPersistenceGateway()
  value.listBooks = listBooks
  return { value, listBooks }
}

describe('initializePersistence', () => {
  beforeEach(() => {
    isTauri.mockReset()
    localStorage.clear()
  })

  it('calls official isTauri exactly once and selects Demo in a pure browser', async () => {
    isTauri.mockReturnValue(false)
    const desktop = gateway()
    const demo = gateway()
    const createDesktop = vi.fn(() => desktop.value)
    const createDemo = vi.fn(() => demo.value)

    const result = await initializePersistence({ createDesktop, createDemo })

    expect(isTauri).toHaveBeenCalledOnce()
    expect(createDesktop).not.toHaveBeenCalled()
    expect(createDemo).toHaveBeenCalledOnce()
    expect(result).toEqual({ gateway: demo.value, mode: 'demo' })
  })

  it('constructs only desktop and validates it with a real list call', async () => {
    isTauri.mockReturnValue(true)
    const desktop = gateway()
    const createDesktop = vi.fn(() => desktop.value)
    const createDemo = vi.fn(() => gateway().value)

    const result = await initializePersistence({ createDesktop, createDemo })

    expect(isTauri).toHaveBeenCalledOnce()
    expect(createDesktop).toHaveBeenCalledOnce()
    expect(createDemo).not.toHaveBeenCalled()
    expect(desktop.listBooks).toHaveBeenCalledOnce()
    expect(result).toEqual({ gateway: desktop.value, mode: 'desktop' })
  })

  it('surfaces desktop validation failure without constructing Demo', async () => {
    isTauri.mockReturnValue(true)
    const failure = { code: 'storageUnavailable', message: 'cannot open database', retryable: false }
    const createDemo = vi.fn(() => gateway().value)

    await expect(initializePersistence({
      createDesktop: () => gateway(vi.fn().mockRejectedValue(failure)).value,
      createDemo,
    })).rejects.toEqual(failure)

    expect(createDemo).not.toHaveBeenCalled()
    expect(localStorage.getItem('branchwrite_demo_v2')).toBeNull()
  })

  it('does not validate Demo through a desktop-only startup list call', async () => {
    isTauri.mockReturnValue(false)
    const demo = gateway()

    await initializePersistence({
      createDesktop: () => gateway().value,
      createDemo: () => demo.value,
    })

    expect(demo.listBooks).not.toHaveBeenCalled()
  })
})
