# Frontend — Campus Reservas

Workspace inicial do frontend em Angular para a etapa de interface do projeto. Este scaffold define a base e o roteamento; ainda não contém telas de domínio, autenticação, chamadas à API ou regras de reserva. A tela inicial permanece como placeholder gerado pelo Angular CLI.

## Estrutura

```text
src/
├── app/
│   ├── core/       # serviços e configuração usados pela aplicação toda
│   ├── features/   # funcionalidades organizadas por domínio
│   ├── shared/     # componentes e utilitários reutilizáveis
│   ├── app.config.ts
│   ├── app.routes.ts
│   └── app.ts      # componente raiz
├── index.html
├── main.ts
└── styles.scss
```

As pastas `core`, `features` e `shared` começam vazias. Criar arquivos dentro delas quando houver uma funcionalidade concreta; em `features`, cada domínio poderá ter sua própria pasta, como `ambientes`, `equipamentos` e `reservas`.

## Executar localmente

```bash
npm ci
npm start
```

O servidor de desenvolvimento fica em `http://localhost:4200/`.

## Verificações

```bash
npm run build
npm test
```

O workspace usa Angular standalone, roteamento e SCSS, gerados pelo Angular CLI. Bootstrap 5 está previsto para a construção da interface, mas ainda não foi instalado ou aplicado. A integração com o backend Django será definida quando os endpoints forem implementados.
