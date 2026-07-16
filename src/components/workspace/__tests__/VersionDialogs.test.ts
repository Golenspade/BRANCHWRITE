import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  create, NButton, NCard, NEmpty, NForm, NFormItem, NInput, NList, NListItem,
  NModal, NRadioButton, NRadioGroup, NScrollbar, NSelect, NSpace, NTag, NThing,
} from 'naive-ui'
import CreateVersionDialog from '../CreateVersionDialog.vue'
import EditorPane from '../EditorPane.vue'
import VersionPanel from '../VersionPanel.vue'
import { useAppStore } from '../../../stores/app'
import {
  deferred, fakeGateway, sampleVersion,
} from '../../../stores/__tests__/fakeGateway'

vi.mock('naive-ui', async () => {
  const actual = await vi.importActual<typeof import('naive-ui')>('naive-ui')
  return {
    ...actual,
    useMessage: () => ({
      success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn(),
    }),
  }
})
vi.mock('../MonacoSourcePane.vue', () => ({ default: { template: '<div />' } }))
vi.mock('../WysiwygPane.vue', () => ({ default: { template: '<div />' } }))
vi.mock('../DiffPane.vue', () => ({ default: { template: '<div />' } }))

const CardStub = defineComponent({
  template: '<div><slot name="header"/><slot name="header-extra"/><slot name="avatar"/><slot name="description"/><slot/><slot name="action"/><slot name="footer"/></div>',
})
const ModalStub = defineComponent({
  props: { show: { type: Boolean, default: false } },
  template: '<div v-if="show"><slot/></div>',
})
const ButtonStub = defineComponent({
  inheritAttrs: false,
  props: {
    disabled: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
  },
  template: '<button v-bind="$attrs" :disabled="disabled || loading"><slot/></button>',
})
const InputStub = defineComponent({
  inheritAttrs: false,
  props: { value: String, inputProps: Object },
  emits: ['update:value'],
  template: '<input v-bind="inputProps" v-bind="$attrs" :value="value" @input="$emit(\'update:value\', $event.target.value)" />',
})
const SlotStub = defineComponent({ template: '<div><slot/></div>' })

const globalStubs = {
  NCard: CardStub,
  NModal: ModalStub,
  NButton: ButtonStub,
  NInput: InputStub,
  NForm: SlotStub,
  NFormItem: SlotStub,
  NRadioGroup: SlotStub,
  NRadioButton: SlotStub,
  NSpace: SlotStub,
  NSelect: SlotStub,
  NScrollbar: SlotStub,
  NEmpty: SlotStub,
  NList: SlotStub,
  NListItem: SlotStub,
  NThing: CardStub,
  NTag: SlotStub,
  MonacoSourcePane: true,
  WysiwygPane: true,
  DiffPane: true,
}

async function mountWorkspaceComponent(component: typeof EditorPane | typeof VersionPanel) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const gateway = fakeGateway()
  const store = useAppStore()
  store.configurePersistence(gateway)
  await store.selectBook('book-1')
  await store.switchDocument('document-1')
  const wrapper = mount(component, {
    attachTo: document.body,
    global: { plugins: [pinia], stubs: globalStubs },
  })
  await nextTick()
  return { gateway, store, wrapper }
}

async function mountCombinedWorkspace() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const gateway = fakeGateway()
  const store = useAppStore()
  store.configurePersistence(gateway)
  await store.selectBook('book-1')
  await store.switchDocument('document-1')
  const naive = create({
    components: [
      NButton, NCard, NEmpty, NForm, NFormItem, NInput, NList, NListItem, NModal,
      NRadioButton, NRadioGroup, NScrollbar, NSelect, NSpace, NTag, NThing,
    ],
  })
  const Harness = defineComponent({
    components: { EditorPane, VersionPanel },
    template: '<div><EditorPane/><VersionPanel/></div>',
  })
  const wrapper = mount(Harness, {
    attachTo: document.body,
    global: { plugins: [pinia, naive] },
  })
  await nextTick()
  return { gateway, store, wrapper }
}

describe('application version dialogs', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('opens an accessible in-app form from EditorPane and submits the exact message once', async () => {
    const { gateway, wrapper } = await mountWorkspaceComponent(EditorPane)
    const pending = deferred<ReturnType<typeof sampleVersion>>()
    gateway.createVersion.mockImplementationOnce(() => pending.promise)
    const prompt = vi.fn()
    vi.stubGlobal('prompt', prompt)

    await wrapper.get('[data-testid="save-version"]').trigger('click')

    const dialog = wrapper.get('[data-testid="create-version-dialog"]')
    expect(dialog.attributes('role')).toBe('dialog')
    expect(dialog.attributes('aria-modal')).toBe('true')
    expect(prompt).not.toHaveBeenCalled()

    await wrapper.get('[data-testid="create-version-description"]').setValue('初始版本 精确描述')
    const submit = wrapper.get('[data-testid="create-version-submit"]')
    void submit.trigger('click')
    void submit.trigger('click')

    await vi.waitFor(() => expect(gateway.createVersion).toHaveBeenCalledOnce())
    expect(gateway.createVersion.mock.calls[0][0].message).toBe('初始版本 精确描述')
    expect(submit.attributes('disabled')).toBeDefined()

    pending.resolve(sampleVersion())
    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="create-version-dialog"]').exists()).toBe(false)
    })
    wrapper.unmount()
  })

  it('keeps the VersionPanel form and exact input after failure, then retries successfully', async () => {
    const { gateway, wrapper } = await mountWorkspaceComponent(VersionPanel)
    gateway.createVersion
      .mockRejectedValueOnce({ code: 'databaseBusy', message: 'busy', retryable: true })
      .mockResolvedValueOnce(sampleVersion())
    const prompt = vi.fn()
    vi.stubGlobal('prompt', prompt)

    await wrapper.get('[data-testid="version-panel-create"]').trigger('click')
    expect(prompt).not.toHaveBeenCalled()
    const input = wrapper.get<HTMLInputElement>('[data-testid="create-version-description"]')
    await input.setValue('第二版本')
    await wrapper.get('[data-testid="create-version-submit"]').trigger('click')

    await vi.waitFor(() => expect(gateway.createVersion).toHaveBeenCalledOnce())
    await vi.waitFor(() => {
      expect(wrapper.get('[data-testid="create-version-dialog-error"]').attributes('role')).toBe('alert')
    })
    expect(input.element.value).toBe('第二版本')
    expect(wrapper.find('[data-testid="create-version-dialog"]').exists()).toBe(true)

    await wrapper.get('[data-testid="create-version-submit"]').trigger('click')
    await vi.waitFor(() => expect(gateway.createVersion).toHaveBeenCalledTimes(2))
    expect(gateway.createVersion.mock.calls.map(([request]) => request.message)).toEqual([
      '第二版本', '第二版本',
    ])
    expect(gateway.createVersion.mock.calls[1][0].operationId)
      .toBe(gateway.createVersion.mock.calls[0][0].operationId)
    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="create-version-dialog"]').exists()).toBe(false)
    })
    wrapper.unmount()
  })

  it('uses a new create operation after the failed request message materially changes', async () => {
    const { gateway, wrapper } = await mountWorkspaceComponent(VersionPanel)
    gateway.createVersion
      .mockRejectedValueOnce({ code: 'storageUnavailable', message: 'response lost', retryable: true })
      .mockResolvedValueOnce(sampleVersion())

    await wrapper.get('[data-testid="version-panel-create"]').trigger('click')
    const input = wrapper.get<HTMLInputElement>('[data-testid="create-version-description"]')
    await input.setValue('第一条描述')
    await wrapper.get('[data-testid="create-version-submit"]').trigger('click')
    await vi.waitFor(() => expect(gateway.createVersion).toHaveBeenCalledOnce())
    await vi.waitFor(() => expect(wrapper.find('[data-testid="create-version-dialog-error"]').exists()).toBe(true))

    await input.setValue('第二条描述')
    await wrapper.get('[data-testid="create-version-submit"]').trigger('click')
    await vi.waitFor(() => expect(gateway.createVersion).toHaveBeenCalledTimes(2))
    expect(gateway.createVersion.mock.calls[1][0].operationId)
      .not.toBe(gateway.createVersion.mock.calls[0][0].operationId)
    wrapper.unmount()
  })

  it('resets create operation identity after cancellation and a fresh open', async () => {
    const submit = vi.fn()
      .mockRejectedValueOnce(new Error('response lost'))
      .mockResolvedValueOnce(undefined)
    const wrapper = mount(CreateVersionDialog, {
      props: { show: true, submit },
      global: { stubs: globalStubs },
    })
    await nextTick()

    await wrapper.get('[data-testid="create-version-description"]').setValue('相同描述')
    await wrapper.get('[data-testid="create-version-submit"]').trigger('click')
    await vi.waitFor(() => expect(submit).toHaveBeenCalledOnce())
    await vi.waitFor(() => expect(wrapper.find('[data-testid="create-version-dialog-error"]').exists()).toBe(true))
    const firstOperationId = submit.mock.calls[0][1]

    await wrapper.get('[data-testid="create-version-cancel"]').trigger('click')
    await wrapper.setProps({ show: false })
    await wrapper.setProps({ show: true })
    await wrapper.get('[data-testid="create-version-description"]').setValue('相同描述')
    await wrapper.get('[data-testid="create-version-submit"]').trigger('click')
    await vi.waitFor(() => expect(submit).toHaveBeenCalledTimes(2))
    expect(submit.mock.calls[1][1]).not.toBe(firstOperationId)
    wrapper.unmount()
  })

  it('resets create operation identity after success and a fresh open', async () => {
    const submit = vi.fn<(message: string, operationId: string) => Promise<void>>(
      async () => undefined,
    )
    const wrapper = mount(CreateVersionDialog, {
      props: { show: true, submit },
      global: { stubs: globalStubs },
    })
    await nextTick()

    await wrapper.get('[data-testid="create-version-description"]').setValue('成功描述')
    await wrapper.get('[data-testid="create-version-submit"]').trigger('click')
    await vi.waitFor(() => expect(submit).toHaveBeenCalledOnce())
    const firstOperationId = submit.mock.calls[0][1]

    await wrapper.setProps({ show: false })
    await wrapper.setProps({ show: true })
    await wrapper.get('[data-testid="create-version-description"]').setValue('成功描述')
    await wrapper.get('[data-testid="create-version-submit"]').trigger('click')
    await vi.waitFor(() => expect(submit).toHaveBeenCalledTimes(2))
    expect(submit.mock.calls[1][1]).not.toBe(firstOperationId)
    wrapper.unmount()
  })

  it('ignores IME Enter events and submits once for a later ordinary Enter', async () => {
    const submit = vi.fn<(message: string, operationId: string) => Promise<void>>(
      async () => undefined,
    )
    const wrapper = mount(CreateVersionDialog, {
      props: { show: true, submit },
      global: { stubs: globalStubs },
    })
    await nextTick()
    const input = wrapper.get<HTMLInputElement>('[data-testid="create-version-description"]')
    await input.setValue('中文版本')

    input.element.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', bubbles: true, cancelable: true, isComposing: true,
    }))
    const safariCompositionEnter = new KeyboardEvent('keydown', {
      key: 'Enter', bubbles: true, cancelable: true,
    })
    Object.defineProperty(safariCompositionEnter, 'keyCode', { value: 229 })
    input.element.dispatchEvent(safariCompositionEnter)
    await nextTick()
    expect(submit).not.toHaveBeenCalled()

    input.element.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', bubbles: true, cancelable: true,
    }))
    await vi.waitFor(() => expect(submit).toHaveBeenCalledOnce())
    expect(submit.mock.calls[0][0]).toBe('中文版本')
    wrapper.unmount()
  })

  it('keeps one create dialog when workspace shortcuts originate in application modals', async () => {
    let { wrapper } = await mountCombinedWorkspace()
    try {
      await wrapper.get('[data-testid="version-panel-create"]').trigger('click')
      await vi.waitFor(() => {
        expect(document.querySelectorAll('[data-testid="create-version-dialog"]')).toHaveLength(1)
      })
      const input = document.getElementById('create-version-description-input')
      expect(input).not.toBeNull()
      input?.dispatchEvent(new KeyboardEvent('keydown', {
        key: 's', code: 'KeyS', metaKey: true, bubbles: true, cancelable: true,
      }))
      await nextTick()
      expect(document.querySelectorAll('[data-testid="create-version-dialog"]')).toHaveLength(1)
      expect(document.querySelectorAll('#create-version-dialog-title')).toHaveLength(1)
      expect(document.querySelectorAll('#create-version-description-input')).toHaveLength(1)

      wrapper.unmount()
      document.body.innerHTML = ''
      const restoreWorkspace = await mountCombinedWorkspace()
      wrapper = restoreWorkspace.wrapper
      await wrapper.get('[data-testid="version-restore-btn"]').trigger('click')
      await vi.waitFor(() => {
        expect(document.querySelectorAll('[data-testid="restore-version-dialog"]')).toHaveLength(1)
      })
      document.querySelector('[data-testid="restore-version-dialog"]')?.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 's', code: 'KeyS', ctrlKey: true, bubbles: true, cancelable: true,
        }),
      )
      await nextTick()
      expect(document.querySelectorAll('[data-testid="create-version-dialog"]')).toHaveLength(0)

      const prevented = new KeyboardEvent('keydown', {
        key: 's', code: 'KeyS', metaKey: true, bubbles: true, cancelable: true,
      })
      prevented.preventDefault()
      window.dispatchEvent(prevented)
      await nextTick()
      expect(document.querySelectorAll('[data-testid="create-version-dialog"]')).toHaveLength(0)
    } finally {
      wrapper.unmount()
    }
  })

  it('uses an accessible in-app confirmation before VersionPanel restore', async () => {
    const { gateway, wrapper } = await mountWorkspaceComponent(VersionPanel)
    const confirm = vi.fn()
    vi.stubGlobal('confirm', confirm)

    await wrapper.get('[data-testid="version-restore-btn"]').trigger('click')

    const dialog = wrapper.get('[data-testid="restore-version-dialog"]')
    expect(dialog.attributes('role')).toBe('dialog')
    expect(dialog.attributes('aria-modal')).toBe('true')
    expect(confirm).not.toHaveBeenCalled()
    expect(gateway.restoreVersion).not.toHaveBeenCalled()

    await wrapper.get('[data-testid="restore-version-confirm"]').trigger('click')
    await vi.waitFor(() => expect(gateway.restoreVersion).toHaveBeenCalledOnce())
    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="restore-version-dialog"]').exists()).toBe(false)
    })
    wrapper.unmount()
  })

  it('reuses the restore operation identity when a committed response is lost and retried', async () => {
    const { gateway, wrapper } = await mountWorkspaceComponent(VersionPanel)
    gateway.restoreVersion
      .mockRejectedValueOnce({ code: 'storageUnavailable', message: 'response lost', retryable: true })
      .mockResolvedValueOnce({
        alreadyCurrent: false,
        safetyVersion: null,
        restoredVersion: null,
      })

    await wrapper.get('[data-testid="version-restore-btn"]').trigger('click')
    await wrapper.get('[data-testid="restore-version-confirm"]').trigger('click')
    await vi.waitFor(() => expect(gateway.restoreVersion).toHaveBeenCalledOnce())
    await vi.waitFor(() => expect(wrapper.find('[data-testid="restore-version-dialog"]').exists()).toBe(true))
    await vi.waitFor(() => {
      expect(wrapper.get('[data-testid="restore-version-confirm"]').attributes('disabled')).toBeUndefined()
    })

    await wrapper.get('[data-testid="restore-version-confirm"]').trigger('click')
    await vi.waitFor(() => expect(gateway.restoreVersion).toHaveBeenCalledTimes(2))
    expect(gateway.restoreVersion.mock.calls[1][0].operationId)
      .toBe(gateway.restoreVersion.mock.calls[0][0].operationId)
    wrapper.unmount()
  })
})
