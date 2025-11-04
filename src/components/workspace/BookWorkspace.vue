<template>
  <div class="h-screen flex flex-col bg-gray-50">
    <!-- 顶部工具栏 -->
    <header class="flex items-center justify-between px-6 py-3 bg-white border-b shadow-sm">
      <div class="flex items-center gap-4">
        <n-button text @click="goBack">
          <template #icon>
            <n-icon>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </n-icon>
          </template>
        </n-button>
        <div>
          <h1 class="text-xl font-bold text-gray-900">{{ currentBook?.config.name || '工作区' }}</h1>
          <p class="text-xs text-gray-500">{{ currentDocumentConfig?.title || '未选择文档' }}</p>
        </div>
      </div>
      <n-space>
        <n-button @click="handleSave" type="primary">
          <template #icon>
            <n-icon>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                <path d="M17 21v-8H7v8M7 3v5h8"/>
              </svg>
            </n-icon>
          </template>
          保存
        </n-button>
        <n-button @click="handleExport">
          <template #icon>
            <n-icon>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
            </n-icon>
          </template>
          导出
        </n-button>
        <n-button @click="showStats" title="统计信息" secondary>
          <template #icon>
            <n-icon>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </n-icon>
          </template>
        </n-button>
      </n-space>
    </header>

    <!-- 主体区域 -->
    <main class="flex-1 flex gap-4 p-4 min-h-0">
      <!-- 左侧：文档列表 -->
      <aside class="w-64 flex-shrink-0">
        <DocumentList />
      </aside>

      <!-- 中间：编辑器 -->
      <section class="flex-1 min-w-0">
        <EditorPane />
      </section>

      <!-- 右侧：版本和时间线 -->
      <aside class="w-80 flex-shrink-0 flex flex-col gap-4">
        <div class="flex-1 min-h-0">
          <VersionPanel @revert="onRevert" />
        </div>
        <div class="h-64">
          <TimelinePanel />
        </div>
      </aside>
    </main>

    <!-- 导出对话框 -->
    <ExportDialog v-model:show="showExportDialog" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useAppStore } from '../../stores/app'
import EditorPane from './EditorPane.vue'
import VersionPanel from './VersionPanel.vue'
import TimelinePanel from './TimelinePanel.vue'
import DocumentList from './DocumentList.vue'
import ExportDialog from './ExportDialog.vue'

const router = useRouter()
const app = useAppStore()
const { currentBook, currentDocumentConfig } = storeToRefs(app)

const showExportDialog = ref(false)

const goBack = () => {
  router.push('/')
}

const handleSave = async () => {
  const bookId = currentBook.value?.config.id
  const docId = currentDocumentConfig.value?.id
  if (!bookId || !docId) return
  await app.saveDocumentContent(bookId, docId, app.currentDocument)
}

const onRevert = async (_commitId: string, content: string) => {
  const bookId = currentBook.value?.config.id
  const docId = currentDocumentConfig.value?.id
  if (!bookId || !docId) return
  app.setCurrentDocument(content)
  await app.saveDocumentContent(bookId, docId, content)
}

const handleExport = () => {
  showExportDialog.value = true
}

const showStats = () => {
  const bookId = currentBook.value?.config.id
  if (!bookId) return
  
  const docs = app.documents.length
  const totalWords = app.documents.reduce((sum, doc) => sum + (doc.word_count || 0), 0)
  const totalChars = app.documents.reduce((sum, doc) => sum + (doc.character_count || 0), 0)
  const commits = app.commits.length
  
  const stats = `
📊 统计信息

📚 书籍: ${currentBook.value?.config.name}
📄 文档数: ${docs}
✍️  总字数: ${totalWords.toLocaleString()}
🔤 总字符: ${totalChars.toLocaleString()}
📝 版本数: ${commits}

💡 提示: 按 F12 或 Cmd+Option+I 打开开发者工具
  `.trim()
  
  alert(stats)
}
</script>
