import { ChangeDetectionStrategy, Component, forwardRef, input } from '@angular/core'
import { RouterLink } from '@angular/router'
import {
  CmAspectRatio, CmBadge, CmBox, CmButton, CmCard, CmCol, CmContainer,
  CmEmpty, CmGrid, CmGridContainer, CmIcon, CmIconBadge, CmItem, CmKbd, CmLink, CmMetricCard, CmMetricGrid,
  CmProgress, CmRow, CmSeparator, CmSkeleton, CmStack, CmStatusDot, CmText, type CmButtonVariant, type CmTone,
} from '@cosmemilton/ui-angular'

export type FixtureNode = {tag:string;props:Record<string,unknown>;slots?:Record<string,FixtureChild[]>;children:FixtureChild[]}
export type FixtureChild = string | number | FixtureNode
const variants = ['solid','outline','ghost','soft','surface','link','plain'] as const
const tones = ['default','primary','secondary','accent','danger','warning','success','info'] as const
type ResponsiveCount = number | Partial<Record<'base' | 'sm' | 'md' | 'lg' | 'xl', number>>

@Component({
  selector:'aurora-fixture-tree',
  imports:[CmAspectRatio,CmBadge,CmBox,CmButton,CmCard,CmCol,CmContainer,CmEmpty,
    CmGrid,CmGridContainer,CmIcon,CmIconBadge,CmItem,CmKbd,CmLink,CmMetricCard,CmMetricGrid,CmProgress,CmRow,CmSeparator,
    CmSkeleton,CmStack,CmStatusDot,CmText,RouterLink,forwardRef(() => FixtureTree)],
  changeDetection:ChangeDetectionStrategy.OnPush,
  host:{style:'display:contents'},
  template: `
    @for (item of nodes(); track $index) {
      @if (element(item); as node) {
        @switch (node.tag) {
          @case ('CmButton') {
            <button cmButton type="button" [variant]="variant(node)" [tone]="tone(node)" [size]="buttonSize(node)"
              [iconOnly]="!!node.props['iconOnly']" [fullWidth]="!!node.props['fullWidth']"
              [disabled]="!!node.props['disabled']" [attr.aria-label]="string(node,'aria-label') || null">
              <aurora-fixture-tree [nodes]="slot(node,'icon')" /><aurora-fixture-tree [nodes]="node.children" />
            </button>
          }
          @case ('CmBadge') {
            <span cmBadge [size]="string(node,'size') || 'md'" [tone]="tone(node)" [variant]="string(node,'variant') || 'soft'"><aurora-fixture-tree [nodes]="node.children" /></span>
          }
          @case ('CmText') {
            <span cmText [size]="string(node,'size') || 'sm'" [tone]="string(node,'tone') || 'default'" [weight]="string(node,'weight') || 'normal'"
              [family]="string(node,'family') || 'sans'" [tracking]="string(node,'tracking') || 'normal'" [align]="optional(node,'align')"
              [whiteSpace]="string(node,'whiteSpace') || 'normal'" [wrap]="string(node,'wrap') || 'normal'"><aurora-fixture-tree [nodes]="node.children" /></span>
          }
          @case ('CmAspectRatio') {
            <div cmAspectRatio [ratio]="numeric(node,'ratio',16/9)" [surface]="string(node,'surface') || 'none'" [radius]="string(node,'radius') || 'lg'" [center]="!!node.props['center']">
              <aurora-fixture-tree [nodes]="node.children" />
            </div>
          }
          @case ('CmBox') {
            <div cmBox [surface]="optional(node,'surface')" [radius]="optional(node,'radius')" [border]="optional(node,'border')"
              [padding]="length(node,'padding')" [paddingInline]="length(node,'paddingInline')" [paddingBlock]="length(node,'paddingBlock')"
              [width]="length(node,'width')" [minHeight]="length(node,'minHeight')" [maxWidth]="length(node,'maxWidth')"><aurora-fixture-tree [nodes]="node.children" /></div>
          }
          @case ('CmStack') {
            <div cmStack [gap]="length(node,'gap')" [align]="optional(node,'align')" [justify]="optional(node,'justify')"
              [padding]="length(node,'padding')" [width]="length(node,'width')" [minHeight]="length(node,'minHeight')" [maxWidth]="length(node,'maxWidth')"
              [grow]="!!node.props['grow']" [fullWidth]="!!node.props['fullWidth']" [attr.role]="optional(node,'role')"><aurora-fixture-tree [nodes]="node.children" /></div>
          }
          @case ('CmCol') {
            <div cmCol [gap]="length(node,'gap')" [align]="optional(node,'align')" [justify]="optional(node,'justify')"
              [padding]="length(node,'padding')" [surface]="optional(node,'surface')" [radius]="optional(node,'radius')"
              [minHeight]="length(node,'minHeight')"><aurora-fixture-tree [nodes]="node.children" /></div>
          }
          @case ('CmRow') {
            <div cmRow [gap]="length(node,'gap')" [align]="optional(node,'align')" [justify]="optional(node,'justify')"
              [wrap]="!!node.props['wrap']" [fullWidth]="!!node.props['fullWidth']" [attr.role]="optional(node,'role')">
              <aurora-fixture-tree [nodes]="node.children" />
            </div>
          }
          @case ('CmContainer') {
            <div cmContainer [maxWidth]="length(node,'maxWidth')" [padding]="length(node,'padding')" [paddingBlock]="length(node,'paddingBlock')"
              [paddingInline]="length(node,'paddingInline')" [fluid]="!!node.props['fluid']"><aurora-fixture-tree [nodes]="node.children" /></div>
          }
          @case ('CmGridContainer') {
            <div cmGridContainer [columns]="count(node,'columns',{base:1,md:2,xl:4})" [spacing]="length(node,'spacing') ?? length(node,'gap') ?? 'md'"
              [preset]="string(node,'preset') || 'default'" [minColumnWidth]="length(node,'minColumnWidth')"
              [autoFit]="!!node.props['autoFit']" [autoFill]="!!node.props['autoFill']">
              <aurora-fixture-tree [nodes]="node.children" />
            </div>
          }
          @case ('CmGrid') {
            @if (node.props['container']) {
              <div cmGridContainer [columns]="count(node,'columns',12)" [spacing]="length(node,'spacing') ?? length(node,'gap') ?? 'md'"><aurora-fixture-tree [nodes]="node.children" /></div>
            } @else {
              <div cmGrid [span]="count(node,'size',count(node,'span',1))"><aurora-fixture-tree [nodes]="node.children" /></div>
            }
          }
          @case ('CmMetricGrid') {
            <div cmMetricGrid [columns]="count(node,'columns',{base:1,sm:2,xl:4})" [label]="optional(node,'label')"><aurora-fixture-tree [nodes]="node.children" /></div>
          }
          @case ('CmMetricCard') {
            <cm-metric-card [title]="string(node,'title')" [value]="length(node,'value') ?? ''" [description]="optional(node,'description')"
              [tone]="tone(node)" [variant]="string(node,'variant') || 'surface'" [showIcon]="slot(node,'icon').length > 0">
              <aurora-fixture-tree cmMetricIcon [nodes]="slot(node,'icon')" />
            </cm-metric-card>
          }
          @case ('CmCard') {
            <ng-template #header><aurora-fixture-tree [nodes]="slot(node,'header')" /></ng-template>
            <ng-template #aside><aurora-fixture-tree [nodes]="slot(node,'aside')" /></ng-template>
            <ng-template #footer><aurora-fixture-tree [nodes]="slot(node,'footer')" /></ng-template>
            <article cmCard [variant]="string(node,'variant') || 'surface'" [tone]="tone(node)" [pattern]="optional(node,'pattern')"
              [header]="node.slots?.['header'] ? header : undefined" [aside]="node.slots?.['aside'] ? aside : undefined"
              [footer]="node.slots?.['footer'] ? footer : undefined" [accent]="string(node,'accent') || 'none'"
              [padding]="string(node,'padding') || 'md'" [elevated]="!!node.props['elevated']"><aurora-fixture-tree [nodes]="node.children" /></article>
          }
          @case ('CmItem') {
            @if (node.slots?.['meta']; as meta) {
              <div class="cm-item"><div class="cm-item__body"><span class="cm-item__title">{{ string(node,'title') }}</span>
                @if (string(node,'description')) { <span class="cm-item__description">{{ string(node,'description') }}</span> }
              </div><span class="cm-item__meta"><aurora-fixture-tree [nodes]="meta" /></span></div>
            } @else {
              <cm-item [title]="string(node,'title')" [description]="string(node,'description')" [meta]="string(node,'meta')" />
            }
          }
          @case ('CmSeparator') {
            <span cmSeparator [orientation]="node.props['orientation'] === 'vertical' ? 'vertical' : 'horizontal'" [style.height.px]="node.props['orientation'] === 'vertical' ? numeric(node,'length',16) : null"></span>
          }
          @case ('CmProgress') {
            <cm-progress [min]="numeric(node,'min',0)" [value]="numeric(node,'value',0)" [max]="numeric(node,'max',100)"
              [label]="optional(node,'label')" [showValue]="!!node.props['showValue']" [barThickness]="length(node,'barThickness')" [tone]="string(node,'tone') || 'primary'" />
          }
          @case ('CmSkeleton') {
            <div cmSkeleton [width]="length(node,'width') ?? '100%'" [height]="length(node,'height') ?? 12" [lines]="numeric(node,'lines',1)" [animated]="node.props['animated'] !== false"></div>
          }
          @case ('CmStatusDot') {
            <span cmStatusDot [size]="string(node,'size') || 'md'" [tone]="tone(node)" [label]="optional(node,'label')" [pulse]="!!node.props['pulse']"></span>
          }
          @case ('CmIconBadge') {
            <span cmIconBadge [tone]="tone(node)" [size]="string(node,'size') || 'sm'"><aurora-fixture-tree [nodes]="slot(node,'icon')" /><aurora-fixture-tree [nodes]="node.children" /></span>
          }
          @case ('CmEmpty') {
            <div cmEmpty [title]="string(node,'title')" [description]="optional(node,'description')"></div>
          }
          @case ('CmNativeInput') {
            <label class="aurora-native-field">{{ string(node,'label') }}<input [type]="string(node,'type') || 'text'" [placeholder]="string(node,'placeholder')" [value]="string(node,'defaultValue')" /></label>
          }
          @case ('CmInput') {
            <label class="aurora-native-field">{{ string(node,'label') }}<input [type]="string(node,'type') || 'text'" [placeholder]="string(node,'placeholder')" [value]="string(node,'defaultValue')" /></label>
          }
          @case ('CmTextarea') {
            <label class="aurora-native-field">{{ string(node,'label') }}<textarea [placeholder]="string(node,'placeholder')"></textarea></label>
          }
          @case ('CmCheckbox') { <label><input type="checkbox" [checked]="!!node.props['defaultChecked']" /> {{ string(node,'label') }}<aurora-fixture-tree [nodes]="node.children" /></label> }
          @case ('CmSwitch') { <label><input type="checkbox" role="switch" [checked]="!!node.props['defaultChecked']" /> {{ string(node,'label') }}<aurora-fixture-tree [nodes]="node.children" /></label> }
          @case ('CmDisclosure') {
            <details [open]="!!node.props['defaultOpen']">
              <summary>{{ string(node,'title') }}</summary><aurora-fixture-tree [nodes]="node.children" />
            </details>
          }
          @case ('CmKbd') { <kbd cmKbd><aurora-fixture-tree [nodes]="node.children" /></kbd> }
          @case ('AppLink') {
            @if (string(node,'href').startsWith('/')) {
              <a class="cm-auth-link" [routerLink]="string(node,'href')"><aurora-fixture-tree [nodes]="node.children" /></a>
            } @else {
              <a class="cm-auth-link" [href]="string(node,'href')"><aurora-fixture-tree [nodes]="node.children" /></a>
            }
          }
          @case ('CmLink') { <a cmLink [tone]="tone(node)" [variant]="string(node,'variant') || 'default'" [href]="string(node,'href')"><aurora-fixture-tree [nodes]="node.children" /></a> }
          @default {
            @if (!node.tag.startsWith('Cm') && !node.children.length && !node.slots) {
              <cm-icon [name]="name(node.tag)" [size]="numeric(node,'size',18)" />
            } @else {
              <div [class]="wrapper(node)" [style.--cm-layout-gap]="gap(node)">
                @if (string(node,'title')) { <strong>{{ string(node,'title') }}</strong> }
                @if (node.slots?.['header']; as header) { <aurora-fixture-tree [nodes]="header" /> }
                @if (string(node,'description')) { <p class="cm-text cm-text--sm cm-text--muted">{{ string(node,'description') }}</p> }
                @if (node.slots?.['icon']; as icon) { <aurora-fixture-tree [nodes]="icon" /> }
                <aurora-fixture-tree [nodes]="node.children" />
                @if (node.slots?.['footer']; as footer) { <aurora-fixture-tree [nodes]="footer" /> }
              </div>
            }
          }
        }
      } @else { {{ item }} }
    }
  `,
})
export class FixtureTree {
  readonly nodes = input<readonly FixtureChild[]>([])
  element(node: FixtureChild) { return typeof node === 'object' ? node : undefined }
  string(node:FixtureNode,key:string) { return typeof node.props[key] === 'string' ? node.props[key] : '' }
  optional(node:FixtureNode,key:string) { return this.string(node,key) || undefined }
  length(node:FixtureNode,key:string) {
    const value = node.props[key]
    return typeof value === 'string' || typeof value === 'number' ? value : undefined
  }
  count(node:FixtureNode,key:string,fallback:ResponsiveCount) {
    const value = node.props[key]
    return typeof value === 'number' || (value && typeof value === 'object' && !Array.isArray(value)) ? value as ResponsiveCount : fallback
  }
  numeric(node:FixtureNode,key:string,fallback:number) { return typeof node.props[key] === 'number' ? node.props[key] : fallback }
  slot(node:FixtureNode,key:string) { return node.slots?.[key] ?? [] }
  tone(node:FixtureNode): CmTone {
    const tone = node.props['tone'] as CmTone
    return tones.includes(tone) ? tone : 'default'
  }
  variant(node:FixtureNode): CmButtonVariant {
    const variant = node.props['variant'] as CmButtonVariant
    return variants.includes(variant) ? variant : 'solid'
  }
  buttonSize(node: FixtureNode) {
    const size = node.props['size']
    return size === 'xs' || size === 'sm' || size === 'lg' || size === 'xl' ? size : 'md'
  }
  name(name:string) { return name.replace(/([a-z0-9])([A-Z])/g,'$1-$2').replace(/([a-z])(\d)/g,'$1-$2').toLowerCase() }
  wrapper(node:FixtureNode) {
    if (node.tag === 'CmRow' || node.tag === 'CmButtonGroup') return 'cm-row cm-layout-wrap'
    if (node.tag === 'CmGrid' || node.tag === 'CmGridContainer') return 'aurora-catalog-grid'
    if (['CmCard','CmPanel','CmBox','CmWorkbench'].includes(node.tag)) return 'aurora-card aurora-card-body cm-stack'
    return 'cm-stack'
  }
  gap(node:FixtureNode) {
    const gap = this.string(node,'gap')
    return ['xs','sm','md','lg','xl'].includes(gap) ? 'var(--space-'+gap+')' : 'var(--space-sm)'
  }
}
