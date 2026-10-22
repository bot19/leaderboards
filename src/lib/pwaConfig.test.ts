import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { BRAND_NAME } from '@/components/brand/BrandLockup'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const PAGE_BACKGROUND = '#f5f5f5'

describe('home-screen app config', () => {
  const manifest = JSON.parse(
    readFileSync(join(root, 'public/manifest.webmanifest'), 'utf8'),
  ) as {
    name: string
    short_name: string
    theme_color: string
    background_color: string
    display: string
  }
  const html = readFileSync(join(root, 'index.html'), 'utf8')

  it('names the installed app after the brand', () => {
    expect(manifest.name).toBe(BRAND_NAME)
    expect(manifest.short_name).toBe(BRAND_NAME)
    expect(html).toContain(
      `<meta name="apple-mobile-web-app-title" content="${BRAND_NAME}" />`,
    )
    expect(html).toContain(`<title>${BRAND_NAME}</title>`)
  })

  it('uses one theme colour for the page, status bar, and splash', () => {
    expect(manifest.background_color).toBe(PAGE_BACKGROUND)
    expect(manifest.theme_color).toBe(PAGE_BACKGROUND)
    expect(html).toContain(
      `<meta name="theme-color" content="${PAGE_BACKGROUND}" />`,
    )
  })

  it('links the manifest and opens full screen on a phone', () => {
    expect(html).toContain(
      '<link rel="manifest" href="/manifest.webmanifest" />',
    )
    expect(manifest.display).toBe('standalone')
    expect(html).toContain('viewport-fit=cover')
    expect(html).toContain(
      '<meta name="apple-mobile-web-app-capable" content="yes" />',
    )
    expect(html).toContain(
      '<meta name="apple-mobile-web-app-status-bar-style" content="default" />',
    )
  })
})
