# Frontend — Campus Reservas

Aplicação Angular standalone para consulta de ambientes e demonstração do fluxo de reservas da UFLA. A interface usa Bootstrap 5 para a grade responsiva e utilitários, com SCSS próprio para os componentes do produto.

## Requisitos

- Node.js compatível com Angular 22
- npm
- Backend Django disponível em http://localhost:8000 quando as chamadas da API forem ativadas

## Executar localmente

```bash
npm ci
npm start
```

O servidor de desenvolvimento fica em http://localhost:4200/. O tema claro/escuro fica disponível no cabeçalho e a escolha é salva neste navegador.

## Build e verificações

```bash
npm run build
npm test
```

## Organização

```text
src/
├── app/
│   ├── core/       # serviços globais, incluindo tema
│   ├── features/   # funcionalidades por domínio
│   ├── shared/     # shell e componentes compartilhados
│   ├── app.config.ts
│   └── app.routes.ts
├── index.html
└── styles.scss
```

Bootstrap é carregado globalmente antes do tema e dos estilos do produto. O tema define as cores da página e informa Bootstrap pelo atributo data-bs-theme no elemento raiz.
