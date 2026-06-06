# Prompt — Nova Sessão Max LoL

## Contexto do projeto

**Max LoL** é um site de estatísticas de League of Legends focado no servidor BR1.
- URL produção: https://max-lol.vercel.app
- Repositório: https://github.com/maxreneef/max-lol
- Stack: Next.js 15 App Router, React 19, TypeScript, CSS puro (sem Tailwind)
- Deploy: Vercel (plano Hobby — timeout serverless 10 s)

---

## Estado atual (o que JÁ funciona)

### API Key
- `RIOT_API_KEY` configurada em `.env.local` e no Vercel (Production + Development)
- Key atual é de desenvolvimento (expira em 24 h) — sempre renovar no portal Riot

### Rota de partidas (`/api/champion/[champId]/matches`)
- Busca Challenger + GM do BR1 via leaderboard
- League entries agora têm `puuid` direto (sem lookup extra)
- Usa `?champion={numericId}` no match history para filtrar pelo campeão
- Batches de 5 requests paralelos com sleep 250 ms (= 20 req/s, respeita rate limit)
- Cache 30 minutos
- Retorna até 10 partidas reais com todos os campos:
  `spell1Id, spell2Id, primaryRuneId, runeSelections[], subSelections[], statShards[]`
  `item0–6, lane, cs, csPerMin, killParticipation, teamKills, gameDurationSeconds`

### Rota de build agregada (`/api/champion/[champId]/build`)
- Chama `/matches` internamente e agrega via `buildAggregator.ts`
- Retorna `hasRealData: true` quando há partidas reais
- Agrega: `summonerSpells`, `keystones`, `primaryStyles`, `subStyles`,
  `primarySlots[][]` (slots 1-3 da árvore primária), `subSlots[][]` (slots 0-1 da secundária),
  `coreItems`, `startingItems`, `boots`
- `minCount` adaptativo: 1 se < 10 partidas, 2 se >= 10

### Front-end (`ChampionPageClient.tsx`)
- Quando `hasRealData: true`: mostra ícones reais de runas via `runeMap` (DDragon)
- Seção secundária usa `subSlots` com ícones DDragon reais
- Tabela de partidas mostra: Jogador, Elo, Região, Resultado, KDA, CS/min, P/Kill%, Itens, Runas, Skills, Duração
- Indicador "✅ Dados REAIS da Riot API"
- Fallback para `mockChampData.ts` quando sem dados reais

### Outros arquivos relevantes
- `src/lib/buildAggregator.ts` — agrega partidas em build data
- `src/lib/riotIds.ts` — mapeia IDs de spells, rune trees, boots, itens iniciais
- `src/lib/ddragon.ts` — fetches DDragon, inclui `fetchRuneData()`
- `src/lib/cache.ts` — cache in-memory com TTL
- `src/lib/types.ts` — `PLATFORMS` (br1/kr/euw1/etc. → regional host)
- `src/app/layout.tsx` — AdSense afterInteractive (hydration fix aplicado)

---

## Requisitos NOVOS a implementar nesta sessão

### 1. Expandir cobertura do leaderboard: Diamond 4 → Challenger

**Motivação:** Hoje buscamos só Challenger + GM (~400 jogadores BR1). A maioria não joga Jayce, então encontramos poucos jogos. Expandindo para Diamond 4+ teremos dezenas de milhares de jogadores, muito mais chance de encontrar one-tricks de qualquer campeão.

**Problema técnico:** Diamond usa paginação (`/entries/{tier}/{division}?page=N`), Master/GM/Challenger não. Com dev key (100 req/2min), não é viável buscar todos os Diamond de uma vez.

**Solução recomendada — abordagem em duas fases:**

**Fase A (imediata):** Adicionar Master tier (tem `puuid` direto, 1 chamada) ao leaderboard atual.
```
Challenger (1 req) + GM (1 req) + Master (1 req) → ~1000 jogadores
```

**Fase B (melhor):** Para Diamond, usar paginação lazy — buscar Diamond 1 página por vez até encontrar jogadores suficientes do campeão, com cache de 1 hora.

```typescript
// Endpoint Diamond (com paginação)
// GET /lol/league/v4/entries/RANKED_SOLO_5x5/DIAMOND/I?page=1
// Cada página tem ~205 jogadores. PORÉM não retorna puuid — precisa de summoner lookup.
// Alternativa: usar master tier primeiro, só ir para diamond se não achar jogos suficientes.
```

**Recomendação prática para a sessão:**
1. Adicionar Master tier ao leaderboard (simples, mesmo endpoint pattern)
2. Para Diamond: buscar páginas 1-3 de Diamond I+II apenas (não tem puuid, precisa summoner lookup por player, mas pode ser feito em paralelo)
3. Adicionar `startTime` no match history para filtrar últimas 4 semanas

### 2. Filtrar por até 1 mês atrás

O endpoint de match history suporta `startTime` (epoch em segundos):
```
GET /lol/match/v5/matches/by-puuid/{puuid}/ids?champion=126&queue=420&count=10&startTime=EPOCH
```

**Implementação:**
```typescript
const oneMonthAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
const url = `${regHost}/lol/match/v5/matches/by-puuid/${puuid}/ids` +
  `?champion=${champNumId}&queue=420&count=10&startTime=${oneMonthAgo}`;
```

Aumentar `count` de 3 → 10 para capturar mais jogos por jogador dentro do mês.

### 3. Filtro por rota funcional

**Problema atual:** O filtro de rota (Todas/Top/Jungle/Mid/ADC/Suporte) no front-end existe mas NÃO filtra os dados da API — mostra as mesmas partidas independente da rota selecionada.

**Implementação correta:**

**a) Passar `lane` para a API:**
```typescript
// ChampionPageClient.tsx — no useEffect que busca matches:
const res = await fetch(`/api/champion/${champId}/matches?region=${region}&lane=${selectedLane}`);
```

**b) Receber e usar `lane` na rota:**
```typescript
// /api/champion/[champId]/matches/route.ts
const lane = req.nextUrl.searchParams.get("lane") ?? "";

// Ao verificar o participante na partida:
const part = info.participants.find((p) => {
  const champMatch = p.championName?.toLowerCase() === champId.toLowerCase();
  const laneMatch = !lane || lane === "Todas" || 
    p.teamPosition?.toUpperCase() === laneToTeamPosition(lane);
  return champMatch && laneMatch;
});
```

**c) Mapeamento de rota → teamPosition:**
```typescript
function laneToTeamPosition(lane: string): string {
  const map: Record<string, string> = {
    "Top": "TOP",
    "Jungle": "JUNGLE",
    "Mid": "MIDDLE",
    "ADC": "BOTTOM",
    "Suporte": "UTILITY",
  };
  return map[lane] ?? lane.toUpperCase();
}
```

**d) Invalidar cache quando lane mudar:**
```typescript
const cacheKey = `champion-matches-v3:${champId}:${region}:${lane}`;
```

**e) No front-end, re-buscar quando `selectedLane` mudar:**
```typescript
useEffect(() => {
  fetchReal(); // novo fetch quando lane/region muda
}, [buildData.champId, selectedLane, selectedRegion]);
```

### 4. Filtro por região funcional

**Problema atual:** O `RegionFilter` existe no UI mas o fetch sempre usa `region=br1` hardcoded.

**Implementação:**
- Ler a região selecionada do `RegionFilter` como estado (`selectedRegion`)
- Passar para os fetches: `/api/champion/${champId}/matches?region=${selectedRegion}&lane=${lane}`
- Passar também para `/api/champion/${champId}/build?region=${selectedRegion}`
- Invalidar cache quando região mudar

---

## Arquivos-chave a modificar

| Arquivo | O que mudar |
|---------|-------------|
| `src/app/api/champion/[champId]/matches/route.ts` | Adicionar Master tier, `startTime` 1 mês, parâmetro `lane`, filtro `teamPosition`, parâmetro `region` já funciona |
| `src/app/champion/[champId]/ChampionPageClient.tsx` | Passar `lane` e `region` nos fetches, re-fetch quando mudar, usar `selectedRegion` do RegionFilter |
| `src/lib/buildAggregator.ts` | Nada muda (já correto) |

---

## Comportamento esperado após implementação

1. Usuário acessa `/champion/Jayce?lane=Mid`
2. Front-end chama `/api/champion/Jayce/matches?region=br1&lane=Mid`
3. API busca jogadores Diamond I+ → GM → Challenger com `champion=126` no match history
4. De cada match encontrado, verifica se Jayce jogou com `teamPosition === "MIDDLE"`
5. Retorna apenas os matches válidos (pode ser 0 se Jayce raramente vai Mid em Diamond+)
6. Build tab mostra dados agregados só dessas partidas Mid
7. Filtrar por `region=kr` busca do Challenger coreano

---

## ⚠️ Avisos importantes

- **RIOT_API_KEY expira em 24 h** (key de desenvolvimento). Se `total: 0` com a key nova, renovar em https://developer.riotgames.com
- **Vercel timeout:** 10 segundos. Com mais tiers no leaderboard (Master), o tempo pode subir. Ajustar `BATCH` e `sleep` se necessário.
- **Diamond sem puuid:** Endpoint `/entries/{tier}/{division}` NÃO retorna `puuid` — precisa de `/summoner/v4/summoners/{summonerId}` extra por jogador. Isso dobra as chamadas para Diamond. Implementar só se o volume de Champion+GM+Master não for suficiente.
- **Cache:** Alterar o `cacheKey` quando mudar a lógica para evitar servir dados stale.
- **Mock data:** O fallback mock (`mockChampData.ts`) ainda é usado para Win Rate/Pick Rate/Ban Rate no header — esses dados também precisariam de uma fonte real no futuro.
- **Skill order:** A coluna "Skills" na tabela está vazia para a maioria das partidas. O campo `challenges.skillOrder` não é populado pela Riot em todos os patches. Para skill order real, é necessário o Match Timeline API (`/matches/{id}/timeline`) — uma chamada extra por partida. Perguntar ao usuário se quer implementar isso.

---

## Decisões do usuário (já confirmadas — NÃO perguntar novamente)

| Decisão | Resposta |
|---------|----------|
| Itens na tabela de partidas | **Todos os 6 slots** (item0–item5 + trinket no slot 6 opcional) |
| Skill order | **Implementar real** via Match Timeline API (`/matches/{id}/timeline`) |
| Se não houver partidas de Jayce Mid no BR1 | **Mostrar mensagem clara**: "Nenhuma partida encontrada para Jayce Mid no BR1" — sem fallback automático para Diamond |

---

## Implementação do Skill Order real (Match Timeline)

Para cada partida encontrada, chamar:
```
GET /lol/match/v5/matches/{matchId}/timeline
```

Response: lista de frames com eventos. Filtrar eventos `SKILL_LEVEL_UP` onde `participantId === jayce_participantId`:
```json
{
  "type": "SKILL_LEVEL_UP",
  "participantId": 3,
  "skillSlot": 1,   // 1=Q, 2=W, 3=E, 4=R
  "levelUpType": "NORMAL",
  "timestamp": 12345
}
```

Montar o array de 18 elementos: `["Q","W","Q","E","Q","R","Q","W","Q","W","R","W","W","E","E","R","E","E"]`

**Custo:** 1 API call extra por partida. Com 10 partidas = 10 timeline calls extras.

**Com batch de 5 paralelos e sleep 250ms:**
- 10 partidas → 2 batches de timeline → 500ms a mais no tempo total
- Total estimado: ~7-8 segundos → ainda dentro do limite de 10s do Vercel

**Armazenar no retorno da rota como:**
```typescript
skillOrder: string[]; // array de 18 abilities: ["Q","W","E",...]
```

**No front-end (ChampionPageClient.tsx):**
- Coluna "Skills" na tabela: exibir as primeiras 6-8 letras como chips coloridos (Q=teal, W=gold, E=purple, R=red)
- Na seção "Ordem de Habilidades" (Build Tab seção 3): usar o skill order mais comum das partidas reais para preencher o grid de 18 níveis

---

## Todos os 6 itens na tabela

**Mudança no ChampionPageClient.tsx:**
```tsx
// Linha atual (só mostra os items do array, que pode ter menos de 6):
<div className="match-items-row">
  {m.items.map((id, j) => <ItemIcon key={j} id={id} size={20} />)}
</div>

// Novo: mostrar todos os 6 slots explicitamente (item0 a item5), trinket separado
<div className="match-items-row">
  {[m.item0, m.item1, m.item2, m.item3, m.item4, m.item5]
    .map((id, j) => id > 0
      ? <ItemIcon key={j} id={String(id)} size={20} />
      : <div key={j} className="item-slot-empty" style={{width:20,height:20,opacity:0.2,background:"var(--panel)",borderRadius:4}} />
    )}
  {m.item6 > 0 && <ItemIcon id={String(m.item6)} size={18} style={{opacity:0.6}} />}  {/* trinket menor */}
</div>
```

**Mudança na rota** (já retorna item0–item6 no nível raiz, só precisa garantir que o `MatchEntry` do cliente também os carregue).

---

## Resumo das mudanças por arquivo

### `/api/champion/[champId]/matches/route.ts`
1. Adicionar `master` ao leaderboard (1 chamada extra, retorna puuid direto)
2. Adicionar `startTime` (30 dias atrás) no match history
3. Receber parâmetro `lane` da query string
4. Ao encontrar o participante na partida, verificar `teamPosition === laneToTeamPosition(lane)`
5. Se nenhuma partida encontrada com o filtro de rota → retornar `{ matches: [], total: 0, message: "Nenhuma partida encontrada para {champId} {lane} no {region}" }`
6. Chamar timeline API para cada partida e extrair skill order
7. `cacheKey` incluir lane: `champion-matches-v3:${champId}:${region}:${lane}`

### `ChampionPageClient.tsx`
1. Passar `selectedLane` e `selectedRegion` como deps do useEffect de fetch
2. Incluir `lane` e `region` no fetch URL
3. Mostrar todos os 6 slots de item na tabela (+ trinket menor)
4. Usar `m.skillOrder` (array de strings) para exibir chips coloridos na coluna Skills
5. Usar skill order mais frequente para preencher grid de 18 níveis (seção 3)
6. Re-fetch do build também quando lane/region mudar

### `src/lib/buildAggregator.ts`
- Nenhuma mudança necessária (já correto)

### `src/lib/types.ts`  
- Nenhuma mudança necessária

---

## Notas de UX confirmadas pelo usuário

- **Tabela:** 6 itens completos + trinket menor ao lado
- **Skill order:** Real via timeline API (aceita ser ~30% mais lento)
- **Rota sem dados:** Mensagem clara, sem fallback automático
- **Pergunta ao usuário se houver dúvida sobre layout ou comportamento** antes de implementar
