import type { Ref } from 'vue'
import type { ContentNavigationItem } from '@nuxt/content'

/**
 * Return navigation with sanitized titles (e.g., strip redundant project prefixes like "UNA - ").
 */
export function useSanitizedNavigation(patterns?: Array<string | RegExp>): Ref<ContentNavigationItem[]> {
  const rawNavigation = inject<Ref<ContentNavigationItem[]> | undefined>('navigation')

  const sanitizePatterns: RegExp[] = (patterns && patterns.length > 0
    ? patterns
    : [/^(UNA\s*[-–—:\u2013\u2014]\s*)/i]
  ).map((p) => (typeof p === 'string' ? new RegExp(`^${p}`) : p))

  const stripPrefixes = (title?: string): string | undefined => {
    if (!title) return title
    let result = title
    for (const rx of sanitizePatterns) {
      result = result.replace(rx, '')
    }
    return result.trim()
  }

  const mapItems = (items: ContentNavigationItem[] | undefined): ContentNavigationItem[] => {
    if (!items) return []
    return items.map((item) => ({
      ...item,
      title: stripPrefixes(item.title),
      children: item.children ? mapItems(item.children) : undefined
    }))
  }

  const navigation = computed<ContentNavigationItem[]>(() => mapItems(rawNavigation?.value))

  return navigation
}


