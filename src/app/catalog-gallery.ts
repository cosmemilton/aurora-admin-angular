import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core'
import { CmButton, CmDialog, CmRow, CmStack, CmText } from '@cosmemilton/ui-angular'
import panels from './reference/catalogGallery.json'

@Component({
  selector: 'aurora-catalog-gallery',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CmButton, CmDialog, CmRow, CmStack, CmText],
  templateUrl: './catalog-gallery.html',
})
export class CatalogGallery {
  readonly advanced = input(false)
  readonly lightbox = input(false)
  protected readonly images = computed(() => this.advanced() ? panels : panels.slice(0, this.lightbox() ? 1 : 2))
  protected readonly selected = signal(0)
  protected readonly open = signal(false)
  protected readonly active = computed(() => this.images()[this.selected()] ?? panels[0]!)

  protected show(index: number) {
    this.selected.set(index)
    this.open.set(true)
  }

  protected move(direction: number) {
    const count = this.images().length
    this.selected.update(index => (index + direction + count) % count)
  }
}
