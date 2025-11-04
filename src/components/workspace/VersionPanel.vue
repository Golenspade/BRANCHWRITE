<template>
  <n-card title="版本历史" class="h-full flex flex-col" :bordered="false">
    <template #header-extra>
      <n-space :size="8">
        <n-button size="small" type="primary" @click="createCommit">
          <template #icon>
            <n-icon>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
              </svg>
            </n-icon>
          </template>
          提交
        </n-button>
      </n-space>
    </template>

    <n-scrollbar style="max-height: 100%">
      <n-empty v-if="commits.length === 0" description="还没有版本记录">
        <template #icon>
          <div class="text-4xl">📝</div>
        </template>
      </n-empty>

      <n-list v-else>
        <n-list-item v-for="(commit, index) in commits" :key="commit.id">
          <n-thing>
            <template #avatar>
              <n-tag :type="index === 0 ? 'primary' : 'default'" size="small">
                {{ index === 0 ? '当前' : `v${commits.length - index}` }}
              </n-tag>
            </template>
            <template #header>
              {{ commit.message || '无标题提交' }}
            </template>
            <template #description>
              <n-space :size="8">
                <span class="text-xs text-gray-500">{{ formatTimeAgo(commit.timestamp) }}</span>
                <n-tag v-if="commit.isAutoCommit" size="tiny" type="success">自动</n-tag>
              </n-space>
            </template>
            <template #action>
              <n-space :size="4">
                <n-button size="tiny" @click="handleViewVersion(commit)">查看</n-button>
                <n-button v-if="index !== 0" size="tiny" type="warning" @click="handleRevertToVersion(commit)">
                  回滚
                </n-button>
              </n-space>
            </template>
          </n-thing>
        </n-list-item>
      </n-list>
    </n-scrollbar>

    <!-- 版本详情弹窗 -->
    <n-modal
      v-model:show="showVersionDetail"
      preset="card"
      title="版本详情"
      :style="{ width: '80vw', height: '80vh' }"
    >
      <n-scrollbar style="max-height: calc(80vh - 120px)">
        <pre class="whitespace-pre-wrap text-sm">{{ selectedVersionContent }}</pre>
      </n-scrollbar>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showVersionDetail = false">关闭</n-button>
          <n-button
            v-if="selectedCommit && commits[0]?.id !== selectedCommit.id"
            type="warning"
            @click="confirmRevertToVersion(selectedCommit)"
          >
            回滚到此版本
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </n-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../../stores/app'
import type { CommitInfo } from '../../types/index'

interface Emits {
  (e: 'revert', commitId: string, content: string): void
}

const emit = defineEmits<Emits>()

const app = useAppStore()
const { commits } = storeToRefs(app)

const showVersionDetail = ref(false)
const selectedCommit = ref<CommitInfo | null>(null)
const selectedVersionContent = ref('')

const formatTimeAgo = (timestamp: number) => {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return '刚才'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  return `${days}天前`
}

function createCommit() {
  const msg = prompt('请输入版本描述：')
  if (msg && msg.trim()) {
    app.createCommit(msg.trim())
  }
}

const handleViewVersion = (commit: CommitInfo) => {
  selectedCommit.value = commit
  const diff = app.getCommitDiff(commit.id)
  selectedVersionContent.value = diff?.content || '内容不可用'
  showVersionDetail.value = true
}

const handleRevertToVersion = (commit: CommitInfo) => {
  if (window.confirm(`确定要回滚到版本"${commit.message}"吗？`)) {
    const diff = app.getCommitDiff(commit.id)
    const content = diff?.content || ''
    emit('revert', commit.id, content)
  }
}

const confirmRevertToVersion = (commit: CommitInfo) => {
  showVersionDetail.value = false
  handleRevertToVersion(commit)
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
</style>
