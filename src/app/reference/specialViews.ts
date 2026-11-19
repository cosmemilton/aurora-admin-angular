import { financeBalance, financeCompactMoney, financeDate, financeDateLabel, financeMoney, financeShortDate, seedEntries, sumFinance, type FinanceEntry } from './financeiro'
import { compareAppointments, displayDate, initialOrders, localDate, orderCode, statusTones, technicians, type ServiceOrder } from './servicos'
import type { DashboardMetric } from './domainDashboards'
import type { ListingColumn, ListingRow } from './listings'

export const horizonOptions = [30, 60, 90].map(value => ({ value: String(value), label: `Próximos ${value} dias` }))

export function getCashFlow(entries: FinanceEntry[] = seedEntries, days = 30) {
  const horizon = [30, 60, 90].includes(days) ? days : 30
  const today = financeDate()
  const end = financeDate(horizon - 1)
  const realized = financeBalance(entries)
  const pending = entries.filter(entry => !entry.settledDate)
  const overdue = pending.filter(entry => entry.dueDate < today)
  const included = pending.filter(entry => entry.dueDate <= end)
  const inflow = sumFinance(included, 'entrada')
  const outflow = sumFinance(included, 'saida')
  const forecast = []
  let balance = realized

  for (let offset = 0; offset < horizon; offset += 7) {
    const start = financeDate(offset)
    const last = financeDate(Math.min(offset + 6, horizon - 1))
    const due = pending.filter(entry => entry.dueDate <= last && (offset === 0 || entry.dueDate >= start))
    const incoming = sumFinance(due, 'entrada')
    const outgoing = sumFinance(due, 'saida')
    const opening = balance
    balance += incoming - outgoing
    forecast.push({ start, end: last, opening, inflow: incoming, outflow: outgoing, balance })
  }

  const lowest = forecast.reduce((candidate, week) => week.balance < candidate.balance ? week : candidate, forecast[0])
  const metrics: DashboardMetric[] = [
    { title: 'Saldo realizado', value: financeMoney(realized), description: 'Movimentações já liquidadas', icon: 'wallet', tone: 'default' },
    { title: 'Entradas previstas', value: financeMoney(inflow), description: `No horizonte de ${horizon} dias`, icon: 'arrow-down-left', tone: 'success' },
    { title: 'Saídas previstas', value: financeMoney(outflow), description: `No horizonte de ${horizon} dias`, icon: 'arrow-up-right', tone: 'warning' },
    { title: 'Saldo ao fim do período', value: financeMoney(realized + inflow - outflow), description: `Projeção em ${financeDateLabel(end)}`, icon: 'chart-no-axes-combined', tone: 'primary', variant: 'gradient' },
  ]
  const columns: ListingColumn[] = [
    { key: 'start', header: 'Semana' },
    { key: 'opening', header: 'Saldo inicial', align: 'right' },
    { key: 'inflow', header: 'Entradas previstas', align: 'right' },
    { key: 'outflow', header: 'Saídas previstas', align: 'right' },
    { key: 'balance', header: 'Saldo final', align: 'right' },
  ]
  const rows: ListingRow[] = forecast.map(week => ({
    id: week.start, status: '', search: '', cells: {
      start: { text: `${financeShortDate(week.start)} a ${financeShortDate(week.end)}` },
      opening: { text: financeMoney(week.opening) }, inflow: { text: financeMoney(week.inflow) },
      outflow: { text: financeMoney(week.outflow) }, balance: { text: financeMoney(week.balance) },
    },
  }))

  return {
    title: 'Fluxo de caixa',
    description: 'Veja o saldo acumulado se os recebimentos e pagamentos em aberto forem liquidados no vencimento.',
    action: { label: 'Ver lançamentos', href: '/app/financeiro/lancamentos' },
    metrics, columns, rows,
    chart: { title: 'Evolução do saldo previsto',
      description: 'Saldo no fim de cada semana, com os lançamentos em atraso na primeira semana.', height: 210,
      points: forecast.map(week => ({ label: financeShortDate(week.end), value: week.balance })), formatValue: financeCompactMoney },
    summary: [
      { label: 'Menor saldo semanal', value: financeMoney(lowest.balance), detail: `Em ${financeDateLabel(lowest.end)}` },
      { label: 'Contas vencidas a receber', value: financeMoney(sumFinance(overdue, 'entrada')) },
      { label: 'Contas vencidas a pagar', value: financeMoney(sumFinance(overdue, 'saida')) },
    ],
    listTitle: 'Movimentação semanal', listDescription: 'Valores previstos pela data de vencimento.',
  }
}

export function getSchedule(orders: ServiceOrder[] = initialOrders, date = localDate(), technician = '') {
  const matching = orders.filter(order => order.date && order.date === date && (!technician || order.technician === technician)).sort(compareAppointments)
  const available = orders.filter(order => order.status !== 'Concluída')
  const next = available.find(order => order.status === 'Aberta') ?? available[0]
  const columns: ListingColumn[] = [
    { key: 'time', header: 'Horário', sortable: true, hideable: false },
    { key: 'service', header: 'Serviço', sortable: true, hideable: false },
    { key: 'client', header: 'Cliente', sortable: true },
    { key: 'technician', header: 'Técnico', sortable: true },
    { key: 'status', header: 'Situação', sortable: true },
    { key: 'id', header: 'Ordem', hideable: false },
  ]
  const rows: ListingRow[] = matching.map(order => ({
    id: order.id, status: order.status, search: '', cells: {
      time: { text: order.time }, service: { text: order.service }, client: { text: order.client },
      technician: { text: order.technician || 'A definir' }, status: { text: order.status, tone: statusTones[order.status] },
      id: order.status === 'Concluída'
        ? { text: orderCode(order.id), href: `/app/servicos/ordens?ordem=${order.id}` }
        : { text: 'Reagendar', action: 'edit-service-order', actionLabel: `Reagendar ${orderCode(order.id)}` },
    },
  }))
  return {
    title: 'Agenda técnica', description: 'Distribua os atendimentos por técnico, data e horário.',
    listTitle: date ? `Visitas de ${displayDate(date)}` : 'Selecione a data da visita',
    listDescription: `${matching.length} ${matching.length === 1 ? 'atendimento' : 'atendimentos'}`,
    technicianOptions: [{ value: '', label: 'Toda a equipe' }, ...technicians.map(name => ({ value: name, label: name }))],
    columns, rows, next,
    emptyTitle: 'Agenda livre', emptyDescription: 'Nenhuma visita para a data e o técnico selecionados.',
  }
}
