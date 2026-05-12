import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ModuleForm } from "@/components/admin/ModuleForm";
import { QuestionList } from "@/components/admin/QuestionList";
import { ModuleDeleteButton } from "@/components/admin/ModuleDeleteButton";
import Link from "next/link";
import { Plus, ArrowLeft } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function EditModulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const mod = await prisma.adminModule.findUnique({
    where: { id },
    include: { questions: { orderBy: { orderIndex: "asc" } } },
  });

  if (!mod) notFound();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/modules" className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Editar módulo</h1>
            <p className="text-sm text-gray-400 mt-0.5">{mod.title}</p>
          </div>
        </div>
        <ModuleDeleteButton moduleId={mod.id} title={mod.title} redirectTo="/admin/modules" />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr,380px] gap-6 items-start">
        {/* Left: module form */}
        <ModuleForm module={mod} />

        {/* Right: questions */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Questões</h2>
              <p className="text-xs text-gray-400 mt-0.5">{mod.questions.length} cadastrada{mod.questions.length !== 1 ? "s" : ""}</p>
            </div>
            <Link
              href={`/admin/questions/new?moduleId=${mod.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar
            </Link>
          </div>
          <div className="p-4">
            <QuestionList questions={mod.questions} moduleId={mod.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
