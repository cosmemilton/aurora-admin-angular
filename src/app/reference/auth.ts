import { storageKey } from '../storage-key'

export type User = { name: string; username: string; email?: string }
export type Registration = { name: string; email: string; username: string; password: string }
type PasswordRecord = { salt: string; passwordHash: string }
type Account = User & PasswordRecord & { email: string; usedResetToken?: string }
type ResetRequest = { token: string; expiresAt: number }

export const demoCredentials = { identifier: 'admin', password: 'admin' } as const
const admin: User = { name: 'Administrador', username: demoCredentials.identifier }
const accountsKey = 'aurora-auth-accounts'
const sessionKey = 'aurora-auth-session'
const resetDuration = 30 * 60 * 1000
export const minPasswordLength = 8
export const minUsernameLength = 3
export const maxUsernameLength = 30
export const usernamePattern = /^[a-z\d._-]+$/i
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const tokenPattern = /^[a-f\d]{64}$/
const saltPattern = /^[a-f\d]{32}$/
const storageError = 'Libere o armazenamento deste site no navegador e tente novamente.'
const invalidCredentials = 'Usuário, e-mail ou senha incorretos. Confira os dados e tente novamente.'
const invalidReset = 'O link de redefinição é inválido, expirou ou já foi usado. Solicite um novo link.'

function normalize(value: string) {
  return value.trim().toLowerCase()
}

function readStorage(storage: 'localStorage' | 'sessionStorage', key: string) {
  try {
    return window[storage].getItem(storageKey(key))
  } catch {
    throw new Error(storageError)
  }
}

function writeStorage(storage: 'localStorage' | 'sessionStorage', key: string, value: string | null) {
  try {
    const keyForBase = storageKey(key)
    if (value === null) window[storage].removeItem(keyForBase)
    else window[storage].setItem(keyForBase, value)
  } catch {
    throw new Error(storageError)
  }
}

function isAccount(value: unknown): value is Account {
  if (!value || typeof value !== 'object') return false
  const account = value as Partial<Account>
  return typeof account.name === 'string' && typeof account.username === 'string' &&
    typeof account.email === 'string' && emailPattern.test(account.email) &&
    typeof account.salt === 'string' && saltPattern.test(account.salt) &&
    typeof account.passwordHash === 'string' && tokenPattern.test(account.passwordHash)
}

function readAccounts(): Account[] {
  const stored = readStorage('localStorage', accountsKey)
  if (stored === null) return []

  try {
    const accounts: unknown = JSON.parse(stored)
    if (Array.isArray(accounts) && accounts.every(isAccount)) return accounts
  } catch {
    // A leitura também pode encontrar dados alterados fora da aplicação.
  }
  throw new Error('Os cadastros salvos neste navegador estão ilegíveis. Use outro perfil do navegador para continuar.')
}

function writeAccounts(accounts: Account[]) {
  writeStorage('localStorage', accountsKey, JSON.stringify(accounts))
}

async function updateAccounts(action: () => void) {
  // As abas da mesma origem podem concluir o cálculo da senha ao mesmo tempo.
  if (navigator.locks) await navigator.locks.request(storageKey(accountsKey), action)
  else action()
}

function userFromAccount({ name, username, email }: Account): User {
  return { name, username, email }
}

export function readSession(): User | null {
  try {
    const username = readStorage('sessionStorage', sessionKey)
    if (username === null) return null
    if (username === admin.username) return admin

    const account = readAccounts().find(entry => normalize(entry.username) === username)
    return account ? userFromAccount(account) : null
  } catch {
    return null
  }
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

function randomHex(length: number) {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('Abra a aplicação em um navegador atualizado para cadastrar ou recuperar uma conta.')
  }
  return toHex(globalThis.crypto.getRandomValues(new Uint8Array(length)))
}

async function hashPassword(password: string, salt: string) {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) throw new Error('Abra a aplicação em localhost ou HTTPS para usar contas cadastradas.')

  try {
    const saltBytes = Uint8Array.from(salt.match(/.{2}/g) ?? [], byte => Number.parseInt(byte, 16))
    const key = await subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
    const bits = await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations: 600_000 }, key, 256)
    return toHex(new Uint8Array(bits))
  } catch {
    throw new Error('O navegador não conseguiu processar a senha. Atualize a página e tente novamente.')
  }
}

async function createPasswordRecord(password: string): Promise<PasswordRecord> {
  if (password.length < minPasswordLength) throw new Error(`Use uma senha com pelo menos ${minPasswordLength} caracteres.`)
  const salt = randomHex(16)
  return { salt, passwordHash: await hashPassword(password, salt) }
}

function checkRegistration(accounts: Account[], username: string, email: string) {
  if (normalize(username) === admin.username || accounts.some(account => normalize(account.username) === normalize(username))) {
    throw new Error('Esse nome de usuário já está em uso. Escolha outro usuário.')
  }
  if (accounts.some(account => account.email === email)) {
    throw new Error('Esse e-mail já está cadastrado. Entre na conta ou solicite uma nova senha.')
  }
}

export async function register(values: Registration) {
  const { name, username, email } = { name: values.name.trim(), username: values.username.trim(), email: normalize(values.email) }
  if (!name) throw new Error('Informe seu nome.')
  if (!emailPattern.test(email)) throw new Error('Informe um endereço de e-mail válido.')
  if (username.length < minUsernameLength || username.length > maxUsernameLength || !usernamePattern.test(username)) {
    throw new Error(`Use de ${minUsernameLength} a ${maxUsernameLength} caracteres no usuário, com letras sem acentos, números, ponto, hífen ou sublinhado.`)
  }

  checkRegistration(readAccounts(), username, email)
  const password = await createPasswordRecord(values.password)
  await updateAccounts(() => {
    const accounts = readAccounts()
    checkRegistration(accounts, username, email)
    writeAccounts([...accounts, { name, username, email, ...password }])
  })
}

function resetKey(username: string) {
  return `aurora-auth-reset:${normalize(username)}`
}

function readReset(username: string): ResetRequest | null {
  const value = readStorage('localStorage', resetKey(username))
  if (value === null) return null

  try {
    const request = JSON.parse(value) as Partial<ResetRequest> | null
    if (typeof request?.token === 'string' && typeof request.expiresAt === 'number') {
      return { token: request.token, expiresAt: request.expiresAt }
    }
  } catch {
    // Um novo pedido de redefinição pode substituir dados ilegíveis.
  }
  return null
}

export function requestPasswordReset(value: string) {
  const email = normalize(value)
  if (!emailPattern.test(email)) throw new Error('Informe um endereço de e-mail válido.')

  const account = readAccounts().find(entry => entry.email === email)
  if (!account) return null

  const request: ResetRequest = { token: randomHex(32), expiresAt: Date.now() + resetDuration }
  writeStorage('localStorage', resetKey(account.username), JSON.stringify(request))
  return request.token
}

function resetMatches(account: Account, token: string) {
  if (account.usedResetToken === token) return false
  const request = readReset(account.username)
  return request?.token === token && request.expiresAt > Date.now()
}

function findResetAccount(token: string) {
  return tokenPattern.test(token) ? readAccounts().find(account => resetMatches(account, token)) : undefined
}

export function canResetPassword(token: string) {
  try {
    return Boolean(findResetAccount(token))
  } catch {
    return false
  }
}

export async function resetPassword(token: string, value: string) {
  if (!findResetAccount(token)) throw new Error(invalidReset)
  const password = await createPasswordRecord(value)

  await updateAccounts(() => {
    const accounts = readAccounts()
    const index = accounts.findIndex(account => resetMatches(account, token))
    if (index < 0) throw new Error(invalidReset)
    // A mesma gravação troca a senha e consome o link, preservando um eventual pedido posterior.
    accounts[index] = { ...accounts[index], ...password, usedResetToken: token }
    writeAccounts(accounts)
  })
}

export function findRegisteredEmail(username: string) {
  const identifier = normalize(username)
  if (!identifier) throw new Error('Informe o nome de usuário cadastrado.')
  const email = readAccounts().find(entry => normalize(entry.username) === identifier)?.email
  if (!email) return null

  const [local, domain] = email.split('@')
  return `${local[0]}•••@${domain}`
}

export function createBrowserAuth(onChange?: (user: User | null) => void) {
  let user = readSession()
  let loginAttempt = 0

  async function login(identifier: string, password: string) {
    const attempt = ++loginAttempt
    const username = normalize(identifier)
    if (!username || !password) throw new Error('Informe o usuário ou e-mail e a senha.')

    let nextUser: User
    if (username === admin.username) {
      if (password !== demoCredentials.password) throw new Error(invalidCredentials)
      nextUser = admin
    } else {
      const account = readAccounts().find(entry => normalize(entry.username) === username || entry.email === username)
      if (!account || await hashPassword(password, account.salt) !== account.passwordHash) throw new Error(invalidCredentials)

      const current = readAccounts().find(entry => entry.username === account.username)
      if (!current || current.salt !== account.salt || current.passwordHash !== account.passwordHash) {
        throw new Error('A senha da conta mudou. Tente entrar novamente com a senha atual.')
      }
      nextUser = userFromAccount(current)
    }

    if (attempt !== loginAttempt) throw new Error('A tentativa de acesso foi substituída. Tente novamente.')
    writeStorage('sessionStorage', sessionKey, normalize(nextUser.username))
    user = nextUser
    onChange?.(user)
    return user
  }

  function logout() {
    loginAttempt++
    writeStorage('sessionStorage', sessionKey, null)
    user = null
    onChange?.(user)
  }

  return {
    get user() { return user },
    login,
    logout,
    register,
    requestPasswordReset,
    canResetPassword,
    resetPassword,
    findRegisteredEmail,
  }
}
