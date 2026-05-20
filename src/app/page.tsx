'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  Users,
  User,
  UserCheck,
  Cake,
  MapPin,
  HeartHandshake,
  LayoutDashboard,
  Loader2,
  ChevronRight,
  ArrowUpRight
} from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type DashboardStats = {
  total: number
  homens: number
  mulheres: number
  aniversariantes: number
  cidades: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    homens: 0,
    mulheres: 0,
    aniversariantes: 0,
    cidades: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregar() {
      try {
        const { data } = await supabase
          .from('pessoas_cache')
          .select('sexo, cidade, data_nascimento')

        if (!data) return

        const mesAtual = new Date().getMonth() + 1

        const aniversariantes = data.filter((pessoa) => {
          if (!pessoa.data_nascimento) return false
          // Trata tanto ISO strings quanto formatos de data comuns
          const dataNasc = new Date(pessoa.data_nascimento)
          return dataNasc.getMonth() + 1 === mesAtual
        })

        const cidadesUnicas = new Set(
          data.map((p) => p.cidade?.trim()).filter(Boolean)
        )

        setStats({
          total: data.length,
          // .startsWith cobre tanto 'M'/'F' quanto 'MASCULINO'/'FEMININO' salvos no banco
          homens: data.filter((p) => p.sexo?.toUpperCase().startsWith('M')).length,
          mulheres: data.filter((p) => p.sexo?.toUpperCase().startsWith('F')).length,
          aniversariantes: aniversariantes.length,
          cidades: cidadesUnicas.size
        })
      } catch (error) {
        console.error('Erro ao processar indicadores:', error)
      } finally {
        setLoading(false)
      }
    }

    carregar()
  }, [])

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-2 text-slate-400 text-sm">
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <span className="font-semibold tracking-wide">Carregando painel Conecta...</span>
      </div>
    )
  }

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
          href="/dashboard"
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

      {/* SEÇÃO DOS INDICADORES CONSOLIDADOS */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">
          Métricas Consolidadas da Base
        </h3>
        
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total */}
          <div className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-2xs flex items-center gap-4 transition hover:border-slate-300">
            <div className="bg-blue-50 text-blue-600 p-3 rounded-xl shrink-0"><Users size={20} /></div>
            <div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Geral</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5 tracking-tight">{stats.total}</h3>
            </div>
          </div>

          {/* Homens */}
          <div className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-2xs flex items-center gap-4 transition hover:border-slate-300">
            <div className="bg-slate-50 text-slate-700 p-3 rounded-xl shrink-0"><User size={20} /></div>
            <div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Homens</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5 tracking-tight">{stats.homens}</h3>
            </div>
          </div>

          {/* Mulheres */}
          <div className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-2xs flex items-center gap-4 transition hover:border-slate-300">
            <div className="bg-rose-50 text-rose-600 p-3 rounded-xl shrink-0"><UserCheck size={20} /></div>
            <div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Mulheres</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5 tracking-tight">{stats.mulheres}</h3>
            </div>
          </div>

          {/* Aniversariantes */}
          <div className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-2xs flex items-center gap-4 transition hover:border-slate-300">
            <div className="bg-amber-50 text-amber-600 p-3 rounded-xl shrink-0"><Cake size={20} /></div>
            <div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">No Mês</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5 tracking-tight">{stats.aniversariantes}</h3>
            </div>
          </div>

          {/* Cidades */}
          <div className="col-span-2 sm:col-span-1 bg-white border border-slate-200/70 rounded-2xl p-5 shadow-2xs flex items-center gap-4 transition hover:border-slate-300">
            <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl shrink-0"><MapPin size={20} /></div>
            <div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Cidades</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5 tracking-tight">{stats.cidades}</h3>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}