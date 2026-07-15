<template>
  <n-message-provider>
    <div class="min-h-screen bg-gray-50 p-8">
      <div class="max-w-7xl mx-auto">
        <!-- 头部 -->
        <div class="text-center mb-12 pt-8">
          <div class="text-6xl mb-4">📚</div>
          <h1 class="text-4xl font-bold text-gray-900 mb-3">
            BranchWrite
          </h1>
          <p class="text-lg text-gray-600 mb-8">
            专业的写作工具，让创作更简单
          </p>
          
          <n-button
            type="primary"
            size="large"
            data-testid="create-book-btn"
            @click="showCreateDialog = true"
          >
            <template #icon>
              <n-icon>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 4v16m8-8H4"/>
                </svg>
              </n-icon>
            </template>
            创建新书籍
          </n-button>
        </div>

        <!-- 书籍列表 -->
        <n-spin v-if="isLoading" size="large" class="flex justify-center py-20" />
        
        <n-empty
          v-else-if="books.length === 0"
          description="还没有书籍，点击上方按钮创建您的第一本书"
          class="py-20"
        >
          <template #icon>
            <div class="text-6xl">📖</div>
          </template>
        </n-empty>
        
        <n-grid
          v-else
          :x-gap="24"
          :y-gap="24"
          :cols="1"
          :md-cols="2"
          :lg-cols="3"
        >
          <n-grid-item v-for="book in books" :key="book.id">
            <BookCard
              :book="book"
              @select="handleBookSelect(book.id)"
              @delete="handleBookDelete(book.id)"
            />
          </n-grid-item>
        </n-grid>
      </div>

      <!-- 创建书籍对话框 -->
      <CreateBookDialog
        :is-open="showCreateDialog"
        @close="showCreateDialog = false"
        @submit="handleCreateBook"
      />
    </div>
  </n-message-provider>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import BookCard from './book/BookCard.vue'
import CreateBookDialog from './book/CreateBookDialog.vue'

interface Emits {
  (e: 'book-selected', bookId: string): void
}

const emit = defineEmits<Emits>()
import { useRouter } from 'vue-router'
const router = useRouter()

const showCreateDialog = ref(false)

// 使用store
const appStore = useAppStore()
const { books, isLoading } = storeToRefs(appStore)

onMounted(async () => {
  console.log('📚 BookSelector: 组件已挂载，开始加载书籍列表')
  await appStore.loadBooks()
  console.log('📚 BookSelector: 书籍列表加载完成，数量:', books.value.length)
})

const handleCreateBook = async (name: string, description: string, author: string, genre: string) => {
  console.log('📚 BookSelector: 开始创建书籍', { name, description, author, genre })
  try {
    const newId = await appStore.createBook(name, description, author, genre)
    console.log('📚 BookSelector: 书籍创建成功，ID:', newId)
    showCreateDialog.value = false
    // 重新加载书籍列表
    await appStore.loadBooks()
    // 自动选择并进入工作区
    if (newId) {
      await appStore.selectBook(newId)
      emit('book-selected', newId)
      router.push('/workspace')
    }
  } catch (error) {
    console.error('❌ BookSelector: 创建书籍失败:', error)
    // 这里可以添加错误提示
  }
}

const handleBookSelect = async (bookId: string) => {
  console.log('📚 BookSelector: 选择书籍', bookId)
  await appStore.selectBook(bookId)
  emit('book-selected', bookId)
  router.push('/workspace')
}

const handleBookDelete = async (bookId: string) => {
  if (window.confirm('确定要删除这本书吗？此操作不可撤销。')) {
    console.log('🗑️  BookSelector: 删除书籍', bookId)
    await appStore.deleteBook(bookId)
    console.log('✅ BookSelector: 书籍删除成功')
  }
}
</script>

<style scoped>
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>