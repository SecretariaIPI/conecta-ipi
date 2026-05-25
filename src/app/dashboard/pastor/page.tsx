'use client'

import Link from 'next/link'
import { ArrowLeft, BarChart3, TrendingUp, GitPullRequest } from 'lucide-react'

export default function VisaoPastorPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4">
      
      {/* Botão de Voltar para a Home */}
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition">
          <ArrowLeft size={14} /> Voltar ao Início
        </Link>
      </div>

      <div className="border-b border-slate-200 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <div className="bg-purple-600 p-2 rounded-2xl text-white shadow-sm">
              <BarChart3 size={22} />
            </div>
            Visão do Pastor
          </h1>
          <p className="text-slate-500 mt-1.5 text-sm font-medium">
            Análise visual do funil de conversão e evolução estratégica da igreja.
          </p>
        </div>

        {/* Atalho rápido para ir para a tela de acompanhamento */}
        <div>
          <Link
            href="/dashboard/pastor/acompanhamento"
            className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm transition"
          >
            <TrendingUp size={15} />
            Ver Dashboard de Acompanhamento 📋
          </Link>
        </div>
      </div>

      {/* COMPONENTE DOS GRÁFICOS DO INÍCIO DA NOITE */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-2xs text-center text-slate-400 text-sm">
        {/* Cole aqui o código completo do Funil de Vendas/Integração e gráficos que desenvolvemos antes */}
        <p className="font-medium text-slate-600">[Seu código de Gráficos e Funil Analítico renderiza aqui]</p>
      </div>

    </div>
  )
}