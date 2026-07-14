<template>
  <div class="monaco-pane h-full min-h-0 relative" data-testid="monaco-source-pane">
    <div ref="hostEl" class="absolute inset-0" data-testid="monaco-host"></div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import 'monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import { getThemeById, registerCustomThemes } from '../../utils/editorThemes'

;(globalThis as typeof globalThis & { MonacoEnvironment?: { getWorker: () => Worker } }).MonacoEnvironment = {
  getWorker() {
    return new editorWorker()
  },
}

const props = defineProps<{
  modelValue: string
  themeId?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'cursor', value: { line: number; column: number }): void
  (e: 'ready'): void
}>()

const hostEl = ref<HTMLDivElement | null>(null)
let editor: monaco.editor.IStandaloneCodeEditor | null = null
let applyingExternal = false
let markdownExtrasRegistered = false

onMounted(async () => {
  await nextTick()
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
  if (!hostEl.value) return

  try {
    registerCustomThemes(monaco)
    registerMarkdownExtras(monaco)
    const theme = getThemeById(props.themeId || 'focus-writing')

    editor = monaco.editor.create(hostEl.value, {
      value: props.modelValue || '',
      language: 'markdown',
      theme: theme?.monacoTheme || 'vs',
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 16,
      lineHeight: 28,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Source Han Sans SC', 'PingFang SC', monospace",
      wordWrap: 'on',
      padding: { top: 16, bottom: 16 },
      scrollBeyondLastLine: false,
      mouseWheelZoom: true,
      smoothScrolling: true,
      renderWhitespace: 'selection',
      folding: true,
    })

    editor.onDidChangeModelContent(() => {
      if (applyingExternal || !editor) return
      emit('update:modelValue', editor.getValue())
    })

    editor.onDidChangeCursorPosition((e) => {
      emit('cursor', {
        line: e.position.lineNumber,
        column: e.position.column,
      })
    })

    requestAnimationFrame(() => editor?.layout())
    emit('ready')
  } catch (error) {
    console.error('Monaco 源码编辑器初始化失败:', error)
  }
})

onBeforeUnmount(() => {
  editor?.dispose()
  editor = null
})

watch(
  () => props.modelValue,
  (value) => {
    if (!editor) return
    if (editor.getValue() === value) return
    applyingExternal = true
    const position = editor.getPosition()
    editor.setValue(value || '')
    if (position) editor.setPosition(position)
    applyingExternal = false
  }
)

watch(
  () => props.themeId,
  (id) => {
    const theme = getThemeById(id || 'focus-writing')
    if (theme) monaco.editor.setTheme(theme.monacoTheme)
  }
)

function registerMarkdownExtras(m: typeof monaco) {
  if (markdownExtrasRegistered) return
  markdownExtrasRegistered = true
  m.languages.setLanguageConfiguration('markdown', {
    autoClosingPairs: [
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '`', close: '`' },
      { open: '*', close: '*' },
      { open: '_', close: '_' },
    ],
  })
}

defineExpose({
  focus() {
    editor?.focus()
  },
  undo() {
    editor?.trigger('toolbar', 'undo', null)
  },
  redo() {
    editor?.trigger('toolbar', 'redo', null)
  },
  layout() {
    editor?.layout()
  },
})
</script>
