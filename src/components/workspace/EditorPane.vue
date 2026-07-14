<template>
  <n-card class="h-full flex flex-col editor-card" :bordered="false" content-style="padding: 0; flex: 1; display: flex; flex-direction: column; min-height: 0;">
    <template #header>
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <n-radio-group v-model:value="mode" size="small" name="editor-mode">
          <n-radio-button value="edit">编辑</n-radio-button>
          <n-radio-button value="preview">预览</n-radio-button>
          <n-radio-button value="diff" :disabled="!canDiff">对比</n-radio-button>
        </n-radio-group>

        <n-space :size="8" align="center">
          <n-select
            v-if="mode === 'edit'"
            v-model:value="themeId"
            :options="themeOptions"
            size="small"
            style="width: 140px"
            @update:value="applyTheme"
          />
          <n-button v-if="mode === 'edit'" size="small" @click="undo" :disabled="!hasDocument">撤销</n-button>
          <n-button v-if="mode === 'edit'" size="small" @click="redo" :disabled="!hasDocument">重做</n-button>
          <n-button size="small" type="primary" :disabled="!hasDocument" @click="saveVersion">
            保存版本
          </n-button>
        </n-space>
      </div>
    </template>

    <div v-if="!hasDocument" class="flex-1 flex items-center justify-center text-gray-400">
      <div class="text-center px-6">
        <div class="text-4xl mb-3">📝</div>
        <p class="text-base text-gray-600 mb-1">选择或创建文档开始写作</p>
        <p class="text-xs">快捷键：Ctrl/⌘+S 保存版本 · Ctrl/⌘+1/2/3 切换模式 · Ctrl/⌘+F 搜索</p>
      </div>
    </div>

    <div v-show="hasDocument" class="flex-1 flex flex-col min-h-0">
      <div v-show="mode === 'edit'" class="flex-1 min-h-0 relative">
        <div ref="editorEl" class="absolute inset-0"></div>
      </div>

      <div v-show="mode === 'preview'" class="flex-1 min-h-0 overflow-hidden">
        <n-scrollbar class="h-full">
          <article
            class="preview-body prose prose-slate max-w-none px-6 py-4"
            v-html="previewHtml"
          />
        </n-scrollbar>
      </div>

      <div v-show="mode === 'diff'" class="flex-1 min-h-0 overflow-hidden">
        <DiffPane
          :old-text="compareText"
          :new-text="currentDocument"
          :compare-label="compareLabel"
        />
      </div>

      <footer class="status-bar flex items-center justify-between gap-3 px-3 py-1.5 border-t bg-white text-xs text-gray-500">
        <div class="flex items-center gap-3 min-w-0">
          <span>行 {{ cursor.line }}，列 {{ cursor.column }}</span>
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { marked } from 'marked'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import { useMessage } from 'naive-ui'
import { useAppStore } from '../../stores/app'
import { allEditorThemes, getThemeById, registerCustomThemes } from '../../utils/editorThemes'
import { computeTextStats } from '../../utils/textStats'
import DiffPane from './DiffPane.vue'

type EditorMode = 'edit' | 'preview' | 'diff'

;(globalThis as typeof globalThis & { MonacoEnvironment?: { getWorker: () => Worker } }).MonacoEnvironment = {
  getWorker() {
    return new editorWorker()
  },
}

const app = useAppStore()
const message = useMessage()
const {
  currentBook,
  currentDocument,
  currentDocumentConfig,
  commits,
  currentMode,
} = storeToRefs(app)

const editorEl = ref<HTMLDivElement | null>(null)
let editor: monaco.editor.IStandaloneCodeEditor | null = null
let saveTimer: number | null = null
let applyingExternal = false
let markdownExtrasRegistered = false

const mode = ref<EditorMode>('edit')
const themeId = ref('focus-writing')
const cursor = ref({ line: 1, column: 1 })
const saveState = ref<'idle' | 'saving' | 'saved'>('idle')

const hasDocument = computed(() => !!currentDocumentConfig.value)
const stats = computed(() => computeTextStats(currentDocument.value || ''))

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
  // 默认与最近一次非当前快照对比：取最新提交
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
  if (value === 'edit' || value === 'preview' || value === 'diff') {
    mode.value = value
  }
})

watch(mode, async (value) => {
  app.setCurrentMode(value)
  if (value === 'edit') {
    await nextTick()
    editor?.layout()
    editor?.focus()
  }
})

watch(currentDocumentConfig, async (doc) => {
  if (!doc || !editor) return
  const bookId = currentBook.value?.config.id
  if (!bookId) return

  applyingExternal = true
  try {
    const content = await app.loadDocumentContent(bookId, doc.id)
    app.setCurrentDocument(content || '')
    editor.setValue(content || '')
  } finally {
    applyingExternal = false
  }
})

watch(currentDocument, (value) => {
  if (!editor || applyingExternal) return
  if (editor.getValue() !== value) {
    applyingExternal = true
    const position = editor.getPosition()
    editor.setValue(value || '')
    if (position) editor.setPosition(position)
    applyingExternal = false
  }
})

onMounted(async () => {
  if (!editorEl.value) return

  registerCustomThemes(monaco)
  registerMarkdownExtras(monaco)

  const theme = getThemeById(themeId.value)
  editor = monaco.editor.create(editorEl.value, {
    value: currentDocument.value || '',
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
    find: {
      seedSearchStringFromSelection: 'always',
      autoFindInSelection: 'never',
      addExtraSpaceOnTop: true,
    },
  })

  editor.onDidChangeModelContent(() => {
    if (applyingExternal || !editor) return
    const text = editor.getValue()
    app.setCurrentDocument(text)
    scheduleSave()
  })

  editor.onDidChangeCursorPosition((e) => {
    cursor.value = {
      line: e.position.lineNumber,
      column: e.position.column,
    }
  })

  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
    void saveVersion()
  })

  window.addEventListener('keydown', handleGlobalShortcuts)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalShortcuts)
  if (saveTimer) window.clearTimeout(saveTimer)
  editor?.dispose()
  editor = null
})

function handleGlobalShortcuts(event: KeyboardEvent) {
  const isMod = event.ctrlKey || event.metaKey
  if (!isMod || event.shiftKey || event.altKey) return

  if (event.code === 'Digit1') {
    event.preventDefault()
    mode.value = 'edit'
  } else if (event.code === 'Digit2') {
    event.preventDefault()
    mode.value = 'preview'
  } else if (event.code === 'Digit3') {
    event.preventDefault()
    if (canDiff.value) mode.value = 'diff'
    else message.warning('请先保存一个版本后再对比')
  }
}

function registerMarkdownExtras(m: typeof monaco) {
  if (markdownExtrasRegistered) return
  markdownExtrasRegistered = true

  m.languages.setLanguageConfiguration('markdown', {
    autoClosingPairs: [
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '{', close: '}' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: '`', close: '`' },
      { open: '*', close: '*' },
      { open: '_', close: '_' },
    ],
    surroundingPairs: [
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '`', close: '`' },
      { open: '*', close: '*' },
      { open: '_', close: '_' },
    ],
  })

  m.languages.registerCompletionItemProvider('markdown', {
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position)
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      }

      const snippets = [
        { label: 'h1', insertText: '# ${1:标题}', documentation: '一级标题' },
        { label: 'h2', insertText: '## ${1:标题}', documentation: '二级标题' },
        { label: 'h3', insertText: '### ${1:标题}', documentation: '三级标题' },
        { label: 'bold', insertText: '**${1:粗体}**', documentation: '粗体' },
        { label: 'italic', insertText: '*${1:斜体}*', documentation: '斜体' },
        { label: 'code', insertText: '`${1:代码}`', documentation: '行内代码' },
        { label: 'codeblock', insertText: '```${1:language}\n${2:代码}\n```', documentation: '代码块' },
        { label: 'link', insertText: '[${1:文本}](${2:url})', documentation: '链接' },
        { label: 'quote', insertText: '> ${1:引用}', documentation: '引用' },
        { label: 'list', insertText: '- ${1:列表项}', documentation: '无序列表' },
      ]

      return {
        suggestions: snippets.map((s) => ({
          label: s.label,
          kind: m.languages.CompletionItemKind.Snippet,
          insertText: s.insertText,
          insertTextRules: m.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: s.documentation,
          range,
        })),
      }
    },
  })
}

function applyTheme(id: string) {
  const theme = getThemeById(id)
  if (!theme || !editor) return
  monaco.editor.setTheme(theme.monacoTheme)
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

function undo() {
  editor?.trigger('toolbar', 'undo', null)
}

function redo() {
  editor?.trigger('toolbar', 'redo', null)
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
