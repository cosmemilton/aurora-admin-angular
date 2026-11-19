# Aurora Ops Admin para Angular

Template standalone do Aurora Ops. As telas usam Angular Router e a biblioteca `@cosmemilton/ui-angular` publicada no npm. Cada subdiretório mantém sua própria sessão, tema e dados de demonstração no navegador.

```sh
npm ci
npm start
```

Abra `http://localhost:4200/app/login-v1` ou `http://localhost:4200/app/login-v2`. O acesso de demonstração usa `admin` como usuário e senha. O seletor de tema fica no rodapé do login e no cabeçalho da área autenticada. A inscrição e a recuperação funcionam no mesmo navegador por localhost ou HTTPS. A redefinição mostra um link local de uso único.

Use `npm run build` para gerar `dist/aurora-admin-angular/browser`. Ao hospedar a pasta, devolva `index.html` para as rotas da aplicação. Para servir em um subdiretório, gere o build com o mesmo caminho usado pelo servidor, por exemplo `npm run build -- --base-href /aurora-admin-angular/`.

As rotas do catálogo mantêm os nomes e as categorias da referência. Os exemplos Angular incluem componentes interativos e composições estruturais. Quando um exemplo exige uma API React específica que ainda não foi portada, a página indica essa limitação.
