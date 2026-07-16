import { createPinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App.vue'

const { initializePersistence } = vi.hoisted(() => ({
  initializePersistence: vi.fn(),
}))

vi.mock('../persistence/initialization', () => ({ initializePersistence }))

describe('App persistence startup boundary', () => {
  beforeEach(() => {
    initializePersistence.mockReset()
    localStorage.clear()
  })

  it('renders a blocking structured desktop error without Demo or router content', async () => {
    const failure = {
      code: 'migrationFailed',
      message: 'database migration failed',
      retryable: false,
    }
    initializePersistence.mockRejectedValue(failure)
    const getItem = vi.spyOn(localStorage, 'getItem')
    const setItem = vi.spyOn(localStorage, 'setItem')

    const wrapper = mount(App, {
      global: {
        plugins: [createPinia()],
        stubs: {
          RouterView: { template: '<div data-testid="router-content">router</div>' },
        },
      },
    })
    await flushPromises()

    expect(wrapper.get('[data-testid="persistence-fatal-error"]').text())
      .toContain('database migration failed')
    expect(wrapper.find('[data-testid="persistence-demo-banner"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="router-content"]').exists()).toBe(false)
    expect(getItem).not.toHaveBeenCalled()
    expect(setItem).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
