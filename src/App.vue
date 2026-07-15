<template>
  <n-message-provider>
    <div
      v-if="startupState === 'initializing'"
      class="min-h-screen flex items-center justify-center text-gray-600"
      data-testid="persistence-initializing"
    >
      正在初始化持久化存储…
    </div>
    <div
      v-else-if="startupState === 'fatal'"
      class="min-h-screen flex items-center justify-center bg-red-50 p-8"
      data-testid="persistence-fatal-error"
    >
      <div class="max-w-xl rounded-lg border border-red-200 bg-white p-6 text-red-800">
        <h1 class="text-xl font-semibold mb-2">桌面持久化初始化失败</h1>
        <p>{{ persistenceFatalError }}</p>
      </div>
    </div>
    <template v-else>
      <div
        v-if="persistenceMode === 'demo'"
        class="fixed top-2 right-3 z-50 rounded bg-amber-100 px-3 py-1 text-xs text-amber-900 shadow"
        data-testid="persistence-demo-banner"
      >
        Web Demo · 数据仅保存在浏览器 v2 演示空间
      </div>
      <router-view />
    </template>
  </n-message-provider>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { NMessageProvider } from 'naive-ui'
import { initializePersistence, type PersistenceMode } from './persistence/initialization'
import { useAppStore } from './stores/app'

const app = useAppStore()
const startupState = ref<'initializing' | 'fatal' | 'ready'>('initializing')
const persistenceFatalError = ref('')
const persistenceMode = ref<PersistenceMode | null>(null)

onMounted(async () => {
  try {
    const initialized = await initializePersistence()
    app.configurePersistence(initialized.gateway)
    persistenceMode.value = initialized.mode
    startupState.value = 'ready'
  } catch (error) {
    persistenceFatalError.value = error && typeof error === 'object' && 'message' in error
      ? String(error.message)
      : String(error)
    startupState.value = 'fatal'
  }
})
</script>
