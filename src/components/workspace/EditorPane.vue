<template>
  <n-card title="编辑器" class="h-full flex flex-col" :bordered="false">
    <template #header-extra>
      <n-space>
        <n-button size="small" @click="undo">
          <template #icon>
            <n-icon>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 7v6h6M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/>
              </svg>
            </n-icon>
          </template>
          撤销
        </n-button>
        <n-button size="small" @click="redo">
          <template #icon>
            <n-icon>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 7v6h-6M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7"/>
              </svg>
            </n-icon>
          </template>
          重做
        </n-button>
      </n-space>
    </template>
    <div ref="editorEl" class="flex-1 w-full"></div>
  </n-card>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../../stores/app'

// Configure Monaco environment workers
;(self as any).MonacoEnvironment = {
  getWorker(_: unknown, label: string) {
    if (label === 'json') {
      return new (require('monaco-editor/esm/vs/language/json/json.worker?worker')).default()
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new (require('monaco-editor/esm/vs/language/css/css.worker?worker')).default()
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new (require('monaco-editor/esm/vs/language/html/html.worker?worker')).default()
    }
    if (label === 'typescript' || label === 'javascript') {
      return new (require('monaco-editor/esm/vs/language/typescript/ts.worker?worker')).default()
    }
    return new (require('monaco-editor/esm/vs/editor/editor.worker?worker')).default()
  }
}

const app = useAppStore()
const { currentBook, currentDocument, currentDocumentConfig } = storeToRefs(app)

const editorEl = ref<HTMLDivElement | null>(null)
let editor: monaco.editor.IStandaloneCodeEditor | null = null
let saveTimer: number | null = null

const disposeEditor = () => {
  if (editor) {
    editor.dispose()
    editor = null
  }
}

onMounted(async () => {
  if (!editorEl.value) return
  editor = monaco.editor.create(editorEl.value, {
    value: currentDocument.value || '',
    language: 'markdown',
    theme: 'vs',
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 16,
    lineHeight: 28,
    wordWrap: 'on',
    padding: { top: 16, bottom: 16 },
  })

  editor.onDidChangeModelContent(() => {
    const text = editor!.getValue()
    app.setCurrentDocument(text)
    scheduleSave()
  })
})

onBeforeUnmount(() => {
  disposeEditor()
})

watch(currentDocumentConfig, async (doc) => {
  if (!doc || !editor) return
  const bookId = currentBook.value?.config.id
  if (!bookId) return
  const content = await app.loadDocumentContent(bookId, doc.id)
  editor.setValue(content || '')
})

function scheduleSave() {
  if (saveTimer) window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(async () => {
    const bookId = currentBook.value?.config.id
    const docId = currentDocumentConfig.value?.id
    if (!bookId || !docId) return
    await app.saveDocumentContent(bookId, docId, currentDocument.value)
  }, 1200)
}

function undo() { editor?.trigger('any', 'undo', null) }
function redo() { editor?.trigger('any', 'redo', null) }
</script>

<style scoped>
:deep(.n-card__content) {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
}
</style>
