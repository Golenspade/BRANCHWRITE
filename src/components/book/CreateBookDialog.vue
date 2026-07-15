<template>
  <n-modal
    v-model:show="isModalOpen"
    preset="card"
    title="创建新书籍"
    :style="{ width: '600px' }"
    :mask-closable="false"
  >
    <n-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-placement="top"
      require-mark-placement="right-hanging"
    >
      <n-form-item label="书籍名称" path="name">
        <n-input
          v-model:value="formData.name"
          placeholder="例如：我的第一本小说"
          size="large"
          data-testid="book-name-input"
        />
      </n-form-item>

      <n-grid :cols="2" :x-gap="16">
        <n-grid-item>
          <n-form-item label="作者" path="author">
            <n-input
              v-model:value="formData.author"
              placeholder="作者姓名"
              size="large"
              data-testid="book-author-input"
            />
          </n-form-item>
        </n-grid-item>
        <n-grid-item>
          <n-form-item label="类型" path="genre">
            <n-select
              v-model:value="formData.genre"
              :options="genreOptions"
              size="large"
            />
          </n-form-item>
        </n-grid-item>
      </n-grid>

      <n-form-item label="描述" path="description">
        <n-input
          v-model:value="formData.description"
          type="textarea"
          placeholder="简要描述这本书的内容、主题或创作目标..."
          :rows="4"
          size="large"
        />
      </n-form-item>
    </n-form>

    <template #footer>
      <n-space justify="end">
        <n-button @click="handleClose">
          取消
        </n-button>
        <n-button type="primary" @click="handleSubmit" :loading="isSubmitting" data-testid="submit-book-btn">
          创建书籍
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { FormInst, FormRules } from 'naive-ui'

interface Props {
  isOpen: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'submit', name: string, description: string, author: string, genre: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const formRef = ref<FormInst | null>(null)
const isSubmitting = ref(false)

const formData = ref({
  name: '',
  description: '',
  author: '',
  genre: '小说'
})

const genreOptions = [
  { label: '📚 小说', value: '小说' },
  { label: '✍️ 散文', value: '散文' },
  { label: '🎭 诗歌', value: '诗歌' },
  { label: '💻 技术文档', value: '技术文档' },
  { label: '🎓 学术论文', value: '学术论文' },
  { label: '📝 其他', value: '其他' }
]

const rules: FormRules = {
  name: [
    {
      required: true,
      message: '请输入书籍名称',
      trigger: 'blur'
    }
  ]
}

const isModalOpen = computed({
  get: () => props.isOpen,
  set: (value) => {
    if (!value) {
      emit('close')
    }
  }
})

const handleSubmit = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    isSubmitting.value = true
    
    emit('submit',
      formData.value.name,
      formData.value.description,
      formData.value.author,
      formData.value.genre
    )
    
    resetForm()
  } catch (error) {
    console.error('表单验证失败:', error)
  } finally {
    isSubmitting.value = false
  }
}

const handleClose = () => {
  emit('close')
}

const resetForm = () => {
  formData.value = {
    name: '',
    description: '',
    author: '',
    genre: '小说'
  }
  formRef.value?.restoreValidation()
}

watch(() => props.isOpen, (newValue) => {
  if (!newValue) {
    resetForm()
  }
})
</script>
