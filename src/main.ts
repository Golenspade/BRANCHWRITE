import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import './index.css'
import App from './App.vue'

// Naive UI
import {
  create,
  NButton,
  NCard,
  NInput,
  NSelect,
  NModal,
  NSpace,
  NGrid,
  NGridItem,
  NTag,
  NEmpty,
  NSpin,
  NIcon,
  NForm,
  NFormItem,
  NInputGroup,
  NPopconfirm,
  NMessageProvider
} from 'naive-ui'

const naive = create({
  components: [
    NButton,
    NCard,
    NInput,
    NSelect,
    NModal,
    NSpace,
    NGrid,
    NGridItem,
    NTag,
    NEmpty,
    NSpin,
    NIcon,
    NForm,
    NFormItem,
    NInputGroup,
    NPopconfirm,
    NMessageProvider
  ]
})

const app = createApp(App)
const pinia = createPinia()

app.use(router)
app.use(pinia)
app.use(naive)

app.mount('#root')