'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { 
  BarChart3, Loader2, AlertTriangle, Users, 
  TrendingUp, Footprints, ShieldAlert, 
  ArrowLeft, Printer, Church, HeartPulse,
  CalendarDays, ArrowDown, HelpCircle, Compass, PlaneTakeoff
} from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

interface MetricasTrilho {
  totalNoTrilho: number
  faseChegada: number      // Novos visitantes recebidos
  faseIntegracao: number    // Conectados através do Café e acolhimento
  batismoRecebimento: number // Batismo, membresia e fundamentos (Discipulado)
  faseDiscipulado: number   // Participação ativa em GC (Comunhão)
  faseEnvio: number        // Servindo em ministérios e missão (Envio)
  totalRetidos: number
  semGC: number
  semMinisterio: number
}

interface DenominacaoRanking {
  nome: string
  qtd: number
}

interface VolumetriaTempo {
  ultimos30: number
  ultimos90: number
  esteAno: number
}

interface MesTendencia {
  nome: string
  qtd: number
}

interface MapaRisco {
  alto: number   
  medio: number  
  baixo: number  
}

export default function VisaoGeralPastorPage() {
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [totalVisitantes, setTotalVisitantes] = useState(0)
  const [filtroRelatorio, setFiltroRelatorio] = useState<'geral' | 'criticos' | 'consolidacao'>('geral')
  const [estatisticasOrigem, setEstatisticasOrigem] = useState<{ [key: string]: number }>({})
  const [rankingIgrejas, setRankingIgrejas] = useState<DenominacaoRanking[]>([])
  
  // Janelas temporais, riscos e saúde
  const [volumeTempo, setVolumeTempo] = useState<VolumetriaTempo>({ ultimos30: 0, ultimos90: 0, esteAno: 0 })
  const [mapaRisco, setMapaRisco] = useState<MapaRisco>({ alto: 0, medio: 0, baixo: 0 })
  const [indiceSaude, setIndiceSaude] = useState(100)
  
  // Histórico de Tendência Mensal
  const [tendenciaMensal, setTendenciaMensal] = useState<MesTendencia[]>([])

  const [metricas, setMetricas] = useState<MetricasTrilho>({
    totalNoTrilho: 0,
    faseChegada: 0,
    faseIntegracao: 0,
    batismoRecebimento: 0,
    faseDiscipulado: 0,
    faseEnvio: 0,
    totalRetidos: 0,
    semGC: 0,
    semMinisterio: 0
  })

  useEffect(() => {
    async function carregarMetricasEstrategicas() {
      try {
        setLoading(true)
        setErro(null)

        const hoje = new Date()
        const anoAtual = hoje.getFullYear()

        // 1. Busca dados gerais de visitantes
        const { data: visitantesData, error: errV } = await supabase
          .from('visitantes')
          .select('id, origem, data_visita')
        
        if (errV) throw errV
        
        const totalVis = visitantesData?.length || 0
        setTotalVisitantes(totalVis)

        // Inicialização do vetor de tendência mensal
        const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
        const contagemMeses = Array(12).fill(0)

        let v30 = 0, v90 = 0, vAno = 0
        
        visitantesData?.forEach(v => {
          if (!v.data_visita) return
          
          // Tratamento para evitar erro de fuso horário (UTC vs Local)
          // Divide a string '2026-03-01' para criar a data manualmente
          const [ano, mes, dia] = v.data_visita.split('T')[0].split('-').map(Number);
          const dataVis = new Date(ano, mes - 1, dia);
          
          const diffDias = Math.floor((hoje.getTime() - dataVis.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDias <= 30) v30++
          if (diffDias <= 90) v90++
          if (dataVis.getFullYear() === anoAtual) {
            vAno++
            contagemMeses[dataVis.getMonth()]++ 
          }
        })
        
        setVolumeTempo({ ultimos30: v30, ultimos90: v90, esteAno: vAno })
        setTendenciaMensal(mesesNomes.map((nome, idx) => ({ nome, qtd: contagemMeses[idx] })))

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

        // 2. Busca histórico de presença no Café de Boas-Vindas
        const { data: followupData, error: errF } = await supabase
          .from('visitantes_followup')
          .select('*')
          
        if (errF) throw errF

        const participantesCafe = new Set(
          (followupData || [])
            .filter(f => String(f.status || '').toLowerCase().trim() === 'compareceu')
            .map(f => f.pessoa_id || f.visitante_id)
            .filter(Boolean)
        )

        // 3. Busca posicionamento nas estações da jornada
        const { data: trilhoData, error: errT } = await supabase
          .from('trilho_crescimento')
          .select('id, pessoa_id, etapa_atual, ultima_interacao, gc_vinculado, ministerio_ativo')

        if (errT) throw errT

        let batismo = 0
        let discipulado = 0
        let envio = 0
        let retidos = 0
        let sGC = 0
        let sMin = 0

        let rAlto = 0, rMedio = 0, rBaixo = 0

        const pessoasAtivasNaJornada = new Set<string>()
        participantesCafe.forEach(id => pessoasAtivasNaJornada.add(id))

        if (trilhoData) {
          trilhoData.forEach(item => {
            const idDoVinculo = item.pessoa_id
            if (!idDoVinculo) return

            const etapaBd = String(item.etapa_atual || '').toUpperCase().replace('-', '_').trim()

            if (etapaBd === 'BATISMO_RECEBIMENTO' || etapaBd === 'BATISMO' || etapaBd === 'RECEBIMENTO') {
              batismo++
              pessoasAtivasNaJornada.add(idDoVinculo)
            } else if (etapaBd === 'FASE_2_ENGAJAMENTO' || etapaBd === 'FASE_2' || etapaBd === 'ENGAJAMENTO') {
              discipulado++
              if (!item.gc_vinculado) sGC++
              pessoasAtivasNaJornada.add(idDoVinculo)
            } else if (etapaBd === 'FASE_3_MINISTERIO' || etapaBd === 'FASE_3' || etapaBd === 'MINISTERIO') {
              envio++
              if (!item.ministerio_ativo) sMin++
              pessoasAtivasNaJornada.add(idDoVinculo)
            }

            // Monitoramento Semafórico de Risco Relacional
            if (pessoasAtivasNaJornada.has(idDoVinculo)) {
              const ultimaInteracao = new Date(item.ultima_interacao || hoje)
              const diasParado = Math.floor((hoje.getTime() - ultimaInteracao.getTime()) / (1000 * 60 * 60 * 24))
              
              if (diasParado >= 60) rAlto++
              else if (diasParado >= 30) rMedio++
              else if (diasParado >= 15) rBaixo++

              if (diasParado >= 21) retidos++
            }
          })
        }

        const chegadaPura = totalVis - pessoasAtivasNaJornada.size

        // Triagem de risco para quem acabou de chegar
        visitantesData?.forEach(v => {
          if (!pessoasAtivasNaJornada.has(v.id)) {
            const dataVis = new Date(v.data_visita || hoje)
            const diasSemAcao = Math.floor((hoje.getTime() - dataVis.getTime()) / (1000 * 60 * 60 * 24))
            
            if (diasSemAcao >= 60) rAlto++
            else if (diasSemAcao >= 30) rMedio++
            else if (diasSemAcao >= 15) rBaixo++

            if (diasSemAcao >= 21) retidos++
          }
        })

        setMapaRisco({ alto: rAlto, medio: rMedio, baixo: rBaixo })

        let scoreDesconto = (rAlto * 3) + (rMedio * 1.5) + (sGC * 2) + (sMin * 1)
        let totalCalculado = 100 - (totalVis > 0 ? (scoreDesconto / totalVis) * 100 : 0)
        setIndiceSaude(Math.max(15, Math.min(100, Math.round(totalCalculado))))

        setMetricas({
          totalNoTrilho: pessoasAtivasNaJornada.size,
          faseChegada: chegadaPura > 0 ? chegadaPura : 0,
          faseIntegracao: participantesCafe.size,
          batismoRecebimento: batismo,
          faseDiscipulado: discipulado,
          faseEnvio: envio,
          totalRetidos: retidos,
          semGC: sGC,
          semMinisterio: sMin
        })

      } catch (err: any) {
        console.error('Erro na visão pastoral:', err)
        setErro(err?.message || 'Erro ao processar dados estratégicos.')
      } finally {
        setLoading(false)
      }
    }

    carregarMetricasEstrategicas()
  }, [])

  const taxaEnvioMissionario = totalVisitantes > 0 
    ? Math.round(((metricas.batismoRecebimento + metricas.faseDiscipulado + metricas.faseEnvio) / totalVisitantes) * 100)
    : 0

  // Cálculo das taxas reais de avanço relacional conforme nova padronização
  const avancoChegadaParaIntegracao = metricas.faseChegada > 0 ? Math.round((metricas.faseIntegracao / (metricas.faseChegada + metricas.faseIntegracao)) * 100) : 0
  const avancoIntegracaoParaDiscipulado = metricas.faseIntegracao > 0 ? Math.round((metricas.batismoRecebimento / metricas.faseIntegracao) * 100) : 0
  const avancoDiscipuladoParaComunhao = metricas.batismoRecebimento > 0 ? Math.round((metricas.faseDiscipulado / metricas.batismoRecebimento) * 100) : 0
  const avancoComunhaoParaEnvio = metricas.faseDiscipulado > 0 ? Math.round((metricas.faseEnvio / metricas.faseDiscipulado) * 100) : 0

  const maiorVolumeMensal = Math.max(...tendenciaMensal.map(m => m.qtd), 1)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <p className="text-xs font-bold text-slate-500">Calculando linhas de voo e indicadores pastorais...</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8 print:p-0 print:max-w-full print:bg-white">
      
      {/* Barra Superior */}
      <div className="flex justify-between items-center print:hidden">
        <Link href="/dashboard/pastor/trilho" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors">
          <ArrowLeft size={14} /> Voltar a jornada de integração
        </Link>
        
        <div className="flex items-center gap-2">
          <Link 
            href="/dashboard/pastor/trilho-crescimento"
            className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition"
          >
            <Footprints size={14} /> Painel de Linha de Voo
          </Link>
          <button 
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-[#003366] hover:bg-[#002244] text-white px-4 py-2 rounded-xl text-xs font-subtitle shadow-md transition border border-transparent"
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

      {/* QUADRO EXECUTIVO PARA O CONSELHO (Foco de Impressão) */}
      <div className="hidden print:block border-2 border-slate-800 rounded-3xl p-6 bg-slate-50/50 mb-6">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 border-b pb-2 mb-3">Resumo Executivo — Conselho Pastoral IPI Cascavel</h2>
        <div className="grid grid-cols-3 gap-6 text-xxs font-bold text-slate-700">
          <div>
            <p className="text-slate-400 uppercase text-[9px]">Fluxo de Chegada (2026)</p>
            <p className="text-lg font-black text-slate-900">{totalVisitantes} Pessoas Mapeadas</p>
            <p className="text-slate-500 font-medium mt-1">• {volumeTempo.ultimos30} novos pousos nos últimos 30 dias</p>
          </div>
          <div>
            <p className="text-slate-400 uppercase text-[9px]">Taxa de Efetividade e Envio</p>
            <p className="text-lg font-black text-blue-700">{taxaEnvioMissionario}% Engajados na Missão</p>
            <p className="text-slate-500 font-medium mt-1">• {metricas.totalRetidos} em estagnação de acompanhamento</p>
          </div>
          <div>
            <p className="text-slate-400 uppercase text-[9px]">Índice de Estabilidade da Igreja</p>
            <p className={`text-lg font-black ${indiceSaude > 75 ? 'text-green-700' : 'text-amber-700'}`}>{indiceSaude}% Saúde Relacional</p>
            <p className="text-slate-500 font-medium mt-1">• Desconexão crítica: {mapaRisco.alto} em risco severo</p>
          </div>
        </div>
      </div>

      {/* Cabeçalho Principal (Mantendo a frase exata solicitada) */}
      <div className="border-b border-slate-200 pb-5 flex justify-between items-end print:border-b-2 print:border-slate-900">
        <div>
          <span className="hidden print:block text-xxs uppercase tracking-widest font-black text-slate-400 mb-1">Documento Oficial de Direção Coletiva</span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Compass className="text-indigo-600 print:hidden" size={26} />
            Visão Pastoral & Saúde da Igreja
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm font-medium mt-1">
            Mapeamento da Jornada de Integração: gerenciamento de novos novos pousos, discipulado e prontidão para envio missionário.
          </p>
        </div>
        <div className="hidden print:block text-right text-xxs font-bold text-slate-500">
          <p>IPI Cascavel — 2026</p>
          <p>Relatório: {filtroRelatorio.toUpperCase()}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="space-y-0.5">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            Mapeamento e Filtros para Reunião do Conselho
          </h4>
          <p className="text-xxs text-slate-400">Altere a visualização abaixo para focar em áreas específicas do desenvolvimento da comunidade.</p>
        </div>
        <div className="flex bg-white border p-1 rounded-xl shadow-xs gap-1">
          <button 
            onClick={() => setFiltroRelatorio('geral')}
            className={`text-xxs px-3 py-1.5 font-bold rounded-lg transition-all ${filtroRelatorio === 'geral' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Visão Completa da Jornada
          </button>
          <button 
            onClick={() => setFiltroRelatorio('criticos')}
            className={`text-xxs px-3 py-1.5 font-bold rounded-lg transition-all ${filtroRelatorio === 'criticos' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Gargalos e Alertas Críticos
          </button>
          <button 
            onClick={() => setFiltroRelatorio('consolidacao')}
            className={`text-xxs px-3 py-1.5 font-bold rounded-lg transition-all ${filtroRelatorio === 'consolidacao' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Tabela Macroscópica
          </button>
        </div>
      </div>

      {/* CARDS PASTORAIS E VELOCIDADE DE CRESCIMENTO */}
      {filtroRelatorio === 'geral' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex items-center gap-4 print:border-slate-300">
            <div className={`p-3 rounded-xl ${indiceSaude > 80 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              <HeartPulse size={24} />
            </div>
            <div>
              <span className="text-xxs font-black text-slate-400 uppercase tracking-wider block">Índice de Saúde Pastoral</span>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">{indiceSaude}%</h3>
              <p className="text-[10px] text-slate-400 font-medium">Estabilidade de retenção</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex items-center gap-4 print:border-slate-300">
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
              <CalendarDays size={24} />
            </div>
            <div>
              <span className="text-xxs font-black text-slate-400 uppercase tracking-wider block">Chegadas (30 Dias)</span>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">+{volumeTempo.ultimos30}</h3>
              <p className="text-[10px] text-slate-400 font-medium">Novos pousos na igreja</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex items-center gap-4 print:border-slate-300">
            <div className="p-3 rounded-xl bg-slate-100 text-slate-700">
              <CalendarDays size={24} />
            </div>
            <div>
              <span className="text-xxs font-black text-slate-400 uppercase tracking-wider block">Chegadas (90 Dias)</span>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">+{volumeTempo.ultimos90}</h3>
              <p className="text-[10px] text-slate-400 font-medium">Fluxo trimestral de entrada</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex items-center gap-4 print:border-slate-300">
            <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
              <PlaneTakeoff size={24} />
            </div>
            <div>
              <span className="text-xxs font-black text-slate-400 uppercase tracking-wider block">Volume Total do Ano</span>
              <h3 className="text-2xl font-black text-indigo-600 mt-0.5">{volumeTempo.esteAno}</h3>
              <p className="text-[10px] text-slate-400 font-medium">Registros totais em 2026</p>
            </div>
          </div>
        </div>
      )}

      {/* GRÁFICO HISTÓRICO DE TENDÊNCIA MENSAL */}
      {filtroRelatorio === 'geral' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm print:border-slate-300">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl print:hidden">
              <TrendingUp size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Linha de Tendência de Crescimento Histórico</h3>
              <p className="text-xxs font-medium text-slate-400">Acompanhamento mês a mês do volume de novas chegadas ao longo de 2026.</p>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-12 gap-3 pt-2">
            {tendenciaMensal.map((mes, idx) => {
              const alturaPercentual = Math.max(8, Math.round((mes.qtd / maiorVolumeMensal) * 100))
              return (
                <div key={idx} className="flex flex-col items-center justify-end space-y-2 group">
                  <span className="text-xxs font-black text-slate-700 opacity-80 group-hover:opacity-100 transition-opacity">
                    {mes.qtd}
                  </span>
                  <div className="w-full bg-slate-50 border border-slate-100 rounded-lg h-24 flex items-end overflow-hidden p-0.5 print:bg-white print:border-slate-300">
                    <div 
                      className="w-full bg-gradient-to-t from-slate-900 to-indigo-600 rounded-md transition-all duration-500 group-hover:from-indigo-600 group-hover:to-blue-500" 
                      style={{ height: `${alturaPercentual}%` }}
                    />
                  </div>
                  <span className="text-xxs font-black text-slate-400 tracking-wider uppercase">
                    {mes.nome}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Origem Religiosa */}
      {filtroRelatorio === 'geral' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6 w-full print:border-slate-300">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl print:hidden">
                <Users size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Mapeamento de Bagagem Religiosa</h3>
                <p className="text-xxs font-medium text-slate-400">Histórico e contexto espiritual da base de novas pessoas.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {['Igreja Católica', 'Igreja Evangélica', 'Não pertence a nenhuma igreja', 'Não informou'].map((opcao) => {
                const currentQtd = estatisticasOrigem[opcao] || 0
                const porcentagem = totalVisitantes > 0 ? Math.round((currentQtd / totalVisitantes) * 100) : 0
                return (
                  <div key={opcao} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col justify-between space-y-3 print:bg-white print:border-slate-300">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-bold text-slate-600 tracking-tight leading-snug">{opcao}</span>
                      <span className="text-base font-black text-slate-900 whitespace-nowrap">
                        {currentQtd} <span className="text-xxs text-slate-400 font-bold">({porcentagem}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full rounded-full" style={{ width: `${porcentagem}%` }}></div>
                    </div>
                  </div>
                )
              })}
            </div>

            {rankingIgrejas.length > 0 && (
              <div className="border-t border-slate-100 pt-5 space-y-3 print:border-slate-300">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Church size={14} className="text-slate-500" /> Detalhes de Denominações Evangélicas Anteriores
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {rankingIgrejas.map((igreja, idx) => {
                    const realEvangelicos = estatisticasOrigem['Igreja Evangélica'] || 1
                    const percentualDoSegmento = Math.round((igreja.qtd / realEvangelicos) * 100)
                    return (
                      <div key={idx} className="bg-slate-50/60 border border-slate-200/60 px-4 py-2.5 rounded-xl flex justify-between items-center text-xs font-medium text-slate-700 print:bg-white print:border-slate-300">
                        <span className="truncate max-w-[180px] font-bold text-slate-800">
                          {idx + 1}. {igreja.nome}
                        </span>
                        <span className="bg-blue-50 border border-blue-100 text-blue-600 text-xxs font-black px-2 py-0.5 rounded-md whitespace-nowrap">
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

      {/* FUNIL DA JORNADA DE INTEGRAÇÃO (ATUALIZADO E SIMPLIFICADO) */}
      {filtroRelatorio === 'geral' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs print:border-slate-300">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-5 flex items-center gap-1">
            <Compass size={14} className="text-blue-600" /> Fluxo de Conexão na Jornada de Integração
          </h3>
          
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span className="flex items-center gap-1">✈️ Chegada → ☕ Integração</span>
                <span className="text-slate-900">{metricas.faseIntegracao} de {metricas.faseChegada + metricas.faseIntegracao} pessoas ({avancoChegadaParaIntegracao}%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full" style={{ width: `${avancoChegadaParaIntegracao}%` }} />
              </div>
            </div>

            <div className="flex justify-center text-slate-300 my-1"><ArrowDown size={14} /></div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span className="flex items-center gap-1">☕ Integração → 📖 Discipulado</span>
                <span className="text-slate-900">{metricas.batismoRecebimento} de {metricas.faseIntegracao} pessoas ({avancoIntegracaoParaDiscipulado}%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full" style={{ width: `${avancoIntegracaoParaDiscipulado}%` }} />
              </div>
            </div>

            <div className="flex justify-center text-slate-300 my-1"><ArrowDown size={14} /></div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span className="flex items-center gap-1">📖 Discipulado → 🤝 Comunhão</span>
                <span className="text-slate-900">{metricas.faseDiscipulado} de {metricas.batismoRecebimento} pessoas ({avancoDiscipuladoParaComunhao}%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full" style={{ width: `${avancoDiscipuladoParaComunhao}%` }} />
              </div>
            </div>

            <div className="flex justify-center text-slate-300 my-1"><ArrowDown size={14} /></div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span className="flex items-center gap-1">🤝 Comunhão → 🚀 Envio</span>
                <span className="text-slate-900">{metricas.faseEnvio} de {metricas.faseDiscipulado} pessoas ({avancoComunhaoParaEnvio}%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full" style={{ width: `${avancoComunhaoParaEnvio}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Volumetria Estática das Estações */}
      {filtroRelatorio === 'geral' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 p-4 rounded-xl print:border-slate-300">
            <span className="text-xxs font-black text-slate-400 uppercase tracking-wider block">✈️ Estação Chegada</span>
            <h3 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">{metricas.faseChegada}</h3>
            <p className="text-xxs text-slate-400 mt-1">Apenas cadastrados, fora do trilho</p>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-xl print:border-slate-300">
            <span className="text-xxs font-black text-slate-400 uppercase tracking-wider block">☕ Estação Integração</span>
            <h3 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">{metricas.faseIntegracao}</h3>
            <p className="text-xxs text-slate-400 mt-1">Passaram pelo Café / Acolhimento</p>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-xl print:border-slate-300">
            <span className="text-xxs font-black text-slate-400 uppercase tracking-wider block">🚀 Prontos para Envio</span>
            <h3 className="text-2xl font-black text-blue-600 mt-1 tracking-tight">{taxaEnvioMissionario}%</h3>
            <p className="text-xxs text-slate-400 mt-1">Taxa de retenção global</p>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-xl print:border-slate-300">
            <span className="text-xxs font-black text-slate-400 uppercase tracking-wider block">🚨 Casos Parados</span>
            <h3 className={`text-2xl font-black mt-1 tracking-tight ${metricas.totalRetidos > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{metricas.totalRetidos}</h3>
            <p className="text-xxs text-slate-400 mt-1">Sem interações há +21 dias</p>
          </div>
        </div>
      )}

      {/* PAINEL SEMAFÓRICO DE RISCO PASTORAL */}
      {filtroRelatorio === 'criticos' && (
        <div className="space-y-6">
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 text-rose-950 space-y-1 print:bg-white print:text-slate-900 print:border-slate-400">
            <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1">
              <ShieldAlert size={14} className="text-rose-600" /> Radar Semafórico de Monitoramento e Vulnerabilidade Pastoral
            </h3>
            <p className="text-xxs text-rose-700 print:text-slate-500">Divisão baseada nos dias exatos sem registro de contato prático, visita ou atualização de plano de voo.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-red-200 p-5 rounded-2xl bg-red-50/50 space-y-1.5 border-l-4 border-l-red-600">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black text-red-900 uppercase tracking-tight">🔴 Alto Risco Pastoral</h4>
                <span className="text-2xl font-black text-red-700">{mapaRisco.alto}</span>
              </div>
              <p className="text-xxs text-red-700 font-medium">Sem nenhuma atualização relacional há **mais de 60 dias**. Risco imediato de evasão.</p>
            </div>

            <div className="border border-amber-200 p-5 rounded-2xl bg-amber-50/40 space-y-1.5 border-l-4 border-l-amber-500">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black text-amber-900 uppercase tracking-tight">🟠 Médio Risco (Atenção)</h4>
                <span className="text-2xl font-black text-amber-700">{mapaRisco.medio}</span>
              </div>
              <p className="text-xxs text-amber-700 font-medium">Estagnados entre **30 e 59 dias**. Necessitam de ligação, café individual ou visita agendada.</p>
            </div>

            <div className="border border-emerald-200 p-5 rounded-2xl bg-emerald-50/30 space-y-1.5 border-l-4 border-l-emerald-500">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black text-emerald-900 uppercase tracking-tight">🟢 Baixo Risco (Monitoramento)</h4>
                <span className="text-2xl font-black text-emerald-700">{mapaRisco.baixo}</span>
              </div>
              <p className="text-xxs text-emerald-700 font-medium">Última ação entre **15 e 29 dias**. Fluxo esperado de acompanhamento regular das equipes.</p>
            </div>
          </div>

          {/* Ajustes de Rota */}
          <div className="bg-white border rounded-2xl p-5 space-y-4 shadow-xs">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Ajustes de Rota Estruturais (Isolamento de Base)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 border rounded-xl flex items-start gap-3">
                <HelpCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Estação Comunhão Sem Grupo de Crescimento: {metricas.semGC} pessoas</h4>
                  <p className="text-xxs text-slate-400 mt-0.5">Mapeados em Comunhão, mas permanecem sem nenhum vínculo de GC registrado no prontuário técnico.</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border rounded-xl flex items-start gap-3">
                <HelpCircle size={18} className="text-purple-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Estação Envio Missionário Sem Atividade Prática: {metricas.semMinisterio} pessoas</h4>
                  <p className="text-xxs text-slate-400 mt-0.5">Líderes na estação de Envio, porém sem nenhuma atribuição específica de ministério ativo sinalizada.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TABELA MACROSCÓPICA DA JORNADA (ATUALIZADA COM AS DESCRIÇÕES SOLICITADAS) */}
      {filtroRelatorio === 'consolidacao' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden print:border-slate-400">
          <div className="p-4 bg-slate-50 border-b font-black text-slate-700 text-xs uppercase tracking-wider print:bg-white">
            Tabela Macroscópica da Jornada de Integração
          </div>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-600 print:bg-white">
                <th className="p-3">Estações e Marcos do Desenvolvimento Missionário</th>
                <th className="p-3 text-center">Quantidade Absoluta</th>
                <th className="p-3 text-right">Percentual de Base</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="p-3">
                  <p className="font-bold text-slate-800">1. ✈️ Chegada</p>
                  <p className="text-xxs text-slate-400 font-medium">Novos visitantes recebidos</p>
                </td>
                <td className="p-3 text-center font-bold text-slate-700">{metricas.faseChegada}</td>
                <td className="p-3 text-right text-slate-500 font-bold">{totalVisitantes > 0 ? Math.round((metricas.faseChegada / totalVisitantes) * 100) : 0}%</td>
              </tr>
              <tr>
                <td className="p-3">
                  <p className="font-bold text-slate-800">2. ☕ Integração</p>
                  <p className="text-xxs text-slate-400 font-medium">Conectados através do Café e acolhimento</p>
                </td>
                <td className="p-3 text-center font-bold text-slate-700">{metricas.faseIntegracao}</td>
                <td className="p-3 text-right text-slate-500 font-bold">{totalVisitantes > 0 ? Math.round((metricas.faseIntegracao / totalVisitantes) * 100) : 0}%</td>
              </tr>
              <tr>
                <td className="p-3">
                  <p className="font-bold text-slate-800">3. 📖 Discipulado</p>
                  <p className="text-xxs text-slate-400 font-medium">Batismo, membresia e fundamentos</p>
                </td>
                <td className="p-3 text-center font-bold text-slate-700">{metricas.batismoRecebimento}</td>
                <td className="p-3 text-right text-slate-500 font-bold">{totalVisitantes > 0 ? Math.round((metricas.batismoRecebimento / totalVisitantes) * 100) : 0}%</td>
              </tr>
              <tr>
                <td className="p-3">
                  <p className="font-bold text-slate-800">4. 🤝 Comunhão</p>
                  <p className="text-xxs text-slate-400 font-medium">Participação ativa em GC</p>
                </td>
                <td className="p-3 text-center font-bold text-slate-700">{metricas.faseDiscipulado}</td>
                <td className="p-3 text-right text-slate-500 font-bold">{totalVisitantes > 0 ? Math.round((metricas.faseDiscipulado / totalVisitantes) * 100) : 0}%</td>
              </tr>
              <tr>
                <td className="p-3">
                  <p className="font-bold text-slate-800">5. 🚀 Envio</p>
                  <p className="text-xxs text-slate-400 font-medium">Servindo em ministérios e missão</p>
                </td>
                <td className="p-3 text-center font-bold text-slate-700">{metricas.faseEnvio}</td>
                <td className="p-3 text-right text-slate-500 font-bold">{totalVisitantes > 0 ? Math.round((metricas.faseEnvio / totalVisitantes) * 100) : 0}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Rodapé e Assinatura para Impressão */}
      <div className="hidden print:flex justify-between items-center pt-16 text-xxs font-bold text-slate-400 border-t border-dashed border-slate-300 mt-12">
        <div>
          <p className="border-t border-slate-400 w-48 text-center pt-1 text-slate-700">Assinatura do Pastor Titular</p>
        </div>
        <div className="text-right">
          <p>Conecta IPI Cascavel — Gestão de Linha de Voo e Envio</p>
          <p className="font-medium text-slate-400/80">Documento interno estritamente confidencial para deliberação do Conselho.</p>
        </div>
      </div>

    </div>
  )
}