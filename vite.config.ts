import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import wasm from 'vite-plugin-wasm'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'

/** 开发期把 node_modules/vditor/dist 挂到 /vditor/dist，匹配 Vditor CDN 约定 */
function serveVditorAssets(): Plugin {
  const vditorRoot = path.resolve('node_modules/vditor/dist')
  return {
    name: 'serve-vditor-assets',
    configureServer(server) {
      server.middlewares.use('/vditor/dist', (req, res, next) => {
        try {
          const reqPath = decodeURIComponent((req.url || '/').split('?')[0])
          const filePath = path.join(vditorRoot, reqPath)
          if (!filePath.startsWith(vditorRoot) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
            return next()
          }
          const ext = path.extname(filePath).toLowerCase()
          const types: Record<string, string> = {
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.wasm': 'application/wasm',
            '.png': 'image/png',
            '.svg': 'image/svg+xml',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2',
          }
          res.setHeader('Content-Type', types[ext] || 'application/octet-stream')
          fs.createReadStream(filePath).pipe(res)
        } catch {
          next()
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [
    vue(),
    wasm(),
    serveVditorAssets(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/vditor/dist/**/*',
          dest: 'vditor/dist',
          rename: { stripBase: 3 },
        },
      ],
    }),
  ],
  optimizeDeps: {
    exclude: ['@automerge/automerge'],
    include: [
      'monaco-editor/esm/vs/editor/editor.worker',
      'monaco-editor/esm/vs/language/json/json.worker',
      'monaco-editor/esm/vs/language/css/css.worker',
      'monaco-editor/esm/vs/language/html/html.worker',
      'monaco-editor/esm/vs/language/typescript/ts.worker',
    ],
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  },
  worker: {
    format: 'es',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
