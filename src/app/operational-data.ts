import { Injectable, signal } from '@angular/core'
import { initialClients, initialOpportunities, storageKeys as crm } from './reference/crm'
import { demoInventory, demoOrders, storageKeys as erp } from './reference/erp'
import { seedEntries, storageKeys as finance } from './reference/financeiro'
import { initialOrders, storageKeys as service } from './reference/servicos'
import { storageKey } from './storage-key'

function stored<T>(key: string, seed: T) {
  const keyForBase = storageKey(key)
  let initial = seed
  try {
    const value = localStorage.getItem(keyForBase)
    if (value !== null) {
      const parsed: unknown = JSON.parse(value)
      if (Array.isArray(parsed)) initial = parsed as T
    }
  } catch { /* Use the original demonstration records. */ }
  const state = signal(initial)
  return {
    value: state.asReadonly(),
    save(records: T) {
      try { localStorage.setItem(keyForBase, JSON.stringify(records)) }
      catch { throw new Error('Libere o armazenamento deste site no navegador e tente novamente.') }
      state.set(records)
    },
  }
}

@Injectable({ providedIn: 'root' })
export class OperationalData {
  readonly clients = stored(crm.crmClients, initialClients)
  readonly opportunities = stored(crm.crmOpportunities, initialOpportunities)
  readonly orders = stored(erp.erpOrders, demoOrders)
  readonly inventory = stored(erp.erpInventory, demoInventory)
  readonly entries = stored(finance.financeEntries, seedEntries)
  readonly serviceOrders = stored(service.serviceOrders, initialOrders)

  dashboardSources() {
    return {
      clients: this.clients.value(), opportunities: this.opportunities.value(), orders: this.orders.value(),
      inventory: this.inventory.value(), entries: this.entries.value(), serviceOrders: this.serviceOrders.value(),
    }
  }
}
