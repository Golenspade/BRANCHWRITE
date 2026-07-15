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
          <n-button v-if="mode === 'source'" size="small" :disabled="!hasDocument" @click="monacoRef?.undo()">
            撤销
          </n-button>
          <n-button v-if="mode === 'source'" size="small" :disabled="!hasDocument" @click="monacoRef?.redo()">
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

    <div v-if="!hasDocument" class="flex-1 flex items-center justify-center text-gray-400" data-testid="editor-empty">
      <div class="text-center px-6">
        <div class="text-4xl mb-3">📝</div>
        <p class="text-base text-gray-600 mb-1">选择或创建文档开始写作</p>
        <p class="text-xs">
          快捷键：Ctrl/⌘+S 保存版本 · Ctrl/⌘+1 写作 · Ctrl/⌘+2 源码 · Ctrl/⌘+3 预览 · Ctrl/⌘+4 对比
        </p>
      </div>
    </div>

    <div v-show="hasDocument" class="flex-1 flex flex-col min-h-0" data-testid="editor-workspace">
      <div v-show="mode === 'wysiwyg'" class="flex-1 min-h-0 overflow-hidden" data-testid="editor-wysiwyg-pane">
        <WysiwygPane v-if="wysiwygMounted" v-model="documentDraft" @ready="onWysiwygReady" />
      </div>

      <div v-if="mode === 'source'" class="flex-1 min-h-0" data-testid="editor-source-pane">
        <MonacoSourcePane
          ref="monacoRef"
          v-model="documentDraft"
          :theme-id="themeId"
          @cursor="onCursor"
        />
      </div>

      <div v-show="mode === 'preview'" class="flex-1 min-h-0 overflow-hidden" data-testid="editor-preview-pane">
        <n-scrollbar class="h-full">
          <article
            class="preview-body prose prose-slate max-w-none px-6 py-4"
            data-testid="markdown-preview"
            v-html="previewHtml"
          />
        </n-scrollbar>
      </div>

      <div v-if="mode === 'diff'" class="flex-1 min-h-0 overflow-hidden" data-testid="editor-diff-pane">
        <DiffPane :old-text="compareText" :new-text="currentDocument" :compare-label="compareLabel" />
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
          <span class="truncate">{{ currentDocumentDetail?.title }}</span>
          <span v-if="saveState === 'saving'" class="text-blue-500">保存中…</span>
          <span v-else-if="saveState === 'pending'" class="text-amber-600">等待保存…</span>
          <span v-else-if="saveState === 'saved'" class="text-green-600">已自动保存</span>
          <span v-else-if="saveState === 'error'" class="text-red-600">保存失败</span>
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
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { useMessage } from 'naive-ui'
import { useAppStore } from '../../stores/app'
import { allEditorThemes } from '../../utils/editorThemes'
import { computeTextStats } from '../../utils/textStats'
import DiffPane from './DiffPane.vue'
import MonacoSourcePane from './MonacoSourcePane.vue'
import WysiwygPane from './WysiwygPane.vue'

type EditorMode = 'wysiwyg' | 'source' | 'preview' | 'diff'

const app = useAppStore()
const message = useMessage()
const {
  currentDocument, currentDocumentDetail, commits, currentMode, saveState,
} = storeToRefs(app)
const mode = ref<EditorMode>('wysiwyg')
const themeId = ref('focus-writing')
const cursor = ref({ line: 1, column: 1 })
const wysiwygMounted = ref(false)
const documentDraft = ref('')
const monacoRef = ref<{ undo: () => void; redo: () => void } | null>(null)

const hasDocument = computed(() => !!currentDocumentDetail.value)
const stats = computed(() => computeTextStats(documentDraft.value || currentDocument.value || ''))
const themeOptions = allEditorThemes.map((theme) => ({ label: theme.name, value: theme.id }))
const canDiff = computed(() => commits.value.length > 0)
const compareCommit = computed(() => {
  const selected = app.selectedCommits[0]
  return commits.value.find((commit) => commit.id === selected) || commits.value[0] || null
})
const compareText = computed(() => {
  const commit = compareCommit.value
  return commit ? app.getCommitDiff(commit.id)?.content ?? '' : ''
})
const compareLabel = computed(() => compareCommit.value?.message || '历史版本')
const previewHtml = computed(() => {
  try {
    return DOMPurify.sanitize(marked.parse(currentDocument.value || '', { async: false }) as string)
  } catch {
    return '<p>预览渲染失败</p>'
  }
})

watch(currentMode, (value) => {
  if (value === 'edit') mode.value = 'wysiwyg'
  else mode.value = value
})

watch(mode, (value) => {
  app.setCurrentMode(value)
  if (value === 'wysiwyg' || value === 'source') documentDraft.value = currentDocument.value
  if (value === 'diff' && compareCommit.value && !app.getCommitDiff(compareCommit.value.id)) {
    void app.loadVersionDetail(compareCommit.value.id).catch(() => {
      if (mode.value === 'diff') mode.value = 'wysiwyg'
    })
  }
})

watch(documentDraft, (value) => {
  if ((mode.value === 'wysiwyg' || mode.value === 'source') && value !== currentDocument.value) {
    app.queueDocumentSave(value)
  }
})

watch(currentDocument, (value) => {
  if (documentDraft.value !== value) documentDraft.value = value || ''
})

watch(currentDocumentDetail, (detail, previous) => {
  wysiwygMounted.value = !!detail
  if (detail?.id !== previous?.id) documentDraft.value = currentDocument.value || detail?.content || ''
}, { immediate: true })

onMounted(() => window.addEventListener('keydown', handleGlobalShortcuts))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalShortcuts)
  void app.flushDocumentSave().catch(() => undefined)
})

function onWysiwygReady() { documentDraft.value = currentDocument.value || '' }
function onCursor(value: { line: number; column: number }) { cursor.value = value }

function handleGlobalShortcuts(event: KeyboardEvent) {
  const isMod = event.ctrlKey || event.metaKey
  if (!isMod || event.shiftKey || event.altKey) return
  const modes: Partial<Record<string, EditorMode>> = {
    Digit1: 'wysiwyg', Digit2: 'source', Digit3: 'preview', Digit4: 'diff',
  }
  const target = modes[event.code]
  if (target) {
    event.preventDefault()
    if (target !== 'diff' || canDiff.value) mode.value = target
    else message.warning('请先保存一个版本后再对比')
  } else if (event.code === 'KeyS' && (mode.value === 'wysiwyg' || mode.value === 'source')) {
    event.preventDefault()
    void saveVersion()
  }
}

async function saveVersion() {
  if (!hasDocument.value) return
  const value = window.prompt('请输入版本描述：', '手动保存')
  if (!value?.trim()) return
  try {
    await app.createVersion(value.trim())
    message.success('版本已保存')
  } catch {
    message.error('保存版本失败')
  }
}
</script>

<style scoped>
.editor-card { min-height: 0; }
.editor-card :deep(.n-card-header) { padding: 10px 12px; border-bottom: 1px solid #eee; }
.preview-body :deep(h1),
.preview-body :deep(h2),
.preview-body :deep(h3) { margin-top: 1.2em; margin-bottom: 0.5em; font-weight: 700; }
.preview-body :deep(p) { margin: 0.75em 0; line-height: 1.75; }
.preview-body :deep(pre) { background: #f6f8fa; padding: 12px; border-radius: 6px; overflow: auto; }
.preview-body :deep(code) { font-family: 'JetBrains Mono', 'Fira Code', monospace; }
.status-bar { min-height: 28px; }
</style>
