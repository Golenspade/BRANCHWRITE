/** 本地图片存储：Web 端用 data URL 嵌入 Markdown，便于离线持久化 */

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024
const COMPRESS_THRESHOLD = 800 * 1024
const MAX_EDGE = 1920

export interface StoredImage {
  name: string
  mime: string
  dataUrl: string
  bytes: number
}

function sanitizeName(name: string): string {
  return name.replace(/[^\w.\u4e00-\u9fa5-]+/g, '_').slice(0, 80) || 'image'
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error || new Error('读取图片失败'))
    reader.readAsDataURL(file)
  })
}

async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type.includes('svg')) {
    return file
  }
  if (file.size <= COMPRESS_THRESHOLD) {
    return file
  }

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
  const quality = mime === 'image/jpeg' ? 0.85 : undefined

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), mime, quality)
  })

  return blob && blob.size < file.size ? blob : file
}

/** 将本地图片转为可写入 Markdown 的 data URL */
export async function storeImageFile(
  file: File,
  options?: { maxBytes?: number }
): Promise<StoredImage> {
  const maxBytes = options?.maxBytes ?? DEFAULT_MAX_BYTES
  if (!file.type.startsWith('image/')) {
    throw new Error('仅支持图片文件')
  }
  if (file.size > maxBytes) {
    throw new Error(`图片不能超过 ${Math.round(maxBytes / 1024 / 1024)}MB`)
  }

  const compressed = await compressImage(file)
  const dataUrl = await readAsDataUrl(compressed)
  if (!dataUrl.startsWith('data:image/')) {
    throw new Error('图片转换失败')
  }

  return {
    name: sanitizeName(file.name),
    mime: compressed.type || file.type,
    dataUrl,
    bytes: compressed.size,
  }
}

/** 从远程图片 URL 拉取并转为 data URL（粘贴网图时用） */
export async function storeImageFromUrl(
  url: string,
  options?: { maxBytes?: number; name?: string }
): Promise<StoredImage> {
  const maxBytes = options?.maxBytes ?? DEFAULT_MAX_BYTES
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('下载图片失败')
  }
  const blob = await response.blob()
  if (!blob.type.startsWith('image/')) {
    throw new Error('链接不是图片')
  }
  if (blob.size > maxBytes) {
    throw new Error(`图片不能超过 ${Math.round(maxBytes / 1024 / 1024)}MB`)
  }

  const file = new File([blob], options?.name || 'remote-image.png', { type: blob.type })
  return storeImageFile(file, options)
}

export function toMarkdownImage(image: StoredImage, alt?: string): string {
  const label = alt || image.name.replace(/\.[^.]+$/, '') || 'image'
  return `![${label}](${image.dataUrl})`
}
