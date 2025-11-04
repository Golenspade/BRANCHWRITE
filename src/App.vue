<template>
  <n-message-provider>
    <router-view />
  </n-message-provider>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAppStore } from './stores/app'
import { NMessageProvider } from 'naive-ui'

// 响应式状态
const isReady = ref(false)
const showTestRunner = ref(false)
const showExportTest = ref(false)

// 使用store
const appStore = useAppStore()
const { showBookSelector, currentBook, selectBook } = appStore

console.log('🚀 App: 组件开始渲染')

// 环境检测
const isTauriEnvironment = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window
}

// 初始化应用
const initializeApp = async () => {
  try {
    console.log('⏳ App: 模拟初始化过程...')
    
    // 模拟初始化过程
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    console.log('✅ App: 初始化完成')
    isReady.value = true
  } catch (err) {
    console.error('❌ App: 初始化失败:', err)
    isReady.value = true // 即使失败也设为就绪，避免无限加载
  }
}

// 处理书本选择
const handleBookSelected = (bookId: string) => {
  console.log('🎯 App: 用户选择了书本 ->', bookId)
  selectBook(bookId)
}

// 键盘快捷键处理
const handleKeyDown = async (event: KeyboardEvent) => {
  const isMod = event.ctrlKey || event.metaKey // 支持 Ctrl 或 Cmd
  
  // F12 或 Cmd/Ctrl+Shift+I 打开开发者工具
  if (event.code === 'F12' || (isMod && event.shiftKey && event.code === 'KeyI')) {
    event.preventDefault()
    try {
      // 检查是否在 Tauri 环境
      if (typeof window !== 'undefined' && '__TAURI__' in window) {
        const { Window } = await import('@tauri-apps/api/window')
        const appWindow = Window.getCurrent()
        await appWindow.toggleDevtools()
        console.log('🔧 开发者工具已切换')
      }
    } catch (error) {
      console.error('无法打开开发者工具:', error)
    }
  }
  
  // Mod(CTRL/CMD)+Shift+T 打开/关闭测试界面
  if (isMod && event.shiftKey && event.code === 'KeyT') {
    event.preventDefault()
    showTestRunner.value = !showTestRunner.value
    console.log('🧪 App: 切换测试界面显示状态')
  }
  
  // Mod(CTRL/CMD)+Shift+E 打开/关闭导出测试界面
  if (isMod && event.shiftKey && event.code === 'KeyE') {
    event.preventDefault()
    showExportTest.value = !showExportTest.value
    console.log('📤 App: 切换导出测试界面显示状态')
  }
  
  // 备用快捷键：F8 打开/关闭测试界面
  if (event.code === 'F8') {
    event.preventDefault()
    showTestRunner.value = !showTestRunner.value
    console.log('🧪 App: F8 切换测试界面显示状态')
  }
  
  // 备用快捷键：F9 打开/关闭导出测试界面
  if (event.code === 'F9') {
    event.preventDefault()
    showExportTest.value = !showExportTest.value
    console.log('📤 App: F9 切换导出测试界面显示状态')
  }
}

// 处理URL参数
const handleUrlParams = () => {
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get('export') === '1') {
      showExportTest.value = true
      console.log('📤 App: 通过 URL 参数自动打开导出测试界面')
    }
  } catch (e) {
    // ignore
  }
}

onMounted(async () => {
  console.log('🚀 App: 开始初始化应用')
  
  // 初始化存储（自动选择 SQLite 或 localStorage）
  try {
    const { initStorage } = await import('./services/storageAdapter')
    await initStorage()
  } catch (error) {
    console.error('❌ 存储初始化失败:', error)
  }
  
  // 初始化应用
  initializeApp()
  
  // 添加键盘监听器
  window.addEventListener('keydown', handleKeyDown)
  
  // 处理URL参数
  handleUrlParams()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

.font-system {
  font-family: system-ui, -apple-system, sans-serif;
}
</style>