import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import pdfParse from "pdf-parse";
import OpenAI from "openai";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface ExtractedQuestion {
  moduleName?: string | null;
  statement: string;
  alternativeA: string;
  alternativeB: string;
  alternativeC: string;
  alternativeD: string;
  correctAnswer: string;
  explanation: string;
  difficulty?: string;
  syllabusRef?: string | null;
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Você é um especialista em certificação ISTQB CTFL. Extraia questões de múltipla escolha de um texto de prova CTFL.

Para cada questão retorne um objeto com:
- "statement": enunciado completo da questão (string)
- "alternativeA": texto da alternativa A (string)
- "alternativeB": texto da alternativa B (string)
- "alternativeC": texto da alternativa C (string)
- "alternativeD": texto da alternativa D (string)
- "correctAnswer": "A", "B", "C" ou "D" (a resposta correta)
- "explanation": explicação objetiva de por que a resposta correta está certa, com base no syllabus CTFL (string — gere uma se não houver)
- "difficulty": "EASY", "MEDIUM" ou "HARD" baseado na complexidade cognitiva (K-level do CTFL)
- "syllabusRef": referência do syllabus se mencionada, ex: "FL-1.1.1" (string ou null)
- "moduleName": nome do capítulo CTFL correspondente se identificável, ex: "Fundamentos de Teste" (string ou null)

Retorne APENAS um array JSON válido. Sem markdown, sem texto adicional. Se não houver questões, retorne [].`;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("pdf") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "O arquivo deve ser um PDF (.pdf)." }, { status: 400 });
  }
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "Arquivo muito grande. Máximo 25 MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let text: string;
  try {
    const parsed = await pdfParse(buffer);
    text = parsed.text ?? "";
  } catch {
    return NextResponse.json(
      { error: "Não foi possível ler o PDF. Verifique se o arquivo não está protegido por senha." },
      { status: 400 }
    );
  }

  if (!text.trim() || text.trim().length < 100) {
    return NextResponse.json(
      { error: "O PDF não contém texto legível. PDFs compostos por imagens precisam de OCR antes de importar." },
      { status: 400 }
    );
  }

  // Truncate to stay within GPT-4o context (roughly 80k chars ≈ ~20k tokens)
  const content = text.length > 80_000 ? text.slice(0, 80_000) + "\n\n[TEXTO TRUNCADO]" : text;

  let raw: string;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 16_000,
      temperature: 0.1,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Extraia as questões do seguinte texto:\n\n${content}` },
      ],
    });
    raw = completion.choices[0].message.content ?? "[]";
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Erro ao chamar a IA: ${msg}` },
      { status: 502 }
    );
  }

  let questions: ExtractedQuestion[];
  try {
    const clean = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(clean);
    if (!Array.isArray(parsed)) throw new Error("resposta não é array");
    questions = parsed;
  } catch {
    return NextResponse.json(
      { error: "A IA não conseguiu estruturar as questões. Tente um PDF com layout mais simples (texto corrido, sem tabelas complexas)." },
      { status: 422 }
    );
  }

  if (questions.length === 0) {
    return NextResponse.json(
      { error: "Nenhuma questão identificada no PDF. Verifique se o arquivo contém questões no formato de múltipla escolha." },
      { status: 422 }
    );
  }

  return NextResponse.json({ questions, charCount: text.length });
}
