import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { QuestionForm } from "@/components/admin/QuestionForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function EditQuestionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ moduleId?: string }>;
}) {
  const { id } = await params;
  const { moduleId } = await searchParams;

  const [question, modules] = await Promise.all([
    prisma.adminQuestion.findUnique({ where: { id } }),
    prisma.adminModule.findMany({
      orderBy: [{ ctflChapter: "asc" }, { orderIndex: "asc" }],
      select: { id: true, title: true, ctflChapter: true },
    }),
  ]);

  if (!question) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={moduleId ? `/admin/modules/${moduleId}` : "/admin/questions"}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-400 hover:text-gray-600"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-[#1A1B2E]">Editar questão</h1>
          <p className="text-sm text-gray-400 mt-0.5 line-clamp-1">{question.statement}</p>
        </div>
      </div>
      <QuestionForm question={question} modules={modules} />
    </div>
  );
}
