import { DOCUMENT } from '@angular/common'
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { CmAuthActions, CmAuthField, CmAuthFooter, CmAuthLayout, CmButton, CmIcon, CmThemeMenu, CmThemeService, CmToastService } from '@cosmemilton/ui-angular'
import { authArtwork } from './auth-artwork'
import { AuthService } from './auth.service'
import { demoCredentials, minPasswordLength } from './reference/auth'
import { APP_PATHS, getLoginPath, getReturnPath } from './reference/paths'

type Mode = 'login-v1' | 'login-v2' | 'register' | 'recover-email' | 'recover-password' | 'set-password' | 'not-found'
const pages: Record<Mode, { title: string; description?: string; icon?: string }> = {
  'login-v1': { title: 'Entrar no Aurora Ops' },
  'login-v2': { title: 'Entre na sua conta' },
  register: { title: 'Crie sua conta', description: 'Cadastre seus dados para acessar o Aurora Ops neste navegador.', icon: 'user-round-plus' },
  'recover-email': { title: 'Recuperar e-mail', description: 'Informe o usuário para conferir uma parte do e-mail vinculado à conta neste navegador.', icon: 'contact-round' },
  'recover-password': { title: 'Recuperar senha', description: 'Informe o e-mail da sua conta para gerar um link de recuperação neste navegador.', icon: 'life-buoy' },
  'set-password': { title: 'Cadastrar nova senha', icon: 'life-buoy' },
  'not-found': { title: 'Página não encontrada', description: 'Confira o endereço ou volte para uma página do Aurora Ops.', icon: 'file-search' },
}
@Component({
  selector: 'aurora-auth-page',
  imports: [RouterLink, CmAuthActions, CmAuthField, CmAuthFooter, CmAuthLayout, CmButton, CmIcon, CmThemeMenu],
  templateUrl: './auth-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display:contents' },
})
export class AuthPage {
  readonly auth = inject(AuthService)
  readonly theme = inject(CmThemeService)
  private readonly router = inject(Router)
  private readonly route = inject(ActivatedRoute)
  private readonly document = inject(DOCUMENT)
  private readonly toast = inject(CmToastService)
  readonly mode = this.route.snapshot.data['mode'] as Mode
  readonly page = pages[this.mode]
  readonly paths = APP_PATHS
  readonly art = authArtwork
  readonly split = this.mode === 'login-v2'
  readonly login = this.mode === 'login-v1' || this.split
  readonly state = this.router.currentNavigation()?.extras.state ?? this.document.defaultView?.history.state ?? {}
  readonly accountState = { ...this.state, loginVersion: this.split ? 'LoginV2' : 'LoginV1' }
  readonly prefilledIdentifier = typeof this.state['identifier'] === 'string' ? this.state['identifier'] : undefined
  readonly alternate = this.split ? APP_PATHS.loginV1 : APP_PATHS.loginV2
  readonly back = getLoginPath(this.state)
  readonly demo = demoCredentials
  readonly loading = signal(false)
  readonly invalid = signal('')
  readonly masked = signal<string | null>(null)
  readonly resetLink = signal<string | null>(null)
  readonly token = this.route.snapshot.queryParamMap.get('token') ?? ''
  readonly tokenValid = signal(this.mode === 'set-password' && this.auth.account.canResetPassword(this.token))
  readonly passwordHint = 'Use uma senha com pelo menos ' + minPasswordLength + ' caracteres.'
  readonly submitLabel: Partial<Record<Mode, string>> = {
    register: 'Criar conta', 'recover-email': 'Consultar e-mail', 'recover-password': 'Gerar link de recuperação', 'set-password': 'Salvar nova senha',
  }

  constructor() {
    this.document.title = (this.login ? this.split ? 'LoginV2' : 'LoginV1' : this.page.title) + ' | Aurora Ops'
  }

  description() {
    if (this.mode !== 'set-password') return this.page.description ?? ''
    return this.tokenValid()
      ? 'Defina a senha que você vai usar para entrar na sua conta.'
      : 'Solicite um link válido de recuperação para cadastrar uma nova senha.'
  }

  clear() {
    this.invalid.set('')
    this.masked.set(null)
    this.resetLink.set(null)
  }

  async submit(event: Event) {
    event.preventDefault()
    if (this.loading()) return
    const form = event.currentTarget as HTMLFormElement
    const fields = new FormData(form)
    const value = (name: string) => String(fields.get(name) ?? '')
    const showInvalid = (name: string, message: string) => {
      this.invalid.set(name)
      ;(form.elements.namedItem(name) as HTMLInputElement | null)?.focus()
      this.toast.show(message, { tone: 'danger' })
    }
    const password = value('password')
    this.invalid.set('')
    this.loading.set(true)
    try {
      if (this.login) {
        const identifier = value('identifier').trim()
        if (!identifier) return showInvalid('identifier', 'Informe seu usuário ou e-mail.')
        if (!password) return showInvalid('password', 'Informe sua senha.')
        await this.auth.account.login(identifier, password)
        await this.router.navigateByUrl(getReturnPath(this.state), { replaceUrl: true })
      } else if (this.mode === 'register') {
        const name = value('name').trim()
        const email = value('email').trim()
        const username = value('username').trim()
        if (!name) return showInvalid('name', 'Informe seu nome.')
        if (!email || !(form.elements.namedItem('email') as HTMLInputElement)?.validity.valid) return showInvalid('email', 'Informe um endereço de e-mail válido.')
        if (!username) return showInvalid('username', 'Informe o nome de usuário.')
        if (password.length < minPasswordLength) return showInvalid('password', this.passwordHint)
        await this.auth.account.register({ name, email, username, password })
        this.toast.show('Conta criada. Entre com seu usuário e senha.', { tone: 'success' })
        await this.router.navigateByUrl(this.back, { replaceUrl: true, state: { ...this.state, identifier: username } })
      } else if (this.mode === 'recover-email') {
        const username = value('username').trim()
        if (!username) return showInvalid('username', 'Informe o nome de usuário cadastrado.')
        const email = this.auth.account.findRegisteredEmail(username)
        this.masked.set(email)
        if (!email) this.toast.show('Nenhuma conta com esse usuário foi encontrada neste navegador.', { tone: 'warning' })
      } else if (this.mode === 'recover-password') {
        const email = value('email').trim()
        if (!email || !(form.elements.namedItem('email') as HTMLInputElement)?.validity.valid) return showInvalid('email', 'Informe um endereço de e-mail válido.')
        const token = this.auth.account.requestPasswordReset(email)
        this.resetLink.set(token)
        this.toast.show(token ? 'Link de recuperação gerado.' : 'Nenhuma conta com esse e-mail foi encontrada neste navegador.', { tone: token ? 'success' : 'warning' })
      } else if (this.mode === 'set-password') {
        if (password.length < minPasswordLength) return showInvalid('password', this.passwordHint)
        if (password !== value('confirmation')) return showInvalid('confirmation', 'As senhas precisam ser iguais.')
        await this.auth.account.resetPassword(this.token, password)
        this.toast.show('Senha salva. Entre com a nova senha.', { tone: 'success' })
        await this.router.navigateByUrl(this.back, { replaceUrl: true, state: { ...this.state, identifier: '' } })
      }
    } catch (error) {
      this.toast.show(error instanceof Error ? error.message : 'Tente novamente em instantes.', {
        tone: 'danger',
        title: this.login ? 'Não foi possível entrar' : undefined,
      })
      if (this.login) (form.elements.namedItem('password') as HTMLInputElement | null)?.select()
      if (this.mode === 'set-password') this.tokenValid.set(this.auth.account.canResetPassword(this.token))
    } finally {
      this.loading.set(false)
    }
  }
}
