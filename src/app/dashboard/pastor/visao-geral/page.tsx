'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { 
  BarChart3, Loader2, AlertTriangle, Users, 
  TrendingUp, Footprints, Clock, ShieldAlert, 
  ArrowLeft, Printer, Coffee, HelpCircle, Eye
} from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

interface MetricasTrilho {
  totalNoTrilho: number
  faseVisitante: number // Pessoas cadastradas em visitantes mas que ainda não entraram no trilho
  faseCafe: number      // Pessoas na primeira coluna (Sala de Novos / Recém-chegados do café)
  batismoRecebimento: number
  fase2Engajamento: number
  fase3Ministerio: number
  totalRetidos: number
  semGC: number
  semMinisterio: number
}

export default function VisaoGeralPastorPage() {
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [totalVisitantes, setTotalVisitantes] = useState(0)
  const [filtroRelatorio, setFiltroRelatorio] = useState<'geral' | 'criticos' | 'consolidacao'>('geral')
  const [metricas, setMetricas] = useState<MetricasTrilho>({
    totalNoTrilho: 0,
    faseVisitante: 0,
    faseCafe: 0,
    batismoRecebimento: 0,
    fase2Engajamento: 0,
    fase3Ministerio: 0,
    totalRetidos: 0,
    semGC: 0,
    semMinisterio: 0
  })

  useEffect(() => {
    async function carregarMetricasEstrategicas() {
      try {
        setLoading(true)
        setErro(null)

        // 1. Busca contagem geral de visitantes cadastrados
        const { count: countVisitantes, error: errV } = await supabase
          .from('visitantes')
          .select('*', { count: 'exact', head: true })
        
        if (errV) throw errV
        const totalVis = countVisitantes || 0
        setTotalVisitantes(totalVis)

        // 2. Busca dados do Trilho de Crescimento
        const { data: trilhoData, error: errT } = await supabase
          .from('trilho_crescimento')
          .select('etapa_atual, ultima_interacao, gc_vinculado, ministerio_ativo')

        if (errT) throw errT

        if (trilhoData) {
          const hoje = new Date()
          
          let salaNovos = 0 // Correspondente à fase Café
          let batismo = 0
          let engajamento = 0
          let ministerio = 0
          let retidos = 0
          let sGC = 0
          let sMin = 0

          trilhoData.forEach(item => {
            if (item.etapa_atual === 'SALA_DE_NOVOS') salaNovos++
            if (item.etapa_atual === 'BATISMO_RECEBIMENTO') batismo++
            if (item.etapa_atual === 'FASE_2_ENGAJAMENTO' && !item.gc_vinculado) sGC++
            if (item.etapa_atual === 'FASE_2_ENGAJAMENTO') engajamento++
            if (item.etapa_atual === 'FASE_3_MINISTERIO' && !item.ministerio_ativo) sMin++
            if (item.etapa_atual === 'FASE_3_MINISTERIO') ministerio++

            // Cálculo de retenção crítica (>= 21 dias sem alteração)
            const ultimaInteracao = new Date(item.ultima_interacao)
            const diasParado = Math.floor((hoje.getTime() - ultimaInteracao.getTime()) / (1000 * 60 * 60 * 24))
            if (diasParado >= 21) {
              retidos++
            }
          })

          // Fase Visitante Pura = Total cadastrados menos os que já estão trilhando alguma etapa
          const visitantesPuros = totalVis - trilhoData.length

          setMetricas({
            totalNoTrilho: trilhoData.length,
            faseVisitante: visitantesPuros > 0 ? visitantesPuros : 0,
            faseCafe: salaNovos,
            batismoRecebimento: batismo,
            fase2Engajamento: engajamento,
            fase3Ministerio: ministerio,
            totalRetidos: retidos,
            semGC: sGC,
            semMinisterio: sMin
          })
        }

      } catch (err: any) {
        console.error('Erro na visão do pastor:', err)
        setErro(err?.message || 'Erro ao processar dados analíticos.')
      } finally {
        setLoading(false)
      }
    }

    carregarMetricasEstrategicas()
  }, [])

  const taxaMembresia = metricas.totalNoTrilho > 0 
    ? Math.round(((metricas.batismoRecebimento + metricas.fase2Engajamento + metricas.fase3Ministerio) / metricas.totalNoTrilho) * 100)
    : 0

  const acionarImpressao = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 text-slate-400 print:hidden">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <span className="text-xs font-bold tracking-wider uppercase">Gerando Painel de Saúde Pastoral...</span>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8 print:p-0 print:max-w-full print:bg-white">
      
      {/* Elementos Ocultados na Impressão */}
      <div className="flex justify-between items-center print:hidden">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors">
          <ArrowLeft size={14} /> Voltar ao Painel Principal
        </Link>
        
        <div className="flex items-center gap-2">
          <Link 
            href="/dashboard/pastor/trilho"
            className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition"
          >
            <Footprints size={14} /> Kanban Coletivo
          </Link>
          <button 
            onClick={acionarImpressao}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition"
          >
            <Printer size={14} /> Imprimir Relatório
          </button>
        </div>
      </div>

      {erro && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs font-semibold flex items-center gap-2 print:hidden">
          <AlertTriangle className="text-rose-500" size={16} />
          <span>{erro}</span>
        </div>
      )}

      {/* Cabeçalho do Relatório (Ajustado para o Conselho) */}
      <div className="border-b border-slate-200 pb-5 flex justify-between items-end print:border-b-2 print:border-slate-900">
        <div>
          <span className="hidden print:block text-xxs uppercase tracking-widest font-black text-slate-400 mb-1">Relatório Executivo Oficial</span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="text-indigo-600 print:hidden" size={26} />
            Visão Pastoral & Saúde Estatística
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm font-medium mt-1">
            Análise demográfica de conversão, consolidação de membros e atividade ministerial.
          </p>
        </div>
        <div className="hidden print:block text-right text-xxs font-bold text-slate-500">
          <p>Gerado em: {new Date().toLocaleDateString('pt-BR')}</p>
          <p>Filtro Aplicado: Relatório {filtroRelatorio.toUpperCase()}</p>
        </div>
      </div>

      {/* Controladores de Filtros para a Impressão */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="space-y-0.5">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            Filtro de Exportação para o Conselho
          </h4>
          <p className="text-xxs text-slate-400">Escolha abaixo qual visão de relatório estruturado você deseja imprimir para a reunião.</p>
        </div>
        <div className="flex bg-white border p-1 rounded-xl shadow-xs gap-1">
          <button 
            onClick={() => setFiltroRelatorio('geral')}
            className={`text-xxs px-3 py-1.5 font-bold rounded-lg transition-all ${filtroRelatorio === 'geral' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Visão Geral Completa
          </button>
          <button 
            onClick={() => setFiltroRelatorio('criticos')}
            className={`text-xxs px-3 py-1.5 font-bold rounded-lg transition-all ${filtroRelatorio === 'criticos' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Alertas Críticos e Gargalos
          </button>
          <button 
            onClick={() => setFiltroRelatorio('consolidacao')}
            className={`text-xxs px-3 py-1.5 font-bold rounded-lg transition-all ${filtroRelatorio === 'consolidacao' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Apenas Consolidação (Trilho)
          </button>
        </div>
      </div>

      {/* RENDERIZAÇÃO CONDICIONAL BASEADA NOS FILTROS (VÁLIDO PARA TELA E IMPRESSÃO) */}
      
      {filtroRelatorio === 'geral' && (
        <div className="space-y-6">
          {/* Grid de Cartões Principais (Fase Visitante e Fase Café Inclusas) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-white border border-slate-200 p-4 rounded-xl print:border-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-xxs font-black text-slate-400 uppercase tracking-wider">1. Fase Visitante</span>
                <Users className="text-slate-400 print:hidden" size={14} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">{metricas.faseVisitante}</h3>
              <p className="text-xxs text-slate-400 mt-1">Apenas cadastrados, fora do trilho</p>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-xl print:border-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-xxs font-black text-slate-400 uppercase tracking-wider">2. Fase Café (Novos)</span>
                <Coffee className="text-amber-600 print:hidden" size={14} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">{metricas.faseCafe}</h3>
              <p className="text-xxs text-slate-400 mt-1">Passaram pelo café de boas-vindas</p>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-xl print:border-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-xxs font-black text-slate-400 uppercase tracking-wider">Membresia Ativa</span>
                <TrendingUp className="text-blue-600 print:hidden" size={14} />
              </div>
              <h3 className="text-2xl font-black text-blue-600 mt-1 tracking-tight">{taxaMembresia}%</h3>
              <p className="text-xxs text-slate-400 mt-1">Taxa de conversão da igreja</p>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-xl print:border-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-xxs font-black text-slate-400 uppercase tracking-wider">Casos Retidos (🚨)</span>
                <Clock className="text-rose-600 print:hidden" size={14} />
              </div>
              <h3 className={`text-2xl font-black mt-1 tracking-tight ${metricas.totalRetidos > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{metricas.totalRetidos}</h3>
              <p className="text-xxs text-slate-400 mt-1">Estagnados há +21 dias</p>
            </div>

          </div>

          {/* Gráfico Analítico de Barras para o Conselho */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 print:border-slate-300">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4">Distribuição Demográfica do Rebanho</h3>
            <div className="space-y-4">
              {[
                { label: 'Fase Visitante (Contatos)', valor: metricas.faseVisitante, total: totalVisitantes, cor: 'bg-slate-400' },
                { label: 'Fase Café (Sala de Novos)', valor: metricas.faseCafe, total: totalVisitantes, cor: 'bg-amber-500' },
                { label: 'Celebração e Batismos', valor: metricas.batismoRecebimento, total: totalVisitantes, cor: 'bg-indigo-500' },
                { label: 'Fase 2 (Engajados em GCs/Cursos)', valor: metricas.fase2Engajamento, total: totalVisitantes, cor: 'bg-blue-500' },
                { label: 'Fase 3 (Líderes e Ministérios)', valor: metricas.fase3Ministerio, total: totalVisitantes, cor: 'bg-emerald-500' },
              ].map((item, idx) => {
                const pct = totalVisitantes > 0 ? Math.round((item.valor / totalVisitantes) * 100) : 0
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>{item.label}</span>
                      <span>{item.valor} pessoas ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className={`${item.cor} h-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {filtroRelatorio === 'criticos' && (
        <div className="space-y-6">
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 text-rose-950 space-y-1 print:bg-white print:text-slate-900 print:border-slate-400">
            <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1">
              <ShieldAlert size={14} className="text-rose-600" /> Relatório de Alertas e Vulnerabilidades Gerais
            </h3>
            <p className="text-xxs text-rose-700 print:text-slate-500">Membros mapeados que estão desassistidos de acompanhamento relacional prático ou estagnados nas fases.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-slate-200 p-4 rounded-xl bg-white space-y-1">
              <span className="text-2xl font-black text-rose-600">{metricas.totalRetidos}</span>
              <h4 className="text-xs font-bold text-slate-800">Retidos nas colunas</h4>
              <p className="text-xxs text-slate-400">Pessoas cujo prontuário pastoral não sofreu nenhuma alteração interna por mais de 21 dias seguidos.</p>
            </div>
            <div className="border border-slate-200 p-4 rounded-xl bg-white space-y-1">
              <span className="text-2xl font-black text-amber-600">{metricas.semGC}</span>
              <h4 className="text-xs font-bold text-slate-800">Membros sem Pequeno Grupo</h4>
              <p className="text-xxs text-slate-400">Pessoas na Fase 2 de consolidação que não possuem nenhum vínculo residencial com Grupos de Crescimento (GC).</p>
            </div>
            <div className="border border-slate-200 p-4 rounded-xl bg-white space-y-1">
              <span className="text-2xl font-black text-purple-600">{metricas.semMinisterio}</span>
              <h4 className="text-xs font-bold text-slate-800">Líderes sem Atividade Ativa</h4>
              <p className="text-xxs text-slate-400">Membros que alcançaram a Fase 3 (Ministério), mas estão com o indicador de serviço em branco.</p>
            </div>
          </div>
        </div>
      )}

      {filtroRelatorio === 'consolidacao' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden print:border-slate-400">
          <div className="p-4 bg-slate-50 border-b font-black text-slate-700 text-xs uppercase tracking-wider print:bg-white">
            Tabela de Acompanhamento Macrô por Linha de Conversão
          </div>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-600 print:bg-white">
                <th className="p-3">Identificação da Fase Estratégica</th>
                <th className="p-3 text-center">Quantidade Absoluta</th>
                <th className="p-3 text-right">Representação Absoluta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="p-3 font-semibold text-slate-800">Visitantes Gerais Pendentes</td>
                <td className="p-3 text-center font-bold">{metricas.faseVisitante}</td>
                <td className="p-3 text-right text-slate-500">{totalVisitantes > 0 ? Math.round((metricas.faseVisitante / totalVisitantes) * 100) : 0}%</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-slate-800">Integrados via Café (Sala de Novos)</td>
                <td className="p-3 text-center font-bold">{metricas.faseCafe}</td>
                <td className="p-3 text-right text-slate-500">{totalVisitantes > 0 ? Math.round((metricas.faseCafe / totalVisitantes) * 100) : 0}%</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-slate-800">Prontos para Membresia / Batismo</td>
                <td className="p-3 text-center font-bold">{metricas.batismoRecebimento}</td>
                <td className="p-3 text-right text-slate-500">{totalVisitantes > 0 ? Math.round((metricas.batismoRecebimento / totalVisitantes) * 100) : 0}%</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-slate-800">Membros Ativos com Cursos e GCs</td>
                <td className="p-3 text-center font-bold">{metricas.fase2Engajamento}</td>
                <td className="p-3 text-right text-slate-500">{totalVisitantes > 0 ? Math.round((metricas.fase2Engajamento / totalVisitantes) * 100) : 0}%</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-slate-800">Membros Formados Servindo em Ministérios</td>
                <td className="p-3 text-center font-bold">{metricas.fase3Ministerio}</td>
                <td className="p-3 text-right text-slate-500">{totalVisitantes > 0 ? Math.round((metricas.fase3Ministerio / totalVisitantes) * 100) : 0}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Assinatura de Validação - Visível apenas na folha impressa */}
      <div className="hidden print:flex justify-between items-center pt-16 text-xxs font-bold text-slate-400 border-t border-dashed border-slate-300 mt-12">
        <div>
          <p className="border-t border-slate-400 w-48 text-center pt-1 text-slate-700">Assinatura do Pastor Titular</p>
        </div>
        <div className="text-right">
          <p>Conecta IPI - CRM Ministerial de Consolidação Coletiva</p>
          <p className="font-medium text-slate-400/80">Documento interno confidencial para deliberação do Conselho.</p>
        </div>
      </div>

    </div>
  )
}