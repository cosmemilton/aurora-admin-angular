import { DOCUMENT } from '@angular/common'
import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, signal, viewChild } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router'
import { filter, map } from 'rxjs'
import { CmButton, CmIcon, CmSidebar, CmThemeMenu, CmToastService } from '@cosmemilton/ui-angular'
import { AuthService } from './auth.service'
import { APP_PATHS } from './reference/paths'
import { catalog, catalogNav, categories, categoryRoot, navigation, normalizeSearch, searchPages } from './navigation'

@Component({
  selector: 'aurora-admin-layout',
  imports: [RouterOutlet, RouterLink, CmSidebar, CmButton, CmIcon, CmThemeMenu],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-layout.html',
  host: { style: 'display:contents', '(document:keydown)': 'keyboard($event)' },
})
export class AdminLayout {
  private readonly router = inject(Router)
  private readonly doc = inject(DOCUMENT)
  private readonly toast = inject(CmToastService)
  readonly auth = inject(AuthService)
  readonly searchShortcut = /^Mac/.test(this.doc.defaultView?.navigator.platform ?? '') ? '⌘ K' : 'Ctrl K'
  readonly url = toSignal(this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd), map(event => event.urlAfterRedirects)), { initialValue: this.router.url })
  readonly path = computed(() => this.url().split(/[?#]/)[0].replace(/\/+$/, '').toLowerCase())
  readonly inCatalog = computed(() => this.path() === categoryRoot || this.path().startsWith(categoryRoot + '/'))
  private readonly scrollAddress = computed(() => this.inCatalog() ? this.url().replace(/^([^?#]*)\?[^#]*/, '$1') : this.url())
  readonly groups = computed(() => this.inCatalog() ? catalogNav : navigation)
  readonly drawer = signal(false)
  readonly profile = signal(false)
  readonly query = signal('')
  readonly searchOpen = signal(false)
  readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput')
  readonly drawerPanel = viewChild<ElementRef<HTMLElement>>('drawerPanel')
  readonly drawerButton = viewChild<ElementRef<HTMLButtonElement>>('drawerButton')
  readonly profileButton = viewChild<ElementRef<HTMLButtonElement>>('profileButton')
  readonly searchItems = computed(() => {
    const query = normalizeSearch(this.query())
    if (!query) return []
    return searchPages.filter(item => normalizeSearch(item.label + ' ' + item.description + ' ' + (item.keywords ?? '')).includes(query)).slice(0,8)
  })
  readonly selection = signal(0)
  readonly crumb = computed(() => {
    const path = this.path()
    if (this.inCatalog()) {
      const component = catalog.find(item => item.path === path)
      const category = categories.find(item => path === categoryRoot + '/' + item.id)
      return { group: 'Componentes', icon: 'layers-3', root: categoryRoot, title: component?.label ?? category?.label ?? 'Catálogo', category: component?.category.label, categoryPath: component?.categoryPath }
    }
    const group = navigation.find(item => item.items.some(page => page.path === path))
    const page = group?.items.find(item => item.path === path)
    return { group: group?.label ?? 'Início', icon: group?.icon ?? 'home', root: group?.root ?? APP_PATHS.dashboard, title: page?.label ?? 'Página não encontrada', category: undefined, categoryPath: undefined }
  })

  constructor() {
    effect(() => {
      const address = this.scrollAddress()
      this.doc.title = this.crumb().title + ' | Aurora Ops'
      const fragment = address.split('#')[1]
      if (fragment) requestAnimationFrame(() => this.doc.getElementById(fragment)?.scrollIntoView())
      else this.doc.querySelector('.cm-app-shell__content')?.scrollTo({top: 0})
    })
  }

  showDrawer() {
    this.drawer.set(true)
    requestAnimationFrame(() => this.drawerPanel()?.nativeElement.focus())
  }

  closeDrawer() {
    if (!this.drawer()) return
    this.drawer.set(false)
    requestAnimationFrame(() => this.drawerButton()?.nativeElement.focus())
  }

  search(value: string) {
    this.query.set(value)
    this.selection.set(0)
    this.searchOpen.set(true)
  }

  searchKey(event: KeyboardEvent) {
    const size = this.searchItems().length
    if (event.key === 'ArrowDown' && size) {
      event.preventDefault()
      this.selection.update(value => (value + 1) % size)
    } else if (event.key === 'ArrowUp' && size) {
      event.preventDefault()
      this.selection.update(value => (value + size - 1) % size)
    } else if (event.key === 'Enter' && size) {
      event.preventDefault()
      const item = this.searchItems()[this.selection()]
      this.finishSearch()
      void this.router.navigateByUrl(item.path)
    }
  }

  finishSearch() {
    this.query.set('')
    this.searchOpen.set(false)
  }

  keyboard(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && !this.drawer()) {
      event.preventDefault()
      this.searchInput()?.nativeElement.focus()
    }
    if (event.key === 'Escape') {
      this.closeDrawer()
      this.searchOpen.set(false)
      if (this.profile()) {
        this.profile.set(false)
        this.profileButton()?.nativeElement.focus()
      }
    }
  }

  closeSearchOnBlur(event: FocusEvent) {
    const current = event.currentTarget as HTMLElement
    if (!current.contains(event.relatedTarget as Node | null)) this.searchOpen.set(false)
  }

  initials(name: string) {
    const words = name.trim().split(/\s+/)
    return (words.length > 1 ? words[0][0] + words[words.length - 1][0] : words[0].slice(0, 2)).toUpperCase()
  }

  logout() {
    try {
      this.auth.account.logout()
      void this.router.navigateByUrl(APP_PATHS.loginV1, {replaceUrl:true})
    } catch (error) {
      this.toast.show(error instanceof Error ? error.message : 'Tente novamente.', {title:'Não foi possível sair', tone:'danger'})
    }
  }
}
