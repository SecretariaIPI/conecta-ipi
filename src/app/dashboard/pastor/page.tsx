'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { BarChart3, Users, TrendingUp, Coffee, CheckCircle2, Loader2, Award, Calendar, ChevronRight, Clock } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

interface RegistroPipeline {
  id: string
  nome: string
  telefone: string | null
  etapa: string
  integrado: boolean
  passouCafe: boolean
  data_inicio: string
  data_ultima_movimentacao: string
}

interface MetricasMes {
  total: number
  cafe: number
  integrados: number
  taxaCafe: string
  taxaIgreja: string
}

export default function VisaoEstatisticaPastorPage() {
  const [loading, setLoading] = useState(true)
  const [todosRegistros, setTodosRegistros] = useState<RegistroPipeline[]>([])
  const [mesFiltro, setMesFiltro] = useState<string>('TODOS')
  
  const [metricasAtuais, setMetricasAtuais] = useState<MetricasMes>({ total: 0, cafe: 0, integrados: 0, taxaCafe: '0%', taxaIgreja: '0%' })
  const [historicoMeses, setHistoricoMeses] = useState<{ [key: string]: MetricasMes }>({})
  const [pessoasFiltradas, setPessoasFiltradas] = useState<RegistroPipeline[]>([])

  async function carregarDadosPipeline() {
    try {
      setLoading(true)

      let { data, error } = await supabase
        .from('visitantes')
        .select('*')

      if (error || !data || data.length === 0) {
        const respostaAlternativa = await supabase.from('pessoas').select('*')
        if (!respostaAlternativa.error && respostaAlternativa.data) {
          data = respostaAlternativa.data
        }
      }

      const registrosFormatados: RegistroPipeline[] = (data || []).map((item: any) => {
        // Valida todas as possibilidades de colunas mapeadas no painel geral
        const ehIntegrado = item.integrado === true || 
                            item.integrados === true ||
                            item.membresia === true ||
                            String(item.etapa || '').toUpperCase().includes('INTEGRAD') ||
                            String(item.status || '').toUpperCase().includes('INTEGRAD')

        const alcancouCafe = item.cafe === true || 
                             item.confirmado_cafe === true || 
                             item.confirmado === true ||
                             String(item.etapa || '').toUpperCase().includes('CAF') ||
                             String(item.status || '').toUpperCase().includes('CAF') ||
                             ehIntegrado // Regra de fluxo: quem integrou passou pelo café

        // Determina o rótulo de exibição com base nos booleanos estruturais
        let textoEtapaExibicao = item.etapa || item.status || 'Visitante'
        if (ehIntegrado) {
          textoEtapaExibicao = 'Integrado'
        } else if (alcancouCafe) {
          textoEtapaExibicao = 'Confirmado no Café'
        }

        const dataCriacao = item.data_inicio || item.created_at || new Date().toISOString()

        return {
          id: item.id,
          nome: item.nome || 'Não identificado',
          telefone: item.telefone || item.celular || 'Sem contato',
          etapa: textoEtapaExibicao,
          integrado: ehIntegrado,
          passouCafe: alcancouCafe,
          data_inicio: dataCriacao,
          data_ultima_movimentacao: item.updated_at || dataCriacao
        }
      })

      setTodosRegistros(registrosFormatados)
      processarMetricasETabela(registrosFormatados, 'TODOS')

    } catch (err) {
      console.error('Erro na sincronização estatística pastoral:', err)
    } finally {
      setLoading(false)
    }
  }

  function processarMetricasETabela(registros: RegistroPipeline[], filtro: string) {
    const mapaHistorico: { [key: string]: MetricasMes } = {}
    
    let gTotal = 0
    let gCafe = 0
    let gIntegrados = 0

    registros.forEach(r => {
      gTotal++
      if (r.passouCafe) gCafe++
      if (r.integrado) gIntegrados++

      const mesAno = r.data_inicio.substring(0, 7)
      if (mesAno && mesAno.length === 7) {
        if (!mapaHistorico[mesAno]) {
          mapaHistorico[mesAno] = { total: 0, cafe: 0, integrados: 0, taxaCafe: '0%', taxaIgreja: '0%' }
        }
        mapaHistorico[mesAno].total += 1
        if (r.passouCafe) mapaHistorico[mesAno].cafe += 1
        if (r.integrado) mapaHistorico[mesAno].integrados += 1
      }
    })

    Object.keys(mapaHistorico).forEach(mes => {
      const m = mapaHistorico[mes]
      m.taxaCafe = m.total > 0 ? ((m.cafe / m.total) * 100).toFixed(1) + '%' : '0%'
      m.taxaIgreja = m.total > 0 ? ((m.integrados / m.total) * 100).toFixed(1) + '%' : '0%'
    })
    setHistoricoMeses(mapaHistorico)

    if (filtro === 'TODOS') {
      setMetricasAtuais({
        total: gTotal,
        cafe: gCafe,
        integrados: gIntegrados,
        taxaCafe: gTotal > 0 ? ((gCafe / gTotal) * 100).toFixed(1) + '%' : '0%',
        taxaIgreja: gTotal > 0 ? ((gIntegrados / gTotal) * 100).toFixed(1) + '%' : '0%'
      })
      setPessoasFiltradas(registros)
    } else {
      const mMes = mapaHistorico[filtro] || { total: 0, cafe: 0, integrados: 0, taxaCafe: '0%', taxaIgreja: '0%' }
      setMetricasAtuais(mMes)
      setPessoasFiltradas(registros.filter(r => r.data_inicio && r.data_inicio.startsWith(filtro)))
    }
  }

  useEffect(() => {
    carregarDadosPipeline()
  }, [])

  function lidarComMudancaFiltro(novoFiltro: string) {
    setMesFiltro(novoFiltro)
    processarMetricasETabela(todosRegistros, novoFiltro)
  }

  function formatarData(dataString: string | null) {
    if (!dataString) return '-'
    const data = new Date(dataString)
    if (isNaN(data.getTime())) return '-'
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  function converterMesNome(mesAno: string) {
    if (mesAno === 'TODOS') return 'Todo o Período'
    const partes = mesAno.split('-')
    if (partes.length < 2) return mesAno
    const [ano, mes] = partes
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
    return `${meses[parseInt(mes) - 1]} de ${ano}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-2 text-slate-400 text-sm">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <span className="font-semibold tracking-wide">Sincronizando dados vitais...</span>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
      
      {/* Cabeçalho */}
      <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <div className="bg-indigo-600 p-2 rounded-2xl text-white shadow-sm">
              <BarChart3 size={24} />
            </div>
            Gabinete Analítico Pastoral
          </h1>
          <p className="text-slate-500 mt-2 text-sm font-medium">
            Números absolutos, transições de datas e evolução histórica mensal.
          </p>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-3 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs">
          <button 
            onClick={() => lidarComMudancaFiltro('TODOS')}
            className={`text-xxs font-black px-2.5 py-1 rounded-md transition-colors ${mesFiltro === 'TODOS' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            VER TUDO
          </button>
          <div className="h-4 w-px bg-slate-200"></div>
          <div className="flex items-center gap-1.5">
            <Calendar size={14} className="text-slate-400" />
            <input 
              type="month" 
              value={mesFiltro === 'TODOS' ? '' : mesFiltro}
              onChange={(e) => {
                if (e.target.value) lidarComMudancaFiltro(e.target.value)
              }}
              className="text-xs font-bold text-slate-700 outline-none border-none bg-transparent cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Cards Indicadores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xxs font-bold uppercase tracking-wider">Visitantes no Período</p>
            <h3 className="text-4xl font-black text-slate-900 mt-1">{metricasAtuais.total} <span className="text-sm font-normal text-slate-400">almas</span></h3>
            <p className="text-xs text-indigo-600 font-semibold mt-1">Recepção ativa mapeada</p>
          </div>
          <div className="bg-slate-50 text-slate-400 p-3 rounded-xl border border-slate-100">
            <Users size={22} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-amber-800 text-xxs font-bold uppercase tracking-wider">Avançaram para o Café</p>
            <h3 className="text-4xl font-black text-amber-600 mt-1">{metricasAtuais.cafe} <span className="text-sm font-normal text-slate-400">pessoas</span></h3>
            <p className="text-xs text-amber-700 font-semibold mt-1">Taxa de conversão: {metricasAtuais.taxaCafe}</p>
          </div>
          <div className="bg-amber-50 text-amber-600 p-3 rounded-xl border border-amber-100">
            <Coffee size={22} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-emerald-800 text-xxs font-bold uppercase tracking-wider">Total de Integrados</p>
            <h3 className="text-4xl font-black text-emerald-600 mt-1">{metricasAtuais.integrados} <span className="text-sm font-normal text-slate-400">membros</span></h3>
            <p className="text-xs text-emerald-700 font-semibold mt-1">Eficiência de membresia: {metricasAtuais.taxaIgreja}</p>
          </div>
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl border border-emerald-100">
            <Award size={22} />
          </div>
        </div>
      </div>

      {/* Tabela de Dados */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Clock className="text-indigo-600" size={18} />
            Movimentações Detalhadas ({converterMesNome(mesFiltro)})
          </h2>
          <p className="text-xs text-slate-500">Listagem nominativa com datas de entrada e última alteração pastoral.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-xxs font-bold uppercase tracking-wider bg-slate-50/70">
                <th className="py-3 px-4">Visitante</th>
                <th className="py-3 px-4">Data Ingresso</th>
                <th className="py-3 px-4 text-center">Etapa Atual</th>
                <th className="py-3 px-4 text-center">Última Movimentação</th>
                <th className="py-3 px-4">Status Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {pessoasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-normal">Nenhum registro encontrado para o filtro selecionado.</td>
                </tr>
              ) : (
                pessoasFiltradas.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{p.nome}</p>
                      <p className="text-slate-400 text-xxs font-medium">{p.telefone}</p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-semibold">{formatarData(p.data_inicio)}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`text-xxs font-black px-2.5 py-1 rounded-md uppercase tracking-wider border ${
                        p.integrado 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                          : p.passouCafe 
                            ? 'bg-amber-50 text-amber-800 border-amber-200' 
                            : 'bg-slate-100 text-slate-800 border-slate-200/40'
                      }`}>
                        {p.etapa}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-500 font-semibold">{formatarData(p.data_ultima_movimentacao)}</td>
                    <td className="py-3.5 px-4">
                      {p.integrado ? (
                        <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 size={14} /> Integrado</span>
                      ) : (
                        <span className="text-amber-600 font-bold flex items-center gap-1"><Clock size={14} /> Em Processo</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Evolução Histórica */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="text-indigo-600" size={18} />
            Evolução Histórica por Período Mensal
          </h2>
          <p className="text-xs text-slate-500">Comparativo rápido de volumetria absoluta e eficiência de conversão entre os meses.</p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {Object.keys(historicoMeses).length === 0 ? (
            <p className="text-xs text-slate-400 py-2">Nenhum histórico mensal gerado.</p>
          ) : (
            Object.keys(historicoMeses).sort((a, b) => b.localeCompare(a)).map((mes) => {
              const m = historicoMeses[mes]
              return (
                <div 
                  key={mes}
                  onClick={() => lidarComMudancaFiltro(mes)}
                  className={`p-4 border rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 cursor-pointer transition transform active:scale-98 ${
                    mesFiltro === mes 
                      ? 'border-indigo-600 bg-indigo-50/20 shadow-xs' 
                      : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl font-bold text-xs ${mesFiltro === mes ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Calendar size={16} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{converterMesNome(mes)}</h4>
                      <p className="text-slate-400 text-xxs font-medium">Clique para abrir detalhes nominativos deste mês</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-6 text-xs">
                    <div>
                      <span className="text-slate-400 font-bold uppercase tracking-wider text-xxs block">Visitou</span>
                      <span className="font-black text-slate-900 text-base">{m.total}</span>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 hidden sm:block" />
                    <div>
                      <span className="text-amber-800 font-bold uppercase tracking-wider text-xxs block">No Café</span>
                      <span className="font-black text-amber-600 text-base">{m.cafe} <span className="text-xxs font-normal text-slate-400">({m.taxaCafe})</span></span>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 hidden sm:block" />
                    <div>
                      <span className="text-emerald-800 font-bold uppercase tracking-wider text-xxs block">Membros</span>
                      <span className="font-black text-emerald-600 text-base">{m.integrados} <span className="text-xxs font-normal text-slate-400">({m.taxaIgreja})</span></span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

    </div>
  )
}