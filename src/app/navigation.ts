import componentList from './reference/componentList.json'
import { CmNavGroup, CmNavItem } from '@cosmemilton/ui-angular'

export type NavigationGroup = CmNavGroup & { root: string }
const groups = [
  ['Dashboards', 'layout-dashboard', '/app/dashboard'], ['CRM', 'contact-round', '/app/dashboard/crm'],
  ['ERP', 'boxes', '/app/dashboard/erp'], ['Financeiro', 'wallet', '/app/dashboard/financeiro'],
  ['Serviços', 'wrench', '/app/dashboard/servicos'], ['Relatórios', 'file-bar-chart', '/app/relatorios/estoque'],
] as const
const rows = [
  ['/app/dashboard', 'Visão geral', 'Indicadores de toda a operação', 'home', 0],
  ['/app/dashboard/crm', 'CRM', 'Clientes e funil comercial', 'users-round', 0],
  ['/app/dashboard/erp', 'ERP', 'Pedidos e posição do estoque', 'factory', 0],
  ['/app/dashboard/financeiro', 'Financeiro', 'Recebimentos, pagamentos e saldo', 'landmark', 0],
  ['/app/dashboard/servicos', 'Ordens de serviço', 'Atendimentos e equipe em campo', 'wrench', 0],
  ['/app/crm/clientes', 'Clientes', 'Cadastro e contatos de clientes', 'users-round', 1],
  ['/app/crm/oportunidades', 'Oportunidades', 'Negociação e etapas do funil de vendas', 'handshake', 1],
  ['/app/erp/pedidos', 'Pedidos', 'Pedidos de venda e expedição', 'shopping-bag', 2],
  ['/app/erp/estoque', 'Estoque', 'Produtos, saldos e movimentação', 'package', 2],
  ['/app/financeiro/lancamentos', 'Lançamentos', 'Contas a pagar e a receber', 'receipt-text', 3],
  ['/app/financeiro/fluxo-de-caixa', 'Fluxo de caixa', 'Entradas, saídas e saldo', 'chart-no-axes-combined', 3],
  ['/app/servicos/ordens', 'Ordens de serviço', 'Abertura e acompanhamento das OS', 'clipboard-list', 4],
  ['/app/servicos/agenda', 'Agenda técnica', 'Visitas agendadas por técnico', 'calendar-days', 4],
  ['/app/relatorios/estoque', 'Posição de estoque', 'Saldos, mínimos e reposição por produto', 'package', 5],
  ['/app/relatorios/financeiro', 'Lançamentos financeiros', 'Vencimentos, entradas, saídas e liquidações', 'receipt-text', 5],
  ['/app/relatorios/servicos', 'Ordens por técnico', 'Equipe, agendamentos e situação das ordens', 'clipboard-list', 5],
] as const
export const pages: CmNavItem[] = rows.map(([path, label, description, icon]) => ({path, label, description, icon}))
export const categoryRoot = '/app/componentes'
export const navigation: NavigationGroup[] = groups.map(([label, icon, root], index) => ({
  id: label, label, icon, root, items: pages.filter((_, position) => rows[position][4] === index),
}))
navigation.push({ id: 'catalog', label: 'Componentes', icon: 'layers-3', root: categoryRoot, direct: true,
  items: [{ path: categoryRoot, label: 'Catálogo', description: 'Exemplos dos componentes da cm-ui', icon: 'layers-3' }] })

export const categories = [
  { id: 'navegacao', label: 'Ações e navegação', icon: 'boxes', tone: 'info', description: 'Conecte páginas e organize comandos, menus e atalhos.' },
  { id: 'estrutura', label: 'Estrutura e layout', icon: 'layers-3', tone: 'primary', description: 'Monte páginas, painéis e grades que se adaptam ao espaço disponível.' },
  { id: 'formularios', label: 'Formulários', icon: 'clipboard-list', tone: 'success', description: 'Combine campos, filtros, validação e envio de dados.' },
  { id: 'feedback', label: 'Feedback e sobreposições', icon: 'life-buoy', tone: 'warning', description: 'Comunique o estado de uma tarefa e apresente detalhes sob demanda.' },
  { id: 'dados', label: 'Dados e visualização', icon: 'chart-no-axes-combined', tone: 'accent', description: 'Explore registros, indicadores, gráficos e séries temporais.' },
  { id: 'tema', label: 'Tema e aparência', icon: 'palette', tone: 'secondary', description: 'Experimente paletas, densidade e temas em áreas isoladas.' },
] as const
export type Category = (typeof categories)[number]
function nameSlug(name: string) {
  return name.slice(2).replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2').replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}
const collator = new Intl.Collator('pt-BR')
export const catalog = categories.flatMap(category => componentList[category.id].map(([name, label, description]) => {
  const slug = nameSlug(name)
  const categoryPath = categoryRoot + '/' + category.id
  return { name, label, description, slug, category, categoryPath, path: categoryPath + '/' + slug }
}).sort((a, b) => collator.compare(a.label, b.label)))
export type CatalogItem = (typeof catalog)[number]

export const catalogNav: CmNavGroup[] = [
  { id: 'catalog', label: 'Todos os componentes', icon: 'layers-3', direct: true, items: [{ path: categoryRoot, label: 'Todos os componentes' }] },
  ...categories.map(category => ({
    id: category.id, label: category.label, icon: category.icon,
    items: [
      { path: categoryRoot + '/' + category.id, label: 'Visão da categoria' },
      ...catalog.filter(item => item.category.id === category.id),
    ],
  })),
  { id: 'home', label: 'Voltar ao dashboard', icon: 'home', direct: true, items: [{ path: '/app/dashboard', label: 'Voltar ao dashboard' }] },
]

export const searchPages: (CmNavItem & { keywords?: string })[] = [
  ...pages,
  ...navigation.at(-1)!.items,
  ...categories.map(category => ({ path: categoryRoot + '/' + category.id, label: category.label, icon: category.icon, description: category.description })),
  ...[...catalog].sort((a,b) => a.name.localeCompare(b.name)).map(item => ({
    path: item.path, label: item.label, icon: item.category.icon,
    description: item.name + ' · ' + item.description, keywords: item.slug.replaceAll('-', ' '),
  })),
]

export function normalizeSearch(value: string) {
  return value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}
