import type { CmThemeName } from '@cosmemilton/ui-angular'

export const authArtwork = {
  'cm-v4-aurora': { background: 'login-v1-aurora-claro.webp', artwork: 'login-v2-aurora-claro.webp' },
  'cm-v4-light': { background: 'login-v1-claro.webp', artwork: 'login-v2-claro.webp' },
  'cm-v4-dark': { background: 'login-v1-aurora.webp', artwork: 'login-v2-ribbon.webp' },
} satisfies Record<CmThemeName, { background: string; artwork: string }>
