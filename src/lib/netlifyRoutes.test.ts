import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function appRoutePaths(): string[] {
  const src = readFileSync(join(root, 'src/routeTree.gen.ts'), 'utf8')
  const block = src.match(/export interface FileRoutesByFullPath \{([^}]+)\}/)
  if (!block?.[1]) throw new Error('FileRoutesByFullPath not found in routeTree.gen.ts')
  return [...block[1].matchAll(/'([^']+)':/g)].flatMap((match) =>
    match[1] ? [match[1]] : [],
  )
}

function noCacheHeaderPaths(toml: string): string[] {
  const paths: string[] = []
  for (const section of toml.split('[[headers]]').slice(1)) {
    if (!/cache-control\s*=\s*"no-cache, no-store, must-revalidate"/.test(section)) {
      continue
    }
    const match = section.match(/for\s*=\s*"([^"]+)"/)
    if (match?.[1]) paths.push(match[1])
  }
  return paths
}

/** TanStack `$param` → Netlify `:param`. */
function asNetlifyPath(routePath: string) {
  return routePath.replace(/\$(\w+)/g, ':$1')
}

function isCoveredByNoCache(routePath: string, headerPaths: string[]) {
  const netlifyPath = asNetlifyPath(routePath)
  if (headerPaths.includes(netlifyPath)) return true
  // Single-segment app routes (login, signup, onboarding) share `/:route`.
  if (/^\/[^/]+$/.test(routePath) && headerPaths.includes('/:route')) return true
  return false
}

describe('netlify.toml no-cache headers', () => {
  it('covers every route path in routeTree.gen.ts', () => {
    const toml = readFileSync(join(root, 'netlify.toml'), 'utf8')
    const headerPaths = noCacheHeaderPaths(toml)
    const routes = appRoutePaths()

    expect(routes.length).toBeGreaterThan(0)

    const missing = routes.filter((path) => !isCoveredByNoCache(path, headerPaths))
    expect(missing).toEqual([])
  })
})
