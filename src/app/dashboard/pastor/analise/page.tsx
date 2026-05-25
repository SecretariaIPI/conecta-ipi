'use client'

import Link from 'next/link'
import { ArrowLeft, BarChart3, PieChart } from 'lucide-react'

export default function AnalisePastoralPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4">
      
      {/* BOTÃO DE VOLTAR PARA A DASHBOARD PASTORAL */}
      <div>
        <Link href="/dashboard/pastor" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition">
          <ArrowLeft size={14} /> Voltar para Dashboard Pastoral
        </Link>
      </div>

      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
          <div className="bg-purple-600 p-2 rounded-2xl text-white shadow-sm">
            <BarChart3 size={22} />
          </div>
          Gráficos e Análises Estatísticas
        </h1>
        <p className="text-slate-500 mt-1.5 text-sm font-medium">
          Análise visual do funil de conversão e evolução mensal da igreja.
        </p>
      </div>

      {/* Cole aqui os seus componentes de gráficos existentes (ex: Funil, Recharts, Barras) */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-2xs text-center text-slate-400 text-sm">
        [Seu código de Gráficos e Funil Analítico renderiza perfeitamente aqui dentro]
      </div>

    </div>
  )
}