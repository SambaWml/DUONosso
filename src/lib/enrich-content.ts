import OpenAI from "openai";

const openai = (() => { try { return new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); } catch { return null as unknown as OpenAI; } })();

const CTFL_CHAPTERS: Record<number, string> = {
  1: "1. Fundamentos de Teste",
  2: "2. Testando ao Longo do Ciclo de Vida de Software",
  3: "3. Testes Estáticos",
  4: "4. Técnicas de Teste",
  5: "5. Gerenciamento de Testes",
  6: "6. Ferramentas de Suporte ao Teste",
};

/** When chapter extraction falls back to "Seção N", infer the real CTFL chapter name.
 *  Strategy: GPT with CTFL chapter list as context → fallback to number mapping. */
export async function inferChapterTitle(genericTitle: string, content: string): Promise<string> {
  // Extract the section number from "Seção N" or "Seção N."
  const numMatch = genericTitle.match(/\d+/);
  const sectionNum = numMatch ? parseInt(numMatch[0]) : null;

  const preview = content.slice(0, 3000);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 60,
      messages: [{
        role: "user",
        content: `Você é um especialista em ISTQB CTFL 4.0. Com base no conteúdo abaixo, identifique qual capítulo oficial do CTFL 4.0 este material pertence.

Capítulos oficiais CTFL 4.0:
1. Fundamentos de Teste
2. Testando ao Longo do Ciclo de Vida de Software
3. Testes Estáticos
4. Técnicas de Teste
5. Gerenciamento de Testes
6. Ferramentas de Suporte ao Teste

Responda APENAS com o número e nome do capítulo (ex: "4. Técnicas de Teste").
Se o conteúdo não se encaixar em nenhum, responda "${sectionNum && CTFL_CHAPTERS[sectionNum] ? CTFL_CHAPTERS[sectionNum] : genericTitle}".

Conteúdo:
${preview}`,
      }],
    });

    const result = (completion.choices[0].message.content ?? "")
      .trim()
      .replace(/^["'""]+|["'""]+$/g, "")
      .trim();

    if (result.length > 0 && result.length < 80 && result !== genericTitle) {
      return result;
    }
  } catch { /* fall through to number-based mapping */ }

  // Fallback: map section number directly to official CTFL chapter name
  if (sectionNum && CTFL_CHAPTERS[sectionNum]) {
    return CTFL_CHAPTERS[sectionNum];
  }

  return genericTitle;
}

export async function enrichChapterContent(title: string, rawText: string): Promise<string> {
  const preview = rawText.slice(0, 12000);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: `Você é um professor especialista em ISTQB CTFL 4.0. Crie um RESUMO DE ESTUDO estruturado e didático do capítulo abaixo, ideal para preparação para o exame.

Capítulo: "${title}"

Conteúdo bruto do PDF:
${preview}

INSTRUÇÕES:
- Crie um resumo focado nos conceitos que MAIS CAEM na prova CTFL.
- NÃO copie o texto bruto. SINTETIZE e EXPLIQUE com clareza.
- Estrutura obrigatória:

## Visão Geral
[2-3 frases resumindo o propósito do capítulo]

## Conceitos-Chave
[Lista dos termos e definições mais importantes — use **negrito** nos termos]

## Pontos Principais
[Subtópicos organizados com ## ou ###, explicando cada conceito de forma clara e concisa]

## Tabelas e Comparações (se houver)
[Tabelas markdown para comparar técnicas, níveis, tipos etc. — só inclua se agregar valor]

## O que Cai na Prova
[Bullet list com os tópicos e armadilhas mais comuns nas questões CTFL deste capítulo]

REGRAS:
- Use **negrito** na primeira ocorrência de termos ISTQB.
- Seja conciso: prefira listas a parágrafos longos.
- Tabelas: preserve orientação original (não transponha linhas/colunas).
- Figuras: se mencionado "Figura X", crie callout: > **Figura X** — [descrição do que representa]
- NÃO inclua informações sobre copyright, autores, histórico de revisão ou páginas administrativas.
- Retorne APENAS o markdown, sem preâmbulo nem explicações.`,
      },
    ],
  });

  const raw = completion.choices[0].message.content ?? rawText;
  return raw.replace(/^```(?:markdown)?\r?\n?/, "").replace(/\r?\n?```\s*$/, "").trim();
}
