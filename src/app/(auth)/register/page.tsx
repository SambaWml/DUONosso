"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Erro ao criar conta.");
    } else {
      router.push("/login?registered=1");
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl border-2 border-[#E9E4F2] shadow-[0_4px_0_#D8D2E5] p-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center mb-4 shadow-[0_4px_0_#3E2EA0]">
            <span className="text-white font-black text-2xl leading-none">Q</span>
          </div>
          <p className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-widest mb-1">Crie sua conta</p>
          <h1 className="text-2xl font-black text-[#1A1B2E]">QVenture</h1>
          <p className="text-sm text-gray-400 font-medium mt-0.5">Comece a estudar hoje</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold text-gray-500 uppercase tracking-wide mb-1.5">
              Nome completo
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-[#E9E4F2] focus:outline-none focus:border-indigo-400 focus:ring-0 text-sm font-medium transition"
              placeholder="Seu nome"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-gray-500 uppercase tracking-wide mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-[#E9E4F2] focus:outline-none focus:border-indigo-400 focus:ring-0 text-sm font-medium transition"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-gray-500 uppercase tracking-wide mb-1.5">
              Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-xl border-2 border-[#E9E4F2] focus:outline-none focus:border-indigo-400 focus:ring-0 text-sm font-medium transition pr-11"
                placeholder="Mínimo 6 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-extrabold text-sm uppercase tracking-wide hover:brightness-105 disabled:opacity-60 transition flex items-center justify-center gap-2 shadow-[0_4px_0_#3E2EA0] active:translate-y-1 active:shadow-[0_2px_0_#3E2EA0]"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Criando conta..." : "Criar conta"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 font-medium mt-6">
          Já tem conta?{" "}
          <Link href="/login" className="text-indigo-600 font-extrabold hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
