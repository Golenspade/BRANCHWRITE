<template>
  <n-card title="版本历史" class="h-full flex flex-col" :bordered="false">
    <template #header-extra>
      <n-button size="small" type="primary" data-testid="version-panel-create" @click="showCreateVersionDialog = true">
        提交
      </n-button>
    </template>

    <div
      v-if="error"
      class="m-2 rounded bg-red-50 px-3 py-2 text-xs text-red-700"
      data-testid="persistence-operation-error"
    >
      {{ error }}
    </div>
    <div
      v-if="info"
      class="m-2 rounded bg-blue-50 px-3 py-2 text-xs text-blue-700"
      data-testid="persistence-operation-info"
    >
      {{ info }}
    </div>

    <n-scrollbar style="max-height: 100%">
      <n-empty v-if="versions.length === 0" description="还没有版本记录">
        <template #icon><div class="text-4xl">📝</div></template>
      </n-empty>

      <n-list v-else>
        <n-list-item v-for="(version, index) in versions" :key="version.id">
          <n-thing>
            <template #avatar>
              <n-tag :type="index === 0 ? 'primary' : 'default'" size="small">
                {{ index === 0 ? '最新版本' : `v${version.sequence}` }}
              </n-tag>
            </template>
            <template #header>{{ version.message }}</template>
            <template #description>
              <span class="text-xs text-gray-500">{{ formatTimeAgo(version.createdAtMs) }}</span>
            </template>
            <template #action>
              <n-space :size="4">
                <n-button size="tiny" data-testid="version-view-btn" @click="viewVersion(version.id)">
                  查看
                </n-button>
                <n-button size="tiny" data-testid="version-diff-btn" @click="compareVersion(version.id)">
                  对比
                </n-button>
                <n-button
                  size="tiny"
                  type="warning"
                  data-testid="version-restore-btn"
                  @click="requestRestore(version.id, version.message)"
                >
                  恢复
                </n-button>
              </n-space>
            </template>
          </n-thing>
        </n-list-item>
      </n-list>
    </n-scrollbar>

    <n-modal v-model:show="showVersionDetail" preset="card" title="版本详情" :style="{ width: '80vw', height: '80vh' }">
      <n-scrollbar style="max-height: calc(80vh - 120px)">
        <pre class="whitespace-pre-wrap text-sm" data-testid="version-detail">{{ selectedVersion?.content }}</pre>
      </n-scrollbar>
      <template #footer>
        <n-space justify="end">
          <n-button data-testid="version-detail-close" @click="showVersionDetail = false">关闭</n-button>
          <n-button
            v-if="selectedVersion"
            type="warning"
            @click="requestRestore(selectedVersion.id, selectedVersion.message)"
          >
            恢复到此版本
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </n-card>

  <CreateVersionDialog
    v-model:show="showCreateVersionDialog"
    :submit="createVersion"
  />

  <n-modal
    :show="!!pendingRestore"
    :mask-closable="!restoring"
    @update:show="handleRestoreVisibilityChange"
  >
    <n-card :style="{ width: 'min(480px, calc(100vw - 32px))' }" :bordered="false" size="small">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="restore-version-dialog-title"
        data-testid="restore-version-dialog"
      >
        <h2 id="restore-version-dialog-title" class="mb-3 text-lg font-semibold">
          确认恢复版本
        </h2>
        <p class="mb-4 text-sm text-gray-700">
          确定要恢复到版本“{{ pendingRestore?.message }}”吗？恢复前会自动保留当前内容的安全快照。
        </p>
        <n-space justify="end">
          <n-button :disabled="restoring" data-testid="restore-version-cancel" @click="closeRestoreDialog">
            取消
          </n-button>
          <n-button
            type="warning"
            :loading="restoring"
            :disabled="restoring"
            data-testid="restore-version-confirm"
            @click="confirmRestore"
          >
            确认恢复
          </n-button>
        </n-space>
      </section>
    </n-card>
  </n-modal>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useMessage } from 'naive-ui'
import { useAppStore } from '../../stores/app'
import CreateVersionDialog from './CreateVersionDialog.vue'

const app = useAppStore()
const message = useMessage()
const { versions, versionDetails, error, info } = storeToRefs(app)
const showVersionDetail = ref(false)
const showCreateVersionDialog = ref(false)
const selectedVersionId = ref<string | null>(null)
const pendingRestore = ref<{ id: string; message: string; operationId: string } | null>(null)
const restoring = ref(false)
const selectedVersion = computed(() => selectedVersionId.value
  ? versionDetails.value[selectedVersionId.value] ?? null
  : null)

function formatTimeAgo(timestamp: number) {
  const minutes = Math.floor((Date.now() - timestamp) / 60_000)
  if (minutes < 1) return '刚才'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  return hours < 24 ? `${hours}小时前` : `${Math.floor(hours / 24)}天前`
}

async function createVersion(description: string, operationId: string) {
  try {
    await app.createVersion(description, operationId)
    message.success('版本已保存')
  } catch (error) {
    message.error('保存版本失败')
    throw error
  }
}

async function viewVersion(versionId: string) {
  try {
    const detail = await app.loadVersionDetail(versionId)
    if (!detail) return
    selectedVersionId.value = versionId
    showVersionDetail.value = true
  } catch {
    message.error('加载版本详情失败')
  }
}

async function compareVersion(versionId: string) {
  try { await app.selectVersionForDiff(versionId) }
  catch { message.error('加载对比版本失败') }
}

function requestRestore(versionId: string, versionMessage: string) {
  pendingRestore.value = {
    id: versionId,
    message: versionMessage,
    operationId: crypto.randomUUID(),
  }
}

function handleRestoreVisibilityChange(show: boolean) {
  if (!show) closeRestoreDialog()
}

function closeRestoreDialog() {
  if (restoring.value) return
  pendingRestore.value = null
}

async function confirmRestore() {
  if (restoring.value || !pendingRestore.value) return
  const { id: versionId, operationId } = pendingRestore.value
  restoring.value = true
  try {
    const result = await app.restoreVersion(versionId, operationId)
    showVersionDetail.value = false
    pendingRestore.value = null
    if (result.alreadyCurrent) message.info('当前内容已经是此版本')
    else message.success('版本已恢复，并已保留恢复前安全快照')
  } catch {
    message.error('恢复版本失败')
  } finally {
    restoring.value = false
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
</style>
