# Max LoL — Instruções do Projeto

## Idioma
- **Sempre responda em português do Brasil (pt-BR)**, independentemente do idioma da pergunta.
- Mensagens de commit, comentários no código e documentação também em português.
- A interface do site é em pt-BR — todo texto visível ao usuário deve estar em português.

## Stack
- **Next.js 15+** com App Router (`src/app/`)
- **TypeScript** estrito
- **CSS** global em `src/app/globals.css` (sem Tailwind)
- Hospedado no **Vercel** (`max-lol.vercel.app`)

## Estrutura
- `src/app/` — páginas e API routes (App Router)
- `src/components/` — componentes reutilizáveis
- `src/lib/` — utilitários: Riot API, Data Dragon, cache, tipos, grade

## Riot Games API
- Chave configurada em `.env` como `RIOT_API_KEY`
- Sem chave → usa dados mock de demonstração
- Rate limit respeitado automaticamente via `src/lib/riot.ts`

## Monetização (já ativa)
- **AdSense**: pub-5488213461319588 (Auto Ads + unidades manuais)
- **Ko-fi**: username `maxreneef`
- **Amazon Associates**: tag `maxlol-20`

## Convenções
- Use `@/` para imports absolutos (ex: `@/lib/riot`)
- Componentes cliente com `"use client"` quando usam estado/eventos
- Sempre rode `npm run build` após mudanças para verificar erros de compilação
