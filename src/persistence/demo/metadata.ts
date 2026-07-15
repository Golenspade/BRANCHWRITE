export async function contentMetadata(content: string) {
  const bytes = new TextEncoder().encode(content)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const contentHash = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0')).join('')
  const wordCount = content.length === 0
    ? 0
    : content.split(/\p{White_Space}+/u).filter(Boolean).length
  return {
    contentHash,
    wordCount,
    characterCount: [...content].length,
  }
}
