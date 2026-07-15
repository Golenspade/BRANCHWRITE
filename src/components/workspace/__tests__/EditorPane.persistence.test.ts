import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EditorPane from '../EditorPane.vue'
import { useAppStore } from '../../../stores/app'
import { deferred, fakeGateway, sampleDocument } from '../../../stores/__tests__/fakeGateway'

vi.mock('naive-ui', async () => {
  const actual = await vi.importActual<typeof import('naive-ui')>('naive-ui')
  return {
    ...actual,
    useMessage: () => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }),
  }
})
vi.mock('../MonacoSourcePane.vue', () => ({ default: { template: '<div />' } }))
vi.mock('../WysiwygPane.vue', () => ({ default: { template: '<div />' } }))
vi.mock('../DiffPane.vue', () => ({ default: { template: '<div />' } }))

const SlotStub = defineComponent({
  template: '<div><slot name="header"/><slot/><slot name="footer"/></div>',
})
const WysiwygStub = defineComponent({
  props: { modelValue: { type: String, required: true } },
  emits: ['update:modelValue', 'ready'],
  template: '<textarea data-testid="draft-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)"/>',
})

async function mountedEditor() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const gateway = fakeGateway()
  const store = useAppStore()
  store.configurePersistence(gateway)
  await store.selectBook('book-1')
  await store.switchDocument('document-1')
  const wrapper = mount(EditorPane, {
    global: {
      plugins: [pinia],
      stubs: {
        NCard: SlotStub, NRadioGroup: SlotStub, NRadioButton: SlotStub,
        NSpace: SlotStub, NButton: SlotStub, NSelect: SlotStub, NScrollbar: SlotStub,
        WysiwygPane: WysiwygStub, MonacoSourcePane: true, DiffPane: true,
      },
    },
  })
  await nextTick()
  return { gateway, store, wrapper }
}

describe('EditorPane persistence watchers', () => {
  beforeEach(() => vi.useRealTimers())

  it('keeps draft B visible while save A completes and persists only A then B', async () => {
    const { gateway, store, wrapper } = await mountedEditor()
    const first = deferred<ReturnType<typeof sampleDocument>>()
    gateway.saveDocument
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(async ({ content, expectedRevision }) =>
        sampleDocument('document-1', expectedRevision + 1, content))
      .mockRejectedValue({
        code: 'internal', message: 'unexpected oscillating write', retryable: false,
      })
    const input = wrapper.get<HTMLTextAreaElement>('[data-testid="draft-input"]')

    try {
      await input.setValue('A')
      const flushing = store.flushDocumentSave()
      await vi.waitFor(() => expect(gateway.saveDocument).toHaveBeenCalledOnce())
      await input.setValue('B')
      expect(input.element.value).toBe('B')
      first.resolve(sampleDocument('document-1', 1, 'A'))
      await expect(flushing).resolves.toBeUndefined()
      await nextTick()

      expect(gateway.saveDocument.mock.calls.map(([request]) => request.content)).toEqual(['A', 'B'])
      expect(input.element.value).toBe('B')
      expect(store.currentDocument).toBe('B')
      expect(store.currentDocumentDetail?.content).toBe('B')
    } finally {
      wrapper.unmount()
    }
  })

  it('returns to a safe mode when manual Diff detail loading rejects', async () => {
    const { gateway, store, wrapper } = await mountedEditor()
    gateway.getVersion.mockRejectedValue({
      code: 'internal', message: 'detail failed', retryable: false,
    })

    store.setCurrentMode('diff')
    await vi.waitFor(() => expect(store.currentMode).toBe('wysiwyg'))
    expect(store.error).toBe('detail failed')
    wrapper.unmount()
  })
})
