<template>
  <n-modal
    :show="show"
    :mask-closable="!submitting"
    @update:show="handleVisibilityChange"
  >
    <n-card
      :style="{ width: 'min(480px, calc(100vw - 32px))' }"
      :bordered="false"
      size="small"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-version-dialog-title"
        data-testid="create-version-dialog"
      >
        <h2 id="create-version-dialog-title" class="mb-4 text-lg font-semibold">
          保存版本
        </h2>
        <n-form @submit.prevent="submitVersion">
          <n-form-item label="版本描述">
            <n-input
              ref="descriptionInput"
              v-model:value="description"
              :disabled="submitting"
              :input-props="{
                id: 'create-version-description-input',
                'aria-label': '版本描述',
              }"
              placeholder="例如：初始版本"
              data-testid="create-version-description"
              @keydown="handleDescriptionKeydown"
            />
          </n-form-item>
          <p
            v-if="errorMessage"
            class="mb-3 text-sm text-red-600"
            role="alert"
            data-testid="create-version-dialog-error"
          >
            {{ errorMessage }}
          </p>
          <n-space justify="end">
            <n-button
              :disabled="submitting"
              data-testid="create-version-cancel"
              @click="closeDialog"
            >
              取消
            </n-button>
            <n-button
              type="primary"
              :loading="submitting"
              :disabled="submitting || !description.trim()"
              data-testid="create-version-submit"
              @click="submitVersion"
            >
              保存版本
            </n-button>
          </n-space>
        </n-form>
      </section>
    </n-card>
  </n-modal>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  show: boolean
  defaultMessage?: string
  submit: (message: string, operationId: string) => Promise<void>
}>(), {
  defaultMessage: '',
})

const emit = defineEmits<{
  'update:show': [show: boolean]
}>()

const description = ref('')
const submitting = ref(false)
const errorMessage = ref('')
const descriptionInput = ref<{ focus?: () => void } | null>(null)
const pendingOperation = ref<{ message: string; operationId: string } | null>(null)

watch(() => props.show, async (show) => {
  resetOperation()
  if (!show) return
  description.value = props.defaultMessage
  errorMessage.value = ''
  await nextTick()
  descriptionInput.value?.focus?.()
})

function handleVisibilityChange(show: boolean) {
  if (!show) closeDialog()
}

function closeDialog() {
  if (submitting.value) return
  resetOperation()
  emit('update:show', false)
}

function resetOperation() {
  pendingOperation.value = null
}

function handleDescriptionKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.isComposing || event.keyCode === 229) return
  event.preventDefault()
  void submitVersion()
}

async function submitVersion() {
  const message = description.value.trim()
  if (submitting.value || !message) return
  if (pendingOperation.value?.message !== message) {
    pendingOperation.value = { message, operationId: crypto.randomUUID() }
  }
  const operationId = pendingOperation.value.operationId

  submitting.value = true
  errorMessage.value = ''
  try {
    await props.submit(message, operationId)
    resetOperation()
    emit('update:show', false)
  } catch {
    errorMessage.value = '保存版本失败，描述已保留，请重试。'
  } finally {
    submitting.value = false
  }
}
</script>
