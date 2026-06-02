'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { 
  BarChart3, Loader2, AlertTriangle, Users, 
  TrendingUp, Footprints, Clock, ShieldAlert, 
  ArrowLeft, Printer, Coffee, Church
} from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

interface MetricasTrilho {
  totalNoTrilho: number
  faseVisitante: number 
  faseCafe: number      
  batismoRecebimento: number
  fase2Engajamento: number
  fase3Ministerio: number
  totalRetidos: number
  semGC: number
  semMinisterio: number
}

interface DenominacaoRanking {
  nome: string
  qtd: number
}

export default function VisaoGeralPastorPage() {
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [totalVisitantes, setTotalVisitantes] = useState(0)
  const [filtroRelatorio, setFiltroRelatorio] = useState<'geral' | 'criticos' | 'consolidacao'>('geral')
  const [estatisticasOrigem, setEstatisticasOrigem] = useState<{ [key: string]: number }>({})
  const [rankingIgrejas, setRankingIgrejas] = useState<DenominacaoRanking[]>([])
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

        // 1. Busca dados gerais de visitantes ativos
        const { data: visitantesData, error: errV } = await supabase
          .from('visitantes')
          .select('id, origem, data_visita')
        
        if (errV) throw errV
        
        const totalVis = visitantesData?.length || 0
        setTotalVisitantes(totalVis)

        if (visitantesData) {
          const mapaIgrejasEspecificas: { [key: string]: number } = {}

          const mapaOrigens = visitantesData.reduce((acc: { [key: string]: number }, v) => {
            let chave = v.origem || 'Não informou'
            
            if (chave.startsWith('Igreja Evangélica')) {
              acc['Igreja Evangélica'] = (acc['Igreja Evangélica'] || 0) + 1
              
              const extrairNome = chave.match(/\(([^)]+)\)/)
              if (extrairNome && extrairNome[1]) {
                const nomeIgreja = extrairNome[1].trim()
                const nomeFormatado = nomeIgreja.charAt(0).toUpperCase() + nomeIgreja.slice(1).toLowerCase()
                mapaIgrejasEspecificas[nomeFormatado] = (mapaIgrejasEspecificas[nomeFormatado] || 0) + 1
              } else {
                mapaIgrejasEspecificas['Outras Evangélicas (Não especificada)'] = (mapaIgrejasEspecificas['Outras Evangélicas (Não especificada)'] || 0) + 1
              }
            } else {
              acc[chave] = (acc[chave] || 0) + 1
            }
            return acc
          }, {})

          setEstatisticasOrigem(mapaOrigens)

          const rankingOrdenado = Object.keys(mapaIgrejasEspecificas)
            .map(nome => ({ nome, qtd: mapaIgrejasEspecificas[nome] }))
            .sort((a, b) => b.qtd - a.qtd)

          setRankingIgrejas(rankingOrdenado)
        }

        // 2. CORRIGIDO: Busca dados do Trilho usando visitante_id
        const { data: trilhoData, error: errT } = await supabase
          .from('trilho_crescimento')
          .select('id, visitante_id, etapa_atual, ultima_interacao, gc_vinculado, ministerio_ativo')

        if (errT) throw errT

        // 3. CORRIGIDO: Busca followups usando a coluna real visitante_id
        const { data: followupData } = await supabase
          .from('visitantes_followup')
          .select('visitante_id, etapa, status')

        const hoje = new Date()
        let salaNovos = 0 
        let batismo = 0
        let engajamento = 0
        let ministerio = 0
        let retidos = 0
        let sGC = 0
        let sMin = 0

        // CORRIGIDO: Validação limpa e case-insensitive alinhada com as ações reais do banco (pos_cafe + compareceu)
        const alcancouFaseCafe = new Set(
          (followupData || [])
            .filter(f => {
              const etapaBd = String(f.etapa || '').toLowerCase().trim()
              const statusBd = String(f.status || '').toLowerCase().trim()
              return (etapaBd === 'pos_cafe' && statusBd === 'compareceu') || 
                     (etapaBd === 'convite_cafe' || etapaBd === 'cafe') && (statusBd === 'concluido' || statusBd === 'realizado')
            })
            .map(f => f.visitante_id)
        )

        const visitantesComTrilhoAtivo = new Set<string>()

        if (trilhoData) {
          trilhoData.forEach(item => {
            // Garante leitura segura caso mude entre visitante_id ou pessoa_id em tabelas legadas
            const idDoVinculo = item.visitante_id || (item as any).pessoa_id;

            if (!idDoVinculo) return;

            // Computa quem está na Sala de Novos / Café ou avançou pelas colunas do Kanban
            if ((item.etapa_atual === 'SALA_DE_NOVOS' || item.etapa_atual === 'CAFE') && alcancouFaseCafe.has(idDoVinculo)) {
              salaNovos++
              visitantesComTrilhoAtivo.add(idDoVinculo)
            } else if (item.etapa_atual === 'BATISMO_RECEBIMENTO') {
              batismo++
              visitantesComTrilhoAtivo.add(idDoVinculo)
            } else if (item.etapa_atual === 'FASE_2_ENGAJAMENTO') {
              engajamento++
              if (!item.gc_vinculado) sGC++
              visitantesComTrilhoAtivo.add(idDoVinculo)
            } else if (item.etapa_atual === 'FASE_3_MINISTERIO') {
              ministerio++
              if (!item.ministerio_ativo) sMin++
              visitantesComTrilhoAtivo.add(idDoVinculo)
            }

            // Cálculo de estagnação (+21 dias)
            if (visitantesComTrilhoAtivo.has(idDoVinculo)) {
              const ultimaInteracao = new Date(item.ultima_interacao || hoje)
              const diasParado = Math.floor((hoje.getTime() - ultimaInteracao.getTime()) / (1000 * 60 * 60 * 24))
              if (diasParado >= 21) {
                retidos++
              }
            }
          })
        }

        // Todos os que não estão no trilho ativo são Visitantes Puros
        const visitantesPuros = totalVis - visitantesComTrilhoAtivo.size

        // Soma os cadastros parados na raiz do sistema
        visitantesData?.forEach(v => {
          if (!visitantesComTrilhoAtivo.has(v.id)) {
            const dataVis = new Date(v.data_visita || hoje)
            if (Math.floor((hoje.getTime() - dataVis.getTime()) / (1000 * 60 * 60 * 24)) >= 21) {
              retidos++
            }
          }
        })

        setMetricas({
          totalNoTrilho: visitantesComTrilhoAtivo.size,
          faseVisitante: visitantesPuros > 0 ? visitantesPuros : 0,
          faseCafe: salaNovos,
          batismoRecebimento: batismo,
          fase2Engajamento: engajamento,
          fase3Ministerio: ministerio,
          totalRetidos: retidos,
          semGC: sGC,
          semMinisterio: sMin
        })

      } catch (err: any) {
        console.error('Erro na visão do pastor:', err)
        setErro(err?.message || 'Erro ao processar dados analíticos.')
      } finally {
        setLoading(false)
      }
    }

    carregarMetricasEstrategicas()
  }, [])

  const taxaMembresia = totalVisitantes > 0 
    ? Math.round(((metricas.batismoRecebimento + metricas.fase2Engajamento + metricas.fase3Ministerio) / totalVisitantes) * 100)
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

      {/* Cabeçalho do Relatório */}
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

      {/* Controladores de Filtros */}
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

      {/* PAINEL DE ORIGEM RELIGIOSA */}
      {filtroRelatorio === 'geral' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6 w-full print:border-slate-300">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl print:hidden">
                <Users size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Origem Religiosa dos Visitantes</h3>
                <p className="text-xxs font-medium text-slate-400">Raio-X de mapeamento evangelístico e background dos novos contatos.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {['Igreja Católica', 'Igreja Evangélica', 'Não pertence a nenhuma igreja', 'Não informou'].map((opcao) => {
                const qtd = estatisticasOrigem[opcao] || 0
                const porcentagem = totalVisitantes > 0 ? Math.round((qtd / totalVisitantes) * 100) : 0
                return (
                  <div key={opcao} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col justify-between space-y-3 print:bg-white print:border-slate-300">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-bold text-slate-600 tracking-tight leading-snug">{opcao}</span>
                      <span className="text-base font-black text-slate-900 whitespace-nowrap">
                        {qtd} <span className="text-xxs text-slate-400 font-bold">({porcentagem}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${porcentagem}%` }}></div>
                    </div>
                  </div>
                )
              })}
            </div>

            {rankingIgrejas.length > 0 && (
              <div className="border-t border-slate-100 pt-5 space-y-3 print:border-slate-300">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Church size={14} className="text-slate-500" /> Detalhamento de Denominações Evangélicas Anteriores
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {rankingIgrejas.map((igreja, idx) => {
                    const totalEvangelicos = estatisticasOrigem['Igreja Evangélica'] || 1
                    const percentualDoSegmento = Math.round((igreja.qtd / totalEvangelicos) * 100)
                    return (
                      <div key={idx} className="bg-slate-50/60 border border-slate-200/60 px-4 py-2.5 rounded-xl flex justify-between items-center text-xs font-medium text-slate-700 print:bg-white print:border-slate-300">
                        <span className="truncate max-w-[180px] font-bold text-slate-800">
                          {idx + 1}. {igreja.nome}
                        </span>
                        <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-xxs font-black px-2 py-0.5 rounded-md whitespace-nowrap">
                          {igreja.qtd} {igreja.qtd === 1 ? 'pessoa' : 'pessoas'} ({percentualDoSegmento}%)
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* GRIDS DOS FILTROS ORIGINAIS */}
      {filtroRelatorio === 'geral' && (
        <div className="space-y-6">
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

          <div className="bg-white border border-slate-200 rounded-xl p-5 print:border-slate-300">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4">Distribuição Demográfica do Rebanho</h3>
            <div className="space-y-4">
              {[
                { label: 'Fase Visitante (Contatos)', valor: metricas.faseVisitante, total: totalVisitantes, cor: 'bg-slate-800' },
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
            Tabela de Acompanhamento Macro por Linha de Conversão
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

      {/* Assinatura de Validação */}
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