<template>
  <button
    :class="buttonClasses"
    :disabled="disabled"
    @click="handleClick"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  fullWidth?: boolean
}

interface Emits {
  (e: 'click', event: MouseEvent): void
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  fullWidth: false
})

const emit = defineEmits<Emits>()

const buttonClasses = computed(() => {
  const baseClasses = [
    'inline-flex',
    'items-center',
    'justify-center',
    'font-medium',
    'rounded-md',
    'transition-colors',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-offset-2',
    'disabled:opacity-50',
    'disabled:cursor-not-allowed'
  ]

  // 尺寸
  const sizeClasses = {
    sm: ['px-3', 'py-1.5', 'text-sm'],
    md: ['px-4', 'py-2', 'text-sm'],
    lg: ['px-6', 'py-3', 'text-base']
  }

  // 变体
  const variantClasses = {
    primary: [
      'bg-purple-500',
      'text-white',
      'hover:bg-purple-600',
      'focus:ring-purple-500'
    ],
    secondary: [
      'bg-gray-500',
      'text-white',
      'hover:bg-gray-600',
      'focus:ring-gray-500'
    ],
    danger: [
      'bg-red-500',
      'text-white',
      'hover:bg-red-600',
      'focus:ring-red-500'
    ],
    outline: [
      'border',
      'border-gray-300',
      'bg-white',
      'text-gray-700',
      'hover:bg-gray-50',
      'focus:ring-purple-500'
    ]
  }

  const widthClasses = props.fullWidth ? ['w-full'] : []

  return [
    ...baseClasses,
    ...sizeClasses[props.size],
    ...variantClasses[props.variant],
    ...widthClasses
  ].join(' ')
})

const handleClick = (event: MouseEvent) => {
  if (!props.disabled) {
    emit('click', event)
  }
}
</script>