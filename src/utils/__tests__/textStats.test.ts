import { describe, expect, it } from 'vitest'
import { computeTextStats } from '../textStats'

describe('computeTextStats', () => {
  it('returns zeros for empty text', () => {
    expect(computeTextStats('')).toEqual({
      characters: 0,
      charactersNoSpaces: 0,
      words: 0,
      lines: 0,
      paragraphs: 0,
    })
  })

  it('counts words, lines and paragraphs', () => {
    const text = '你好世界 hello\n\n第二段 内容'
    const stats = computeTextStats(text)
    expect(stats.characters).toBe(text.length)
    expect(stats.charactersNoSpaces).toBe(text.replace(/\s/g, '').length)
    expect(stats.words).toBe(4)
    expect(stats.lines).toBe(3)
    expect(stats.paragraphs).toBe(2)
  })
})
