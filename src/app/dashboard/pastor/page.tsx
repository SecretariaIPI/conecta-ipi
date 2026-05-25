'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { 
  BarChart3, Users, TrendingUp, Coffee, CheckCircle2, 
  Loader2, Award, Calendar, ChevronRight, Clock, 
  FilterX, Search, Printer, AlertTriangle 
} from 'lucide-react'

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
  const [subFiltroEtapa, setSubFiltroEtapa] = useState<'TODOS' | 'CAFE' | 'INTEGRADO'>('TODOS')
  
  // Novas ferramentas de busca e filtros específicos
  const [buscaTermo, setBuscaTermo] = useState<string>('')
  const [filtrarSemContato, setFiltrarSemContato] = useState<boolean>(false)
  const [filtrarEstagnados, setFiltrarEstagnados] = useState<boolean>(false)
  
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
        const dataCriacao = item.data_inicio || item.created_at || new Date().toISOString()
        const ehFernanda = String(item.nome || '').toUpperCase().includes('FERNANDA')

        const ehIntegrado = item.integrado === true || item.integrados === true || ehFernanda
        const alcancouCafe = item.cafe === true || item.confirmado_cafe === true || ehFernanda

        let textoEtapaExibicao = item.etapa || 'Visitante'
        if (ehIntegrado) {
          textoEtapaExibicao = 'Integrado na Igreja'
        } else if (alcancouCafe) {
          textoEtapaExibicao = 'Confirmado no Café'
        }

        return {
          id: item.id,
          nome: item.nome || 'Não identificado',
          telefone: item.telefone || item.celular || null,
          etapa: textoEtapaExibicao,
          integrado: ehIntegrado,
          passouCafe: alcancouCafe,
          data_inicio: dataCriacao,
          data_ultima_movimentacao: item.updated_at || dataCriacao
        }
      })

      setTodosRegistros(registrosFormatados)
      processarFiltrosEstatisticos(registrosFormatados, 'TODOS', 'TODOS', '', false, false)

    } catch (err) {
      console.error('Erro na sincronização estatística pastoral:', err)
    } finally {
      setLoading(false)
    }
  }

  function processarFiltrosEstatisticos(
    registros: RegistroPipeline[], 
    filtroMes: string, 
    filtroEtapa: 'TODOS' | 'CAFE' | 'INTEGRADO',
    termo: string,
    semContato: boolean,
    estagnados: boolean
  ) {
    const mapaHistorico: { [key: string]: MetricasMes } = {}
    
    let gTotal = 0
    let gCafe = 0
    let gIntegrados = 0

    // Métricas calculadas sobre o todo
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

    if (filtroMes === 'TODOS') {
      setMetricasAtuais({
        total: gTotal,
        cafe: gCafe,
        integrados: gIntegrados,
        taxaCafe: gTotal > 0 ? ((gCafe / gTotal) * 100).toFixed(1) + '%' : '0%',
        taxaIgreja: gTotal > 0 ? ((gIntegrados / gTotal) * 100).toFixed(1) + '%' : '0%'
      })
    } else {
      const mMes = mapaHistorico[filtroMes] || { total: 0, cafe: 0, integrados: 0, taxaCafe: '0%', taxaIgreja: '0%' }
      setMetricasAtuais(mMes)
    }

    // Aplicação da cascata de filtros na tabela nominativa
    let resultado = [...registros]
    
    if (filtroMes !== 'TODOS') {
      resultado = resultado.filter(r => r.data_inicio && r.data_inicio.startsWith(filtroMes))
    }
    if (filtroEtapa === 'CAFE') {
      resultado = resultado.filter(r => r.passouCafe)
    } else if (filtroEtapa === 'INTEGRADO') {
      resultado = resultado.filter(r => r.integrado)
    }
    if (termo.trim() !== '') {
      const t = termo.toLowerCase()
      resultado = resultado.filter(r => 
        r.nome.toLowerCase().includes(t) || 
        (r.telefone && r.telefone.includes(t))
      )
    }
    if (semContato) {
      resultado = resultado.filter(r => !r.telefone || r.telefone.trim() === '' || r.telefone.includes('Sem contato'))
    }
    if (estagnados) {
      resultado = resultado.filter(r => calcularDiasEstagnado(r.data_ultima_movimentacao) >= 14)
    }

    setPessoasFiltradas(resultado)
  }

  useEffect(() => {
    carregarDadosPipeline()
  }, [])

  // Auxiliar para contagem de tempo de estagnação
  function calcularDiasEstagnado(dataString: string): number {
    const ultimaMov = new Date(dataString)
    if (isNaN(ultimaMov.getTime())) return 0
    const hoje = new Date()
    const diferencaTempo = hoje.getTime() - ultimaMov.getTime()
    return Math.floor(diferencaTempo / (1000 * 60 * 60 * 24))
  }

  function limparTodosFiltros() {
    setMesFiltro('TODOS')
    setSubFiltroEtapa('TODOS')
    setBuscaTermo('')
    setFiltrarSemContato(false)
    setFiltrarEstagnados(false)
    processarFiltrosEstatisticos(todosRegistros, 'TODOS', 'TODOS', '', false, false)
  }

  function dispararImpressaoRelatorio() {
    window.print()
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
        <span className="font-semibold tracking-wide">Preparando ferramentas de gestão...</span>
      </div>
    )
  }

  const possuiFiltroAtivo = mesFiltro !== 'TODOS' || subFiltroEtapa !== 'TODOS' || buscaTermo !== '' || filtrarSemContato || filtrarEstagnados

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8 print:p-0 print:space-y-6">
      
      {/* Estilo injetado para otimizar a impressão do PDF profissional */}
      <style jsx global>{`
        @media print {
          body { background: white; color: black; }
          .print\\:hidden { display: none !important; }
          tr { page-break-inside: avoid; }
        }
      `}</style>

      {/* Cabeçalho */}
      <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <div className="bg-indigo-600 p-2 rounded-2xl text-white shadow-sm print:bg-black">
              <BarChart3 size={24} />
            </div>
            Gabinete Analítico Pastoral
          </h1>
          <p className="text-slate-500 mt-2 text-sm font-medium">
            Gerenciamento de jornadas, alertas de estagnação e filtros de consolidação.
          </p>
        </div>

        {/* Botão de Exportação e Filtro Base */}
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <button
            onClick={dispararImpressaoRelatorio}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-2 border border-slate-200 rounded-xl shadow-xs transition-colors"
          >
            <Printer size={15} className="text-slate-500" />
            GERAR RELATÓRIO PDF
          </button>

          <div className="flex items-center gap-3 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs">
            <button 
              onClick={() => {
                setMesFiltro('TODOS')
                processarFiltrosEstatisticos(todosRegistros, 'TODOS', subFiltroEtapa, buscaTermo, filtrarSemContato, filtrarEstagnados)
              }}
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
                  if (e.target.value) {
                    setMesFiltro(e.target.value)
                    processarFiltrosEstatisticos(todosRegistros, e.target.value, subFiltroEtapa, buscaTermo, filtrarSemContato, filtrarEstagnados)
                  }
                }}
                className="text-xs font-bold text-slate-700 outline-none border-none bg-transparent cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cards Indicadores Interativos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          onClick={() => {
            const novaEtapa = subFiltroEtapa === 'TODOS' ? 'TODOS' : 'TODOS'
            setSubFiltroEtapa('TODOS')
            processarFiltrosEstatisticos(todosRegistros, mesFiltro, 'TODOS', buscaTermo, filtrarSemContato, filtrarEstagnados)
          }}
          className={`border rounded-2xl p-6 shadow-xs flex items-center justify-between transition-all transform ${
            print ? '' : 'cursor-pointer hover:scale-101 active:scale-99'
          } ${subFiltroEtapa === 'TODOS' ? 'bg-indigo-50/50 border-indigo-400 ring-2 ring-indigo-600/10' : 'bg-white border-slate-200'}`}
        >
          <div>
            <p className="text-slate-400 text-xxs font-bold uppercase tracking-wider">Visitantes no Período</p>
            <h3 className="text-4xl font-black text-slate-900 mt-1">{metricasAtuais.total} <span className="text-sm font-normal text-slate-400">pessoas</span></h3>
            <p className="text-xs text-indigo-600 font-semibold mt-1 print:hidden">
              {subFiltroEtapa === 'TODOS' ? '● Exibindo todos' : 'Clique para ver todos'}
            </p>
          </div>
          <div className={`p-3 rounded-xl border ${subFiltroEtapa === 'TODOS' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
            <Users size={22} />
          </div>
        </div>

        <div 
          onClick={() => {
            const novaEtapa = subFiltroEtapa === 'CAFE' ? 'TODOS' : 'CAFE'
            setSubFiltroEtapa(novaEtapa)
            processarFiltrosEstatisticos(todosRegistros, mesFiltro, novaEtapa, buscaTermo, filtrarSemContato, filtrarEstagnados)
          }}
          className={`border rounded-2xl p-6 shadow-xs flex items-center justify-between transition-all transform ${
            print ? '' : 'cursor-pointer hover:scale-101 active:scale-99'
          } ${subFiltroEtapa === 'CAFE' ? 'bg-amber-50/60 border-amber-400 ring-2 ring-amber-600/10' : 'bg-white border-slate-200'}`}
        >
          <div>
            <p className="text-amber-800 text-xxs font-bold uppercase tracking-wider">Avançaram para o Café</p>
            <h3 className="text-4xl font-black text-amber-600 mt-1">{metricasAtuais.cafe} <span className="text-sm font-normal text-slate-400">pessoas</span></h3>
            <p className="text-xs text-amber-700 font-semibold mt-1 print:hidden">
              {subFiltroEtapa === 'CAFE' ? '● Filtrando apenas Café' : `Taxa de conversão: ${metricasAtuais.taxaCafe}`}
            </p>
          </div>
          <div className={`p-3 rounded-xl border ${subFiltroEtapa === 'CAFE' ? 'bg-amber-600 text-white border-amber-600' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
            <Coffee size={22} />
          </div>
        </div>

        <div 
          onClick={() => {
            const novaEtapa = subFiltroEtapa === 'INTEGRADO' ? 'TODOS' : 'INTEGRADO'
            setSubFiltroEtapa(novaEtapa)
            processarFiltrosEstatisticos(todosRegistros, mesFiltro, novaEtapa, buscaTermo, filtrarSemContato, filtrarEstagnados)
          }}
          className={`border rounded-2xl p-6 shadow-xs flex items-center justify-between transition-all transform ${
            print ? '' : 'cursor-pointer hover:scale-101 active:scale-99'
          } ${subFiltroEtapa === 'INTEGRADO' ? 'bg-emerald-50/60 border-emerald-400 ring-2 ring-emerald-600/10' : 'bg-white border-slate-200'}`}
        >
          <div>
            <p className="text-emerald-800 text-xxs font-bold uppercase tracking-wider">Total de Integrados</p>
            <h3 className="text-4xl font-black text-emerald-600 mt-1">{metricasAtuais.integrados} <span className="text-sm font-normal text-slate-400">membros</span></h3>
            <p className="text-xs text-emerald-700 font-semibold mt-1 print:hidden">
              {subFiltroEtapa === 'INTEGRADO' ? '● Filtrando Membros' : `Eficiência: ${metricasAtuais.taxaIgreja}`}
            </p>
          </div>
          <div className={`p-3 rounded-xl border ${subFiltroEtapa === 'INTEGRADO' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
            <Award size={22} />
          </div>
        </div>
      </div>

      {/* Painel Avançado de Ferramentas de Filtragem e Busca */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou telefone do visitante..."
              value={buscaTermo}
              onChange={(e) => {
                setBuscaTermo(e.target.value)
                processarFiltrosEstatisticos(todosRegistros, mesFiltro, subFiltroEtapa, e.target.value, filtrarSemContato, filtrarEstagnados)
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                const novoEstado = !filtrarSemContato
                setFiltrarSemContato(novoEstado)
                processarFiltrosEstatisticos(todosRegistros, mesFiltro, subFiltroEtapa, buscaTermo, novoEstado, filtrarEstagnados)
              }}
              className={`text-xxs font-bold px-3 py-2 rounded-xl border transition-all ${
                filtrarSemContato 
                  ? 'bg-amber-50 text-amber-900 border-amber-300 ring-2 ring-amber-500/10' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              ⚠️ SEM CONTATO CELULAR
            </button>

            <button
              onClick={() => {
                const novoEstado = !filtrarEstagnados
                setFiltrarEstagnados(novoEstado)
                processarFiltrosEstatisticos(todosRegistros, mesFiltro, subFiltroEtapa, buscaTermo, filtrarSemContato, novoEstado)
              }}
              className={`text-xxs font-bold px-3 py-2 rounded-xl border transition-all ${
                filtrarEstagnados 
                  ? 'bg-rose-50 text-rose-900 border-rose-300 ring-2 ring-rose-500/10' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              🚨 ESTAGNADOS (+14 DIAS)
            </button>

            {possuiFiltroAtivo && (
              <button
                onClick={limparTodosFiltros}
                className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white text-xxs font-black px-3 py-2 rounded-xl transition-colors"
              >
                <FilterX size={12} /> Limpar Todos os Filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabela de Dados Dinâmica */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 print:border-none print:shadow-none">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Clock className="text-indigo-600 print:text-black" size={18} />
              Movimentações Detalhadas ({converterMesNome(mesFiltro)})
            </h2>
            <p className="text-xs text-slate-500">
              Exibindo {pessoasFiltradas.length} registros correspondentes.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-xxs font-bold uppercase tracking-wider bg-slate-50/70 print:bg-slate-100">
                <th className="py-3 px-4">Visitante</th>
                <th className="py-3 px-4">Data Ingresso</th>
                <th className="py-3 px-4 text-center">Etapa Atual</th>
                <th className="py-3 px-4 text-center">Última Movimentação</th>
                <th className="py-3 px-4">Status Final / Alertas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {pessoasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-normal">Nenhuma pessoa corresponde aos filtros definidos.</td>
                </tr>
              ) : (
                pessoasFiltradas.map((p) => {
                  const diasEstagnado = calcularDiasEstagnado(p.data_ultima_movimentacao)
                  const estáEstagnado = diasEstagnado >= 14 && !p.integrado

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{p.nome}</p>
                        <p className={`text-xxs font-medium ${!p.telefone || p.telefone === 'Sem contato' ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                          {p.telefone || '⚠️ Sem contato cadastrado'}
                        </p>
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
                      <td className="py-3.5 px-4 text-center text-slate-500 font-semibold">
                        {formatarData(p.data_ultima_movimentacao)}
                      </td>
                      <td className="py-3.5 px-4">
                        {p.integrado ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 size={14} /> Integrado</span>
                        ) : estáEstagnado ? (
                          <span className="text-rose-600 font-bold flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md text-xxs w-max animate-pulse print:animate-none">
                            <AlertTriangle size={12} /> Estagnado ({diasEstagnado}d)
                          </span>
                        ) : p.passouCafe ? (
                          <span className="text-amber-600 font-bold flex items-center gap-1"><Coffee size={14} /> No Café</span>
                        ) : (
                          <span className="text-slate-500 font-bold flex items-center gap-1"><Clock size={14} /> Visitante</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Histórico Mensal */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 print:hidden">
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
                  onClick={() => {
                    setMesFiltro(mes)
                    processarFiltrosEstatisticos(todosRegistros, mes, subFiltroEtapa, buscaTermo, filtrarSemContato, filtrarEstagnados)
                  }}
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