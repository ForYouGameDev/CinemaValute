import { describe, it, expect } from 'vitest'
import { validateSource, embedUrl } from './validate'
describe('source validation', () => {
  it('rejects http and bad hosts', () => {
    expect(validateSource('youtube', 'http://youtube.com/watch?v=a').ok).toBe(false)
    expect(validateSource('youtube', 'https://evil.com/watch?v=a').ok).toBe(false)
    expect(validateSource('public_domain', 'https://evil.com/details/x').ok).toBe(false)
  })
  it('builds safe embeds', () => {
    expect(embedUrl('youtube', 'https://youtu.be/abc123')).toBe('https://www.youtube-nocookie.com/embed/abc123')
    expect(embedUrl('provider_link', 'https://example.com/x')).toBeNull()
  })
})
