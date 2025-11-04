<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-300"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4"
        @click="handleBackdropClick"
      >
        <Transition
          enter-active-class="transition-all duration-300"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition-all duration-300"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="isOpen"
            :class="modalClasses"
            @click.stop
          >
            <!-- 头部 -->
            <div v-if="$slots.header || title" class="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <slot name="header">
                  <h3 class="text-lg font-semibold text-gray-900">{{ title }}</h3>
                </slot>
              </div>
              <button
                v-if="closable"
                @click="handleClose"
                class="text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- 内容 -->
            <div class="p-6">
              <slot />
            </div>

            <!-- 底部 -->
            <div v-if="$slots.footer" class="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <slot name="footer" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'

interface Props {
  isOpen: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closable?: boolean
  closeOnBackdrop?: boolean
}

interface Emits {
  (e: 'close'): void
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  closable: true,
  closeOnBackdrop: true
})

const emit = defineEmits<Emits>()

const modalClasses = computed(() => {
  const baseClasses = [
    'bg-white',
    'rounded-lg',
    'shadow-2xl',
    'max-h-[90vh]',
    'overflow-y-auto'
  ]

  const sizeClasses = {
    sm: ['w-full', 'max-w-md'],
    md: ['w-full', 'max-w-lg'],
    lg: ['w-full', 'max-w-2xl'],
    xl: ['w-full', 'max-w-4xl']
  }

  return [
    ...baseClasses,
    ...sizeClasses[props.size]
  ].join(' ')
})

const handleClose = () => {
  emit('close')
}

const handleBackdropClick = () => {
  if (props.closeOnBackdrop) {
    handleClose()
  }
}

// 阻止body滚动
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})
</script>