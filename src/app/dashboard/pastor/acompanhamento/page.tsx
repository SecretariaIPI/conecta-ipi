'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  Users, Clock, Heart, Coffee, CheckCircle2, Archive,
  AlertTriangle, Loader2, FileText, ArrowLeft, Calendar
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
  const [periodo, setPeriodo] = useState('30d') // Alterado padrão para 30d para evitar tela zerada na virada do mês
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

  // Lógica de período totalmente funcional contra o reset do dia 1º
  const visitorsFiltrados = useMemo(() => {
    const hoje = new Date()
    if (periodo === 'mes') {
      hoje.setDate(1)
      hoje.setHours(0, 0, 0, 0)
      return visitantes.filter((v) => new Date(v.created_at) >= hoje)
    } else if (periodo === '30d') {
      const trintaDiasAtras = new Date()
      trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30)
      return visitantes.filter((v) => new Date(v.created_at) >= trintaDiasAtras)
    }
    return visitantes // 'todos'
  }, [visitantes, periodo])

  // Contadores normalizados com as nomenclaturas reais limpas do banco de dados (case-insensitive)
  const pendentes = followups.filter((f) => String(f.status).toLowerCase().trim() === 'pendente').length
  const aguardando = followups.filter((f) => String(f.status).toLowerCase().trim() === 'aguardando_resposta').length
  const positivos = followups.filter((f) => String(f.status).toLowerCase().trim() === 'resposta_positiva').length
  
  // Quem respondeu positivamente ou confirmou presença na etapa de convite
  const confirmadosCafe = followups.filter((f) => {
    const st = String(f.status).toLowerCase().trim()
    return st === 'confirmado' || st === 'confirmada'
  }).length

  // Modificado para capturar quem de fato deu "compareceu" na etapa do café (pilar do Trilho de Crescimento)
  const integrados = followups.filter((f) => {
    const st = String(f.status).toLowerCase().trim()
    return st === 'compareceu' || st === 'concluido' || st === 'integrado'
  }).length

  const arquivados = followups.filter((f) => {
    const st = String(f.status).toLowerCase().trim()
    return st === 'arquivado' || st === 'nao_vira' || st === 'nao_compareceu'
  }).length

  const semContato = followups.filter((f) => !f.data_contato).length

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 text-slate-400">
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <span className="text-xs font-bold tracking-wider uppercase">Sincronizando Métricas da Dashboard...</span>
      </div>
    )
  }

  return (
    <>
      <div className={mostrarRelatorio ? 'print:hidden' : ''}>
        <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
          
          <div>
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition">
              <ArrowLeft size={14} /> Voltar ao Painel Geral
            </Link>
          </div>

          <div className="border-b border-slate-200 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                <div className="bg-blue-600 p-2 rounded-2xl text-white shadow-sm">
                  <Users size={24} />
                </div>
                Dashboard de Acompanhamento
              </h1>
              <p className="text-slate-500 mt-1.5 text-sm font-medium">
                Métricas detalhadas e controle de engajamento ministerial de visitantes.
              </p>
            </div>

            {/* Filtros e Ações da Dashboard */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-xs">
                <Calendar size={14} className="text-slate-400" />
                <select
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value)}
                  className="text-xs font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="30d">Últimos 30 dias (Recomendado)</option>
                  <option value="mes">Este Mês Atual</option>
                  <option value="todos">Histórico Completo</option>
                </select>
              </div>

              <Link 
                href="/dashboard/cafe-convites" 
                className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-sm transition"
              >
                <Coffee size={15} /> Convites do Café
              </Link>
              
              <button 
                onClick={() => setMostrarRelatorio(true)} 
                className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-sm transition"
              >
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
            <Card titulo="Compareceram / Integrados" valor={integrados} icon={CheckCircle2} variant="success" />
            <Card titulo="Arquivados / Recusas" valor={arquivados} icon={Archive} />
            <Card titulo="Sem contato gravado" valor={semContato} icon={AlertTriangle} variant="danger" />
          </div>
        </div>
      </div>
    </>
  )
}