<template>
  <n-modal
    v-model:show="isModalOpen"
    preset="card"
    title="创建新文档"
    :style="{ width: '500px' }"
    :mask-closable="false"
  >
    <n-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-placement="top"
    >
      <n-form-item label="文档标题" path="title">
        <n-input
          v-model:value="formData.title"
          placeholder="例如：第一章"
          size="large"
          data-testid="doc-title-input"
        />
      </n-form-item>

      <n-form-item label="文档类型" path="type">
        <n-select
          v-model:value="formData.type"
          :options="typeOptions"
          size="large"
        />
      </n-form-item>
    </n-form>

    <template #footer>
      <n-space justify="end">
        <n-button @click="handleClose">取消</n-button>
        <n-button type="primary" @click="handleSubmit" :loading="isSubmitting" data-testid="submit-doc-btn">
          创建文档
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
  (e: 'submit', title: string, type: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const formRef = ref<FormInst | null>(null)
const isSubmitting = ref(false)

const formData = ref({
  title: '',
  type: '章节'
})

const typeOptions = [
  { label: '📄 章节', value: '章节' },
  { label: '📝 笔记', value: '笔记' },
  { label: '📋 大纲', value: '大纲' },
  { label: '📌 设定', value: '设定' },
  { label: '📖 其他', value: '其他' }
]

const rules: FormRules = {
  title: [
    {
      required: true,
      message: '请输入文档标题',
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
  console.log('📋 对话框: 开始提交表单')
  if (!formRef.value) {
    console.error('❌ 对话框: formRef 不存在')
    return
  }
  
  try {
    await formRef.value.validate()
    console.log('✅ 对话框: 表单验证通过', formData.value)
    isSubmitting.value = true
    
    emit('submit', formData.value.title, formData.value.type)
    console.log('✅ 对话框: 已触发 submit 事件')
    
    resetForm()
  } catch (error) {
    console.error('❌ 对话框: 表单验证失败:', error)
  } finally {
    isSubmitting.value = false
  }
}

const handleClose = () => {
  emit('close')
}

const resetForm = () => {
  formData.value = {
    title: '',
    type: '章节'
  }
  formRef.value?.restoreValidation()
}

watch(() => props.isOpen, (newValue) => {
  if (!newValue) {
    resetForm()
  }
})
</script>
