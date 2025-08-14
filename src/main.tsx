import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 导入时间线测试运行器（开发环境）
if (import.meta.env.DEV) {
  import('./test/timelineTestRunner');
}



createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
