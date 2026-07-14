<template>
  <div class="diff-pane h-full flex flex-col min-h-0">
    <div class="flex items-center justify-between px-3 py-2 border-b bg-gray-50 text-sm">
      <span class="text-gray-600">
        对比：
        <strong>{{ compareLabel }}</strong>
        → 当前内容
      </span>
      <n-space :size="8">
        <n-tag size="small" type="error">−{{ removedCount }}</n-tag>
        <n-tag size="small" type="success">+{{ addedCount }}</n-tag>
        <n-tag size="small">{{ unchangedCount }} 未变</n-tag>
      </n-space>
    </div>

    <n-scrollbar class="flex-1">
      <div class="diff-lines font-mono text-sm">
        <div
          v-for="(change, index) in changes"
          :key="index"
          class="diff-line flex"
          :class="lineClass(change.type)"
        >
          <span class="line-num w-12 shrink-0 text-right pr-2 select-none opacity-60">
            {{ change.lineNumber ?? '' }}
          </span>
          <span class="marker w-6 shrink-0 text-center select-none">
            {{ marker(change.type) }}
          </span>
          <span class="flex-1 whitespace-pre-wrap break-all pr-3">{{ change.value || ' ' }}</span>
        </div>
        <div v-if="changes.length === 0" class="p-8 text-center text-gray-400">
          暂无可对比内容，请先提交一个版本后再进入对比模式
        </div>
      </div>
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { DiffEngine } from '../../models/DiffEngine'
import type { DiffChange } from '../../types/index'

const props = defineProps<{
  oldText: string
  newText: string
  compareLabel?: string
}>()

const engine = new DiffEngine()

const result = computed(() => engine.diff(props.oldText, props.newText))
const changes = computed(() => result.value.changes)

const addedCount = computed(() => changes.value.filter((c) => c.type === 'added').length)
const removedCount = computed(() => changes.value.filter((c) => c.type === 'removed').length)
const unchangedCount = computed(() => changes.value.filter((c) => c.type === 'unchanged').length)

const compareLabel = computed(() => props.compareLabel || '历史版本')

function marker(type: DiffChange['type']) {
  if (type === 'added') return '+'
  if (type === 'removed') return '-'
  return ' '
}

function lineClass(type: DiffChange['type']) {
  if (type === 'added') return 'is-added'
  if (type === 'removed') return 'is-removed'
  return 'is-unchanged'
}
</script>

<style scoped>
.diff-line {
  min-height: 1.6em;
  line-height: 1.6;
  border-left: 3px solid transparent;
}

.diff-line.is-added {
  background: #e6ffed;
  border-left-color: #22c55e;
}

.diff-line.is-removed {
  background: #ffeef0;
  border-left-color: #ef4444;
}

.diff-line.is-unchanged {
  background: transparent;
}
</style>
