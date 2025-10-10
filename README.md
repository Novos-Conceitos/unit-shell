# @novos-conceitos/unit-shell

Script para Webflow que injeta navbar e footer da última unidade visitada, com cache (configurável por projeto), reescrita de âncoras locais e reexecução de interações do Webflow.

## Instalação
```bash
npm install @novos-conceitos/unit-shell
```

CDN via jsDelivr (última versão):
```html
<script src="https://cdn.jsdelivr.net/npm/@novos-conceitos/unit-shell@latest/dist/nc-unit-shell.min.js" defer></script>
```

## Uso no Webflow
Configure antes do `src`:
```html
<script>
  window.UnitShellConfig = {
    cacheVersion: 'proj-v1',
    cacheTTL: 1000 * 60 * 60 * 24 * 7,
    unitPathPrefix: (slug) => `/unidade/${slug}`
  };
</script>
<script src="https://cdn.jsdelivr.net/npm/@novos-conceitos/unit-shell@latest/dist/nc-unit-shell.min.js" defer></script>
```

## Build local
```bash
npm install
npm run build
```

## Publicação
```bash
npm login
npm run release:patch   # ou :minor / :major
```

## Arquivos gerados
- dist/nc-unit-shell.js (não minificado)
- dist/nc-unit-shell.min.js (minificado, padrão em CDNs)
