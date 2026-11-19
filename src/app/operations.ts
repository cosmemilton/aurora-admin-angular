import { ChangeDetectionStrategy, Component } from '@angular/core'
import {
  CmAvatar, CmBarChart, CmCard, CmColumn, CmDataTable, CmGridContainer, CmIcon, CmIconBadge, CmMetricCard,
  CmMetricGrid, CmProgress, CmRatioBar, CmRow, CmSectionHeader, CmStack, CmSummaryList, CmTableRow, CmText, CmTimeline,
} from '@cosmemilton/ui-angular'
import { activity, activityDate, pipeline, progressPanels, recentOrderDate, recentOrders, secondaryMetrics, supportResponseTime, ticketStates } from './reference/dashboardOperations'

@Component({
  selector: 'aurora-operations',
  imports: [CmAvatar, CmBarChart, CmCard, CmDataTable, CmGridContainer, CmIcon, CmIconBadge, CmMetricCard, CmMetricGrid,
    CmProgress, CmRatioBar, CmRow, CmSectionHeader, CmStack, CmSummaryList, CmText, CmTimeline],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display:contents' },
  templateUrl: './operations.html',
})
export class Operations {
  readonly pipeline = pipeline
  readonly support = ticketStates
  readonly supportSummary = ticketStates.map(item => ({ ...item, emphasis: true }))
  readonly time = supportResponseTime
  readonly panels = progressPanels
  readonly activity = activity
  readonly date = activityDate
  readonly metrics = secondaryMetrics
  readonly columns: CmColumn[] = [
    {id:'id',label:'Pedido',sortable:true}, {id:'customer',label:'Cliente',sortable:true}, {id:'date',label:'Data',sortable:true},
    {id:'total',label:'Valor',align:'right',sortable:true}, {id:'status',label:'Situação',sortable:true},
  ]
  readonly rows: CmTableRow[] = recentOrders.map(order => ({
    id:order.id, cells:{
      id:'#'+order.id, customer:{label:order.customer,avatar:order.initials},
      date:{label:recentOrderDate.format(new Date(order.date+'T00:00:00Z')),sortValue:order.date},
      total:{label:new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(order.total),sortValue:order.total},
      status:{label:order.status,tone:order.tone},
    },
  }))
}
