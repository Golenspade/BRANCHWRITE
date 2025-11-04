<template>
  <n-card title="文档列表" class="h-full flex flex-col" :bordered="false">
    <template #header-extra>
      <n-button size="small" type="primary" @click="handleShowCreateDialog">
        <template #icon>
          <n-icon>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 4v16m8-8H4"/>
            </svg>
          </n-icon>
        </template>
        新建
      </n-button>
    </template>

    <n-scrollbar style="max-height: 100%">
      <n-empty v-if="documents.length === 0" description="还没有文档，点击上方按钮创建">
        <template #icon>
          <div class="text-4xl">📝</div>
        </template>
      </n-empty>

      <div v-else class="flex flex-col gap-2 p-2">
        <n-button
          v-for="doc in documents"
          :key="doc.id"
          :type="currentDocumentConfig?.id === doc.id ? 'primary' : 'default'"
          :secondary="currentDocumentConfig?.id !== doc.id"
          size="large"
          @click="handleSelectDocument(doc)"
          class="doc-item-button"
        >
          <template #icon>
            <n-icon size="20">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
              </svg>
            </n-icon>
          </template>
          <div class="flex-1 flex items-center justify-between">
            <div class="text-left">
              <div class="font-medium">{{ doc.title }}</div>
              <div class="text-xs opacity-70">{{ doc.type }}</div>
            </div>
            <n-popconfirm @positive-click="handleDeleteDocument(doc.id)">
              <template #trigger>
                <n-button text type="error" size="small" @click.stop>
                  <template #icon>
                    <n-icon>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                      </svg>
                    </n-icon>
                  </template>
                </n-button>
              </template>
              确定要删除这个文档吗？
            </n-popconfirm>
          </div>
        </n-button>
      </div>
    </n-scrollbar>

    <CreateDocumentDialog
      :is-open="showCreateDialog"
      @close="showCreateDialog = false"
      @submit="handleCreateDocument"
    />
  </n-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../../stores/app'
import CreateDocumentDialog from './CreateDocumentDialog.vue'

const app = useAppStore()
const { documents, currentDocumentConfig, currentBook } = storeToRefs(app)

const showCreateDialog = ref(false)

const handleShowCreateDialog = () => {
  console.log('🔘 点击新建按钮')
  console.log('📚 当前书籍:', currentBook.value?.config.name)
  console.log('📄 当前文档数量:', documents.value.length)
  showCreateDialog.value = true
}

const handleSelectDocument = (doc: any) => {
  console.log('📄 选择文档:', doc.title)
  app.selectDocument(doc)
}

const handleDeleteDocument = async (docId: string) => {
  console.log('🗑️  删除文档:', docId)
  const bookId = currentBook.value?.config.id
  if (!bookId) {
    console.error('❌ 没有书籍ID')
    return
  }
  await app.deleteDocument(bookId, docId)
}

const handleCreateDocument = async (title: string, type: string) => {
  console.log('📝 开始创建文档:', { title, type })
  const bookId = currentBook.value?.config.id
  console.log('📚 当前书籍ID:', bookId)
  if (!bookId) {
    console.error('❌ 没有选择书籍')
    return
  }
  try {
    const result = await app.createDocument(bookId, title, type)
    console.log('✅ 文档创建成功:', result)
    console.log('📄 更新后的文档列表:', documents.value)
    showCreateDialog.value = false
  } catch (error) {
    console.error('❌ 创建文档失败:', error)
  }
}
</script>

<style scoped>
:deep(.n-card__content) {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
}

.doc-item-button {
  width: 100%;
  cursor: pointer;
  user-select: none;
}

.doc-item-button :deep(.n-button__content) {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
