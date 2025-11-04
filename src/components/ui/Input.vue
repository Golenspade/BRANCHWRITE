<template>
  <div class="space-y-1">
    <label
      v-if="label"
      :for="inputId"
      class="block text-sm font-medium text-gray-700"
    >
      {{ label }}
      <span v-if="required" class="text-red-500 ml-1">*</span>
    </label>
    
    <div class="relative">
      <input
        :id="inputId"
        v-model="inputValue"
        :type="type"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :readonly="readonly"
        :class="inputClasses"
        v-bind="$attrs"
        @blur="handleBlur"
        @focus="handleFocus"
        @input="handleInput"
      />
      
      <!-- 错误图标 -->
      <div
        v-if="error"
        class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"
      >
        <svg class="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clip-rule="evenodd"
          />
        </svg>
      </div>
    </div>
    
    <!-- 帮助文本或错误信息 -->
    <p
      v-if="error || helperText"
      :class="[
        'text-sm',
        error ? 'text-red-600' : 'text-gray-500'
      ]"
    >
      {{ error || helperText }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface Props {
  modelValue?: string | number
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  readonly?: boolean
  error?: string
  helperText?: string
  size?: 'sm' | 'md' | 'lg'
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'blur', event: FocusEvent): void
  (e: 'focus', event: FocusEvent): void
  (e: 'input', event: Event): void
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  size: 'md',
  modelValue: ''
})

const emit = defineEmits<Emits>()

// 生成唯一ID
const inputId = ref(`input-${Math.random().toString(36).substring(2, 9)}`)

const inputValue = computed({
  get: () => props.modelValue,
  set: (value: string | number) => emit('update:modelValue', String(value))
})

const inputClasses = computed(() => {
  const baseClasses = [
    'block',
    'w-full',
    'border',
    'rounded-md',
    'shadow-sm',
    'focus:outline-none',
    'focus:ring-1',
    'transition-colors'
  ]

  // 尺寸
  const sizeClasses = {
    sm: ['px-2', 'py-1', 'text-sm'],
    md: ['px-3', 'py-2', 'text-sm'],
    lg: ['px-4', 'py-3', 'text-base']
  }

  // 状态
  let stateClasses: string[] = []
  if (props.error) {
    stateClasses = [
      'border-red-300',
      'text-red-900',
      'placeholder-red-300',
      'focus:ring-red-500',
      'focus:border-red-500'
    ]
  } else if (props.disabled) {
    stateClasses = [
      'bg-gray-50',
      'border-gray-200',
      'text-gray-500',
      'cursor-not-allowed'
    ]
  } else if (props.readonly) {
    stateClasses = [
      'bg-gray-50',
      'border-gray-200',
      'focus:ring-gray-500',
      'focus:border-gray-500'
    ]
  } else {
    stateClasses = [
      'border-gray-300',
      'focus:ring-purple-500',
      'focus:border-purple-500'
    ]
  }

  return [
    ...baseClasses,
    ...sizeClasses[props.size],
    ...stateClasses
  ].join(' ')
})

const handleBlur = (event: FocusEvent) => {
  emit('blur', event)
}

const handleFocus = (event: FocusEvent) => {
  emit('focus', event)
}

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  inputValue.value = target.value
  emit('input', event)
}
</script>