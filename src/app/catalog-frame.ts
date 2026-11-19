import { DOCUMENT, NgTemplateOutlet } from '@angular/common'
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core'
import { DomSanitizer } from '@angular/platform-browser'
import { CmAuthField, CmAuthLayout, CmButton, CmIcon, CmThemeScript, CmToastService, cmThemes, type CmThemeName } from '@cosmemilton/ui-angular'
import { authArtwork } from './auth-artwork'
import { normalizeSearch } from './navigation'

const stages = [
  { id: 'recebimento', label: 'Recebimento', description: '4 remessas aguardam conferência.', icon: 'boxes' },
  { id: 'separacao', label: 'Separação', description: '12 pedidos aguardam a montagem dos volumes.', icon: 'package' },
  { id: 'coleta', label: 'Coleta', description: '6 volumes prontos para o motorista.', icon: 'shopping-bag' },
] as const

export function previewTheme(value: unknown): CmThemeName {
  return cmThemes.find(theme => theme.id === value)?.id ?? 'cm-v4-aurora'
}

@Component({
  selector: 'aurora-catalog-frame',
  imports: [CmAuthLayout, CmAuthField, CmButton, CmIcon, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display:block;min-width:0' },
  templateUrl: './catalog-frame.html',
  styles: [`
    .dispatch-shell { display:grid; grid-template-columns:minmax(9rem,14rem) minmax(0,1fr); gap:var(--space-md); }
    .dispatch-shell__navigation { padding:var(--space-md); border:1px solid var(--color-border); border-radius:var(--radius-md); background:var(--color-card); }
    .preview-header { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:var(--space-md); }
    .preview-menu { display:flex; flex-wrap:wrap; gap:var(--space-xs); }
    .palette-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(12rem,1fr)); gap:var(--space-sm); }
    @media (max-width:39.999rem) { .dispatch-shell { grid-template-columns:minmax(0,1fr); } }
  `],
})
export class CatalogFrame {
  private readonly document = inject(DOCUMENT)
  private readonly sanitizer = inject(DomSanitizer)
  private readonly toast = inject(CmToastService)
  readonly name = input.required<string>()
  readonly mode = input.required<'basic' | 'advanced'>()
  readonly theme = input.required<CmThemeName>()
  readonly advanced = computed(() => this.mode() === 'advanced')
  readonly selected = signal<string>(stages[0].id)
  readonly stages = stages
  readonly stage = computed(() => stages.find(item => item.id === this.selected()) ?? stages[0])
  readonly expanded = signal(true)
  readonly query = signal('')
  readonly visibleStages = computed(() => stages.filter(stage => normalizeSearch(stage.label).includes(normalizeSearch(this.query()))))
  readonly period = signal('semana')
  readonly localTheme = signal<CmThemeName | null>(null)
  readonly density = signal<string | null>(null)
  readonly menuOpen = signal(false)
  readonly initialTheme = signal<CmThemeName>('cm-v4-light')
  readonly palettes = cmThemes
  readonly currentTheme = computed(() => this.localTheme() ?? (this.name() === 'CmThemeProvider'
    ? this.advanced() ? 'cm-v4-aurora' : 'cm-v4-dark' : this.theme()))
  readonly currentDensity = computed(() => this.density() ?? (this.name() === 'CmThemeProvider' && this.advanced() ? 'compact' : 'default'))
  readonly themeLabel = computed(() => cmThemes.find(theme => theme.id === this.currentTheme())?.label)
  readonly art = computed(() => authArtwork[this.currentTheme()])
  readonly initializationScript = computed(() => {
    return CmThemeScript({ defaultThemeName: this.initialTheme(), defaultDensity: this.advanced() ? 'compact' : 'default',
      storageKey: false, skin: 'aurora-ops' })
  })
  readonly initializationDocument = computed(() => this.sanitizer.bypassSecurityTrustHtml(`<!doctype html>
    <html lang="pt-BR"><head><meta charset="utf-8"><title>Atributos iniciais</title><script>${this.initializationScript()}</script></head>
    <body><pre><output></output></pre><script>
      document.querySelector('output').textContent = ['data-theme', 'data-density', 'data-cm-skin']
        .map(name => name + '="' + document.documentElement.getAttribute(name) + '"').join(String.fromCharCode(10));
    </script></body></html>`))

  constructor() {
    effect(onCleanup => {
      const { dataset, style } = this.document.documentElement
      const previousTheme = dataset['theme']
      const previousDensity = dataset['density']
      const previousScheme = style.colorScheme
      const theme = this.currentTheme()
      dataset['theme'] = theme
      dataset['density'] = this.currentDensity()
      style.colorScheme = theme === 'cm-v4-dark' ? 'dark' : 'light'
      onCleanup(() => {
        if (previousTheme === undefined) delete dataset['theme']; else dataset['theme'] = previousTheme
        if (previousDensity === undefined) delete dataset['density']; else dataset['density'] = previousDensity
        style.colorScheme = previousScheme
      })
    })
  }

  changeLocalTheme(theme: CmThemeName) {
    this.localTheme.set(theme)
    this.menuOpen.set(false)
  }

  updateInitialTheme(value: string) { this.initialTheme.set(previewTheme(value)) }

  validate(event: Event) {
    event.preventDefault()
    this.toast.show('Formulário de demonstração validado.', { tone: 'success' })
  }
}
