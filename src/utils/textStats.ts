export interface TextStats {
  characters: number
  charactersNoSpaces: number
  words: number
  lines: number
  paragraphs: number
}

/** 统计文本字数、字符、行数等写作指标 */
export function computeTextStats(text: string): TextStats {
  const characters = text.length
  const charactersNoSpaces = text.replace(/\s/g, '').length
  const trimmed = text.trim()
  const words = trimmed
    ? trimmed.split(/\s+/).filter((w) => w.length > 0).length
    : 0
  const lines = text.length === 0 ? 0 : text.split('\n').length
  const paragraphs = trimmed
    ? trimmed.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length
    : 0

  return { characters, charactersNoSpaces, words, lines, paragraphs }
}
