'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  Users, Clock, Heart, Coffee, CheckCircle2, Archive,
  AlertTriangle, X, Loader2, TrendingUp, ChevronDown,
  FileText, ArrowLeft, BarChart3
} from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

type Visitante = { id: string; nome: string; telefone: string | null; cidade: string | null; created_at: string }
type Followup = { visitante_id: string; etapa: string; status: string; data_contato: string | null }

interface CardProps {
  titulo: string; valor: number; icon: React.ComponentType<{ size?: number; className?: string }>;
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

export default function AcompanhamentoPage() {
  const [visitantes, setVisitantes] = useState<Visitante[]>([])
  const [followups, setFollowups] = useState<Followup[]>([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('mes')
  const [mostrarRelatorio, setMostrarRelatorio] = useState(false)

  useEffect(() => { carregarDados() }, [])

  async function carregarDados() {
    try {
      setLoading(true)
      const [vResp, fResp] = await Promise.all([
        supabase.from('visitantes').select('*').order('created_at', { ascending: false }),
        supabase.from('visitantes_followup').select('*')
      ])
      setVisitantes(vResp.data || [])
      setFollowups(fResp.data || [])
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const visitorsFiltrados = useMemo(() => {
    const hoje = new Date()
    hoje.setDate(1); hoje.setHours(0,0,0,0)
    return visitantes.filter((v) => new Date(v.created_at) >= hoje)
  }, [visitantes])

  const pendentes = followups.filter((f) => f.status === 'pendente').length
  const aguardando = followups.filter((f) => f.status === 'aguardando_resposta').length
  const positivos = followups.filter((f) => f.status === 'resposta_positiva').length
  const confirmadosCafe = followups.filter((f) => f.status === 'confirmado').length
  const integrados = followups.filter((f) => f.status === 'integrated' || f.status === 'integrado').length
  const arquivados = followups.filter((f) => f.status === 'arquivado').length
  const semContato = followups.filter((f) => !f.data_contato).length

  if (loading) return <div className="p-8 text-center text-sm font-semibold text-slate-400">Carregando acompanhamento...</div>

  return (
    <>
      <div className={mostrarRelatorio ? 'print:hidden' : ''}>
        <div className="max-w-7xl mx-auto space-y-6 p-4">
          
          {/* Botão de Voltar para a Dashboard Principal */}
          <div>
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition">
              <ArrowLeft size={14} /> Voltar ao Painel Geral
            </Link>
          </div>

          <div className="border-b border-slate-200 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                <div className="bg-blue-600 p-2 rounded-2xl text-white shadow-sm">
                  <TrendingUp size={22} />
                </div>
                Dashboard de Acompanhamento
              </h1>
              <p className="text-slate-500 mt-1.5 text-sm font-medium">
                Métricas detalhadas e controle de engajamento ministerial de visitantes.
              </p>
            </div>

            <div className="flex gap-2">
              <Link href="/dashboard/pastor" className="bg-purple-600 text-white hover:bg-purple-700 px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-sm">
                <BarChart3 size={15} /> Ver Gráficos Analíticos
              </Link>
              <button onClick={() => setMostrarRelatorio(true)} className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-sm">
                <FileText size={15} /> Gerar Relatório
              </button>
            </div>
          </div>

          {/* Grid de Cards */}
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
    </>
  )
}