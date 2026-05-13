"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Upload, FileText, AlertCircle, CheckCircle2, ArrowLeft,
  Download, Layers, HelpCircle, BookOpen, ChevronDown, ChevronUp, Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "questions" | "bundle";

// ── Templates ──────────────────────────────────────────────────────────────

const CSV_TEMPLATE = [
  "moduleName,statement,alternativeA,alternativeB,alternativeC,alternativeD,correctAnswer,explanation,difficulty,syllabusRef,explanationA,explanationB,explanationC,explanationD",
  `"Fundamentos de Teste","Qual é o objetivo principal dos testes de software?","Encontrar defeitos","Provar que o software funciona sem erros","Satisfazer o cliente","Escrever documentação técnica","A","O objetivo principal do teste é encontrar defeitos antes que chegue ao usuário.","MEDIUM","FL-1.1.1","Correto: encontrar defeitos é o objetivo central.","Incorreto: testes não provam ausência de defeitos.","Incorreto: satisfazer o cliente é consequência, não o objetivo.","Incorreto: documentação é um artefato do processo."`,
  `"Fundamentos de Teste","O que é um defeito (bug)?","Uma falha observada na execução","Um erro cometido pelo desenvolvedor","Um desvio do comportamento esperado","Uma limitação do hardware","C","Um defeito é um desvio entre o comportamento real e o esperado pelo requisito.","EASY","FL-1.2.1","Incorreto: falha é o efeito observado, não o defeito.","Incorreto: erro é a ação humana que causou o defeito.","Correto.","Incorreto: limitações de hardware são restrições."`,
].join("\n");

const BUNDLE_TEMPLATE = JSON.stringify(
  [
    {
      title: "Fundamentos de Teste",
      ctflChapter: 1,
      orderIndex: 1,
      summary:
        "# Fundamentos de Teste\n\n## O que é teste de software?\n\nTeste de software é o processo de executar um programa com o objetivo de encontrar defeitos.\n\n## Objetivos do teste\n\n- Encontrar defeitos\n- Aumentar a confiança na qualidade\n- Fornecer informações para tomada de decisão\n- Prevenir defeitos\n\n## Terminologia\n\n| Termo | Definição |\n|-------|-----------|\n| Erro | Ação humana que produz resultado incorreto |\n| Defeito | Imperfeição no produto |\n| Falha | Comportamento incorreto observado |",
      materialUrl: "",
      isActive: true,
      questions: [
        {
          statement: "Qual é o objetivo principal dos testes de software?",
          alternativeA: "Encontrar defeitos",
          alternativeB: "Provar que o software funciona sem erros",
          alternativeC: "Satisfazer o cliente",
          alternativeD: "Escrever documentação técnica",
          correctAnswer: "A",
          explanation:
            "O objetivo principal do teste é encontrar defeitos antes que o software chegue ao usuário final.",
          explanationA: "Correto. Encontrar defeitos é o objetivo central do teste.",
          explanationB:
            "Incorreto. Testes não podem provar ausência total de defeitos.",
          explanationC: "Incorreto. Satisfazer o cliente é uma consequência.",
          explanationD: "Incorreto. Documentação é um artefato do processo.",
          difficulty: "MEDIUM",
          syllabusRef: "FL-1.1.1",
          orderIndex: 1,
        },
        {
          statement: "O que diferencia um erro de um defeito?",
          alternativeA:
            "Erro é a ação humana; defeito é a imperfeição no produto",
          alternativeB: "São termos sinônimos",
          alternativeC: "Defeito é a causa; erro é o efeito",
          alternativeD: "Erro ocorre em produção; defeito ocorre em teste",
          correctAnswer: "A",
          explanation:
            "Erro é a ação humana que produziu o resultado incorreto. Defeito é a manifestação desse erro no produto.",
          explanationA: "Correto. Essa é a distinção correta do syllabus CTFL.",
          explanationB: "Incorreto. Têm significados distintos.",
          explanationC: "Incorreto. A relação causal é o contrário.",
          explanationD: "Incorreto. Ambos podem ocorrer em qualquer fase.",
          difficulty: "EASY",
          syllabusRef: "FL-1.2.1",
          orderIndex: 2,
        },
      ],
    },
    {
      title: "Testes ao Longo do Ciclo de Vida",
      ctflChapter: 2,
      orderIndex: 1,
      summary:
        "# Testes ao Longo do Ciclo de Vida\n\n## Modelos de desenvolvimento\n\nOs testes acompanham o desenvolvimento em todos os modelos...",
      materialUrl: "",
      isActive: true,
      questions: [
        {
          statement:
            "Em qual nível de teste são verificadas as interações entre componentes?",
          alternativeA: "Teste de componente",
          alternativeB: "Teste de integração",
          alternativeC: "Teste de sistema",
          alternativeD: "Teste de aceite",
          correctAnswer: "B",
          explanation:
            "O teste de integração verifica as interfaces e interações entre componentes ou sistemas integrados.",
          explanationA: "Incorreto. Testa componentes individualmente.",
          explanationB: "Correto.",
          explanationC: "Incorreto. Verifica o sistema como um todo.",
          explanationD: "Incorreto. Confirma que o sistema atende aos requisitos de negócio.",
          difficulty: "MEDIUM",
          syllabusRef: "FL-2.2.1",
          orderIndex: 1,
        },
      ],
    },
  ],
  null,
  2
);

// ── CSV parser ──────────────────────────────────────────────────────────────

interface ParsedQuestion {
  adminModuleId?: string;
  moduleName?: string;
  statement: string;
  alternativeA: string;
  alternativeB: string;
  alternativeC: string;
  alternativeD: string;
  correctAnswer: string;
  explanation: string;
  explanationA?: string;
  explanationB?: string;
  explanationC?: string;
  explanationD?: string;
  difficulty?: string;
  syllabusRef?: string;
  imageUrl?: string;
  orderIndex?: number;
}

interface BundleModule {
  title: string;
  ctflChapter: number;
  orderIndex?: number;
  summary?: string;
  questions?: ParsedQuestion[];
}

function parseCSV(text: string): ParsedQuestion[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines
    .slice(1)
    .map((line) => {
      const cols = line.match(/("(?:[^"]|"")*"|[^,]*)/g) ?? [];
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = (cols[i] ?? "").trim().replace(/^"|"$/g, "").replace(/""/g, '"');
      });
      return obj as unknown as ParsedQuestion;
    })
    .filter((q) => q.statement?.trim());
}

// ── Download helpers ────────────────────────────────────────────────────────

function download(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ───────────────────────────────────────────────────────────────

const VALID_ANSWER_RE = /^[A-Z]+$/;
const VALID_DIFFICULTIES = new Set(["EASY", "MEDIUM", "HARD"]);

function isValidAnswer(v: string) { return VALID_ANSWER_RE.test((v ?? "").toUpperCase()); }

function validateQ(q: ParsedQuestion): string | null {
  if (!q.statement?.trim()) return "Enunciado obrigatório";
  if (!isValidAnswer(q.correctAnswer ?? "")) return "correctAnswer obrigatório (ex: A, BD, ACE)";
  return null;
}

export default function ImportPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>("questions");
  const [dragOver, setDragOver] = useState(false);

  // Questions tab state
  const [parsedQ, setParsedQ] = useState<ParsedQuestion[] | null>(null);

  // Bundle tab state
  const [parsedB, setParsedB] = useState<BundleModule[] | null>(null);
  const [expandedModule, setExpandedModule] = useState<number | null>(null);

  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    type: "questions" | "bundle";
    imported?: number;
    updated?: number;
    skipped?: number;
    modulesCreated?: number;
    modulesUpdated?: number;
    questionsCreated?: number;
    errors: string[];
  } | null>(null);

  function reset() {
    setParsedQ(null);
    setParsedB(null);
    setParseError(null);
    setResult(null);
    setExpandedModule(null);
  }

  function updateQ(index: number, field: keyof ParsedQuestion, value: string) {
    setParsedQ((prev) => prev ? prev.map((q, i) => i === index ? { ...q, [field]: value } : q) : prev);
  }

  function updateBundleQ(mi: number, qi: number, field: keyof ParsedQuestion, value: string) {
    setParsedB((prev) => {
      if (!prev) return prev;
      const next = prev.map((m, i) => {
        if (i !== mi) return m;
        return { ...m, questions: m.questions?.map((q, j) => j === qi ? { ...q, [field]: value } : q) };
      });
      return next;
    });
  }

  function handleFile(file: File) {
    reset();
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        if (tab === "bundle") {
          if (!file.name.endsWith(".json")) throw new Error("O arquivo deve ser .json para importar módulos + questões.");
          const data = JSON.parse(text);
          if (!Array.isArray(data)) throw new Error("O JSON deve ser um array de módulos.");
          setParsedB(data as BundleModule[]);
        } else {
          if (file.name.endsWith(".json")) {
            const data = JSON.parse(text);
            if (!Array.isArray(data)) throw new Error("JSON deve ser um array de questões.");
            setParsedQ(data as ParsedQuestion[]);
          } else {
            const rows = parseCSV(text);
            if (rows.length === 0) throw new Error("Nenhuma linha válida encontrada no CSV.");
            setParsedQ(rows);
          }
        }
      } catch (err) {
        setParseError(err instanceof Error ? err.message : "Erro ao processar arquivo.");
      }
    };
    reader.readAsText(file, "utf-8");
  }

  async function importQuestions() {
    if (!parsedQ || parsedQ.length === 0) return;
    setImporting(true);
    try {
      const res = await fetch("/api/admin/questions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: parsedQ }),
      });
      const data = await res.json();
      if (!res.ok) {
        setParseError((data.error ?? "Erro ao importar.") + (data.details?.length ? "\n" + data.details.join("\n") : ""));
      } else {
        setResult({ type: "questions", ...data });
        setParsedQ(null);
      }
    } finally {
      setImporting(false);
    }
  }

  async function importBundle() {
    if (!parsedB || parsedB.length === 0) return;
    setImporting(true);
    try {
      const res = await fetch("/api/admin/import-bundle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modules: parsedB }),
      });
      const data = await res.json();
      if (!res.ok) {
        setParseError(data.error ?? "Erro ao importar.");
      } else {
        setResult({ type: "bundle", ...data });
        setParsedB(null);
      }
    } finally {
      setImporting(false);
    }
  }

  const hasParsed = tab === "questions" ? (parsedQ && parsedQ.length > 0) : (parsedB && parsedB.length > 0);
  const totalQuestions = parsedB?.reduce((s, m) => s + (m.questions?.length ?? 0), 0) ?? 0;
  const qErrors = parsedQ ? parsedQ.map(validateQ) : [];
  const qErrorCount = qErrors.filter(Boolean).length;
  const bErrors: (string | null)[][] = parsedB?.map((m) => m.questions?.map(validateQ) ?? []) ?? [];
  const bErrorCount = bErrors.flat().filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/questions" className="p-1.5 hover:bg-gray-100 rounded-lg transition">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-[#1A1B2E]">Importar Conteúdo</h1>
          <p className="text-sm text-gray-500">CSV/JSON para questões ou JSON para módulos + questões</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => { setTab("questions"); reset(); }}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            tab === "questions" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          )}
        >
          <HelpCircle className="w-4 h-4" /> Questões
        </button>
        <button
          onClick={() => { setTab("bundle"); reset(); }}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            tab === "bundle" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          )}
        >
          <Layers className="w-4 h-4" /> Módulos + Questões
        </button>
      </div>

      {/* Info banner */}
      {tab === "questions" ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-blue-900">Formato: CSV ou JSON</p>
            <p className="text-xs text-blue-700 mt-0.5">
              Colunas: <code className="bg-blue-100 px-1 rounded">moduleName</code> (nome exato do módulo já cadastrado),{" "}
              <code className="bg-blue-100 px-1 rounded">statement</code>,{" "}
              <code className="bg-blue-100 px-1 rounded">alternativeA–D</code>,{" "}
              <code className="bg-blue-100 px-1 rounded">correctAnswer</code> (letra(s) da(s) alternativa(s) correta(s), ex: A, BD, ACE),{" "}
              <code className="bg-blue-100 px-1 rounded">explanation</code>,{" "}
              <code className="bg-blue-100 px-1 rounded">difficulty</code> (EASY/MEDIUM/HARD),{" "}
              <code className="bg-blue-100 px-1 rounded">syllabusRef</code>,{" "}
              <code className="bg-blue-100 px-1 rounded">explanationA–D</code>
            </p>
          </div>
          <button
            onClick={() => download(CSV_TEMPLATE, "template_questoes.csv", "text/csv;charset=utf-8;")}
            className="flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-900 border border-blue-300 rounded-lg px-3 py-1.5 transition flex-shrink-0 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" /> Template CSV
          </button>
        </div>
      ) : (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-3">
          <Layers className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-indigo-900">Formato: JSON com módulos e questões aninhadas</p>
            <p className="text-xs text-indigo-700 mt-0.5">
              Array de módulos, cada um com <code className="bg-indigo-100 px-1 rounded">title</code>,{" "}
              <code className="bg-indigo-100 px-1 rounded">ctflChapter</code>,{" "}
              <code className="bg-indigo-100 px-1 rounded">summary</code> (Markdown) e{" "}
              <code className="bg-indigo-100 px-1 rounded">questions</code>.
              Módulos existentes (mesmo nome) são atualizados. Questões são sempre criadas.
            </p>
          </div>
          <button
            onClick={() => download(BUNDLE_TEMPLATE, "template_modulos_questoes.json", "application/json")}
            className="flex items-center gap-1.5 text-xs font-medium text-indigo-700 hover:text-indigo-900 border border-indigo-300 rounded-lg px-3 py-1.5 transition flex-shrink-0 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" /> Template JSON
          </button>
        </div>
      )}

      {/* Drop zone */}
      {!hasParsed && !result && (
        <div
          className={cn(
            "border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors",
            dragOver ? "border-indigo-400 bg-indigo-50" : "border-gray-300 hover:border-indigo-300 hover:bg-gray-50"
          )}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">
            {tab === "questions" ? "Arraste um CSV ou JSON aqui" : "Arraste o JSON aqui"}
          </p>
          <p className="text-sm text-gray-400 mt-1">ou clique para selecionar</p>
          <input
            ref={fileRef}
            type="file"
            accept={tab === "questions" ? ".csv,.json" : ".json"}
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
          />
        </div>
      )}

      {/* Parse error */}
      {parseError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <pre className="text-sm text-red-700 whitespace-pre-wrap">{parseError}</pre>
            <button onClick={reset} className="mt-2 text-xs text-red-600 hover:underline">Tentar novamente</button>
          </div>
        </div>
      )}

      {/* ── Questions preview ──────────────────────────────────────────────── */}
      {parsedQ && parsedQ.length > 0 && (
        <div className="bg-white border-2 border-[#E9E4F2] shadow-[0_2px_0_#D8D2E5] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <p className="font-semibold text-gray-900">{parsedQ.length} questões encontradas</p>
              {qErrorCount > 0
                ? <p className="text-xs text-red-500 font-medium flex items-center gap-1 mt-0.5"><AlertCircle className="w-3.5 h-3.5" /> {qErrorCount} erro{qErrorCount !== 1 ? "s" : ""} — corrija antes de importar</p>
                : <p className="text-xs text-gray-500">Edite células se necessário, depois importe</p>
              }
            </div>
            <div className="flex gap-2">
              <button onClick={reset} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition">
                Cancelar
              </button>
              <button
                onClick={importQuestions}
                disabled={importing || qErrorCount > 0}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {importing ? "Importando..." : `Importar ${parsedQ.length} questões`}
              </button>
            </div>
          </div>
          <div className="overflow-auto max-h-[480px]">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 w-8">#</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Módulo</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Enunciado</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 w-24">Correta <Pencil className="w-3 h-3 inline ml-0.5 text-gray-400" /></th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 w-28">Dificuldade <Pencil className="w-3 h-3 inline ml-0.5 text-gray-400" /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {parsedQ.map((q, i) => {
                  const err = qErrors[i];
                  return (
                    <tr key={i} className={cn(err ? "bg-red-50" : "hover:bg-gray-50")}>
                      <td className="px-4 py-2 text-gray-400 text-xs">
                        {err ? <span title={String(err ?? "")}><AlertCircle className="w-3.5 h-3.5 text-red-400" /></span> : i + 1}
                      </td>
                      <td className="px-4 py-2 text-gray-600 text-xs max-w-[140px] truncate">
                        {q.moduleName ?? q.adminModuleId ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-gray-800 max-w-xs">
                        <input
                          className="w-full text-xs bg-transparent border-0 focus:ring-1 focus:ring-indigo-300 rounded px-1 py-0.5 truncate"
                          value={q.statement}
                          onChange={(e) => updateQ(i, "statement", e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          value={(q.correctAnswer ?? "").toUpperCase()}
                          onChange={(e) => updateQ(i, "correctAnswer", e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
                          placeholder="ex: BD"
                          className={cn(
                            "w-16 text-xs font-bold rounded px-1.5 py-0.5 border focus:outline-none focus:ring-1 focus:ring-indigo-300",
                            isValidAnswer(q.correctAnswer ?? "")
                              ? "bg-green-100 text-green-700 border-green-200"
                              : "bg-red-100 text-red-700 border-red-300"
                          )}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={VALID_DIFFICULTIES.has(q.difficulty ?? "") ? (q.difficulty ?? "MEDIUM") : "MEDIUM"}
                          onChange={(e) => updateQ(i, "difficulty", e.target.value)}
                          className="text-xs text-gray-600 bg-transparent border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                        >
                          <option value="EASY">Fácil</option>
                          <option value="MEDIUM">Médio</option>
                          <option value="HARD">Difícil</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Bundle preview ─────────────────────────────────────────────────── */}
      {parsedB && parsedB.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">
                {parsedB.length} módulo{parsedB.length !== 1 ? "s" : ""} · {totalQuestions} questão{totalQuestions !== 1 ? "s" : ""}
              </p>
              {bErrorCount > 0
                ? <p className="text-xs text-red-500 font-medium flex items-center gap-1 mt-0.5"><AlertCircle className="w-3.5 h-3.5" /> {bErrorCount} erro{bErrorCount !== 1 ? "s" : ""} — abra os módulos e corrija antes de importar</p>
                : <p className="text-xs text-gray-500">Expanda os módulos para editar questões se necessário</p>
              }
            </div>
            <div className="flex gap-2">
              <button onClick={reset} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition">
                Cancelar
              </button>
              <button
                onClick={importBundle}
                disabled={importing || bErrorCount > 0}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {importing ? "Importando..." : `Importar tudo`}
              </button>
            </div>
          </div>

          {parsedB.map((m, mi) => {
            const moduleErrCount = bErrors[mi]?.filter(Boolean).length ?? 0;
            return (
              <div key={mi} className={cn("bg-white border rounded-xl overflow-hidden", moduleErrCount > 0 ? "border-red-200" : "border-gray-200")}>
                <button
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition text-left"
                  onClick={() => setExpandedModule(expandedModule === mi ? null : mi)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", moduleErrCount > 0 ? "bg-red-100" : "bg-indigo-100")}>
                      <BookOpen className={cn("w-3.5 h-3.5", moduleErrCount > 0 ? "text-red-500" : "text-indigo-600")} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{m.title || <span className="text-red-400 italic">sem título</span>}</p>
                      <p className="text-xs text-gray-400">
                        Cap. {m.ctflChapter ?? "?"} · {m.questions?.length ?? 0} questão{(m.questions?.length ?? 0) !== 1 ? "s" : ""}
                        {moduleErrCount > 0 && <span className="text-red-500 font-medium"> · {moduleErrCount} erro{moduleErrCount !== 1 ? "s" : ""} — clique para corrigir</span>}
                        {!m.summary && <span className="text-amber-500"> · sem resumo</span>}
                      </p>
                    </div>
                  </div>
                  {expandedModule === mi
                    ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                </button>

                {expandedModule === mi && (
                  <div className="border-t border-gray-100">
                    {m.summary && (
                      <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                        <p className="text-xs font-medium text-gray-500 mb-1">Resumo (Markdown)</p>
                        <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono line-clamp-4 max-h-24 overflow-hidden">{m.summary}</pre>
                      </div>
                    )}
                    {(m.questions?.length ?? 0) > 0 ? (
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 w-8">#</th>
                            <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Enunciado</th>
                            <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 w-24">Correta <Pencil className="w-3 h-3 inline ml-0.5 text-gray-400" /></th>
                            <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 w-28">Dificuldade <Pencil className="w-3 h-3 inline ml-0.5 text-gray-400" /></th>
                            <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 w-24">Syllabus</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {m.questions!.map((q, qi) => {
                            const qErr = bErrors[mi]?.[qi];
                            return (
                              <tr key={qi} className={cn(qErr ? "bg-red-50" : "hover:bg-gray-50")}>
                                <td className="px-4 py-2 text-gray-400 text-xs">
                                  {qErr ? <span title={qErr}><AlertCircle className="w-3.5 h-3.5 text-red-400" /></span> : qi + 1}
                                </td>
                                <td className="px-4 py-2 text-gray-800 max-w-xs text-xs">
                                  <input
                                    className="w-full text-xs bg-transparent border-0 focus:ring-1 focus:ring-indigo-300 rounded px-1 py-0.5 truncate"
                                    value={q.statement}
                                    onChange={(e) => updateBundleQ(mi, qi, "statement", e.target.value)}
                                  />
                                </td>
                                <td className="px-4 py-2">
                                  <input
                                    value={(q.correctAnswer ?? "").toUpperCase()}
                                    onChange={(e) => updateBundleQ(mi, qi, "correctAnswer", e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
                                    placeholder="ex: BD"
                                    className={cn(
                                      "w-16 text-xs font-bold rounded px-1.5 py-0.5 border focus:outline-none focus:ring-1 focus:ring-indigo-300",
                                      isValidAnswer(q.correctAnswer ?? "")
                                        ? "bg-green-100 text-green-700 border-green-200"
                                        : "bg-red-100 text-red-700 border-red-300"
                                    )}
                                  />
                                </td>
                                <td className="px-4 py-2">
                                  <select
                                    value={VALID_DIFFICULTIES.has(q.difficulty ?? "") ? (q.difficulty ?? "MEDIUM") : "MEDIUM"}
                                    onChange={(e) => updateBundleQ(mi, qi, "difficulty", e.target.value)}
                                    className="text-xs text-gray-600 bg-transparent border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                                  >
                                    <option value="EASY">Fácil</option>
                                    <option value="MEDIUM">Médio</option>
                                    <option value="HARD">Difícil</option>
                                  </select>
                                </td>
                                <td className="px-4 py-2 text-gray-400 text-xs">{q.syllabusRef ?? "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <p className="px-5 py-3 text-xs text-gray-400 italic">Nenhuma questão neste módulo.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Success ────────────────────────────────────────────────────────── */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
            <p className="font-semibold text-green-900">Importação concluída!</p>
          </div>

          {result.type === "questions" ? (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-4 text-center border border-green-200">
                <p className="text-3xl font-bold text-green-700">{result.imported}</p>
                <p className="text-xs text-gray-500 mt-0.5">Criadas</p>
              </div>
              <div className="bg-white rounded-xl p-4 text-center border border-blue-200">
                <p className="text-3xl font-bold text-blue-600">{result.updated ?? 0}</p>
                <p className="text-xs text-gray-500 mt-0.5">Substituídas</p>
              </div>
              <div className="bg-white rounded-xl p-4 text-center border border-gray-200">
                <p className="text-3xl font-bold text-gray-400">{result.skipped}</p>
                <p className="text-xs text-gray-500 mt-0.5">Ignoradas</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl p-4 text-center border border-green-200">
                <p className="text-2xl font-bold text-green-700">{result.modulesCreated}</p>
                <p className="text-xs text-gray-500 mt-0.5">Módulos criados</p>
              </div>
              <div className="bg-white rounded-xl p-4 text-center border border-blue-200">
                <p className="text-2xl font-bold text-blue-600">{result.modulesUpdated}</p>
                <p className="text-xs text-gray-500 mt-0.5">Módulos atualizados</p>
              </div>
              <div className="bg-white rounded-xl p-4 text-center border border-green-200">
                <p className="text-2xl font-bold text-green-700">{result.questionsCreated}</p>
                <p className="text-xs text-gray-500 mt-0.5">Questões criadas</p>
              </div>
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-xs font-medium text-red-700 mb-1">Erros encontrados:</p>
              <ul className="text-xs text-red-600 space-y-0.5">
                {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
              </ul>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={reset}
              className="flex-1 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition"
            >
              Importar mais
            </button>
            <button
              onClick={() => router.push(result.type === "bundle" ? "/admin/modules" : "/admin/questions")}
              className="flex-1 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition"
            >
              {result.type === "bundle" ? "Ver módulos" : "Ver questões"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
