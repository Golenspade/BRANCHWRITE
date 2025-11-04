<template>
  <n-card title="时间线" class="h-full flex flex-col" :bordered="false">
    <template #header-extra>
      <n-space :size="8">
        <n-button size="small" @click="refreshTimeline">
          <template #icon>
            <n-icon>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2"/>
              </svg>
            </n-icon>
          </template>
        </n-button>
        <n-button size="small" @click="zoomIn">
          <template #icon>
            <n-icon>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/>
              </svg>
            </n-icon>
          </template>
        </n-button>
        <n-button size="small" @click="zoomOut">
          <template #icon>
            <n-icon>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35M8 11h6"/>
              </svg>
            </n-icon>
          </template>
        </n-button>
      </n-space>
    </template>

    <div class="flex-1 relative overflow-hidden bg-gray-50 rounded">
      <svg
        ref="svgRef"
        class="w-full h-full"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @wheel="handleWheel"
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
          </marker>
        </defs>

        <g :transform="`translate(${viewState.offsetX}, ${viewState.offsetY}) scale(${viewState.zoom})`">
          <!-- 网格 -->
          <g v-if="timelineData.layout.showGrid" opacity="0.1">
            <line
              v-for="i in 20"
              :key="`grid-h-${i}`"
              :x1="0"
              :y1="i * 50"
              :x2="2000"
              :y2="i * 50"
              stroke="#94a3b8"
              stroke-width="1"
            />
            <line
              v-for="i in 40"
              :key="`grid-v-${i}`"
              :x1="i * 50"
              :y1="0"
              :x2="i * 50"
              :y2="1000"
              stroke="#94a3b8"
              stroke-width="1"
            />
          </g>

          <!-- 连接线 -->
          <g>
            <line
              v-for="conn in timelineData.connections"
              :key="conn.id"
              :x1="getNodeById(conn.fromNodeId)?.x || 0"
              :y1="(getNodeById(conn.fromNodeId)?.y || 0) + 50"
              :x2="getNodeById(conn.toNodeId)?.x || 0"
              :y2="(getNodeById(conn.toNodeId)?.y || 0) + 50"
              :stroke="conn.color"
              stroke-width="2"
              marker-end="url(#arrowhead)"
            />
          </g>

          <!-- 节点 -->
          <g>
            <g
              v-for="node in timelineData.nodes"
              :key="node.id"
              :transform="`translate(${node.x}, ${node.y + 50})`"
              @click="handleNodeClick(node)"
              class="cursor-pointer"
            >
              <!-- 节点圆圈 -->
              <circle
                :r="timelineData.layout.nodeRadius"
                :fill="node.branchColor"
                :stroke="selectedNodeId === node.id ? '#000' : '#fff'"
                :stroke-width="selectedNodeId === node.id ? 3 : 2"
                class="transition-all"
              />
              
              <!-- 里程碑标记 -->
              <circle
                v-if="node.isMilestone"
                :r="timelineData.layout.nodeRadius + 4"
                fill="none"
                stroke="#fbbf24"
                stroke-width="2"
              />

              <!-- 节点信息 -->
              <text
                v-if="viewState.showCommitMessages"
                :x="timelineData.layout.nodeRadius + 8"
                y="5"
                class="text-xs fill-gray-700"
                font-size="12"
              >
                {{ truncateMessage(node.message) }}
              </text>

              <!-- 时间戳 -->
              <text
                v-if="timelineData.layout.showTimestamps"
                :x="timelineData.layout.nodeRadius + 8"
                y="20"
                class="text-xs fill-gray-400"
                font-size="10"
              >
                {{ formatTime(node.timestamp) }}
              </text>
            </g>
          </g>

          <!-- 分支标签 -->
          <g v-if="viewState.showBranchLabels">
            <g
              v-for="branch in timelineData.branches"
              :key="branch.id"
              :transform="`translate(0, ${getBranchY(branch.id)})`"
            >
              <rect
                x="10"
                y="35"
                width="80"
                height="24"
                :fill="branch.color"
                rx="4"
                opacity="0.9"
              />
              <text
                x="50"
                y="52"
                text-anchor="middle"
                class="fill-white font-semibold"
                font-size="12"
              >
                {{ branch.name }}
              </text>
            </g>
          </g>
        </g>
      </svg>

      <!-- 统计信息 -->
      <div class="absolute bottom-2 left-2 bg-white/90 backdrop-blur px-3 py-2 rounded shadow text-xs">
        <div class="space-y-1">
          <div><strong>节点:</strong> {{ stats.totalNodes }}</div>
          <div><strong>分支:</strong> {{ stats.activeBranches }}</div>
          <div><strong>时间跨度:</strong> {{ formatTimeSpan(timelineData.metadata.timeSpan) }}</div>
        </div>
      </div>

      <!-- 缩放控制 -->
      <div class="absolute bottom-2 right-2 text-xs text-gray-500 bg-white/90 backdrop-blur px-2 py-1 rounded">
        {{ Math.round(viewState.zoom * 100) }}%
      </div>
    </div>
  </n-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../../stores/app'
import { TimelineManager } from '../../models/TimelineManager'
import type { TimelineNode, TimelineViewState } from '../../types/timeline'

const app = useAppStore()
const { commits } = storeToRefs(app)

const timelineManager = new TimelineManager()
const svgRef = ref<SVGSVGElement | null>(null)
const selectedNodeId = ref<string | null>(null)

const viewState = ref<TimelineViewState>({
  zoom: 1,
  offsetX: 50,
  offsetY: 50,
  selectedNodeIds: [],
  showBranchLabels: true,
  showCommitMessages: true,
  filterBranches: [],
})

const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })

const timelineData = computed(() => {
  return timelineManager.getTimelineData()
})

const stats = computed(() => {
  return timelineManager.getStats()
})

const refreshTimeline = () => {
  timelineManager.buildFromCommits(commits.value)
}

const getNodeById = (nodeId: string): TimelineNode | undefined => {
  return timelineData.value.nodes.find(n => n.id === nodeId)
}

const getBranchY = (branchId: string): number => {
  const branchIndex = timelineData.value.branches.findIndex(b => b.id === branchId)
  return branchIndex * timelineData.value.layout.branchSpacing
}

const truncateMessage = (message: string, maxLength: number = 30): string => {
  return message.length > maxLength ? message.substring(0, maxLength) + '...' : message
}

const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatTimeSpan = (ms: number): string => {
  const days = Math.floor(ms / (24 * 60 * 60 * 1000))
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
  if (days > 0) return `${days}天 ${hours}小时`
  if (hours > 0) return `${hours}小时`
  return '不到1小时'
}

const handleNodeClick = (node: TimelineNode) => {
  selectedNodeId.value = node.id
  console.log('Node clicked:', node)
}

const zoomIn = () => {
  viewState.value.zoom = Math.min(viewState.value.zoom * 1.2, 3)
}

const zoomOut = () => {
  viewState.value.zoom = Math.max(viewState.value.zoom / 1.2, 0.3)
}

const handleMouseDown = (e: MouseEvent) => {
  isDragging.value = true
  dragStart.value = { x: e.clientX - viewState.value.offsetX, y: e.clientY - viewState.value.offsetY }
}

const handleMouseMove = (e: MouseEvent) => {
  if (isDragging.value) {
    viewState.value.offsetX = e.clientX - dragStart.value.x
    viewState.value.offsetY = e.clientY - dragStart.value.y
  }
}

const handleMouseUp = () => {
  isDragging.value = false
}

const handleWheel = (e: WheelEvent) => {
  e.preventDefault()
  const delta = e.deltaY > 0 ? 0.9 : 1.1
  viewState.value.zoom = Math.max(0.3, Math.min(3, viewState.value.zoom * delta))
}

watch(commits, () => {
  refreshTimeline()
}, { immediate: true })

onMounted(() => {
  refreshTimeline()
})
</script>

<style scoped>
:deep(.n-card__content) {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
}

svg {
  user-select: none;
}
</style>
