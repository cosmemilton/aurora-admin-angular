import { ChangeDetectionStrategy, Component, inject, provideZonelessChangeDetection } from '@angular/core'
import { bootstrapApplication } from '@angular/platform-browser'
import { provideRouter, RouterOutlet } from '@angular/router'
import { CM_THEME_SKIN, CM_THEME_STORAGE, CmThemeService, CmToastViewport } from '@cosmemilton/ui-angular'
import { routes } from './app/routes'
import { storageKey } from './app/storage-key'

@Component({
  selector: 'aurora-root',
  imports: [RouterOutlet, CmToastViewport],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<router-outlet /><cm-toast-viewport />',
})
class AuroraRoot {
  constructor() { inject(CmThemeService) }
}

bootstrapApplication(AuroraRoot, {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    { provide: CM_THEME_STORAGE, useValue: storageKey('aurora-ops-theme') },
    { provide: CM_THEME_SKIN, useValue: 'aurora-ops' },
  ],
}).catch(error => console.error(error))
