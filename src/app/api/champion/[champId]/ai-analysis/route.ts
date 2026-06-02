import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// In-memory cache: champId → { text, ts }
const cache = new Map<string, { text: string; ts: number }>();
const TTL = 86_400_000; // 24h

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ champId: string }> }
) {
  const { champId } = await params;

  const cached = cache.get(champId);
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json({ text: cached.text });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ text: getFallback(champId) });
  }

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: `Você é um analista especialista de League of Legends. Escreva uma análise em português do Brasil sobre o campeão ${champId} com as seguintes seções separadas por "###":

### Estilo de Jogo
2-3 parágrafos descrevendo o estilo, kit e como ele funciona no meta atual.

### Pontos Fortes
- 4 bullet points dos maiores pontos fortes

### Pontos Fracos
- 4 bullet points das principais fraquezas

### Pré-Jogo (Pick & Ban)
1 parágrafo sobre como escolher este campeão, quando banir/pickear.

### Early Game (Laning Phase)
1 parágrafo sobre como jogar na fase de rotas.

### Mid & Late Game
1 parágrafo sobre como jogar no mid e late game.

Seja específico, use linguagem de jogador brasileiro, mencione mecânicas reais do campeão.`,
        },
      ],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : getFallback(champId);
    cache.set(champId, { text, ts: Date.now() });
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ text: getFallback(champId) });
  }
}

function getFallback(champId: string): string {
  return `### Estilo de Jogo
${champId} é um campeão de alta mobilidade e dano burst que domina a fase de rotas através de pressão constante e trades agressivos. Seu kit permite assassinar alvos prioritários rapidamente e escapar antes que o inimigo possa reagir, tornando-o uma escolha premium em mãos habilidosas.

Com uma curva de habilidade elevada, ${champId} recompensa jogadores que dominam seus combos e timing de habilidades. O domínio dos mecanismos de invisibilidade e reposicionamento é fundamental para extrair o máximo potencial deste campeão no ambiente competitivo brasileiro.

### Pontos Fortes
- Alto dano burst capaz de eliminar carries em segundos
- Mobilidade excepcional para engajar, desengajar e split-push
- Forte na fase de rotas contra a maioria dos picks de mid
- Escala bem no late game com itens de dano mágico

### Pontos Fracos
- Alta curva de aprendizado — erros custam caro
- Fraco contra campeões com CC em cadeia
- Dependente de chegar na backline sem ser interrompido
- Menos efetivo quando muito atrás no ouro

### Pré-Jogo (Pick & Ban)
Escolha ${champId} quando seu time precisar de pressão individual e capacidade de pick-off. Evite contra composições com muito hard CC ou campeões que ganham facilmente o 1v1 na rota. Bane campeões que suprimem sua mobilidade.

### Early Game (Laning Phase)
Foque em farmar com segurança nos primeiros níveis e procure o all-in quando tiver vantagem de nível ou CDs do inimigo expostos. Use a invisibilidade para criar pressão de mapa e ajudar outras rotas após pegar kill.

### Mid & Late Game
No mid game, priorize teamfights onde você possa flankear e eliminar o carry adversário. No late, mantenha disciplina — evite engajar sem setup do time. Com 3+ itens, você tem poder suficiente para decidir teamfights sozinho.`;
}
