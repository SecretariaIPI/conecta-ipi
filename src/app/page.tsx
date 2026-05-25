'use client'

import Link from 'next/link'
import {
  HeartHandshake,
  LayoutDashboard,
  ChevronRight
} from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="space-y-8 p-1">
      {/* HEADER DA PÁGINA */}
      <div className="border-b border-slate-200/80 pb-5">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Dashboard
        </h1>
        <p className="text-slate-500 mt-1.5 text-sm font-medium">
          Visão geral e estratégica ministerial
        </p>
      </div>

      {/* BLOCOS PRINCIPAIS DE NAVEGAÇÃO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Gestão de Visitantes */}
        <Link
          href="/visitantes"
          className="group relative bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-6 shadow-md shadow-emerald-700/10 flex flex-col justify-between overflow-hidden transition duration-200 active:scale-[0.99]"
        >
          <div className="absolute -right-6 -bottom-6 text-emerald-500/20 transform group-hover:scale-110 group-hover:-rotate-12 transition duration-500 pointer-events-none">
            <HeartHandshake size={150} />
          </div>
          
          <div className="flex justify-between items-center z-10">
            <div className="bg-white/10 p-2.5 rounded-xl text-white backdrop-blur-md">
              <HeartHandshake size={22} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-white/10 px-2.5 py-1 rounded-md backdrop-blur-md text-emerald-100">
              CRM Visitantes
            </span>
          </div>

          <div className="mt-12 z-10 space-y-1.5">
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-1.5">
              Gestão de Visitantes
              <ChevronRight size={18} className="transform group-hover:translate-x-1 transition" />
            </h2>
            <p className="text-emerald-100/90 text-xs font-medium leading-relaxed max-w-sm">
              Cadastro, acompanhamento do funil de consolidação e controle de fichas pastorais.
            </p>
          </div>
        </Link>

        {/* Card 2: Dashboard Pastoral */}
        <Link
          href="/dashboard/pastor"
          className="group relative bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-6 shadow-md shadow-blue-700/10 flex flex-col justify-between overflow-hidden transition duration-200 active:scale-[0.99]"
        >
          <div className="absolute -right-6 -bottom-6 text-blue-500/20 transform group-hover:scale-110 group-hover:-rotate-12 transition duration-500 pointer-events-none">
            <LayoutDashboard size={150} />
          </div>

          <div className="flex justify-between items-center z-10">
            <div className="bg-white/10 p-2.5 rounded-xl text-white backdrop-blur-md">
              <LayoutDashboard size={22} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-white/10 px-2.5 py-1 rounded-md backdrop-blur-md text-blue-100">
              Painel Estratégico
            </span>
          </div>

          <div className="mt-12 z-10 space-y-1.5">
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-1.5">
              Dashboard Pastoral
              <ChevronRight size={18} className="transform group-hover:translate-x-1 transition" />
            </h2>
            <p className="text-blue-100/90 text-xs font-medium leading-relaxed max-w-sm">
              Análise de KPIs, relatórios de follow-up e métricas de engajamento ministerial.
            </p>
          </div>
        </Link>
      </div>
    </div>
  )
}