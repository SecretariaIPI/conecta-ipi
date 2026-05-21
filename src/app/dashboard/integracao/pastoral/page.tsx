'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  TrendingUp,
  Users,
  Clock,
  Compass,
  Award,
  AlertOctagon,
  ChevronLeft,
  Loader2,
  Calendar,
  BarChart3
} from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const NOMES_ETAPAS: Record<string, string> = {
  VISITOU: 'Visitou',
  CONTATO: '1º Contato',
  POSITIVO: 'Feedback Positivo',
  CAFÉ: 'Café Integração',
  PARTICIPOU: 'Participando',
  SALA_NOVOS: 'Sala Novos',
  GC: 'GC',
  BATISMO: 'Batismo',
  MEMBRESIA: 'Membresia',
  SERVINDO: 'Servindo',
  INTEGRADO: 'Integrado 🚀',
  ARQUIVADO: 'Arquivado 📂'
}

type MetricasGerais = {
  total_historico: number
  total_integrados: number
  total_ativos: number
  total_arquivados: number
  tempo_medio_integracao_dias: number
}

type OrigemMembro = {
  origem: string
  quantidade: number
  percentual: number
}

type LiderAtivo = {
  responsavel: string
  ativos: number
  concluidos: number
}

type GargaloEtapa = {
  etapa: string
  quantidade: number
  media_dias_parado: number
}

type PipelineAnalitico = {
  etapa: string
  responsavel: string | null
  data_ultima_movimentacao: string
  integrado: boolean
  visitantes?: {
    origem?: string | null
  }
}

export default function DashboardExecutivoPastor() {
  const [loading, setLoading] = useState(true)
  const [metricas, setMetricas] = useState<MetricasGerais | null>(null)
  const [origens, setOrigens] = useState<OrigemMembro[]>([])
  const [lideres, setLideres] = useState<LiderAtivo[]>([])
  const [gargalos, setGargalos] = useState<GargaloEtapa[]>([])

  useEffect(() => {
    carregarDadosAnaliticos()
  }, [])

  async function carregarDadosAnaliticos() {
    setLoading(true)

    const {
      data: viewData,
      error: viewError
    } = await supabase
      .from('vw_dashboard_pastoral_analitico')
      .select('*')
      .single()

    if (viewError) {
      console.error('Erro view dashboard:', viewError.message)
    }

    if (viewData) {
      setMetricas(viewData)
    }

    const {
      data: pipelineData,
      error: pipelineError
    } = await supabase
      .from('integracao_pipeline')
      .select(`
        etapa,
        responsavel,
        data_ultima_movimentacao,
        integrado,
        visitantes (
          origem
        )
      `)

    if (pipelineError) {
      console.error('Erro pipeline analytics:', pipelineError.message)
    }

    if (pipelineData) {
      processarMetricasComplexas(
        pipelineData as PipelineAnalitico[]
      )
    }

    setLoading(false)
  }

  function processarMetricasComplexas(
    dados: PipelineAnalitico[]
  ) {
    const hoje = new Date()

    const contagemOrigens: Record<string, number> = {}
    let totalComOrigem = 0

    dados.forEach((item) => {
      const ori = item.visitantes?.origem || 'Não Informada'
      contagemOrigens[ori] = (contagemOrigens[ori] || 0) + 1
      totalComOrigem++
    })

    const listaOrigens = Object.keys(contagemOrigens)
      .map((key) => ({
        origem: key,
        quantidade: contagemOrigens[key],
        percentual:
          totalComOrigem > 0
            ? Math.round(
                (contagemOrigens[key] / totalComOrigem) * 100
              )
            : 0
      }))
      .sort((a, b) => b.quantidade - a.quantidade)

    setOrigens(listaOrigens)

    const mapaLideres: Record<
      string,
      {
        whites?: unknown
        ativos: number
        concluidos: number
      }
    > = {}

    dados.forEach((item) => {
      if (!item.responsavel) return

      if (!mapaLideres[item.responsavel]) {
        mapaLideres[item.responsavel] = {
          ativos: 0,
          concluidos: 0
        }
      }

      if (item.integrado) {
        mapaLideres[item.responsavel].concluidos++
      } else if (item.etapa !== 'ARQUIVADO') {
        mapaLideres[item.responsavel].ativos++
      }
    })

    const listaLideres = Object.keys(mapaLideres)
      .map((key) => ({
        responsavel: key,
        ativos: mapaLideres[key].ativos,
        concluidos: mapaLideres[key].concluidos
      }))
      .sort(
        (a, b) =>
          b.ativos +
          b.concluidos -
          (a.ativos + a.concluidos)
      )

    setLideres(listaLideres.slice(0, 5))

    const mapaGargalos: Record<
      string,
      {
        qtd: number
        somaDias: number
      }
    > = {}

    dados.forEach((item) => {
      if (item.integrado || item.etapa === 'ARQUIVADO') return

      const ultimaMov = new Date(
        item.data_ultima_movimentacao
      )

      const dias = Math.floor(
        (hoje.getTime() - ultimaMov.getTime()) /
          (1000 * 60 * 60 * 24)
      )

      if (!mapaGargalos[item.etapa]) {
        mapaGargalos[item.etapa] = {
          qtd: 0,
          somaDias: 0
        }
      }

      mapaGargalos[item.etapa].qtd++
      mapaGargalos[item.etapa].somaDias += dias
    })

    const listaGargalos = Object.keys(mapaGargalos)
      .map((key) => ({
        etapa: NOMES_ETAPAS[key] || key,
        quantidade: mapaGargalos[key].qtd,
        media_dias_parado: Math.round(
          mapaGargalos[key].somaDias /
            mapaGargalos[key].qtd
        )
      }))
      .sort(
        (a, b) =>
          b.media_dias_parado - a.media_dias_parado
      )

    setGargalos(listaGargalos)
  }

  const taxaConsolidacao =
    metricas &&
    metricas.total_historico > 0
      ? Math.round(
          (metricas.total_integrados /
            metricas.total_historico) *
            100
        )
      : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-2 text-slate-400 text-sm">
        <Loader2
          className="animate-spin text-indigo-600"
          size={32}
        />
        <span className="font-semibold tracking-wide">
          Calculando índices de consolidação pastoral...
        </span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto space-y-8">
        
        {/* CABEÇALHO */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest">
              <BarChart3 size={14} />
              Relatórios de Alta Gestão
            </div>

            <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">
              Dashboard Executivo do Pastor
            </h1>

            <p className="text-slate-500 text-sm font-medium mt-1">
              Análise estratégica de retenção, velocidade de integração e eficiência da liderança.
            </p>
          </div>

          <Link
            href="/dashboard/integracao"
            className="w-fit bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition active:scale-95 shadow-sm"
          >
            <ChevronLeft size={14} />
            Voltar ao Quadro Kanban
          </Link>
        </div>

        {/* METRICAS CHAVE */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-2xs">
            <div className="flex justify-between items-start text-indigo-600 mb-4">
              <div className="p-2.5 bg-indigo-50 rounded-xl">
                <TrendingUp size={20} />
              </div>

              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
                Métrica Alvo
              </span>
            </div>

            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
              Taxa de Consolidação
            </p>

            <h3 className="text-3xl font-black text-slate-900 mt-1 tracking-tight">
              {taxaConsolidacao}%
            </h3>

            <p className="text-[11px] text-slate-400 font-medium mt-2">
              Do total de visitantes que entram no fluxo.
            </p>
          </div>

          <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-2xs">
            <div className="flex justify-between items-start text-blue-600 mb-4">
              <div className="p-2.5 bg-blue-50 rounded-xl">
                <Clock size={20} />
              </div>
            </div>

            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
              Tempo Médio até Integrar
            </p>

            <h3 className="text-3xl font-black text-slate-900 mt-1 tracking-tight">
              {metricas?.tempo_medio_integracao_dias || 0}
              <span className="text-base font-bold text-slate-400 ml-1">
                dias
              </span>
            </h3>

            <p className="text-[11px] text-slate-400 font-medium mt-2">
              Velocidade média da jornada completa.
            </p>
          </div>

          <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-2xs">
            <div className="flex justify-between items-start text-emerald-600 mb-4">
              <div className="p-2.5 bg-emerald-50 rounded-xl">
                <Users size={20} />
              </div>
            </div>

            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
              Ativos em Jornada
            </p>

            <h3 className="text-3xl font-black text-slate-900 mt-1 tracking-tight">
              {metricas?.total_ativos || 0}
            </h3>

            <p className="text-[11px] text-slate-400 font-medium mt-2">
              Pessoas recebendo cuidado neste momento.
            </p>
          </div>

          <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-2xs">
            <div className="flex justify-between items-start text-slate-600 mb-4">
              <div className="p-2.5 bg-slate-50 rounded-xl">
                <Calendar size={20} />
              </div>
            </div>

            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
              Conversões Concluídas
            </p>

            <h3 className="text-3xl font-black text-slate-900 mt-1 tracking-tight">
              {metricas?.total_integrados || 0}
            </h3>

            <p className="text-[11px] text-emerald-600 font-bold mt-2 flex items-center gap-0.5">
              🚀 Membros totalmente consolidados
            </p>
          </div>
        </div>

        {/* GRID SECUNDÁRIO ANALÍTICO */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* DE ONDE VÊM OS VISITANTES */}
          <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Compass size={16} className="text-indigo-600" />
              <h3 className="font-black text-sm text-slate-800 uppercase tracking-wide">
                De onde vêm os visitantes?
              </h3>
            </div>

            <div className="space-y-3">
              {origens.map((ori, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>{ori.origem}</span>
                    <span className="text-indigo-600">
                      {ori.quantidade} ({ori.percentual}%)
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full"
                      style={{ width: `${ori.percentual}%` }}
                    />
                  </div>
                </div>
              ))}

              {origens.length === 0 && (
                <p className="text-xs text-slate-400 italic">
                  Sem registros mapeados.
                </p>
              )}
            </div>
          </div>

          {/* LÍDERES MAIS ATIVOS */}
          <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Award size={16} className="text-amber-500" />
              <h3 className="font-black text-sm text-slate-800 uppercase tracking-wide">
                Líderes Mais Ativos (Top 5)
              </h3>
            </div>

            <div className="divide-y divide-slate-100">
              {lideres.map((lid, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2.5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">
                      #{idx + 1}
                    </div>

                    <span className="font-bold text-slate-800">
                      {lid.responsavel}
                    </span>
                  </div>

                  <div className="flex gap-3 text-right">
                    <div>
                      <span className="block text-[9px] font-bold uppercase text-slate-400">
                        Cuidando
                      </span>
                      <span className="font-extrabold text-indigo-600">
                        {lid.ativos}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[9px] font-bold uppercase text-slate-400">
                        Integrados
                      </span>
                      <span className="font-extrabold text-emerald-600">
                        {lid.concluidos}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {lideres.length === 0 && (
                <p className="text-xs text-slate-400 italic py-2">
                  Atribua responsáveis no pipeline pastoral.
                </p>
              )}
            </div>
          </div>

          {/* MAPEAMENTO DE GARGALOS */}
          <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <AlertOctagon size={16} className="text-red-500" />
              <h3 className="font-black text-sm text-slate-800 uppercase tracking-wide">
                Mapeamento de Gargalos
              </h3>
            </div>

            <div className="divide-y divide-slate-100">
              {gargalos.map((gar, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2.5 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-800 block">
                      {gar.etapa}
                    </span>

                    <span className="text-[10px] font-medium text-slate-400">
                      {gar.quantidade} membros retidos
                    </span>
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-block px-2 py-1 rounded-lg text-[10px] font-black ${
                        gar.media_dias_parado >= 7
                          ? 'bg-red-50 text-red-700 border border-red-100'
                          : 'bg-slate-50 text-slate-600'
                      }`}
                    >
                      Média {gar.media_dias_parado} dias
                    </span>
                  </div>
                </div>
              ))}

              {gargalos.length === 0 && (
                <p className="text-xs text-slate-400 italic py-2">
                  Nenhum gargalo ativo detectado.
                </p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}