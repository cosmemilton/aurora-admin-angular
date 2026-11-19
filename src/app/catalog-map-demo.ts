import { DOCUMENT } from '@angular/common'
import { ChangeDetectionStrategy, Component, ElementRef, ViewEncapsulation, inject, input, signal, viewChild } from '@angular/core'
import { CmToastService } from '@cosmemilton/ui-angular'
import { mapLayers, mountCatalogMap, type MapPoint } from './catalog-map'

@Component({
  selector: 'aurora-catalog-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrl: './catalog-map.css',
  template: `
    <div class='cm-stack' style='--cm-layout-gap:var(--space-sm)'>
      @if (interactive()) {
        <label class='aurora-native-field'>Fundo do mapa
          <select (change)='setLayer($event)'>
            @for (item of layers; track item.value) {
              <option [value]='item.value'>{{ item.label }}</option>
            }
          </select>
        </label>
      }
      <div class='aurora-catalog-map' [class.aurora-catalog-map--interactive]='interactive()'
        role='region' [attr.aria-label]='mapLabel()'>
        <div #canvas></div>
      </div>
      @if (interactive()) {
        <p class='cm-text cm-text--sm' aria-live='polite'>
          @if (selection(); as point) {
            {{ point.label ?? 'Ponto de visita' }} · {{ point.lat.toFixed(5) }}, {{ point.lng.toFixed(5) }}
          } @else {
            Selecione uma unidade no mapa ou clique para posicionar uma visita.
          }
        </p>
      }
    </div>
  `,
})
export class CatalogMapDemo {
  private readonly document = inject(DOCUMENT)
  private readonly toast = inject(CmToastService)
  private readonly canvas = viewChild.required<ElementRef<HTMLDivElement>>('canvas')
  private map: Awaited<ReturnType<typeof mountCatalogMap>>
  private disposed = false
  private layer: 'local' | 'ruas' = 'local'
  readonly interactive = input(false)
  readonly layers = mapLayers
  readonly selection = signal<MapPoint | null>(null)

  mapLabel() {
    return this.interactive() ? 'Seleção de ponto de visita' : 'Mapa esquemático das unidades do Aurora'
  }

  async ngAfterViewInit() {
    const asset = new URL('catalog-map-grid.png', this.document.baseURI)
    try {
      const next = await mountCatalogMap(this.canvas().nativeElement, asset.href,
        this.interactive() ? point => this.selection.set(point) : undefined)
      if (this.disposed) {
        next?.destroy()
        return
      }
      this.map = next
      this.map?.setLayer(this.layer)
    } catch {
      if (!this.disposed) this.toast.show('Não foi possível carregar o mapa.', { tone: 'danger' })
    }
  }

  setLayer(event: Event) {
    const select = event.target as HTMLSelectElement
    this.layer = select.value === 'ruas' ? 'ruas' : 'local'
    this.map?.setLayer(this.layer)
  }

  ngOnDestroy() {
    this.disposed = true
    this.map?.destroy()
  }
}
