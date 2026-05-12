import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

const openai = (() => { try { return new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); } catch { return null as unknown as OpenAI; } })();

export async function generateQuestionsForChapter(
  chapterId: string,
  title: string,
  content: string,
  materialType = "SYLLABUS",
  userId?: string
) {
  const contentPreview = content.slice(0, 6000);

  // Fetch real exam questions as style reference
  let examReference = "";
  if (userId) {
    const examQuestions = await prisma.question.findMany({
      where: { chapter: { material: { userId, type: "EXAM" } } },
      select: { statement: true, alternativeA: true, alternativeB: true, alternativeC: true, alternativeD: true },
      take: 6,
      orderBy: { createdAt: "desc" },
    });
    if (examQuestions.length > 0) {
      examReference = `\n\nREFERÊNCIA DE ESTILO — exemplos de questões de provas reais CTFL (use como modelo de dificuldade, formato e linguagem — NÃO repita estas questões):\n${
        examQuestions.map((q, i) =>
          `${i + 1}. ${q.statement}\n   A) ${q.alternativeA}  B) ${q.alternativeB}  C) ${q.alternativeC}  D) ${q.alternativeD}`
        ).join("\n\n")
      }`;
    }
  }

  const examIntro = materialType === "EXAM"
    ? `O conteúdo abaixo é extraído de uma PROVA REAL de certificação CTFL. Gere 10 questões NOVAS (não copie as originais) baseadas EXCLUSIVAMENTE nos mesmos tópicos e conceitos presentes nesse conteúdo, no estilo oficial da prova.`
    : `Gere exatamente 10 questões de múltipla escolha baseadas EXCLUSIVAMENTE no conteúdo do capítulo fornecido abaixo, no estilo oficial das provas CTFL v4.0.`;

  const prompt = `Você é um especialista em ISTQB CTFL 4.0 e criação de simulados realistas.

${examIntro}

Capítulo/Seção: "${title}"
Conteúdo do PDF (use EXCLUSIVAMENTE este conteúdo — não invente nem use informações externas):
${contentPreview}
${examReference}

REGRAS OBRIGATÓRIAS:
- Use EXCLUSIVAMENTE o conteúdo do PDF acima. Não invente conteúdo. Não use informações externas.
- NÃO gere perguntas sobre: copyright, autores, histórico de revisão, agradecimentos, índice, licença, marcas registradas ou páginas administrativas.
- Gere questões no estilo real da prova CTFL: linguagem técnica, formal, clara, em português brasileiro.
- Exatamente 4 alternativas (A-D), apenas 1 correta. Varie a posição da resposta correta entre as questões.
- Alternativas plausíveis e não óbvias — representam equívocos reais de candidatos CTFL.
- Misture questões conceituais, situacionais e de interpretação.
- Distribuição cognitiva: ~40% K1 (lembrar/definir), ~40% K2 (compreender/explicar), ~20% K3 (aplicar em cenário).
- Questões K3 devem incluir um mini-cenário realista antes da pergunta.
- Respeite os K-levels e objetivos de aprendizagem quando identificados no material.
- Não repita questões.
- syllabusRef: use o formato "FL-X.X.Y" quando identificado no conteúdo, senão "N/A".
- difficulty: K1→"EASY", K2→"MEDIUM", K3→"HARD".
- explanation: por que a resposta correta está certa, com referência ao conteúdo do PDF (1-2 frases).
- explanationA/B/C/D: por que cada alternativa está certa ou errada (incluindo a correta).

Retorne APENAS JSON válido, sem texto adicional:
{"questions":[{"statement":"...","alternativeA":"...","alternativeB":"...","alternativeC":"...","alternativeD":"...","correctAnswer":"A","explanation":"...","explanationA":"...","explanationB":"...","explanationC":"...","explanationD":"...","difficulty":"MEDIUM","syllabusRef":"FL-X.X.Y"}]}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 8000,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const text = completion.choices[0].message.content ?? "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch?.[0] ?? text);

  if (!Array.isArray(parsed.questions)) return;

  await prisma.$transaction(
    parsed.questions.map((q: {
      statement: string; alternativeA: string; alternativeB: string;
      alternativeC: string; alternativeD: string; correctAnswer: string;
      explanation: string; explanationA: string; explanationB: string;
      explanationC: string; explanationD: string;
      difficulty?: string; syllabusRef?: string;
    }) =>
      prisma.question.create({
        data: {
          chapterId,
          statement: q.statement,
          alternativeA: q.alternativeA,
          alternativeB: q.alternativeB,
          alternativeC: q.alternativeC,
          alternativeD: q.alternativeD,
          correctAnswer: q.correctAnswer.toUpperCase(),
          explanation: q.explanation,
          explanationA: q.explanationA,
          explanationB: q.explanationB,
          explanationC: q.explanationC,
          explanationD: q.explanationD,
          difficulty: (q.difficulty as "EASY" | "MEDIUM" | "HARD") || "MEDIUM",
          syllabusRef: q.syllabusRef,
        },
      })
    )
  );
}

/** Generates questions for every chapter that has none yet. */
export async function ensureQuestionsForUser(userId: string) {
  const chapters = await prisma.chapter.findMany({
    where: {
      material: { userId, status: "READY" },
      questions: { none: {} },
      NOT: { title: { in: ["Introdução", "__intro__", "Introdução "] } },
    },
    select: { id: true, title: true, content: true, material: { select: { type: true } } },
  });

  if (chapters.length === 0) return;

  await Promise.allSettled(
    chapters.map((ch) =>
      generateQuestionsForChapter(
        ch.id,
        ch.title,
        ch.content ?? "",
        ch.material.type,
        userId
      )
    )
  );
}
