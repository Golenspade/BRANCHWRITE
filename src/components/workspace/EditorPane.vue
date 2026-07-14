<template>
  <n-card
    class="h-full flex flex-col editor-card"
    :bordered="false"
    content-style="padding: 0; flex: 1; display: flex; flex-direction: column; min-height: 0;"
  >
    <template #header>
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <n-radio-group v-model:value="mode" size="small" name="editor-mode" data-testid="editor-mode-group">
          <n-radio-button value="wysiwyg" data-testid="mode-wysiwyg">写作</n-radio-button>
          <n-radio-button value="source" data-testid="mode-source">源码</n-radio-button>
          <n-radio-button value="preview" data-testid="mode-preview">预览</n-radio-button>
          <n-radio-button value="diff" :disabled="!canDiff" data-testid="mode-diff">对比</n-radio-button>
        </n-radio-group>

        <n-space :size="8" align="center">
          <n-select
            v-if="mode === 'source'"
            v-model:value="themeId"
            :options="themeOptions"
            size="small"
            style="width: 140px"
            data-testid="editor-theme"
          />
          <n-button
            v-if="mode === 'source'"
            size="small"
            :disabled="!hasDocument"
            @click="monacoRef?.undo()"
          >
            撤销
          </n-button>
          <n-button
            v-if="mode === 'source'"
            size="small"
            :disabled="!hasDocument"
            @click="monacoRef?.redo()"
          >
            重做
          </n-button>
          <n-button
            size="small"
            type="primary"
            :disabled="!hasDocument"
            data-testid="save-version"
            @click="saveVersion"
          >
            保存版本
          </n-button>
        </n-space>
      </div>
    </template>

    <div
      v-if="!hasDocument"
      class="flex-1 flex items-center justify-center text-gray-400"
      data-testid="editor-empty"
    >
      <div class="text-center px-6">
        <div class="text-4xl mb-3">📝</div>
        <p class="text-base text-gray-600 mb-1">选择或创建文档开始写作</p>
        <p class="text-xs">
          快捷键：Ctrl/⌘+S 保存版本 · Ctrl/⌘+1 写作 · Ctrl/⌘+2 源码 · Ctrl/⌘+3 预览 · Ctrl/⌘+4 对比
        </p>
      </div>
    </div>

    <div v-show="hasDocument" class="flex-1 flex flex-col min-h-0" data-testid="editor-workspace">
      <div
        v-show="mode === 'wysiwyg'"
        class="flex-1 min-h-0 overflow-hidden"
        data-testid="editor-wysiwyg-pane"
      >
        <WysiwygPane
          v-if="wysiwygMounted"
          v-model="documentDraft"
          @ready="onWysiwygReady"
        />
      </div>

      <div
        v-if="mode === 'source'"
        class="flex-1 min-h-0"
        data-testid="editor-source-pane"
      >
        <MonacoSourcePane
          ref="monacoRef"
          v-model="documentDraft"
          :theme-id="themeId"
          @cursor="onCursor"
        />
      </div>

      <div
        v-show="mode === 'preview'"
        class="flex-1 min-h-0 overflow-hidden"
        data-testid="editor-preview-pane"
      >
        <n-scrollbar class="h-full">
          <article
            class="preview-body prose prose-slate max-w-none px-6 py-4"
            data-testid="markdown-preview"
            v-html="previewHtml"
          />
        </n-scrollbar>
      </div>

      <div
        v-show="mode === 'diff'"
        class="flex-1 min-h-0 overflow-hidden"
        data-testid="editor-diff-pane"
      >
        <DiffPane
          :old-text="compareText"
          :new-text="currentDocument"
          :compare-label="compareLabel"
        />
      </div>

      <footer
        class="status-bar flex items-center justify-between gap-3 px-3 py-1.5 border-t bg-white text-xs text-gray-500"
        data-testid="editor-status-bar"
      >
        <div class="flex items-center gap-3 min-w-0">
          <span v-if="mode === 'source'">行 {{ cursor.line }}，列 {{ cursor.column }}</span>
          <span v-else-if="mode === 'wysiwyg'">所见即所得</span>
          <span v-else-if="mode === 'preview'">预览</span>
          <span v-else>对比</span>
          <span class="truncate">{{ currentDocumentConfig?.title }}</span>
          <span v-if="saveState === 'saving'" class="text-blue-500">保存中…</span>
          <span v-else-if="saveState === 'saved'" class="text-green-600">已自动保存</span>
        </div>
        <div class="flex items-center gap-3 shrink-0">
          <span>{{ stats.words }} 词</span>
          <span>{{ stats.characters }} 字符</span>
          <span>{{ stats.charactersNoSpaces }} 不计空格</span>
          <span>{{ stats.lines }} 行</span>
        </div>
      </footer>
    </div>
  </n-card>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { marked } from 'marked'
import { useMessage } from 'naive-ui'
import { useAppStore } from '../../stores/app'
import { allEditorThemes } from '../../utils/editorThemes'
import { computeTextStats } from '../../utils/textStats'
import DiffPane from './DiffPane.vue'
import WysiwygPane from './WysiwygPane.vue'
import MonacoSourcePane from './MonacoSourcePane.vue'

type EditorMode = 'wysiwyg' | 'source' | 'preview' | 'diff'

const app = useAppStore()
const message = useMessage()
const {
  currentBook,
  currentDocument,
  currentDocumentConfig,
  commits,
  currentMode,
} = storeToRefs(app)

let saveTimer: number | null = null
let applyingExternal = false

const mode = ref<EditorMode>('wysiwyg')
const themeId = ref('focus-writing')
const cursor = ref({ line: 1, column: 1 })
const saveState = ref<'idle' | 'saving' | 'saved'>('idle')
const wysiwygMounted = ref(false)
const documentDraft = ref('')
const monacoRef = ref<{ undo: () => void; redo: () => void; focus: () => void } | null>(null)

const hasDocument = computed(() => !!currentDocumentConfig.value)
const stats = computed(() => computeTextStats(documentDraft.value || currentDocument.value || ''))

const themeOptions = allEditorThemes.map((t) => ({
  label: t.name,
  value: t.id,
}))

const canDiff = computed(() => commits.value.length > 0)

const compareCommit = computed(() => {
  if (app.selectedCommits.length > 0) {
    const id = app.selectedCommits[0]
    return commits.value.find((c) => c.id === id) || commits.value[0] || null
  }
  return commits.value[0] || null
})

const compareText = computed(() => {
  const commit = compareCommit.value
  if (!commit) return ''
  return app.getCommitDiff(commit.id)?.content ?? ''
})

const compareLabel = computed(() => compareCommit.value?.message || '历史版本')

const previewHtml = computed(() => {
  try {
    return marked.parse(currentDocument.value || '', { async: false }) as string
  } catch {
    return '<p>预览渲染失败</p>'
  }
})

watch(currentMode, (value) => {
  if (value === 'wysiwyg' || value === 'source' || value === 'preview' || value === 'diff') {
    mode.value = value
  } else if (value === 'edit') {
    mode.value = 'wysiwyg'
  }
})

watch(mode, (value) => {
  app.setCurrentMode(value)
  if (value === 'wysiwyg' || value === 'source') {
    documentDraft.value = currentDocument.value || ''
  }
})

watch(documentDraft, (value) => {
  if (mode.value !== 'wysiwyg' && mode.value !== 'source') return
  if (value === currentDocument.value) return
  app.setCurrentDocument(value)
  scheduleSave()
})

watch(currentDocumentConfig, async (doc) => {
  if (!doc) {
    wysiwygMounted.value = false
    return
  }

  const bookId = currentBook.value?.config.id
  if (!bookId) return

  applyingExternal = true
  try {
    const content = await app.loadDocumentContent(bookId, doc.id)
    app.setCurrentDocument(content || '')
    documentDraft.value = content || ''
  } finally {
    applyingExternal = false
  }

  wysiwygMounted.value = true
})

watch(currentDocument, (value) => {
  if (applyingExternal) return
  if (documentDraft.value !== value) {
    documentDraft.value = value || ''
  }
})

watch(hasDocument, (ready) => {
  if (!ready) {
    wysiwygMounted.value = false
    return
  }
  wysiwygMounted.value = true
  documentDraft.value = currentDocument.value || ''
})

onMounted(() => {
  window.addEventListener('keydown', handleGlobalShortcuts)
  if (hasDocument.value) {
    wysiwygMounted.value = true
    documentDraft.value = currentDocument.value || ''
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalShortcuts)
  if (saveTimer) window.clearTimeout(saveTimer)
})

function onWysiwygReady() {
  documentDraft.value = currentDocument.value || ''
}

function onCursor(value: { line: number; column: number }) {
  cursor.value = value
}

function handleGlobalShortcuts(event: KeyboardEvent) {
  const isMod = event.ctrlKey || event.metaKey
  if (!isMod || event.shiftKey || event.altKey) return

  if (event.code === 'Digit1') {
    event.preventDefault()
    mode.value = 'wysiwyg'
  } else if (event.code === 'Digit2') {
    event.preventDefault()
    mode.value = 'source'
  } else if (event.code === 'Digit3') {
    event.preventDefault()
    mode.value = 'preview'
  } else if (event.code === 'Digit4') {
    event.preventDefault()
    if (canDiff.value) mode.value = 'diff'
    else message.warning('请先保存一个版本后再对比')
  } else if (event.code === 'KeyS') {
    if (mode.value === 'wysiwyg' || mode.value === 'source') {
      event.preventDefault()
      void saveVersion()
    }
  }
}

function scheduleSave() {
  if (saveTimer) window.clearTimeout(saveTimer)
  saveState.value = 'idle'
  saveTimer = window.setTimeout(async () => {
    const bookId = currentBook.value?.config.id
    const docId = currentDocumentConfig.value?.id
    if (!bookId || !docId) return
    saveState.value = 'saving'
    try {
      await app.saveDocumentContent(bookId, docId, currentDocument.value)
      saveState.value = 'saved'
    } catch {
      saveState.value = 'idle'
      message.error('自动保存失败')
    }
  }, 1200)
}

async function saveVersion() {
  if (!hasDocument.value) return
  const bookId = currentBook.value?.config.id
  const docId = currentDocumentConfig.value?.id
  if (!bookId || !docId) return

  const msg = window.prompt('请输入版本描述：', '手动保存')
  if (!msg || !msg.trim()) return

  try {
    await app.saveDocumentContent(bookId, docId, currentDocument.value)
    app.createCommit(msg.trim())
    message.success('版本已保存')
    saveState.value = 'saved'
  } catch {
    message.error('保存版本失败')
  }
}
</script>

<style scoped>
.editor-card {
  min-height: 0;
}

.editor-card :deep(.n-card-header) {
  padding: 10px 12px;
  border-bottom: 1px solid #eee;
}

.preview-body :deep(h1),
.preview-body :deep(h2),
.preview-body :deep(h3) {
  margin-top: 1.2em;
  margin-bottom: 0.5em;
  font-weight: 700;
}

.preview-body :deep(p) {
  margin: 0.75em 0;
  line-height: 1.75;
}

.preview-body :deep(pre) {
  background: #f6f8fa;
  padding: 12px;
  border-radius: 6px;
  overflow: auto;
}

.preview-body :deep(code) {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

.status-bar {
  min-height: 28px;
}
</style>
