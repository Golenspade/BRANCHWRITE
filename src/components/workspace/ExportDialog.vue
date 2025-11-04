<template>
  <n-modal v-model:show="visible" preset="dialog" title="导出文档">
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">导出范围</label>
        <n-radio-group v-model:value="exportScope">
          <n-space vertical>
            <n-radio value="current">当前文档</n-radio>
            <n-radio value="all">整本书（所有文档）</n-radio>
          </n-space>
        </n-radio-group>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">导出格式</label>
        <n-checkbox-group v-model:value="exportFormats">
          <n-space vertical>
            <n-checkbox value="markdown" label="Markdown (.md)" />
            <n-checkbox value="text" label="纯文本 (.txt)" />
          </n-space>
        </n-checkbox-group>
        <p class="text-xs text-gray-500 mt-1">
          可以同时选择多种格式
        </p>
      </div>

      <div v-if="exportScope === 'all'">
        <label class="block text-sm font-medium text-gray-700 mb-2">合并选项</label>
        <n-checkbox v-model:checked="mergeDocuments">
          合并为单个文件
        </n-checkbox>
        <p class="text-xs text-gray-500 mt-1">
          {{ mergeDocuments ? '所有文档将合并为一个文件' : '每个文档将导出为单独的文件' }}
        </p>
      </div>
    </div>

    <template #action>
      <n-space justify="end">
        <n-button @click="visible = false">取消</n-button>
        <n-button type="primary" @click="handleExport" :loading="exporting">
          导出
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../../stores/app'

const visible = defineModel<boolean>('show', { default: false })

const app = useAppStore()
const { currentBook, currentDocumentConfig, documents } = storeToRefs(app)

const exportScope = ref<'current' | 'all'>('current')
const exportFormats = ref<string[]>(['markdown'])
const mergeDocuments = ref(true)
const exporting = ref(false)

const handleExport = async () => {
  if (exportFormats.value.length === 0) {
    alert('⚠️ 请至少选择一种导出格式')
    return
  }
  
  exporting.value = true
  
  try {
    const { FileSystemService } = await import('../../services/fileSystemService')
    
    // 遍历所有选中的格式
    for (const format of exportFormats.value) {
      const ext = format === 'markdown' ? 'md' : 'txt'
      
      if (exportScope.value === 'current') {
        // 导出当前文档
        const docConfig = currentDocumentConfig.value
        if (!docConfig) {
          alert('⚠️ 请先选择要导出的文档')
          return
        }
        
        const content = app.currentDocument
        const filename = `${docConfig.title}.${ext}`
        await FileSystemService.exportDocument(filename, content, format)
        
        console.log('✅ 文档导出成功:', filename)
      } else {
        // 导出整本书
        const bookName = currentBook.value?.config.name || '未命名书籍'
        
        if (mergeDocuments.value) {
          // 合并所有文档
          let mergedContent = `# ${bookName}\n\n`
          
          for (const doc of documents.value) {
            const content = await app.loadDocumentContent(doc.book_id, doc.id)
            mergedContent += `## ${doc.title}\n\n${content}\n\n---\n\n`
          }
          
          const filename = `${bookName}.${ext}`
          await FileSystemService.exportDocument(filename, mergedContent, format)
          console.log('✅ 合并导出成功:', filename)
        } else {
          // 分别导出每个文档
          for (const doc of documents.value) {
            const content = await app.loadDocumentContent(doc.book_id, doc.id)
            const filename = `${bookName}_${doc.title}.${ext}`
            await FileSystemService.exportDocument(filename, content, format)
          }
          console.log('✅ 批量导出成功，共', documents.value.length, '个文档')
        }
      }
    }
    
    const formatNames = exportFormats.value.map(f => f === 'markdown' ? 'Markdown' : '纯文本').join('、')
    console.log(`✅ 所有格式导出完成: ${formatNames}`)
    
    visible.value = false
  } catch (error) {
    console.error('❌ 导出失败:', error)
    alert('❌ 导出失败，请查看控制台了解详情')
  } finally {
    exporting.value = false
  }
}
</script>
