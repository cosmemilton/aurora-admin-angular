import { Location } from '@angular/common'
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { DomSanitizer } from '@angular/platform-browser'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import {
  CmBadge, CmBarChart, CmButton, CmCard, CmCheckbox, CmColumn, CmComparisonLineChart, CmDataTable, CmDisclosure, CmDonutChart, CmEmpty, CmField, CmGrid, CmGridContainer,
  CmIcon, CmIconBadge, CmLink, CmNativeSelect, CmPage, CmPageHeader, CmRow, CmSectionHeader, CmStack, CmTableRow, CmText,
  CmRatioBar, CmSummaryList, CmThemeMenu, CmThemeService, CmToastService,
  type CmButtonVariant, type CmTone,
} from '@cosmemilton/ui-angular'
import { CatalogFrame, previewTheme } from './catalog-frame'
import { CatalogGallery } from './catalog-gallery'
import { CatalogScheduler } from './catalog-scheduler'
import { CatalogMapDemo } from './catalog-map-demo'
import { catalog, categories, categoryRoot, normalizeSearch } from './navigation'
import rawExamples from './reference/catalogExamples.json'
import rawTrees from './reference/catalogTrees.json'
import { chartMarkup, orderAxis, pipelineStages, revenueAxis, weeklyPoints } from './reference/catalogChartData'
import { FixtureChild, FixtureTree } from './fixture-tree'
import { APP_PATHS } from './reference/paths'

type FrameMode = 'basic' | 'advanced'
type Section = {title:string;description?:string;frame?:FrameMode;wide?:boolean}
const examples = rawExamples as Record<string,{ source:string; sections:Section[] }>
const trees = rawTrees as unknown as Record<string,(FixtureChild[] | null)[]>
type ButtonSample = {
  label: string
  props: { variant?: CmButtonVariant; tone?: CmTone; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' }
}
type ButtonSampleGroup = { attribute: keyof ButtonSample['props']; label: string; options: readonly ButtonSample[] }

const buttonSampleGroups: readonly ButtonSampleGroup[] = [
  { attribute: 'variant', label: 'Estilos de botão', options: [
    { label: 'Sólido', props: { variant: 'solid' } }, { label: 'Contorno', props: { variant: 'outline' } },
    { label: 'Suave', props: { variant: 'soft' } }, { label: 'Superfície', props: { variant: 'surface' } },
    { label: 'Fantasma', props: { variant: 'ghost' } }, { label: 'Link', props: { variant: 'link' } },
    { label: 'Simples', props: { variant: 'plain' } },
  ] },
  { attribute: 'tone', label: 'Tons do botão', options: [
    { label: 'Neutro', props: { tone: 'default' } }, { label: 'Primário', props: { tone: 'primary' } },
    { label: 'Secundário', props: { tone: 'secondary' } }, { label: 'Destaque', props: { tone: 'accent' } },
    { label: 'Sucesso', props: { tone: 'success' } }, { label: 'Informação', props: { tone: 'info' } },
    { label: 'Atenção', props: { tone: 'warning' } }, { label: 'Perigo', props: { tone: 'danger' } },
  ] },
  { attribute: 'size', label: 'Tamanhos do botão', options: [
    { label: 'Extra pequeno', props: { size: 'xs' } }, { label: 'Pequeno', props: { size: 'sm' } },
    { label: 'Médio', props: { size: 'md' } }, { label: 'Grande', props: { size: 'lg' } },
    { label: 'Extra grande', props: { size: 'xl' } },
  ] },
]

@Component({
  selector:'aurora-catalog',
  imports: [RouterLink, CmBadge, CmButton, CmCard, CmCheckbox, CmDataTable, CmDisclosure, CmEmpty, CmField, CmGrid, CmGridContainer,
    CmIcon, CmIconBadge, CmLink, CmNativeSelect, CmPage, CmPageHeader, CmRow, CmSectionHeader, CmStack, CmText, CmThemeMenu,
    FixtureTree, CatalogFrame, CatalogGallery, CatalogMapDemo, CatalogScheduler, CmBarChart, CmComparisonLineChart, CmDonutChart, CmRatioBar, CmSummaryList],
  changeDetection:ChangeDetectionStrategy.OnPush,
  templateUrl:'./catalog-page.html',
  host:{style:'display:block;min-width:0'},
})
export class CatalogPage {
  readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly toast = inject(CmToastService)
  private readonly theme = inject(CmThemeService)
  private readonly sanitizer = inject(DomSanitizer)
  private readonly location = inject(Location)
  readonly isolated = !!this.route.snapshot.data['isolated']
  readonly frameTheme = previewTheme(this.route.snapshot.queryParamMap.get('tema') ?? this.theme.name())
  readonly frameMode = this.parseMode(this.route.snapshot.paramMap.get('mode'))
  readonly path = this.isolated
    ? categoryRoot + '/' + this.route.snapshot.params['category'] + '/' + this.route.snapshot.params['slug']
    : this.route.snapshot.data['path'] as string
  readonly item = catalog.find(entry=>entry.path===this.path)
  readonly match = categories.find(category=>this.path===categoryRoot+'/'+category.id)
  readonly root = categoryRoot
  private readonly queryParams = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap })
  readonly query = computed(() => this.queryParams().get('q') ?? '')
  readonly search = computed(() => normalizeSearch(this.query()))
  readonly groups = categories.map(category => ({ ...category, entries: catalog.filter(item => item.category.id === category.id) }))
  readonly total = catalog.length
  readonly examples = this.item ? examples[this.item.name] : undefined
  readonly trees = this.item ? trees[this.item.name] ?? [] : []
  readonly sections: Section[] = this.examples?.sections?.length ? this.examples.sections : [{title:this.item?.label ?? 'Exemplo'}]
  readonly sourceOpen = signal(false)
  readonly validFrame = this.sections.some(section => section.frame === this.frameMode)
  readonly frameSources = computed(() => {
    if (!this.item) return null
    const { category, slug } = this.item
    const prefix = APP_PATHS.isolatedExample + '/' + category.id + '/' + slug
    const query = '?tema=' + encodeURIComponent(this.theme.name())
    const source = (mode: FrameMode) => this.sanitizer.bypassSecurityTrustResourceUrl(this.location.prepareExternalUrl(prefix + '/' + mode + query))
    return {
      basic: source('basic'),
      advanced: source('advanced'),
    }
  })
  readonly results = computed(() => {
    const target = this.search()
    return catalog.filter(item => (!this.match || item.category.id === this.match.id)
      && normalizeSearch([item.label, item.name, item.slug.replaceAll('-', ' '), item.description, item.category.label].join(' ')).includes(target))
  })
  readonly buttonSampleGroups = buttonSampleGroups
  readonly buttonSampleSelection = signal<Record<number, number>>({})
  readonly buttonShapes = [{ value: 'default', label: 'Padrão' }, { value: 'pill', label: 'Pílula' }, { value: 'square', label: 'Quadrado' }]
  readonly buttonShape = signal<'default' | 'pill' | 'square'>('pill')
  readonly buttonWide = signal(false)
  readonly followingOrder = signal(false)
  readonly orderUnits = signal(1)
  readonly showOrderSummary = signal(false)
  readonly orderAmount = computed(() => (this.orderUnits() * 25).toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
  readonly approval = signal<'ready' | 'saving' | 'done'>('ready')
  private approvalTimer?: ReturnType<typeof setTimeout>
  readonly pipelineStages = pipelineStages
  readonly weeklyPoints = weeklyPoints
  readonly revenueAxis = revenueAxis
  readonly orderAxis = orderAxis
  readonly exampleMarkup = this.item?.name === 'CmButton'
    ? '<button cmButton tone="primary" type="button">Salvar</button>'
    : this.item && chartMarkup[this.item.name]
  readonly shifts = [{ label: 'Atendimento', value: 24, tone: 'primary' }, { label: 'Plantão', value: 16, tone: 'success' }]
  readonly hours = signal(this.shifts.map(shift => shift.value))
  readonly shiftSegments = computed(() => this.shifts.map((shift, i) => ({ ...shift, value: this.hours()[i]!, min: 4 })))
  readonly shiftSummary = computed(() => this.shiftSegments().map(shift => ({ label: shift.label, value: shift.value + ' h' })))
  readonly describeHours = ([first, second]: number[]) => first + ' horas de atendimento e ' + second + ' de plantão'
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

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.approvalTimer))
  }

  selectButtonSample(group: number, option: number) {
    this.buttonSampleSelection.update(selected => ({ ...selected, [group]: option }))
  }

  setButtonShape(shape: string) {
    if (shape === 'default' || shape === 'pill' || shape === 'square') this.buttonShape.set(shape)
  }

  approveOrder() {
    if (this.approval() !== 'ready') return
    this.approval.set('saving')
    this.approvalTimer = setTimeout(() => {
      this.approval.set('done')
      this.announce('Pedido de exemplo aprovado.')
    }, 900)
  }

  setQuery(value: string) {
    void this.router.navigate([], {
      relativeTo: this.route, queryParams: { q: value || null }, queryParamsHandling: 'merge', replaceUrl: true, preserveFragment: true,
    })
  }
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
