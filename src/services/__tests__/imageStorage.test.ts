import { describe, expect, it } from 'vitest'
import { toMarkdownImage, type StoredImage } from '../imageStorage'

describe('imageStorage helpers', () => {
  it('builds markdown image syntax', () => {
    const image: StoredImage = {
      name: 'cover.png',
      mime: 'image/png',
      dataUrl: 'data:image/png;base64,abc',
      bytes: 3,
    }
    expect(toMarkdownImage(image)).toBe('![cover](data:image/png;base64,abc)')
    expect(toMarkdownImage(image, '封面')).toBe('![封面](data:image/png;base64,abc)')
  })
})
