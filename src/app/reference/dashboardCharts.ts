import { dashboardPeriods, formatCurrency, formatNumber, type DashboardPeriod } from './dashboard'

const shortDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })
const longDate = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', timeZone: 'UTC' })
const compactCurrency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 })
const periods = {
  7: { revenueCeiling: 16000, orderCeiling: 100, sessions: 12480, revenue: [6, 7, 5, 9, 8, 11, 12], orders: [4, 6, 5, 7, 6, 8, 9], shares: [40, 29, 19, 12] },
  30: { revenueCeiling: 60000, orderCeiling: 400, sessions: 48562, revenue: [10, 17, 14, 23, 19, 29, 26, 35], orders: [7, 11, 12, 16, 12, 19, 17, 23], shares: [43, 29, 17, 11] },
  90: { revenueCeiling: 120000, orderCeiling: 1000, sessions: 142853, revenue: [17, 23, 19, 25, 24, 27, 31, 38], orders: [12, 13, 17, 15, 18, 21, 22, 24], shares: [39, 28, 21, 12] },
}
const sources = [
  { label: 'Direto', tone: 'primary' }, { label: 'Busca orgânica', tone: 'primary-soft' },
  { label: 'Redes sociais', tone: 'success' }, { label: 'Referências', tone: 'warning' },
] as const

function distribute(total: number, weights: readonly number[]) {
  const sum = weights.reduce((total, weight) => total + weight, 0)
  let passed = 0
  let allocated = 0
  return weights.map(weight => {
    passed += weight
    const next = Math.round(total * passed / sum)
    const value = next - allocated
    allocated = next
    return value
  })
}

export function dashboardCharts(days: DashboardPeriod) {
  const { revenueCeiling, orderCeiling, sessions, revenue, orders, shares } = periods[days]
  const totals = dashboardPeriods[days]
  const volumes = distribute(totals.orders, orders)
  const traffic = distribute(sessions, shares)
  const points = distribute(totals.revenue, revenue).map((value, index) => {
    const day = 30 - (days - 1) + Math.round(index * (days - 1) / (revenue.length - 1))
    const date = new Date(Date.UTC(2026, 5, day))
    return { id: date.toISOString(), label: shortDate.format(date), description: longDate.format(date), left: value, right: volumes[index]! }
  })
  return {
    points,
    channels: sources.map((channel, index) => ({ ...channel, id: channel.label, value: traffic[index]! })),
    leftAxis: { label: 'Receita', domain: [0, revenueCeiling] as const, area: true, valueFormat: formatCurrency.format, tickFormat: compactCurrency.format },
    rightAxis: { label: 'Pedidos', domain: [0, orderCeiling] as const, tone: 'primary-soft', valueFormat: formatNumber.format },
  }
}
