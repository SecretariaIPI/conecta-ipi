'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
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
  BarChart3,
  GitPullRequest,
  ArrowLeft
} from 'lucide-react'

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
    default: { bg: 'bg-white', iconBg: 'bg-slate-100 text-slate-600', border: 'border-slate-200/60' },
    danger: { bg: 'bg-red-50/40', iconBg: 'bg-red-100 text-red-600', border: 'border-red-100' },
    success: { bg: 'bg-emerald-50/40', iconBg: 'bg-emerald-100 text-emerald-600', border: 'border-emerald-100' },
    warning: { bg: 'bg-amber-50/40', iconBg: 'bg-amber-100 text-amber-600', border: 'border-amber-100' },
    info: { bg: 'bg-blue-50/40', iconBg: 'bg-blue-100 text-blue-600', border: 'border-blue-100' }
  }

  const currentVariant = variantStyles[variant]

  return (
    <div className={`${currentVariant.bg} rounded-2xl border ${currentVariant.border} p-6 shadow-sm transition hover:shadow-md duration-200 print:hidden`}>
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{titulo}</p>
          <h3 className="text-3xl font-black text-slate-900 tracking-tight">{valor}</h3>
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
        supabase.from('visitantes').select('*').order('created_at', { ascending: false }),
        supabase.from('visitantes_followup').select('*')
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
    if (periodo === 'hoje') { hoje.setHours(0, 0, 0, 0); return hoje; }
    if (periodo === '7dias') { hoje.setDate(hoje.getDate() - 7); return hoje; }
    if (periodo === '30dias') { hoje.setDate(hoje.getDate() - 30); return hoje; }
    hoje.setDate(1)
    hoje.setHours(0, 0, 0, 0)
    return hoje
  }

  const visitorsFiltrados = useMemo(() => {
    const limite = dataLimite()
    return visitantes.filter((v) => new Date(v.created_at) >= limite)
  }, [visitantes, periodo])

  const pendentes = followups.filter((f) => f.status === 'pendente').length
  const aguardando = followups.filter((f) => f.status === 'aguardando_resposta').length
  const positivos = followups.filter((f) => f.status === 'resposta_positiva').length
  const confirmadosCafe = followups.filter((f) => f.status === 'confirmado').length
  const integrados = followups.filter((f) => f.status === 'integrated' || f.status === 'integrado').length
  const arquivados = followups.filter((f) => f.status === 'arquivado').length

  const semContato = followups.filter((f) => {
    if (!f.data_contato) return true
    const diff = (new Date().getTime() - new Date(f.data_contato).getTime()) / (1000 * 60 * 60 * 24)
    return diff > 7
  }).length

  const precisamAcao = visitantes.slice(0, 10)

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-2 text-slate-400 text-sm">
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <span className="font-semibold tracking-wide">Carregando dashboard...</span>
      </div>
    )
  }

  return (
    <>
      <div className={mostrarRelatorio ? 'print:hidden' : ''}>
        <div className="max-w-7xl mx-auto space-y-6 p-4">
          
          {/* BOTÃO DE VOLTAR PARA A HOME */}
          <div className="print:hidden">
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition">
              <ArrowLeft size={14} /> Voltar ao Início
            </Link>
          </div>

          <div className="border-b border-slate-200 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                <div className="bg-blue-600 p-2 rounded-2xl text-white shadow-sm shadow-blue-600/20">
                  <TrendingUp size={22} />
                </div>
                Dashboard Pastoral
              </h1>
              <p className="text-slate-500 mt-1.5 text-sm font-medium">
                Visão executiva e estratégica da jornada de integração de visitantes.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/pipeline"
                className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm transition active:scale-95"
              >
                <GitPullRequest size={15} />
                Esteira Kanban 📋
              </Link>

              {/* ROTA CORRIGIDA PARA OS GRÁFICOS */}
              <Link
                href="/dashboard/pastor/analise"
                className="bg-purple-600 text-white hover:bg-purple-700 px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm transition active:scale-95"
              >
                <BarChart3 size={15} />
                Gráficos Analíticos 📊
              </Link>

              <button
                type="button"
                onClick={() => setMostrarRelatorio(true)}
                className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm transition active:scale-95"
              >
                <FileText size={15} />
                Gerar Relatório
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Período de Análise:</span>
            <div className="relative">
              <select
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-xl pl-4 pr-10 py-2 text-xs font-bold text-slate-700 outline-none shadow-2xs cursor-pointer focus:border-blue-500"
              >
                <option value="hoje">Hoje</option>
                <option value="7dias">Últimos 7 dias</option>
                <option value="30dias">Últimos 30 dias</option>
                <option value="mes">Este mês</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <Card titulo="Visitantes no período" valor={visitorsFiltrados.length} icon={Users} variant="info" />
            <Card titulo="Pendentes" valor={pendentes} icon={Clock} variant="warning" />
            <Card titulo="Aguardando resposta" valor={aguardando} icon={Clock} />
            <Card titulo="Resposta positiva" valor={positivos} icon={Heart} variant="success" />
            <Card titulo="Confirmados Café" valor={confirmadosCafe} icon={Coffee} variant="info" />
            <Card titulo="Integrados" valor={integrados} icon={CheckCircle2} variant="success" />
            <Card titulo="Arquivados" valor={arquivados} icon={Archive} />
            <Card titulo="Sem contato +7 dias" valor={semContato} icon={AlertTriangle} variant="danger" />
          </div>
        </div>
      </div>

      {/* Modal do Relatório */}
      {mostrarRelatorio && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4 print:bg-white print:block print:static">
          <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-100 print:p-0">
            <div className="flex justify-between items-center mb-6 border-b border-slate-200 pb-4 print:hidden">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Relatório Pastoral</h2>
              <button type="button" onClick={() => setMostrarRelatorio(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center">
                <X size={16} /> Fechar
              </button>
            </div>
            {/* Conteúdo do relatório... */}
          </div>
        </div>
      )}
    </>
  )
}