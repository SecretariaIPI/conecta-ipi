'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js' // 1. Garante o import oficial
import {
  Users,
  Clock,
  Heart,
  Coffee,
  CheckCircle2,
  Archive,
  ArrowRight,
  UserPlus,
  Printer,
  FileText,
  AlertTriangle,
  X,
  Loader2,
  TrendingUp,
  ChevronDown,
  BarChart3
} from 'lucide-react'

// 2. Garante a criação do cliente de forma robusta e global para o arquivo
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

type Visitante = {
  id: string
  nome: string
  telefone: string | null
  cidade: string | null
  created_at: string
}

type Followup = {
  visitante_id: string
  etapa: string
  status: string
  data_contato: string | null
}

interface CardProps {
  titulo: string
  valor: number
  icon: React.ComponentType<{ size?: number; className?: string }>
  variant?: 'default' | 'danger' | 'success' | 'warning' | 'info'
}

function Card({ titulo, valor, icon: Icon, variant = 'default' }: CardProps) {
  const variantStyles = {
    default: {
      bg: 'bg-white',
      iconBg: 'bg-slate-100 text-slate-600',
      border: 'border-slate-200/60'
    },
    danger: {
      bg: 'bg-red-50/40',
      iconBg: 'bg-red-100 text-red-600',
      border: 'border-red-100'
    },
    success: {
      bg: 'bg-emerald-50/40',
      iconBg: 'bg-emerald-100 text-emerald-600',
      border: 'border-emerald-100'
    },
    warning: {
      bg: 'bg-amber-50/40',
      iconBg: 'bg-amber-100 text-amber-600',
      border: 'border-amber-100'
    },
    info: {
      bg: 'bg-blue-50/40',
      iconBg: 'bg-blue-100 text-blue-600',
      border: 'border-blue-100'
    }
  }

  const currentVariant = variantStyles[variant]

  return (
    <div
      className={`${currentVariant.bg} rounded-2xl border ${currentVariant.border} p-6 shadow-sm transition hover:shadow-md duration-200 print:hidden`}
    >
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
            {titulo}
          </p>
          <h3 className="text-3xl font-black text-slate-900 tracking-tight">
            {valor}
          </h3>
        </div>

        <div className={`${currentVariant.iconBg} p-3.5 rounded-xl`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [visitantes, setVisitantes] = useState<Visitante[]>([])
  const [followups, setFollowups] = useState<Followup[]>([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('mes')
  const [mostrarRelatorio, setMostrarRelatorio] = useState(false)

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    try {
      setLoading(true)
      const [vResp, fResp] = await Promise.all([
        supabase
          .from('visitantes')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('visitantes_followup')
          .select('*')
      ])

      setVisitantes(vResp.data || [])
      setFollowups(fResp.data || [])
    } catch (error) {
      console.error("Erro na comunicação com o Supabase:", error)
    } finally {
      setLoading(false)
    }
  }

  function dataLimite() {
    const hoje = new Date()

    if (periodo === 'hoje') {
      hoje.setHours(0, 0, 0, 0)
      return hoje
    }

    if (periodo === '7dias') {
      hoje.setDate(hoje.getDate() - 7)
      return hoje
    }

    if (periodo === '30dias') {
      hoje.setDate(hoje.getDate() - 30)
      return hoje
    }

    hoje.setDate(1)
    hoje.setHours(0, 0, 0, 0)
    return hoje
  }

  const visitantesFiltrados = useMemo(() => {
    const limite = dataLimite()

    return visitantes.filter(
      (v) => new Date(v.created_at) >= limite
    )
  }, [visitantes, periodo])

  const pendentes = followups.filter(
    (f) => f.status === 'pendente'
  ).length

  const aguardando = followups.filter(
    (f) => f.status === 'aguardando_resposta'
  ).length

  const positivos = followups.filter(
    (f) => f.status === 'resposta_positiva'
  ).length

  const confirmadosCafe = followups.filter(
    (f) => f.status === 'confirmado'
  ).length

  const integrados = followups.filter(
    (f) => f.status === 'integrated' || f.status === 'integrado'
  ).length

  const arquivados = followups.filter(
    (f) => f.status === 'arquivado'
  ).length

  const semContato = followups.filter((f) => {
    if (!f.data_contato) return true

    const ultima = new Date(f.data_contato)
    const hoje = new Date()

    const diff =
      (hoje.getTime() - ultima.getTime()) /
      (1000 * 60 * 60 * 24)

    return diff > 7
  }).length

  const precisamAcao = visitantes.slice(0, 10)

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center gap-2 text-slate-400 text-sm">
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <span className="font-semibold tracking-wide">
          Carregando dashboard pastoral...
        </span>
      </div>
    )
  }

  return (
    <>
      <div className={mostrarRelatorio ? 'print:hidden' : ''}>
        <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 print:hidden">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="border-b border-slate-200 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                  <div className="bg-blue-600 p-2 rounded-2xl text-white shadow-sm shadow-blue-600/20">
                    <TrendingUp size={24} />
                  </div>
                  Dashboard Pastoral
                </h1>

                <p className="text-slate-500 mt-2 text-sm font-medium">
                  Visão executiva e estratégica da jornada de integração de visitantes.
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <Link
                  href="/dashboard/integracao/pastoral"
                  className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm transition active:scale-95"
                >
                  <BarChart3 size={15} />
                  Visão do Pastor 📊
                </Link>

                <Link
                  href="/visitantes"
                  className="bg-slate-900 text-white hover:bg-slate-800 px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm transition active:scale-95"
                >
                  <UserPlus size={15} />
                  Novo Visitante
                </Link>

                <Link
                  href="/dashboard/cafe-convites"
                  className="bg-amber-500 text-white hover:bg-amber-600 px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm transition active:scale-95"
                >
                  <Coffee size={15} />
                  Convites Café
                </Link>

                <Link
                  href="/dashboard/integracao"
                  className="bg-slate-800 text-white hover:bg-slate-700 px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm transition active:scale-95"
                >
                  <TrendingUp size={15} />
                  Pipeline Integração
                </Link>

                <button
                  type="button"
                  onClick={() => setMostrarRelatorio(true)}
                  className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm transition active:scale-95"
                >
                  <FileText size={15} />
                  Relatórios
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm transition active:scale-95"
                >
                  <Printer size={15} />
                  Imprimir
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Período de Análise:
              </span>

              <div className="relative">
                <select
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value)}
                  className="appearance-none bg-white border border-slate-200 rounded-xl pl-4 pr-10 py-2 text-xs font-bold text-slate-700 outline-none shadow-2xs transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                >
                  <option value="hoje">Hoje</option>
                  <option value="7dias">Últimos 7 dias</option>
                  <option value="30dias">Últimos 30 dias</option>
                  <option value="mes">Este mês</option>
                </select>

                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <Card
                titulo="Visitantes no período"
                valor={visitantesFiltrados.length}
                icon={Users}
                variant="info"
              />

              <Card
                titulo="Pendentes"
                valor={pendentes}
                icon={Clock}
                variant="warning"
              />

              <Card
                titulo="Aguardando resposta"
                valor={aguardando}
                icon={Clock}
              />

              <Card
                titulo="Resposta positiva"
                valor={positivos}
                icon={Heart}
                variant="success"
              />

              <Card
                titulo="Confirmados Café"
                valor={confirmadosCafe}
                icon={Coffee}
                variant="info"
              />

              <Card
                titulo="Integrados"
                valor={integrados}
                icon={CheckCircle2}
                variant="success"
              />

              <Card
                titulo="Arquivados"
                valor={arquivados}
                icon={Archive}
              />

              <Card
                titulo="Sem contato +7 dias"
                valor={semContato}
                icon={AlertTriangle}
                variant="danger"
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
              <div className="xl:col-span-2 bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/60 flex flex-col">
                <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="font-black text-slate-900 tracking-tight text-lg">
                      Precisam de Ação
                    </h2>

                    <p className="text-slate-500 text-xs font-medium mt-0.5">
                      Últimos cadastrados pendentes de acompanhamento contínuo.
                    </p>
                  </div>

                  <Link
                    href="/visitantes"
                    className="text-blue-600 hover:text-blue-700 text-xs font-extrabold flex items-center gap-1 transition"
                  >
                    Ver todos
                    <ArrowRight size={14} />
                  </Link>
                </div>

                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1.5">
                  {precisamAcao.map((visitante) => (
                    <Link
                      key={visitante.id}
                      href={`/visitantes/${visitante.id}`}
                      className="block border border-slate-100 rounded-xl p-4 bg-white hover:bg-slate-50/50 hover:border-slate-200/80 transition duration-150"
                    >
                      <div className="flex justify-between items-center gap-4">
                        <div className="space-y-0.5">
                          <h3 className="font-bold text-slate-900 tracking-tight text-base">
                            {visitante.nome}
                          </h3>

                          <p className="text-slate-500 text-xs font-medium">
                            {visitante.telefone || 'Sem telefone cadastrado'}
                          </p>
                        </div>

                        <div className="text-[10px] font-bold bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg border border-amber-100 uppercase tracking-wider shrink-0">
                          Acompanhar
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/60">
                <h2 className="font-black text-slate-900 tracking-tight text-lg mb-6 border-b border-slate-100 pb-4">
                  Funil de Integração
                </h2>

                <div className="space-y-3">
                  <div className="bg-slate-50/80 border border-slate-200/40 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                        Total Visitantes
                      </p>
                      <h3 className="text-2xl font-black text-slate-900 mt-0.5">
                        {visitantes.length}
                      </h3>
                    </div>
                    <Users className="text-slate-400/80" size={24} />
                  </div>

                  <div className="bg-amber-50/60 border border-amber-100/50 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-amber-700 text-xs font-bold uppercase tracking-wider">
                        Pendentes
                      </p>
                      <h3 className="text-2xl font-black text-amber-800 mt-0.5">
                        {pendentes}
                      </h3>
                    </div>
                    <Clock className="text-amber-500/80" size={24} />
                  </div>

                  <div className="bg-emerald-50/60 border border-emerald-100/50 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-emerald-700 text-xs font-bold uppercase tracking-wider">
                        Respostas Positivas
                      </p>
                      <h3 className="text-2xl font-black text-emerald-800 mt-0.5">
                        {positivos}
                      </h3>
                    </div>
                    <Heart className="text-emerald-500/80" size={24} />
                  </div>

                  <div className="bg-blue-50/60 border border-blue-100/50 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-blue-700 text-xs font-bold uppercase tracking-wider">
                        Confirmados no Café
                      </p>
                      <h3 className="text-2xl font-black text-blue-800 mt-0.5">
                        {confirmadosCafe}
                      </h3>
                    </div>
                    <Coffee className="text-blue-500/80" size={24} />
                  </div>

                  <div className="bg-indigo-50/60 border border-indigo-100/50 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-indigo-700 text-xs font-bold uppercase tracking-wider">
                        Integrados na Igreja
                      </p>
                      <h3 className="text-2xl font-black text-indigo-800 mt-0.5">
                        {integrados}
                      </h3>
                    </div>
                    <CheckCircle2 className="text-indigo-500/80" size={24} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {mostrarRelatorio && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4 sm:p-8 print:bg-white print:block print:static">
          <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-slate-100 print:max-w-full print:max-h-full print:rounded-none print:shadow-none print:border-none print:p-0">
            <div className="flex justify-between items-center mb-6 border-b border-slate-200 pb-4 print:hidden">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Relatório Pastoral
              </h2>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition"
                >
                  <Printer size={14} />
                  Imprimir
                </button>

                <button
                  type="button"
                  onClick={() => setMostrarRelatorio(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-8 hidden print:block border-b-2 border-slate-900 pb-3">
              Relatório Pastoral CONECTA IPI
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-lg font-black text-slate-800 tracking-tight border-b border-slate-100 pb-2">
                  Resumo Executivo
                </h3>

                <div className="space-y-2.5 text-sm font-medium text-slate-600">
                  <div className="flex justify-between py-1.5 border-b border-slate-50">
                    <span>Visitantes no período:</span>
                    <span className="font-bold text-slate-900">
                      {visitantesFiltrados.length}
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-slate-50">
                    <span>Pendentes:</span>
                    <span className="font-bold text-amber-700">
                      {pendentes}
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-slate-50">
                    <span>Aguardando resposta:</span>
                    <span className="font-bold text-slate-900">
                      {aguardando}
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-slate-50">
                    <span>Resposta positiva:</span>
                    <span className="font-bold text-emerald-700">
                      {positivos}
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-slate-50">
                    <span>Confirmados café:</span>
                    <span className="font-bold text-blue-700">
                      {confirmadosCafe}
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-slate-50">
                    <span>Integrados:</span>
                    <span className="font-bold text-indigo-700">
                      {integrados}
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-slate-50">
                    <span>Arquivados:</span>
                    <span className="font-bold text-slate-900">
                      {arquivados}
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-slate-50">
                    <span>Sem contato +7 dias:</span>
                    <span className="font-bold text-red-600">
                      {semContato}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-black text-slate-800 tracking-tight border-b border-slate-100 pb-2">
                  Visitantes Recentes
                </h3>

                <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1 print:max-h-none print:overflow-visible">
                  {visitantesFiltrados.slice(0, 15).map((v) => (
                    <div
                      key={v.id}
                      className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/50 print:bg-white print:border-slate-200"
                    >
                      <div className="font-bold text-slate-900 text-sm tracking-tight">
                        {v.nome}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500 font-medium mt-1">
                        <span>{v.telefone || 'Sem telefone'}</span>

                        {v.cidade && (
                          <span>
                            • {v.cidade}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {visitantesFiltrados.length === 0 && (
                    <div className="text-center py-8 text-xs text-slate-400 font-medium border border-dashed border-slate-200 rounded-xl">
                      Nenhum visitante encontrado no período selecionado.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}