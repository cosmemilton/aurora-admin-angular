import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import {
  CmButton, CmButtonGroup, CmCard, CmCol, CmDataTable, CmDropdownMenu, CmIcon, CmNativeSelect, CmPage,
  CmPageHeader, CmRow, CmStack, CmText, CmToastService, type CmColumn, type CmTableRow,
} from '@cosmemilton/ui-angular'
import { OperationalData } from './operational-data'
import { downloadReport, getReport, reportRows, reportTotals, type ReportFormat } from './reference/reports'

@Component({
  selector: 'aurora-report-page',
  imports: [CmButton, CmButtonGroup, CmCard, CmCol, CmDataTable, CmDropdownMenu, CmIcon, CmNativeSelect, CmPage,
    CmPageHeader, CmRow, CmStack, CmText],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  templateUrl: './report-page.html',
})
export class ReportPage {
  private readonly source = inject(OperationalData)
  private readonly toast = inject(CmToastService)
  private readonly path = inject(ActivatedRoute).snapshot.data['path'] as string
  protected readonly status = signal('')
  protected readonly page = signal(1)
  protected readonly exporting = signal(false)
  protected readonly pageSizes = [12, 24, 48]
  protected readonly formats = [
    { id: 'csv', label: 'Baixar CSV' },
    { id: 'json', label: 'Baixar JSON' },
  ]
  protected readonly report = computed(() => getReport(this.path, {
    inventory: this.source.inventory.value(), entries: this.source.entries.value(), orders: this.source.serviceOrders.value(),
  }))
  protected readonly options = computed(() => [
    { value: '', label: 'Todas as situações' },
    ...(this.report()?.statusOptions ?? []).map(label => ({ value: label, label })),
  ])
  private readonly filtered = computed(() => {
    const report = this.report()
    return report ? reportRows(report, this.status()) : []
  })
  protected readonly columns = computed<CmColumn[]>(() => (this.report()?.columns ?? []).map(column => ({
    id: column.key, label: column.header, align: column.align, sortable: false,
  })))
  protected readonly records = computed<CmTableRow[]>(() => {
    const columns = this.columns()
    return this.filtered().map(record => ({
      id: record.id,
      cells: Object.fromEntries(record.cells.map((cell, index) => [columns[index].id, cell.formatted || '—'])),
    }))
  })
  protected readonly totals = computed(() => {
    const report = this.report()
    return report ? reportTotals(report, this.filtered()) ?? null : null
  })
  protected readonly disabled = computed(() => this.exporting() || this.filtered().length === 0)

  protected changeStatus(value: string) {
    this.status.set(value)
    this.page.set(1)
  }

  protected selectFormat(format: string) {
    if (format === 'csv' || format === 'json') void this.exportFile(format)
  }

  protected async exportFile(format: ReportFormat) {
    const report = this.report()
    if (!report || this.disabled()) return
    this.exporting.set(true)
    try {
      await downloadReport(report, this.status(), format)
      this.toast.show(`Download de ${report.name} em ${format.toUpperCase()} iniciado.`, { tone: 'success' })
    } catch {
      this.toast.show(`Falha ao gerar o ${format.toUpperCase()}. Tente exportar novamente.`, { tone: 'danger' })
    } finally {
      this.exporting.set(false)
    }
  }
}
