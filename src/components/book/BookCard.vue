<template>
  <n-card
    hoverable
    class="book-card"
    @click="handleSelect"
  >
    <template #header>
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <h3 class="text-xl font-bold text-gray-900 mb-2">
            {{ book.name }}
          </h3>
          <n-space :size="8">
            <n-tag size="small" type="info">
              {{ book.author || '未知作者' }}
            </n-tag>
            <n-tag size="small" type="primary">
              {{ book.genre }}
            </n-tag>
          </n-space>
        </div>
        <n-popconfirm
          @positive-click="handleDelete"
          positive-text="删除"
          negative-text="取消"
        >
          <template #trigger>
            <n-button
              text
              type="error"
              size="small"
              @click.stop
            >
              <template #icon>
                <n-icon>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                  </svg>
                </n-icon>
              </template>
            </n-button>
          </template>
          确定要删除这本书吗？此操作不可撤销。
        </n-popconfirm>
      </div>
    </template>

    <div class="mb-4">
      <p v-if="book.description" class="text-gray-600 text-sm leading-relaxed line-clamp-3">
        {{ book.description }}
      </p>
      <p v-else class="text-gray-400 text-sm italic">
        暂无描述
      </p>
    </div>

    <template #footer>
      <n-space justify="space-between" class="text-xs text-gray-400">
        <span>创建于 {{ formatDate(book.created_at) }}</span>
        <span>修改于 {{ formatDate(book.last_modified) }}</span>
      </n-space>
    </template>
  </n-card>
</template>

<script setup lang="ts">
import type { BookConfig } from '../../types/index'

interface Props {
  book: BookConfig
}

interface Emits {
  (e: 'select'): void
  (e: 'delete'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-CN')
}

const handleSelect = () => {
  emit('select')
}

const handleDelete = () => {
  emit('delete')
}
</script>

<style scoped>
.book-card {
  cursor: pointer;
  transition: all 0.3s ease;
}

.book-card:hover {
  transform: translateY(-4px);
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
