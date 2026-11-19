import { NgTemplateOutlet } from '@angular/common'
import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, signal, viewChild } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import {
  CmBarChart, CmButton, CmCard, CmColumn, CmComparisonLineChart, CmDataTable, CmDonutChart, CmEmpty, CmForm, CmFormBody,
  CmGridContainer, CmIcon, CmIconBadge, CmLineChart, CmLink, CmMetricCard, CmMetricGrid, CmNativeInput, CmNativeSelect,
  CmPageHeader, CmProgress, CmRow, CmSectionHeader, CmStack, CmTableRow, CmText, CmToastService,
} from '@cosmemilton/ui-angular'
import { OperationalData } from './operational-data'
import { Operations } from './operations'
import { categories, categoryRoot, normalizeSearch } from './navigation'
import { CrmClient, CrmOpportunity, OpportunityStage, clientStatus, formatCrmCurrency, formatCrmShortDate, newCrmId, opportunityStages } from './reference/crm'
import { DashboardPeriod, dashboardPeriods, exportDashboardMetrics, formatCurrency, formatNumber, getDashboardMetrics, periodOptions } from './reference/dashboard'
import { dashboardCharts } from './reference/dashboardCharts'
import { DashboardSection, getDomainDashboard } from './reference/domainDashboards'
import { OrderStatus, formatMoney, orderStatuses, orderTotal } from './reference/erp'
import { EntryKind, entryKindLabels, financeBalance, financeDate, financeMoney, financeStatus, sumFinance } from './reference/financeiro'
import { ListingColumn, ListingRow, filterListing, getListing } from './reference/listings'
import { getCashFlow, getSchedule, horizonOptions } from './reference/specialViews'
import { OrderStatus as ServiceStatus, compareAppointments, displayDate, emptyOrder, localDate, orderCode, statusTones, statuses, technicians } from './reference/servicos'

type EditKind = 'edit-client' | 'select-order' | 'adjust-stock' | 'settle-entry' | 'edit-service-order' | 'new-opportunity' | 'new-entry' | 'schedule'
type Option = { value: string; label: string }
type Field = { name: string; label: string; value?: string | number; type?: 'email' | 'number' | 'date' | 'time'; options?: Option[]; min?: string; step?: string; required?: boolean }
type Editor = { kind: EditKind; id?: string | number; title: string; description?: string; fields: Field[] }

function options(values: readonly string[]): Option[] { return values.map(value => ({value,label:value})) }
function mapRows(rows: ListingRow[]): CmTableRow[] {
  return rows.map(row => ({
    id: row.id,
    cells: Object.fromEntries(Object.entries(row.cells).map(([key, cell]) => [
      key, { ...cell, label: String(cell.text) },
    ])),
  }))
}
function mapColumns(columns: ListingColumn[]): CmColumn[] {
  return columns.map(column => ({ id: column.key, label: column.header, align: column.align, sortable: column.sortable }))
}
const orderOptions = Object.entries(orderStatuses).map(([value, item]) => ({ value, label:item.label }))
const clientOptions = Object.entries(clientStatus).map(([value, item]) => ({ value, label:item.label }))
const entryOptions = Object.entries(entryKindLabels).map(([value, label]) => ({value,label}))

@Component({
  selector: 'aurora-feature-page',
  imports: [NgTemplateOutlet, RouterLink, CmBarChart, CmButton, CmCard, CmComparisonLineChart, CmDataTable, CmDonutChart, CmEmpty, CmForm, CmFormBody,
    CmGridContainer, CmIcon, CmIconBadge, CmLineChart, CmLink, CmMetricCard, CmMetricGrid, CmNativeInput, CmNativeSelect,
    CmPageHeader, CmProgress, CmRow, CmSectionHeader, CmStack, CmText, Operations],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './feature-page.html',
  host: { style: 'display:contents' },
})
export class FeaturePage {
  readonly data = inject(OperationalData)
  private readonly activated = inject(ActivatedRoute)
  protected readonly router = inject(Router)
  private readonly toast = inject(CmToastService)
  readonly path = this.activated.snapshot.data['path'] as string
  readonly queryParams = toSignal(this.activated.queryParamMap, {initialValue:this.activated.snapshot.queryParamMap})
  readonly query = signal('')
  readonly status = signal('')
  private readonly serviceListing = this.path === '/app/servicos/ordens'
  protected readonly listingStatus = computed(() => this.serviceListing
    ? statuses.find(value => value === this.queryParams().get('situacao')) ?? '' : this.status())
  readonly entryKind = signal('')
  readonly entryKinds = entryOptions
  readonly financeListing = this.path === '/app/financeiro/lancamentos'
  readonly listingPageSize = ['/app/crm/clientes', '/app/erp/estoque', '/app/servicos/ordens'].includes(this.path) ? 0 : 10
  readonly editor = signal<Editor | null>(null)
  readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('editorDialog')
  readonly columnsMenu = signal(false)
  readonly visibleColumns = signal<Readonly<Record<string, boolean>>>({})
  readonly period = signal<DashboardPeriod>(30)
  readonly dashboardMetrics = computed(() => getDashboardMetrics(this.period()).map(item => ({ ...item, change: {
    value: item.trend, formattedValue: formatNumber.format(Math.abs(item.trend)) + item.unit, label: 'vs. período anterior',
  } })))
  readonly periodInfo = computed(() => dashboardPeriods[this.period()])
  readonly periods = periodOptions
  readonly currency = formatCurrency
  readonly overviewChart = computed(() => dashboardCharts(this.period()))
  readonly overviewIcons = ['wallet','users-round','shopping-bag','target']
  readonly shortcuts = [
    {label:'Oportunidades',area:'CRM',href:'/app/crm/oportunidades',icon:'target',tone:'primary'},
    {label:'Pedidos',area:'ERP',href:'/app/erp/pedidos',icon:'shopping-bag',tone:'success'},
    {label:'Lançamentos',area:'Financeiro',href:'/app/financeiro/lancamentos',icon:'receipt-text',tone:'info'},
    {label:'Ordens de serviço',area:'Serviços',href:'/app/servicos/ordens',icon:'clipboard-list',tone:'warning'},
  ]
  readonly day = signal(localDate())
  readonly technician = signal('')
  readonly projection = signal(30)
  readonly technicians = technicians
  readonly categories = categories
  readonly categoryRoot = categoryRoot
  readonly stageOptions = opportunityStages
  readonly money = financeMoney
  protected readonly financeChartTooltip = (point: { label: string; value: number }) => `${point.label}: ${financeMoney(point.value)}`
  readonly crmCurrency = formatCrmCurrency
  readonly crmDate = formatCrmShortDate
  readonly dateLabel = displayDate
  readonly number = formatNumber
  readonly initialListing = computed(() => getListing(this.path, this.data.dashboardSources()))
  readonly filteredListing = computed(() => {
    const listing = this.initialListing()
    if (!listing) return []
    const matches = filterListing(listing, this.query(), this.listingStatus())
    const kind = this.entryKind()
    if (!this.financeListing || !kind) return matches
    const ids = new Set(this.data.entries.value().filter(entry => entry.kind === kind).map(entry => entry.id))
    return matches.filter(record => ids.has(String(record.id)))
  })
  readonly listingSummary = computed(() => {
    const listing = this.initialListing()
    const count = this.filteredListing().length
    if (!listing) return ''
    if (this.path === '/app/erp/pedidos') return count + (count === 1 ? ' pedido encontrado' : ' pedidos encontrados')
    if (this.path === '/app/erp/estoque') return count + (count === 1 ? ' produto encontrado' : ' produtos encontrados')
    return count + ' de ' + listing.rows.length + ' ' + listing.recordName
  })
  readonly tableRows = computed(() => mapRows(this.filteredListing()))
  readonly tableColumns = computed(() => mapColumns(this.initialListing()?.columns.filter(column => this.visibleColumns()[column.key] ?? !column.defaultHidden) ?? []))
  readonly domain = computed(() => getDomainDashboard(this.path, this.data.dashboardSources()))
  readonly selectedOrder = computed(() => this.data.orders.value().find(row => row.id === this.queryParams().get('pedido')))
  readonly orderItemColumns: CmColumn[] = [
    {id:'item',label:'Item'}, {id:'quantity',label:'Quantidade',align:'right'}, {id:'unit',label:'Valor unitário',align:'right'}, {id:'subtotal',label:'Subtotal',align:'right'},
  ]
  readonly orderItemRows = computed(() => this.selectedOrder()?.items.map((item,index) => ({
    id:index, cells:{ item:item.name,quantity:item.quantity,unit:formatMoney(item.unitPrice),subtotal:formatMoney(item.quantity*item.unitPrice) },
  })) ?? [])
  readonly schedule = computed(() => getSchedule(this.data.serviceOrders.value(), this.day(), this.technician()))
  readonly scheduleColumns = computed(() => mapColumns(this.schedule().columns))
  readonly scheduleRows = computed(() => mapRows(this.schedule().rows))
  readonly nextService = computed(() => this.data.serviceOrders.value().find(order => order.status === 'Aberta')
    ?? this.data.serviceOrders.value().find(order => order.status !== 'Concluída'))
  readonly visibleDeals = computed(() => {
    const query = normalizeSearch(this.query())
    return this.data.opportunities.value().filter(deal => {
      const company = this.data.clients.value().find(client => client.id === deal.clientId)?.company
      return (!this.status() || this.status() === deal.owner) && normalizeSearch(deal.title + ' ' + deal.owner + ' ' + company).includes(query)
    })
  })
  readonly owners = computed(() => [...new Set(this.data.opportunities.value().map(deal => deal.owner))].sort())
  readonly cashFlow = computed(() => getCashFlow(this.data.entries.value(), this.projection()))
  readonly financeRows = computed(() => mapRows(this.cashFlow().rows))
  readonly financeColumns = computed(() => mapColumns(this.cashFlow().columns).map(column => ({...column, sortable:false})))
  readonly horizonOptions = horizonOptions
  readonly listingAction = computed(() => {
    if (this.path === '/app/crm/clientes') return {kind:'edit-client' as const,label:'Novo cliente',icon:'user-round-plus'}
    if (this.path === '/app/financeiro/lancamentos') return {kind:'new-entry' as const,label:'Novo lançamento',icon:'plus'}
    if (this.path === '/app/servicos/ordens') return {kind:'edit-service-order' as const,label:'Nova ordem de serviço',icon:'plus'}
    return null
  })

  constructor() {
    effect(() => {
      const id = this.queryParams().get('ordem')
      if (!id) return
      if (this.path === '/app/servicos/ordens') this.open('edit-service-order',id === 'nova' ? undefined : Number(id))
      if (this.path === '/app/servicos/agenda' && Number(id)) this.open('schedule',Number(id))
    })
    effect(() => {
      const editor = this.editor()
      const dialog = this.dialog()?.nativeElement
      if (editor && dialog && !dialog.open) dialog.showModal()
    })
  }

  setColumn(column: ListingColumn, event: Event) {
    const checked = (event.target as HTMLInputElement).checked
    this.visibleColumns.update(value => ({...value, [column.key]: checked}))
  }
  tableAction(event: { action: string; row: CmTableRow }) {
    if (event.action === 'select-order') {
      void this.router.navigate([], {relativeTo:this.activated, queryParams:{pedido:event.row.id}, queryParamsHandling:'merge'})
      return
    }
    this.open(this.path === '/app/servicos/agenda' ? 'schedule' : event.action as EditKind, event.row.id)
  }

  open(kind: EditKind, id?: string | number) {
    let editor: Editor | undefined
    switch (kind) {
      case 'edit-client': {
        const client = this.data.clients.value().find(item => item.id === id)
        editor = {kind,id:client?.id,title:client?'Editar cliente':'Novo cliente',description:'Preencha os dados de contato e a situação do relacionamento.',fields:[
          {name:'name',label:'Nome completo',value:client?.name},{name:'company',label:'Empresa',value:client?.company},
          {name:'email',label:'E-mail',type:'email',value:client?.email},{name:'city',label:'Cidade',value:client?.city},
          {name:'status',label:'Situação',options:clientOptions,value:client?.status ?? 'active'},
        ]}
        break
      }
      case 'select-order': {
        const order = this.data.orders.value().find(item => item.id === id)
        if (order) editor = {kind,id,title:'Alterar status do pedido #' + order.id,description:order.customer,fields:[
          {name:'status',label:'Situação',options:orderOptions,value:order.status},
        ]}
        break
      }
      case 'adjust-stock': {
        const item = this.data.inventory.value().find(item => item.sku === id)
        if (item) editor = {kind,id,title:'Ajustar estoque',description:item.name + ' · ' + item.sku + ' · ' + item.quantity + ' em estoque',fields:[
          {name:'operation',label:'Movimentação',options:[{value:'add',label:'Entrada'},{value:'remove',label:'Saída'}],value:'add'},
          {name:'quantity',label:'Quantidade',type:'number',min:'1',step:'1'},
        ]}
        break
      }
      case 'settle-entry': {
        const item = this.data.entries.value().find(item => item.id === id)
        if (item) editor = {kind,id,title:item.kind === 'entrada' ? 'Confirmar recebimento' : 'Confirmar pagamento',
          description:item.description + ' · ' + item.contact + ' · ' + financeMoney(item.cents),fields:[
            {name:'date',label:'Data da baixa',type:'date',value:financeDate()},
          ]}
        break
      }
      case 'new-entry':
        editor = {kind,title:'Novo lançamento',fields:[
          {name:'kind',label:'Tipo do lançamento',options:entryOptions,value:'entrada'}, {name:'description',label:'Descrição'},
          {name:'contact',label:'Contato'}, {name:'category',label:'Categoria'},
          {name:'value',label:'Valor em reais',type:'number',min:'.01',step:'.01'}, {name:'dueDate',label:'Vencimento',type:'date',value:financeDate()},
        ]}
        break
      case 'edit-service-order':
      case 'schedule': {
        const order = this.data.serviceOrders.value().find(item => item.id === id)
        const scheduleFields: Field[] = [
          {name:'technician',label:'Técnico',options:options(technicians),value:order?.technician},
          {name:'date',label:'Data da visita',type:'date',value:order?.date || localDate()},
          {name:'time',label:'Horário',type:'time',value:order?.time || '09:00'},
        ]
        editor = kind === 'schedule' && order ? {kind,id,title:order.status === 'Aberta' ? 'Agendar visita' : 'Reagendar visita',
          description:orderCode(order.id) + ' · ' + order.service,fields:scheduleFields} : {
          kind:'edit-service-order',id:order?.id,title:order?'Editar ordem de serviço':'Nova ordem de serviço',fields:[
            {name:'service',label:'Serviço',value:order?.service},{name:'client',label:'Cliente',value:order?.client},
            {name:'status',label:'Situação',options:options(statuses),value:order?.status ?? 'Aberta'},
            ...scheduleFields.map(field => ({...field,required:false})),
          ],
        }
        break
      }
      case 'new-opportunity':
        editor = {kind,title:'Nova oportunidade',fields:[
          {name:'title',label:'Título'},
          {name:'clientId',label:'Empresa cliente',options:this.data.clients.value().map(client => ({value:client.id,label:client.company}))},
          {name:'value',label:'Valor em reais',type:'number',min:'.01',step:'.01'},
          {name:'expectedAt',label:'Previsão de fechamento',type:'date'},{name:'owner',label:'Responsável'},
        ]}
    }
    if (editor) this.editor.set(editor)
  }

  closeEditor() {
    const kind = this.editor()?.kind
    this.dialog()?.nativeElement.close()
    this.editor.set(null)
    if (kind === 'edit-service-order' || kind === 'schedule') {
      void this.router.navigate([], {relativeTo:this.activated, queryParams:{ordem:null}, queryParamsHandling:'merge', replaceUrl:true})
    }
  }

  save(event: Event, editor: Editor) {
    event.preventDefault()
    const form = event.currentTarget as HTMLFormElement
    const data = new FormData(form)
    const text = (name: string) => String(data.get(name) ?? '').trim()
    const decimal = (name: string) => Number(text(name))
    const id = editor.id
    let notice = 'Alterações salvas.'
    try {
      const missing = editor.fields.find(field => field.required !== false && !text(field.name))
      if (missing) {
        ;(form.elements.namedItem(missing.name) as HTMLElement | null)?.focus()
        throw new Error('Informe ' + missing.label.toLowerCase() + '.')
      }
      const invalid = editor.fields.find(field => (form.elements.namedItem(field.name) as HTMLInputElement | null)?.validity.valid === false)
      if (invalid) {
        ;(form.elements.namedItem(invalid.name) as HTMLElement | null)?.focus()
        throw new Error('Confira o campo ' + invalid.label.toLowerCase() + '.')
      }
      switch (editor.kind) {
        case 'edit-client': {
          const records = this.data.clients.value()
          const previous = records.find(item=>item.id===id)
          const next: CrmClient = {
            id: previous?.id ?? newCrmId(), name:text('name'), company:text('company'), email:text('email'),
            city:text('city'), status:text('status') as CrmClient['status'], createdAt:previous?.createdAt ?? localDate(),
          }
          this.data.clients.save(previous ? records.map(item => item.id === id ? next : item) : [next,...records])
          notice = previous ? 'Cliente atualizado.' : 'Cliente cadastrado.'
          break
        }
        case 'select-order':
          this.data.orders.save(this.data.orders.value().map(order=>order.id===id?{...order,status:text('status') as OrderStatus}:order))
          notice = 'Status do pedido atualizado.'
          break
        case 'adjust-stock': {
          const q = decimal('quantity') * (text('operation') === 'remove' ? -1 : 1)
          const product = this.data.inventory.value().find(item => item.sku === id)
          if (!product || !Number.isInteger(q) || !q || product.quantity + q < 0) throw new Error('Informe uma quantidade válida para o estoque disponível.')
          this.data.inventory.save(this.data.inventory.value().map(item=>item.sku===id?{...item,quantity:item.quantity+q}:item))
          notice = 'Estoque atualizado.'
          break
        }
        case 'settle-entry':
          this.data.entries.save(this.data.entries.value().map(entry=>entry.id===id?{...entry,settledDate:text('date')}:entry))
          notice = 'Baixa registrada.'
          break
        case 'new-entry':
          this.data.entries.save([{id:newCrmId(),kind:text('kind') as EntryKind,description:text('description'),contact:text('contact'),
            category:text('category'),cents:Math.round(decimal('value')*100),dueDate:text('dueDate')},...this.data.entries.value()])
          notice = 'Lançamento cadastrado.'
          break
        case 'edit-service-order':
        case 'schedule': {
          const list = this.data.serviceOrders.value()
          const old = list.find(item=>item.id===id)
          const schedule = editor.kind === 'schedule'
          const next = {
            ...(old ?? emptyOrder()), id: old?.id ?? Math.max(1000,...list.map(item=>item.id))+1,
            status: schedule ? 'Agendada' as const : text('status') as ServiceStatus,
            service: schedule ? old?.service ?? '' : text('service'), client: schedule ? old?.client ?? '' : text('client'),
            technician:text('technician'),date:text('date'),time:text('time'),
          }
          if (next.status === 'Agendada' && (!next.technician || !next.date || !next.time)) throw new Error('Informe técnico, data e horário da visita.')
          this.data.serviceOrders.save(old ? list.map(item=>item.id===id?next:item) : [next,...list])
          if (schedule) this.day.set(next.date)
          notice = schedule ? 'Visita agendada.' : 'Ordem de serviço salva.'
          break
        }
        case 'new-opportunity':
          this.data.opportunities.save([{id:newCrmId(),title:text('title'),clientId:text('clientId'),value:decimal('value'),stage:'qualification',expectedAt:text('expectedAt'),owner:text('owner')}, ...this.data.opportunities.value()])
          notice = 'Oportunidade cadastrada.'
      }
      this.closeEditor()
      this.toast.show(notice,{tone:'success'})
    } catch (error) {
      this.toast.show(error instanceof Error ? error.message : 'Tente novamente.',{tone:'danger'})
    }
  }

  advance(deal: CrmOpportunity) {
    const next = opportunityStages[opportunityStages.findIndex(stage=>stage.id===deal.stage)+1]
    if (!next) return
    try {
      this.data.opportunities.save(this.data.opportunities.value().map(item=>item.id===deal.id?{...item,stage:next.id}:item))
      this.toast.show(next.id === 'won' ? 'Venda fechada.' : 'Etapa atualizada.',{tone:'success'})
    } catch(error) { this.toast.show(error instanceof Error ? error.message : 'Tente novamente.',{tone:'danger'}) }
  }

  company(deal: CrmOpportunity) { return this.data.clients.value().find(client=>client.id===deal.clientId)?.company ?? '' }
  deals(stage: OpportunityStage) { return this.visibleDeals().filter(deal=>deal.stage===stage) }
  orderMoney = formatMoney
  total = orderTotal
  orderStatus = orderStatuses
  sectionRows(section: DashboardSection) { return section.kind === 'table' ? mapRows(section.rows) : [] }
  sectionColumns(section: DashboardSection) { return section.kind === 'table' ? mapColumns(section.columns) : [] }
  updateDay(value: string) { this.day.set(value) }
  protected changeListingStatus(status: string) {
    if (this.serviceListing) {
      void this.router.navigate([], { relativeTo: this.activated, queryParams: { situacao: status || null }, queryParamsHandling: 'merge', replaceUrl: true })
    } else {
      this.status.set(status)
    }
  }
  today() { this.day.set(localDate()) }
  setPeriod(value: string) { this.period.set(Number(value) as DashboardPeriod) }
  setProjection(value: string) { this.projection.set(Number(value)) }
  exportMetrics() { exportDashboardMetrics(this.period()); this.toast.show('Indicadores exportados.', {tone:'success'}) }
}
