import { ModuleForm } from "@/components/admin/ModuleForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewModulePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/modules" className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Novo módulo</h1>
          <p className="text-sm text-gray-400 mt-0.5">Capítulo de estudo CTFL</p>
        </div>
      </div>
      <div className="max-w-3xl">
        <ModuleForm />
      </div>
    </div>
  );
}
