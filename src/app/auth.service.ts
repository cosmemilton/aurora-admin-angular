import { Injectable, signal } from '@angular/core'
import { createBrowserAuth, readSession } from './reference/auth'

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly state = signal(readSession())
  readonly user = this.state.asReadonly()
  readonly account = createBrowserAuth(user => this.state.set(user))
}
