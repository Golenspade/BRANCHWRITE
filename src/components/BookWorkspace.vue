<template>
  <div class="h-screen flex flex-col">
    <!-- 顶部工具栏 -->
    <div class="h-[60px] bg-white border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0">
      <div class="flex items-center gap-4">
        <button
          @click="setShowBookSelector(true)"
          class="px-2 py-1 bg-transparent border border-gray-300 rounded-md cursor-pointer text-sm hover:bg-gray-50"
        >
          📚 切换书籍
        </button>

        <div v-if="currentBook">
          <h1 class="text-xl font-bold text-gray-900 m-0">
            {{ currentBook.config.name }}
          </h1>
          <p class="text-sm text-gray-500 m-0">
            {{ currentBook.config.author }} • {{ currentBook.config.genre }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <template v-if="currentDocumentConfig && documentManager">
          <button
            @click="handleImportText"
            class="px-2 py-1 bg-blue-500 text-white border-none rounded-md cursor-pointer text-sm hover:bg-blue-600"
          >
            📁 导入
          </button>
          <button
            @click="handleManualSave"
            class="px-2 py-1 bg-green-500 text-white border-none rounded-md cursor-pointer text-sm hover:bg-green-600"
          >
            💾 保存
          </button>
          <button
            @click="showVersionManager = !showVersionManager"
            :class="[
              'px-2 py-1 border border-gray-300 rounded-md cursor-pointer text-sm',
              showVersionManager ? 'bg-blue-50' : 'bg-transparent hover:bg-gray-50'
            ]"
          >
            📝 版本管理
          </button>

          <!-- 暂时隐藏时间线按钮 -->
          <!-- <button
            @click="showTimelineView = true"
            class="px-2 py-1 bg-transparent border border-gray-300 rounded-md cursor-pointer text-sm hover:bg-gray-50"
          >
            📈 时间线
          </button> -->
        </template>

        <!-- 开发者提示 -->
        <div
          v-if="showDevHint"
          class="bg-yellow-100 border border-yellow-400 rounded-md px-2 py-1 text-xs text-yellow-800 flex items-center gap-2 ml-2"
        >
          <span>💡 Ctrl+Shift+E 测试导出</span>
          <button
            @click="showDevHint = false"
            class="bg-none border-none text-yellow-800 cursor-pointer p-0 text-xs hover:bg-yellow-200 rounded px-1"
          >
            ✕
          </button>
        </div>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="flex-1 flex min-h-0">
      <!-- 文档列表侧边栏 -->
      <DocumentList
        :documents="documents"
        :current-document="currentDocumentConfig"
        @select-document="selectDocument"
        @create-document="showCreateDialog = true"
        @delete-document="handleDeleteDocument"
      />

      <!-- 编辑器区域 -->
      <div class="flex-1 flex flex-col min-h-0">
        <div v-if="currentDocumentConfig" class="flex-1 flex flex-col min-h-0">
          <!-- 暂时用占位符替代AdvancedEditor -->
          <div class="flex-1 p-4 bg-white">
            <div class="h-full border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
              <div class="text-center text-gray-500">
                <div class="text-4xl mb-4">📝</div>
                <h3 class="text-lg mb-2">编辑器区域</h3>
                <p class="text-sm mb-4">
                  当前文档: {{ currentDocumentConfig.title }}
                </p>
                <p class="text-xs">
                  AdvancedEditor 组件待迁移<br>
                  内容长度: {{ documentContent.length }} 字符
                </p>
                
                <!-- 简单的文本编辑区域用于测试 -->
                <textarea
                  v-model="documentContent"
                  @input="handleContentChange"
                  class="w-full max-w-2xl h-40 mt-4 p-3 border border-gray-300 rounded-md resize-none text-sm"
                  placeholder="在这里输入文档内容..."
                />
              </div>
            </div>
          </div>
        </div>
        
        <div v-else class="flex-1 flex items-center justify-center text-gray-500">
          <div class="text-center">
            <div class="text-5xl mb-4">📝</div>
            <h3 class="text-xl mb-2">选择或创建文档</h3>
            <p>从左侧选择一个文档开始编辑，或创建新的文档</p>
          </div>
        </div>
      </div>

      <!-- 版本管理侧边栏 -->
      <VersionPanel
        v-if="showVersionManager && currentDocumentConfig"
        @close="showVersionManager = false"
        @revert="handleVersionRevert"
      />
    </div>

    <!-- 对话框 -->
    <CreateDocumentDialog
      :is-open="showCreateDialog"
      @close="showCreateDialog = false"
      @confirm="handleCreateDocument"
    />

    <!-- 版本对比对话框占位符 -->
    <!-- <VersionDiff v-if="showVersionDiff" ... /> -->

    <!-- 时间线视图占位符 -->
    <!-- <TimelineView v-if="showTimelineView" ... /> -->
  </div>

  <!-- 没有书籍的状态 -->
  <div
    v-if="!currentBook"
    class="h-screen flex items-center justify-center text-gray-500"
  >
    <div class="text-center">
      <div class="text-5xl mb-4">📚</div>
      <h3 class="text-xl mb-2">没有书籍</h3>
      <p>请先选择一本书籍开始写作</p>
      <button
        @click="setShowBookSelector(true)"
        class="mt-4 px-4 py-2 bg-blue-500 text-white border-none rounded-md cursor-pointer hover:bg-blue-600"
      >
        选择书籍
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useAppStore } from '../stores/app'
import DocumentList from './workspace/DocumentList.vue'
import CreateDocumentDialog from './workspace/CreateDocumentDialog.vue'
import VersionPanel from './workspace/VersionPanel.vue'

// 使用store
const appStore = useAppStore()
const {
  currentBook,
  documents,
  currentDocumentConfig,
  currentDocument,
  setCurrentDocument,
  loadDocuments,
  createDocument,
  deleteDocument,
  selectDocument,
  loadDocumentContent,
  saveDocumentContent,
  documentManager,
  initializeDocumentManager,
  setShowBookSelector
} = appStore

// 响应式状态
const showCreateDialog = ref(false)
const documentContent = ref('')
const showVersionManager = ref(false)
const showVersionDiff = ref(false)
const showTimelineView = ref(false)
const selectedCommitsForDiff = ref<string[]>([])
const showDevHint = ref(true)

// 加载当前书籍的文档列表
watch(() => currentBook, (newCurrentBook) => {
  if (newCurrentBook) {
    loadDocuments(newCurrentBook.config.id)
  }
}, { immediate: true })

// 加载当前文档内容并初始化 DocumentManager
watch(() => currentDocumentConfig, async (newCurrentDocumentConfig) => {
  if (currentBook && newCurrentDocumentConfig) {
    try {
      const content = await loadDocumentContent(currentBook.config.id, newCurrentDocumentConfig.id)
      documentContent.value = content
      setCurrentDocument(content)

      // 初始化 DocumentManager
      initializeDocumentManager(content, newCurrentDocumentConfig.title)

      // 启动自动提交（每30秒检查一次，50字变化阈值）
      if (documentManager) {
        documentManager.startAutoCommit(0.5, 50) // 30秒间隔，50字阈值
      }
    } catch (error) {
      console.error('Failed to load document content:', error)
    }
  }
}, { immediate: true })

// 清理函数
onUnmounted(() => {
  if (documentManager) {
    documentManager.stopAutoCommit()
  }
})

const handleCreateDocument = async (title: string, docType: string) => {
  if (currentBook) {
    await createDocument(currentBook.config.id, title, docType)
  }
}

const handleDeleteDocument = async (docId: string) => {
  if (currentBook && window.confirm('确定要删除这个文档吗？此操作不可撤销。')) {
    await deleteDocument(currentBook.config.id, docId)
  }
}

const handleContentChange = (event?: Event) => {
  const content = event ? (event.target as HTMLTextAreaElement).value : documentContent.value
  console.log('📝 Content changed, length:', content.length)
  
  documentContent.value = content
  setCurrentDocument(content)

  // 更新 DocumentManager
  if (documentManager) {
    documentManager.updateDocument(content)
    console.log('📋 DocumentManager updated')
  }

  // 自动保存
  if (currentBook && currentDocumentConfig) {
    console.log('💾 Saving document:', currentBook.config.id, currentDocumentConfig.id)
    saveDocumentContent(currentBook.config.id, currentDocumentConfig.id, content)
      .then(() => {
        console.log('✅ Document saved successfully')
      })
      .catch(error => {
        console.error('❌ Failed to save document content:', error)
      })
  } else {
    console.warn('⚠️ Cannot save: missing book or document config')
  }
}

const handleVersionSelect = (commitId: string) => {
  if (documentManager) {
    const success = documentManager.checkoutCommit(commitId)
    if (success) {
      const doc = documentManager.getCurrentDocument()
      const content = doc.getText()
      documentContent.value = content
      setCurrentDocument(content)
    }
  }
}

const handleManualSave = async () => {
  if (currentBook && currentDocumentConfig && documentContent.value) {
    try {
      console.log('🔄 Manual save triggered')
      await saveDocumentContent(currentBook.config.id, currentDocumentConfig.id, documentContent.value)

      // 创建手动提交
      if (documentManager) {
        documentManager.createCommit('手动保存', false)
        console.log('📝 Manual commit created')
      }

      alert('保存成功！')
    } catch (error) {
      console.error('❌ Manual save failed:', error)
      alert('保存失败：' + error)
    }
  }
}

// 处理版本回滚
const handleVersionRevert = (commitId: string, content: string) => {
  documentContent.value = content
  setCurrentDocument(content)
  
  // 更新 DocumentManager
  if (documentManager) {
    documentManager.updateDocument(content)
  }

  // 保存到后端
  if (currentBook && currentDocumentConfig) {
    saveDocumentContent(currentBook.config.id, currentDocumentConfig.id, content)
      .then(() => {
        console.log('✅ Version reverted and saved successfully')
      })
      .catch(error => {
        console.error('❌ Failed to save reverted content:', error)
      })
  }
}

const handleImportText = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.txt,.md,.markdown'
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      // 检查文件类型
      const allowedTypes = ['text/plain', 'text/markdown', 'application/octet-stream']
      const allowedExtensions = ['.txt', '.md', '.markdown']
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))

      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
        alert('不支持的文件类型！请选择文本文件（.txt、.md、.markdown）')
        return
      }

      // 检查文件大小（限制为10MB）
      if (file.size > 10 * 1024 * 1024) {
        alert('文件太大！请选择小于10MB的文件')
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string
          if (content) {
            documentContent.value = content
            setCurrentDocument(content)

            // 更新 DocumentManager
            if (documentManager) {
              documentManager.updateDocument(content)
              documentManager.createCommit(`导入文件: ${file.name}`, false)
            }

            // 保存到后端
            if (currentBook && currentDocumentConfig) {
              saveDocumentContent(currentBook.config.id, currentDocumentConfig.id, content)
                .then(() => {
                  alert('文件导入成功！')
                })
                .catch(error => {
                  console.error('Failed to save imported content:', error)
                  alert('导入失败：' + error)
                })
            }
          }
        } catch (error) {
          console.error('Failed to read file:', error)
          alert('文件读取失败：' + error)
        }
      }

      reader.onerror = () => {
        alert('文件读取失败！')
      }

      reader.readAsText(file, 'UTF-8')
    }
  }
  input.click()
}
</script>