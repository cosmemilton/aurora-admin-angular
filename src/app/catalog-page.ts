import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { DomSanitizer } from '@angular/platform-browser'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { CmButton, CmColumn, CmDataTable, CmIcon, CmTableRow, CmThemeMenu, CmThemeService, CmToastService } from '@cosmemilton/ui-angular'
import { CatalogFrame, previewTheme } from './catalog-frame'
import { catalog, categories, categoryRoot, normalizeSearch } from './navigation'
import rawExamples from './reference/catalogExamples.json'
import rawTrees from './reference/catalogTrees.json'
import { FixtureChild, FixtureTree } from './fixture-tree'

type FrameMode = 'basic' | 'advanced'
type Section = {title:string;description?:string;frame?:FrameMode}
const examples = rawExamples as Record<string,{ source:string; sections:Section[] }>
const trees = rawTrees as unknown as Record<string,(FixtureChild[] | null)[]>

@Component({
  selector:'aurora-catalog',
  imports:[RouterLink,CmButton,CmDataTable,CmIcon,CmThemeMenu,FixtureTree,CatalogFrame],
  changeDetection:ChangeDetectionStrategy.OnPush,
  templateUrl:'./catalog-page.html',
  host:{style:'display:block;min-width:0'},
  styles: [`
    .example-grid { display:grid; grid-template-columns:minmax(0,1fr); gap:var(--space-md); }
    @media (min-width:64rem) {
      .example-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
      .example-grid__wide { grid-column:1/-1; }
    }
  `],
})
export class CatalogPage {
  readonly route = inject(ActivatedRoute)
  private readonly toast = inject(CmToastService)
  private readonly theme = inject(CmThemeService)
  private readonly sanitizer = inject(DomSanitizer)
  readonly isolated = !!this.route.snapshot.data['isolated']
  readonly frameTheme = previewTheme(this.route.snapshot.queryParamMap.get('tema') ?? this.theme.name())
  readonly frameMode = this.parseMode(this.route.snapshot.paramMap.get('mode'))
  readonly path = this.isolated
    ? categoryRoot + '/' + this.route.snapshot.params['category'] + '/' + this.route.snapshot.params['slug']
    : this.route.snapshot.data['path'] as string
  readonly item = catalog.find(entry=>entry.path===this.path)
  readonly match = categories.find(category=>this.path===categoryRoot+'/'+category.id)
  readonly root = categoryRoot
  readonly categories = categories
  readonly query = signal('')
  readonly total = catalog.length
  readonly examples = this.item ? examples[this.item.name] : undefined
  readonly trees = this.item ? trees[this.item.name] ?? [] : []
  readonly sections: Section[] = this.examples?.sections?.length ? this.examples.sections : [{title:this.item?.label ?? 'Exemplo'}]
  readonly validFrame = this.sections.some(section => section.frame === this.frameMode)
  readonly frameSources = computed(() => {
    if (!this.item) return null
    const { category, slug } = this.item
    const prefix = '/app/exemplo-isolado/' + category.id + '/' + slug
    const query = '?tema=' + encodeURIComponent(this.theme.name())
    return {
      basic: this.sanitizer.bypassSecurityTrustResourceUrl(prefix + '/basic' + query),
      advanced: this.sanitizer.bypassSecurityTrustResourceUrl(prefix + '/advanced' + query),
    }
  })
  readonly results = computed(() => {
    const target = normalizeSearch(this.query())
    return catalog.filter(item => (!this.match || item.category.id === this.match.id)
      && normalizeSearch(item.label+' '+item.name+' '+item.description+' '+item.slug.replaceAll('-',' ')).includes(target))
  })
  readonly selected = signal('')
  readonly columns: CmColumn[] = [
    {id:'contact',label:'Cliente'},{id:'city',label:'Cidade'},{id:'value',label:'Valor',align:'right'},{id:'status',label:'Situação'},
  ]
  readonly dataRows: CmTableRow[] = [
    {id:'1',cells:{contact:{label:'Isabela Duarte',avatar:'ID',detail:'Serra Café'},city:'Florianópolis, SC',value:1240,status:{label:'Ativo',tone:'success'}}},
    {id:'2',cells:{contact:{label:'Diego Almeida',avatar:'DA',detail:'Nexo Comércio'},city:'São Paulo, SP',value:890,status:{label:'Prospect',tone:'primary'}}},
    {id:'3',cells:{contact:{label:'Bianca Nunes',avatar:'BN',detail:'Vereda Digital'},city:'Belo Horizonte, MG',value:1701,status:{label:'Ativo',tone:'success'}}},
    {id:'4',cells:{contact:{label:'Carla Rocha',avatar:'CR',detail:'Aquarela Studio'},city:'Fortaleza, CE',value:510,status:{label:'Inativo',tone:'default'}}},
    {id:'5',cells:{contact:{label:'Raul Barreto',avatar:'RB',detail:'Ponte Sistemas'},city:'Recife, PE',value:121, status:{label:'Ativo',tone:'success'}}},
  ]

  categoryEntries(id:string) { return catalog.filter(item => item.category.id===id) }
  private parseMode(value: string | null): FrameMode | null { return value === 'basic' || value === 'advanced' ? value : null }
  announce(message = 'Alterações salvas.') { this.toast.show(message,{tone:'success'}) }

  code(nodes:FixtureChild[] | null | undefined, name:string) {
    if (!nodes?.length) return '<!-- Exemplo ' + name + ' na galeria Angular -->'
    return JSON.stringify(nodes,null,2)
  }

  async copy(text:string) {
    try {
      await navigator.clipboard.writeText(text)
      this.announce('Código copiado.')
    } catch {
      this.toast.show('Selecione o trecho para copiar.',{tone:'warning'})
    }
  }
}
