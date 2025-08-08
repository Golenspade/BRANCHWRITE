import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), wasm()],
  optimizeDeps: {
    exclude: ['@automerge/automerge'],
    include: ['monaco-editor/esm/vs/language/typescript/ts.worker', 'monaco-editor/esm/vs/editor/editor.worker']
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
  },
  worker: {
    format: 'es'
  }
})
