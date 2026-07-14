<template>
  <div class="wysiwyg-pane h-full min-h-0" data-testid="wysiwyg-pane">
    <div ref="hostEl" class="wysiwyg-host h-full" data-testid="wysiwyg-host"></div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Vditor from 'vditor'
import 'vditor/dist/index.css'
import { storeImageFile, toMarkdownImage } from '../../services/imageStorage'
import { useMessage } from 'naive-ui'

const props = defineProps<{
  modelValue: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'ready'): void
}>()

const message = useMessage()
const hostEl = ref<HTMLDivElement | null>(null)
let vditor: Vditor | null = null
let applyingExternal = false
let hostId = `vditor-${Math.random().toString(36).slice(2, 9)}`

async function handleUploadFiles(files: File[]) {
  if (!vditor) return '编辑器未就绪'
  const images = files.filter((f) => f.type.startsWith('image/'))
  if (images.length === 0) return '请选择图片文件'

  try {
    for (const file of images) {
      const stored = await storeImageFile(file)
      vditor.insertValue(`${toMarkdownImage(stored)}\n`)
    }
    message.success(images.length > 1 ? `已插入 ${images.length} 张图片` : '图片已插入')
    return null
  } catch (error) {
    const msg = error instanceof Error ? error.message : '图片上传失败'
    message.error(msg)
    return msg
  }
}

onMounted(async () => {
  await nextTick()
  if (!hostEl.value) return

  hostEl.value.id = hostId

  vditor = new Vditor(hostId, {
    height: '100%',
    mode: 'ir',
    value: props.modelValue || '',
    placeholder: '开始写作… 支持粘贴/拖拽图片',
    cache: { enable: false },
    // Vditor 会拼接 `${cdn}/dist/...`，因此这里只给到 /vditor
    cdn: `${import.meta.env.BASE_URL}vditor`.replace(/\/?$/, ''),
    lang: 'zh_CN',
    toolbarConfig: {
      pin: true,
    },
    toolbar: [
      'headings',
      'bold',
      'italic',
      'strike',
      '|',
      'list',
      'ordered-list',
      'check',
      'outdent',
      'indent',
      '|',
      'quote',
      'line',
      'code',
      'inline-code',
      'insert-before',
      'insert-after',
      '|',
      'upload',
      'link',
      'table',
      '|',
      'undo',
      'redo',
      '|',
      'fullscreen',
      {
        name: 'outline',
        tip: '大纲',
      },
      'export',
    ],
    upload: {
      accept: 'image/*',
      multiple: true,
      max: 5 * 1024 * 1024,
      filename(name) {
        return name.replace(/[^\w.\u4e00-\u9fa5-]+/g, '_')
      },
      validate(files) {
        const list = Array.from(files as FileList | File[])
        if (list.some((f) => !f.type.startsWith('image/'))) {
          return '仅支持图片'
        }
        return true
      },
      async handler(files) {
        return handleUploadFiles(Array.from(files as File[]))
      },
    },
    preview: {
      hljs: {
        style: 'github',
      },
      markdown: {
        toc: true,
        mark: true,
      },
    },
    outline: {
      enable: false,
      position: 'right',
    },
    counter: {
      enable: false,
    },
    input(value) {
      if (applyingExternal) return
      emit('update:modelValue', value)
    },
    after() {
      if (props.disabled) {
        vditor?.disabled()
      }
      // 便于 Playwright / 调试直接写入内容，并确保同步到 Vue
      ;(window as unknown as {
        __branchwriteVditor?: {
          setValue: (v: string, clearStack?: boolean) => void
          getValue: () => string
          insertImageFiles?: (files: File[]) => Promise<string | null>
        }
      }).__branchwriteVditor = {
        setValue(v: string, clearStack = true) {
          applyingExternal = true
          vditor?.setValue(v || '', clearStack)
          applyingExternal = false
          emit('update:modelValue', v || '')
        },
        getValue() {
          return vditor?.getValue() ?? ''
        },
        insertImageFiles: handleUploadFiles,
      }
      emit('ready')
    },
  })
})

onBeforeUnmount(() => {
  const w = window as unknown as { __branchwriteVditor?: Vditor }
  if (w.__branchwriteVditor === vditor) {
    delete w.__branchwriteVditor
  }
  vditor?.destroy()
  vditor = null
})

watch(
  () => props.modelValue,
  (value) => {
    if (!vditor) return
    const current = vditor.getValue()
    if (current === value) return
    applyingExternal = true
    vditor.setValue(value || '', true)
    applyingExternal = false
  }
)

watch(
  () => props.disabled,
  (disabled) => {
    if (!vditor) return
    if (disabled) vditor.disabled()
    else vditor.enable()
  }
)

defineExpose({
  focus() {
    vditor?.focus()
  },
  getValue() {
    return vditor?.getValue() ?? ''
  },
  setValue(value: string) {
    applyingExternal = true
    vditor?.setValue(value || '', true)
    applyingExternal = false
  },
})
</script>

<style scoped>
.wysiwyg-pane {
  display: flex;
  flex-direction: column;
}

.wysiwyg-host {
  min-height: 0;
}

.wysiwyg-host :deep(.vditor) {
  height: 100% !important;
  border: none;
  border-radius: 0;
}

.wysiwyg-host :deep(.vditor-toolbar) {
  border-top: none;
  background: #fafafa;
}

.wysiwyg-host :deep(.vditor-ir) {
  font-size: 16px;
  line-height: 1.75;
  padding: 16px 20px;
}

.wysiwyg-host :deep(.vditor-ir pre.vditor-reset) {
  font-family: 'Source Han Sans SC', 'PingFang SC', 'Noto Sans SC', system-ui, sans-serif;
}
</style>
