import { prisma } from "@/lib/prisma";
import { QuestionForm } from "@/components/admin/QuestionForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function NewQuestionPage({
  searchParams,
}: {
  searchParams: Promise<{ moduleId?: string }>;
}) {
  const { moduleId } = await searchParams;

  const modules = await prisma.adminModule.findMany({
    orderBy: [{ ctflChapter: "asc" }, { orderIndex: "asc" }],
    select: { id: true, title: true, ctflChapter: true },
  });

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
          <h1 className="text-2xl font-black text-[#1A1B2E]">Nova questão</h1>
          <p className="text-sm text-gray-400 mt-0.5">Adicionar ao banco de questões</p>
        </div>
      </div>
      <QuestionForm modules={modules} defaultModuleId={moduleId} />
    </div>
  );
}
