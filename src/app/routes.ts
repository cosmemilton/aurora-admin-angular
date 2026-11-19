import { inject } from '@angular/core'
import { CanActivateFn, RedirectCommand, Router, Routes } from '@angular/router'
import { AuthService } from './auth.service'
import { APP_PATHS, getReturnPath } from './reference/paths'
import { catalog, categories, categoryRoot, pages } from './navigation'

const authPage = () => import('./auth-page').then(module => module.AuthPage)
const featurePage = () => import('./feature-page').then(module => module.FeaturePage)
const reportPage = () => import('./report-page').then(module => module.ReportPage)
const catalogPage = () => import('./catalog-page').then(module => module.CatalogPage)
const fromApp = (path: string) => path.slice('/app/'.length)

const protect: CanActivateFn = (_route, state) => {
  const router = inject(Router)
  return inject(AuthService).user() ? true : new RedirectCommand(
    router.parseUrl(APP_PATHS.loginV1), { replaceUrl:true, state:{returnTo:state.url} },
  )
}
const guest: CanActivateFn = () => {
  const router = inject(Router)
  if (!inject(AuthService).user()) return true
  const state = router.currentNavigation()?.extras.state ?? history.state
  return new RedirectCommand(router.parseUrl(getReturnPath(state)), {replaceUrl:true})
}

function oldLogin(destination: string): CanActivateFn {
  return (route) => {
    const router = inject(Router)
    return new RedirectCommand(router.createUrlTree([destination], {queryParams:route.queryParams,fragment:route.fragment ?? undefined}), {
      replaceUrl:true, state:router.currentNavigation()?.extras.state ?? history.state,
    })
  }
}

const adminPages: Routes = [
  ...pages.map(item => ({
    path: fromApp(item.path), data: { path: item.path },
    loadComponent: item.path.startsWith('/app/relatorios/') ? reportPage : featurePage,
  })),
  { path:'componentes', data:{path:categoryRoot}, loadComponent:catalogPage },
  ...categories.map(category => ({path:'componentes/' + category.id,data:{path:categoryRoot + '/' + category.id},loadComponent:catalogPage})),
  ...catalog.map(item => ({path:fromApp(item.path),data:{path:item.path},loadComponent:catalogPage})),
]

export const routes: Routes = [
  { path:'', pathMatch:'full', redirectTo:'app' },
  {
    path:'app', children:[
      { path:'', pathMatch:'full', redirectTo:'dashboard' },
      { path:'login/ilustrado', canActivate:[oldLogin(APP_PATHS.loginV2)], loadComponent:authPage,data:{mode:'login-v2'} },
      { path:'login', canActivate:[oldLogin(APP_PATHS.loginV1)], loadComponent:authPage,data:{mode:'login-v1'} },
      { path:'login-v1', canActivate:[guest], data:{mode:'login-v1'}, loadComponent:authPage },
      { path:'login-v2', canActivate:[guest], data:{mode:'login-v2'}, loadComponent:authPage },
      { path:'inscricao', canActivate:[guest], data:{mode:'register'}, loadComponent:authPage },
      { path:'recuperar-email', data:{mode:'recover-email'}, loadComponent:authPage },
      { path:'recuperar-senha', data:{mode:'recover-password'}, loadComponent:authPage },
      { path:'cadastro-de-senha', data:{mode:'set-password'}, loadComponent:authPage },
      { path:'nao-encontrado', data:{mode:'not-found'}, loadComponent:authPage },
      { path:'exemplo-isolado/:category/:slug/:mode', canActivate:[protect], data:{isolated:true}, loadComponent:catalogPage },
      { path:'', canActivateChild:[protect], loadComponent:() => import('./admin-layout').then(module => module.AdminLayout), children:adminPages },
      { path:'**', data:{mode:'not-found'}, loadComponent:authPage },
    ],
  },
  {
    path:'**', data:{mode:'not-found'}, loadComponent:authPage,
    canActivate:[
      (_route,state) => {
        const router = inject(Router)
        const legacy = /^\/(dashboard|crm|erp|financeiro|servicos|relatorios|componentes|exemplo-isolado)(\/|\?|#|$)/i.test(state.url)
        return new RedirectCommand(router.parseUrl(legacy ? '/app' + state.url : APP_PATHS.notFound),{replaceUrl:true})
      },
    ],
  },
]
